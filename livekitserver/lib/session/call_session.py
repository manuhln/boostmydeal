import asyncio
import json
import logging
import os
from datetime import datetime
from typing import Optional

from livekit.agents import (
    AgentSession,
    AutoSubscribe,
    JobContext,
    BackgroundAudioPlayer,
    AudioConfig,
    BuiltinAudioClip,
)
from livekit.agents.voice import room_io
from livekit.plugins import openai, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from livekit import api, rtc

from src.models import CallConfig
from src import webhook_sender
from src.knowledge_base import KnowledgeBase
from src.recording_manager import recording_manager
from src.cost_calculator import CostCalculator

from lib.i18n import Translator
from lib.prompts import PromptBuilder
from lib.providers import TTSFactory, STTFactory
from lib.tools import ToolBuilder
from .metrics_handler import register_metrics_handler
from .transcript_handler import register_transcript_handler

logger = logging.getLogger(__name__)

LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")


class CallSession:
    """Manages the full lifecycle of a single voice call."""

    def __init__(self, ctx: JobContext, call_config: CallConfig) -> None:
        self.ctx = ctx
        self.config = call_config
        self.call_id = ctx.room.name
        self.start_time = datetime.utcnow()

        self.language = Translator._resolve(call_config.language)
        self.translator = Translator(self.language)

        self.transcript: list[dict] = []
        self.recording_info: Optional[dict] = None

        # Mutable refs shared with tools (dict so closures see updates)
        self._session_ref: dict = {"session": None}
        self._end_call_flag: dict = {"scheduled": False}
        self._bg_audio_ref: dict = {"player": None, "started": False}

    async def run(self) -> None:
        """Execute the full call flow: record → connect → wait → talk → cleanup."""
        await self._start_recording_if_enabled()
        await self.ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
        self._register_room_diagnostics()

        participant = await self._wait_for_sip_pickup()
        if participant is None:
            return  # call was not answered

        session = self._create_agent_session()
        assistant = self._create_voice_assistant(participant.identity)
        self._session_ref["session"] = session

        self._register_session_handlers(session)

        await self._start_session(session, assistant, participant)
        await self._start_background_audio(session)
        await self._send_initial_greeting(session)

        # Shutdown callback → webhooks + cost + transcript
        self.ctx.add_shutdown_callback(self._handle_disconnect)

    async def _start_recording_if_enabled(self) -> None:
        if not self.config.recording:
            return

        gcs_bucket = os.getenv("GCS_BUCKET_NAME")
        gcs_credentials = os.getenv("GCS_SERVICE_ACCOUNT_JSON")
        if not gcs_bucket or not gcs_credentials:
            logger.warning("Recording enabled but GCS credentials not configured")
            return

        logger.info("Recording enabled - starting room recording")
        try:
            date_prefix = datetime.now().strftime("%Y/%m/%d")
            timestamp = datetime.now().strftime("%H%M%S")
            gcs_filename = f"recordings/{date_prefix}/{self.call_id}_{timestamp}.mp4"

            req = api.RoomCompositeEgressRequest(
                room_name=self.ctx.room.name,
                audio_only=True,
                file_outputs=[
                    api.EncodedFileOutput(
                        file_type=api.EncodedFileType.MP4,
                        filepath=gcs_filename,
                        gcp=api.GCPUpload(
                            credentials=gcs_credentials,
                            bucket=gcs_bucket,
                        ),
                    )
                ],
            )
            lkapi = api.LiveKitAPI()
            egress_info = await lkapi.egress.start_room_composite_egress(req)
            await lkapi.aclose()

            self.recording_info = {
                "egress_id": egress_info.egress_id,
                "gcs_filename": gcs_filename,
                "gcs_bucket": gcs_bucket,
            }
            logger.info(
                f"Recording started: egress_id={egress_info.egress_id}, path={gcs_filename}"
            )
        except Exception as e:
            logger.error(f"Failed to start recording: {e}")

    def _register_room_diagnostics(self) -> None:
        @self.ctx.room.on("participant_attributes_changed")
        def _on_attr_changed(changed_attributes, participant_obj):
            sip_attrs = {
                k: v for k, v in changed_attributes.items() if k.startswith("sip.")
            }
            if sip_attrs:
                logger.info(
                    f"SIP attribute change for {participant_obj.identity}: {sip_attrs}"
                )

        @self.ctx.room.on("participant_disconnected")
        def _on_disconnected(participant_obj):
            logger.warning(f"Participant disconnected: {participant_obj.identity}")
            logger.warning(f"  Final attributes: {dict(participant_obj.attributes)}")

    async def _wait_for_sip_pickup(self) -> Optional[rtc.RemoteParticipant]:
        participant = await self.ctx.wait_for_participant()
        logger.info(f"Participant {participant.identity} joined")

        if participant.kind != rtc.ParticipantKind.PARTICIPANT_KIND_SIP:
            logger.info("Non-SIP participant – waiting for audio stability")
            await asyncio.sleep(2.0)
            return participant

        logger.info("Monitoring sip.callStatus - waiting for 'active'...")
        max_wait = 120
        elapsed = 0.0
        call_connected = False

        while elapsed < max_wait:
            status = participant.attributes.get("sip.callStatus", "unknown")

            if status == "active":
                call_connected = True
                break

            if status in ("disconnected", "hangup", "failed", "error", "automation"):
                logger.warning(f"SIP call ended during dialing: {status}")
                break

            if participant.identity not in [
                p.identity for p in self.ctx.room.remote_participants.values()
            ]:
                logger.warning(f"SIP participant left the room while '{status}'")
                break

            await asyncio.sleep(0.5)
            elapsed += 0.5
            if int(elapsed * 2) % 10 == 0:
                logger.info(f"SIP call status: {status} (waiting {elapsed:.0f}s)")

        if not call_connected:
            logger.error(f"SIP call NOT answered after {elapsed:.0f}s")
            await self._send_not_answered_webhook(participant)
            self.ctx.shutdown()
            return None

        logger.info("Call is now active - user picked up!")
        await asyncio.sleep(3.0)
        return participant

    async def _send_not_answered_webhook(self, participant) -> None:
        if not self.config.webhook_url:
            return
        try:
            await webhook_sender.send_call_ended(
                self.config.webhook_url,
                self.call_id,
                0,
                self.start_time,
                datetime.utcnow(),
                is_voicemail=False,
                is_rejected=True,
                call_outcome="not_answered",
                end_reason=f"SIP call failed: {participant.attributes.get('sip.callStatus', 'unknown')}",
            )
        except Exception as e:
            logger.error(f"Failed to send call-failed webhook: {e}")

    def _create_agent_session(self) -> AgentSession:
        session = AgentSession(
            vad=self.ctx.proc.userdata["vad"],
            min_endpointing_delay=0.5,
            max_endpointing_delay=6.0,
            turn_detection=MultilingualModel(),
            preemptive_generation=True
        )
        return session

    def _create_voice_assistant(self, participant_identity: str = ""):
        """Build the VoiceAssistant (Agent subclass) using lib/ modules."""
        from agent_worker import VoiceAssistant  # avoid circular at module level

        return VoiceAssistant(
            call_config=self.config,
            room_name=self.call_id,
            participant_identity=participant_identity,
            session_ref=self._session_ref,
            end_call_flag=self._end_call_flag,
            bg_audio_ref=self._bg_audio_ref,
        )

    def _register_session_handlers(self, session: AgentSession) -> None:
        register_metrics_handler(session, self.ctx)
        register_transcript_handler(
            session=session,
            call_transcript=self.transcript,
            call_id=self.call_id,
            webhook_url=self.config.webhook_url,
            background_audio_ref=self._bg_audio_ref,
        )

    async def _start_session(self, session, assistant, participant) -> None:
        if self.config.webhook_url:
            await webhook_sender.send_call_connected(
                self.config.webhook_url, self.call_id, self.start_time
            )

        room_input_options = room_io.RoomInputOptions(
            participant_identity=participant.identity,
        )
        logger.info(f"Linking AgentSession to participant: {participant.identity}")

        try:
            await session.start(
                room=self.ctx.room,
                agent=assistant,
                room_input_options=room_input_options,
            )
            logger.info("Voice agent started successfully")
        except Exception as e:
            logger.error(f"Failed to start voice agent: {e}")
            if self.config.webhook_url:
                try:
                    await webhook_sender.send_call_ended(
                        self.config.webhook_url,
                        self.call_id,
                        0,
                        self.start_time,
                        datetime.utcnow(),
                        is_voicemail=False,
                        is_rejected=True,
                        call_outcome="agent_initialization_failed",
                        end_reason=f"Failed to start agent: {str(e)[:100]}",
                    )
                except Exception as we:
                    logger.error(f"Failed to send failure webhook: {we}")
            self.ctx.shutdown()
            return

        # Verify RoomIO linkage
        try:
            linked = session.room_io.linked_participant
            if linked:
                logger.info(f"RoomIO linked to: {linked.identity}")
            else:
                logger.warning("RoomIO linked_participant is None")
        except Exception:
            pass

    async def _start_background_audio(self, session) -> None:
        if not self.config.keyboard_sound:
            return

        player = BackgroundAudioPlayer(
            thinking_sound=[
                AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING, volume=0.6),
                AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING2, volume=0.5),
            ]
        )
        try:
            await player.start(room=self.ctx.room, agent_session=session)
            self._bg_audio_ref["player"] = player
            self._bg_audio_ref["started"] = True
            logger.info("Background audio player started (typing sounds enabled)")
        except Exception as e:
            logger.warning(f"Failed to start background audio player: {e}")

    async def _send_initial_greeting(self, session) -> None:
        if self.config.user_speak_first:
            return

        logger.info("Agent will speak first - delivering initial message...")
        initial = self.config.agent_initial_message
        placeholders = [
            "{customer name}", "{Customer Name}", "{CUSTOMER NAME}",
            "{contact_name}", "{Contact_Name}", "{CONTACT_NAME}",
            "{customer_name}", "{Customer_name}",
        ]
        for ph in placeholders:
            initial = initial.replace(ph, self.config.contact_name)

        await session.say(initial, allow_interruptions=False)

    async def _handle_disconnect(self) -> None:
        call_end_time = datetime.utcnow()
        duration = int((call_end_time - self.start_time).total_seconds())
        logger.info(f"Call ended. Duration: {duration}s")

        recording_url = await self._wait_for_recording()

        if self.config.webhook_url:
            try:
                await webhook_sender.send_call_ended(
                    self.config.webhook_url,
                    self.call_id,
                    duration,
                    self.start_time,
                    call_end_time,
                    is_voicemail=False,
                    is_rejected=False,
                    call_outcome="completed",
                    end_reason="unknown",
                    recording_url=recording_url,
                )
            except Exception as e:
                logger.error(f"Error sending end webhook: {e}")

            await self._send_transcript_complete(duration, recording_url)

    async def _wait_for_recording(self) -> Optional[str]:
        if not self.recording_info:
            return None

        logger.info("Waiting for recording to complete…")
        try:
            url = await recording_manager.wait_for_recording_completion(
                egress_id=self.recording_info["egress_id"],
                gcs_filename=self.recording_info["gcs_filename"],
                max_wait_seconds=60,
                poll_interval=2.0,
            )
            if url:
                logger.info(f"Recording URL ready: {url[:100]}...")
            return url
        except Exception as e:
            logger.error(f"Error waiting for recording: {e}")
            return None

    async def _send_transcript_complete(
        self, duration: int, recording_url: Optional[str]
    ) -> None:
        try:
            lines = [
                f"{item['sender'].upper()}: {item['text']}"
                for item in self.transcript
            ]
            full_transcript = "\n".join(lines)
            recording_urls = [recording_url] if recording_url else []

            # Tag analysis
            user_tags_found, system_tags_found = [], []
            callback_requested, callback_time = False, None

            if self.config.user_tags or self.config.system_tags:
                logger.info("Analyzing tags with LLM…")
                from agent_worker import analyze_tags_with_llm

                utc_now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                (
                    user_tags_found,
                    system_tags_found,
                    callback_requested,
                    callback_time_str,
                ) = await analyze_tags_with_llm(
                    full_transcript=full_transcript,
                    user_tags=self.config.user_tags,
                    system_tags=self.config.system_tags,
                    call_duration_seconds=duration,
                    openai_api_key=self.config.model.api_key,
                    current_utc_time=utc_now,
                )
                if callback_time_str:
                    try:
                        callback_time = datetime.fromisoformat(
                            callback_time_str.replace("Z", "+00:00")
                        )
                    except Exception:
                        callback_time = None

            # Cost calculation
            cost_dict = self._calculate_cost(duration)

            await webhook_sender.send_transcript_complete(
                self.config.webhook_url,
                self.call_id,
                full_transcript,
                recording_urls,
                user_tags_found=user_tags_found,
                system_tags_found=system_tags_found,
                callback_requested=callback_requested,
                callback_time=callback_time,
                cost_breakdown=cost_dict,
            )
        except Exception as e:
            logger.error(f"Error sending transcript complete webhook: {e}")

    def _calculate_cost(self, duration: int) -> Optional[dict]:
        try:
            calculator = CostCalculator()
            tts_chars = sum(
                len(item["text"])
                for item in self.transcript
                if item["sender"] == "bot"
            )
            trunk_id = getattr(self.config, "livekit_sip_trunk_id", "")
            calling_provider = "twilio" if "twilio" in trunk_id.lower() else "voxsun"

            breakdown = calculator.calculate_total_cost(
                call_duration_seconds=duration,
                tts_provider=self.config.tts.provider_name,
                tts_model_id=self.config.tts.model_id,
                stt_provider=self.config.stt.provider_name,
                stt_model=self.config.stt.model,
                llm_model=self.config.model.name,
                calling_provider=calling_provider,
            )
            calculator.tts_chars_sent = tts_chars
            breakdown.tts_cost = calculator.calculate_tts_cost(
                tts_chars, self.config.tts.provider_name, self.config.tts.model_id
            )
            breakdown.total_cost = (
                breakdown.calling_provider_cost
                + breakdown.tts_cost
                + breakdown.stt_cost
                + breakdown.llm_cost
            )
            logger.info(f"Call cost calculated: ${breakdown.total_cost:.4f}")
            return breakdown.to_dict()
        except Exception as e:
            logger.error(f"Error calculating costs: {e}")
            return None

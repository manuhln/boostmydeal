import logging
import httpx
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional, Set
import json
import os
from vocode.streaming.models.events import Event, EventType, PhoneCallConnectedEvent, PhoneCallEndedEvent, RecordingEvent
from vocode.streaming.models.transcript import TranscriptCompleteEvent
from vocode.streaming.utils.events_manager import EventsManager
from unified_cost_tracker import unified_cost_tracker as cost_calculator, unified_cost_tracker as usage_tracker, unified_cost_tracker as real_cost_calculator
from twilio_cost_fetcher import twilio_cost_fetcher
from recording_uploader import upload_recordings_to_gcp
import aiohttp

logger = logging.getLogger(__name__)


def _calculate_total_call_cost(ai_services_cost_breakdown,
                               twilio_call_cost_data):
    """Calculate total call cost combining AI services and Twilio costs"""
    total_cost_breakdown = {
        "ai_services_total_usd": 0.0,
        "twilio_cost_usd": 0.0,
        "grand_total_usd": 0.0,
        "cost_breakdown": {
            "transcription_cost_usd": 0.0,
            "synthesis_cost_usd": 0.0,
            "llm_cost_usd": 0.0,
            "telephony_cost_usd": 0.0
        }
    }

    # Add AI services costs
    if ai_services_cost_breakdown:
        total_cost_breakdown[
            "ai_services_total_usd"] = ai_services_cost_breakdown[
                "cost_breakdown"]["total_ai_services_cost_usd"]
        total_cost_breakdown["cost_breakdown"][
            "transcription_cost_usd"] = ai_services_cost_breakdown[
                "cost_breakdown"]["transcription_cost_usd"]
        total_cost_breakdown["cost_breakdown"][
            "synthesis_cost_usd"] = ai_services_cost_breakdown[
                "cost_breakdown"]["synthesis_cost_usd"]
        total_cost_breakdown["cost_breakdown"][
            "llm_cost_usd"] = ai_services_cost_breakdown["cost_breakdown"][
                "llm_cost_usd"]

    # Add Twilio telephony costs
    if twilio_call_cost_data and "cost_usd" in twilio_call_cost_data:
        twilio_cost = float(twilio_call_cost_data["cost_usd"])
        total_cost_breakdown["twilio_cost_usd"] = twilio_cost
        total_cost_breakdown["cost_breakdown"][
            "telephony_cost_usd"] = twilio_cost

    # Calculate grand total
    total_cost_breakdown["grand_total_usd"] = round(
        total_cost_breakdown["ai_services_total_usd"] +
        total_cost_breakdown["twilio_cost_usd"], 6)

    logger.info(
        f"💰 Total call cost: AI Services ${total_cost_breakdown['ai_services_total_usd']:.6f} + Twilio ${total_cost_breakdown['twilio_cost_usd']:.6f} = ${total_cost_breakdown['grand_total_usd']:.6f}"
    )

    return total_cost_breakdown


class CustomEventsManager(EventsManager):
    """Custom EventsManager that forwards essential call events to webhook endpoint"""

    def __init__(self):
        super().__init__([
            EventType.PHONE_CALL_CONNECTED,
            EventType.PHONE_CALL_ENDED,
            EventType.TRANSCRIPT_COMPLETE,
            EventType.TRANSCRIPT,  # Add live transcript events
            EventType.RECORDING  # Add recording event to get recording URLs
        ])
        # Get webhook URL from environment variable instead of hardcoding
        self.webhook_url = os.environ.get("WEBHOOK_URL", "")
        if not self.webhook_url:
            logger.warning(
                "⚠️ WEBHOOK_URL not found in environment variables. Webhooks will be disabled."
            )
        else:
            # Force this message to appear regardless of logging configuration
            print(f"📡 Webhook URL configured: {self.webhook_url}")
            logger.info(f"📡 Webhook URL configured: {self.webhook_url}")
        # PERFORMANCE OPTIMIZATION: Reduced timeout and added connection pooling
        self.client = httpx.AsyncClient(
            timeout=3.0,  # Reduced from 10s to 3s for faster responses
            limits=httpx.Limits(max_keepalive_connections=10,
                                max_connections=20))
        self.call_start_times = {
        }  # Store call start times for duration calculation
        self.call_tags = {}  # Store user_tags and system_tags for each call
        self.call_outcomes = {}  # Store voicemail/rejection detection results
        self.voicemail_messages = {
        }  # Store voicemail messages for voicemail scenarios
        self.transfer_configs = {}  # Store transfer configurations per call
        self.call_transcripts = {}  # Store transcripts for cost calculation
        self.call_sids = {}  # Store Twilio Call SIDs for real cost fetching
        self.call_phone_numbers = {
        }  # Store from/to phone numbers for Call SID lookup
        self.base_url = os.getenv("BASE_URL")  # For recording URL construction


    async def handle_event(self, event: Event):
        """Handle incoming events and forward to webhook endpoint"""
        try:
            # PERFORMANCE OPTIMIZATION: Reduced logging and streamlined event handling
            event_type = type(event).__name__

            if isinstance(event, PhoneCallConnectedEvent):
                await self._handle_phone_call_connected(event)
            elif isinstance(event, PhoneCallEndedEvent):
                await self._handle_phone_call_ended(event)
            elif isinstance(event, TranscriptCompleteEvent):
                await self._handle_transcript_complete(event)
            elif event.type == EventType.TRANSCRIPT:
                await self._handle_live_transcript(event)
            elif self._is_human_detection_event(event):
                await self._handle_human_detection(event)

        except Exception as e:
            event_type = type(event).__name__
            logger.error(f"Event handling error {event_type}: {e}")

    async def _handle_phone_call_connected(self,
                                           event: PhoneCallConnectedEvent):
        """Handle PHONE_CALL_CONNECTED event with phone number capture"""
        call_start_time = datetime.now().isoformat()
        self.call_start_times[event.conversation_id] = call_start_time

        payload = {
            "type": "PHONE_CALL_CONNECTED",
            "call_id": event.conversation_id,
            "call_start_time": call_start_time
        }

        await self._send_webhook(payload)

    def _is_human_detection_event(self, event: Event) -> bool:
        """Check if event is a human detection event"""
        event_type_name = type(event).__name__.lower()
        return 'human' in event_type_name and 'detection' in event_type_name

    async def _handle_human_detection(self, event: Event):
        """Handle HUMAN_DETECTION event for voicemail detection"""
        try:
            # Extract the detection result
            detection_result = getattr(event, 'result', None) or getattr(
                event, 'human_detected', None)
            conversation_id = event.conversation_id

            logger.info(
                f"🔍 Human detection event for {conversation_id}: {detection_result}"
            )

            # Store the detection result for use in call ended event
            if not hasattr(self, 'call_outcomes'):
                self.call_outcomes = {}

            if conversation_id not in self.call_outcomes:
                self.call_outcomes[conversation_id] = {}

            # Determine if voicemail was detected
            is_voicemail = detection_result == "no_human" or detection_result == False
            self.call_outcomes[conversation_id]['is_voicemail'] = is_voicemail
            self.call_outcomes[conversation_id][
                'human_detection_result'] = str(detection_result)

            logger.info(
                f"📞 Voicemail detected: {is_voicemail} for call {conversation_id}"
            )

            # Get voicemail configuration if available
            voicemail_config = getattr(self, 'voicemail_configs',
                                       {}).get(conversation_id, {})
            voicemail_detection_enabled = voicemail_config.get(
                "detection", False)
            voicemail_message = voicemail_config.get("message", "")

            # Determine action based on JSON configuration
            if is_voicemail:
                if voicemail_detection_enabled and voicemail_message:
                    action = "speak_message_and_hangup"
                    logger.info(
                        f"📞 Voicemail detected - agent will speak message: {voicemail_message}"
                    )

                    # Custom voicemail message will be delivered by agent via prompt instructions
                else:
                    action = "hangup_immediately"
                    logger.info(
                        f"📞 Voicemail detected - IMMEDIATE SILENT HANGUP (voicemail detection disabled)"
                    )
            else:
                action = "continue_conversation"
                logger.info(
                    f"👤 Human detected - continuing normal conversation")

            # Send immediate webhook for voicemail detection
            payload = {
                "type":
                "VOICEMAIL_DETECTED" if is_voicemail else "HUMAN_DETECTED",
                "call_id":
                conversation_id,
                "is_voicemail":
                is_voicemail,
                "detection_result":
                str(detection_result),
                "voicemail_message":
                voicemail_message if
                (is_voicemail and voicemail_detection_enabled) else "",
                "action":
                action,
                "voicemail_detection_enabled":
                voicemail_detection_enabled,
                "timestamp":
                datetime.now().isoformat()
            }

            await self._send_webhook(payload)

            # Remove old logging - action is now logged above

        except Exception as e:
            logger.error(f"Error handling human detection event: {e}")

    async def _handle_phone_call_ended(self, event: PhoneCallEndedEvent):
        """Handle PHONE_CALL_ENDED event with recording URL"""
        call_end_time = datetime.now().isoformat()
        call_start_time = self.call_start_times.get(event.conversation_id,
                                                    call_end_time)

        # Calculate duration
        try:
            start_dt = datetime.fromisoformat(
                call_start_time.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(
                call_end_time.replace('Z', '+00:00'))
            duration_seconds = int((end_dt - start_dt).total_seconds())
        except:
            duration_seconds = 0

        # Debug: Log all available attributes of the event
        logger.info(f"🔍 PhoneCallEndedEvent attributes: {dir(event)}")

        # Detect call rejection and get voicemail status
        call_outcome = self._analyze_call_outcome(event, duration_seconds)

        payload = {
            "type": "PHONE_CALL_ENDED",
            "call_id": event.conversation_id,
            "duration_seconds": duration_seconds,
            "call_end_time": call_end_time,
            "call_start_time": call_start_time,
            "is_voicemail": call_outcome.get("is_voicemail", False),
            "is_rejected": call_outcome.get("is_rejected", False),
            "call_outcome": call_outcome.get("outcome", "completed"),
            "end_reason": call_outcome.get("end_reason", "unknown")
        }

        await self._send_webhook(payload)

    async def _handle_transcript_complete(self,
                                          event: TranscriptCompleteEvent):
        """Handle TRANSCRIPT_COMPLETE event with tag evaluation and cost tracking"""
        full_transcript = event.transcript.to_string()
        conversation_id = event.conversation_id

        # Store transcript for use in phone call ended event cost calculation
        self.call_transcripts[conversation_id] = full_transcript
        logger.info(
            f"📝 Stored transcript for call {conversation_id}: {len(full_transcript)} characters"
        )
        logger.info(
            f"🗃️ Total stored transcripts: {len(self.call_transcripts)}")

        # Add 5-second delay to allow tracking system to fully initialize
        logger.info(f"⏰ Waiting 5 seconds for tracking system to initialize...")
        await asyncio.sleep(5)

        # VOICEMAIL DETECTION: Analyze transcript for voicemail indicators
        is_voicemail_transcript = self._detect_voicemail_from_transcript(
            full_transcript)
        if is_voicemail_transcript:
            # Store voicemail detection result for call ended event
            if conversation_id not in self.call_outcomes:
                self.call_outcomes[conversation_id] = {}
            self.call_outcomes[conversation_id]['is_voicemail'] = True
            self.call_outcomes[conversation_id][
                'human_detection_result'] = 'voicemail_detected_from_transcript'

            # Send immediate voicemail detection webhook
            voicemail_message = self.voicemail_messages.get(
                conversation_id, "")
            voicemail_payload = {
                "type":
                "VOICEMAIL_DETECTED",
                "call_id":
                conversation_id,
                "is_voicemail":
                True,
                "detection_result":
                "voicemail_detected_from_transcript",
                "voicemail_message":
                voicemail_message,
                "transcript_indicators":
                self._get_voicemail_indicators(full_transcript),
                "timestamp":
                datetime.now().isoformat()
            }
            await self._send_webhook(voicemail_payload)
            logger.info(
                f"📞 VOICEMAIL DETECTED from transcript analysis for call {conversation_id}"
            )

        # CALL TRANSFER DETECTION: Analyze if user wants to speak to a human
        # should_transfer_call = self._detect_transfer_request(full_transcript)
        # if should_transfer_call:
        #     # Get transfer configuration for this call
        #     transfer_config = self.transfer_configs.get(conversation_id, {})
        #     transfer_enabled = transfer_config.get('enabled', False)
        #     transfer_number = transfer_config.get('phone_number', None)
        #     transfer_message = transfer_config.get(
        #         'message',
        #         "I'll transfer you to a human agent right away. Please hold.")

        #     # Send call transfer action webhook
        #     transfer_payload = {
        #         "type":
        #         "CALL_TRANSFER_REQUESTED",
        #         "call_id":
        #         conversation_id,
        #         "transfer_reason":
        #         "human_agent_requested",
        #         "transfer_indicators":
        #         self._get_transfer_indicators(full_transcript),
        #         "transfer_enabled":
        #         transfer_enabled,
        #         "transfer_number":
        #         transfer_number,
        #         "transfer_message":
        #         transfer_message,
        #         "timestamp":
        #         datetime.now().isoformat()
        #     }
        #     await self._send_webhook(transfer_payload)
        #     logger.info(
        #         f"📞➡️ CALL TRANSFER REQUESTED for call {conversation_id}")

        #     if transfer_enabled and transfer_number:
        #         logger.info(f"📞➡️ Transfer configured to: {transfer_number}")
        #     elif transfer_enabled and not transfer_number:
        #         logger.warning(
        #             f"⚠️ Transfer requested but no transfer number configured!"
        #         )
        #     else:
        #         logger.warning(
        #             f"⚠️ Transfer requested but transfer is disabled!")

        # CALL TERMINATION DETECTION: Analyze if user wants to end the call
        should_end_call = self._detect_call_end_request(full_transcript)
        logger.info(
            f"🔍 Call termination check for {conversation_id}: {should_end_call}"
        )
        logger.info(f"📝 Full transcript for analysis: {full_transcript}")

        if should_end_call:
            termination_indicators = self._get_call_end_indicators(
                full_transcript)
            logger.info(
                f"🔚 CALL TERMINATION DETECTED - Indicators: {termination_indicators}"
            )

            # Send call termination action webhook
            termination_payload = {
                "type": "CALL_TERMINATION_REQUESTED",
                "call_id": conversation_id,
                "termination_reason": "user_request",
                "termination_indicators": termination_indicators,
                "timestamp": datetime.now().isoformat()
            }
            await self._send_webhook(termination_payload)
            logger.info(
                f"🔚 CALL TERMINATION REQUESTED for call {conversation_id}")

            # Actually terminate the call through Vocode
            try:
                # For now, we rely on the AI agent to naturally end the call
                # The webhook provides the termination signal to external systems
                # Vocode's conversation termination requires access to the conversation object
                # which is not directly available in the events manager
                logger.info(
                    f"🔚 Call termination webhook sent - AI agent should naturally end conversation"
                )
                logger.info(
                    f"💡 Suggestion: External system should hang up call via Twilio API if needed"
                )
            except Exception as e:
                logger.error(f"❌ Error handling call termination: {e}")
        else:
            logger.info(
                f"✅ No call termination indicators found in transcript")

        # Get stored tags for this call
        call_tags = self.call_tags.get(conversation_id, {})
        user_tags = call_tags.get('user_tags', [])
        system_tags = call_tags.get('system_tags', [])

        # Evaluate tags with LLM if we have any tags to check
        detected_tags = set()
        if user_tags or system_tags:
            detected_tags = await self._evaluate_tags_with_llm(
                full_transcript, user_tags, system_tags, conversation_id)

        # Separate user and system tags found
        user_tags_found = []
        system_tags_found = []

        for tag in detected_tags:
            if tag.startswith("user:"):
                user_tags_found.append(tag[5:])  # Remove "user:" prefix
            elif tag.startswith("system:"):
                system_tags_found.append(tag[7:])  # Remove "system:" prefix
            else:
                # Handle simple tags (backward compatibility)
                user_tags_found.append(tag)

        # Update call duration and transcript data before getting usage metrics
        if conversation_id in self.call_start_times:
            call_start_time_str = self.call_start_times[conversation_id]
            call_start_time = datetime.fromisoformat(
                call_start_time_str.replace('Z', '+00:00'))
            call_duration = (
                datetime.utcnow().replace(tzinfo=call_start_time.tzinfo) -
                call_start_time).total_seconds()

            # Update the usage tracker with the actual call data
            usage_tracker.update_call_metadata(call_id=conversation_id,
                                               duration_seconds=call_duration,
                                               transcript_text=full_transcript)

            # Track transcript-based usage estimates if no real-time data was captured
            usage_tracker.estimate_usage_from_transcript(
                call_id=conversation_id,
                transcript_text=full_transcript,
                call_duration_seconds=call_duration)

        # Get comprehensive usage metrics for detailed breakdown
        logger.info(f"📊 Retrieving usage metrics for call {conversation_id}")
        usage_metrics_data = usage_tracker.get_call_metrics(
            conversation_id, full_transcript)

        # Get comprehensive cost breakdown for all AI services
        ai_services_cost_breakdown = usage_tracker.get_comprehensive_cost_breakdown(
            conversation_id)
        if ai_services_cost_breakdown:
            logger.info(
                f"💰 AI Services cost breakdown: ${ai_services_cost_breakdown['cost_breakdown']['total_ai_services_cost_usd']:.6f}"
            )
        else:
            logger.warning(
                f"⚠️ Could not calculate AI services cost for call {conversation_id}"
            )

        webhook_recording_urls = []
        twilio_call_cost_data = None

        # Retrieve stored Twilio credentials for this call
        logger.info(f"🔍 Looking up call data for conversation {conversation_id}")
        logger.info(f"🗂️ Available call data keys: {list(self.call_phone_numbers.keys())}")
        call_data = self.call_phone_numbers.get(conversation_id)
        if call_data:
            logger.info(f"✅ Found call data for {conversation_id}: from={call_data.get('from_phone')} to={call_data.get('to_phone')}")
            twilio_account_sid = call_data.get("twilio_account_sid")
            twilio_auth_token = call_data.get("twilio_auth_token")

            # Configure twilio_cost_fetcher with the stored credentials
            if twilio_account_sid and twilio_auth_token:
                twilio_cost_fetcher.configure_credentials(
                    twilio_account_sid, twilio_auth_token)

                logger.info(
                    f"🔑 Configured Twilio credentials for call {conversation_id}"
                )

                # Get actual Twilio Call SID using phone numbers and call start time
                from_phone = call_data.get("from_phone")
                to_phone = call_data.get("to_phone")
                call_start_time = call_data.get("call_start_time")

                if from_phone and to_phone:
                    actual_call_sid = await twilio_cost_fetcher.find_call_sid_by_phone_numbers(
                        from_phone, to_phone, call_start_time)

                    if actual_call_sid:
                        logger.info(
                            f"✅ Found actual Twilio Call SID: {actual_call_sid} for conversation {conversation_id}"
                        )

                        # Fetch recordings and cost with the actual Twilio Call SID
                        twilio_recording_urls = await twilio_cost_fetcher.fetch_recording_urls(
                            actual_call_sid)
                        twilio_call_cost_data = await twilio_cost_fetcher.fetch_call_cost(
                            actual_call_sid)

                        # Process recordings through GCP uploader
                        webhook_recording_urls = []
                        if twilio_recording_urls:
                            logger.info(
                                f"🎙️ Processing {len(twilio_recording_urls)} recordings for GCP upload"
                            )

                            # Extract media URLs from recording objects for upload
                            media_urls = []
                            for rec in twilio_recording_urls:
                                if isinstance(rec,
                                              dict) and 'recording_url' in rec:
                                    # Build proper media URL with file format
                                    file_format = rec.get('file_format', 'wav')
                                    recording_url = str(
                                        rec.get('recording_url', ''))
                                    media_url = f"{recording_url}.{file_format}"
                                    media_urls.append(media_url)
                                elif isinstance(rec, str):
                                    media_urls.append(rec)

                            logger.info(
                                f"🔗 Extracted {len(media_urls)} media URLs for upload"
                            )

                            if media_urls:
                                # Create Twilio auth for secure recording download
                                twilio_auth = None
                                if call_data and call_data.get(
                                        "twilio_account_sid"
                                ) and call_data.get("twilio_auth_token"):
                                    twilio_auth = aiohttp.BasicAuth(
                                        call_data["twilio_account_sid"],
                                        call_data["twilio_auth_token"])

                                gcp_recording_mapping = await upload_recordings_to_gcp(
                                    media_urls, actual_call_sid, twilio_auth)

                                # Rebuild recording objects with GCP URLs, preserving metadata
                                for i, rec in enumerate(twilio_recording_urls):
                                    if isinstance(
                                            rec,
                                            dict) and 'recording_url' in rec:
                                        recording_url = str(
                                            rec.get('recording_url', ''))
                                        file_format = str(
                                            rec.get('file_format', 'wav'))
                                        original_url = f"{recording_url}.{file_format}"
                                        gcp_url = gcp_recording_mapping.get(
                                            original_url)

                                        # Create updated recording object
                                        updated_rec = dict(
                                            rec)  # Explicit dict conversion
                                        if gcp_url:
                                            updated_rec[
                                                'recording_url'] = gcp_url
                                            updated_rec[
                                                'source'] = 'gcp_storage'
                                            webhook_recording_urls.append(
                                                updated_rec)
                                            logger.info(
                                                f"✅ Updated recording {i} with GCP URL"
                                            )
                                        else:
                                            # Fallback to Twilio media URL with source annotation
                                            updated_rec[
                                                'recording_url'] = original_url
                                            updated_rec['source'] = 'twilio'
                                            webhook_recording_urls.append(
                                                updated_rec)
                                            logger.warning(
                                                f"⚠️ GCP upload failed for recording {i}, using Twilio media URL"
                                            )
                                    else:
                                        webhook_recording_urls.append(rec)
                            else:
                                webhook_recording_urls = twilio_recording_urls
                                logger.warning(
                                    f"⚠️ No valid media URLs extracted, using original recordings"
                                )
                        else:
                            logger.info(
                                f"ℹ️ No recordings found for call {actual_call_sid}"
                            )
                    else:
                        logger.warning(
                            f"⚠️ Could not find Twilio Call SID for call from {from_phone} to {to_phone}"
                        )
                else:
                    logger.warning(
                        f"⚠️ Missing phone numbers for conversation {conversation_id}"
                    )
            else:
                logger.warning(
                    f"⚠️ Twilio credentials not found for conversation {conversation_id}"
                )
        else:
            logger.warning(
                f"⚠️ No call data found for conversation {conversation_id}, skipping Twilio fetch"
            )

        payload = {
            "type":
            "TRANSCRIPT_COMPLETE",
            "call_id":
            conversation_id,
            "full_transcript":
            full_transcript,
            "user_tags_found":
            user_tags_found,
            "system_tags_found":
            system_tags_found,
            "voicemail_detected":
            is_voicemail_transcript,
            "usage_metrics_data":
            usage_metrics_data.to_dict() if usage_metrics_data else None,
            "ai_services_cost_breakdown":
            ai_services_cost_breakdown,
            "total_call_cost_breakdown":
            _calculate_total_call_cost(ai_services_cost_breakdown,
                                       twilio_call_cost_data),
            "recording_urls":
            webhook_recording_urls,
            "twilio_call_cost_data":
            twilio_call_cost_data  # Will be populated if available
        }

        await self._send_webhook(payload)

        # Clean up stored data and usage tracking (final cleanup)
        self.call_tags.pop(event.conversation_id, None)
        self.call_transcripts.pop(event.conversation_id, None)
        self.call_sids.pop(event.conversation_id,
                           None)  # Clean up stored Call SID
        cost_calculator.cleanup_call(event.conversation_id)
        usage_tracker.cleanup_call(event.conversation_id)

        # Clean up Vocode usage hook mapping
        from vocode_usage_hook import vocode_usage_hook
        vocode_usage_hook.cleanup_conversation(event.conversation_id)

        logger.info(
            f"🧹 Cleaned up data and usage metrics for call {event.conversation_id}"
        )

    async def _handle_live_transcript(self, event: Event):
        """Handle live TRANSCRIPT events and send them immediately as webhooks"""
        try:
            # Extract transcript details from the generic Event object
            conversation_id = getattr(event, 'conversation_id', 'unknown')

            # Extract text from different possible attributes
            text = ""
            for text_attr in ['text', 'content', 'message', 'transcript_text']:
                if hasattr(event, text_attr):
                    text = getattr(event, text_attr, "")
                    if text:
                        break

            # Extract sender information
            sender = "unknown"
            for sender_attr in ['sender', 'speaker', 'role', 'source']:
                if hasattr(event, sender_attr):
                    sender = getattr(event, sender_attr, "unknown")
                    if sender != "unknown":
                        break

            timestamp = datetime.now().isoformat()

            # Skip empty transcripts or system messages
            if not text or not text.strip():
                logger.debug(
                    f"📝 Skipping empty live transcript for call {conversation_id}"
                )
                return

            # Create live transcript webhook payload
            payload = {
                "type": "LIVE_TRANSCRIPT",
                "call_id": conversation_id,
                "text": text,
                "sender": sender,
                "timestamp": timestamp,
                "is_partial":
                True  # This indicates it's a live/partial transcript
            }

            # Add additional event attributes if available
            for optional_attr in [
                    'confidence', 'is_final', 'is_interim', 'language'
            ]:
                if hasattr(event, optional_attr):
                    payload[optional_attr] = getattr(event, optional_attr)

            # Send the live transcript webhook
            await self._send_webhook(payload)
            logger.info(
                f"📝📡 Live transcript sent for call {conversation_id}: '{text[:50]}{'...' if len(text) > 50 else ''}' from {sender}"
            )

        except Exception as e:
            logger.error(f"❌ Error handling live transcript event: {e}")
            import traceback
            logger.error(
                f"❌ Live transcript traceback: {traceback.format_exc()}")

    async def _send_webhook(self, payload: Dict[str, Any]):
        """Send webhook payload to configured endpoint"""
        if not self.webhook_url:
            logger.debug(
                f"🔇 Webhook disabled - skipping {payload['type']} event")
            return None

        try:
            # Log the complete webhook payload being sent
            logger.info(f"📡 Sending webhook to: {self.webhook_url}")
            logger.info(f"📡 Webhook type: {payload['type']}")
            logger.info(f"📡 Webhook payload:")
            import json
            logger.info(json.dumps(payload, indent=2, default=str))

            response = await self.client.post(
                self.webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"})
            logger.info(
                f"✅ Webhook sent: {payload['type']} - Status: {response.status_code}"
            )

            # Log response details if available
            try:
                response_text = response.text
                if response_text:
                    logger.info(
                        f"📡 Webhook response: {response_text[:200]}{'...' if len(response_text) > 200 else ''}"
                    )
            except Exception:
                pass

            return response
        except Exception as e:
            logger.error(f"❌ Failed to send webhook {payload['type']}: {e}")
            return None

    async def _evaluate_tags_with_llm(self,
                                      transcript: str,
                                      user_tags: Optional[List[str]] = None,
                                      system_tags: Optional[List[str]] = None,
                                      call_id: str = "") -> Set[str]:
        """Use LLM to evaluate whether user_tags and system_tags are present in the conversation."""
        if not user_tags and not system_tags:
            return set()

        try:
            from openai import OpenAI

            # Initialize OpenAI client
            openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
            if not os.environ.get("OPENAI_API_KEY"):
                logger.error(
                    "OPENAI_API_KEY environment variable not set. Cannot perform LLM evaluation."
                )
                return set()

            # Prepare the tags to evaluate
            all_tags_to_evaluate = []
            if user_tags:
                all_tags_to_evaluate.extend(
                    [f"user_tag:{tag}" for tag in user_tags])
            if system_tags:
                all_tags_to_evaluate.extend(
                    [f"system_tag:{tag}" for tag in system_tags])

            if not all_tags_to_evaluate:
                return set()

            # Create the prompt for LLM evaluation
            prompt = f"""
Analyze the following conversation transcript and determine which of the specified tags are present or discussed in the conversation.

TRANSCRIPT:
{transcript}

TAGS TO EVALUATE:
{', '.join(all_tags_to_evaluate)}

For each tag, respond with either "TRUE" or "FALSE" to indicate whether the concept, topic, or intent represented by that tag is present in the conversation.

Guidelines for evaluation:
- "follow up" - TRUE if human mentions follow-up emails, calls, scheduling future contact, or requests to be contacted later
- "schedule meet" - TRUE if human wants to schedule meetings, appointments, calls, or asks to meet
- "interested if call more than 1 minute" - TRUE if the conversation lasted more than 1 minute and shows engagement
- "otherwise uninterested" - TRUE if human shows disinterest, says "not interested", rejects offers, wants to end the call, or responds negatively

IMPORTANT: Look specifically at the HUMAN's responses, not the BOT's responses.

Respond in the following format for each tag you were given:
user_tag:follow up: TRUE/FALSE
user_tag:schedule meet: TRUE/FALSE  
system_tag:interested if call more than 1 minute: TRUE/FALSE
system_tag:otherwise uninterested: TRUE/FALSE

Be accurate in your evaluation - look for clear evidence of each concept in the HUMAN's part of the conversation.
"""

            # Track estimated token usage for this LLM request
            prompt_chars = len(prompt)
            estimated_input_tokens = int(prompt_chars /
                                         4)  # ~4 chars per token

            # Call OpenAI API with proper error handling
            try:
                response = openai_client.chat.completions.create(
                    model="gpt-4",
                    messages=[{
                        "role":
                        "system",
                        "content":
                        "You are an expert conversation analyst. Evaluate whether specific tags/concepts are present in conversation transcripts. Be accurate and look for clear evidence."
                    }, {
                        "role": "user",
                        "content": prompt
                    }],
                    temperature=0.1,
                    max_tokens=500)
            except Exception as e:
                logger.error(f"OpenAI API error: {e}")
                return set()

            # Parse the response
            content = response.choices[0].message.content
            evaluation_text = content.strip() if content else ""
            logger.info(f"LLM tag evaluation response: {evaluation_text}")

            detected_tags = set()
            for line in evaluation_text.split('\n'):
                line = line.strip()

                if ':' in line and ('TRUE' in line.upper()
                                    or 'FALSE' in line.upper()):
                    if line.count(':') >= 2:
                        parts = line.split(':', 2)  # Split into max 3 parts
                        tag_type = parts[0].strip()
                        tag_name = parts[1].strip()
                        result = parts[2].strip().upper()

                        if result == 'TRUE':
                            if tag_type == 'user_tag':
                                detected_tags.add(f"user:{tag_name}")
                                logger.info(f"✅ Added user tag: {tag_name}")
                            elif tag_type == 'system_tag':
                                detected_tags.add(f"system:{tag_name}")
                                logger.info(f"✅ Added system tag: {tag_name}")

            # Track actual token usage for this LLM request
            estimated_output_tokens = len(
                evaluation_text.split()) * 1.3  # ~1.3 tokens per word
            if call_id:
                usage_tracker.add_llm_usage(call_id, estimated_input_tokens,
                                            int(estimated_output_tokens),
                                            "tag_evaluation")

            logger.info(f"LLM detected tags: {detected_tags}")
            return detected_tags

        except Exception as e:
            logger.error(f"Error in LLM tag evaluation: {e}")
            return set()

    #getting used
    def store_call_tags(self,
                        conversation_id: str,
                        user_tags: Optional[List[str]] = None,
                        system_tags: Optional[List[str]] = None):
        """Store user_tags and system_tags for a call to be used later during transcript evaluation"""
        self.call_tags[conversation_id] = {
            'user_tags': user_tags or [],
            'system_tags': system_tags or []
        }
        logger.info(
            f"Stored tags for call {conversation_id}: user_tags={user_tags}, system_tags={system_tags}"
        )

    #getting used
    def store_voicemail_config(self,
                               conversation_id: str,
                               detection_enabled: bool,
                               message: str,
                               recording_enabled: bool = True):
        """Store complete voicemail configuration for a specific call"""
        if not hasattr(self, 'voicemail_configs'):
            self.voicemail_configs = {}

        self.voicemail_configs[conversation_id] = {
            "detection": detection_enabled,
            "message": message,
            "recording": recording_enabled
        }

        logger.info(
            f"📞 Stored voicemail config for {conversation_id}: detection={detection_enabled}, recording={recording_enabled}"
        )
        if detection_enabled and message:
            logger.info(f"💬 Message: {message}")
        else:
            logger.info(
                f"🚫 No message will be spoken - immediate hangup on voicemail")

    #getting used
    def store_transfer_config(self, conversation_id: str, enabled: bool,
                              phone_number: Optional[str], message: str):
        """Store transfer configuration for a specific call"""
        self.transfer_configs[conversation_id] = {
            'enabled': enabled,
            'phone_number': phone_number,
            'message': message
        }
        logger.info(
            f"📞➡️ Stored transfer config for {conversation_id}: enabled={enabled}, phone={phone_number}"
        )

    def _analyze_call_outcome(self, event: PhoneCallEndedEvent,
                              duration_seconds: int) -> Dict[str, Any]:
        """Analyze call outcome to detect voicemail, rejection, or other scenarios"""
        conversation_id = event.conversation_id

        # Get stored voicemail detection result
        call_data = self.call_outcomes.get(conversation_id, {})
        is_voicemail = call_data.get('is_voicemail', False)

        # Extract end reason from event if available
        end_reason = "unknown"
        for attr in ['end_reason', 'endReason', 'reason', 'status']:
            if hasattr(event, attr):
                value = getattr(event, attr)
                if value:
                    end_reason = str(value)
                    break

        # Detect call rejection based on duration and patterns
        is_rejected = self._detect_call_rejection(duration_seconds, end_reason,
                                                  event)

        # Determine overall call outcome
        if is_voicemail:
            outcome = "voicemail"
        elif is_rejected:
            outcome = "rejected"
        elif duration_seconds > 60:  # Calls longer than 1 minute likely successful
            outcome = "completed"
        elif duration_seconds < 10:  # Very short calls likely rejected/failed
            outcome = "failed"
        else:
            outcome = "completed"

        logger.info(
            f"📊 Call outcome analysis for {conversation_id}: outcome={outcome}, duration={duration_seconds}s, voicemail={is_voicemail}, rejected={is_rejected}"
        )

        return {
            "outcome": outcome,
            "is_voicemail": is_voicemail,
            "is_rejected": is_rejected,
            "end_reason": end_reason,
            "duration_seconds": duration_seconds
        }

    def _detect_call_rejection(self, duration_seconds: int, end_reason: str,
                               event: PhoneCallEndedEvent) -> bool:
        """Detect if a call was rejected based on various indicators"""

        # Enhanced rejection indicators - more comprehensive patterns
        rejection_reasons = [
            "busy", "declined", "rejected", "no-answer", "failed", "cancel",
            "user-busy", "call-rejected", "unavailable", "timeout",
            "unreachable", "not-answered", "caller-cancelled",
            "recipient-busy", "line-busy", "network-unreachable",
            "call-failed", "invalid-number", "blocked", "service-unavailable",
            "temporary-failure", "destination-unreachable"
        ]

        # Check if end reason indicates rejection
        end_reason_lower = end_reason.lower()
        reason_rejected = any(reason in end_reason_lower
                              for reason in rejection_reasons)

        # Enhanced duration-based rejection detection
        # Calls shorter than 10 seconds are likely rejected (user actively declined)
        # Calls 10-20 seconds might be rejected or very brief answer
        duration_rejected = duration_seconds < 10
        brief_call = duration_seconds < 20

        # Check for specific Twilio status codes if available
        status_rejected = False
        status_value = ""
        for attr in ['status', 'call_status', 'callStatus']:
            if hasattr(event, attr):
                status_value = str(getattr(event, attr)).lower()
                if status_value in [
                        "busy", "no-answer", "failed", "canceled", "declined"
                ]:
                    status_rejected = True
                    break

        # Enhanced rejection logic - consider multiple factors
        is_rejected = (reason_rejected or status_rejected or
                       (duration_rejected
                        and end_reason.lower() not in ["completed", "hangup"])
                       or (brief_call and end_reason.lower()
                           in ["busy", "failed", "canceled"]))

        if is_rejected:
            logger.info(
                f"🚫 Call rejection detected for conversation {event.conversation_id}:"
            )
            logger.info(
                f"   - End reason: '{end_reason}' (rejected: {reason_rejected})"
            )
            logger.info(
                f"   - Status: '{status_value}' (rejected: {status_rejected})")
            logger.info(
                f"   - Duration: {duration_seconds}s (rejected: {duration_rejected}, brief: {brief_call})"
            )
        else:
            logger.info(
                f"✅ Call not rejected for conversation {event.conversation_id}: duration={duration_seconds}s, reason='{end_reason}', status='{status_value}'"
            )

        return is_rejected

    def _detect_voicemail_from_transcript(self, transcript: str) -> bool:
        """Detect if the call went to voicemail based on transcript content"""
        if not transcript:
            return False

        transcript_lower = transcript.lower()

        # Strong voicemail indicators
        strong_indicators = [
            "voice mail", "voicemail", "voice message",
            "please record your message", "at the tone", "leave a message",
            "after the beep", "record your message", "mailbox is full",
            "forwarded to voice mail"
        ]

        # Check for strong indicators
        for indicator in strong_indicators:
            if indicator in transcript_lower:
                logger.info(
                    f"📞 Voicemail detected via strong indicator: '{indicator}'"
                )
                return True

        # Weak indicators that need additional context
        weak_indicators = [
            "not available", "can't come to the phone", "please leave",
            "subscriber you have called", "the person you're trying to reach",
            "is not available at this time", "please try your call again"
        ]

        # Count weak indicators
        weak_count = sum(1 for indicator in weak_indicators
                         if indicator in transcript_lower)

        # If multiple weak indicators, likely voicemail
        if weak_count >= 2:
            logger.info(
                f"📞 Voicemail detected via multiple weak indicators: {weak_count}"
            )
            return True

        return False

    def _get_voicemail_indicators(self, transcript: str) -> List[str]:
        """Get list of voicemail indicators found in transcript"""
        transcript_lower = transcript.lower()
        indicators = []

        voicemail_phrases = [
            "voice mail", "voicemail", "voice message",
            "please record your message", "at the tone", "leave a message",
            "after the beep", "not available", "can't come to the phone",
            "please leave", "record your message",
            "when you have finished recording", "mailbox is full",
            "subscriber you have called", "the person you're trying to reach",
            "is not available at this time", "forwarded to voice mail",
            "please try your call again"
        ]

        for phrase in voicemail_phrases:
            if phrase in transcript_lower:
                indicators.append(phrase)

        return indicators

    def _detect_call_end_request(self, transcript: str) -> bool:
        """Detect if user wants to end the call"""
        found_indicators = self._get_call_end_indicators(transcript)

        if found_indicators:
            logger.info(f"🔚 Call end indicators found: {found_indicators}")
            return True
        else:
            logger.info(f"🔍 No call end indicators found in transcript")
            return False

    def _get_call_end_indicators(self, transcript: str) -> List[str]:
        """Get list of call end indicators found in transcript"""
        transcript_lower = transcript.lower()
        indicators = []

        end_call_phrases = [
            "goodbye", "bye", "good bye", "see you", "hang up", "end call",
            "end the call", "that's all", "thank you goodbye", "i have to go",
            "gotta go", "got to go", "talk to you later", "talk later",
            "i'm done", "we're done", "that's it", "have a good day",
            "have a nice day", "catch you later", "see ya", "later",
            "thanks, bye", "okay bye", "alright bye"
        ]

        for phrase in end_call_phrases:
            if phrase in transcript_lower:
                indicators.append(phrase)

        return indicators

    def _estimate_usage_costs(self, conversation_id: str,
                              transcript: str) -> None:
        """Estimate costs based on transcript content and track detailed usage metrics"""
        try:
            logger.info(f"💰 Starting cost estimation for {conversation_id}")

            # Set transcript metadata in usage tracker
            usage_tracker.set_transcript_metadata(conversation_id, transcript)

            # Split transcript into user and agent parts (rough estimation)
            transcript_lines = transcript.split('\n')
            agent_words = 0
            user_words = 0

            for line in transcript_lines:
                line = line.strip()
                if not line:
                    continue

                line_lower = line.lower()
                if 'bot:' in line_lower or 'agent:' in line_lower or 'assistant:' in line_lower:
                    # Extract just the spoken text, remove the "BOT:" prefix
                    spoken_text = line.split(':',
                                             1)[1] if ':' in line else line
                    words_in_line = len(spoken_text.split())
                    agent_words += words_in_line

                elif 'human:' in line_lower or 'user:' in line_lower:
                    # Extract just the spoken text, remove the "HUMAN:" prefix
                    spoken_text = line.split(':',
                                             1)[1] if ':' in line else line
                    words_in_line = len(spoken_text.split())
                    user_words += words_in_line

                else:
                    # If no clear speaker identifier, assume it's continuation of previous speaker
                    words_in_line = len(line.split())
                    user_words += words_in_line

            # Estimate transcription time (assuming average speaking rate)
            # Average speaking rate: ~150 words per minute
            total_words = agent_words + user_words
            estimated_audio_minutes = total_words / 150.0
            estimated_audio_seconds = estimated_audio_minutes * 60.0

            # Estimate synthesis characters (agent responses only)
            agent_characters = agent_words * 5  # Average 5 characters per word

            # Estimate LLM token usage for agent responses
            # Rough estimation: 1 word ≈ 1.3 tokens
            estimated_input_tokens = total_words * 2  # Context + conversation history
            estimated_output_tokens = agent_words * 1.3

            logger.info(
                f"💰 Estimated usage - Audio: {estimated_audio_seconds:.1f}s, Synthesis: {agent_characters} chars, LLM: {int(estimated_input_tokens)}/{int(estimated_output_tokens)} tokens"
            )

            # Add to unified cost tracker (no need for duplicate calls since cost_calculator and usage_tracker are the same instance)
            usage_tracker.add_transcription_usage(
                conversation_id,
                estimated_audio_seconds,
                context="speech_recognition_from_transcript")
            usage_tracker.add_synthesis_usage(
                conversation_id,
                agent_characters,
                context="agent_responses_from_transcript")
            usage_tracker.add_llm_usage(conversation_id,
                                        int(estimated_input_tokens),
                                        int(estimated_output_tokens),
                                        context="agent_conversation")

            # Check if cost tracking exists for this call after adding usage
            if conversation_id in cost_calculator.call_costs:
                current_cost = cost_calculator.call_costs[conversation_id]
                logger.info(
                    f"💰 Cost tracking exists for call {conversation_id}")
                logger.info(
                    f"💰 Current totals: Transcription=${current_cost.transcription_cost:.6f}, Synthesis=${current_cost.synthesis_cost:.6f}, LLM=${current_cost.llm_cost:.6f}, Total=${current_cost.total_cost:.6f}"
                )
            else:
                logger.warning(
                    f"⚠️ No cost tracking found for call {conversation_id} after adding usage!"
                )

        except Exception as e:
            logger.error(f"Error estimating costs for {conversation_id}: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")

    def _detect_transfer_request(self, transcript: str) -> bool:
        """Detect if user wants to transfer to a human agent"""
        return len(self._get_transfer_indicators(transcript)) > 0

    def _get_transfer_indicators(self, transcript: str) -> List[str]:
        """Get list of transfer indicators found in transcript"""
        transcript_lower = transcript.lower()
        indicators = []

        transfer_phrases = [
            "speak to a human", "talk to a human", "human agent",
            "transfer to human", "transfer me to", "real person", "live agent",
            "customer service", "representative", "speak to someone",
            "talk to someone", "human please", "transfer my call",
            "get me a human", "i need a human", "speak with a person",
            "talk with a person", "connect me to", "transfer me",
            "human operator", "real agent", "actual person", "not a bot",
            "i want to talk to", "let me speak to", "put me through"
        ]

        for phrase in transfer_phrases:
            if phrase in transcript_lower:
                indicators.append(phrase)
                logger.info(f"📞➡️ Transfer indicator found: '{phrase}'")

        return indicators

    async def execute_call_transfer(
        self,
        conversation_id: str,
        transfer_phone_number: str,
        transfer_message:
        str = "I'll transfer you to a human agent right away. Please hold."
    ) -> bool:
        """Execute a call transfer to a human agent via Vocode TransferCall action"""
        try:
            logger.info(
                f"📞➡️ Executing call transfer for {conversation_id} to {transfer_phone_number}"
            )

            # Store transfer configuration for this call
            self.store_transfer_config(conversation_id, True,
                                       transfer_phone_number, transfer_message)

            # Send CALL_TRANSFER_REQUESTED webhook
            transfer_payload = {
                "type": "CALL_TRANSFER_REQUESTED",
                "call_id": conversation_id,
                "transfer_reason": "api_request",
                "transfer_enabled": True,
                "transfer_number": transfer_phone_number,
                "transfer_message": transfer_message,
                "timestamp": datetime.now().isoformat()
            }
            await self._send_webhook(transfer_payload)

            # Note: The actual transfer execution will be handled by Vocode's TransferCall action
            # The agent should recognize the transfer request and execute the action
            logger.info(
                f"📞➡️ Transfer request sent via webhook for call {conversation_id}"
            )
            logger.info(
                f"💡 Vocode agent should now execute TransferCall action to {transfer_phone_number}"
            )

            return True

        except Exception as e:
            logger.error(
                f"❌ Error executing call transfer for {conversation_id}: {e}")
            return False

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Global events manager instance
EVENTS_MANAGER = CustomEventsManager()

"""
Transcript tracking and webhook delivery for conversation items.

Registers event handlers on the ``AgentSession`` that:
- Build an in-memory transcript list.
- Send live transcript webhooks.
- Reset VAD sensitivity after email collection.
- Play typing sounds when users provide structured data.
"""

import asyncio
import logging

from livekit.agents import AudioConfig, BuiltinAudioClip

from src import webhook_sender

logger = logging.getLogger(__name__)

# Keywords that indicate the user is providing structured data
_DATA_KEYWORDS = [
    "@", "dot com", "dot org", "gmail", "yahoo", "hotmail",
    "appointment", "schedule", "meeting", "calendar",
    "phone", "number", "call me", "contact",
    "name is", "my name", "i'm", "called",
    "address", "street", "city", "zip",
]

# Keywords that indicate we're still in email-collection mode
_EMAIL_KEYWORDS = [
    "spell", "email", "letter by letter", "at the rate", "dot com", "dot", "@"
]


def register_transcript_handler(
    session,
    call_transcript: list[dict],
    call_id: str,
    webhook_url: str | None,
    background_audio_ref: dict | None,
):
    """Wire conversation-item events on *session*.

    Parameters
    ----------
    session:
        The ``AgentSession`` to attach listeners to.
    call_transcript:
        Mutable list that accumulates ``{"sender": …, "text": …}`` dicts.
    call_id:
        Room / call identifier for webhooks.
    webhook_url:
        Destination for live-transcript webhooks (``None`` to skip).
    background_audio_ref:
        Dict with ``"player"`` and ``"started"`` keys (or ``None``).
    """

    @session.on("conversation_item_added")
    def _on_conversation_item(event):
        item = event.item
        if not item.text_content:
            return

        logger.info(
            f"Conversation item: role={item.role}, "
            f"content={item.text_content[:50]}..."
        )

        # Normalise role → "bot" or "user"
        if item.role in ("assistant", "agent", "system"):
            sender = "bot"
        else:
            sender = "user"
            _maybe_reset_vad(session, call_transcript)
            _maybe_play_typing_sound(item.text_content, background_audio_ref)

        call_transcript.append({"sender": sender, "text": item.text_content})

        if webhook_url:
            logger.info(f"Sending transcript webhook [{sender}]")
            asyncio.create_task(
                webhook_sender.send_live_transcript(
                    webhook_url,
                    call_id,
                    item.text_content,
                    sender,
                    is_partial=True,
                )
            )

    # Also attach lightweight debug handlers
    @session.on("agent_speech_interrupted")
    def _on_interrupted(event):
        logger.info("Agent speech interrupted by user")

    @session.on("agent_speech_committed")
    def _on_committed(event):
        logger.debug("Agent speech committed successfully")

    @session.on("user_input_transcribed")
    def _on_user_transcribed(event):
        logger.info(
            f"User speech transcribed: is_final={event.is_final}, "
            f"text={event.transcript[:80] if event.transcript else ''}..."
        )

    @session.on("user_state_changed")
    def _on_user_state(event):
        logger.info(f"User state: {event.new_state}")

    @session.on("agent_state_changed")
    def _on_agent_state(event):
        logger.info(f"Agent state: {event.new_state}")


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _maybe_reset_vad(session, call_transcript: list[dict]) -> None:
    """Reset VAD sensitivity back to normal if we're done collecting email."""
    if session.options.min_endpointing_delay <= 1.0:
        return

    recent_bot_msgs = [
        msg["text"].lower()
        for msg in call_transcript[-3:]
        if msg["sender"] == "bot"
    ]
    still_collecting = any(
        any(kw in msg for kw in _EMAIL_KEYWORDS)
        for msg in recent_bot_msgs
    )
    if not still_collecting:
        session.options.min_endpointing_delay = 0.5
        logger.info("VAD sensitivity restored to normal (0.5s)")


def _maybe_play_typing_sound(text: str, background_audio_ref: dict | None) -> None:
    """Play a typing sound when the user is providing structured data."""
    if not background_audio_ref:
        return
    if not background_audio_ref.get("started"):
        return

    text_lower = text.lower()
    if any(kw in text_lower for kw in _DATA_KEYWORDS):
        player = background_audio_ref.get("player")
        if player:
            try:
                player.play(AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING, volume=0.6))
                logger.info("Playing typing sound - user providing data")
            except Exception as e:
                logger.debug(f"Failed to play typing sound: {e}")

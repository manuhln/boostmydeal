"""
Metrics-collection event handler for the AgentSession.

Registers a ``metrics_collected`` listener that logs per-component latency
and feeds an aggregated ``UsageCollector``.
"""

import logging

from livekit.agents import metrics as lk_metrics

logger = logging.getLogger(__name__)


def register_metrics_handler(session, ctx) -> lk_metrics.UsageCollector:
    """Wire up metrics logging on *session* and return the collector."""

    usage_collector = lk_metrics.UsageCollector()

    @session.on("metrics_collected")
    def _on_metrics_collected(ev):
        m = ev.metrics

        if hasattr(m, "ttft") and hasattr(m, "completion_tokens"):
            # LLM metrics
            logger.info(
                f"LLM  | ttft={m.ttft:.3f}s  duration={m.duration:.3f}s  "
                f"tokens_in={m.prompt_tokens}  tokens_out={m.completion_tokens}  "
                f"tps={m.tokens_per_second:.1f}"
            )
        elif hasattr(m, "ttfb") and hasattr(m, "characters_count"):
            # TTS metrics
            logger.info(
                f"TTS  | ttfb={m.ttfb:.3f}s  duration={m.duration:.3f}s  "
                f"audio={m.audio_duration:.2f}s  chars={m.characters_count}  "
                f"streamed={m.streamed}"
            )
        elif hasattr(m, "end_of_utterance_delay"):
            # EOU metrics
            logger.info(
                f"EOU  | eou_delay={m.end_of_utterance_delay:.3f}s  "
                f"transcription_delay={m.transcription_delay:.3f}s"
            )
        elif hasattr(m, "audio_duration") and hasattr(m, "streamed"):
            # STT metrics
            logger.info(
                f"STT  | audio_duration={m.audio_duration:.2f}s  "
                f"duration={m.duration:.3f}s  streamed={m.streamed}"
            )
        elif hasattr(m, "inference_count"):
            # VAD metrics – noisy, keep at DEBUG
            logger.debug(
                f"VAD  | inferences={m.inference_count}  "
                f"inference_time={m.inference_duration_total:.3f}s"
            )

        usage_collector.collect(m)

    # Log aggregated summary when the job shuts down
    async def _log_usage_summary():
        summary = usage_collector.get_summary()
        logger.info(f"Call usage summary: {summary}")

    ctx.add_shutdown_callback(_log_usage_summary)

    return usage_collector

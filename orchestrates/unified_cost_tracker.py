"""
Unified Cost and Usage Tracker
Combines cost calculation, usage tracking, and real-time cost calculation into one robust module.
Handles all AI service usage tracking and cost calculation with proper error handling.
"""

import time
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class ServiceUsage:
    """Track usage for a specific service"""
    provider: str = ""
    model: str = ""
    total_usage: float = 0.0
    usage_count: int = 0
    usage_details: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class LLMUsage:
    """Track LLM usage with detailed breakdown"""
    provider: str = ""
    model: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    requests_count: int = 0
    usage_contexts: List[str] = field(default_factory=list)


@dataclass
class CostBreakdown:
    """Detailed cost breakdown for a call"""
    transcription_cost: float = 0.0
    synthesis_cost: float = 0.0
    llm_cost: float = 0.0
    telephony_cost: float = 0.0
    total_cost: float = 0.0

    # Usage metrics
    transcription_seconds: float = 0.0
    synthesis_characters: int = 0
    llm_input_tokens: int = 0
    llm_output_tokens: int = 0
    call_duration_seconds: float = 0.0

    # Provider-specific details
    transcription_provider: str = ""
    synthesis_provider: str = ""
    llm_provider: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for webhook payload"""
        return {
            "cost_breakdown": {
                "transcription_cost": round(self.transcription_cost, 6),
                "synthesis_cost": round(self.synthesis_cost, 6),
                "llm_cost": round(self.llm_cost, 6),
                "telephony_cost": round(self.telephony_cost, 6),
                "total_cost": round(self.total_cost, 6)
            },
            "usage_metrics": {
                "transcription_seconds": round(self.transcription_seconds, 2),
                "synthesis_characters": self.synthesis_characters,
                "llm_input_tokens": self.llm_input_tokens,
                "llm_output_tokens": self.llm_output_tokens,
                "call_duration_seconds": round(self.call_duration_seconds, 2)
            },
            "providers": {
                "transcription_provider": self.transcription_provider,
                "synthesis_provider": self.synthesis_provider,
                "llm_provider": self.llm_provider
            }
        }


@dataclass
class CallMetrics:
    """Comprehensive usage metrics for a single call"""
    call_id: str = ""
    start_time: float = 0.0

    # Speech-to-Text Usage
    transcription: ServiceUsage = field(default_factory=ServiceUsage)

    # Text-to-Speech Usage
    synthesis: ServiceUsage = field(default_factory=ServiceUsage)

    # LLM Usage (with detailed breakdown)
    llm: LLMUsage = field(default_factory=LLMUsage)

    # Additional metrics
    call_duration_seconds: float = 0.0
    transcript_characters: int = 0
    transcript_words: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for webhook payload"""
        return {
            "call_metadata": {
                "call_id": self.call_id,
                "call_duration_seconds": round(self.call_duration_seconds, 2),
                "transcript_characters": self.transcript_characters,
                "transcript_words": self.transcript_words,
                "tracked_at": datetime.utcnow().isoformat() + "Z"
            },
            "transcription_usage": {
                "provider": self.transcription.provider,
                "model": self.transcription.model,
                "total_seconds": round(self.transcription.total_usage, 2),
                "request_count": self.transcription.usage_count,
                "usage_details": self.transcription.usage_details
            },
            "synthesis_usage": {
                "provider": self.synthesis.provider,
                "model": self.synthesis.model,
                "total_characters": int(self.synthesis.total_usage),
                "request_count": self.synthesis.usage_count,
                "usage_details": self.synthesis.usage_details
            },
            "llm_usage": {
                "provider": self.llm.provider,
                "model": self.llm.model,
                "input_tokens": self.llm.input_tokens,
                "output_tokens": self.llm.output_tokens,
                "total_tokens": self.llm.total_tokens,
                "request_count": self.llm.requests_count,
                "usage_contexts": self.llm.usage_contexts
            }
        }


class UnifiedCostTracker:
    """Unified tracker for usage metrics and cost calculation with real provider pricing"""

    def __init__(self):
        # Call tracking data
        self.call_metrics: Dict[str, CallMetrics] = {}
        self.call_costs: Dict[str, CostBreakdown] = {}
        self.call_start_times: Dict[str, float] = {}

        # Real provider pricing rates (2025)
        self.pricing_rates = {
            # Deepgram pricing (per minute)
            "deepgram": {
                "nova-2": 0.0036,  # $0.0036 per minute (Pay As You Go)
                "enhanced": 0.0115,
                "base": 0.0095,
                "whisper": 0.0048,
                "default": 0.0036
            },

            # Rime TTS pricing (estimated industry rates)
            "rime": {
                "mist": 0.000016,  # ~$16 per 1M characters
                "arcana": 0.000020,  # ~$20 per 1M characters
                "default": 0.000016
            },

            # ElevenLabs TTS pricing (per character)
            "elevenlabs": {
                "turbo_v2": 0.000018,  # $18 per 1M characters
                "multilingual_v2": 0.000030,  # $30 per 1M characters
                "eleven_multilingual_v2": 0.000030,  # $30 per 1M characters  
                "eleven_flash_v2": 0.000018,  # Same as turbo_v2
                "eleven_turbo_v2": 0.000018,  # Same as turbo_v2
                "default": 0.000018
            },
            "eleven_labs": {  # Alternative naming
                "turbo_v2": 0.000018,
                "multilingual_v2": 0.000030,
                "eleven_multilingual_v2": 0.000030,  # $30 per 1M characters
                "eleven_flash_v2": 0.000018,  # Same as turbo_v2
                "eleven_turbo_v2": 0.000018,  # Same as turbo_v2
                "default": 0.000018
            },

            # StreamElements TTS (free service)
            "streamelements": {
                "default": 0.0
            },
            "stream_elements": {  # Alternative naming
                "default": 0.0
            },

            # Twilio telephony costs (per minute)
            "twilio": {
                "outbound_local": 0.014,
                "outbound_tollfree": 0.014,
                "outbound_default": 0.014,
                "browser_app": 0.004,
                "recording": 0.0025
            },

            # OpenAI LLM pricing (per token)
            "openai": {
                "gpt-4": {
                    "input": 0.000005,  # $5 per 1M input tokens
                    "output": 0.000020  # $20 per 1M output tokens
                },
                "gpt-4o": {
                    "input": 0.000005,
                    "output": 0.000020
                },
                "gpt-4o-mini": {
                    "input": 0.00000015,  # $0.15 per 1M input tokens
                    "output": 0.0000006  # $0.60 per 1M output tokens
                },
                "gpt-4.1-nano": {
                    "input": 0.0000001,
                    "output": 0.0000004
                },
                "gpt-4-turbo": {
                    "input": 0.000010,
                    "output": 0.000030
                },
                "gpt-3.5-turbo": {
                    "input": 0.0000005,
                    "output": 0.0000015
                }
            }
        }

    def start_call_tracking(self,
                            call_id: str,
                            transcription_provider: str = "deepgram",
                            transcription_model: str = "nova-2",
                            synthesis_provider: str = "eleven_labs",
                            synthesis_model: str = "default",
                            llm_provider: str = "openai",
                            llm_model: str = "gpt-4o-mini") -> None:
        """Initialize comprehensive tracking for a new call"""

        # Initialize usage metrics
        metrics = CallMetrics(call_id=call_id, start_time=time.time())

        # Initialize transcription tracking
        metrics.transcription = ServiceUsage(provider=transcription_provider,
                                             model=transcription_model)

        # Initialize synthesis tracking
        metrics.synthesis = ServiceUsage(provider=synthesis_provider,
                                         model=synthesis_model)

        # Initialize LLM tracking
        metrics.llm = LLMUsage(provider=llm_provider, model=llm_model)

        self.call_metrics[call_id] = metrics

        # Initialize cost tracking
        self.call_costs[call_id] = CostBreakdown(
            transcription_provider=transcription_provider,
            synthesis_provider=synthesis_provider,
            llm_provider=llm_provider)

        self.call_start_times[call_id] = time.time()
        logger.info(f"💰 Unified tracking initialized for call {call_id}")

    def add_transcription_usage(self,
                                call_id: str,
                                duration_seconds: float,
                                model: Optional[str] = None,
                                context: str = "speech_to_text") -> None:
        """Track transcription usage and calculate cost with deduplication"""
        if call_id not in self.call_metrics:
            logger.warning(f"⚠️ No tracking initialized for call {call_id}")
            return

        # Session-based deduplication for transcript estimation vs real-time data
        metrics = self.call_metrics[call_id]

        # If this is transcript estimation and we already have real-time data, skip
        if context == "speech_recognition_from_transcript" and metrics.transcription.usage_count > 0:
            logger.debug(
                f"🔄 Skipping transcript estimation - already have {metrics.transcription.usage_count} real-time transcription events"
            )
            return

        # If we're adding real-time data but already have transcript estimation, reset and start fresh
        if context == "live_transcription" and any(
                "transcript" in detail.get("context", "")
                for detail in metrics.transcription.usage_details):
            logger.info(
                f"🔄 Switching from transcript estimation to real-time data for call {call_id}"
            )
            metrics.transcription.total_usage = 0
            metrics.transcription.usage_count = 0
            metrics.transcription.usage_details = []

        # Update usage metrics
        metrics.transcription.total_usage += duration_seconds
        metrics.transcription.usage_count += 1
        metrics.transcription.usage_details.append({
            "timestamp":
            datetime.utcnow().isoformat() + "Z",
            "duration_seconds":
            round(duration_seconds, 2),
            "context":
            context
        })

        # Update cost breakdown
        if call_id in self.call_costs:
            cost_breakdown = self.call_costs[call_id]
            cost_breakdown.transcription_seconds += duration_seconds

            # Calculate cost
            provider = cost_breakdown.transcription_provider.lower()
            actual_model = model or metrics.transcription.model or "default"
            if actual_model is None:
                actual_model = "default"
            duration_minutes = duration_seconds / 60.0

            rate = 0
            if provider in self.pricing_rates:
                provider_rates = self.pricing_rates[provider]
                rate = provider_rates.get(actual_model.lower(),
                                          provider_rates.get("default", 0))

            cost = duration_minutes * rate
            cost_breakdown.transcription_cost += cost
            self._update_total_cost(call_id)

            logger.debug(
                f"🎤 Added transcription: {duration_seconds:.2f}s at ${rate:.6f}/min = ${cost:.6f}"
            )

    def add_synthesis_usage(self,
                            call_id: str,
                            character_count: int,
                            model: Optional[str] = None,
                            context: str = "text_to_speech") -> None:
        """Track synthesis usage and calculate cost with deduplication"""
        if call_id not in self.call_metrics:
            logger.warning(f"⚠️ No tracking initialized for call {call_id}")
            return

        # Session-based deduplication for transcript estimation vs real-time data
        metrics = self.call_metrics[call_id]

        # If this is transcript estimation and we already have real-time data, skip
        if context == "agent_responses_from_transcript" and metrics.synthesis.usage_count > 0:
            logger.debug(
                f"🔄 Skipping synthesis transcript estimation - already have {metrics.synthesis.usage_count} real-time synthesis events"
            )
            return

        # If we're adding real-time data but already have transcript estimation, reset and start fresh
        if context == "live_synthesis" and any(
                "transcript" in detail.get("context", "")
                for detail in metrics.synthesis.usage_details):
            logger.info(
                f"🔄 Switching from synthesis transcript estimation to real-time data for call {call_id}"
            )
            metrics.synthesis.total_usage = 0
            metrics.synthesis.usage_count = 0
            metrics.synthesis.usage_details = []

        # Update usage metrics
        metrics.synthesis.total_usage += character_count
        metrics.synthesis.usage_count += 1
        metrics.synthesis.usage_details.append({
            "timestamp":
            datetime.utcnow().isoformat() + "Z",
            "character_count":
            character_count,
            "context":
            context
        })

        # Update cost breakdown
        if call_id in self.call_costs:
            cost_breakdown = self.call_costs[call_id]
            cost_breakdown.synthesis_characters += character_count

            # Calculate cost with robust model handling
            provider = cost_breakdown.synthesis_provider.lower()
            actual_model = model or metrics.synthesis.model or "default"

            # Handle None model gracefully
            if actual_model is None:
                actual_model = "default"
            else:
                actual_model = str(actual_model)

            rate = 0
            if provider in self.pricing_rates:
                provider_rates = self.pricing_rates[provider]
                rate = provider_rates.get(actual_model.lower(),
                                          provider_rates.get("default", 0))

            cost = character_count * rate
            cost_breakdown.synthesis_cost += cost
            self._update_total_cost(call_id)

            logger.debug(
                f"🗣️ Added synthesis: {character_count} chars at ${rate:.6f}/char = ${cost:.6f}"
            )

    def add_llm_usage(self,
                      call_id: str,
                      input_tokens: int,
                      output_tokens: int,
                      model: Optional[str] = None,
                      context: str = "agent_response") -> None:
        """Track LLM usage and calculate cost with deduplication"""
        if call_id not in self.call_metrics:
            logger.warning(f"⚠️ No tracking initialized for call {call_id}")
            return

        # Session-based deduplication for transcript estimation vs real-time data
        metrics = self.call_metrics[call_id]

        # If this is transcript estimation and we already have real-time data, skip
        if context == "agent_conversation" and any(
                "live_agent_response" in ctx
                for ctx in metrics.llm.usage_contexts):
            logger.debug(
                f"🔄 Skipping LLM transcript estimation - already have real-time LLM data"
            )
            return

        # Update usage metrics
        metrics.llm.input_tokens += input_tokens
        metrics.llm.output_tokens += output_tokens
        metrics.llm.total_tokens += (input_tokens + output_tokens)
        metrics.llm.requests_count += 1
        metrics.llm.usage_contexts.append(
            f"{context}:{input_tokens}/{output_tokens}")

        # Update cost breakdown
        if call_id in self.call_costs:
            cost_breakdown = self.call_costs[call_id]
            cost_breakdown.llm_input_tokens += input_tokens
            cost_breakdown.llm_output_tokens += output_tokens

            # Calculate cost
            provider = cost_breakdown.llm_provider.lower()
            actual_model = model or metrics.llm.model or "gpt-4o-mini"
            if actual_model is None:
                actual_model = "gpt-4o-mini"

            input_rate = 0
            output_rate = 0

            if provider in self.pricing_rates:
                provider_rates = self.pricing_rates[provider]
                if actual_model in provider_rates:
                    model_rates = provider_rates[actual_model]
                    input_rate = model_rates.get("input", 0)
                    output_rate = model_rates.get("output", 0)
                else:
                    # Default to gpt-4o-mini rates
                    default_rates = provider_rates.get("gpt-4o-mini", {
                        "input": 0,
                        "output": 0
                    })
                    input_rate = default_rates.get("input", 0)
                    output_rate = default_rates.get("output", 0)

            input_cost = input_tokens * input_rate
            output_cost = output_tokens * output_rate
            total_llm_cost = input_cost + output_cost

            cost_breakdown.llm_cost += total_llm_cost
            self._update_total_cost(call_id)

            logger.debug(
                f"🤖 Added LLM: {input_tokens}+{output_tokens} tokens = ${total_llm_cost:.6f}"
            )

    def add_telephony_cost(
            self,
            call_id: str,
            call_duration_seconds: float,
            call_type: str = "outbound_default",
            recording_enabled: bool = False,
            real_cost_data: Optional[Dict[str, Any]] = None) -> None:
        """Add telephony costs from real data or estimates"""
        if call_id not in self.call_costs:
            logger.warning(f"⚠️ No cost tracking for call {call_id}")
            return

        cost_breakdown = self.call_costs[call_id]
        cost_breakdown.call_duration_seconds = call_duration_seconds

        # If we have real cost data from Twilio API, use it
        if real_cost_data and real_cost_data.get(
                "data_source") == "twilio_api":
            actual_cost = real_cost_data.get("cost_usd", 0)
            actual_duration_minutes = real_cost_data.get("duration_minutes", 0)

            # Add recording cost if enabled
            recording_cost = 0
            if recording_enabled:
                recording_rate = self.pricing_rates.get("twilio", {}).get(
                    "recording", 0.0025)
                recording_cost = actual_duration_minutes * recording_rate

            total_telephony_cost = actual_cost + recording_cost
            logger.info(
                f"💰 Using real Twilio cost: ${actual_cost:.6f} + recording: ${recording_cost:.6f}"
            )
        else:
            # Fallback to estimated costs
            call_duration_minutes = call_duration_seconds / 60.0
            twilio_rates = self.pricing_rates.get("twilio", {})
            call_rate = twilio_rates.get(
                call_type, twilio_rates.get("outbound_default", 0.014))

            call_cost = call_duration_minutes * call_rate
            recording_cost = 0
            if recording_enabled:
                recording_rate = twilio_rates.get("recording", 0.0025)
                recording_cost = call_duration_minutes * recording_rate

            total_telephony_cost = call_cost + recording_cost
            logger.info(
                f"💰 Using estimated telephony cost: ${total_telephony_cost:.6f}"
            )

        cost_breakdown.telephony_cost = total_telephony_cost
        self._update_total_cost(call_id)

    def set_transcript_metadata(self, call_id: str, transcript: str) -> None:
        """Set transcript-based metadata"""
        if call_id not in self.call_metrics:
            return

        metrics = self.call_metrics[call_id]
        metrics.transcript_characters = len(transcript)
        metrics.transcript_words = len(transcript.split())

    def _update_total_cost(self, call_id: str) -> None:
        """Update total cost for the call"""
        if call_id not in self.call_costs:
            return

        cost_breakdown = self.call_costs[call_id]
        cost_breakdown.total_cost = (cost_breakdown.transcription_cost +
                                     cost_breakdown.synthesis_cost +
                                     cost_breakdown.llm_cost +
                                     cost_breakdown.telephony_cost)

    def get_call_metrics(self, call_id: str,
                         full_transcript) -> Optional[CallMetrics]:
        """Get current usage metrics for a call"""
        return self.call_metrics.get(call_id)

    def get_call_cost(self, call_id: str) -> Optional[CostBreakdown]:
        """Get current cost breakdown for a call"""
        return self.call_costs.get(call_id)

    def finalize_call_metrics(self, call_id: str) -> Optional[CallMetrics]:
        """Finalize metrics and calculate call duration"""
        if call_id not in self.call_metrics:
            return None

    def update_call_metadata(self, call_id: str, duration_seconds: float, transcript_text: str) -> None:
        """Update call metadata with actual duration and transcript data"""
        if call_id not in self.call_metrics:
            logger.warning(f"⚠️ No tracking initialized for call {call_id}")
            return
            
        metrics = self.call_metrics[call_id]
        
        # Update call duration
        metrics.call_duration_seconds = duration_seconds
        
        # Update transcript metrics
        metrics.transcript_characters = len(transcript_text)
        metrics.transcript_words = len(transcript_text.split()) if transcript_text else 0
        
        logger.info(f"📊 Updated call metadata for {call_id}: {duration_seconds:.1f}s, {metrics.transcript_characters} chars, {metrics.transcript_words} words")

    def estimate_usage_from_transcript(self, call_id: str, transcript_text: str, call_duration_seconds: float) -> None:
        """Estimate usage from transcript when real-time tracking isn't available"""
        if call_id not in self.call_metrics:
            logger.warning(f"⚠️ No tracking initialized for call {call_id}")
            return
            
        metrics = self.call_metrics[call_id]
        
        # Only estimate if we don't have real-time data
        if metrics.transcription.usage_count == 0:
            # Estimate transcription usage based on call duration
            self.add_transcription_usage(call_id, call_duration_seconds, context="speech_recognition_from_transcript")
            logger.info(f"🎤 Estimated transcription usage: {call_duration_seconds:.1f}s from call duration")
        
        if metrics.synthesis.usage_count == 0:
            # Count BOT messages to estimate synthesis usage
            bot_lines = [line for line in transcript_text.split('\n') if line.startswith('BOT:')]
            bot_text = ' '.join(line[4:].strip() for line in bot_lines)  # Remove "BOT:" prefix
            bot_character_count = len(bot_text)
            
            if bot_character_count > 0:
                self.add_synthesis_usage(call_id, bot_character_count, context="agent_responses_from_transcript")
                logger.info(f"🗣️ Estimated synthesis usage: {bot_character_count} chars from bot responses")
        
        logger.info(f"📊 Usage estimation complete for call {call_id}")
        
    def get_comprehensive_cost_breakdown(self, call_id: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive cost breakdown including all services"""
        if call_id not in self.call_metrics or call_id not in self.call_costs:
            logger.warning(f"⚠️ No tracking data for call {call_id}")
            return None
            
        metrics = self.call_metrics[call_id]
        cost_breakdown = self.call_costs[call_id]
        
        # Calculate individual service costs
        transcription_cost = self._calculate_transcription_cost(metrics)
        synthesis_cost = self._calculate_synthesis_cost(metrics) 
        llm_cost = self._calculate_llm_cost(metrics)
        
        total_ai_services_cost = transcription_cost + synthesis_cost + llm_cost
        
        return {
            "call_id": call_id,
            "cost_breakdown": {
                "transcription_cost_usd": round(transcription_cost, 6),
                "synthesis_cost_usd": round(synthesis_cost, 6), 
                "llm_cost_usd": round(llm_cost, 6),
                "total_ai_services_cost_usd": round(total_ai_services_cost, 6)
            },
            "cost_details": {
                "transcription": {
                    "provider": metrics.transcription.provider,
                    "model": metrics.transcription.model,
                    "total_seconds": round(metrics.transcription.total_usage, 2),
                    "cost_usd": round(transcription_cost, 6)
                },
                "synthesis": {
                    "provider": metrics.synthesis.provider, 
                    "model": metrics.synthesis.model,
                    "total_characters": int(metrics.synthesis.total_usage),
                    "cost_usd": round(synthesis_cost, 6)
                },
                "llm": {
                    "provider": metrics.llm.provider,
                    "model": metrics.llm.model,
                    "input_tokens": metrics.llm.input_tokens,
                    "output_tokens": metrics.llm.output_tokens,
                    "total_tokens": metrics.llm.total_tokens,
                    "cost_usd": round(llm_cost, 6)
                }
            }
        }
        
    def _calculate_transcription_cost(self, metrics: CallMetrics) -> float:
        """Calculate transcription cost based on usage"""
        if metrics.transcription.total_usage <= 0:
            return 0.0
            
        duration_minutes = metrics.transcription.total_usage / 60.0
        provider = metrics.transcription.provider.lower()
        model = metrics.transcription.model.lower() if metrics.transcription.model else "default"
        
        # Default rates per minute
        rates = {
            "deepgram": {
                "nova-2": 0.0043,       # $0.0043/min for Nova-2
                "nova": 0.0043,
                "default": 0.0043
            },
            "default": {
                "default": 0.005        # Default STT rate
            }
        }
        
        rate = rates.get(provider, rates["default"]).get(model, rates["default"]["default"])
        cost = duration_minutes * rate
        
        logger.debug(f"🎤 Transcription cost: {duration_minutes:.2f} min × ${rate}/min = ${cost:.6f}")
        return cost
        
    def _calculate_synthesis_cost(self, metrics: CallMetrics) -> float:
        """Calculate synthesis cost based on usage"""
        if metrics.synthesis.total_usage <= 0:
            return 0.0
            
        character_count = int(metrics.synthesis.total_usage)
        provider = metrics.synthesis.provider.lower()
        model = metrics.synthesis.model.lower() if metrics.synthesis.model else "default"
        
        # Default rates per 1000 characters
        rates = {
            "eleven_labs": {
                "eleven_flash_v2": 0.0001,     # $0.10 per 1000 chars
                "eleven_multilingual_v2": 0.00024,  # $0.24 per 1000 chars
                "default": 0.0001
            },
            "rime": {
                "default": 0.0001               # $0.10 per 1000 chars estimate
            },
            "default": {
                "default": 0.00015              # Default TTS rate
            }
        }
        
        rate_per_1000 = rates.get(provider, rates["default"]).get(model, rates["default"]["default"])
        cost = (character_count / 1000.0) * rate_per_1000
        
        logger.debug(f"🗣️ Synthesis cost: {character_count} chars × ${rate_per_1000}/1k chars = ${cost:.6f}")
        return cost
        
    def _calculate_llm_cost(self, metrics: CallMetrics) -> float:
        """Calculate LLM cost based on token usage"""
        if metrics.llm.total_tokens <= 0:
            return 0.0
            
        provider = metrics.llm.provider.lower()
        model = metrics.llm.model.lower() if metrics.llm.model else "gpt-4o-mini"
        
        # Default rates per 1M tokens
        rates = {
            "openai": {
                "gpt-4o-mini": {
                    "input": 0.15,    # $0.15 per 1M input tokens
                    "output": 0.60    # $0.60 per 1M output tokens
                },
                "gpt-4o": {
                    "input": 2.50,    # $2.50 per 1M input tokens
                    "output": 10.00   # $10.00 per 1M output tokens
                },
                "gpt-4": {
                    "input": 30.00,   # $30.00 per 1M input tokens
                    "output": 60.00   # $60.00 per 1M output tokens
                }
            }
        }
        
        model_rates = rates.get(provider, {}).get(model, rates["openai"]["gpt-4o-mini"])
        input_rate = model_rates.get("input", 0.15)
        output_rate = model_rates.get("output", 0.60)
        
        input_cost = (metrics.llm.input_tokens / 1_000_000) * input_rate
        output_cost = (metrics.llm.output_tokens / 1_000_000) * output_rate
        total_cost = input_cost + output_cost
        
        logger.debug(f"🤖 LLM cost: {metrics.llm.input_tokens} input + {metrics.llm.output_tokens} output = ${total_cost:.6f}")
        return total_cost

    def finalize_call_cost(
            self,
            call_id: str,
            call_duration_seconds: Optional[float] = None) -> Dict[str, Any]:
        """Finalize cost calculation and return complete breakdown"""
        if call_id not in self.call_costs:
            return {}

        cost_breakdown = self.call_costs[call_id]

        # Calculate actual call duration if not provided
        if call_duration_seconds is None and call_id in self.call_start_times:
            call_duration_seconds = time.time(
            ) - self.call_start_times[call_id]

        if call_duration_seconds is not None:
            cost_breakdown.call_duration_seconds = call_duration_seconds

        # Add call metadata
        result = cost_breakdown.to_dict()
        result["call_metadata"] = {
            "call_id":
            call_id,
            "call_duration_seconds":
            round(
                call_duration_seconds
                if call_duration_seconds is not None else 0.0, 2),
            "cost_calculated_at":
            datetime.utcnow().isoformat() + "Z"
        }

        return result

    def calculate_total_costs(
            self,
            usage_metrics: Dict[str, Any],
            call_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Calculate comprehensive cost breakdown with individual provider costs and total"""

        logger.info("🧮 Calculating real costs using 2025 provider pricing...")

        cost_breakdown = {
            "calculation_timestamp": datetime.now().isoformat(),
            "pricing_year": "2025",
            "individual_costs": {},
            "total_cost": {
                "usd": 0.0,
                "formatted": "$0.000000"
            }
        }

        total_cost = 0.0

        # Calculate transcription costs
        if "transcription_usage" in usage_metrics:
            transcription_data = usage_metrics["transcription_usage"]
            transcription_cost = self._calculate_service_cost(
                "transcription", transcription_data)
            cost_breakdown["individual_costs"][
                "transcription"] = transcription_cost
            total_cost += transcription_cost["cost_usd"]

            logger.info(
                f"🎤 Transcription: {transcription_cost['usage_minutes']:.4f} min × ${transcription_cost['rate_per_minute']:.6f}/min = ${transcription_cost['cost_usd']:.6f}"
            )

        # Calculate synthesis costs
        if "synthesis_usage" in usage_metrics:
            synthesis_data = usage_metrics["synthesis_usage"]
            synthesis_cost = self._calculate_service_cost(
                "synthesis", synthesis_data)
            cost_breakdown["individual_costs"]["synthesis"] = synthesis_cost
            total_cost += synthesis_cost["cost_usd"]

            logger.info(
                f"🗣️ Synthesis: {synthesis_cost['usage_characters']} chars × ${synthesis_cost['rate_per_character']:.6f}/char = ${synthesis_cost['cost_usd']:.6f}"
            )

        # Calculate LLM costs
        if "llm_usage" in usage_metrics:
            llm_data = usage_metrics["llm_usage"]
            llm_cost = self._calculate_service_cost("llm", llm_data)
            cost_breakdown["individual_costs"]["llm"] = llm_cost
            total_cost += llm_cost["total_cost_usd"]

            logger.info(
                f"🤖 LLM: {llm_cost['input_tokens']} input + {llm_cost['output_tokens']} output tokens = ${llm_cost['total_cost_usd']:.6f}"
            )

        # Calculate telephony costs if call data provided
        if call_data:
            telephony_cost = self._calculate_service_cost(
                "telephony", call_data)
            cost_breakdown["individual_costs"]["telephony"] = telephony_cost
            total_cost += telephony_cost["total_cost_usd"]

            call_minutes = telephony_cost["duration_minutes"]
            logger.info(
                f"📞 Telephony: {call_minutes:.4f} min × ${telephony_cost['call_rate_per_minute']:.6f}/min = ${telephony_cost['call_cost_usd']:.6f}"
            )
            if telephony_cost["recording_enabled"]:
                logger.info(
                    f"📹 Recording: {call_minutes:.4f} min × ${telephony_cost['recording_rate_per_minute']:.6f}/min = ${telephony_cost['recording_cost_usd']:.6f}"
                )

        # Set total cost
        cost_breakdown["total_cost"]["usd"] = round(total_cost, 6)
        cost_breakdown["total_cost"]["formatted"] = f"${total_cost:.6f}"

        logger.info(f"💰 TOTAL COST: ${total_cost:.6f}")

        return cost_breakdown

    def _calculate_service_cost(self, service_type: str,
                                usage_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate cost for a specific service type"""

        if service_type == "transcription":
            provider = usage_data.get("provider", "").lower()
            model = usage_data.get("model", "default")
            if model is None:
                model = "default"
            else:
                model = str(model)
            model = model.lower()
            total_seconds = usage_data.get("total_seconds", 0)

            total_minutes = total_seconds / 60.0
            rate_per_minute = 0

            if provider in self.pricing_rates:
                provider_rates = self.pricing_rates[provider]
                rate_per_minute = provider_rates.get(
                    model, provider_rates.get("default", 0))

            cost = total_minutes * rate_per_minute

            return {
                "provider": provider,
                "model": model,
                "usage_seconds": total_seconds,
                "usage_minutes": round(total_minutes, 4),
                "rate_per_minute": rate_per_minute,
                "cost_usd": round(cost, 6),
                "cost_formatted": f"${cost:.6f}"
            }

        elif service_type == "synthesis":
            provider = usage_data.get("provider", "").lower()
            model = usage_data.get("model", "default")
            if model is None:
                model = "default"
            else:
                model = str(model)
            model = model.lower()
            total_characters = usage_data.get("total_characters", 0)

            rate_per_char = 0
            if provider in self.pricing_rates:
                provider_rates = self.pricing_rates[provider]
                rate_per_char = provider_rates.get(
                    model, provider_rates.get("default", 0))

            cost = total_characters * rate_per_char

            return {
                "provider": provider,
                "model": model,
                "usage_characters": total_characters,
                "rate_per_character": rate_per_char,
                "cost_usd": round(cost, 6),
                "cost_formatted": f"${cost:.6f}"
            }

        elif service_type == "llm":
            provider = usage_data.get("provider", "").lower()
            model = usage_data.get("model", "gpt-4o-mini")
            if model is None:
                model = "gpt-4o-mini"
            else:
                model = str(model)
            model = model.lower()
            input_tokens = usage_data.get("input_tokens", 0)
            output_tokens = usage_data.get("output_tokens", 0)

            input_rate = 0
            output_rate = 0

            if provider in self.pricing_rates:
                provider_rates = self.pricing_rates[provider]
                if model in provider_rates:
                    model_rates = provider_rates[model]
                    input_rate = model_rates.get("input", 0)
                    output_rate = model_rates.get("output", 0)
                else:
                    default_rates = provider_rates.get("gpt-4o-mini", {
                        "input": 0,
                        "output": 0
                    })
                    input_rate = default_rates.get("input", 0)
                    output_rate = default_rates.get("output", 0)

            input_cost = input_tokens * input_rate
            output_cost = output_tokens * output_rate
            total_cost = input_cost + output_cost

            return {
                "provider": provider,
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens,
                "input_rate_per_token": input_rate,
                "output_rate_per_token": output_rate,
                "input_cost_usd": round(input_cost, 6),
                "output_cost_usd": round(output_cost, 6),
                "total_cost_usd": round(total_cost, 6),
                "cost_formatted": f"${total_cost:.6f}"
            }

        elif service_type == "telephony":
            call_duration_seconds = usage_data.get("duration_seconds", 0)
            call_type = usage_data.get("call_type", "outbound_default")
            recording_enabled = usage_data.get("recording_enabled", False)
            real_cost_data = usage_data.get("real_cost_data")

            # If we have real cost data from Twilio API, use it
            if real_cost_data and real_cost_data.get(
                    "data_source") == "twilio_api":
                actual_cost = real_cost_data.get("cost_usd", 0)
                actual_duration_minutes = real_cost_data.get(
                    "duration_minutes", 0)
                actual_rate_per_minute = real_cost_data.get(
                    "rate_per_minute", 0)

                recording_cost = 0
                if recording_enabled:
                    recording_rate = self.pricing_rates.get("twilio", {}).get(
                        "recording", 0.0025)
                    recording_cost = actual_duration_minutes * recording_rate

                total_telephony_cost = actual_cost + recording_cost

                return {
                    "provider":
                    "twilio",
                    "call_type":
                    call_type,
                    "call_sid":
                    real_cost_data.get("call_sid", ""),
                    "call_status":
                    real_cost_data.get("call_status", "completed"),
                    "duration_seconds":
                    real_cost_data.get("duration_seconds", 0),
                    "duration_minutes":
                    actual_duration_minutes,
                    "call_rate_per_minute":
                    actual_rate_per_minute,
                    "call_cost_usd":
                    actual_cost,
                    "recording_enabled":
                    recording_enabled,
                    "recording_rate_per_minute":
                    self.pricing_rates.get("twilio", {}).get(
                        "recording", 0.0025) if recording_enabled else 0,
                    "recording_cost_usd":
                    round(recording_cost, 6),
                    "total_cost_usd":
                    round(total_telephony_cost, 6),
                    "cost_formatted":
                    f"${total_telephony_cost:.6f}",
                    "data_source":
                    "twilio_api",
                    "fetched_at":
                    real_cost_data.get("fetched_at", "")
                }

            # Fallback to estimated costs
            call_duration_minutes = call_duration_seconds / 60.0
            twilio_rates = self.pricing_rates.get("twilio", {})
            call_rate_per_minute = twilio_rates.get(
                call_type, twilio_rates.get("outbound_default", 0.014))

            call_cost = call_duration_minutes * call_rate_per_minute
            recording_cost = 0
            if recording_enabled:
                recording_rate = twilio_rates.get("recording", 0.0025)
                recording_cost = call_duration_minutes * recording_rate

            total_telephony_cost = call_cost + recording_cost

            return {
                "provider":
                "twilio",
                "call_type":
                call_type,
                "duration_seconds":
                call_duration_seconds,
                "duration_minutes":
                round(call_duration_minutes, 4),
                "call_rate_per_minute":
                call_rate_per_minute,
                "call_cost_usd":
                round(call_cost, 6),
                "recording_enabled":
                recording_enabled,
                "recording_rate_per_minute":
                twilio_rates.get("recording", 0.0025)
                if recording_enabled else 0,
                "recording_cost_usd":
                round(recording_cost, 6),
                "total_cost_usd":
                round(total_telephony_cost, 6),
                "cost_formatted":
                f"${total_telephony_cost:.6f}",
                "data_source":
                "estimated"
            }

        return {}

    def cleanup_call(self, call_id: str) -> None:
        """Clean up tracking data for completed call"""
        self.call_metrics.pop(call_id, None)
        self.call_costs.pop(call_id, None)
        self.call_start_times.pop(call_id, None)
        logger.info(f"🧹 Cleaned up tracking data for call {call_id}")


# Global unified tracker instance
unified_cost_tracker = UnifiedCostTracker()

# Legacy compatibility - expose old interfaces
cost_calculator = unified_cost_tracker  # For cost_calculator.start_call_tracking() calls
usage_tracker = unified_cost_tracker  # For usage_tracker.add_* calls
real_cost_calculator = unified_cost_tracker  # For real_cost_calculator.calculate_total_costs() calls

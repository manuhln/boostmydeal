# Cost Tracking Documentation

The system automatically calculates and reports the total cost of each call in the `TRANSCRIPT_COMPLETE` webhook.

## Cost Components

Each call incurs costs from four main components:

### 1. Calling Provider
**Rate:** $0.0457 per minute (both Twilio and Voxsun)

The system automatically detects your calling provider based on the `LIVEKIT_SIP_TRUNK_ID`:
- Contains "twilio" → uses Twilio rates
- Otherwise → uses Voxsun rates (same as Twilio)

### 2. Text-to-Speech (TTS)

| Provider | Model | Rate | Notes |
|----------|-------|------|-------|
| **ElevenLabs** | Standard voices | $0.20 per 1,000 chars | Default |
| **ElevenLabs** | Turbo models | $0.15 per 1,000 chars | Models with "turbo" in name |
| **Smallest.ai** | All models | $0.05 per 1,000 chars | Most cost-effective |
| **OpenAI** | All TTS models | $0.015 per 1,000 chars | Very affordable |

**Calculation:** Based on total characters in all bot messages from the transcript.

### 3. Speech-to-Text (STT)

#### Deepgram
| Model | Rate per Minute |
|-------|----------------|
| nova-2 | $0.0043 |
| nova | $0.0048 |
| enhanced | $0.0055 |

#### OpenAI
| Model | Rate per Minute |
|-------|----------------|
| gpt-4o-mini-transcribe | $0.003 |
| gpt-4o-transcribe | $0.006 |
| whisper-1 | $0.006 |

**Calculation:** Based on total call duration in minutes.

### 4. LLM (Language Model)

| Model | Input | Output |
|-------|-------|--------|
| gpt-4o-mini | $0.150 per 1M tokens | $0.600 per 1M tokens |
| gpt-4o | $2.50 per 1M tokens | $10.00 per 1M tokens |
| gpt-4-turbo | $10.00 per 1M tokens | $30.00 per 1M tokens |

**Note:** LLM token tracking is currently estimated at $0 since LiveKit doesn't expose token counts directly. This will be enhanced in future versions.

## Webhook Response

The `TRANSCRIPT_COMPLETE` webhook includes a `cost_breakdown` field:

```json
{
  "type": "TRANSCRIPT_COMPLETE",
  "call_id": "call-xyz123",
  "full_transcript": "BOT: Hello!\\nUSER: Hi there!\\n...",
  "recording_urls": ["https://..."],
  "cost_breakdown": {
    "calling_provider_cost": 0.0914,
    "tts_cost": 0.0120,
    "stt_cost": 0.0086,
    "llm_cost": 0.0000,
    "total_cost": 0.1120,
    "currency": "USD"
  }
}
```

## Cost Breakdown Fields

- **calling_provider_cost**: Cost of making the phone call
- **tts_cost**: Cost of text-to-speech (agent speaking)
- **stt_cost**: Cost of speech-to-text (user transcription)
- **llm_cost**: Cost of LLM processing (currently $0)
- **total_cost**: Sum of all costs
- **currency**: Always "USD"

All costs are rounded to 4 decimal places.

## Example Cost Calculation

**Call Details:**
- Duration: 2 minutes (120 seconds)
- TTS Provider: Smallest.ai
- Bot spoke: 500 characters
- STT Provider: Deepgram nova-2
- LLM: gpt-4o-mini

**Breakdown:**
```
Calling:  2 min × $0.0457/min  = $0.0914
TTS:      500 chars ÷ 1000 × $0.05 = $0.0250
STT:      2 min × $0.0043/min = $0.0086
LLM:      (estimated)          = $0.0000
-------------------------------------------
Total:                         = $0.1250
```

## Cost Optimization Tips

### Use Cost-Effective Providers

**Lowest Cost Combination:**
- **STT:** OpenAI gpt-4o-mini-transcribe ($0.003/min)
- **TTS:** Smallest.ai ($0.05/1K chars)
- **LLM:** gpt-4o-mini ($0.150/$0.600 per 1M tokens)

**Example 5-minute call:**
```
Calling:  5 min × $0.0457     = $0.2285
TTS:      1000 chars × $0.05  = $0.0500
STT:      5 min × $0.003      = $0.0150
LLM:      ~estimate           = $0.0200
-------------------------------------------
Total:                        ≈ $0.3135
```

### Keep Calls Short
- Most cost comes from calling time ($0.0457/min)
- Design agent to be concise and efficient

### Minimize TTS Characters
- Keep agent responses brief and to the point
- Avoid unnecessary pleasantries in long conversations
- Use Smallest.ai for cost savings (4x cheaper than ElevenLabs)

### Choose Appropriate Models
- Use gpt-4o-mini for LLM (sufficient for most cases)
- Use OpenAI gpt-4o-mini-transcribe for STT (cheapest option)
- Only upgrade to premium models when quality is critical

## Implementation Details

The cost calculator:
1. **At call end:** Counts total bot characters from transcript
2. **Detects provider:** From trunk ID and config
3. **Calculates costs:** Using current pricing rates
4. **Rounds values:** To 4 decimal places
5. **Sends webhook:** Includes complete breakdown

The module is located at `src/cost_calculator.py` and integrates automatically with every call.

## Pricing Source & Updates

Pricing information is sourced from official provider documentation as of November 2025. Rates may change over time. Update the pricing in `src/cost_calculator.py` as needed.

**Last Updated:** November 11, 2025

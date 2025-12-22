# TTS Provider Configuration Guide

This telephony server supports **three TTS providers**: ElevenLabs, OpenAI, and Smallest.ai.

---

## 🎙️ Supported TTS Providers

### 1. **ElevenLabs** (Default)
High-quality, natural-sounding voices with emotional range.

**Configuration:**
```json
{
  "tts": {
    "provider_name": "eleven_labs",
    "voice_id": "21m00Tcm4TlvDq8ikWAM",
    "model_id": "eleven_turbo_v2_5",
    "api_key": "your_elevenlabs_api_key"
  }
}
```

**Popular Voice IDs:**
- `21m00Tcm4TlvDq8ikWAM` - Rachel (female)
- `EXAVITQu4vr4xnSDxMaL` - Sarah (female)
- `pNInz6obpgDQGcFmaJgB` - Adam (male)

**Models:**
- `eleven_turbo_v2_5` - Fastest, low latency
- `eleven_multilingual_v2` - Supports multiple languages
- `eleven_monolingual_v1` - English only, high quality

---

### 2. **OpenAI TTS**
Simple, reliable text-to-speech from OpenAI.

**Configuration:**
```json
{
  "tts": {
    "provider_name": "openai",
    "voice_id": "alloy",
    "model_id": "",
    "api_key": "sk-your_openai_api_key"
  }
}
```

**Available Voices:**
- `alloy` - Neutral, balanced
- `echo` - Male, clear
- `fable` - British accent
- `onyx` - Deep male voice
- `nova` - Female, energetic
- `shimmer` - Soft, calm

---

### 3. **Smallest.ai** ⚡ (NEW)
Ultra-fast TTS with sub-100ms latency using Waves engine.

**Configuration:**
```json
{
  "tts": {
    "provider_name": "smallest_ai",
    "voice_id": "en-IN-female-neutral",
    "model_id": "waves-v2",
    "api_key": "your_smallest_api_key"
  }
}
```

**Popular Voice IDs:**
- `en-IN-female-neutral` - Female, Indian English
- `emily` - Female, American English
- `jasmine` - Female, neutral
- `arman` - Male, clear

**Models:**
- `waves-v2` - Latest, fastest model (default)
- `lightning-large` - More control, slightly slower

**Key Features:**
- ⚡ **Sub-100ms latency** - Fastest TTS available
- 🌍 **Multilingual support**
- 🎯 **Real-time streaming** optimized for voice assistants
- 💰 **Cost-effective** pricing

**Get API Key:**
Sign up at [console.smallest.ai](https://console.smallest.ai)

---

## 📞 Complete Example with Smallest.ai

```json
{
  "to_phone": "+918504088123",
  "from_phone": "+18567887699",
  "contact_name": "Rahul Kumar",
  "agent_initial_message": "Hi {customer name}, this is an AI assistant calling from XYZ company.",
  "user_speak_first": false,
  "agent_prompt_preamble": "You are a helpful AI assistant representing XYZ company.",
  "tts": {
    "provider_name": "smallest_ai",
    "voice_id": "emily",
    "model_id": "waves-v2",
    "api_key": "sk-smallest-xxxxx"
  },
  "stt": {
    "provider_name": "deepgram",
    "model": "nova-2",
    "api_key": "your_deepgram_key"
  },
  "model": {
    "name": "gpt-4o-mini",
    "api_key": "sk-openai-xxxxx"
  },
  "twilio_account_sid": "ACxxxx",
  "twilio_auth_token": "your_token"
}
```

---

## 🔄 Switching Between Providers

Simply change the `provider_name` in your API request:

| Provider | `provider_name` value | Best for |
|----------|----------------------|----------|
| ElevenLabs | `eleven_labs` | Highest quality, emotional range |
| OpenAI | `openai` | Simplicity, reliability |
| Smallest.ai | `smallest_ai` or `smallestai` | Ultra-low latency, real-time |

---

## 🎯 Recommendations

**For Production Contact Centers:**
→ Use **Smallest.ai** for lowest latency and cost

**For Marketing/Sales Calls:**
→ Use **ElevenLabs** for most natural, human-like voice

**For Simple Notifications:**
→ Use **OpenAI** for balance of quality and simplicity

---

## 🛠️ Testing

Test each provider by sending requests with different `provider_name` values to `/start_outbound_call`.

The agent will log which TTS provider is being used:
```
Using Smallest.ai TTS with model: waves-v2, voice: emily
```

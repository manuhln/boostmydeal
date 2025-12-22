# Speech-to-Text (STT) Providers

This document describes the supported STT (Speech-to-Text) providers for transcribing voice calls.

## Supported Providers

The system supports **two STT providers**:

1. **Deepgram** - Fast, accurate speech recognition (default)
2. **OpenAI** - High-quality transcription with GPT-4o models

---

## 1. Deepgram STT

**Best for:** Production use, real-time transcription, multilingual support

### Configuration

```json
{
  "stt": {
    "provider_name": "deepgram",
    "model": "nova-2",
    "api_key": "YOUR_DEEPGRAM_API_KEY"
  }
}
```

### Supported Models

- `nova-2` - Latest and most accurate model (recommended)
- `nova` - Previous generation model
- `base` - Baseline model for general use

### Language Support

Deepgram automatically detects language or you can specify it via the `language` parameter in `CallConfig`:

- English: `"en"`
- Spanish: `"es"`
- French: `"fr"`
- And many more...

### Getting an API Key

1. Sign up at [deepgram.com](https://deepgram.com)
2. Navigate to API Keys section
3. Create a new API key
4. Add it to your Replit Secrets as `DEEPGRAM_API_KEY`

---

## 2. OpenAI STT

**Best for:** High accuracy, GPT-powered transcription

### Configuration

```json
{
  "stt": {
    "provider_name": "openai",
    "model": "gpt-4o-transcribe",
    "api_key": "YOUR_OPENAI_API_KEY"
  }
}
```

### Supported Models

- `whisper-1` - General-purpose transcription (available to all accounts)
- `gpt-4o-transcribe` - Fast, high-quality GPT-4o transcription (requires access)
- `gpt-4o-mini-transcribe` - Faster, cost-effective alternative (requires access)
- `gpt-4o-transcribe-diarize` - Speaker diarization (requires access)

**Note:** The `gpt-4o-transcribe` models require special access from OpenAI. If you get a 403 error, use `whisper-1` instead.

### Language Support

OpenAI STT supports the same languages as Deepgram, configured via the `language` parameter:

- English: `"en"`
- Spanish: `"es"`
- French: `"fr"`
- And many more...

### Getting an API Key

1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys
3. Create a new API key
4. Add it to your Replit Secrets as `OPENAI_API_KEY`

### Features

- **Prompting:** You can provide context to improve transcription accuracy
- **Streaming:** Real-time transcription as audio is received
- **High accuracy:** Powered by GPT-4o models

---

## Complete Example

### Deepgram Configuration

```json
{
  "to_phone": "+1234567890",
  "from_phone": "+0987654321",
  "language": "en",
  "stt": {
    "provider_name": "deepgram",
    "model": "nova-2",
    "api_key": "YOUR_DEEPGRAM_API_KEY"
  }
}
```

### OpenAI Configuration

```json
{
  "to_phone": "+1234567890",
  "from_phone": "+0987654321",
  "language": "es",
  "stt": {
    "provider_name": "openai",
    "model": "gpt-4o-transcribe",
    "api_key": "YOUR_OPENAI_API_KEY"
  }
}
```

---

## Choosing the Right Provider

| Feature | Deepgram | OpenAI |
|---------|----------|--------|
| **Speed** | Very fast | Fast |
| **Accuracy** | Excellent | Excellent |
| **Cost** | Pay-per-use | Pay-per-use |
| **Real-time** | ✅ Yes | ✅ Yes |
| **Multi-language** | ✅ Yes | ✅ Yes |
| **Prompting** | ❌ No | ✅ Yes |
| **Diarization** | ❌ No | ✅ Yes (with gpt-4o-transcribe-diarize) |

### Recommendations

- **Default:** Use **Deepgram** with `nova-2` model for most use cases
- **High accuracy needs:** Use **OpenAI** with `gpt-4o-transcribe` for maximum quality
- **Speaker identification:** Use **OpenAI** with `gpt-4o-transcribe-diarize` to identify different speakers
- **Cost optimization:** Use **OpenAI** with `gpt-4o-mini-transcribe` for lower costs

---

## Automatic Fallback

If an invalid provider name is specified, the system attempts to fall back to **Deepgram** with the `nova-2` model:

```python
# Invalid provider
{
  "provider_name": "invalid_provider"
}
# System attempts to use Deepgram nova-2 instead (requires DEEPGRAM_API_KEY in environment)
```

**Important:** The fallback requires a valid `DEEPGRAM_API_KEY` in your environment variables. If the key is not found, the system will raise an error:

```
ValueError: Unknown STT provider 'invalid_provider' and no DEEPGRAM_API_KEY found for fallback
```

A warning is logged when fallback occurs:
```
[WARNING] Unknown STT provider 'invalid_provider', falling back to Deepgram
```

---

## Environment Variables

The system automatically sets the appropriate environment variable based on your provider choice:

- **Deepgram:** `DEEPGRAM_API_KEY`
- **OpenAI:** `OPENAI_API_KEY` (can share with LLM if same key)

---

## Testing Your Configuration

After configuring STT, test it by making a call and checking the logs:

```bash
# Look for STT initialization in logs
[INFO] Using OpenAI STT with model: gpt-4o-transcribe, language: en
# or
[INFO] Using Deepgram STT with model: nova-2, language: es
```

---

## Troubleshooting

### Common Issues

**1. Invalid API Key**
```
Error: Authentication failed
```
**Solution:** Verify your API key is correct and has not expired

**2. Model Not Found**
```
Error: Model 'xyz' not found
```
**Solution:** Use one of the supported models listed above

**3. Language Not Supported**
```
Warning: Unsupported language 'xx', falling back to English
```
**Solution:** The system automatically falls back to English. Ensure you're using a supported language code.

---

## API Reference

See [main API documentation](README.md) for complete request/response examples.

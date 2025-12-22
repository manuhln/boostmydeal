# Keyboard Typing Audio Configuration

## Overview

The AI agent now plays a **keyboard typing sound** (`typing-noise.wav`) when it's thinking/processing. This creates a more natural conversation experience by providing audio feedback during agent response generation.

## How It Works

### Audio File Location
The keyboard typing audio is provided by the vocode package:
```
/home/runner/workspace/.pythonlibs/lib/python3.11/site-packages/vocode/streaming/synthesizer/filler_audio/typing-noise.wav
```

### Configuration

The typing audio is configured via `FillerAudioConfig` in the `ChatGPTAgentConfig`:

```python
from vocode.streaming.models.agent import FillerAudioConfig

agent_config = ChatGPTAgentConfig(
    # ... other parameters ...
    send_filler_audio=True,
    filler_audio_config=FillerAudioConfig(
        silence_threshold_seconds=0.5,      # Play audio after 0.5s of silence
        use_phrases=False,                  # Don't use verbal filler phrases
        use_typing_noise=True               # Enable keyboard typing sound
    )
)
```

### Parameters Explained

| Parameter | Value | Description |
|-----------|-------|-------------|
| `silence_threshold_seconds` | `0.5` | How long to wait before playing filler audio (in seconds) |
| `use_phrases` | `False` | Whether to use verbal filler phrases like "umm", "let me see" |
| `use_typing_noise` | `True` | Whether to play keyboard typing sound when agent is thinking |

## When Does It Play?

The keyboard typing audio plays:
- **During agent processing**: When the agent is generating a response
- **After silence threshold**: Only if there's been 0.5+ seconds of silence
- **Before speech synthesis**: While the LLM is thinking, before TTS starts

## Implementation Location

The configuration is added in `main.py` at two locations:

1. **Line 832-836**: For calls where user speaks first
2. **Line 863-867**: For calls where agent speaks first

Both configurations are identical to ensure consistent behavior.

## Benefits

✅ **Better User Experience**: Users know the agent is processing their request  
✅ **Reduces Awkward Silence**: Fills silence gaps during thinking time  
✅ **Professional Sound**: Natural typing sound instead of verbal fillers  
✅ **Multi-language Support**: Works with all languages since it's non-verbal  

## Testing

To test the keyboard typing audio:

1. Make an outbound call using the API
2. Ask the agent a question that requires processing time
3. Listen for the keyboard typing sound during the ~0.5s silence while the agent thinks
4. You should hear a subtle typing noise before the agent responds

## Customization Options

If you want to customize the behavior, you can modify:

- **`silence_threshold_seconds`**: Change when typing sound starts (e.g., `0.3` for faster, `1.0` for slower)
- **`use_phrases`**: Set to `True` to also include verbal fillers like "let me think..."
- **Custom audio files**: Replace the default `typing-noise.wav` with your own audio file

## Related Configuration

This works in conjunction with:
- **Language Config Wrapper**: Handles multi-language idle messages
- **Idle Check Messages**: "Are you still there?" messages in correct language
- **Send Filler Audio**: Must be set to `True` for typing audio to work

## Code Reference

See `main.py` lines 832-836 and 863-867 for the implementation.

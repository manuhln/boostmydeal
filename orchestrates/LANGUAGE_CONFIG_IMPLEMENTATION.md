# Language Configuration Wrapper Implementation

## Overview
This document explains how language-specific messages are configured in the vocode telephony system using the `LanguageConfig` wrapper.

## Problem Solved
Previously, language-specific messages were hardcoded in English even when conversations were in other languages:
- "Are you still there?" idle check messages were always in English
- "Thank you, goodbye" end conversation messages were always in English

## Solution: LanguageConfig Wrapper

### How Vocode Handles Language Messages

#### 1. Idle Check Messages ("Are you still there?")
Vocode uses a constant `CHECK_HUMAN_PRESENT_MESSAGE_CHOICES` from `vocode.streaming.constants` that can be modified at runtime:
```python
# In vocode/streaming/constants.py
CHECK_HUMAN_PRESENT_MESSAGE_CHOICES = [
    "Hello?",
    "Are you there?",
    "Are you still there?",
    "Hi, are you there?",
]
```

These messages are randomly selected when checking if the human is still present during idle time.

#### 2. Goodbye Messages
Goodbye messages are NOT from vocode itself - they come from the agent's prompt. The `_build_enhanced_prompt()` function tells the agent what to say when ending the call.

#### 3. Goodbye Detection
Vocode detects goodbye using the `goodbye_phrases` parameter in `AgentConfig`. When a goodbye phrase is detected and `end_conversation_on_goodbye` is True, the conversation ends.

### Implementation

The `LanguageConfig` wrapper (`language_config_wrapper.py`) provides:

1. **Language-specific idle check messages** - Modifies vocode's `CHECK_HUMAN_PRESENT_MESSAGE_CHOICES`
2. **Language-specific goodbye messages** - For use in agent prompts
3. **Language-specific goodbye detection phrases** - For vocode's `goodbye_phrases` parameter

### Supported Languages

- 🇬🇧 **English** (en)
- 🇪🇸 **Spanish** (es)
- 🇫🇷 **French** (fr)
- 🇮🇳 **Hindi** (hi)
- 🇩🇪 **German** (de)
- 🇮🇹 **Italian** (it)
- 🇧🇷 **Portuguese** (pt)

### Usage

The wrapper is automatically used when starting a call:

```python
# Configure language-specific messages
lang_config = LanguageConfig.configure_for_language(primary_language)

# Build prompt with language-specific goodbye message
enhanced_prompt = _build_enhanced_prompt(
    agent_prompt, voicemail_raw,
    voicemail_message, transfer_message,
    primary_language
)

# Add goodbye detection phrases to agent config
agent_config_params = {
    ...
    "end_conversation_on_goodbye": True,
    "goodbye_phrases": lang_config["goodbye_phrases"],
    ...
}
```

### What Gets Configured

When `LanguageConfig.configure_for_language("es")` is called:

1. **Vocode constant modified IN-PLACE** (Critical Implementation Detail):
   ```python
   # WRONG - This creates a new list, but vocode has a reference to the old one:
   # constants.CHECK_HUMAN_PRESENT_MESSAGE_CHOICES = [new_list]
   
   # CORRECT - Modify the existing list in-place:
   constants.CHECK_HUMAN_PRESENT_MESSAGE_CHOICES.clear()
   constants.CHECK_HUMAN_PRESENT_MESSAGE_CHOICES.extend([
       "¿Sigue ahí?",
       "¿Hola? ¿Me escucha?",
       "¿Está ahí?",
       "¿Me puede escuchar?"
   ])
   ```
   
   **Why in-place modification is required:**
   - Vocode's `streaming_conversation.py` imports the constant as: `from vocode.streaming.constants import CHECK_HUMAN_PRESENT_MESSAGE_CHOICES`
   - This creates a direct reference to the list object
   - If we assign a new list (`constants.CHECK_HUMAN_PRESENT_MESSAGE_CHOICES = [...]`), we create a new object
   - But vocode still references the old list object
   - By using `.clear()` and `.extend()`, we modify the same list object that vocode is referencing

2. **Returns language-specific data**:
   ```python
   {
       "idle_messages": ["¿Sigue ahí?", ...],
       "goodbye_message": "Gracias, adiós",
       "goodbye_word": "Adiós",
       "goodbye_phrases": ["adiós", "adios", "chao", "hasta luego"]
   }
   ```

3. **Logs configuration**:
   ```
   🇪🇸 Language configured: ES
     - Idle check messages: ['¿Sigue ahí?', '¿Hola? ¿Me escucha?', '¿Está ahí?', '¿Me puede escuchar?']
     - Goodbye message: 'Gracias, adiós'
     - Goodbye detection phrases: ['adiós', 'adios', 'chao', 'hasta luego']
   ```

### Benefits

1. ✅ **Clean architecture** - Single wrapper manages all language-specific configurations
2. ✅ **Vocode integration** - Works with vocode's internal constants and config parameters
3. ✅ **Easy to extend** - Add new languages by updating the dictionaries
4. ✅ **Runtime configuration** - Each conversation can have different language settings
5. ✅ **Comprehensive logging** - Clear visibility into what's configured

### Files Modified

- `language_config_wrapper.py` - New wrapper class
- `main.py` - Integrated wrapper instead of manual configuration
- `replit.md` - Updated documentation

### Testing

To test different languages, include the `language` parameter in your JSON payload:

```json
{
  "language": "es",  // Spanish
  "to_phone": "+1234567890",
  ...
}
```

The system will automatically:
- Use Spanish idle check messages
- Say "Gracias, adiós" when ending the call
- Detect Spanish goodbye phrases like "adiós", "chao"

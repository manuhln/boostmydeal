# Auto-Hangup on User Disinterest

## Overview

The AI agent now automatically ends the call when the user expresses disinterest, being busy, or asks to be removed from the calling list. This prevents awkward silence and wasted time by immediately hanging up after a brief acknowledgment.

## How It Works

### Detection Triggers

The agent detects user disinterest when they say phrases like:
- "I'm not interested"
- "Not interested in this conversation"
- "I'm busy"
- "Please remove me from your list"
- "Don't call me again"
- Any variation expressing disinterest or unavailability

### Automatic Response Flow

1. **User expresses disinterest**: "I'm not interested in this conversation"
2. **Agent responds ONCE**: "I understand. Thank you for your time!"
3. **Call ends IMMEDIATELY**: No waiting for user response

### Before vs After

**❌ Before:**
```
USER: I'm not interested in this conversation
BOT: I understand, Hardik.
BOT: If you have any questions in the future...
BOT: Thank you for your time, and have a great day!
[WAITS 20+ seconds for user response]
[Call eventually times out]
```

**✅ After:**
```
USER: I'm not interested in this conversation
BOT: I understand. Thank you for your time!
[CALL ENDS IMMEDIATELY]
```

## Technical Implementation

### 1. Enhanced Prompt Instructions

Added explicit "NOT INTERESTED" rule to the agent prompt:

```python
f"NOT INTERESTED: If user says they're not interested, busy, or asks to be removed, "
f"say ONLY 'Thank you for your time!' (nothing else) which will AUTO-HANGUP immediately."
```

### 2. Phrase-Based Action Triggers (THE KEY FIX!)

The EndConversation action uses **phrase-based triggers** instead of function calling:

```python
EndConversationVocodeActionConfig(
    action_trigger=PhraseBasedActionTrigger(
        type="action_trigger_phrase_based",
        config=PhraseBasedActionTriggerConfig(
            phrase_triggers=[
                PhraseTrigger(
                    phrase="Thank you for your time!",
                    conditions=["phrase_condition_type_contains"]
                ),
                PhraseTrigger(
                    phrase="Have a great day!",
                    conditions=["phrase_condition_type_contains"]
                ),
                PhraseTrigger(
                    phrase="Thank you for your time, and have a great day!",
                    conditions=["phrase_condition_type_contains"]
                )
            ]
        )
    )
)
```

**How Phrase-Based Triggers work:**
- Vocode monitors the agent's speech in real-time
- When the agent says a phrase that **contains** any of the trigger phrases
- The `EndConversation` action is **automatically triggered**
- The call ends immediately - no LLM function calling needed!

**Why this is better than function calling:**
- ❌ **Function calling** requires the LLM to output a function call (unreliable, can be converted to text)
- ✅ **Phrase-based** triggers on actual spoken words (deterministic, guaranteed to work)

### 3. Cut-Off Response (Backup Mechanism)

Added additional cut-off phrases to the `CutOffResponse` configuration:

```python
CutOffResponse(messages=[
    BaseMessage(text="Thank you for your time, and have a great day!"),
    BaseMessage(text="I understand. Thank you for your time!"),
    BaseMessage(text="Thank you for your time!"),  # NEW
    BaseMessage(text="Have a great day!")           # NEW
])
```

This provides a backup mechanism for interruption handling.

## Benefits

✅ **Respects User Time**: Ends call immediately when user is not interested  
✅ **Professional**: Clean, polite acknowledgment before hanging up  
✅ **Cost Savings**: Reduces wasted minutes on disinterested prospects  
✅ **Better Experience**: No awkward silence or waiting for user to hang up  
✅ **Automatic**: No manual intervention needed  

## Related Scenarios

This auto-hangup also applies to:

- **Call completion**: After meeting is booked or information provided
- **Voicemail detection**: Delivers message then hangs up
- **User says goodbye**: Detects goodbye phrases and ends call
- **Call disqualification**: When prospect doesn't meet criteria

## Configuration Location

The implementation is in `main.py`:
- **Prompt enhancement**: `_build_enhanced_prompt()` function (lines 223, 229)
- **Phrase-based triggers**: EndConversation action config (lines 739-763)
- **CutOffResponse**: Agent config (lines 778-786, 830-838)

## Testing

To test the auto-hangup feature:

1. Make an outbound call
2. When the agent starts speaking, say: "I'm not interested"
3. Observe that the agent says: "I understand. Thank you for your time!"
4. **The call should end immediately** - no waiting, no further messages

## Customization

To customize the disinterest response:

1. **Change the response message**: Edit the prompt in `_build_enhanced_prompt()`
2. **Add the new phrase to CutOffResponse**: Add it to the messages list
3. **Match exactly**: The phrase in CutOffResponse must **exactly match** what the agent will say

Example:
```python
# In prompt:
f"respond ONCE with 'Got it. Have a great day!' and IMMEDIATELY trigger 'end_conversation'"

# In CutOffResponse:
BaseMessage(text="Got it. Have a great day!")  # Must match exactly
```

## Multi-Language Support

The feature works across all supported languages. The cut-off phrases are in English, but the agent can be instructed to respond in any language based on the conversation's `language` parameter.

To add language-specific cut-off phrases, you can extend the `LanguageConfig` wrapper to include disinterest responses for each language.

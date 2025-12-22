# Call Transfer Feature

## Overview

The LiveKit Agent can now transfer calls to human agents when users request to speak with a real person. This feature uses LiveKit's SIP API to seamlessly hand off active calls.

## Configuration

Add these two parameters to your call configuration JSON:

```json
{
  "enable_call_transfer": true,
  "transfer_phone_number": "+1234567890"
}
```

### Parameters

- **`enable_call_transfer`** (boolean, default: `false`)
  - Set to `true` to enable call transfer functionality
  - When disabled, the agent will not offer transfer options

- **`transfer_phone_number`** (string, optional)
  - Phone number to transfer calls to in E.164 format
  - Must include country code with `+` prefix (e.g., `+1234567890` for US)
  - Required when `enable_call_transfer` is `true`

## How It Works

1. **User Request Detection**: The LLM automatically detects when a user asks to speak with a human agent:
   - "Can I talk to a real person?"
   - "Transfer me to support"
   - "I want to speak with someone"
   - Similar natural language requests

2. **Transfer Notification**: The agent informs the user before transferring:
   > "Transferring you to our support team. Please hold."

3. **Seamless Handoff**: The call is transferred using LiveKit's SIP API
   - Uses `transfer_sip_participant` method
   - No interruption in call quality
   - Agent process exits after successful transfer

## Example API Request

```bash
curl -X POST "https://your-api.com/call" \
  -H "Content-Type: application/json" \
  -d '{
    "to_phone": "+19876543210",
    "from_phone": "+11234567890",
    "contact_name": "John Doe",
    "agent_initial_message": "Hi {contact_name}, this is Sarah from support!",
    "agent_prompt_preamble": "You are a helpful customer support agent.",
    "enable_call_transfer": true,
    "transfer_phone_number": "+15551234567",
    "tts": {
      "provider_name": "eleven_labs",
      "voice_id": "21m00Tcm4TlvDq8ikWAM",
      "model_id": "eleven_turbo_v2_5",
      "api_key": "your-elevenlabs-key"
    },
    "stt": {
      "provider_name": "deepgram",
      "model": "nova-2",
      "api_key": "your-deepgram-key"
    },
    "model": {
      "name": "gpt-4o-mini",
      "api_key": "your-openai-key"
    }
  }'
```

## Error Handling

If the transfer fails, the agent will:
1. Log the error for debugging
2. Notify the user with a friendly message
3. Continue the conversation normally

Error message to user:
> "I'm sorry, I couldn't complete the transfer. Let me continue helping you."

## Requirements & Setup

### Prerequisites

- LiveKit URL, API key, and API secret must be configured
- SIP trunk must be set up in LiveKit Cloud
- Transfer phone number must be in valid E.164 format

### **CRITICAL: Enable SIP REFER on Twilio Trunk**

⚠️ **Call transfers will fail with "403 Forbidden" if SIP REFER is not enabled on your Twilio trunk.**

#### Method 1: Twilio Dashboard (Recommended)

1. Log in to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Elastic SIP Trunking** → **Trunks** → Select your trunk
3. Go to the **Origination** section
4. Find **Call Transfer (SIP REFER)** and set to **Enabled**
5. Set **Caller ID for Transfer Target**:
   - `from-transferee` - Shows the original caller's number to the transfer recipient
   - `from-transferor` - Shows your trunk's number to the transfer recipient
6. Enable **PSTN Transfer** checkbox
7. Click **Save**

#### Method 2: Twilio CLI

```bash
twilio api:core:trunks:update \
  --sid YOUR_TWILIO_TRUNK_SID \
  --transfer-mode enabled \
  --transfer-caller-id from-transferee
```

Replace `YOUR_TWILIO_TRUNK_SID` with your actual Twilio trunk SID.

### Verification

After enabling SIP REFER, test the transfer feature:
1. Make a test call to your AI agent
2. Ask to "speak with a human" or "transfer me to support"
3. Verify the call successfully transfers to the configured number

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `403 Forbidden` | SIP REFER not enabled | Enable Call Transfer in Twilio trunk settings |
| `404 Not Found` | Invalid transfer number | Verify E.164 format (+1234567890) |
| `408 Timeout` | Transfer destination unreachable | Check destination number is valid and reachable |

## Logging

The system logs transfer events for monitoring:
- `Transferring call to +1234567890` - Transfer initiated
- `Transfer request sent successfully to +1234567890` - Transfer completed
- `Error transferring call: <error>` - Transfer failed

## Best Practices

1. **Test the transfer number** before enabling in production
2. **Monitor logs** to ensure transfers complete successfully
3. **Configure fallback support** in case transfers fail
4. **Use valid E.164 format** for reliable transfer routing
5. **Enable only when needed** to prevent unnecessary transfers

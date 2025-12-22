# Webhook Integration Guide for External Service

## Overview
Our system expects four different webhook types during a call lifecycle. Please send these webhooks to our endpoint as the call progresses.

## Webhook Endpoint
**URL:** `https://your-domain.replit.app/api/webhook/webhook-status`
**Method:** POST
**Content-Type:** application/json

## Required Webhook Types

### 1. PHONE_CALL_CONNECTED (When call connects)
**Send this webhook when the call is answered and connected:**

```json
{
  "type": "PHONE_CALL_CONNECTED",
  "call_id": "call_12345abc",
  "call_start_time": "2025-07-25T10:30:00Z",
  "status": "connected",
  "phone_number": "+1234567890",
  "answered_by": "human"
}
```

### 2. TRANSCRIPT_COMPLETE (During or after call)
**Send this webhook when transcript is ready:**

```json
{
  "type": "TRANSCRIPT_COMPLETE", 
  "call_id": "call_12345abc",
  "full_transcript": "Hello, this is John from ABC Company. I'm calling about your recent inquiry regarding our services. The customer responded: Yes, I'm very interested in learning more about your pricing plans...",
  "confidence_score": 0.95,
  "language": "en-US",
  "transcript_timestamp": "2025-07-25T10:32:15Z"
}
```

### 3. PHONE_CALL_ENDED (When call ends)
**Send this webhook when the call completes:**

```json
{
  "type": "PHONE_CALL_ENDED",
  "call_id": "call_12345abc", 
  "duration_seconds": 180,
  "call_end_time": "2025-07-25T10:33:00Z",
  "end_reason": "completed",
  "is_voicemail": false,
  "user_tags": ["qualified", "interested", "follow-up-needed"],
  "full_transcript": "Complete conversation transcript including both sides of the conversation...",
  "call_summary": "Customer showed strong interest in premium package, requested follow-up next week",
  "next_action": "schedule_demo"
}
```

## Important Notes

### Required Fields
- **call_id**: Unique identifier for the call (must be consistent across all 3 webhooks)
- **type**: Must be exactly one of: "PHONE_CALL_CONNECTED", "TRANSCRIPT_COMPLETE", "PHONE_CALL_ENDED"

### Optional Fields
- **user_tags**: Array of strings for categorizing the call
- **full_transcript**: Complete conversation text
- **call_summary**: AI-generated summary of the call
- **next_action**: Suggested follow-up action

### 4. CALL_SUMMARY (After call analysis)
**Send this webhook when AI analysis and summary is complete:**

```json
{
  "type": "CALL_SUMMARY",
  "call_id": "call_12345abc",
  "call_summary": "Customer showed strong interest in premium package, requested follow-up next week",
  "sentiment_analysis": "positive",
  "lead_score": 8.5,
  "next_action": "schedule_demo",
  "key_points": ["interested in premium features", "budget confirmed", "decision maker"],
  "summary_timestamp": "2025-07-25T10:35:00Z"
}
```

### Webhook Sequence
1. **PHONE_CALL_CONNECTED** - Send when call is answered
2. **TRANSCRIPT_COMPLETE** - Send when transcript is available (can be sent multiple times)
3. **PHONE_CALL_ENDED** - Send when call completes
4. **CALL_SUMMARY** - Send when AI analysis is complete (optional)

### Error Handling
- Our system will return HTTP 200 for successful webhook processing
- If you receive HTTP 4xx/5xx, please retry the webhook
- Each webhook type can be sent multiple times if needed

## Database Storage Structure

Each webhook is stored in the `webhookPayload` array:

```json
{
  "_id": "call_record_id",
  "webhookPayload": [
    {
      "type": "PHONE_CALL_CONNECTED",
      "call_id": "call_12345abc",
      "data": { /* full webhook payload */ },
      "timestamp": "2025-07-25T10:30:01Z"
    },
    {
      "type": "TRANSCRIPT_COMPLETE", 
      "call_id": "call_12345abc",
      "data": { /* full webhook payload */ },
      "timestamp": "2025-07-25T10:32:15Z"
    },
    {
      "type": "PHONE_CALL_ENDED",
      "call_id": "call_12345abc", 
      "data": { /* full webhook payload */ },
      "timestamp": "2025-07-25T10:33:01Z"
    }
  ]
}
```

## Filtering Webhook Data

To retrieve specific webhook types:

```javascript
// Get all PHONE_CALL_ENDED webhooks
const endedWebhooks = call.webhookPayload.filter(webhook => 
  webhook.type === 'PHONE_CALL_ENDED'
);

// Get transcript data
const transcriptWebhooks = call.webhookPayload.filter(webhook => 
  webhook.type === 'TRANSCRIPT_COMPLETE'
);
```

## Processing Logic

- **PHONE_CALL_ENDED**: Updates main call fields (status, duration, endedAt, user_tags)
- **PHONE_CALL_CONNECTED**: Updates status to 'in-progress' and sets startedAt
- **TRANSCRIPT_COMPLETE**: Updates transcript field only
- **Unknown types**: Stored in webhook array for future processing
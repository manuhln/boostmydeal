import { Worker, Queue } from 'bullmq';
import { redisPool } from '../redis/connection-pool';
import { Call } from '../../../models/Call';

export interface CallTimeoutPayload {
  callId: string;
  twilioSid?: string;
  checkAfterMinutes: number;
}

/**
 * Process call timeout check to mark calls as failed if no PHONE_CALL_CONNECTED webhook received
 */
export async function processCallTimeoutCheck(job: any) {
  const payload: CallTimeoutPayload = job.data;
  
  console.log(`⏰ [CallTimeoutChecker] Checking timeout for call ${payload.callId} after ${payload.checkAfterMinutes} minutes`);
  
  try {
    // Find the call record
    const callRecord = await Call.findById(payload.callId);
    
    if (!callRecord) {
      console.log(`❌ [CallTimeoutChecker] Call not found: ${payload.callId}`);
      return { success: false, message: 'Call not found' };
    }

    console.log(`📋 [CallTimeoutChecker] Found call with status: ${callRecord.status}`);
    console.log(`📋 [CallTimeoutChecker] Webhook count: ${callRecord.webhookPayload?.length || 0}`);
    
    // Check if call is already in a final state
    const finalStates = ['completed', 'failed', 'voicemail', 'no-answer'];
    if (finalStates.includes(callRecord.status)) {
      console.log(`✅ [CallTimeoutChecker] Call ${payload.callId} already in final state: ${callRecord.status}`);
      return { success: true, message: 'Call already completed' };
    }
    
    // Check if PHONE_CALL_CONNECTED webhook was received
    const hasConnectedWebhook = callRecord.webhookPayload?.some(webhook => 
      webhook.type === 'PHONE_CALL_CONNECTED'
    );
    
    if (hasConnectedWebhook) {
      console.log(`✅ [CallTimeoutChecker] Call ${payload.callId} has PHONE_CALL_CONNECTED webhook, timeout check passed`);
      return { success: true, message: 'Call connected successfully' };
    }
    
    // No PHONE_CALL_CONNECTED webhook received within timeout period
    console.log(`❌ [CallTimeoutChecker] No PHONE_CALL_CONNECTED webhook received for call ${payload.callId} within ${payload.checkAfterMinutes} minutes`);

    const errorMessage = 'No PHONE_CALL_CONNECTED webhook received within timeout period';

    // Mark call as failed with duration 0, endedAt, errorMessage, failureType
    const updatedCall = await Call.findByIdAndUpdate(
      payload.callId,
      {
        status: 'failed',
        duration: 0,
        endedAt: new Date(),
        errorMessage,
        endReason: errorMessage,
        failureType: 'system',
        updatedAt: new Date(),
        // Add a webhook entry to track the timeout
        $push: {
          webhookPayload: {
            type: 'CALL_TIMEOUT',
            call_id: payload.callId,
            data: {
              reason: errorMessage,
              timeoutAfterMinutes: payload.checkAfterMinutes,
              checkedAt: new Date()
            },
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );
    
    if (updatedCall) {
      // Emit notification (async, non-blocking)
      if (callRecord.organizationId) {
        setImmediate(async () => {
          try {
            const { createCallNotification } = await import('../../notifications/services/NotificationService');
            await createCallNotification(
              callRecord.organizationId,
              'call_timeout',
              'Call timeout',
              `Call to ${callRecord.contactName || callRecord.contactPhone || 'unknown'} did not connect within ${payload.checkAfterMinutes} minutes. No PHONE_CALL_CONNECTED webhook received.`,
              { callId: payload.callId, endReason: errorMessage, failureType: 'system', contactPhone: callRecord.contactPhone, contactName: callRecord.contactName }
            );
          } catch (notifErr) {
            console.error('❌ [CallTimeoutChecker] Error creating timeout notification:', notifErr);
          }
        });
      }

      console.log(`✅ [CallTimeoutChecker] Call ${payload.callId} marked as failed due to timeout`);
      return {
        success: true,
        message: 'Call marked as failed due to timeout',
        previousStatus: callRecord.status,
        newStatus: 'failed'
      };
    } else {
      console.error(`❌ [CallTimeoutChecker] Failed to update call ${payload.callId} status`);
      throw new Error('Failed to update call status');
    }
    
  } catch (error) {
    console.error(`❌ [CallTimeoutChecker] Error processing timeout check for call ${payload.callId}:`, error);
    throw error;
  }
}

/**
 * Queue for scheduling call timeout checks
 */
export const callTimeoutQueue = new Queue('call-timeout-checker', {
  connection: redisPool.getConnection('main'),
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 20,
    attempts: 1, // No retries for timeout checks
  },
});

/**
 * Worker to process call timeout checks
 */
const callTimeoutWorker = new Worker(
  'call-timeout-checker',
  processCallTimeoutCheck,
  {
    connection: redisPool.getConnection('timeout-checker'),
    concurrency: 10,
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  }
);

// Worker event handlers
callTimeoutWorker.on('completed', (job) => {
  console.log(`✅ [CallTimeoutWorker] Timeout check job ${job.id} completed successfully`);
});

callTimeoutWorker.on('failed', (job, err) => {
  console.error(`❌ [CallTimeoutWorker] Timeout check job ${job?.id} failed:`, err.message);
});

callTimeoutWorker.on('error', (err) => {
  console.error('❌ [CallTimeoutWorker] Worker error:', err);
});

console.log('🚀 [CallTimeoutWorker] Call timeout checker worker initialized and listening for jobs');

export default callTimeoutWorker;
import { Worker, Job } from 'bullmq';
import { redisPool } from '../redis/connection-pool';
import { callService } from '../services/CallService';
import { billingService } from '../../billing/services/BillingService';

export interface WebhookPayload {
  twilioSid: string;
  webhookData: any;
}

/**
 * Process webhook function for BullMQ
 */
async function processWebhook(job: Job<WebhookPayload>) {
  const payload: WebhookPayload = job.data;
  
  console.log(`🔄 [WebhookWorker] Processing webhook job ${job.id}`);
  console.log(`📋 [WebhookWorker] Twilio SID: ${payload.twilioSid}`);
  console.log(`📋 [WebhookWorker] Webhook data keys:`, Object.keys(payload.webhookData));

  try {
    // Step 1: Validate webhook data
    if (!payload.twilioSid) {
      console.error(`❌ [WebhookWorker] Missing Twilio SID in webhook payload`);
      throw new Error('Missing Twilio SID in webhook payload');
    }

    // Step 2: Process webhook and update call record
    console.log(`🔄 [WebhookWorker] Updating call record from webhook`);
    const updateSuccess = await callService.updateCallFromWebhook(
      payload.twilioSid,
      payload.webhookData
    );

    if (!updateSuccess) {
      console.error(`❌ [WebhookWorker] Failed to update call record from webhook`);
      throw new Error('Failed to update call record from webhook');
    }

    console.log(`✅ [WebhookWorker] Call record updated successfully from webhook`);


    
    console.log(`🎉 [WebhookWorker] Webhook job ${job.id} completed successfully`);
    
    return {
      success: true,
      twilioSid: payload.twilioSid,
      updated: true
    };

  } catch (error) {
    console.error(`❌ [WebhookWorker] Error processing webhook job ${job.id}:`, error);
    throw error; // Re-throw to mark job as failed
  }
}

/**
 * BullMQ Worker to process webhooks from Redis Cloud queue
 */
const webhookWorker = new Worker(
  'call-queue-webhook',
  processWebhook,
  {
    connection: redisPool.getConnection('webhook-worker'),
    concurrency: 10,
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 5 },
  }
);

// Worker event handlers
webhookWorker.on('completed', (job) => {
  console.log(`✅ [WebhookWorker] Job ${job.id} completed successfully`);
});

webhookWorker.on('failed', (job, err) => {
  console.error(`❌ [WebhookWorker] Job ${job?.id} failed:`, err.message);
});

webhookWorker.on('error', (err) => {
  console.error('❌ [WebhookWorker] Worker error:', err);
});

console.log('🚀 [WebhookWorker] BullMQ webhook worker initialized and listening for jobs');

export default webhookWorker;
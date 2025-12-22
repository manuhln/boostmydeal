import { Queue } from 'bullmq';
import { redisConnection } from './config';

// BullMQ Queue configuration with Redis Cloud
const queueConfig = {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 5,
    removeOnFail: 3,
    attempts: 2,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
  },
};

// Create outbound call queue for processing call initiation
export const outboundCallQueue = new Queue('call-queue-outbound', queueConfig);

// Create webhook processing queue for handling Twilio webhooks
export const webhookQueue = new Queue('call-queue-webhook', queueConfig);

// Queue event logging for BullMQ v4+
// Note: Queue events are handled by workers, not queues directly in BullMQ v4+
console.log('🚀 [Queue] Event listeners configured via workers for job lifecycle tracking');

console.log('🚀 [Queue] BullMQ queues initialized with Redis Cloud: outboundCallQueue, webhookQueue');

export default { outboundCallQueue, webhookQueue };
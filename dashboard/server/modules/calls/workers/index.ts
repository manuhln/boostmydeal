/**
 * Initialize all workers for the call processing system
 */

import './outboundCallWorker';
import './webhookWorker';
import './callTimeoutChecker';

console.log('🚀 [Workers] All call processing workers initialized');

export { outboundCallQueue, webhookQueue } from '../redis/queues';
export { callTimeoutQueue } from './callTimeoutChecker';
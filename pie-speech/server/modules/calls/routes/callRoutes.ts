import { Router } from 'express';
import { callController, validateCallInitiation, validateDemoCallInitiation } from '../controllers/CallController';
import { authMiddleware } from '../../../middleware/auth';

const router = Router();

// Apply authentication middleware to all call routes
router.use(authMiddleware);

/**
 * @route GET /api/calls
 * @desc Get all calls for organization
 * @access Private (requires authentication)
 */
router.get('/', callController.getCalls);

/**
 * @route GET /api/calls/export
 * @desc Export calls to CSV
 * @access Private (requires authentication)
 */
router.get('/export', callController.exportCalls);

/**
 * @route GET /api/calls/:callId/webhooks
 * @desc Get webhook payload data for a specific call
 * @access Private (requires authentication)
 */
router.get('/:callId/webhooks', callController.getCallWebhooks);

/**
 * @route GET /api/calls/:callId/transcript
 * @desc Get transcript data for a specific call
 * @access Private (requires authentication)
 */
router.get('/:callId/transcript', callController.getCallTranscript);

/**
 * @route POST /api/calls/initiate
 * @desc Initiate an outbound call
 * @access Private (requires authentication)
 */
router.post('/initiate', validateCallInitiation, callController.initiateCall);

/**
 * @route POST /api/calls/demo-initiate
 * @desc DEMO VERSION: Temporary call initiation bypassing Redis/webhook
 * @access Private (requires authentication)
 */
router.post('/demo-initiate', validateDemoCallInitiation, callController.demoInitiateCall);

/**
 * @route POST /api/webhook/call-status
 * @desc Handle webhook for call status updates
 * @access Public (External webhook - no auth required)
 */
// Create separate webhook router without auth middleware
const webhookRouter = Router();
webhookRouter.post('/webhook-status', callController.handleStatusWebhook);
webhookRouter.post('/call-status', callController.handleCallStatusWebhook);

console.log('🛣️ [CallRoutes] Call routes configured: /initiate, /demo-initiate, /webhook/call-status');

// Export both routers
export default router;
export { webhookRouter };
import { Router } from 'express';
import { WorkflowController } from './controllers/WorkflowController';
import { WebhookController } from './controllers/WebhookController';
import { authMiddleware, requireRole } from '../../middleware/auth';

const router = Router();
const workflowController = new WorkflowController();
const webhookController = new WebhookController();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Workflow CRUD routes
router.post('/', (req, res) => workflowController.createWorkflow(req, res));
router.get('/', (req, res) => workflowController.getWorkflows(req, res));
router.get('/:id', (req, res) => workflowController.getWorkflowById(req, res));
router.put('/:id', (req, res) => workflowController.updateWorkflow(req, res));
router.delete('/:id', requireRole(['owner', 'admin']), (req, res) => workflowController.deleteWorkflow(req, res));
router.post('/:id/toggle', (req, res) => workflowController.toggleWorkflow(req, res));

// Workflow execution routes
router.get('/:id/executions', (req, res) => workflowController.getWorkflowExecutions(req, res));
router.post('/trigger', (req, res) => webhookController.triggerWorkflow(req, res));

export default router;
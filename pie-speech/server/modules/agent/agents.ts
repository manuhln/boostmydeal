import { Router } from 'express';
import { body } from 'express-validator';
import { AgentController } from './AgentController';
import { authMiddleware, requireRole } from '../../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Validation rules for agent creation
const createAgentValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('gender')
    .isIn(['male', 'female', 'neutral'])
    .withMessage('Gender must be male, female, or neutral'),
  body('aiModel')
    .trim()
    .isLength({ min: 1 })
    .withMessage('AI model is required'),
  body('voiceProvider')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Voice provider is required'),
  body('voiceModel')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Voice model is required'),
  body('voice')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Voice is required'),
  body('trigger')
    .isIn(['TRANSCRIPT', 'TRANSCRIPT_COMPLETE', 'ACTION', 'PHONE_CALL_CONNECTED', 'PHONE_CALL_ENDED'])
    .withMessage('Trigger must be a valid option'),
  body('postWorkflow')
    .optional()
    .isIn(['none', 'zoho_crm', 'salesforce', 'hubspot', 'pipedrive', 'webhook', 'email'])
    .withMessage('Post workflow must be a valid option'),
  body('temperature')
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature must be between 0 and 2'),
  body('maxTokens')
    .isInt({ min: 1, max: 4000 })
    .withMessage('Max tokens must be between 1 and 4000'),
  body('languages')
    .isArray({ min: 1 })
    .withMessage('At least one language is required'),
  body('firstMessage')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('First message must not exceed 500 characters'),
  body('systemPrompt')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('System prompt must not exceed 5000 characters'),
  body('knowledgeBase')
    .optional()
    .isArray()
    .withMessage('Knowledge base must be an array'),
  body('workflowId')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined) return true;
      return /^[0-9a-fA-F]{24}$/.test(value);
    })
    .withMessage('Workflow ID must be a valid MongoDB ObjectId or null'),
  body('ragResponse')
    .optional()
    .isString()
    .withMessage('RAG response must be a string'),
  body('userTags')
    .optional()
    .isArray()
    .withMessage('User tags must be an array'),
  body('systemTags')
    .optional()
    .isArray()
    .withMessage('System tags must be an array'),
];

// Validation rules for agent update
const updateAgentValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'neutral'])
    .withMessage('Gender must be male, female, or neutral'),
  body('aiModel')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('AI model is required'),
  body('voiceProvider')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Voice provider is required'),
  body('voiceModel')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Voice model is required'),
  body('voice')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Voice is required'),
  body('trigger')
    .isIn(['TRANSCRIPT', 'TRANSCRIPT_COMPLETE', 'ACTION', 'PHONE_CALL_CONNECTED', 'PHONE_CALL_ENDED'])
    .withMessage('Trigger must be a valid option'),
  body('postWorkflow')
    .optional()
    .isIn(['none', 'zoho_crm', 'salesforce', 'hubspot', 'pipedrive', 'webhook', 'email'])
    .withMessage('Post workflow must be a valid option'),
  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature must be between 0 and 2'),
  body('maxTokens')
    .optional()
    .isInt({ min: 1, max: 4000 })
    .withMessage('Max tokens must be between 1 and 4000'),
  body('languages')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one language is required'),
  body('firstMessage')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('First message must not exceed 500 characters'),
  body('systemPrompt')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('System prompt must not exceed 5000 characters'),
  body('knowledgeBase')
    .optional()
    .isArray()
    .withMessage('Knowledge base must be an array'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('workflowId')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined) return true;
      return /^[0-9a-fA-F]{24}$/.test(value);
    })
    .withMessage('Workflow ID must be a valid MongoDB ObjectId or null'),
  body('userTags')
    .optional()
    .isArray()
    .withMessage('User tags must be an array'),
  body('systemTags')
    .optional()
    .isArray()
    .withMessage('System tags must be an array'),
];

// Agent routes
router.get('/', AgentController.getAgents);
router.get('/:id', AgentController.getAgent);
router.post('/', createAgentValidation, AgentController.createAgent);
router.put('/:id', updateAgentValidation, AgentController.updateAgent);
router.delete('/:id', requireRole(['owner', 'admin']), AgentController.deleteAgent);

export default router;
import { Router } from 'express';
import { body, param } from 'express-validator';
import { IntegrationController } from './IntegrationController';
import { authMiddleware, requireRole } from '../../middleware/auth';
import elevenLabsRoutes from './elevenlabs.routes';

const router = Router();

// Integration configuration validation
const saveConfigValidation = [
  body('type')
    .notEmpty()
    .withMessage('Integration type is required')
    .isIn(['SMTP', 'HUBSPOT', 'ZOHO','WEBHOOK', 'ELEVENLABS'])
    .withMessage('Invalid integration type'),
  body('name')
    .notEmpty()
    .withMessage('Integration name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('config')
    .notEmpty()
    .withMessage('Configuration is required')
    .isObject()
    .withMessage('Configuration must be an object'),
  // ElevenLabs specific validation
  body('config.apiKey')
    .if(body('type').equals('ELEVENLABS'))
    .notEmpty()
    .withMessage('ElevenLabs API key is required'),
  body('config.voiceName')
    .if(body('type').equals('ELEVENLABS'))
    .notEmpty()
    .withMessage('Voice name is required'),
  // SMTP specific validation
  body('config.host')
    .if(body('type').equals('SMTP'))
    .notEmpty()
    .withMessage('SMTP host is required'),
  body('config.port')
    .if(body('type').equals('SMTP'))
    .isInt({ min: 1, max: 65535 })
    .withMessage('Valid SMTP port is required'),
  body('config.email')
    .if(body('type').equals('SMTP'))
    .isEmail()
    .withMessage('Valid email address is required'),
  body('config.password')
    .if(body('type').equals('SMTP'))
    .notEmpty()
    .withMessage('SMTP password is required'),
  // HubSpot specific validation
  body('config.apiKey')
    .if(body('type').equals('HUBSPOT'))
    .notEmpty()
    .withMessage('HubSpot API key is required'),
  body('config.baseUrl')
    .if(body('type').equals('HUBSPOT'))
    .optional({ values: 'falsy' })
    .isURL()
    .withMessage('Base URL must be a valid URL'),
  // Zoho specific validation
  body('config.refreshToken')
    .if(body('type').equals('ZOHO'))
    .notEmpty()
    .withMessage('Zoho refresh token is required'),
  body('config.region')
    .if(body('type').equals('ZOHO'))
    .optional()
    .isIn(['com', 'eu', 'in', 'au', 'jp', 'ca'])
    .withMessage('Region must be one of: com, eu, in, au, jp, ca'),
  body('config.baseUrl')
    .if(body('type').equals('ZOHO'))
    .optional({ values: 'falsy' })
    .isURL()
    .withMessage('Base URL must be a valid URL'),
];

const testConfigValidation = [
  body('type')
    .notEmpty()
    .withMessage('Integration type is required')
    .isIn(['SMTP', 'HUBSPOT', 'ZOHO', 'ELEVENLABS'])
    .withMessage('Invalid integration type'),
  body('config')
    .notEmpty()
    .withMessage('Configuration is required')
    .isObject()
    .withMessage('Configuration must be an object'),
];

const testEmailValidation = [
  param('configId')
    .isMongoId()
    .withMessage('Valid configuration ID is required'),
  body('to')
    .isEmail()
    .withMessage('Valid recipient email is required'),
  body('subject')
    .notEmpty()
    .withMessage('Email subject is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject must be between 1 and 200 characters'),
  body('message')
    .notEmpty()
    .withMessage('Email message is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be between 1 and 5000 characters'),
];

const configIdValidation = [
  param('configId')
    .isMongoId()
    .withMessage('Valid configuration ID is required'),
];

const performActionValidation = [
  param('configId')
    .isMongoId()
    .withMessage('Valid configuration ID is required'),
  body('payload')
    .notEmpty()
    .withMessage('Action payload is required')
    .isObject()
    .withMessage('Payload must be an object'),
];

const getDealValidation = [
  param('configId')
    .isMongoId()
    .withMessage('Valid configuration ID is required'),
  body('dealName')
    .notEmpty()
    .withMessage('Deal name is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Deal name must be between 1 and 200 characters'),
];

// Routes
router.get('/', authMiddleware, IntegrationController.getUserIntegrations);
router.get('/types', authMiddleware, IntegrationController.getSupportedTypes);
router.post('/config', authMiddleware, saveConfigValidation, IntegrationController.saveIntegrationConfig);
router.post('/test', authMiddleware, testConfigValidation, IntegrationController.testIntegrationConfig);
router.post('/:configId/test-email', authMiddleware, testEmailValidation, IntegrationController.sendTestEmail);
router.post('/:configId/get-deal', authMiddleware, getDealValidation, IntegrationController.getDealByName);
router.delete('/:configId', authMiddleware, requireRole(['owner', 'admin']), configIdValidation, IntegrationController.deleteIntegration);
router.post('/:configId/action', authMiddleware, performActionValidation, IntegrationController.performAction);

// ElevenLabs voice cloning routes
router.use('/elevenlabs', elevenLabsRoutes);

export default router;
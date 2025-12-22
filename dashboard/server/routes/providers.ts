import { Router } from 'express';
import { param } from 'express-validator';
import { ProviderController } from '../controllers/ProviderController';
import { authMiddleware } from '../middleware/auth';
import { providerFactory } from '../providers/ProviderFactory';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Validation for provider type parameter
const providerTypeValidation = [
  param('type')
    .isIn(providerFactory.getSupportedProviders())
    .withMessage(`Provider type must be one of: ${providerFactory.getSupportedProviders().join(', ')}`),
];

// Provider routes
router.get('/', ProviderController.getProviders);
router.get('/cache/clear', ProviderController.clearCache);
router.get('/:type/validate', providerTypeValidation, ProviderController.validateProvider);
router.get('/:type/capabilities', providerTypeValidation, ProviderController.getProviderCapabilities);
router.get('/:type/health', providerTypeValidation, ProviderController.getProviderHealth);

export default router;
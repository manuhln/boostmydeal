import { Router } from 'express';
import { PhoneNumberController } from './PhoneNumberController';
import { authMiddleware, requireRole } from '../../middleware/auth';

const router = Router();
const phoneNumberController = new PhoneNumberController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Routes
router.post(
  '/',
  PhoneNumberController.createValidationRules(),
  phoneNumberController.createPhoneNumber.bind(phoneNumberController)
);

router.get(
  '/',
  PhoneNumberController.listValidationRules(),
  phoneNumberController.getPhoneNumbers.bind(phoneNumberController)
);

router.get(
  '/:id',
  PhoneNumberController.getValidationRules(),
  phoneNumberController.getPhoneNumber.bind(phoneNumberController)
);

router.put(
  '/:id',
  PhoneNumberController.updateValidationRules(),
  phoneNumberController.updatePhoneNumber.bind(phoneNumberController)
);

router.delete(
  '/:id',
  requireRole(['owner', 'admin']),
  PhoneNumberController.getValidationRules(),
  phoneNumberController.deletePhoneNumber.bind(phoneNumberController)
);

export default router;
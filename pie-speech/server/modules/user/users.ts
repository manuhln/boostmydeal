import { Router } from 'express';
import { body } from 'express-validator';
import { UserController } from './UserController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// User profile validation
const updateUserProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('profileImage')
    .optional()
    .trim()
    .isURL()
    .withMessage('Profile image must be a valid URL'),
];

// Change password validation
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
];

// Organization update validation
const updateOrganizationValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Organization name must be between 1 and 100 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Website must be a valid URL'),
  body('settings.timezone')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Timezone is required'),
  body('settings.currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  body('settings.language')
    .optional()
    .trim()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language must be a valid language code'),
];

// Routes
router.get('/me', authMiddleware, UserController.getCurrentUser);
router.get('/profile', authMiddleware, UserController.getUserProfile);
router.put('/profile', authMiddleware, updateUserProfileValidation, UserController.updateUserProfile);
router.put('/change-password', authMiddleware, changePasswordValidation, UserController.changePassword);
router.put('/organization', authMiddleware, updateOrganizationValidation, UserController.updateOrganization);

export default router;
import { Router } from 'express';
import { body, param } from 'express-validator';
import { ElevenLabsIntegrationController } from './ElevenLabsIntegrationController';
import { authMiddleware } from '../../middleware/auth';
import multer from 'multer';

const router = Router();

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  },
});

// Voice cloning validation
const voiceCloneValidation = [
  body('voiceName')
    .notEmpty()
    .withMessage('Voice name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Voice name must be between 2 and 50 characters'),
  body('voiceDescription')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Voice description must be less than 500 characters'),
];

// Routes
router.post(
  '/:configId/clone-voice',
  authMiddleware,
  upload.single('audioFile'),
  voiceCloneValidation,
  ElevenLabsIntegrationController.cloneVoice
);

router.get(
  '/:configId/cloned-voices',
  authMiddleware,
  ElevenLabsIntegrationController.getClonedVoices
);

router.delete(
  '/:configId/cloned-voices/:voiceId',
  authMiddleware,
  param('voiceId').notEmpty().withMessage('Voice ID is required'),
  ElevenLabsIntegrationController.deleteClonedVoice
);

export default router;
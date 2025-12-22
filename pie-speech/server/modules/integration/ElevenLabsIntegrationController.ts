import { Response } from 'express';
import { validationResult } from 'express-validator';
import { ElevenLabsIntegrationService } from '../../integrations/providers/elevenlabs/elevenlabs.service';
import { AuthRequest } from '../../middleware/auth';

export class ElevenLabsIntegrationController {
  /**
   * Clone a voice using uploaded audio file
   */
  static async cloneVoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const userId = req.user!._id.toString();
      const organizationId = req.organization!._id.toString();
      const { configId } = req.params;
      const { voiceName, voiceDescription } = req.body;

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Audio file is required'
        });
        return;
      }

      const clonedVoice = await ElevenLabsIntegrationService.cloneVoice(
        userId,
        organizationId,
        configId,
        req.file.buffer,
        req.file.originalname,
        voiceName,
        voiceDescription
      );

      res.json({
        success: true,
        message: 'Voice cloned successfully',
        data: clonedVoice
      });
    } catch (error) {
      console.error('Clone voice error:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Failed to clone voice'
      });
    }
  }

  /**
   * Get all cloned voices for an integration
   */
  static async getClonedVoices(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const organizationId = req.organization!._id.toString();
      const { configId } = req.params;

      const clonedVoices = await ElevenLabsIntegrationService.getClonedVoices(
        userId,
        organizationId,
        configId
      );

      res.json({
        success: true,
        data: clonedVoices
      });
    } catch (error) {
      console.error('Get cloned voices error:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Failed to get cloned voices'
      });
    }
  }

  /**
   * Delete a cloned voice
   */
  static async deleteClonedVoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const userId = req.user!._id.toString();
      const organizationId = req.organization!._id.toString();
      const { configId, voiceId } = req.params;

      const success = await ElevenLabsIntegrationService.deleteClonedVoice(
        userId,
        organizationId,
        configId,
        voiceId
      );

      if (success) {
        res.json({
          success: true,
          message: 'Voice deleted successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to delete voice'
        });
      }
    } catch (error) {
      console.error('Delete cloned voice error:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Failed to delete voice'
      });
    }
  }
}
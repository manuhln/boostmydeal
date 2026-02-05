import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PhoneNumberService } from './PhoneNumberService';
import { CreatePhoneNumberDTO, UpdatePhoneNumberDTO } from './phone_number.dto';

export class PhoneNumberController {
  private phoneNumberService: PhoneNumberService;

  constructor() {
    this.phoneNumberService = new PhoneNumberService();
  }

  // Validation rules
  static createValidationRules() {
    return [
      body('phoneNumber')
        .notEmpty()
        .withMessage('Phone number is required')
        .isLength({ min: 10 })
        .withMessage('Phone number must be at least 10 characters'),
      body('countryCode')
        .notEmpty()
        .withMessage('Country code is required')
        .matches(/^\+\d{1,4}$/)
        .withMessage('Country code must start with + and contain 1-4 digits'),
      body('provider')
        .isIn(['twilio', 'voxsun'])
        .withMessage('Provider must be either twilio or voxsun'),
      body('accountSid')
        .notEmpty()
        .withMessage('Account SID is required')
        .isLength({ min: 5 })
        .withMessage('Account SID must be at least 5 characters'),
      body('authToken')
        .notEmpty()
        .withMessage('Auth Token is required')
        .isLength({ min: 5 })
        .withMessage('Auth Token must be at least 5 characters')
    ];
  }

  static updateValidationRules() {
    return [
      param('id').isMongoId().withMessage('Invalid phone number ID'),
      body('phoneNumber')
        .optional()
        .isLength({ min: 10 })
        .withMessage('Phone number must be at least 10 characters'),
      body('countryCode')
        .optional()
        .matches(/^\+\d{1,4}$/)
        .withMessage('Country code must start with + and contain 1-4 digits'),
      body('provider')
        .optional()
        .isIn(['twilio', 'voxsun'])
        .withMessage('Provider must be either twilio or voxsun'),
      body('accountSid')
        .optional()
        .isLength({ min: 5 })
        .withMessage('Account SID must be at least 5 characters'),
      body('authToken')
        .optional()
        .isLength({ min: 5 })
        .withMessage('Auth Token must be at least 5 characters')
    ];
  }

  static getValidationRules() {
    return [
      param('id').isMongoId().withMessage('Invalid phone number ID')
    ];
  }

  static listValidationRules() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('provider')
        .optional()
        .isIn(['twilio', 'voxsun'])
        .withMessage('Provider must be either twilio or voxsun')
    ];
  }

  // Controller methods
  async createPhoneNumber(req: Request, res: Response): Promise<void> {
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

      const { user } = req as any;
      const organizationId = user.organizationId;
      
      const phoneNumberData: CreatePhoneNumberDTO = {
        phoneNumber: req.body.phoneNumber,
        countryCode: req.body.countryCode,
        provider: req.body.provider,
        accountSid: req.body.accountSid,
        authToken: req.body.authToken
      };

      const phoneNumber = await this.phoneNumberService.createPhoneNumber(organizationId, phoneNumberData);
      
      res.status(201).json({
        success: true,
        message: 'Phone number created successfully',
        data: phoneNumber
      });
    } catch (error: any) {
      console.error('Error creating phone number:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create phone number'
      });
    }
  }

  async getPhoneNumbers(req: Request, res: Response): Promise<void> {
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

      const { user } = req as any;
      const organizationId = user.organizationId;
      const { provider, page, limit } = req.query;

      console.log('📱 [Phone] Fetching phone numbers for org:', organizationId, { provider, page, limit });

      let phoneNumbers;

      if (page || limit) {
        // Paginated request
        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 10;
        console.log('📱 [Phone] Paginated request - page:', pageNum, 'limit:', limitNum);
        phoneNumbers = await this.phoneNumberService.getPhoneNumbersPaginated(organizationId, pageNum, limitNum);
      } else if (provider) {
        // Filter by provider
        console.log('📱 [Phone] Filtering by provider:', provider);
        const phoneNumberList = await this.phoneNumberService.getPhoneNumbersByProvider(
          organizationId, 
          provider as 'twilio' | 'voxsun'
        );
        phoneNumbers = { phoneNumbers: phoneNumberList };
      } else {
        // Get all phone numbers
        console.log('📱 [Phone] Getting all phone numbers');
        const phoneNumberList = await this.phoneNumberService.getPhoneNumbersByOrganization(organizationId);
        phoneNumbers = { phoneNumbers: phoneNumberList };
      }

      console.log('✅ [Phone] Successfully retrieved phone numbers:', phoneNumbers.phoneNumbers?.length || 0, 'items');
      res.status(200).json({
        success: true,
        message: 'Phone numbers retrieved successfully',
        data: phoneNumbers
      });
    } catch (error: any) {
      console.error('❌ [Phone] Error retrieving phone numbers:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve phone numbers'
      });
    }
  }

  async getPhoneNumber(req: Request, res: Response): Promise<void> {
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

      const { user } = req as any;
      const organizationId = user.organizationId;
      const { id } = req.params;

      const phoneNumber = await this.phoneNumberService.getPhoneNumberById(id, organizationId);
      
      if (!phoneNumber) {
        res.status(404).json({
          success: false,
          message: 'Phone number not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Phone number retrieved successfully',
        data: phoneNumber
      });
    } catch (error: any) {
      console.error('Error retrieving phone number:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve phone number'
      });
    }
  }

  async updatePhoneNumber(req: Request, res: Response): Promise<void> {
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

      const { user } = req as any;
      const organizationId = user.organizationId;
      const { id } = req.params;

      const updateData: UpdatePhoneNumberDTO = req.body;
      const phoneNumber = await this.phoneNumberService.updatePhoneNumber(id, organizationId, updateData);
      
      if (!phoneNumber) {
        res.status(404).json({
          success: false,
          message: 'Phone number not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Phone number updated successfully',
        data: phoneNumber
      });
    } catch (error: any) {
      console.error('Error updating phone number:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update phone number'
      });
    }
  }

  async deletePhoneNumber(req: Request, res: Response): Promise<void> {
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

      const { user } = req as any;
      const organizationId = user.organizationId;
      const { id } = req.params;

      const deleted = await this.phoneNumberService.deletePhoneNumber(id, organizationId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Phone number not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Phone number deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting phone number:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete phone number'
      });
    }
  }
}
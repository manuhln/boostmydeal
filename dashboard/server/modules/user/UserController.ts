import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { UserService } from './UserService';
import { ResponseUtil } from '../../utils/response';

/**
 * User Controller
 * Handles HTTP requests related to user operations
 */
export class UserController {
  /**
   * Get current user with organization info
   */
  static getCurrentUser = ResponseUtil.handleAsync(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res, 'User not authenticated');
    }
    
    const userId = req.user._id || req.user.id;
    const userService = new UserService();
    
    if (!userId) {
      return ResponseUtil.unauthorized(res, 'User ID not found in request');
    }

    const userWithOrganization = await userService.getCurrentUserWithOrganization(userId);
    if (!userWithOrganization) {
      return ResponseUtil.notFound(res, 'User not found');
    }

    return ResponseUtil.success(res, userWithOrganization, 'User retrieved successfully');
  });

  /**
   * Get user profile
   */
  static getUserProfile = ResponseUtil.handleAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user!._id || req.user!.id;
    const userService = new UserService();
    
    if (!userId) {
      return ResponseUtil.unauthorized(res, 'User ID not found in request');
    }

    const user = await userService.getUserProfile(userId);
    if (!user) {
      return ResponseUtil.notFound(res, 'User not found');
    }

    return ResponseUtil.success(res, user, 'User profile retrieved successfully');
  });

  /**
   * Update user profile
   */
  static updateUserProfile = ResponseUtil.handleAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user!._id || req.user!.id;
    const updateData = req.body;
    const userService = new UserService();
    
    if (!userId) {
      return ResponseUtil.unauthorized(res, 'User ID not found in request');
    }

    const updatedUser = await userService.updateUserProfile(userId, updateData);
    if (!updatedUser) {
      return ResponseUtil.notFound(res, 'User not found');
    }

    return ResponseUtil.success(res, updatedUser, 'User profile updated successfully');
  });

  /**
   * Change user password
   */
  static changePassword = ResponseUtil.handleAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user!._id || req.user!.id;
    const { currentPassword, newPassword } = req.body;
    const userService = new UserService();
    
    if (!userId) {
      return ResponseUtil.unauthorized(res, 'User ID not found in request');
    }

    try {
      await userService.changePassword(userId, currentPassword, newPassword);
      return ResponseUtil.success(res, null, 'Password changed successfully');
    } catch (error: any) {
      if (error.message === 'Current password is incorrect') {
        return ResponseUtil.error(res, 'Current password is incorrect', 400);
      }
      throw error;
    }
  });

  /**
   * Update organization information
   */
  static updateOrganization = ResponseUtil.handleAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user!._id || req.user!.id;
    const updateData = req.body;
    const userService = new UserService();
    
    if (!userId) {
      return ResponseUtil.unauthorized(res, 'User ID not found in request');
    }

    const updatedOrganization = await userService.updateOrganization(userId, updateData);
    if (!updatedOrganization) {
      return ResponseUtil.notFound(res, 'Organization not found or user not authorized');
    }

    return ResponseUtil.success(res, updatedOrganization, 'Organization updated successfully');
  });
}
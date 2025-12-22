import { userDAL } from './user.dal';
import { organizationDAL } from '../organization/organization.dal';
import { IUser } from './User';
import { IOrganization } from '../organization/Organization';
import bcrypt from 'bcryptjs';

/**
 * User Service
 * Contains business logic for user operations
 */
export class UserService {
  /**
   * Get current user with organization information
   */
  async getCurrentUserWithOrganization(userId: string): Promise<{
    user: IUser;
    organization: IOrganization;
  } | null> {
    const user = await userDAL.findUserById(userId);
    if (!user) {
      return null;
    }

    const organization = await organizationDAL.findOrganizationById(user.organizationId);
    if (!organization) {
      return null;
    }

    // Remove sensitive information
    const sanitizedUser = this.sanitizeUser(user);

    return {
      user: sanitizedUser,
      organization
    };
  }

  /**
   * Get user profile without organization
   */
  async getUserProfile(userId: string): Promise<IUser | null> {
    const user = await userDAL.findUserById(userId);
    if (!user) {
      return null;
    }

    return this.sanitizeUser(user);
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updateData: Partial<IUser>): Promise<IUser | null> {
    // Remove sensitive fields that shouldn't be updated through this endpoint
    const allowedFields = {
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      phone: updateData.phone,
      profileImage: updateData.profileImage
    };

    // Remove undefined fields
    const cleanedData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );

    const updatedUser = await userDAL.updateUserProfile(userId, cleanedData);
    if (!updatedUser) {
      return null;
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get the user with password for verification
    const user = await userDAL.findUserByIdWithPassword(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await userDAL.updateUserPassword(userId, hashedNewPassword);
  }

  /**
   * Update organization information through user context
   */
  async updateOrganization(userId: string, updateData: Partial<IOrganization>): Promise<IOrganization | null> {
    // First get the user to find their organization
    const user = await userDAL.findUserById(userId);
    if (!user) {
      return null;
    }

    // Remove sensitive fields that shouldn't be updated through this endpoint
    const allowedFields = {
      name: updateData.name,
      phone: updateData.phone,
      website: updateData.website,
      logo: updateData.logo
    };

    // Remove undefined fields
    const cleanedData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );

    const updatedOrganization = await organizationDAL.updateOrganizationProfile(user.organizationId, cleanedData);
    return updatedOrganization;
  }

  /**
   * Sanitize user data by removing sensitive information
   */
  private sanitizeUser(user: IUser): IUser {
    const sanitized = user.toObject ? user.toObject() : { ...user };
    
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.emailVerificationToken;
    delete sanitized.passwordResetToken;
    delete sanitized.passwordResetExpires;

    return sanitized as IUser;
  }
}
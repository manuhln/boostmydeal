import { User, type IUser } from './User';
import { BaseDAL } from '../../dal/base.dal';

/**
 * User Data Access Layer
 * Provides descriptive, business-focused methods for user operations
 */
export class UserDAL extends BaseDAL<IUser> {
  constructor() {
    super(User);
  }

  /**
   * Find user by email address
   */
  async findUserByEmail(email: string): Promise<IUser | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Find user by email with password field (for authentication)
   */
  async findUserByEmailWithPassword(email: string): Promise<IUser | null> {
    return this.findOne({ email: email.toLowerCase() }, { select: '+password' });
  }

  /**
   * Find user by ID
   */
  async findUserById(userId: string): Promise<IUser | null> {
    return this.findOne({ _id: userId, isActive: true });
  }

  /**
   * Find user by ID with password field (for password change)
   */
  async findUserByIdWithPassword(userId: string): Promise<IUser | null> {
    return this.findOne({ _id: userId, isActive: true }, { select: '+password' });
  }

  /**
   * Find user by ID within organization
   */
  async findUserByIdInOrganization(userId: string, organizationId: string): Promise<IUser | null> {
    return this.findOne({ _id: userId, organizationId });
  }

  /**
   * Find all users in organization
   */
  async findUsersByOrganization(organizationId: string): Promise<IUser[]> {
    return this.find({ organizationId, isActive: true }, { sort: { createdAt: -1 } });
  }

  /**
   * Find users by role within organization
   */
  async findUsersByRole(organizationId: string, role: string): Promise<IUser[]> {
    return this.find({ organizationId, role, isActive: true });
  }

  /**
   * Find organization owners
   */
  async findOrganizationOwners(organizationId: string): Promise<IUser[]> {
    return this.findUsersByRole(organizationId, 'owner');
  }

  /**
   * Create new user
   */
  async createUser(userData: Partial<IUser>): Promise<IUser> {
    return this.create({
      ...userData,
      email: userData.email?.toLowerCase(),
      isActive: true,
      emailVerified: false
    });
  }

  /**
   * Update user profile information
   */
  async updateUserProfile(userId: string, profileData: Partial<IUser>): Promise<IUser | null> {
    const updateData = {
      ...profileData,
      updatedAt: new Date()
    };
    
    // Remove sensitive fields that shouldn't be updated via profile
    delete updateData.password;
    delete updateData.role;
    delete updateData.permissions;
    delete updateData.organizationId;
    
    return this.updateById(userId, updateData);
  }

  /**
   * Update user password
   */
  async updateUserPassword(userId: string, newPassword: string): Promise<IUser | null> {
    return this.updateById(userId, { 
      password: newPassword,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
      updatedAt: new Date()
    });
  }

  /**
   * Update user role and permissions
   */
  async updateUserRole(userId: string, organizationId: string, role: 'owner' | 'admin' | 'manager' | 'agent', permissions: string[]): Promise<IUser | null> {
    return this.updateOne(
      { _id: userId, organizationId },
      { role, permissions, updatedAt: new Date() }
    );
  }

  /**
   * Update user last login timestamp
   */
  async updateLastLogin(userId: string): Promise<IUser | null> {
    return this.updateById(userId, { lastLogin: new Date() });
  }

  /**
   * Verify user email
   */
  async verifyUserEmail(userId: string): Promise<IUser | null> {
    return this.updateById(userId, {
      emailVerified: true,
      emailVerificationToken: undefined,
      updatedAt: new Date()
    });
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<IUser | null> {
    return this.updateById(userId, {
      passwordResetToken: token,
      passwordResetExpires: expiresAt,
      updatedAt: new Date()
    });
  }

  /**
   * Find user by password reset token
   */
  async findUserByPasswordResetToken(token: string): Promise<IUser | null> {
    return this.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivateUser(userId: string, organizationId: string): Promise<IUser | null> {
    return this.updateOne(
      { _id: userId, organizationId },
      { isActive: false, updatedAt: new Date() }
    );
  }

  /**
   * Reactivate user
   */
  async reactivateUser(userId: string, organizationId: string): Promise<IUser | null> {
    return this.updateOne(
      { _id: userId, organizationId },
      { isActive: true, updatedAt: new Date() }
    );
  }

  /**
   * Check if email exists in system
   */
  async emailExists(email: string): Promise<boolean> {
    return this.exists({ email: email.toLowerCase() });
  }

  /**
   * Count active users in organization
   */
  async countActiveUsersInOrganization(organizationId: string): Promise<number> {
    return this.count({ organizationId, isActive: true });
  }

  /**
   * Get paginated users for organization
   */
  async getPaginatedUsers(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    filters?: { role?: string; search?: string }
  ) {
    let criteria: any = { organizationId, isActive: true };

    if (filters?.role) {
      criteria.role = filters.role;
    }

    if (filters?.search) {
      criteria.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }

    return this.paginate(criteria, page, limit, { lastName: 1, firstName: 1 });
  }

  /**
   * Find users with specific permissions
   */
  async findUsersWithPermission(organizationId: string, permission: string): Promise<IUser[]> {
    return this.find({
      organizationId,
      isActive: true,
      $or: [
        { permissions: '*' }, // Full admin access
        { permissions: { $in: [permission] } }
      ]
    });
  }
}

// Export singleton instance
export const userDAL = new UserDAL();
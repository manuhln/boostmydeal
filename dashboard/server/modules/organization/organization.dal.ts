import { Organization, type IOrganization } from './Organization';
import { BaseDAL } from '../../dal/base.dal';

/**
 * Organization Data Access Layer
 * Provides descriptive, business-focused methods for organization operations
 */
export class OrganizationDAL extends BaseDAL<IOrganization> {
  constructor() {
    super(Organization);
  }

  /**
   * Find organization by slug
   */
  async findOrganizationBySlug(slug: string): Promise<IOrganization | null> {
    return this.findOne({ slug: slug.toLowerCase() });
  }

  /**
   * Find organization by ID
   */
  async findOrganizationById(organizationId: string): Promise<IOrganization | null> {
    return this.findOne({ _id: organizationId, isActive: true });
  }

  /**
   * Find organization by email
   */
  async findOrganizationByEmail(email: string): Promise<IOrganization | null> {
    return this.findOne({ email: email.toLowerCase(), isActive: true });
  }

  /**
   * Create new organization
   */
  async createOrganization(orgData: Partial<IOrganization>): Promise<IOrganization> {
    return this.create({
      ...orgData,
      email: orgData.email?.toLowerCase(),
      slug: orgData.slug?.toLowerCase(),
      isActive: true,
      plan: orgData.plan || 'starter',
      callsUsed: 0,
      agentsUsed: 0
    });
  }

  /**
   * Update organization profile
   */
  async updateOrganizationProfile(organizationId: string, profileData: Partial<IOrganization>): Promise<IOrganization | null> {
    const updateData = {
      ...profileData,
      updatedAt: new Date()
    };

    // Remove sensitive fields that shouldn't be updated via profile
    delete (updateData as any).slug;
    delete (updateData as any).plan;
    delete (updateData as any).callsUsed;
    delete (updateData as any).agentsUsed;
    delete (updateData as any).isActive;

    return this.updateById(organizationId, updateData);
  }

  /**
   * Update organization plan
   */
  async updateOrganizationPlan(organizationId: string, plan: string, limits?: any): Promise<IOrganization | null> {
    const updateData: any = {
      plan,
      updatedAt: new Date()
    };

    if (limits) {
      updateData.limits = limits;
    }

    return this.updateById(organizationId, updateData);
  }

  /**
   * Update organization usage counters
   */
  async updateUsageCounters(organizationId: string, callsUsed: number, agentsUsed: number): Promise<IOrganization | null> {
    return this.updateById(organizationId, {
      callsUsed,
      agentsUsed,
      updatedAt: new Date()
    });
  }

  /**
   * Increment calls used counter
   */
  async incrementCallsUsed(organizationId: string, increment: number = 1): Promise<IOrganization | null> {
    return this.model.findByIdAndUpdate(
      organizationId,
      { 
        $inc: { callsUsed: increment },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );
  }

  /**
   * Increment agents used counter
   */
  async incrementAgentsUsed(organizationId: string, increment: number = 1): Promise<IOrganization | null> {
    return this.model.findByIdAndUpdate(
      organizationId,
      { 
        $inc: { agentsUsed: increment },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );
  }

  /**
   * Update provider configurations
   */
  async updateProviderConfig(organizationId: string, providerConfigs: any): Promise<IOrganization | null> {
    return this.updateById(organizationId, {
      providerConfigs,
      updatedAt: new Date()
    });
  }

  /**
   * Get organization with usage statistics
   */
  async getOrganizationWithStats(organizationId: string): Promise<IOrganization | null> {
    const org = await this.findOrganizationById(organizationId);
    if (!org) return null;

    // Additional stats could be calculated here if needed
    return org;
  }

  /**
   * Check if organization slug exists
   */
  async slugExists(slug: string): Promise<boolean> {
    return this.exists({ slug: slug.toLowerCase() });
  }

  /**
   * Check if organization email exists
   */
  async emailExists(email: string): Promise<boolean> {
    return this.exists({ email: email.toLowerCase() });
  }

  /**
   * Deactivate organization (soft delete)
   */
  async deactivateOrganization(organizationId: string): Promise<IOrganization | null> {
    return this.updateById(organizationId, {
      isActive: false,
      updatedAt: new Date()
    });
  }

  /**
   * Reactivate organization
   */
  async reactivateOrganization(organizationId: string): Promise<IOrganization | null> {
    return this.updateById(organizationId, {
      isActive: true,
      updatedAt: new Date()
    });
  }

  /**
   * Find organizations by plan type
   */
  async findOrganizationsByPlan(plan: string): Promise<IOrganization[]> {
    return this.find({ plan, isActive: true });
  }

  /**
   * Find organizations exceeding usage limits
   */
  async findOrganizationsExceedingLimits(): Promise<IOrganization[]> {
    return this.model.find({
      isActive: true,
      $or: [
        { $expr: { $gt: ['$callsUsed', '$limits.maxCalls'] } },
        { $expr: { $gt: ['$agentsUsed', '$limits.maxAgents'] } }
      ]
    });
  }

  /**
   * Get paginated organizations
   */
  async getPaginatedOrganizations(
    page: number = 1,
    limit: number = 10,
    filters?: { plan?: string; search?: string }
  ) {
    let criteria: any = { isActive: true };

    if (filters?.plan) {
      criteria.plan = filters.plan;
    }

    if (filters?.search) {
      criteria.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { slug: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }

    return this.paginate(criteria, page, limit, { name: 1 });
  }

  /**
   * Count total active organizations
   */
  async countActiveOrganizations(): Promise<number> {
    return this.count({ isActive: true });
  }

  /**
   * Update billing information
   */
  async updateBillingInfo(organizationId: string, billingData: any): Promise<IOrganization | null> {
    return this.updateById(organizationId, {
      billingAddress: billingData.address,
      billingEmail: billingData.email,
      paymentMethodId: billingData.paymentMethodId,
      updatedAt: new Date()
    });
  }
}

// Export singleton instance
export const organizationDAL = new OrganizationDAL();
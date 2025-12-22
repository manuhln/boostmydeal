import { Agent, type IAgent } from './Agent';
import { BaseDAL } from '../../dal/base.dal';

/**
 * Agent Data Access Layer
 * Provides descriptive, business-focused methods for agent operations
 */
export class AgentDAL extends BaseDAL<IAgent> {
  constructor() {
    super(Agent);
  }

  /**
   * Find all active agents for organization
   */
  async findActiveAgentsByOrganization(organizationId: string): Promise<IAgent[]> {
    return this.find(
      { organizationId, isActive: true },
      { sort: { createdAt: -1 } }
    );
  }

  /**
   * Find agent by ID within organization
   */
  async findAgentByIdInOrganization(agentId: string, organizationId: string): Promise<IAgent | null> {
    return this.findOne({ _id: agentId, organizationId });
  }

  /**
   * Find agents by voice provider
   */
  async findAgentsByProvider(organizationId: string, voiceProvider: string): Promise<IAgent[]> {
    return this.find({
      organizationId,
      voiceProvider,
      isActive: true
    });
  }

  /**
   * Find agents by AI model
   */
  async findAgentsByAIModel(organizationId: string, aiModel: string): Promise<IAgent[]> {
    return this.find({
      organizationId,
      aiModel,
      isActive: true
    });
  }

  /**
   * Find agents by language support
   */
  async findAgentsByLanguage(organizationId: string, language: string): Promise<IAgent[]> {
    return this.find({
      organizationId,
      languages: { $in: [language] },
      isActive: true
    });
  }

  /**
   * Find agents by gender
   */
  async findAgentsByGender(organizationId: string, gender: string): Promise<IAgent[]> {
    return this.find({
      organizationId,
      gender,
      isActive: true
    });
  }

  /**
   * Create new agent
   */
  async createAgent(agentData: Partial<IAgent>): Promise<IAgent> {
    return this.create({
      ...agentData,
      isActive: true,
      cost: agentData.cost || 0,
      latency: agentData.latency || 0,
      metadata: agentData.metadata || {}
    });
  }

  /**
   * Update agent configuration
   */
  async updateAgentConfig(agentId: string, organizationId: string, configData: Partial<IAgent>): Promise<IAgent | null> {
    console.log('🔄 [AgentDAL] Updating agent config with call transfer settings:', {
      agentId,
      enableCallTransfer: configData.enableCallTransfer,
      transferPhoneNumber: configData.transferPhoneNumber,
      allConfigData: Object.keys(configData)
    });
    
    const updateData = {
      ...configData,
      updatedAt: new Date()
    };

    // Remove fields that shouldn't be updated directly
    delete (updateData as any)._id;
    delete (updateData as any).organizationId;
    delete (updateData as any).createdAt;

    console.log('🔄 [AgentDAL] Final update data before save:', {
      agentId,
      enableCallTransfer: updateData.enableCallTransfer,
      transferPhoneNumber: updateData.transferPhoneNumber,
      userSpeaksFirst: updateData.userSpeaksFirst,
      allUpdateFields: Object.keys(updateData)
    });

    const result = await this.updateOne({ _id: agentId, organizationId }, updateData);
    
    console.log('✅ [AgentDAL] Update result:', {
      agentId,
      success: !!result,
      resultCallTransfer: result?.enableCallTransfer,
      resultTransferNumber: result?.transferPhoneNumber
    });
    
    return result;
  }

  /**
   * Update agent provider sync status
   */
  async updateProviderSync(agentId: string, organizationId: string, providerSync: any): Promise<IAgent | null> {
    return this.updateOne(
      { _id: agentId, organizationId },
      { 
        providerSync,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Update agent performance metrics
   */
  async updateAgentMetrics(agentId: string, organizationId: string, cost: number, latency: number): Promise<IAgent | null> {
    return this.updateOne(
      { _id: agentId, organizationId },
      { 
        cost,
        latency,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Deactivate agent (soft delete)
   */
  async deactivateAgent(agentId: string, organizationId: string): Promise<IAgent | null> {
    return this.updateOne(
      { _id: agentId, organizationId },
      { 
        isActive: false,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Reactivate agent
   */
  async reactivateAgent(agentId: string, organizationId: string): Promise<IAgent | null> {
    return this.updateOne(
      { _id: agentId, organizationId },
      { 
        isActive: true,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Find agents requiring provider sync
   */
  async findAgentsNeedingSync(organizationId: string, provider: string): Promise<IAgent[]> {
    return this.find({
      organizationId,
      voiceProvider: provider,
      [`providerSync.${provider}.status`]: { $in: ['pending', 'failed'] },
      isActive: true
    });
  }

  /**
   * Find high-performance agents (low latency, low cost)
   */
  async findHighPerformanceAgents(organizationId: string, maxLatency: number = 2000, maxCost: number = 0.5): Promise<IAgent[]> {
    return this.find({
      organizationId,
      latency: { $lte: maxLatency },
      cost: { $lte: maxCost },
      isActive: true
    });
  }

  /**
   * Count active agents by organization
   */
  async countActiveAgentsByOrganization(organizationId: string): Promise<number> {
    return this.count({ organizationId, isActive: true });
  }

  /**
   * Count agents by provider
   */
  async countAgentsByProvider(organizationId: string, voiceProvider: string): Promise<number> {
    return this.count({ organizationId, voiceProvider, isActive: true });
  }

  /**
   * Get paginated agents with filters
   */
  async getPaginatedAgents(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    filters?: {
      voiceProvider?: string;
      aiModel?: string;
      gender?: string;
      language?: string;
      search?: string;
    }
  ) {
    let criteria: any = { organizationId, isActive: true };

    if (filters?.voiceProvider) {
      criteria.voiceProvider = filters.voiceProvider;
    }

    if (filters?.aiModel) {
      criteria.aiModel = filters.aiModel;
    }

    if (filters?.gender) {
      criteria.gender = filters.gender;
    }

    if (filters?.language) {
      criteria.languages = { $in: [filters.language] };
    }

    if (filters?.search) {
      criteria.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    return this.paginate(criteria, page, limit, { createdAt: -1 });
  }

  /**
   * Find agents with specific metadata
   */
  async findAgentsByMetadata(organizationId: string, metadataKey: string, metadataValue: any): Promise<IAgent[]> {
    return this.find({
      organizationId,
      [`metadata.${metadataKey}`]: metadataValue,
      isActive: true
    });
  }

  /**
   * Update agent metadata
   */
  async updateAgentMetadata(agentId: string, organizationId: string, metadata: Record<string, any>): Promise<IAgent | null> {
    return this.updateOne(
      { _id: agentId, organizationId },
      { 
        metadata,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Find agents by temperature range (AI model configuration)
   */
  async findAgentsByTemperatureRange(organizationId: string, minTemp: number, maxTemp: number): Promise<IAgent[]> {
    return this.find({
      organizationId,
      temperature: { $gte: minTemp, $lte: maxTemp },
      isActive: true
    });
  }

  /**
   * Find agents by country
   */
  async findAgentsByCountry(organizationId: string, country: string): Promise<IAgent[]> {
    return this.find({
      organizationId,
      country,
      isActive: true
    });
  }

  /**
   * Bulk update agent provider sync status
   */
  async bulkUpdateProviderSync(organizationId: string, provider: string, status: string): Promise<number> {
    const result = await this.model.updateMany(
      {
        organizationId,
        voiceProvider: provider,
        isActive: true
      },
      {
        $set: {
          [`providerSync.${provider}.status`]: status,
          [`providerSync.${provider}.lastSync`]: new Date(),
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount;
  }
}

// Export singleton instance
export const agentDAL = new AgentDAL();
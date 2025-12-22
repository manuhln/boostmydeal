import { IAgent, Agent } from '../modules/agent/Agent';
import { ICall, Call } from '../models/Call';
import { IMetric, Metric } from '../models/Metric';
import { IContact, Contact } from '../models/Contact';
import { VoiceProviderFactory, ProviderType } from './voiceProvider';
import { BaseVoiceProvider, AgentConfig, CallConfig } from './providers/baseProvider';

export interface MongoCallFilters {
  agentId?: string;
  callType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  contactName?: string;
}

export class MongoVoiceService {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  // Agent operations with provider sync
  async getAgents(): Promise<IAgent[]> {
    return Agent.find({ 
      organizationId: this.organizationId,
      isActive: true 
    }).sort({ createdAt: -1 });
  }

  async getAgent(id: string): Promise<IAgent | null> {
    return Agent.findOne({ 
      _id: id, 
      organizationId: this.organizationId 
    });
  }

  async createAgent(agentData: Partial<IAgent>): Promise<IAgent> {
    const agent = new Agent({
      ...agentData,
      organizationId: this.organizationId,
    });

    const savedAgent = await agent.save();

    // Auto-sync with active providers
    await this.syncAgentToProviders(savedAgent);

    return savedAgent;
  }

  async updateAgent(id: string, agentData: Partial<IAgent>): Promise<IAgent | null> {
    const updatedAgent = await Agent.findOneAndUpdate(
      { _id: id, organizationId: this.organizationId },
      { ...agentData, updatedAt: new Date() },
      { new: true }
    );

    if (updatedAgent) {
      // Re-sync with providers
      await this.syncAgentToProviders(updatedAgent);
    }

    return updatedAgent;
  }

  async deleteAgent(id: string): Promise<boolean> {
    const agent = await Agent.findOne({ _id: id, organizationId: this.organizationId });
    if (!agent) return false;

    // Delete from providers first
    await this.deleteAgentFromProviders(agent);

    const result = await Agent.findOneAndUpdate(
      { _id: id, organizationId: this.organizationId },
      { isActive: false },
      { new: true }
    );

    return !!result;
  }

  // Call operations with provider integration
  async getCalls(filters?: MongoCallFilters): Promise<ICall[]> {
    const query: any = { organizationId: this.organizationId };

    if (filters?.agentId) query.agentId = filters.agentId;
    if (filters?.callType) query.callType = filters.callType;
    if (filters?.status) query.status = filters.status;
    if (filters?.contactName) query.contactName = new RegExp(filters.contactName, 'i');

    if (filters?.dateFrom || filters?.dateTo) {
      query.startedAt = {};
      if (filters.dateFrom) query.startedAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.startedAt.$lte = new Date(filters.dateTo + 'T23:59:59.999Z');
    }

    return Call.find(query)
      .populate('agentId', 'name gender voiceProvider')
      .sort({ startedAt: -1 });
  }

  async getCall(id: string): Promise<ICall | null> {
    return Call.findOne({ 
      _id: id, 
      organizationId: this.organizationId 
    }).populate('agentId', 'name gender voiceProvider');
  }

  async createCall(callData: Partial<ICall>): Promise<ICall> {
    const call = new Call({
      ...callData,
      organizationId: this.organizationId,
    });

    return call.save();
  }

  async updateCall(id: string, callData: Partial<ICall>): Promise<ICall | null> {
    return Call.findOneAndUpdate(
      { _id: id, organizationId: this.organizationId },
      { ...callData, updatedAt: new Date() },
      { new: true }
    );
  }

  // Initiate call with provider
  async initiateCall(config: {
    agentId: string;
    contactPhone: string;
    systemPrompt?: string;
    providerType?: ProviderType;
  }): Promise<{ call: ICall; providerResult: any }> {
    const agent = await this.getAgent(config.agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get provider (use specified or default to agent's provider)
    const providerType = config.providerType || agent.voiceProvider as ProviderType;
    const provider = VoiceProviderFactory.getProvider(providerType);

    // Create agent config for provider
    const agentConfig: AgentConfig = {
      name: agent.name,
      systemPrompt: config.systemPrompt || agent.systemPrompt || '',
      voiceId: agent.voiceModel,
      model: agent.aiModel || 'gpt-4',
      temperature: agent.temperature || 0.7,
      maxTokens: agent.maxTokens || 150,
      language: agent.languages?.[0] || 'en',
    };

    // Initiate call with provider
    const providerResult = await provider.initiateCall({
      agentId: parseInt(config.agentId),
      contactPhone: config.contactPhone,
      systemPrompt: config.systemPrompt || agent.systemPrompt || '',
      agentConfig,
    });

    // Save call to MongoDB
    const call = await this.createCall({
      agentId: agent._id,
      contactPhone: config.contactPhone,
      callType: 'outbound',
      status: providerResult.status,
      startedAt: new Date(),
      providerData: {
        provider: provider.getProviderName(),
        callId: providerResult.callId,
      },
      metadata: providerResult.metadata || {},
    });

    return { call, providerResult };
  }

  // Metrics operations
  async getMetrics(date?: string): Promise<IMetric | null> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    return Metric.findOne({ 
      organizationId: this.organizationId,
      date: targetDate 
    });
  }

  async createOrUpdateMetrics(metricsData: Partial<IMetric>): Promise<IMetric> {
    const targetDate = metricsData.date || new Date().toISOString().split('T')[0];
    
    return Metric.findOneAndUpdate(
      { 
        organizationId: this.organizationId,
        date: targetDate 
      },
      { 
        ...metricsData,
        organizationId: this.organizationId,
        date: targetDate,
        updatedAt: new Date()
      },
      { 
        new: true, 
        upsert: true 
      }
    );
  }

  async getTodayMetrics(): Promise<IMetric | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.getMetrics(today);
  }

  // Contact operations
  async getContacts(): Promise<IContact[]> {
    return Contact.find({ 
      organizationId: this.organizationId,
      isActive: true 
    }).sort({ createdAt: -1 });
  }

  async getContact(id: string): Promise<IContact | null> {
    return Contact.findOne({ 
      _id: id, 
      organizationId: this.organizationId 
    });
  }

  async createContact(contactData: Partial<IContact>): Promise<IContact> {
    const contact = new Contact({
      ...contactData,
      organizationId: this.organizationId,
    });

    return contact.save();
  }

  async updateContact(id: string, contactData: Partial<IContact>): Promise<IContact | null> {
    return Contact.findOneAndUpdate(
      { _id: id, organizationId: this.organizationId },
      { ...contactData, updatedAt: new Date() },
      { new: true }
    );
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await Contact.findOneAndUpdate(
      { _id: id, organizationId: this.organizationId },
      { isActive: false },
      { new: true }
    );

    return !!result;
  }

  // Provider sync operations
  async syncAgent(agent: IAgent): Promise<void> {
    return this.syncAgentToProviders(agent);
  }
  
  private async syncAgentToProviders(agent: IAgent): Promise<void> {
    // Get organization's active providers
    const { Organization } = await import('../modules/organization/Organization');
    const org = await Organization.findById(this.organizationId).select('+providers');
    if (!org) return;

    const activeProviders = Object.entries(org.providers || {})
      .filter(([_, config]) => config?.isActive && config?.isValidated);

    for (const [providerType, _] of activeProviders) {
      try {
        const provider = VoiceProviderFactory.getProvider(providerType as ProviderType);
        
        const agentConfig: AgentConfig = {
          name: agent.name,
          systemPrompt: agent.systemPrompt || '',
          voiceId: agent.voiceModel,
          model: agent.aiModel,
          temperature: agent.temperature || 0.7,
          maxTokens: agent.maxTokens || 150,
          language: agent.languages?.[0] || 'en',
        };

        const providerAgent = await provider.createAgent(agentConfig);
        
        // Update agent with provider sync info
        const syncKey = `providerSync.${providerType}`;
        await Agent.findByIdAndUpdate(agent._id, {
          [`${syncKey}.agentId`]: providerAgent.id,
          [`${syncKey}.lastSync`]: new Date(),
          [`${syncKey}.status`]: 'synced',
        });

      } catch (error) {
        console.error(`Failed to sync agent to ${providerType}:`, error);
        
        // Update with failed status
        const syncKey = `providerSync.${providerType}`;
        await Agent.findByIdAndUpdate(agent._id, {
          [`${syncKey}.lastSync`]: new Date(),
          [`${syncKey}.status`]: 'failed',
        });
      }
    }
  }

  private async deleteAgentFromProviders(agent: IAgent): Promise<void> {
    if (!agent.providerSync) return;

    for (const [providerType, syncData] of Object.entries(agent.providerSync || {})) {
      if (syncData && 'agentId' in syncData && syncData.agentId) {
        try {
          const provider = VoiceProviderFactory.getProvider(providerType as ProviderType);
          await provider.deleteAgent(syncData.agentId);
        } catch (error) {
          console.error(`Failed to delete agent from ${providerType}:`, error);
        }
      }
    }
  }
}
import { agentDAL } from './agent.dal';
import { MongoVoiceService } from '../../services/MongoVoiceService';
import { CreateAgentDto, UpdateAgentDto, AgentResponseDto } from './agent.dto';
import { IAgent } from './Agent';

export class AgentService {
  private voiceService: MongoVoiceService;

  constructor(organizationId: string) {
    this.voiceService = new MongoVoiceService(organizationId);
  }

  /**
   * Get all agents for organization
   */
  async getAgents(organizationId: string): Promise<AgentResponseDto[]> {
    const agents = await agentDAL.findActiveAgentsByOrganization(organizationId);
    return agents.map(agent => this.mapToResponseDto(agent));
  }

  /**
   * Get single agent by ID
   */
  async getAgent(agentId: string, organizationId: string): Promise<AgentResponseDto | null> {
    const agent = await agentDAL.findAgentByIdInOrganization(agentId, organizationId);
    if (!agent) return null;
    console.log('📞 [AgentService] Retrieved agent with call transfer settings:', {
      agentId,
      enableCallTransfer: agent.enableCallTransfer,
      transferPhoneNumber: agent.transferPhoneNumber
    });
    const responseDto = this.mapToResponseDto(agent);
    console.log('📞 [AgentService] Response DTO call transfer settings:', {
      agentId,
      responseEnableCallTransfer: responseDto.enableCallTransfer,
      responseTransferPhoneNumber: responseDto.transferPhoneNumber
    });
    return responseDto;
  }

  /**
   * Create new agent
   */
  async createAgent(organizationId: string, createDto: CreateAgentDto): Promise<AgentResponseDto> {
    console.log('🏷️ [AgentService] Creating agent with tags:', {
      userTags: createDto.userTags,
      systemTags: createDto.systemTags
    });
    
    // Create agent in database
    const agent = await agentDAL.createAgent({
      organizationId,
      workspaceId: 1, // Set to 1 as requested
      name: createDto.name,
      description: createDto.description,
      gender: createDto.gender,
      aiModel: createDto.aiModel,
      voiceProvider: createDto.voiceProvider,
      voiceModel: createDto.voiceModel,
      voice: createDto.voice,
      transcriber: createDto.transcriber,
      transcriberVoiceId: createDto.transcriberVoiceId,
      modelProvider: createDto.modelProvider,
      firstMessage: createDto.firstMessage,
      userSpeaksFirst: createDto.userSpeaksFirst,
      systemPrompt: createDto.systemPrompt,
      knowledgeBase: createDto.knowledgeBase,
      trigger: createDto.trigger,
      postWorkflow: createDto.postWorkflow,
      workflowIds: createDto.workflowIds,
      temperature: createDto.temperature,
      maxTokens: createDto.maxTokens,
      speed: createDto.speed,
      country: createDto.country,
      languages: createDto.languages,
      profileImageUrl: createDto.profileImageUrl,
      phoneNumberId: createDto.phoneNumberId,
      ragResponse: createDto.ragResponse,
      userTags: createDto.userTags || [],
      systemTags: createDto.systemTags || [],
      // Call settings
      callRecording: createDto.callRecording,
      callRecordingFormat: createDto.callRecordingFormat,
      backgroundAmbientSound: createDto.backgroundAmbientSound,
      rememberLeadPreference: createDto.rememberLeadPreference,
      voicemailDetection: createDto.voicemailDetection,
      voicemailMessage: createDto.voicemailMessage,
      // Call transfer settings
      enableCallTransfer: createDto.enableCallTransfer,
      transferPhoneNumber: createDto.transferPhoneNumber,
      // Keyboard sound settings
      keyboardSound: createDto.keyboardSound,
      cost: 0,
      latency: 0,
      isActive: true,
      metadata: {},
    });

    // Sync with voice provider
    // try {
    //   await this.voiceService.syncAgent(agent);
    // } catch (error) {
    //   console.warn('⚠️ Agent sync with provider failed:', error);
    //   // Continue without failing - agent created locally
    // }

    return this.mapToResponseDto(agent);
  }

  /**
   * Update existing agent
   */
  async updateAgent(agentId: string, organizationId: string, updateDto: UpdateAgentDto): Promise<AgentResponseDto | null> {
    console.log('🏷️ [AgentService] Updating agent with tags:', {
      agentId,
      userTags: updateDto.userTags,
      systemTags: updateDto.systemTags
    });
    console.log('📞 [AgentService] Updating agent with call transfer settings:', {
      agentId,
      enableCallTransfer: updateDto.enableCallTransfer,
      transferPhoneNumber: updateDto.transferPhoneNumber
    });
    const updatedAgent = await agentDAL.updateAgentConfig(agentId, organizationId, updateDto);
    if (!updatedAgent) return null;

    // Sync with voice provider if needed
    // await this.voiceService.syncAgent(updatedAgent);

    return this.mapToResponseDto(updatedAgent);
  }

  /**
   * Delete agent (soft delete)
   */
  async deleteAgent(agentId: string, organizationId: string): Promise<boolean> {
    const deletedAgent = await agentDAL.deactivateAgent(agentId, organizationId);
    return !!deletedAgent;
  }

  /**
   * Map agent model to response DTO
   */
  private mapToResponseDto(agent: IAgent): AgentResponseDto {
    return {
      _id: agent._id,
      organizationId: agent.organizationId,
      workspaceId: agent.workspaceId,
      name: agent.name,
      description: agent.description,
      gender: agent.gender,
      aiModel: agent.aiModel,
      voiceProvider: agent.voiceProvider,
      voiceModel: agent.voiceModel,
      voice: agent.voice,
      transcriber: agent.transcriber,
      transcriberVoiceId: agent.transcriberVoiceId,
      modelProvider: agent.modelProvider,
      firstMessage: agent.firstMessage,
      userSpeaksFirst: agent.userSpeaksFirst,
      systemPrompt: agent.systemPrompt,
      knowledgeBase: agent.knowledgeBase,
      trigger: agent.trigger,
      postWorkflow: agent.postWorkflow,
      workflowIds: agent.workflowIds,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      speed: agent.speed,
      country: agent.country,
      languages: agent.languages,
      profileImageUrl: agent.profileImageUrl,
      phoneNumberId: agent.phoneNumberId,
      cost: agent.cost,
      latency: agent.latency,
      isActive: agent.isActive,
      metadata: agent.metadata,
      providerSync: agent.providerSync,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      ragResponse: agent.ragResponse,
      userTags: agent.userTags || [],
      systemTags: agent.systemTags || [],
      // Call settings
      callRecording: agent.callRecording,
      callRecordingFormat: agent.callRecordingFormat,
      backgroundAmbientSound: agent.backgroundAmbientSound,
      rememberLeadPreference: agent.rememberLeadPreference,
      voicemailDetection: agent.voicemailDetection,
      voicemailMessage: agent.voicemailMessage,
      // Call transfer settings
      enableCallTransfer: agent.enableCallTransfer,
      transferPhoneNumber: agent.transferPhoneNumber,
      // Keyboard sound settings
      keyboardSound: agent.keyboardSound,
    };
  }
}
export interface CreateAgentDto {
  name: string;
  description?: string;
  gender: 'male' | 'female' | 'neutral';
  aiModel: string;
  voiceProvider: string;
  voiceModel: string;
  voice: string;
  transcriber?: string;
  transcriberVoiceId?: string;
  modelProvider?: string;
  firstMessage?: string;
  userSpeaksFirst?: boolean;
  systemPrompt?: string;
  knowledgeBase?: string[];
  trigger: 'TRANSCRIPT' | 'TRANSCRIPT_COMPLETE' | 'ACTION' | 'PHONE_CALL_CONNECTED' | 'PHONE_CALL_ENDED';
  postWorkflow: 'none' | 'zoho_crm' | 'salesforce' | 'hubspot' | 'pipedrive' | 'webhook' | 'email';
  workflowIds?: string[];
  temperature: number;
  maxTokens: number;
  speed: number;
  country?: string;
  languages: string[];
  profileImageUrl?: string;
  phoneNumberId?: string;
  ragResponse?: string;
  userTags?: string[];
  systemTags?: string[];
  // Call settings
  callRecording?: boolean;
  callRecordingFormat?: string;
  backgroundAmbientSound?: string;
  rememberLeadPreference?: boolean;
  voicemailDetection?: boolean;
  voicemailMessage?: string;
  // Call transfer settings
  enableCallTransfer?: boolean;
  transferPhoneNumber?: string;
  // Keyboard sound settings
  keyboardSound?: boolean;
}

export interface UpdateAgentDto {
  name?: string;
  description?: string;
  gender?: 'male' | 'female' | 'neutral';
  aiModel?: string;
  voiceProvider?: string;
  voiceModel?: string;
  voice?: string;
  transcriber?: string;
  transcriberVoiceId?: string;
  modelProvider?: string;
  firstMessage?: string;
  userSpeaksFirst?: boolean;
  systemPrompt?: string;
  knowledgeBase?: string[];
  trigger?: 'TRANSCRIPT' | 'TRANSCRIPT_COMPLETE' | 'ACTION' | 'PHONE_CALL_CONNECTED' | 'PHONE_CALL_ENDED';
  postWorkflow?: 'none' | 'zoho_crm' | 'salesforce' | 'hubspot' | 'pipedrive' | 'webhook' | 'email';
  workflowIds?: string[];
  temperature?: number;
  maxTokens?: number;
  speed?: number;
  country?: string;
  languages?: string[];
  profileImageUrl?: string;
  phoneNumberId?: string;
  isActive?: boolean;
  ragResponse?: string;
  userTags?: string[];
  systemTags?: string[];
  // Call settings
  callRecording?: boolean;
  callRecordingFormat?: string;
  backgroundAmbientSound?: string;
  rememberLeadPreference?: boolean;
  voicemailDetection?: boolean;
  voicemailMessage?: string;
  // Call transfer settings
  enableCallTransfer?: boolean;
  transferPhoneNumber?: string;
  // Keyboard sound settings
  keyboardSound?: boolean;
}

export interface AgentResponseDto {
  _id: string;
  organizationId: string;
  workspaceId: number;
  name: string;
  description?: string;
  gender: 'male' | 'female' | 'neutral';
  aiModel: string;
  voiceProvider: string;
  voiceModel: string;
  voice: string;
  transcriber?: string;
  transcriberVoiceId?: string;
  modelProvider?: string;
  firstMessage?: string;
  userSpeaksFirst?: boolean;
  systemPrompt?: string;
  knowledgeBase?: string[];
  trigger: 'TRANSCRIPT' | 'TRANSCRIPT_COMPLETE' | 'ACTION' | 'PHONE_CALL_CONNECTED' | 'PHONE_CALL_ENDED';
  postWorkflow: 'none' | 'zoho_crm' | 'salesforce' | 'hubspot' | 'pipedrive' | 'webhook' | 'email';
  workflowIds?: string[];
  temperature: number;
  maxTokens: number;
  speed: number;
  country?: string;
  languages: string[];
  profileImageUrl?: string;
  phoneNumberId?: string;
  cost: number;
  latency: number;
  isActive: boolean;
  metadata: Record<string, any>;
  providerSync?: {
    vapi?: {
      agentId: string;
      lastSync: Date;
      status: 'synced' | 'pending' | 'failed';
    };
    vocode?: {
      agentId: string;
      lastSync: Date;
      status: 'synced' | 'pending' | 'failed';
    };
    elevenlabs?: {
      agentId: string;
      lastSync: Date;
      status: 'synced' | 'pending' | 'failed';
    };
  };
  createdAt: Date;
  updatedAt: Date;
  ragResponse?: string;
  userTags?: string[];
  systemTags?: string[];
  // Call settings
  callRecording?: boolean;
  callRecordingFormat?: string;
  backgroundAmbientSound?: string;
  rememberLeadPreference?: boolean;
  voicemailDetection?: boolean;
  voicemailMessage?: string;
  // Call transfer settings
  enableCallTransfer?: boolean;
  transferPhoneNumber?: string;
  // Keyboard sound settings
  keyboardSound?: boolean;
}

export interface AgentListDto {
  agents: AgentResponseDto[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AgentFiltersDto {
  voiceProvider?: string;
  aiModel?: string;
  gender?: string;
  language?: string;
  search?: string;
  page?: number;
  limit?: number;
}
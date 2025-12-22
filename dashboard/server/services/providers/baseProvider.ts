export interface VoiceConfig {
  provider: string;
  model: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  language?: string;
}

export interface AgentConfig {
  name: string;
  systemPrompt: string;
  voiceId?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  language?: string;
  metadata?: Record<string, any>;
  // Call settings
  callRecording?: boolean;
  callRecordingFormat?: string;
  backgroundAmbientSound?: string;
  rememberLeadPreference?: boolean;
  voicemailDetection?: boolean;
  voicemailMessage?: string;
}

export interface CallConfig {
  agentId: number;
  contactPhone: string;
  systemPrompt?: string;
  maxDuration?: number;
  webhookUrl?: string;
  agentConfig?: AgentConfig;
  // Call transfer settings
  enableCallTransfer?: boolean;
  transferPhoneNumber?: string;
}

export interface CallResult {
  callId: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  duration?: number;
  transcript?: string;
  cost?: number;
  metadata?: Record<string, any>;
}

export interface ProviderMetrics {
  totalCalls: number;
  successRate: number;
  averageDuration: number;
  totalCost: number;
}

export interface ProviderAgent {
  id: string;
  name: string;
  voiceId?: string;
  model: string;
  systemPrompt: string;
  metadata?: Record<string, any>;
}

export abstract class BaseVoiceProvider {
  protected apiKey: string;
  protected baseUrl: string;
  protected providerName: string;

  constructor(apiKey: string, baseUrl: string, providerName: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.providerName = providerName;
  }

  // Core provider methods
  abstract validateConfig(): Promise<boolean>;
  abstract initiateCall(config: CallConfig): Promise<CallResult>;
  abstract getCallStatus(callId: string): Promise<CallResult>;
  abstract getCallTranscript(callId: string): Promise<string>;
  abstract cancelCall(callId: string): Promise<boolean>;
  abstract getMetrics(dateFrom?: Date, dateTo?: Date): Promise<ProviderMetrics>;
  
  // Agent management methods
  abstract createAgent(config: AgentConfig): Promise<ProviderAgent>;
  abstract updateAgent(agentId: string, config: Partial<AgentConfig>): Promise<ProviderAgent>;
  abstract deleteAgent(agentId: string): Promise<boolean>;
  abstract getAgent(agentId: string): Promise<ProviderAgent | null>;
  abstract listAgents(): Promise<ProviderAgent[]>;
  
  // Voice testing
  abstract testVoice(voiceConfig: VoiceConfig, testText: string): Promise<string>;
  abstract getAvailableVoices(): Promise<Array<{ id: string; name: string; language?: string }>>;
  
  // Utility methods
  getProviderName(): string {
    return this.providerName;
  }
  
  protected handleError(error: any, operation: string): never {
    console.error(`${this.providerName} ${operation} failed:`, error);
    throw new Error(`${this.providerName} ${operation} failed: ${error.message || error}`);
  }
}

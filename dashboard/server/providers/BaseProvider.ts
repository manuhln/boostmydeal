import { IAgent } from "../models/Agent";
import { ICall } from "../models/Call";

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  version?: string;
  [key: string]: any;
}

export interface AgentConfig {
  name: string;
  systemPrompt?: string;
  voiceModel: string;
  aiModel: string;
  temperature: number;
  maxTokens: number;
  gender: 'male' | 'female' | 'neutral';
  languages: string[];
  country?: string;
}

export interface CallConfig {
  agentId: string;
  phoneNumber: string;
  customerNumber: string;
  assistantId?: string;
  metadata?: Record<string, any>;
}

export interface CallResult {
  callId: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  cost?: number;
  duration?: number;
  transcript?: string;
  recording?: string;
  metadata?: Record<string, any>;
}

export interface ProviderCapabilities {
  supportsVoiceCloning: boolean;
  supportsRealTimeTranscription: boolean;
  supportsCustomModels: boolean;
  supportedLanguages: string[];
  supportedVoiceModels: string[];
  supportedAIModels: string[];
}

export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected isInitialized: boolean = false;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract get providerName(): string;
  abstract get capabilities(): ProviderCapabilities;

  // Initialization
  abstract initialize(): Promise<void>;
  abstract validateConfig(): Promise<boolean>;

  // Agent Management
  abstract createAgent(agentConfig: AgentConfig): Promise<string>;
  abstract updateAgent(agentId: string, agentConfig: Partial<AgentConfig>): Promise<void>;
  abstract deleteAgent(agentId: string): Promise<void>;
  abstract getAgent(agentId: string): Promise<any>;
  abstract listAgents(): Promise<any[]>;

  // Call Management
  abstract initiateCall(callConfig: CallConfig): Promise<CallResult>;
  abstract getCallStatus(callId: string): Promise<CallResult>;
  abstract endCall(callId: string): Promise<void>;
  abstract getCallTranscript(callId: string): Promise<string>;
  abstract getCallRecording(callId: string): Promise<string>;

  // Health and Status
  abstract healthCheck(): Promise<boolean>;
  abstract getUsage(): Promise<{ calls: number; cost: number; duration: number }>;

  // Webhook handling
  abstract handleWebhook(payload: any, headers: any): Promise<CallResult | null>;

  // Common utility methods
  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(`${this.providerName} provider is not initialized`);
    }
  }

  protected validateApiKey(): void {
    if (!this.config.apiKey) {
      throw new Error(`API key is required for ${this.providerName} provider`);
    }
  }
}
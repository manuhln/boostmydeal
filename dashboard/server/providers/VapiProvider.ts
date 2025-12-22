import { BaseProvider, ProviderConfig, AgentConfig, CallConfig, CallResult, ProviderCapabilities } from './BaseProvider';

export class VapiProvider extends BaseProvider {
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.vapi.ai';
  }

  get providerName(): string {
    return 'VAPI';
  }

  get capabilities(): ProviderCapabilities {
    return {
      supportsVoiceCloning: true,
      supportsRealTimeTranscription: true,
      supportsCustomModels: true,
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'hi', 'ja'],
      supportedVoiceModels: ['11labs', 'openai', 'playht', 'deepgram'],
      supportedAIModels: ['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'claude-2'],
    };
  }

  async initialize(): Promise<void> {
    this.validateApiKey();
    
    try {
      await this.healthCheck();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize VAPI provider: ${error}`);
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/assistant');
      return response.ok;
    } catch (error) {
      console.error('VAPI config validation failed:', error);
      return false;
    }
  }

  async createAgent(agentConfig: AgentConfig): Promise<string> {
    this.ensureInitialized();

    const vapiAgent = {
      name: agentConfig.name,
      model: {
        provider: 'openai',
        model: agentConfig.aiModel || 'gpt-3.5-turbo',
        temperature: agentConfig.temperature || 0.7,
        maxTokens: agentConfig.maxTokens || 500,
        systemMessage: agentConfig.systemPrompt || 'You are a helpful assistant.',
      },
      voice: {
        provider: '11labs',
        voiceId: agentConfig.voiceModel || 'default',
      },
      firstMessage: `Hello! I'm ${agentConfig.name}. How can I help you today?`,
      // Call settings
      voicemailDetection: agentConfig.voicemailDetection !== undefined ? agentConfig.voicemailDetection : true,
      voicemailMessage: agentConfig.voicemailMessage || 'Hello! This is your AI assistant calling. We tried to reach you, but were unable to connect. Please call us back at your earliest convenience. Goodbye!',
      callRecording: agentConfig.callRecording !== undefined ? agentConfig.callRecording : true,
      callRecordingFormat: agentConfig.callRecordingFormat || 'mp3',
      backgroundAmbientSound: agentConfig.backgroundAmbientSound,
      rememberLeadPreference: agentConfig.rememberLeadPreference !== undefined ? agentConfig.rememberLeadPreference : true,
    };

    const response = await this.makeRequest('POST', '/assistant', vapiAgent);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create VAPI agent: ${error}`);
    }

    const result = await response.json();
    return result.id;
  }

  async updateAgent(agentId: string, agentConfig: Partial<AgentConfig>): Promise<void> {
    this.ensureInitialized();

    const updateData: any = {};
    
    if (agentConfig.name) updateData.name = agentConfig.name;
    if (agentConfig.systemPrompt) {
      updateData.model = { ...updateData.model, systemMessage: agentConfig.systemPrompt };
    }

    const response = await this.makeRequest('PATCH', `/assistant/${agentId}`, updateData);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update VAPI agent: ${error}`);
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    this.ensureInitialized();

    const response = await this.makeRequest('DELETE', `/assistant/${agentId}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete VAPI agent: ${error}`);
    }
  }

  async getAgent(agentId: string): Promise<any> {
    this.ensureInitialized();

    const response = await this.makeRequest('GET', `/assistant/${agentId}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get VAPI agent: ${error}`);
    }

    return await response.json();
  }

  async listAgents(): Promise<any[]> {
    this.ensureInitialized();

    const response = await this.makeRequest('GET', '/assistant');
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list VAPI agents: ${error}`);
    }

    return await response.json();
  }

  async initiateCall(callConfig: CallConfig): Promise<CallResult> {
    this.ensureInitialized();

    const callData = {
      assistant: {
        id: callConfig.assistantId || callConfig.agentId,
      },
      phoneCallProvider: 'twilio',
      customer: {
        number: callConfig.customerNumber,
      },
      // Include voicemail settings if available
      ...(callConfig.agentConfig?.voicemailDetection !== undefined && {
        voicemailDetection: callConfig.agentConfig.voicemailDetection,
      }),
      ...(callConfig.agentConfig?.voicemailMessage && {
        voicemailMessage: callConfig.agentConfig.voicemailMessage,
      }),
      ...(callConfig.agentConfig?.callRecording !== undefined && {
        callRecording: callConfig.agentConfig.callRecording,
      }),
      ...(callConfig.agentConfig?.callRecordingFormat && {
        callRecordingFormat: callConfig.agentConfig.callRecordingFormat,
      }),
      ...callConfig.metadata,
    };

    const response = await this.makeRequest('POST', '/call', callData);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to initiate VAPI call: ${error}`);
    }

    const result = await response.json();
    
    return {
      callId: result.id,
      status: this.mapVapiStatusToStandard(result.status),
      metadata: {
        provider: 'vapi',
        originalData: result,
      },
    };
  }

  async getCallStatus(callId: string): Promise<CallResult> {
    this.ensureInitialized();

    const response = await this.makeRequest('GET', `/call/${callId}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get VAPI call status: ${error}`);
    }

    const result = await response.json();
    
    return {
      callId: result.id,
      status: this.mapVapiStatusToStandard(result.status),
      cost: result.cost,
      transcript: result.transcript,
      recording: result.recordingUrl,
      metadata: {
        provider: 'vapi',
        originalData: result,
      },
    };
  }

  async endCall(callId: string): Promise<void> {
    this.ensureInitialized();

    const response = await this.makeRequest('PATCH', `/call/${callId}`, {
      status: 'ended',
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to end VAPI call: ${error}`);
    }
  }

  async getCallTranscript(callId: string): Promise<string> {
    const callStatus = await this.getCallStatus(callId);
    return callStatus.transcript || '';
  }

  async getCallRecording(callId: string): Promise<string> {
    const callStatus = await this.getCallStatus(callId);
    return callStatus.recording || '';
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/assistant?limit=1');
      return response.ok;
    } catch (error) {
      console.error('VAPI health check failed:', error);
      return false;
    }
  }

  async getUsage(): Promise<{ calls: number; cost: number; duration: number }> {
    this.ensureInitialized();

    const response = await this.makeRequest('GET', '/call?limit=100');
    
    if (!response.ok) {
      throw new Error('Failed to get VAPI usage data');
    }

    const calls = await response.json();
    
    return {
      calls: calls.length,
      cost: calls.reduce((sum: number, call: any) => sum + (call.cost || 0), 0),
      duration: calls.reduce((sum: number, call: any) => {
        if (call.startedAt && call.endedAt) {
          const duration = new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime();
          return sum + (duration / 1000);
        }
        return sum;
      }, 0),
    };
  }

  async handleWebhook(payload: any, headers: any): Promise<CallResult | null> {
    if (!payload || !payload.message) {
      return null;
    }

    const { message } = payload;
    
    if (message.type === 'status-update' && message.call) {
      const call = message.call;
      return {
        callId: call.id,
        status: this.mapVapiStatusToStandard(call.status),
        cost: call.cost,
        transcript: call.transcript,
        recording: call.recordingUrl,
        metadata: {
          provider: 'vapi',
          webhookData: payload,
        },
      };
    }

    return null;
  }

  private async makeRequest(method: string, endpoint: string, data?: any): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    return fetch(url, options);
  }

  private mapVapiStatusToStandard(vapiStatus: string): 'initiated' | 'in_progress' | 'completed' | 'failed' {
    const statusMap: Record<string, 'initiated' | 'in_progress' | 'completed' | 'failed'> = {
      'queued': 'initiated',
      'ringing': 'initiated',
      'in-progress': 'in_progress',
      'forwarding': 'in_progress',
      'ended': 'completed',
      'busy': 'failed',
      'failed': 'failed',
      'no-answer': 'failed',
      'canceled': 'failed',
    };

    return statusMap[vapiStatus] || 'failed';
  }
}
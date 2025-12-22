import { BaseVoiceProvider, CallConfig, CallResult, ProviderMetrics, VoiceConfig, AgentConfig, ProviderAgent } from './baseProvider';

export class VapiProvider extends BaseVoiceProvider {
  constructor(apiKey: string) {
    super(apiKey, 'https://api.vapi.ai', 'VAPI');
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/account`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Vapi config validation failed:', error);
      return false;
    }
  }

  async initiateCall(config: CallConfig): Promise<CallResult> {
    try {
      // Create or get the agent in VAPI if agentConfig is provided
      let assistantId = config.agentId.toString();
      if (config.agentConfig) {
        const agent = await this.createAgent(config.agentConfig);
        assistantId = agent.id;
      }

      const response = await fetch(`${this.baseUrl}/call`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: config.contactPhone,
          assistantId: assistantId,
          systemMessage: config.systemPrompt,
          maxDurationSeconds: config.maxDuration || 1800,
          // Call transfer settings
          ...(config.enableCallTransfer && {
            enableCallTransfer: config.enableCallTransfer,
            transferPhoneNumber: config.transferPhoneNumber,
          }),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.handleError(new Error(errorText), 'call initiation');
      }

      const data = await response.json();
      
      return {
        callId: data.id,
        status: this.mapVapiStatus(data.status || 'queued'),
        metadata: data,
      };
    } catch (error) {
      this.handleError(error, 'call initiation');
    }
  }

  async getCallStatus(callId: string): Promise<CallResult> {
    try {
      const response = await fetch(`${this.baseUrl}/call/${callId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get call status: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        callId: data.id,
        status: this.mapVapiStatus(data.status),
        duration: data.duration,
        transcript: data.transcript,
        cost: data.cost,
        metadata: data,
      };
    } catch (error) {
      console.error('Failed to get call status:', error);
      throw error;
    }
  }

  async getCallTranscript(callId: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/call/${callId}/transcript`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get transcript: ${response.statusText}`);
      }

      const data = await response.json();
      return data.transcript || '';
    } catch (error) {
      console.error('Failed to get transcript:', error);
      throw error;
    }
  }

  async cancelCall(callId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/call/${callId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to cancel call:', error);
      return false;
    }
  }

  async getMetrics(dateFrom?: Date, dateTo?: Date): Promise<ProviderMetrics> {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
      if (dateTo) params.append('dateTo', dateTo.toISOString());

      const response = await fetch(`${this.baseUrl}/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get metrics: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        totalCalls: data.totalCalls || 0,
        successRate: data.successRate || 0,
        averageDuration: data.averageDuration || 0,
        totalCost: data.totalCost || 0,
      };
    } catch (error) {
      console.error('Failed to get metrics:', error);
      return {
        totalCalls: 0,
        successRate: 0,
        averageDuration: 0,
        totalCost: 0,
      };
    }
  }

  async testVoice(voiceConfig: VoiceConfig, testText: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/voice/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice: voiceConfig.voice,
          text: testText,
          speed: voiceConfig.speed || 1.0,
          pitch: voiceConfig.pitch || 1.0,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to test voice: ${response.statusText}`);
      }

      const data = await response.json();
      return data.audioUrl || '';
    } catch (error) {
      console.error('Failed to test voice:', error);
      throw error;
    }
  }

  // Agent management methods
  async createAgent(config: AgentConfig): Promise<ProviderAgent> {
    try {
      const response = await fetch(`${this.baseUrl}/assistant`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: config.name,
          systemMessage: config.systemPrompt,
          model: {
            provider: 'openai',
            model: config.model || 'gpt-3.5-turbo',
            temperature: config.temperature || 0.7,
            maxTokens: config.maxTokens || 150,
          },
          voice: {
            provider: 'elevenlabs',
            voiceId: config.voiceId || 'burt',
          },
          firstMessage: `Hello! This is ${config.name}. How can I help you today?`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.handleError(new Error(errorText), 'agent creation');
      }

      const data = await response.json();
      
      return {
        id: data.id,
        name: data.name,
        voiceId: data.voice?.voiceId,
        model: data.model?.model,
        systemPrompt: data.systemMessage,
        metadata: data,
      };
    } catch (error) {
      this.handleError(error, 'agent creation');
    }
  }

  async updateAgent(agentId: string, config: Partial<AgentConfig>): Promise<ProviderAgent> {
    try {
      const response = await fetch(`${this.baseUrl}/assistant/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(config.name && { name: config.name }),
          ...(config.systemPrompt && { systemMessage: config.systemPrompt }),
          ...(config.model && {
            model: {
              provider: 'openai',
              model: config.model,
              temperature: config.temperature || 0.7,
              maxTokens: config.maxTokens || 150,
            }
          }),
          ...(config.voiceId && {
            voice: {
              provider: 'elevenlabs',
              voiceId: config.voiceId,
            }
          }),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.handleError(new Error(errorText), 'agent update');
      }

      const data = await response.json();
      
      return {
        id: data.id,
        name: data.name,
        voiceId: data.voice?.voiceId,
        model: data.model?.model,
        systemPrompt: data.systemMessage,
        metadata: data,
      };
    } catch (error) {
      this.handleError(error, 'agent update');
    }
  }

  async deleteAgent(agentId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/assistant/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to delete agent:', error);
      return false;
    }
  }

  async getAgent(agentId: string): Promise<ProviderAgent | null> {
    try {
      const response = await fetch(`${this.baseUrl}/assistant/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      return {
        id: data.id,
        name: data.name,
        voiceId: data.voice?.voiceId,
        model: data.model?.model,
        systemPrompt: data.systemMessage,
        metadata: data,
      };
    } catch (error) {
      console.error('Failed to get agent:', error);
      return null;
    }
  }

  async listAgents(): Promise<ProviderAgent[]> {
    try {
      const response = await fetch(`${this.baseUrl}/assistant`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        this.handleError(new Error('Failed to list agents'), 'agent listing');
      }

      const data = await response.json();
      
      return data.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        voiceId: agent.voice?.voiceId,
        model: agent.model?.model,
        systemPrompt: agent.systemMessage,
        metadata: agent,
      }));
    } catch (error) {
      this.handleError(error, 'agent listing');
    }
  }

  async getAvailableVoices(): Promise<Array<{ id: string; name: string; language?: string }>> {
    // VAPI uses ElevenLabs voices, return common ones
    return [
      { id: 'burt', name: 'Burt', language: 'en' },
      { id: 'sarah', name: 'Sarah', language: 'en' },
      { id: 'mark', name: 'Mark', language: 'en' },
      { id: 'emily', name: 'Emily', language: 'en' },
    ];
  }

  private mapVapiStatus(vapiStatus: string): CallResult['status'] {
    switch (vapiStatus) {
      case 'queued':
      case 'ringing':
        return 'initiated';
      case 'in-progress':
        return 'in_progress';
      case 'completed':
        return 'completed';
      case 'failed':
      case 'busy':
      case 'no-answer':
        return 'failed';
      default:
        return 'failed';
    }
  }
}

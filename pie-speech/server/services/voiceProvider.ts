import { BaseVoiceProvider } from './providers/baseProvider';
import { VapiProvider } from './providers/vapiProvider';

export type ProviderType = 'vapi' | 'elevenlabs' | 'openai' | 'azure' | 'streamelements';

export interface ProviderInfo {
  name: string;
  type: ProviderType;
  isConfigured: boolean;
  isValidated: boolean;
}

export class VoiceProviderFactory {
  private static providers: Map<ProviderType, BaseVoiceProvider> = new Map();
  private static validationCache: Map<ProviderType, boolean> = new Map();

  static getProvider(type: ProviderType): BaseVoiceProvider {
    if (!this.providers.has(type)) {
      this.providers.set(type, this.createProvider(type));
    }
    return this.providers.get(type)!;
  }

  static getProviderForAgent(agentConfig: any): BaseVoiceProvider {
    // Determine provider based on agent configuration
    const providerType = agentConfig.voiceProvider || 'vapi';
    return this.getProvider(providerType as ProviderType);
  }

  private static createProvider(type: ProviderType): BaseVoiceProvider {
    switch (type) {
      case 'vapi':
        const vapiKey = process.env.VAPI_API_KEY || process.env.VAPI_PRIVATE_KEY || '';
        if (!vapiKey) {
          throw new Error('VAPI_API_KEY environment variable is required');
        }
        return new VapiProvider(vapiKey);
      
      case 'elevenlabs':
        const elevenLabsKey = process.env.ELEVENLABS_API_KEY || '';
        if (!elevenLabsKey) {
          throw new Error('ELEVENLABS_API_KEY environment variable is required');
        }
        // TODO: Implement ElevenLabsProvider
        throw new Error('ElevenLabs provider not yet implemented');
      
      case 'openai':
        const openaiKey = process.env.OPENAI_API_KEY || '';
        if (!openaiKey) {
          throw new Error('OPENAI_API_KEY environment variable is required');
        }
        // TODO: Implement OpenAIProvider
        throw new Error('OpenAI provider not yet implemented');
      
      case 'azure':
        const azureKey = process.env.AZURE_SPEECH_KEY || '';
        if (!azureKey) {
          throw new Error('AZURE_SPEECH_KEY environment variable is required');
        }
        // TODO: Implement AzureProvider
        throw new Error('Azure provider not yet implemented');
      
      case 'streamelements':
        // Stream Elements doesn't require API key for voice listing
        // Return a mock provider that validates with StreamElementsService
        return {
          validateConfig: async () => {
            const { StreamElementsService } = await import('./StreamElementsService');
            const service = new StreamElementsService();
            return await service.validateConfig();
          }
        } as BaseVoiceProvider;
      
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  }

  static async validateProvider(type: ProviderType): Promise<boolean> {
    try {
      // Check cache first
      if (this.validationCache.has(type)) {
        return this.validationCache.get(type)!;
      }

      const provider = this.getProvider(type);
      const isValid = await provider.validateConfig();
      
      // Cache the result for 5 minutes
      this.validationCache.set(type, isValid);
      setTimeout(() => this.validationCache.delete(type), 5 * 60 * 1000);
      
      return isValid;
    } catch (error) {
      console.error(`Provider validation failed for ${type}:`, error);
      this.validationCache.set(type, false);
      return false;
    }
  }

  static getSupportedProviders(): ProviderType[] {
    return ['vapi', 'streamelements']; // VAPI and StreamElements are implemented
  }

  static async getProviderInfo(): Promise<ProviderInfo[]> {
    const providers: ProviderInfo[] = [
      {
        name: 'VAPI',
        type: 'vapi',
        isConfigured: !!process.env.VAPI_API_KEY || !!process.env.VAPI_PRIVATE_KEY,
        isValidated: false,
      },
      {
        name: 'ElevenLabs',
        type: 'elevenlabs',
        isConfigured: !!process.env.ELEVENLABS_API_KEY,
        isValidated: false,
      },
      {
        name: 'OpenAI',
        type: 'openai',
        isConfigured: !!process.env.OPENAI_API_KEY,
        isValidated: false,
      },
      {
        name: 'Azure Speech',
        type: 'azure',
        isConfigured: !!process.env.AZURE_SPEECH_KEY,
        isValidated: false,
      },
      {
        name: 'Stream Elements',
        type: 'streamelements',
        isConfigured: true, // Stream Elements doesn't require API key
        isValidated: false,
      },
    ];

    // Validate configured providers
    for (const provider of providers) {
      if (provider.isConfigured && (provider.type === 'vapi' || provider.type === 'streamelements')) {
        try {
          provider.isValidated = await this.validateProvider(provider.type);
        } catch (error) {
          provider.isValidated = false;
        }
      }
    }

    return providers;
  }

  static clearValidationCache(): void {
    this.validationCache.clear();
  }
}

import { BaseProvider, ProviderConfig } from './BaseProvider';
import { VapiProvider } from './VapiProvider';

export type ProviderType = 'vapi' | 'vocode' | 'elevenlabs' | 'openai' | 'azure';

export interface ProviderInfo {
  name: string;
  type: ProviderType;
  isConfigured: boolean;
  isValidated: boolean;
  capabilities?: any;
  lastValidated?: Date;
}

export class ProviderFactory {
  private static instance: ProviderFactory;
  private providers: Map<ProviderType, BaseProvider> = new Map();
  private validationCache: Map<ProviderType, { isValid: boolean; timestamp: Date }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): ProviderFactory {
    if (!ProviderFactory.instance) {
      ProviderFactory.instance = new ProviderFactory();
    }
    return ProviderFactory.instance;
  }

  /**
   * Get or create a provider instance
   */
  async getProvider(type: ProviderType, config?: ProviderConfig): Promise<BaseProvider> {
    if (!this.providers.has(type)) {
      const provider = this.createProvider(type, config || this.getDefaultConfig(type));
      await provider.initialize();
      this.providers.set(type, provider);
    }
    return this.providers.get(type)!;
  }

  /**
   * Create a new provider instance without caching
   */
  private createProvider(type: ProviderType, config: ProviderConfig): BaseProvider {
    switch (type) {
      case 'vapi':
        return new VapiProvider(config);
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  }

  /**
   * Get default configuration for a provider
   */
  private getDefaultConfig(type: ProviderType): ProviderConfig {
    const configs: Record<ProviderType, ProviderConfig> = {
      vapi: {
        apiKey: process.env.VAPI_API_KEY || '',
        baseUrl: 'https://api.vapi.ai',
      },
      vocode: {
        apiKey: process.env.VOCODE_API_KEY || '',
        baseUrl: 'https://api.vocode.dev',
      },
      elevenlabs: {
        apiKey: process.env.ELEVENLABS_API_KEY || '',
        baseUrl: 'https://api.elevenlabs.io',
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: 'https://api.openai.com',
      },
      azure: {
        apiKey: process.env.AZURE_SPEECH_KEY || '',
        baseUrl: process.env.AZURE_SPEECH_ENDPOINT || '',
      },
    };

    return configs[type];
  }

  /**
   * Validate a provider with caching
   */
  async validateProvider(type: ProviderType): Promise<boolean> {
    const cached = this.validationCache.get(type);
    const now = new Date();

    // Return cached result if still valid
    if (cached && (now.getTime() - cached.timestamp.getTime()) < this.CACHE_TTL) {
      return cached.isValid;
    }

    try {
      const provider = await this.getProvider(type);
      const isValid = await provider.validateConfig();
      
      // Cache the result
      this.validationCache.set(type, { isValid, timestamp: now });
      
      return isValid;
    } catch (error) {
      console.error(`Error validating ${type} provider:`, error);
      this.validationCache.set(type, { isValid: false, timestamp: now });
      return false;
    }
  }

  /**
   * Get information about all supported providers
   */
  async getProviderInfo(): Promise<ProviderInfo[]> {
    const providers: ProviderType[] = ['vapi'];
    const info: ProviderInfo[] = [];

    for (const type of providers) {
      try {
        const config = this.getDefaultConfig(type);
        const isConfigured = !!config.apiKey;
        const isValidated = isConfigured ? await this.validateProvider(type) : false;
        
        let capabilities;
        if (isValidated) {
          const provider = await this.getProvider(type);
          capabilities = provider.capabilities;
        }

        info.push({
          name: this.getProviderDisplayName(type),
          type,
          isConfigured,
          isValidated,
          capabilities,
          lastValidated: this.validationCache.get(type)?.timestamp,
        });
      } catch (error) {
        console.error(`Error getting info for ${type} provider:`, error);
        info.push({
          name: this.getProviderDisplayName(type),
          type,
          isConfigured: false,
          isValidated: false,
        });
      }
    }

    return info;
  }

  /**
   * Get display name for a provider type
   */
  private getProviderDisplayName(type: ProviderType): string {
    const names: Record<ProviderType, string> = {
      vapi: 'VAPI',
      vocode: 'Vocode',
      elevenlabs: 'ElevenLabs',
      openai: 'OpenAI',
      azure: 'Azure Speech',
    };
    return names[type];
  }

  /**
   * Get supported provider types
   */
  getSupportedProviders(): ProviderType[] {
    return ['vapi'];
  }

  /**
   * Clear validation cache
   */
  clearValidationCache(): void {
    this.validationCache.clear();
  }

  /**
   * Remove a provider from cache (useful for config updates)
   */
  removeProvider(type: ProviderType): void {
    this.providers.delete(type);
    this.validationCache.delete(type);
  }

  /**
   * Get the best available provider for a specific capability
   */
  async getBestProviderForCapability(capability: string): Promise<BaseProvider | null> {
    const providers = this.getSupportedProviders();
    
    for (const type of providers) {
      try {
        const isValid = await this.validateProvider(type);
        if (isValid) {
          const provider = await this.getProvider(type);
          return provider;
        }
      } catch (error) {
        console.error(`Error checking provider ${type}:`, error);
      }
    }
    
    return null;
  }
}

// Export singleton instance
export const providerFactory = ProviderFactory.getInstance();
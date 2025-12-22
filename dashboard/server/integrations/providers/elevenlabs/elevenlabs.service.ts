import { IntegrationConfig } from '../../common/integration-config.model';

export interface ElevenLabsVoiceCloneConfig {
  apiKey: string;
  voiceName: string;
  voiceDescription?: string;
}

export interface ClonedVoice {
  voice_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export class ElevenLabsIntegrationService {
  private static readonly BASE_URL = 'https://api.elevenlabs.io/v1';

  /**
   * Save ElevenLabs integration configuration
   */
  static async saveConfig(
    userId: string,
    organizationId: string,
    name: string,
    config: ElevenLabsVoiceCloneConfig
  ): Promise<any> {
    try {
      // Decode the API key if it's base64 encoded
      let apiKey = config.apiKey;
      if (apiKey && apiKey.startsWith('encoded_')) {
        apiKey = Buffer.from(apiKey.replace('encoded_', ''), 'base64').toString('utf-8');
      }
      
      const decodedConfig = {
        ...config,
        apiKey
      };

      // Validate configuration by testing API key
      const isValid = await this.testConfig(decodedConfig);
      if (!isValid) {
        throw new Error('Invalid ElevenLabs API key');
      }

      const integrationConfig = new IntegrationConfig({
        userId,
        organizationId,
        type: 'ELEVENLABS',
        name,
        config: JSON.stringify({
          apiKey: apiKey, // Use decoded API key
          voiceName: config.voiceName,
          voiceDescription: config.voiceDescription || '',
          clonedVoices: [] // Store cloned voice IDs here
        }),
        isActive: true
      });

      await integrationConfig.save();
      return integrationConfig;
    } catch (error) {
      throw new Error(`Failed to save ElevenLabs integration: ${(error as Error).message}`);
    }
  }

  /**
   * Test ElevenLabs configuration
   */
  static async testConfig(config: ElevenLabsVoiceCloneConfig): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/user`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': config.apiKey,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('ElevenLabs config test failed:', error);
      return false;
    }
  }

  /**
   * Clone a voice using uploaded audio file
   */
  static async cloneVoice(
    userId: string,
    organizationId: string,
    configId: string,
    audioFile: Buffer,
    fileName: string,
    voiceName: string,
    voiceDescription?: string
  ): Promise<ClonedVoice> {
    try {
      // Get integration config
      const integrationConfig = await IntegrationConfig.findOne({
        _id: configId,
        userId,
        organizationId,
        type: 'ELEVENLABS',
        isActive: true
      });

      if (!integrationConfig) {
        throw new Error('ElevenLabs integration not found');
      }

      const config = JSON.parse(integrationConfig.config);
      const { apiKey } = config;

      // Create FormData for voice cloning
      const formData = new FormData();
      
      // Create a Blob from the buffer
      const audioBlob = new Blob([audioFile], { type: 'audio/mpeg' });
      formData.append('files', audioBlob, fileName);
      formData.append('name', voiceName);
      
      if (voiceDescription) {
        formData.append('description', voiceDescription);
      }

      // Clone voice via ElevenLabs API using their voice cloning endpoint
      const response = await fetch(`${this.BASE_URL}/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorData.detail || response.statusText}`);
      }

      const clonedVoice = await response.json();

      // Update integration config with new cloned voice
      const updatedClonedVoices = config.clonedVoices || [];
      updatedClonedVoices.push({
        voice_id: clonedVoice.voice_id,
        name: voiceName,
        description: voiceDescription || '',
        created_at: new Date().toISOString()
      });

      const updatedConfig = {
        ...config,
        clonedVoices: updatedClonedVoices
      };

      await IntegrationConfig.findByIdAndUpdate(configId, {
        config: JSON.stringify(updatedConfig)
      });

      return {
        voice_id: clonedVoice.voice_id,
        name: voiceName,
        description: voiceDescription || '',
        created_at: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to clone voice: ${(error as Error).message}`);
    }
  }

  /**
   * Get all cloned voices for a user's ElevenLabs integration
   */
  static async getClonedVoices(
    userId: string,
    organizationId: string,
    configId: string
  ): Promise<ClonedVoice[]> {
    try {
      const integrationConfig = await IntegrationConfig.findOne({
        _id: configId,
        userId,
        organizationId,
        type: 'ELEVENLABS',
        isActive: true
      });

      if (!integrationConfig) {
        throw new Error('ElevenLabs integration not found');
      }

      const config = JSON.parse(integrationConfig.config);
      return config.clonedVoices || [];
    } catch (error) {
      throw new Error(`Failed to get cloned voices: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a cloned voice
   */
  static async deleteClonedVoice(
    userId: string,
    organizationId: string,
    configId: string,
    voiceId: string
  ): Promise<boolean> {
    try {
      const integrationConfig = await IntegrationConfig.findOne({
        _id: configId,
        userId,
        organizationId,
        type: 'ELEVENLABS',
        isActive: true
      });

      if (!integrationConfig) {
        throw new Error('ElevenLabs integration not found');
      }

      const config = JSON.parse(integrationConfig.config);
      const { apiKey } = config;

      // Delete voice from ElevenLabs
      const response = await fetch(`${this.BASE_URL}/voices/${voiceId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete voice from ElevenLabs: ${response.statusText}`);
      }

      // Remove from local config
      const updatedClonedVoices = (config.clonedVoices || [])
        .filter((voice: ClonedVoice) => voice.voice_id !== voiceId);

      const updatedConfig = {
        ...config,
        clonedVoices: updatedClonedVoices
      };

      await IntegrationConfig.findByIdAndUpdate(configId, {
        config: JSON.stringify(updatedConfig)
      });

      return true;
    } catch (error) {
      throw new Error(`Failed to delete cloned voice: ${(error as Error).message}`);
    }
  }
}
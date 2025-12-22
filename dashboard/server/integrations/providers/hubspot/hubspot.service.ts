import { HubSpotIntegration, HubSpotConfig, HubSpotActionPayload } from './hubspot.integration';
import { IntegrationConfig } from '../../common/integration-config.model';
import { encrypt, decrypt } from '../../common/encryption.util';

export class HubSpotService {
  /**
   * Save HubSpot configuration for a user
   */
  static async saveConfig(
    userId: string, 
    organizationId: string, 
    name: string, 
    config: HubSpotConfig
  ): Promise<any> {
    try {
      // Encrypt the configuration
      const encryptedConfig = encrypt(JSON.stringify(config));

      // Check if config already exists for this user and type (including inactive ones)
      const existingConfig = await IntegrationConfig.findOne({
        userId,
        organizationId,
        type: 'HUBSPOT',
        name
      });

      if (existingConfig) {
        // Update existing configuration and reactivate if it was deleted
        existingConfig.config = encryptedConfig;
        existingConfig.isActive = true;
        existingConfig.updatedAt = new Date();
        await existingConfig.save();
        return existingConfig;
      } else {
        // Create new configuration
        const newConfig = new IntegrationConfig({
          userId,
          organizationId,
          type: 'HUBSPOT',
          name,
          config: encryptedConfig,
        });

        await newConfig.save();
        return newConfig;
      }
    } catch (error) {
      throw new Error(`Failed to save HubSpot config: ${error.message}`);
    }
  }

  /**
   * Get HubSpot configuration for a user
   */
  static async getConfig(userId: string, organizationId: string, configId?: string): Promise<HubSpotConfig | null> {
    try {
      let query: any = {
        userId,
        organizationId,
        type: 'HUBSPOT',
        isActive: true
      };

      if (configId) {
        query._id = configId;
      }

      const integrationConfig = await IntegrationConfig.findOne(query);

      if (!integrationConfig) {
        return null;
      }

      // Decrypt the configuration
      const decryptedConfig = decrypt(integrationConfig.config);
      return JSON.parse(decryptedConfig) as HubSpotConfig;
    } catch (error) {
      throw new Error(`Failed to get HubSpot config: ${error.message}`);
    }
  }

  /**
   * Get all HubSpot configurations for a user
   */
  static async getAllConfigs(userId: string, organizationId: string): Promise<any[]> {
    try {
      const configs = await IntegrationConfig.find({
        userId,
        organizationId,
        type: 'HUBSPOT',
        isActive: true
      }).select('_id name type createdAt updatedAt');

      return configs;
    } catch (error) {
      throw new Error(`Failed to get HubSpot configs: ${error.message}`);
    }
  }

  /**
   * Test HubSpot configuration
   */
  static async testConfig(config: HubSpotConfig): Promise<boolean> {
    try {
      // Decode API key if it was encoded for transport
      const decodedConfig = {
        ...config,
        apiKey: this.decodeApiKey(config.apiKey)
      };
      
      const hubspotIntegration = new HubSpotIntegration(decodedConfig);
      return await hubspotIntegration.testConnection();
    } catch (error) {
      console.error('HubSpot test config error:', error.message);
      return false;
    }
  }

  private static decodeApiKey(apiKey: string): string {
    if (apiKey.startsWith('encoded_')) {
      try {
        return Buffer.from(apiKey.substring(8), 'base64').toString('utf8');
      } catch (error) {
        console.error('Failed to decode API key:', error);
        return apiKey;
      }
    }
    return apiKey;
  }

  /**
   * Perform HubSpot action using stored configuration
   */
  static async performAction(
    userId: string, 
    organizationId: string, 
    configId: string, 
    payload: HubSpotActionPayload
  ): Promise<any> {
    try {
      const config = await this.getConfig(userId, organizationId, configId);
      
      if (!config) {
        throw new Error('HubSpot configuration not found');
      }

      const hubspotIntegration = new HubSpotIntegration(config);
      await hubspotIntegration.connect();
      
      const result = await hubspotIntegration.performAction(payload);
      
      await hubspotIntegration.disconnect();
      
      return result;
    } catch (error) {
      throw new Error(`Failed to perform HubSpot action: ${error.message}`);
    }
  }

  /**
   * Create contact using stored configuration
   */
  static async createContact(
    userId: string, 
    organizationId: string, 
    configId: string, 
    contactData: any
  ): Promise<any> {
    return await this.performAction(userId, organizationId, configId, {
      action: 'create_contact',
      data: contactData
    });
  }

  /**
   * Create deal using stored configuration
   */
  static async createDeal(
    userId: string, 
    organizationId: string, 
    configId: string, 
    dealData: any
  ): Promise<any> {
    return await this.performAction(userId, organizationId, configId, {
      action: 'create_deal',
      data: dealData
    });
  }

  /**
   * Get a deal by ID
   */
  static async getDeal(
    userId: string, 
    organizationId: string, 
    configId: string, 
    dealId: string
  ): Promise<any> {
    return await this.performAction(userId, organizationId, configId, {
      action: 'get_deal',
      data: { dealId }
    });
  }

  /**
   * Update a deal by ID
   */
  static async searchDealsByName(
    userId: string, 
    organizationId: string, 
    configId: string, 
    dealName: string
  ): Promise<any[]> {
    return await this.performAction(userId, organizationId, configId, {
      action: 'search_deals',
      data: { dealName }
    });
  }

  static async updateDeal(
    userId: string, 
    organizationId: string, 
    configId: string, 
    dealId: string,
    properties: Record<string, any>
  ): Promise<any> {
    return await this.performAction(userId, organizationId, configId, {
      action: 'update_deal',
      data: { dealId, properties }
    });
  }

  /**
   * Create company using stored configuration
   */
  static async createCompany(
    userId: string, 
    organizationId: string, 
    configId: string, 
    companyData: any
  ): Promise<any> {
    return await this.performAction(userId, organizationId, configId, {
      action: 'create_company',
      data: companyData
    });
  }

  /**
   * Delete HubSpot configuration
   */
  static async deleteConfig(userId: string, organizationId: string, configId: string): Promise<boolean> {
    try {
      const result = await IntegrationConfig.findOneAndUpdate(
        {
          _id: configId,
          userId,
          organizationId,
          type: 'HUBSPOT'
        },
        { isActive: false },
        { new: true }
      );

      return !!result;
    } catch (error) {
      throw new Error(`Failed to delete HubSpot config: ${error.message}`);
    }
  }
}
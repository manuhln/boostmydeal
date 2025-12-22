import { SmtpIntegration, SMTPConfig, EmailPayload } from './smtp.integration';
import { IntegrationConfig } from '../../common/integration-config.model';
import { encrypt, decrypt } from '../../common/encryption.util';

export class SmtpService {
  /**
   * Save SMTP configuration for a user
   */
  static async saveConfig(
    userId: string, 
    organizationId: string, 
    name: string, 
    config: SMTPConfig
  ): Promise<any> {
    try {
      // Encrypt the configuration
      const encryptedConfig = encrypt(JSON.stringify(config));

      // Check if config already exists for this user and type (including inactive ones)
      const existingConfig = await IntegrationConfig.findOne({
        userId,
        organizationId,
        type: 'SMTP',
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
          type: 'SMTP',
          name,
          config: encryptedConfig,
        });

        await newConfig.save();
        return newConfig;
      }
    } catch (error) {
      throw new Error(`Failed to save SMTP config: ${error.message}`);
    }
  }

  /**
   * Get SMTP configuration for a user
   */
  static async getConfig(userId: string, organizationId: string, configId?: string): Promise<SMTPConfig | null> {
    try {
      let query: any = {
        userId,
        organizationId,
        type: 'SMTP',
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
      return JSON.parse(decryptedConfig) as SMTPConfig;
    } catch (error) {
      throw new Error(`Failed to get SMTP config: ${error.message}`);
    }
  }

  /**
   * Get all SMTP configurations for a user
   */
  static async getAllConfigs(userId: string, organizationId: string): Promise<any[]> {
    try {
      const configs = await IntegrationConfig.find({
        userId,
        organizationId,
        type: 'SMTP',
        isActive: true
      }).select('_id name type createdAt updatedAt');

      return configs;
    } catch (error) {
      throw new Error(`Failed to get SMTP configs: ${error.message}`);
    }
  }

  /**
   * Test SMTP configuration
   */
  static async testConfig(config: SMTPConfig): Promise<boolean> {
    try {
      const smtpIntegration = new SmtpIntegration(config);
      return await smtpIntegration.testConnection();
    } catch (error) {
      console.error('SMTP test config error:', error.message);
      return false;
    }
  }

  /**
   * Send email using stored configuration
   */
  static async sendEmail(
    userId: string, 
    organizationId: string, 
    configId: string, 
    payload: EmailPayload
  ): Promise<any> {
    try {
      const config = await this.getConfig(userId, organizationId, configId);
      
      if (!config) {
        throw new Error('SMTP configuration not found');
      }

      const smtpIntegration = new SmtpIntegration(config);
      await smtpIntegration.connect();
      
      const result = await smtpIntegration.performAction(payload);
      
      await smtpIntegration.disconnect();
      
      return result;
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Delete SMTP configuration
   */
  static async deleteConfig(userId: string, organizationId: string, configId: string): Promise<boolean> {
    try {
      const result = await IntegrationConfig.findOneAndUpdate(
        {
          _id: configId,
          userId,
          organizationId,
          type: 'SMTP'
        },
        { isActive: false },
        { new: true }
      );

      return !!result;
    } catch (error) {
      throw new Error(`Failed to delete SMTP config: ${error.message}`);
    }
  }
}
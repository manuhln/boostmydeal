import { IntegrationConfig } from '../../common/integration-config.model';
import { encrypt, decrypt } from '../../common/encryption.util';
import { Call } from '../../../models/Call';

export interface WebhookConfig {
  username: string;
  password: string;
}

export class WebhookService {
  /**
   * Save webhook configuration
   */
  static async saveConfig(
    userId: string,
    organizationId: string,
    name: string,
    config: WebhookConfig
  ): Promise<any> {
    try {
      // Validate the configuration
      const validation = await WebhookService.testConfig(config);
      if (!validation) {
        throw new Error('Invalid webhook configuration');
      }

      // Decrypt the encoded credentials from frontend
      const decodedUsername = config.username.startsWith('encoded_') 
        ? Buffer.from(config.username.replace('encoded_', ''), 'base64').toString('ascii')
        : config.username;
      
      const decodedPassword = config.password.startsWith('encoded_') 
        ? Buffer.from(config.password.replace('encoded_', ''), 'base64').toString('ascii')
        : config.password;

      // Store the actual credentials
      const webhookConfig = {
        username: decodedUsername,
        password: decodedPassword
      };

      // Encrypt the configuration before storing
      const encryptedConfig = encrypt(JSON.stringify(webhookConfig));

      // Save to database
      const integrationConfig = new IntegrationConfig({
        userId,
        organizationId,
        type: 'WEBHOOK',
        name,
        config: encryptedConfig,
        isActive: true
      });

      await integrationConfig.save();

      return {
        id: integrationConfig._id,
        name: integrationConfig.name,
        type: integrationConfig.type,
        createdAt: integrationConfig.createdAt
      };

    } catch (error) {
      console.error('[WebhookService] Error saving config:', error);
      throw new Error(`Failed to save webhook configuration: ${(error as Error).message}`);
    }
  }

  /**
   * Test webhook configuration
   */
  static async testConfig(config: WebhookConfig): Promise<boolean> {
    try {
      // Decode credentials if they were encoded from frontend
      const username = config.username.startsWith('encoded_') 
        ? Buffer.from(config.username.replace('encoded_', ''), 'base64').toString('ascii')
        : config.username;
      
      const password = config.password.startsWith('encoded_') 
        ? Buffer.from(config.password.replace('encoded_', ''), 'base64').toString('ascii')
        : config.password;

      // Validate that both username and password are provided
      if (!username || !password) {
        return false;
      }

      // Basic validation for username (should be alphanumeric including special chars for emails)
      if (!/^[a-zA-Z0-9_@.-]+$/.test(username)) {
        console.log('[WebhookService] Username validation failed for:', username);
        return false;
      }

      // Basic validation for password (minimum 6 characters)
      if (password.length < 6) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('[WebhookService] Error testing config:', error);
      return false;
    }
  }

  /**
   * Validate webhook Basic Auth credentials
   */
  static async validateWebhookAuth(username: string, password: string): Promise<boolean> {
    try {
      console.log('[WebhookService] Validating credentials for username:', username);
      
      // Find all webhook integration configs
      const webhookConfigs = await IntegrationConfig.find({
        type: 'WEBHOOK',
        isActive: true
      });

      console.log('[WebhookService] Found', webhookConfigs.length, 'webhook configurations');

      if (webhookConfigs.length === 0) {
        console.log('[WebhookService] No active webhook configurations found');
        return false;
      }

      // Check each webhook config to find matching credentials
      for (const webhookConfig of webhookConfigs) {
        try {
          // Decrypt the config to get stored credentials
          const decryptedConfig = decrypt(webhookConfig.config);
          const configData = JSON.parse(decryptedConfig);

          console.log('[WebhookService] Checking config for user:', webhookConfig.userId, 'stored username:', configData.username);

          // Check if username and password match
          if (configData.username === username && configData.password === password) {
            console.log('[WebhookService] Credentials match found!');
            return true;
          }
        } catch (configError) {
          console.error('[WebhookService] Error decrypting config:', configError);
          continue;
        }
      }

      console.log('[WebhookService] No matching credentials found');
      return false;
    } catch (error) {
      console.error('[WebhookService] Error validating webhook auth:', error);
      return false;
    }
  }

  /**
   * Get organization ID for webhook user
   */
  static async getOrganizationForWebhook(username: string): Promise<string | null> {
    try {
      // Find all webhook integration configs
      const webhookConfigs = await IntegrationConfig.find({
        type: 'WEBHOOK',
        isActive: true
      });

      if (webhookConfigs.length === 0) {
        return null;
      }

      // Find the config with matching username
      for (const webhookConfig of webhookConfigs) {
        try {
          const decryptedConfig = decrypt(webhookConfig.config);
          const configData = JSON.parse(decryptedConfig);

          if (configData.username === username) {
            return webhookConfig.organizationId;
          }
        } catch (configError) {
          console.error('[WebhookService] Error decrypting config:', configError);
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('[WebhookService] Error getting organization for webhook:', error);
      return null;
    }
  }

  /**
   * Get call data with filters and pagination
   */
  static async getCallData(params: {
    organizationId: string;
    filters: any;
    limit: number;
    offset: number;
  }): Promise<{ calls: any[]; total: number }> {
    try {
      const { organizationId, filters, limit, offset } = params;

      // Build MongoDB query
      const query: any = { organizationId };

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.agentId) {
        query.assistantId = filters.agentId.toString();
      }

      if (filters.dateRange) {
        query.createdAt = {};
        if (filters.dateRange.start) {
          query.createdAt.$gte = filters.dateRange.start;
        }
        if (filters.dateRange.end) {
          query.createdAt.$lte = filters.dateRange.end;
        }
      }

      // Get total count
      const total = await Call.countDocuments(query);

      // Get calls with pagination
      const calls = await Call.find(query)
        .populate('assistantId', 'name description')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      // Transform call data for external consumption
      const transformedCalls = calls.map(call => ({
        id: call._id,
        assistantId: call.assistantId,
        agent: call.assistantId ? {
          id: (call.assistantId as any)._id,
          name: (call.assistantId as any).name,
          description: (call.assistantId as any).description
        } : null,
        contactName: call.contactName,
        contactPhone: call.contactPhone,
        callType: call.callType,
        duration: call.duration,
        status: call.status,
        transcript: call.transcript,
        cost: call.cost ? parseFloat(call.cost.toString()) : null,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
        createdAt: call.createdAt,
        webhookPayload: call.webhookPayload || []
      }));

      return {
        calls: transformedCalls,
        total
      };

    } catch (error) {
      console.error('[WebhookService] Error getting call data:', error);
      throw error;
    }
  }
}
import { IntegrationProvider } from '../../common/integration.interface';

export interface WebhookConfig {
  username: string;
  password: string;
}

export class WebhookIntegration implements IntegrationProvider<WebhookConfig> {
  type = 'WEBHOOK' as const;

  async validate(config: WebhookConfig): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Validate that both username and password are provided
      if (!config.username || !config.password) {
        return { isValid: false, error: 'Both username and password are required' };
      }

      // Basic validation for username (should be alphanumeric)
      if (!/^[a-zA-Z0-9_]+$/.test(config.username)) {
        return { isValid: false, error: 'Username must contain only letters, numbers, and underscores' };
      }

      // Basic validation for password (minimum 6 characters)
      if (config.password.length < 6) {
        return { isValid: false, error: 'Password must be at least 6 characters long' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Failed to validate webhook configuration' };
    }
  }

  async execute(config: WebhookConfig, action: string, data?: any): Promise<any> {
    // Webhook integrations don't have execute actions
    // They are passive endpoints that return data when requested
    throw new Error('Webhook integrations do not support execute actions');
  }
}
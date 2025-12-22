import { IntegrationInterface } from '../common/integration.interface';
import { SmtpIntegration } from '../providers/smtp/smtp.integration';
import { HubSpotIntegration } from '../providers/hubspot/hubspot.integration';
import { ZohoIntegration } from '../providers/zoho/zoho.integration';

export class IntegrationFactory {
  static create(type: string, config: any): IntegrationInterface {
    switch (type.toUpperCase()) {
      case 'SMTP':
        return new SmtpIntegration(config);
      case 'HUBSPOT':
        return new HubSpotIntegration(config);
      case 'ZOHO':
        return new ZohoIntegration(config);
      // Future integrations can be added here
      case 'ZAPIER':
        throw new Error('Zapier integration not yet implemented');
      default:
        throw new Error(`Unsupported integration type: ${type}`);
    }
  }

  /**
   * Get list of supported integration types
   */
  static getSupportedTypes(): string[] {
    return ['SMTP', 'HUBSPOT', 'ZOHO', 'ELEVENLABS']; // Add more as they are implemented
  }

  /**
   * Check if integration type is supported
   */
  static isSupported(type: string): boolean {
    return this.getSupportedTypes().includes(type.toUpperCase());
  }
}
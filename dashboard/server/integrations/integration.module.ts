// Integration Module - Central exports for all integration providers
export { IntegrationInterface } from './common/integration.interface';
export { encrypt, decrypt } from './common/encryption.util';
export { IntegrationConfig, IIntegrationConfig } from './common/integration-config.model';
export { IntegrationFactory } from './factories/integration.factory';

// SMTP Provider exports
export { SmtpIntegration, SMTPConfig, EmailPayload } from './providers/smtp/smtp.integration';
export { SmtpService } from './providers/smtp/smtp.service';

// HubSpot Provider exports
export { HubSpotIntegration } from './providers/hubspot/hubspot.integration';
export { HubSpotService } from './providers/hubspot/hubspot.service';

// Zoho Provider exports
export { ZohoIntegration } from './providers/zoho/zoho.integration';
export { ZohoService, ZohoConfig } from './providers/zoho/zoho.service';

// Future providers will be exported here as they are implemented
// export { ZapierIntegration } from './providers/zapier/zapier.integration';
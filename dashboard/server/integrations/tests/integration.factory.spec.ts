import { IntegrationFactory } from '../factories/integration.factory';
import { SmtpIntegration } from '../providers/smtp/smtp.integration';

describe('Integration Factory', () => {
  it('should return SMTP instance', () => {
    const config = { 
      host: 'smtp.example.com', 
      port: 587,
      secure: false,
      email: 'test@example.com', 
      password: 'secret' 
    };
    const integration = IntegrationFactory.create('SMTP', config);
    expect(integration).toBeInstanceOf(SmtpIntegration);
  });

  it('should throw error for unknown type', () => {
    expect(() => IntegrationFactory.create('UNKNOWN', {})).toThrow('Unsupported integration type: UNKNOWN');
  });

  it('should be case insensitive for type', () => {
    const config = { 
      host: 'smtp.example.com', 
      port: 587,
      secure: false,
      email: 'test@example.com', 
      password: 'secret' 
    };
    const integration = IntegrationFactory.create('smtp', config);
    expect(integration).toBeInstanceOf(SmtpIntegration);
  });

  it('should return supported types', () => {
    const types = IntegrationFactory.getSupportedTypes();
    expect(types).toContain('SMTP');
    expect(Array.isArray(types)).toBe(true);
  });

  it('should check if type is supported', () => {
    expect(IntegrationFactory.isSupported('SMTP')).toBe(true);
    expect(IntegrationFactory.isSupported('smtp')).toBe(true);
    expect(IntegrationFactory.isSupported('UNKNOWN')).toBe(false);
  });
});
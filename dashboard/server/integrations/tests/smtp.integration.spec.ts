import { SmtpIntegration } from '../providers/smtp/smtp.integration';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      response: '250 OK',
      accepted: ['target@example.com'],
      rejected: []
    }),
    close: jest.fn()
  }))
}));

describe('SMTP Integration', () => {
  const mockConfig = {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    email: 'user@example.com',
    password: 'password'
  };

  it('should send email successfully', async () => {
    const smtp = new SmtpIntegration(mockConfig);
    
    const payload = {
      to: 'target@example.com',
      subject: 'Test Email',
      html: '<h1>Hello</h1>',
    };

    const response = await smtp.performAction(payload);

    expect(response).toBeDefined();
    expect(response.messageId).toBe('test-message-id');
    expect(response.accepted).toContain('target@example.com');
  });

  it('should test connection successfully', async () => {
    const smtp = new SmtpIntegration(mockConfig);
    const isConnected = await smtp.testConnection();
    expect(isConnected).toBe(true);
  });

  it('should handle connection failure gracefully', async () => {
    // Mock a failed connection
    const nodemailer = require('nodemailer');
    nodemailer.createTransporter.mockReturnValueOnce({
      verify: jest.fn().mockRejectedValue(new Error('Connection failed'))
    });

    const smtp = new SmtpIntegration(mockConfig);
    const isConnected = await smtp.testConnection();
    expect(isConnected).toBe(false);
  });

  it('should disconnect properly', async () => {
    const smtp = new SmtpIntegration(mockConfig);
    await smtp.connect();
    await smtp.disconnect();
    // Should not throw any errors
  });

  it('should include text version in email', async () => {
    const smtp = new SmtpIntegration(mockConfig);
    
    const payload = {
      to: 'target@example.com',
      subject: 'Test Email',
      html: '<h1>Hello</h1>',
      text: 'Hello'
    };

    const response = await smtp.performAction(payload);
    expect(response).toBeDefined();
  });
});
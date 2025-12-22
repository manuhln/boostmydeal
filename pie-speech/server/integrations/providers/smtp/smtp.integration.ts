import { IntegrationInterface } from '../../common/integration.interface';
import nodemailer from 'nodemailer';

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  email: string;
  password: string;
  from?: string; // Optional custom from address
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string; // Optional plain text version
}

export class SmtpIntegration implements IntegrationInterface {
  private config: SMTPConfig;
  private transporter: nodemailer.Transporter | null = null;

  constructor(config: SMTPConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      console.log('SMTP Integration: Creating transporter with config:', {
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        user: this.config.email
      });

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.email,
          pass: this.config.password,
        },
        debug: true, // Enable debug mode
        logger: true // Enable logging
      });

      // Test the connection
      console.log('SMTP Integration: Starting connection verification...');
      await this.transporter.verify();
      console.log('SMTP Integration: Connection verified successfully');
    } catch (error) {
      console.error('SMTP Integration: Connection failed with error:', error);
      throw new Error(`SMTP connection failed: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
  }

  async performAction(payload: EmailPayload): Promise<any> {
    if (!this.transporter) {
      await this.connect();
    }

    try {
      const info = await this.transporter!.sendMail({
        from: this.config.from || this.config.email,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      return {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
      };
    } catch (error) {
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  // Test connection method
  async testConnection(): Promise<boolean> {
    try {
      console.log('SMTP Integration: Starting test connection...');
      await this.connect();
      console.log('SMTP Integration: Test connection successful');
      return true;
    } catch (error) {
      console.error('SMTP Integration: Test connection failed:', error.message);
      console.error('SMTP Integration: Full error:', error);
      return false;
    }
  }
}
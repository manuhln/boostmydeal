import { IntegrationInterface } from '../../common/integration.interface';
import { ZohoService, ZohoConfig } from './zoho.service';

export class ZohoIntegration implements IntegrationInterface {
  private zohoService: ZohoService;

  constructor(config: ZohoConfig) {
    this.zohoService = new ZohoService(config);
  }

  async test(): Promise<boolean> {
    try {
      return await this.zohoService.testConnection();
    } catch (error) {
      console.error('Zoho integration test failed:', error);
      return false;
    }
  }

  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    try {
      // Note: This would require Zoho Mail API integration
      // For now, we'll just log the attempt
      console.log('ZohoIntegration: Email sending not implemented for Zoho CRM integration');
      return false;
    } catch (error) {
      console.error('Zoho email sending failed:', error);
      return false;
    }
  }

  async createContact(contactData: any): Promise<any> {
    try {
      return await this.zohoService.createContact(contactData);
    } catch (error) {
      console.error('Zoho contact creation failed:', error);
      throw error;
    }
  }

  async createDeal(dealData: any): Promise<any> {
    try {
      return await this.zohoService.createDeal(dealData);
    } catch (error) {
      console.error('Zoho deal creation failed:', error);
      throw error;
    }
  }

  async createAccount(accountData: any): Promise<any> {
    try {
      return await this.zohoService.createAccount(accountData);
    } catch (error) {
      console.error('Zoho account creation failed:', error);
      throw error;
    }
  }

  async getContacts(limit?: number): Promise<any> {
    try {
      return await this.zohoService.getContacts(limit);
    } catch (error) {
      console.error('Zoho get contacts failed:', error);
      throw error;
    }
  }

  async getDeals(limit?: number): Promise<any> {
    try {
      return await this.zohoService.getDeals(limit);
    } catch (error) {
      console.error('Zoho get deals failed:', error);
      throw error;
    }
  }

  async getDeal(dealId: string): Promise<any> {
    try {
      return await this.zohoService.getDeal(dealId);
    } catch (error) {
      console.error('Zoho get deal failed:', error);
      throw error;
    }
  }

  async searchDealsByName(dealName: string): Promise<any[]> {
    try {
      return await this.zohoService.searchDealsByName(dealName);
    } catch (error) {
      console.error('Zoho search deals failed:', error);
      throw error;
    }
  }

  async updateDeal(dealId: string, dealData: any): Promise<any> {
    try {
      return await this.zohoService.updateDeal(dealId, dealData);
    } catch (error) {
      console.error('Zoho deal update failed:', error);
      throw error;
    }
  }

  async getAccounts(limit?: number): Promise<any> {
    try {
      return await this.zohoService.getAccounts(limit);
    } catch (error) {
      console.error('Zoho get accounts failed:', error);
      throw error;
    }
  }

  async connect(): Promise<void> {
    try {
      const isConnected = await this.zohoService.testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Zoho CRM');
      }
      console.log('ZohoIntegration: Connected successfully');
    } catch (error) {
      console.error('Zoho connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // For Zoho, we just clear any cached tokens
      // No actual disconnect needed as it's REST API based
      console.log('ZohoIntegration: Disconnected (no action needed for REST API)');
    } catch (error) {
      console.error('Zoho disconnect failed:', error);
      throw error;
    }
  }

  async performAction(payload: any): Promise<any> {
    try {
      const { action, data } = payload;
      switch (action?.toLowerCase()) {
        case 'create_contact':
          return await this.zohoService.createContact(data);
        case 'create_deal':
          return await this.zohoService.createDeal(data);
        case 'create_account':
          return await this.zohoService.createAccount(data);
        case 'get_contacts':
          return await this.zohoService.getContacts(data?.limit);
        case 'get_deals':
          return await this.zohoService.getDeals(data?.limit);
        case 'get_deal':
          return await this.zohoService.getDeal(data?.dealId);
        case 'search_deals':
          return await this.searchDealsByName(data?.dealName);
        case 'update_deal':
          return await this.zohoService.updateDeal(data?.dealId, data?.dealData);
        case 'get_accounts':
          return await this.zohoService.getAccounts(data?.limit);
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      console.error('Zoho perform action failed:', error);
      throw error;
    }
  }
}
import { IntegrationInterface } from '../../common/integration.interface';

export interface HubSpotConfig {
  apiKey: string;
  baseUrl?: string; // Optional for different HubSpot environments
}

export interface ContactPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  website?: string;
  properties?: Record<string, any>; // Additional custom properties
}

export interface DealPayload {
  dealName: string;
  amount?: number;
  dealStage?: string;
  contactEmail?: string;
  companyName?: string;
  properties?: Record<string, any>; // Additional custom properties
}

export interface CompanyPayload {
  name: string;
  domain?: string;
  industry?: string;
  phone?: string;
  properties?: Record<string, any>; // Additional custom properties
}

export interface HubSpotActionPayload {
  action: 'create_contact' | 'create_deal' | 'create_company' | 'update_contact' | 'get_contact' | 'get_deal' | 'update_deal';
  data: ContactPayload | DealPayload | CompanyPayload | any;
}

export class HubSpotIntegration implements IntegrationInterface {
  private config: HubSpotConfig;
  private baseUrl: string;

  constructor(config: HubSpotConfig) {
    // Decode API key if it was encoded for transport
    const decodedConfig = {
      ...config,
      apiKey: this.decodeApiKey(config.apiKey)
    };
    this.config = decodedConfig;
    this.baseUrl = config.baseUrl || 'https://api.hubapi.com';
  }

  private decodeApiKey(apiKey: string): string {
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

  async connect(): Promise<void> {
    try {
      console.log('HubSpot Integration: Testing connection...');
      
      // Test the API key by making a simple API call to get contacts (with limit 1)
      const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts?limit=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HubSpot API Error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      console.log('HubSpot Integration: Connection verified successfully');
    } catch (error) {
      console.error('HubSpot Integration: Connection failed with error:', error);
      throw new Error(`HubSpot connection failed: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    // HubSpot API doesn't require explicit disconnection
    console.log('HubSpot Integration: Disconnected');
  }

  async performAction(payload: HubSpotActionPayload): Promise<any> {
    try {
      console.log('HubSpot Integration: Performing action:', payload.action);

      switch (payload.action) {
        case 'create_contact':
          return await this.createContact(payload.data as ContactPayload);
        case 'create_deal':
          return await this.createDeal(payload.data as DealPayload);
        case 'create_company':
          return await this.createCompany(payload.data as CompanyPayload);
        case 'update_contact':
          return await this.updateContact(payload.data);
        case 'get_contact':
          return await this.getContact(payload.data.email);
        case 'get_deal':
          return await this.getDeal(payload.data.dealId);
        case 'search_deals':
          return await this.searchDealsByName(payload.data.dealName);
        case 'update_deal':
          return await this.updateDeal(payload.data.dealId, payload.data.properties);
        default:
          throw new Error(`Unsupported HubSpot action: ${payload.action}`);
      }
    } catch (error) {
      console.error('HubSpot Integration: Action failed:', error);
      throw new Error(`HubSpot action failed: ${error.message}`);
    }
  }

  private async createContact(contactData: ContactPayload): Promise<any> {
    const hubspotProperties: Record<string, any> = {
      email: contactData.email
    };

    if (contactData.firstName) hubspotProperties.firstname = contactData.firstName;
    if (contactData.lastName) hubspotProperties.lastname = contactData.lastName;
    if (contactData.company) hubspotProperties.company = contactData.company;
    if (contactData.phone) hubspotProperties.phone = contactData.phone;
    if (contactData.website) hubspotProperties.website = contactData.website;

    // Add custom properties
    if (contactData.properties) {
      Object.assign(hubspotProperties, contactData.properties);
    }

    const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: hubspotProperties
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to create contact: ${response.status} - ${errorData}`);
    }

    return await response.json();
  }

  private async createDeal(dealData: DealPayload): Promise<any> {
    const hubspotProperties: Record<string, any> = {
      dealname: dealData.dealName
    };

    if (dealData.amount) hubspotProperties.amount = dealData.amount;
    if (dealData.dealStage) hubspotProperties.dealstage = dealData.dealStage;

    // Add custom properties
    if (dealData.properties) {
      Object.assign(hubspotProperties, dealData.properties);
    }

    const response = await fetch(`${this.baseUrl}/crm/v3/objects/deals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: hubspotProperties
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to create deal: ${response.status} - ${errorData}`);
    }

    return await response.json();
  }

  private async createCompany(companyData: CompanyPayload): Promise<any> {
    const hubspotProperties: Record<string, any> = {
      name: companyData.name
    };

    if (companyData.domain) hubspotProperties.domain = companyData.domain;
    if (companyData.industry) hubspotProperties.industry = companyData.industry;
    if (companyData.phone) hubspotProperties.phone = companyData.phone;

    // Add custom properties
    if (companyData.properties) {
      Object.assign(hubspotProperties, companyData.properties);
    }

    const response = await fetch(`${this.baseUrl}/crm/v3/objects/companies`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: hubspotProperties
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to create company: ${response.status} - ${errorData}`);
    }

    return await response.json();
  }

  private async updateContact(updateData: { email: string; properties: Record<string, any> }): Promise<any> {
    // First, get the contact by email to get its ID
    const contact = await this.getContact(updateData.email);
    
    if (!contact || !contact.id) {
      throw new Error(`Contact with email ${updateData.email} not found`);
    }

    const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts/${contact.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: updateData.properties
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to update contact: ${response.status} - ${errorData}`);
    }

    return await response.json();
  }

  private async getContact(email: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts/${email}?idProperty=email`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 404) {
      return null; // Contact not found
    }

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to get contact: ${response.status} - ${errorData}`);
    }

    return await response.json();
  }

  private async getDeal(dealId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/deals/${dealId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 404) {
      throw new Error(`Deal with ID ${dealId} not found`);
    }

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to get deal: ${response.status} - ${errorData}`);
    }

    return await response.json();
  }

  private async searchDealsByName(dealName: string): Promise<any[]> {
    // Use HubSpot's search API to find deals by name
    const searchUrl = `${this.baseUrl}/crm/v3/objects/deals/search`;
    const searchBody = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'dealname',
              operator: 'EQ',
              value: dealName
            }
          ]
        }
      ],
      properties: ['dealname', 'amount', 'dealstage', 'closedate', 'dealtype', 'description'],
      limit: 100
    };

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to search deals: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    return result.results || [];
  }

  private async updateDeal(dealId: string, properties: Record<string, any>): Promise<any> {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/deals/${dealId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: properties
      })
    });

    if (response.status === 404) {
      throw new Error(`Deal with ID ${dealId} not found`);
    }

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to update deal: ${response.status} - ${errorData}`);
    }

    return await response.json();
  }

  // Test connection method
  async testConnection(): Promise<boolean> {
    try {
      console.log('HubSpot Integration: Starting test connection...');
      await this.connect();
      console.log('HubSpot Integration: Test connection successful');
      return true;
    } catch (error) {
      console.error('HubSpot Integration: Test connection failed:', error.message);
      console.error('HubSpot Integration: Full error:', error);
      return false;
    }
  }
}
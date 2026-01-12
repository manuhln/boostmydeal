import { IntegrationConfig } from "../../common/integration-config.model";
import { encrypt, decrypt } from "../../common/encryption.util";
import { ZohoIntegration } from "./zoho.integration";

export interface ZohoConfig {
  refreshToken: string;
  clientId?: string;
  clientSecret?: string;
  baseUrl?: string;
  region?: string;
}

export interface ZohoConfigData {
  refreshToken: string;
  clientId?: string;
  clientSecret?: string;
  region?: string;
  baseUrl?: string;
}

export class ZohoService {
  private config: ZohoConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: ZohoConfig) {
    this.config = config;
  }

  // Get access token using refresh token
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Validate required fields
    if (!this.config.refreshToken) {
      throw new Error("Refresh token is required");
    }
    if (!this.config.clientId) {
      throw new Error("Client ID is required");
    }
    if (!this.config.clientSecret) {
      throw new Error("Client Secret is required");
    }

    const region = this.config.region || "com";
    const accountsUrl = `https://accounts.zoho.${region}/oauth/v2/token`;

    console.log("Zoho: Making token request to:", accountsUrl);
    console.log("Zoho: Request parameters:", {
      refresh_token: this.config.refreshToken ? "***PROVIDED***" : "MISSING",
      client_id: this.config.clientId ? "***PROVIDED***" : "MISSING",
      client_secret: this.config.clientSecret ? "***PROVIDED***" : "MISSING",
      grant_type: "refresh_token",
    });

    const response = await fetch(accountsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token: this.config.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: "refresh_token",
      }),
    });

    const responseText = await response.text();
    console.log(
      "Zoho token response status:",
      response.status,
      response.statusText
    );
    console.log(
      "Zoho token response text (first 500 chars):",
      responseText.substring(0, 500)
    );

    if (!response.ok) {
      console.error("Zoho token request failed:", {
        status: response.status,
        statusText: response.statusText,
        error: responseText,
      });
      throw new Error(
        `Failed to get access token: ${response.status} ${response.statusText}`
      );
    }

    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse token response as JSON:", parseError);
      throw new Error(
        `Invalid JSON response from Zoho: ${responseText.substring(0, 200)}`
      );
    }

    console.log("Zoho token response parsed:", tokenData);

    if (!tokenData.access_token) {
      console.error("No access token in response:", tokenData);
      throw new Error(
        `No access token received from Zoho. Response: ${JSON.stringify(
          tokenData
        )}`
      );
    }

    this.accessToken = tokenData.access_token;
    this.tokenExpiry = Date.now() + tokenData.expires_in * 1000 - 60000; // 1 minute buffer

    return this.accessToken!; // Non-null assertion since we just set it
  }

  // Test connection to Zoho CRM
  async testConnection(): Promise<boolean> {
    // Propagate errors so caller can handle them and know why it failed
    const accessToken = await this.getAccessToken();
    const region = this.config.region || "com";
    const apiUrl = `https://www.zohoapis.${region}/crm/v2/users`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "No response body");
      throw new Error(
        `Zoho API Error: ${response.status} ${response.statusText} - ${text}`
      );
    }

    return true;
  }

  // Create contact in Zoho CRM
  async createContact(contactData: any): Promise<any> {
    const accessToken = await this.getAccessToken();
    const region = this.config.region || "com";
    const apiUrl = `https://www.zohoapis.${region}/crm/v2/Contacts`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [contactData],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "No response body");
      throw new Error(
        `Failed to create contact: ${response.status} ${response.statusText} - ${text}`
      );
    }

    if (response.status === 204) {
      return null;
    }

    const responseText = await response.text();
    if (!responseText || responseText.trim() === "") {
      return null;
    }

    try {
      return JSON.parse(responseText);
    } catch (e: any) {
      console.error(
        "Zoho: Failed to parse create contact response:",
        responseText
      );
      throw new Error(`Failed to parse Zoho response: ${e.message}`);
    }
  }

  // Create deal in Zoho CRM
  async createDeal(dealData: any): Promise<any> {
    const accessToken = await this.getAccessToken();
    const region = this.config.region || "com";
    const apiUrl = `https://www.zohoapis.${region}/crm/v2/Deals`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [dealData],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "No response body");
      throw new Error(
        `Failed to create deal: ${response.status} ${response.statusText} - ${text}`
      );
    }

    if (response.status === 204) {
      return null;
    }

    const responseText = await response.text();
    if (!responseText || responseText.trim() === "") {
      return null;
    }

    try {
      return JSON.parse(responseText);
    } catch (e: any) {
      console.error(
        "Zoho: Failed to parse create deal response:",
        responseText
      );
      throw new Error(`Failed to parse Zoho response: ${e.message}`);
    }
  }

  // Create account in Zoho CRM
  async createAccount(accountData: any): Promise<any> {
    const accessToken = await this.getAccessToken();
    const region = this.config.region || "com";
    const apiUrl = `https://www.zohoapis.${region}/crm/v2/Accounts`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [accountData],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "No response body");
      throw new Error(
        `Failed to create account: ${response.status} ${response.statusText} - ${text}`
      );
    }

    if (response.status === 204) {
      return null;
    }

    const responseText = await response.text();
    if (!responseText || responseText.trim() === "") {
      return null;
    }

    try {
      return JSON.parse(responseText);
    } catch (e: any) {
      console.error(
        "Zoho: Failed to parse create account response:",
        responseText
      );
      throw new Error(`Failed to parse Zoho response: ${e.message}`);
    }
  }

  // Get contacts from Zoho CRM
  async getContacts(limit: number = 50): Promise<any> {
    const accessToken = await this.getAccessToken();
    const region = this.config.region || "com";
    const apiUrl = `https://www.zohoapis.${region}/crm/v2/Contacts?per_page=${limit}`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "No response body");
      throw new Error(
        `Failed to get contacts: ${response.status} ${response.statusText} - ${text}`
      );
    }

    if (response.status === 204) {
      return { data: [] };
    }

    const responseText = await response.text();
    if (!responseText || responseText.trim() === "") {
      return { data: [] };
    }

    try {
      return JSON.parse(responseText);
    } catch (e: any) {
      console.error(
        "Zoho: Failed to parse get contacts response:",
        responseText
      );
      throw new Error(`Failed to parse Zoho response: ${e.message}`);
    }
  }

  // Get deals from Zoho CRM
  async getDeals(limit: number = 50): Promise<any> {
    const accessToken = await this.getAccessToken();
    const region = this.config.region || "com";
    const apiUrl = `https://www.zohoapis.${region}/crm/v2/Deals?per_page=${limit}`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "No response body");
      throw new Error(
        `Failed to get deals: ${response.status} ${response.statusText} - ${text}`
      );
    }

    if (response.status === 204) {
      return { data: [] };
    }

    const responseText = await response.text();
    if (!responseText || responseText.trim() === "") {
      return { data: [] };
    }

    try {
      return JSON.parse(responseText);
    } catch (e: any) {
      console.error("Zoho: Failed to parse get deals response:", responseText);
      throw new Error(`Failed to parse Zoho response: ${e.message}`);
    }
  }

  // Get a single deal by ID from Zoho CRM
  async getDeal(dealId: string): Promise<any> {
    const accessToken = await this.getAccessToken();
    const region = this.config.region || "com";
    const apiUrl = `https://www.zohoapis.${region}/crm/v2/Deals/${dealId}`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Deal with ID ${dealId} not found`);
      }
      const text = await response.text().catch(() => "No response body");
      throw new Error(
        `Failed to get deal: ${response.status} ${response.statusText} - ${text}`
      );
    }

    if (response.status === 204) {
      throw new Error(`Deal with ID ${dealId} not found (204 No Content)`);
    }

    const responseText = await response.text();
    if (!responseText || responseText.trim() === "") {
      throw new Error(`Deal with ID ${dealId} not found (Empty response)`);
    }

    try {
      return JSON.parse(responseText);
    } catch (e: any) {
      console.error("Zoho: Failed to parse get deal response:", responseText);
      throw new Error(`Failed to parse Zoho response: ${e.message}`);
    }
  }

  async searchDealsByName(dealName: string): Promise<any[]> {
    const accessToken = await this.getAccessToken();
    const region = this.config.region || "com";

    // Use Zoho's search API to find deals by name
    const searchUrl = `https://www.zohoapis.${region}/crm/v2/Deals/search`;
    const searchParams = new URLSearchParams({
      criteria: `(Deal_Name:equals:${dealName})`,
    });

    const response = await fetch(`${searchUrl}?${searchParams}`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No deals found is not an error
        return [];
      }
      const text = await response.text().catch(() => "No response body");
      throw new Error(
        `Failed to search deals: ${response.status} ${response.statusText} - ${text}`
      );
    }

    if (response.status === 204) {
      return [];
    }

    const responseText = await response.text();
    if (!responseText || responseText.trim() === "") {
      return [];
    }

    try {
      const result = JSON.parse(responseText);
      return result.data || [];
    } catch (e: any) {
      console.error(
        "Zoho: Failed to parse search deals response:",
        responseText
      );
      throw new Error(`Failed to parse Zoho response: ${e.message}`);
    }
  }

  // Update a deal in Zoho CRM
  async updateDeal(dealId: string, dealData: any): Promise<any> {
    const accessToken = await this.getAccessToken();
    const region = this.config.region || "com";
    const apiUrl = `https://www.zohoapis.${region}/crm/v2/Deals/${dealId}`;

    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [dealData],
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Deal with ID ${dealId} not found`);
      }
      const text = await response.text().catch(() => "No response body");
      throw new Error(
        `Failed to update deal: ${response.status} ${response.statusText} - ${text}`
      );
    }

    if (response.status === 204) {
      return null;
    }

    const responseText = await response.text();
    if (!responseText || responseText.trim() === "") {
      return null;
    }

    try {
      return JSON.parse(responseText);
    } catch (e: any) {
      console.error(
        "Zoho: Failed to parse update deal response:",
        responseText
      );
      throw new Error(`Failed to parse Zoho response: ${e.message}`);
    }
  }

  // Get accounts from Zoho CRM
  async getAccounts(limit: number = 50): Promise<any> {
    const accessToken = await this.getAccessToken();
    const region = this.config.region || "com";
    const apiUrl = `https://www.zohoapis.${region}/crm/v2/Accounts?per_page=${limit}`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "No response body");
      throw new Error(
        `Failed to get accounts: ${response.status} ${response.statusText} - ${text}`
      );
    }

    if (response.status === 204) {
      return { data: [] };
    }

    const responseText = await response.text();
    if (!responseText || responseText.trim() === "") {
      return { data: [] };
    }

    try {
      return JSON.parse(responseText);
    } catch (e: any) {
      console.error(
        "Zoho: Failed to parse get accounts response:",
        responseText
      );
      throw new Error(`Failed to parse Zoho response: ${e.message}`);
    }
  }

  /**
   * Save Zoho integration configuration
   */
  static async saveConfig(
    userId: string,
    organizationId: string,
    name: string,
    config: ZohoConfigData
  ): Promise<any> {
    try {
      // Decode the credentials if they were encoded for transport
      let refreshToken = config.refreshToken;
      if (refreshToken && refreshToken.startsWith("encoded_")) {
        refreshToken = atob(refreshToken.replace("encoded_", ""));
      }

      let clientId = config.clientId;
      if (clientId && clientId.startsWith("encoded_")) {
        clientId = atob(clientId.replace("encoded_", ""));
      }

      let clientSecret = config.clientSecret;
      if (clientSecret && clientSecret.startsWith("encoded_")) {
        clientSecret = atob(clientSecret.replace("encoded_", ""));
      }

      // Encrypt the sensitive credentials for secure storage
      const encryptedRefreshToken = encrypt(refreshToken);
      const encryptedClientId = encrypt(clientId || "");
      const encryptedClientSecret = encrypt(clientSecret || "");

      // Create the config object and stringify it for database storage
      const configObject = {
        refreshToken: encryptedRefreshToken,
        clientId: encryptedClientId,
        clientSecret: encryptedClientSecret,
        region: config.region || "com",
        baseUrl: config.baseUrl,
      };

      const zohoConfig = new IntegrationConfig({
        userId,
        organizationId,
        name,
        type: "ZOHO",
        config: JSON.stringify(configObject), // Store as stringified JSON
        isActive: true,
      });

      const savedConfig = await zohoConfig.save();
      console.log("ZohoService: Configuration saved successfully");

      return {
        id: savedConfig._id,
        name: savedConfig.name,
        type: savedConfig.type,
        createdAt: savedConfig.createdAt,
      };
    } catch (error: any) {
      console.error("ZohoService: Save config error:", error.message);
      throw new Error(`Failed to save Zoho configuration: ${error.message}`);
    }
  }

  /**
   * Test Zoho integration configuration
   */
  static async testConfig(config: ZohoConfigData): Promise<boolean> {
    try {
      console.log("ZohoService: Testing Zoho connection...");

      // Decode the refresh token if it was encoded for transport
      let refreshToken = config.refreshToken;
      if (refreshToken && refreshToken.startsWith("encoded_")) {
        refreshToken = atob(refreshToken.replace("encoded_", ""));
      }

      // Decode the client ID if it was encoded for transport
      let clientId = config.clientId;
      if (clientId && clientId.startsWith("encoded_")) {
        clientId = atob(clientId.replace("encoded_", ""));
      }

      // Decode the client secret if it was encoded for transport
      let clientSecret = config.clientSecret;
      if (clientSecret && clientSecret.startsWith("encoded_")) {
        clientSecret = atob(clientSecret.replace("encoded_", ""));
      }

      // console.log("ZohoService: Test config credentials:", {
      //   refreshToken: refreshToken ? "***PROVIDED***" : "MISSING",
      //   clientId: clientId ? "***PROVIDED***" : "MISSING",
      //   clientSecret: clientSecret ? "***PROVIDED***" : "MISSING",
      //   region: config.region || "com",
      // });

      // Create a ZohoService instance to test the connection
      const zohoService = new ZohoService({
        refreshToken,
        clientId,
        clientSecret,
        region: config.region || "com",
        baseUrl: config.baseUrl,
      });

      const isValid = await zohoService.testConnection();

      if (isValid) {
        console.log("ZohoService: Connection test successful");
        return true;
      } else {
        console.log("ZohoService: Connection test failed");
        return false;
      }
    } catch (error: any) {
      console.error("ZohoService: Connection test error:", error.message);
      return false;
    }
  }

  /**
   * Generate refresh token using authorization code
   */
  static async generateTokens(params: {
    code: string;
    clientId: string;
    clientSecret: string;
    region?: string;
    redirectUri: string;
  }): Promise<any> {
    try {
      const region = params.region || "com";
      const accountsUrl = `https://accounts.zoho.${region}/oauth/v2/token`;

      console.log("Zoho: Generating tokens from code at:", accountsUrl);

      const response = await fetch(accountsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code: params.code,
          client_id: params.clientId,
          client_secret: params.clientSecret,
          redirect_uri: params.redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error("Zoho token generation failed:", {
          status: response.status,
          error: responseText,
        });
        throw new Error(
          `Failed to generate tokens: ${response.status} - ${responseText}`
        );
      }

      return JSON.parse(responseText);
    } catch (error: any) {
      console.error("ZohoService: Token generation error:", error.message);
      throw error;
    }
  }

  /**
   * Send test email using Zoho (placeholder - would use Zoho Mail API)
   */
  static async searchDealsByName(
    userId: string,
    organizationId: string,
    configId: string,
    dealName: string
  ): Promise<any[]> {
    try {
      const config = await this.getConfig(userId, organizationId, configId);
      if (!config) {
        throw new Error("Zoho configuration not found");
      }

      const zohoIntegration = new ZohoIntegration(config);
      return await zohoIntegration.searchDealsByName(dealName);
    } catch (error: any) {
      throw new Error(`Failed to search Zoho deals: ${error.message}`);
    }
  }

  static async performAction(
    userId: string,
    organizationId: string,
    configId: string,
    payload: any
  ): Promise<any> {
    try {
      const config = await this.getConfig(userId, organizationId, configId);
      if (!config) {
        throw new Error("Zoho configuration not found");
      }

      const zohoIntegration = new ZohoIntegration(config);
      return await zohoIntegration.performAction(payload);
    } catch (error: any) {
      throw new Error(`Failed to perform Zoho action: ${error.message}`);
    }
  }

  static async getConfig(
    userId: string,
    organizationId: string,
    configId?: string
  ): Promise<ZohoConfigData | null> {
    try {
      let query: any = {
        userId,
        organizationId,
        type: "ZOHO",
        isActive: true,
      };

      if (configId) {
        query._id = configId;
      }

      const integrationConfig = await IntegrationConfig.findOne(query);

      if (!integrationConfig) {
        return null;
      }

      // Decrypt the configuration
      const decryptedConfig = JSON.parse(integrationConfig.config);
      return {
        refreshToken: decrypt(decryptedConfig.refreshToken),
        clientId: decrypt(decryptedConfig.clientId),
        clientSecret: decrypt(decryptedConfig.clientSecret),
        region: decryptedConfig.region || "com",
        baseUrl: decryptedConfig.baseUrl,
      } as ZohoConfigData;
    } catch (error) {
      throw new Error(`Failed to get Zoho config: ${error.message}`);
    }
  }

  static async sendTestEmail(
    configId: string,
    to: string,
    subject: string,
    message: string
  ): Promise<boolean> {
    try {
      console.log(
        "ZohoService: Test email functionality not implemented for Zoho"
      );
      // Note: This would require Zoho Mail API integration
      // For now, we'll just return false as a placeholder
      return false;
    } catch (error: any) {
      console.error("ZohoService: Send test email error:", error.message);
      return false;
    }
  }
}

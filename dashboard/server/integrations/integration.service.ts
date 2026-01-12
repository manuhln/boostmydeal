import { IntegrationFactory } from "./factories/integration.factory";
import { SmtpService } from "./providers/smtp/smtp.service";
import { HubSpotService } from "./providers/hubspot/hubspot.service";
import { ZohoService } from "./providers/zoho/zoho.service";
import { WebhookService } from "./providers/webhook/webhook.service";
import { ElevenLabsIntegrationService } from "./providers/elevenlabs/elevenlabs.service";
import { IntegrationConfig } from "./common/integration-config.model";
import { decrypt } from "./common/encryption.util";

export interface TestEmailPayload {
  to: string;
  subject: string;
  message: string;
}

export class IntegrationService {
  /**
   * Get all integrations for a user
   */
  static async getUserIntegrations(
    userId: string,
    organizationId: string
  ): Promise<any[]> {
    try {
      const integrations = await IntegrationConfig.find({
        userId,
        organizationId,
        isActive: true,
      }).select("_id name type createdAt updatedAt");

      return integrations.map((integration) => ({
        id: integration._id,
        name: integration.name,
        type: integration.type,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      }));
    } catch (error: any) {
      throw new Error(`Failed to get user integrations: ${error.message}`);
    }
  }

  /**
   * Save integration configuration based on type
   */
  static async saveIntegrationConfig(
    userId: string,
    organizationId: string,
    type: string,
    name: string,
    config: any
  ): Promise<any> {
    switch (type.toUpperCase()) {
      case "SMTP":
        return await SmtpService.saveConfig(
          userId,
          organizationId,
          name,
          config
        );
      case "HUBSPOT":
        return await HubSpotService.saveConfig(
          userId,
          organizationId,
          name,
          config
        );
      case "ZOHO":
        return await ZohoService.saveConfig(
          userId,
          organizationId,
          name,
          config
        );
      case "WEBHOOK":
        return await WebhookService.saveConfig(
          userId,
          organizationId,
          name,
          config
        );
      case "ELEVENLABS":
        return await ElevenLabsIntegrationService.saveConfig(
          userId,
          organizationId,
          name,
          config
        );
      default:
        throw new Error(`Unsupported integration type: ${type}`);
    }
  }

  /**
   * Test integration configuration
   */
  static async testIntegrationConfig(
    type: string,
    config: any
  ): Promise<boolean> {
    try {
      console.log("IntegrationService: Testing config for type:", type);

      switch (type.toUpperCase()) {
        case "SMTP":
          console.log("IntegrationService: Config details:", {
            host: config?.host,
            port: config?.port,
            secure: config?.secure,
          });
          const smtpResult = await SmtpService.testConfig(config);
          console.log("IntegrationService: SMTP test result:", smtpResult);
          return smtpResult;
        case "HUBSPOT":
          console.log("IntegrationService: Config details:", {
            apiKey: config?.apiKey ? "[HIDDEN]" : "missing",
          });
          const hubspotResult = await HubSpotService.testConfig(config);
          console.log(
            "IntegrationService: HubSpot test result:",
            hubspotResult
          );
          return hubspotResult;
        case "ZOHO":
          console.log("IntegrationService: Config details:", {
            refreshToken: config?.refreshToken ? "[HIDDEN]" : "missing",
            clientId: config?.clientId ? "[HIDDEN]" : "missing",
            clientSecret: config?.clientSecret ? "[HIDDEN]" : "missing",
            region: config?.region || "com",
          });
          const zohoResult = await ZohoService.testConfig(config);
          console.log("IntegrationService: Zoho test result:", zohoResult);
          return zohoResult;
        case "WEBHOOK":
          console.log("IntegrationService: Config details:", {
            username: config?.username ? "[HIDDEN]" : "missing",
          });
          const webhookResult = await WebhookService.testConfig(config);
          console.log(
            "IntegrationService: Webhook test result:",
            webhookResult
          );
          return webhookResult;
        case "ELEVENLABS":
          console.log("IntegrationService: Config details:", {
            apiKey: config?.apiKey ? "[HIDDEN]" : "missing",
          });

          // Decode the API key if it's base64 encoded
          let apiKey = config.apiKey;
          if (apiKey && apiKey.startsWith("encoded_")) {
            apiKey = Buffer.from(
              apiKey.replace("encoded_", ""),
              "base64"
            ).toString("utf-8");
          }

          const testConfig = {
            ...config,
            apiKey,
          };

          const elevenLabsResult =
            await ElevenLabsIntegrationService.testConfig(testConfig);
          console.log(
            "IntegrationService: ElevenLabs test result:",
            elevenLabsResult
          );
          return elevenLabsResult;
        default:
          throw new Error(`Unsupported integration type: ${type}`);
      }
    } catch (error) {
      console.error("Test integration config error:", error.message);
      return false;
    }
  }

  /**
   * Send test email using configuration
   */
  static async sendTestEmail(
    userId: string,
    organizationId: string,
    configId: string,
    payload: TestEmailPayload
  ): Promise<any> {
    try {
      const integrationConfig = await IntegrationConfig.findOne({
        _id: configId,
        userId,
        organizationId,
        isActive: true,
      });

      if (!integrationConfig) {
        throw new Error("Integration configuration not found");
      }

      switch (integrationConfig.type) {
        case "SMTP":
          const emailPayload = {
            to: payload.to,
            subject: payload.subject,
            html: `<h2>Test Email</h2><p>${payload.message}</p><hr><p><small>This is a test email sent from your SMTP integration.</small></p>`,
            text: `Test Email\n\n${payload.message}\n\n---\nThis is a test email sent from your SMTP integration.`,
          };

          return await SmtpService.sendEmail(
            userId,
            organizationId,
            configId,
            emailPayload
          );
        default:
          throw new Error(
            `Unsupported integration type: ${integrationConfig.type}`
          );
      }
    } catch (error: any) {
      throw new Error(`Failed to send test email: ${error.message}`);
    }
  }

  /**
   * Delete integration configuration
   */
  static async deleteIntegration(
    userId: string,
    organizationId: string,
    configId: string
  ): Promise<boolean> {
    try {
      const result = await IntegrationConfig.findOneAndUpdate(
        {
          _id: configId,
          userId,
          organizationId,
        },
        { isActive: false },
        { new: true }
      );

      return !!result;
    } catch (error: any) {
      throw new Error(`Failed to delete integration: ${error.message}`);
    }
  }

  /**
   * Get supported integration types
   */
  static getSupportedTypes(): Array<{
    type: string;
    name: string;
    description: string;
  }> {
    return [
      {
        type: "SMTP",
        name: "Email (SMTP)",
        description: "Send emails using your SMTP server configuration",
      },
      {
        type: "HUBSPOT",
        name: "HubSpot CRM",
        description:
          "Sync contacts, deals, and companies with your HubSpot account",
      },
      {
        type: "WEBHOOK",
        name: "Custom Webhook",
        description: "Get call details from our custom webhook to any platform",
      },
      {
        type: "ELEVENLABS",
        name: "ElevenLabs Voice Cloning",
        description:
          "Clone custom voices for your AI agents using ElevenLabs API",
      },
      // Future integrations will be added here
    ];
  }

  /**
   * Get deal by name (supports both HubSpot and Zoho)
   */
  static async getDealByName(
    userId: string,
    organizationId: string,
    configId: string,
    dealName: string
  ): Promise<any> {
    let integrationConfig: any = null;
    try {
      integrationConfig = await IntegrationConfig.findOne({
        _id: configId,
        userId,
        organizationId,
        isActive: true,
      });

      if (!integrationConfig) {
        throw new Error("Integration configuration not found");
      }

      if (!["HUBSPOT", "ZOHO"].includes(integrationConfig.type)) {
        throw new Error("Integration type does not support deal retrieval");
      }

      // Decrypt the configuration based on integration type
      let config;
      if (integrationConfig.type === "HUBSPOT") {
        // HubSpot stores encrypted JSON
        const decryptedConfig = decrypt(integrationConfig.config);
        config = JSON.parse(decryptedConfig);
      } else if (integrationConfig.type === "ZOHO") {
        // Zoho stores JSON with individually encrypted fields
        const configObject = JSON.parse(integrationConfig.config);
        config = {
          refreshToken: decrypt(configObject.refreshToken),
          clientId: decrypt(configObject.clientId),
          clientSecret: decrypt(configObject.clientSecret),
          region: configObject.region,
          baseUrl: configObject.baseUrl,
        };
      } else {
        throw new Error("Unsupported integration type");
      }

      // Create integration instance
      const integration = IntegrationFactory.create(
        integrationConfig.type,
        config
      );

      // Connect and search for deals by name
      await integration.connect();
      const searchPayload = {
        action: "search_deals",
        data: { dealName },
      };
      const deals = await integration.performAction(searchPayload);
      await integration.disconnect();

      return deals;
    } catch (error: any) {
      throw new Error(
        `Failed to get ${integrationConfig?.type || "CRM"} deal: ${
          error.message
        }`
      );
    }
  }

  /**
   * Generate tokens for Zoho CRM
   */
  static async generateZohoTokens(params: {
    code: string;
    clientId: string;
    clientSecret: string;
    region?: string;
    redirectUri: string;
  }): Promise<any> {
    try {
      // Decode credentials if they were encoded for transport
      let code = params.code;
      if (code && code.startsWith("encoded_")) {
        code = Buffer.from(code.replace("encoded_", ""), "base64").toString(
          "utf-8"
        );
      }

      let clientId = params.clientId;
      if (clientId && clientId.startsWith("encoded_")) {
        clientId = Buffer.from(
          clientId.replace("encoded_", ""),
          "base64"
        ).toString("utf-8");
      }

      let clientSecret = params.clientSecret;
      if (clientSecret && clientSecret.startsWith("encoded_")) {
        clientSecret = Buffer.from(
          clientSecret.replace("encoded_", ""),
          "base64"
        ).toString("utf-8");
      }

      return await ZohoService.generateTokens({
        code,
        clientId,
        clientSecret,
        region: params.region,
        redirectUri: params.redirectUri,
      });
    } catch (error: any) {
      throw new Error(`Failed to generate Zoho tokens: ${error.message}`);
    }
  }

  /**
   * Get HubSpot deal by name (backward compatibility)
   */
  static async getHubSpotDeal(
    userId: string,
    organizationId: string,
    configId: string,
    dealName: string
  ): Promise<any> {
    return this.getDealByName(userId, organizationId, configId, dealName);
  }

  /**
   * Perform action using integration
   */
  static async performIntegrationAction(
    userId: string,
    organizationId: string,
    configId: string,
    payload: any
  ): Promise<any> {
    try {
      const integrationConfig = await IntegrationConfig.findOne({
        _id: configId,
        userId,
        organizationId,
        isActive: true,
      });

      if (!integrationConfig) {
        throw new Error("Integration configuration not found");
      }

      // Decrypt the configuration
      const decryptedConfig = decrypt(integrationConfig.config);
      const config = JSON.parse(decryptedConfig);

      // Create integration instance using factory
      const integration = IntegrationFactory.create(
        integrationConfig.type,
        config
      );

      // Connect and perform action
      await integration.connect();
      const result = await integration.performAction(payload);
      await integration.disconnect();

      return result;
    } catch (error: any) {
      throw new Error(`Failed to perform integration action: ${error.message}`);
    }
  }
}

import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { IntegrationService } from "../../integrations/integration.service";
import { validationResult } from "express-validator";

export class IntegrationController {
  /**
   * Get all integrations for the authenticated user
   */
  static async getUserIntegrations(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const organizationId = req.organization!._id.toString();

      const integrations = await IntegrationService.getUserIntegrations(
        userId,
        organizationId
      );

      res.json({
        success: true,
        data: integrations,
      });
    } catch (error: any) {
      console.error("Get user integrations error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get integrations",
      });
    }
  }

  /**
   * Get supported integration types
   */
  static async getSupportedTypes(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const types = IntegrationService.getSupportedTypes();

      res.json({
        success: true,
        data: types,
      });
    } catch (error: any) {
      console.error("Get supported types error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get supported types",
      });
    }
  }

  /**
   * Save integration configuration
   */
  static async saveIntegrationConfig(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const userId = req.user!._id.toString();
      const organizationId = req.organization!._id.toString();
      const { type, name, config } = req.body;

      const savedConfig = await IntegrationService.saveIntegrationConfig(
        userId,
        organizationId,
        type,
        name,
        config
      );

      res.json({
        success: true,
        message: "Integration configuration saved successfully",
        data: {
          id: savedConfig._id,
          name: savedConfig.name,
          type: savedConfig.type,
          createdAt: savedConfig.createdAt,
          updatedAt: savedConfig.updatedAt,
        },
      });
    } catch (error: any) {
      console.error("Save integration config error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to save integration configuration",
      });
    }
  }

  /**
   * Test integration configuration
   */
  static async testIntegrationConfig(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { type, config } = req.body;

      console.log("Controller: Testing integration config - Type:", type);
      console.log(
        "Controller: Full request body:",
        JSON.stringify(req.body, null, 2)
      );
      console.log("Controller: Config object keys:", Object.keys(config || {}));
      console.log("Controller: Testing integration config:", {
        type,
        host: config?.host,
        port: config?.port,
        email: config?.email,
        apiKey: config?.apiKey ? "[HIDDEN]" : undefined,
        refreshToken: config?.refreshToken ? "[HIDDEN]" : undefined,
        clientId: config?.clientId ? "[HIDDEN]" : undefined,
        clientSecret: config?.clientSecret ? "[HIDDEN]" : undefined,
        region: config?.region,
        baseUrl: config?.baseUrl,
      });

      const isValid = await IntegrationService.testIntegrationConfig(
        type,
        config
      );

      console.log("Controller: Test result:", isValid);

      res.json({
        success: true,
        data: {
          isValid,
          message: isValid
            ? "Configuration is valid"
            : "Configuration test failed",
        },
      });
    } catch (error: any) {
      console.error("Test integration config error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to test integration configuration",
      });
    }
  }

  /**
   * Send test email
   */
  static async sendTestEmail(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const userId = req.user!._id.toString();
      const organizationId = req.organization!._id.toString();
      const { configId } = req.params;
      const { to, subject, message } = req.body;

      const result = await IntegrationService.sendTestEmail(
        userId,
        organizationId,
        configId,
        { to, subject, message }
      );

      res.json({
        success: true,
        message: "Test email sent successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("Send test email error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to send test email",
      });
    }
  }

  /**
   * Get deal by name (supports HubSpot and Zoho)
   */
  static async getDealByName(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const userId = req.user!._id.toString();
      const organizationId = req.organization!._id.toString();
      const { configId } = req.params;
      const { dealName } = req.body;

      const deals = await IntegrationService.getDealByName(
        userId,
        organizationId,
        configId,
        dealName
      );

      res.json({
        success: true,
        message: "Deal retrieved successfully",
        data: {
          dealName,
          deals: deals || [],
          count: Array.isArray(deals) ? deals.length : 0,
        },
      });
    } catch (error: any) {
      console.error("Get deal error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to retrieve deal",
      });
    }
  }

  /**
   * Get HubSpot deal by name (backward compatibility)
   */
  static async getHubSpotDeal(req: AuthRequest, res: Response): Promise<void> {
    return this.getDealByName(req, res);
  }

  /**
   * Delete integration configuration
   */
  static async deleteIntegration(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const organizationId = req.organization!._id.toString();
      const { configId } = req.params;

      const deleted = await IntegrationService.deleteIntegration(
        userId,
        organizationId,
        configId
      );

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: "Integration configuration not found",
        });
        return;
      }

      res.json({
        success: true,
        message: "Integration configuration deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete integration error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete integration configuration",
      });
    }
  }

  /**
   * Perform integration action
   */
  static async performAction(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const userId = req.user!._id.toString();
      const organizationId = req.organization!._id.toString();
      const { configId } = req.params;
      const { payload } = req.body;

      const result = await IntegrationService.performIntegrationAction(
        userId,
        organizationId,
        configId,
        payload
      );

      res.json({
        success: true,
        message: "Action performed successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("Perform integration action error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to perform integration action",
      });
    }
  }

  /**
   * Generate Zoho tokens from auth code
   */
  static async generateZohoTokens(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error(
          "Zoho token generation validation failed:",
          JSON.stringify(errors.array(), null, 2)
        );
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { code, clientId, clientSecret, region, redirectUri } = req.body;

      const tokens = await IntegrationService.generateZohoTokens({
        code,
        clientId,
        clientSecret,
        region,
        redirectUri,
      });

      res.json({
        success: true,
        message: "Zoho tokens generated successfully",
        data: tokens,
      });
    } catch (error) {
      console.error("Generate Zoho tokens error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to generate Zoho tokens",
      });
    }
  }
}

import { IBaseNodeHandler, IExecutionContext, INodeExecutionResult } from './IBaseNodeHandler';

export class ZohoNodeHandler extends IBaseNodeHandler {
  async execute(node: any, context: IExecutionContext): Promise<INodeExecutionResult> {
    try {
      console.log(`🔗 [ZohoNodeHandler] Executing Zoho node ${node.id}`);

      // Get configuration from node
      const config = node.data.config || node.data;
      const action = config.action; // 'GET_DEAL', 'CREATE_DEAL', 'UPDATE_DEAL'

      if (!action) {
        throw new Error('Zoho action is required');
      }

      console.log(`🎯 [ZohoNodeHandler] Action: ${action}`);

      // Get Zoho integration configuration for the organization
      const { IntegrationConfig } = await import('../../../../integrations/common/integration-config.model');
      const integrationConfig = await IntegrationConfig.findOne({
        organizationId: context.organizationId,
        type: 'ZOHO',
        isActive: true
      });

      if (!integrationConfig) {
        throw new Error('No Zoho integration configuration found for this organization. Please configure Zoho integration first.');
      }

      // Parse the configuration - the config field is a JSON string, not encrypted
      // Only individual fields within the config are encrypted
      const { decrypt } = await import('../../../../integrations/common/encryption.util');
      
      console.log('🔍 [ZohoNodeHandler] Raw config from DB:', {
        configLength: integrationConfig.config?.length,
        configPreview: integrationConfig.config?.substring(0, 100) + '...'
      });
      
      // The config field is a JSON string, not encrypted
      const zohoConfig = JSON.parse(integrationConfig.config);

      console.log('🔍 [ZohoNodeHandler] Parsed config structure:', {
        hasRefreshToken: !!zohoConfig.refreshToken,
        hasClientId: !!zohoConfig.clientId,
        hasClientSecret: !!zohoConfig.clientSecret,
        region: zohoConfig.region,
        refreshTokenType: typeof zohoConfig.refreshToken,
        refreshTokenPreview: zohoConfig.refreshToken?.substring(0, 30) + '...'
      });

      // Import Zoho service
      const { ZohoService } = await import('../../../../integrations/providers/zoho/zoho.service');

      let result: any = {};

      // For workflow nodes, we need to find any user from the organization since 
      // the workflow might be triggered without a specific user context
      // Find any user in this organization for the Zoho API call
      const { User } = await import('../../../user/User');
      const orgUser = await User.findOne({ organizationId: context.organizationId });
      
      if (!orgUser) {
        throw new Error('No users found in organization for Zoho integration');
      }
      
      const userId = orgUser._id.toString();

      // Convert _id to string safely
      const configId = integrationConfig._id?.toString() || String(integrationConfig._id);

      // Create ZohoService instance with decrypted config
      // Note: zohoConfig is already decrypted, so we need to decrypt individual fields that were encrypted
      const zohoService = new ZohoService({
        refreshToken: decrypt(zohoConfig.refreshToken),
        clientId: decrypt(zohoConfig.clientId),
        clientSecret: decrypt(zohoConfig.clientSecret),
        region: zohoConfig.region || 'com',
        baseUrl: zohoConfig.baseUrl
      });

      switch (action.toUpperCase()) {
        case 'GET_DEAL':
          result = await this.handleGetDeal(zohoService, config, context);
          break;
        case 'CREATE_DEAL':
          result = await this.handleCreateDeal(zohoService, config, context);
          break;
        case 'UPDATE_DEAL':
          result = await this.handleUpdateDeal(zohoService, userId, context.organizationId, configId, config, context);
          break;
        default:
          throw new Error(`Unsupported Zoho action: ${action}`);
      }

      console.log(`✅ [ZohoNodeHandler] Zoho ${action} completed successfully`);

      return {
        exitHandle: 'success',
        data: {
          zoho_action: action,
          zoho_result: result,
          executed_at: new Date().toISOString()
        }
      };

    } catch (error: any) {
      console.error(`❌ [ZohoNodeHandler] Error in Zoho node ${node.id}:`, error);
      
      return {
        exitHandle: 'error',
        data: {
          error: error.message,
          failed_at: new Date().toISOString()
        }
      };
    }
  }

  private async handleGetDeal(zohoService: any, config: any, context: IExecutionContext): Promise<any> {
    const dealId = this.resolvePlaceholders(config.dealId || '', context);
    
    if (!dealId) {
      throw new Error('Deal ID is required for GET_DEAL action');
    }

    console.log(`📋 [ZohoNodeHandler] Getting deal with ID: ${dealId}`);
    
    try {
      const dealResponse = await zohoService.getDeal(dealId);
      console.log(`✅ [ZohoNodeHandler] Deal retrieved successfully`);
      
      // Zoho returns data in a specific format with data array
      const deal = dealResponse.data && dealResponse.data.length > 0 ? dealResponse.data[0] : dealResponse;
      
      return {
        success: true,
        deal: deal,
        dealId: dealId
      };
    } catch (error: any) {
      console.error(`❌ [ZohoNodeHandler] Failed to get deal:`, error);
      throw new Error(`Failed to get deal: ${error.message}`);
    }
  }

  private async handleCreateDeal(zohoService: any, config: any, context: IExecutionContext): Promise<any> {
    // Check for AI agent variables first, then fall back to config
    let dealName = '';
    let amount = '';
    
    // Try to get deal_name and amount from AI agent output (context.outputs from previous nodes)
    let aiAnalysis = null;
    for (const [nodeId, output] of Object.entries(context.outputs)) {
      if (output && typeof output === 'object' && ((output as any).deal_name || (output as any).amount)) {
        aiAnalysis = output as any;
        console.log(`🤖 [ZohoNodeHandler] Found AI agent data from node ${nodeId}:`, aiAnalysis);
        break;
      }
    }
    if (aiAnalysis) {
      dealName = aiAnalysis.deal_name || '';
      amount = String(aiAnalysis.amount || '');
      console.log(`🤖 [ZohoNodeHandler] Using AI agent data - Deal: ${dealName}, Amount: ${amount}`);
    }
    
    // Fall back to configuration if AI data not available
    if (!dealName) {
      dealName = this.resolvePlaceholders(config.dealName || '', context);
    }
    if (!amount) {
      amount = this.resolvePlaceholders(config.amount || '', context);
    }
    
    // Resolve other placeholders in deal properties
    const stage = this.resolvePlaceholders(config.stage || '', context);
    const closingDate = this.resolvePlaceholders(config.closingDate || '', context);
    const dealType = this.resolvePlaceholders(config.dealType || '', context);
    const description = this.resolvePlaceholders(config.description || '', context);

    if (!dealName) {
      throw new Error('Deal name is required for CREATE_DEAL action (from AI agent or configuration)');
    }

    console.log(`🆕 [ZohoNodeHandler] Creating deal: ${dealName}`);

    // Build deal data object using Zoho's expected format
    const dealData: any = {
      Deal_Name: dealName
    };

    if (amount) {
      dealData.Amount = parseFloat(amount) || amount;
    }
    if (stage) {
      dealData.Stage = stage;
    }
    if (closingDate) {
      dealData.Closing_Date = closingDate;
    }
    if (dealType) {
      dealData.Type = dealType;
    }
    if (description) {
      dealData.Description = description;
    }

    // Add any custom properties from config
    if (config.customProperties) {
      for (const [key, value] of Object.entries(config.customProperties)) {
        dealData[key] = this.resolvePlaceholders(String(value), context);
      }
    }

    try {
      const createdDealResponse = await zohoService.createDeal(dealData);
      console.log(`✅ [ZohoNodeHandler] Deal created successfully`);
      
      // Zoho returns data in a specific format with data array
      const createdDeal = createdDealResponse.data && createdDealResponse.data.length > 0 ? createdDealResponse.data[0] : createdDealResponse;
      
      return {
        success: true,
        deal: createdDeal,
        dealId: createdDeal.details?.id || createdDeal.id,
        dealData: dealData
      };
    } catch (error: any) {
      console.error(`❌ [ZohoNodeHandler] Failed to create deal:`, error);
      throw new Error(`Failed to create deal: ${error.message}`);
    }
  }

  private async handleUpdateDeal(zohoService: any, userId: string, organizationId: string, configId: string, config: any, context: IExecutionContext): Promise<any> {
    // Get deal name for searching - either from AI Agent or config
    let searchDealName = '';
    
    // Check for AI agent variables first, then fall back to config
    let aiAnalysis = null;
    for (const [nodeId, output] of Object.entries(context.outputs)) {
      if (output && typeof output === 'object' && ((output as any).deal_name || (output as any).amount)) {
        aiAnalysis = output as any;
        console.log(`🤖 [ZohoNodeHandler] Found AI agent data from node ${nodeId}:`, aiAnalysis);
        break;
      }
    }
    
    if (aiAnalysis?.deal_name) {
      searchDealName = aiAnalysis.deal_name;
      console.log(`🤖 [ZohoNodeHandler] Using AI agent deal name for search: ${searchDealName}`);
    } else if (config.dealName) {
      searchDealName = this.resolvePlaceholders(config.dealName, context);
    }
    
    if (!searchDealName) {
      throw new Error('Deal name is required for UPDATE_DEAL action to search for existing deals');
    }

    console.log(`🔍 [ZohoNodeHandler] Searching for deals with name: ${searchDealName}`);
    
    // Search for deals by name using ZohoService
    let dealId = '';
    try {
      // Import ZohoService to use the searchDealsByName method
      const { ZohoService } = await import('../../../../integrations/providers/zoho/zoho.service');
      const searchResults = await ZohoService.searchDealsByName(userId, organizationId, configId, searchDealName);
      
      if (!searchResults || searchResults.length === 0) {
        throw new Error(`No deals found with name: ${searchDealName}`);
      }
      
      // Use the first match - Zoho deals have 'id' field
      dealId = searchResults[0].id;
      console.log(`✅ [ZohoNodeHandler] Found deal with ID: ${dealId} for name: ${searchDealName}`);
      
    } catch (error: any) {
      console.error(`❌ [ZohoNodeHandler] Failed to search for deal:`, error);
      throw new Error(`Failed to find deal by name "${searchDealName}": ${error.message}`);
    }

    console.log(`📝 [ZohoNodeHandler] Updating deal with ID: ${dealId}`);

    // Build update properties object using Zoho field names
    const updateData: any = {};

    // Handle amount - prioritize AI agent data over config
    let amount = '';
    if (aiAnalysis?.amount) {
      amount = String(aiAnalysis.amount);
      console.log(`🤖 [ZohoNodeHandler] Using AI agent amount: ${amount}`);
    } else if (config.amount) {
      amount = this.resolvePlaceholders(config.amount, context);
    }
    if (amount) {
      updateData.Amount = parseFloat(amount) || amount;
    }

    // Handle other fields from config (Deal_Name is already set during search)
    if (config.stage) {
      updateData.Stage = this.resolvePlaceholders(config.stage, context);
    }
    if (config.closingDate) {
      updateData.Closing_Date = this.resolvePlaceholders(config.closingDate, context);
    }
    if (config.dealType) {
      updateData.Type = this.resolvePlaceholders(config.dealType, context);
    }
    if (config.description) {
      updateData.Description = this.resolvePlaceholders(config.description, context);
    }

    // Add any custom properties from config
    if (config.customProperties) {
      for (const [key, value] of Object.entries(config.customProperties)) {
        updateData[key] = this.resolvePlaceholders(String(value), context);
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No properties specified for UPDATE_DEAL action');
    }

    try {
      const updatedDealResponse = await zohoService.updateDeal(dealId, updateData);
      console.log(`✅ [ZohoNodeHandler] Deal updated successfully`);
      
      // Zoho returns data in a specific format with data array
      const updatedDeal = updatedDealResponse.data && updatedDealResponse.data.length > 0 ? updatedDealResponse.data[0] : updatedDealResponse;
      
      return {
        success: true,
        deal: updatedDeal,
        dealId: dealId,
        updatedProperties: updateData
      };
    } catch (error: any) {
      console.error(`❌ [ZohoNodeHandler] Failed to update deal:`, error);
      throw new Error(`Failed to update deal: ${error.message}`);
    }
  }
}
import { IBaseNodeHandler, IExecutionContext, INodeExecutionResult } from './IBaseNodeHandler';

export class HubSpotNodeHandler extends IBaseNodeHandler {
  async execute(node: any, context: IExecutionContext): Promise<INodeExecutionResult> {
    try {
      console.log(`🔗 [HubSpotNodeHandler] Executing HubSpot node ${node.id}`);

      // Get configuration from node
      const config = node.data.config || node.data;
      const action = config.action; // 'GET_DEAL', 'CREATE_DEAL', 'UPDATE_DEAL'

      if (!action) {
        throw new Error('HubSpot action is required');
      }

      console.log(`🎯 [HubSpotNodeHandler] Action: ${action}`);

      // Get HubSpot integration configuration for the organization
      const { IntegrationConfig } = await import('../../../../integrations/common/integration-config.model');
      const integrationConfig = await IntegrationConfig.findOne({
        organizationId: context.organizationId,
        type: 'HUBSPOT',
        isActive: true
      });

      if (!integrationConfig) {
        throw new Error('No HubSpot integration configuration found for this organization. Please configure HubSpot integration first.');
      }

      // Parse the encrypted configuration
      const { decrypt } = await import('../../../../integrations/common/encryption.util');
      const decryptedConfigStr = decrypt(integrationConfig.config);
      const hubspotConfig = JSON.parse(decryptedConfigStr);

      // Import HubSpot service
      const { HubSpotService } = await import('../../../../integrations/providers/hubspot/hubspot.service');

      let result: any = {};

      // For workflow nodes, we need to find any user from the organization since 
      // the workflow might be triggered without a specific user context
      // Find any user in this organization for the HubSpot API call
      const { User } = await import('../../../user/User');
      const orgUser = await User.findOne({ organizationId: context.organizationId });
      
      if (!orgUser) {
        throw new Error('No users found in organization for HubSpot integration');
      }
      
      const userId = orgUser._id.toString();

      // Convert _id to string safely
      const configId = integrationConfig._id?.toString() || String(integrationConfig._id);

      switch (action.toUpperCase()) {
        case 'GET_DEAL':
          result = await this.handleGetDeal(HubSpotService, userId, context.organizationId, configId, config, context);
          break;
        case 'CREATE_DEAL':
          result = await this.handleCreateDeal(HubSpotService, userId, context.organizationId, configId, config, context);
          break;
        case 'UPDATE_DEAL':
          result = await this.handleUpdateDeal(HubSpotService, userId, context.organizationId, configId, config, context);
          break;
        default:
          throw new Error(`Unsupported HubSpot action: ${action}`);
      }

      console.log(`✅ [HubSpotNodeHandler] HubSpot ${action} completed successfully`);

      return {
        exitHandle: 'success',
        data: {
          hubspot_action: action,
          hubspot_result: result,
          executed_at: new Date().toISOString()
        }
      };

    } catch (error: any) {
      console.error(`❌ [HubSpotNodeHandler] Error in HubSpot node ${node.id}:`, error);
      
      return {
        exitHandle: 'error',
        data: {
          error: error.message,
          failed_at: new Date().toISOString()
        }
      };
    }
  }

  private async handleGetDeal(hubspotService: any, userId: string, organizationId: string, configId: string, config: any, context: IExecutionContext): Promise<any> {
    const dealId = this.resolvePlaceholders(config.dealId || '', context);
    
    if (!dealId) {
      throw new Error('Deal ID is required for GET_DEAL action');
    }

    console.log(`📋 [HubSpotNodeHandler] Getting deal with ID: ${dealId}`);
    
    try {
      const deal = await hubspotService.getDeal(userId, organizationId, configId, dealId);
      console.log(`✅ [HubSpotNodeHandler] Deal retrieved successfully`);
      return {
        success: true,
        deal: deal,
        dealId: dealId
      };
    } catch (error: any) {
      console.error(`❌ [HubSpotNodeHandler] Failed to get deal:`, error);
      throw new Error(`Failed to get deal: ${error.message}`);
    }
  }

  private async handleCreateDeal(hubspotService: any, userId: string, organizationId: string, configId: string, config: any, context: IExecutionContext): Promise<any> {
    // Check for AI agent variables first, then fall back to config
    let dealName = '';
    let amount = '';
    
    // Try to get deal_name and amount from AI agent output (context.outputs from previous nodes)
    let aiAnalysis = null;
    for (const [nodeId, output] of Object.entries(context.outputs)) {
      if (output && typeof output === 'object' && ((output as any).deal_name || (output as any).amount)) {
        aiAnalysis = output as any;
        console.log(`🤖 [HubSpotNodeHandler] Found AI agent data from node ${nodeId}:`, aiAnalysis);
        break;
      }
    }
    if (aiAnalysis) {
      dealName = aiAnalysis.deal_name || '';
      amount = String(aiAnalysis.amount || '');
      console.log(`🤖 [HubSpotNodeHandler] Using AI agent data - Deal: ${dealName}, Amount: ${amount}`);
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
    const closeDate = this.resolvePlaceholders(config.closeDate || '', context);
    const dealType = this.resolvePlaceholders(config.dealType || '', context);
    const description = this.resolvePlaceholders(config.description || '', context);

    if (!dealName) {
      throw new Error('Deal name is required for CREATE_DEAL action (from AI agent or configuration)');
    }

    console.log(`🆕 [HubSpotNodeHandler] Creating deal: ${dealName}`);

    // Build deal data object using the service's expected format
    const dealData: any = {
      dealName: dealName
    };

    if (amount) {
      dealData.amount = parseFloat(amount) || amount;
    }
    if (stage) {
      dealData.dealStage = stage;
    }
    // Add any custom properties from config
    if (config.customProperties) {
      dealData.properties = {};
      for (const [key, value] of Object.entries(config.customProperties)) {
        dealData.properties[key] = this.resolvePlaceholders(String(value), context);
      }
    }

    // Add standard properties to custom properties if they exist
    if (!dealData.properties) {
      dealData.properties = {};
    }
    if (closeDate) {
      dealData.properties.closedate = closeDate;
    }
    if (dealType) {
      dealData.properties.dealtype = dealType;
    }
    if (description) {
      dealData.properties.description = description;
    }

    try {
      const createdDeal = await hubspotService.createDeal(userId, organizationId, configId, dealData);
      console.log(`✅ [HubSpotNodeHandler] Deal created successfully with ID: ${createdDeal.id}`);
      
      return {
        success: true,
        deal: createdDeal,
        dealId: createdDeal.id,
        dealData: dealData
      };
    } catch (error: any) {
      console.error(`❌ [HubSpotNodeHandler] Failed to create deal:`, error);
      throw new Error(`Failed to create deal: ${error.message}`);
    }
  }

  private async handleUpdateDeal(hubspotService: any, userId: string, organizationId: string, configId: string, config: any, context: IExecutionContext): Promise<any> {
    // Get deal name for searching - either from AI Agent or config
    let searchDealName = '';
    
    // Check for AI agent variables first, then fall back to config
    let aiAnalysis = null;
    for (const [nodeId, output] of Object.entries(context.outputs)) {
      if (output && typeof output === 'object' && ((output as any).deal_name || (output as any).amount)) {
        aiAnalysis = output as any;
        console.log(`🤖 [HubSpotNodeHandler] Found AI agent data from node ${nodeId}:`, aiAnalysis);
        break;
      }
    }
    
    if (aiAnalysis?.deal_name) {
      searchDealName = aiAnalysis.deal_name;
      console.log(`🤖 [HubSpotNodeHandler] Using AI agent deal name for search: ${searchDealName}`);
    } else if (config.dealName) {
      searchDealName = this.resolvePlaceholders(config.dealName, context);
    }
    
    if (!searchDealName) {
      throw new Error('Deal name is required for UPDATE_DEAL action to search for existing deals');
    }

    console.log(`🔍 [HubSpotNodeHandler] Searching for deals with name: ${searchDealName}`);
    
    // Search for deals by name
    let dealId = '';
    try {
      const searchResults = await hubspotService.searchDealsByName(userId, organizationId, configId, searchDealName);
      
      if (!searchResults || searchResults.length === 0) {
        throw new Error(`No deals found with name: ${searchDealName}`);
      }
      
      // Use the first match
      dealId = searchResults[0].id;
      console.log(`✅ [HubSpotNodeHandler] Found deal with ID: ${dealId} for name: ${searchDealName}`);
      
    } catch (error: any) {
      console.error(`❌ [HubSpotNodeHandler] Failed to search for deal:`, error);
      throw new Error(`Failed to find deal by name "${searchDealName}": ${error.message}`);
    }

    console.log(`📝 [HubSpotNodeHandler] Updating deal with ID: ${dealId}`);

    // Build update properties object
    const updateProperties: any = {};

    // Handle amount - prioritize AI agent data over config
    let amount = '';
    if (aiAnalysis?.amount) {
      amount = String(aiAnalysis.amount);
      console.log(`🤖 [HubSpotNodeHandler] Using AI agent amount: ${amount}`);
    } else if (config.amount) {
      amount = this.resolvePlaceholders(config.amount, context);
    }
    if (amount) {
      updateProperties.amount = parseFloat(amount) || amount;
    }

    // Handle other fields from config (dealname is already set during search)
    if (config.stage) {
      updateProperties.dealstage = this.resolvePlaceholders(config.stage, context);
    }
    if (config.closeDate) {
      updateProperties.closedate = this.resolvePlaceholders(config.closeDate, context);
    }
    if (config.dealType) {
      updateProperties.dealtype = this.resolvePlaceholders(config.dealType, context);
    }
    if (config.description) {
      updateProperties.description = this.resolvePlaceholders(config.description, context);
    }

    // Add any custom properties from config
    if (config.customProperties) {
      for (const [key, value] of Object.entries(config.customProperties)) {
        updateProperties[key] = this.resolvePlaceholders(String(value), context);
      }
    }

    if (Object.keys(updateProperties).length === 0) {
      throw new Error('No properties specified for UPDATE_DEAL action');
    }

    try {
      const updatedDeal = await hubspotService.updateDeal(userId, organizationId, configId, dealId, updateProperties);
      console.log(`✅ [HubSpotNodeHandler] Deal updated successfully`);
      
      return {
        success: true,
        deal: updatedDeal,
        dealId: dealId,
        updatedProperties: updateProperties
      };
    } catch (error: any) {
      console.error(`❌ [HubSpotNodeHandler] Failed to update deal:`, error);
      throw new Error(`Failed to update deal: ${error.message}`);
    }
  }
}
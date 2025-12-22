import { IBaseNodeHandler, IExecutionContext, INodeExecutionResult } from './IBaseNodeHandler';

export class OutboundCallNodeHandler extends IBaseNodeHandler {
  async execute(node: any, context: IExecutionContext): Promise<INodeExecutionResult> {
    try {
      console.log(`📞 [OutboundCallNodeHandler] Executing outbound call node ${node.id}`);
      
      const config = node.data?.config || node.data || {};
      const { assistantId } = config;

      // Validate required assistant ID
      if (!assistantId) {
        throw new Error('Assistant ID is required for outbound call');
      }

      // Get phone number and contact name from the original call data in session
      const { Call } = await import('../../../../models/Call');
      
      // First try to get from session if available
      let phoneNumber = null;
      let contactName = null;
      
      if (context.session?.callId) {
        console.log(`📞 [OutboundCallNodeHandler] Looking up call data for callId: ${context.session.callId}`);
        
        // Find the original call using the callId from session
        const originalCall = await Call.findOne({ 
          $or: [
            { callId: context.session.callId },
            { twilioSid: context.session.callId }
          ]
        });
        
        if (originalCall) {
          phoneNumber = originalCall.contactPhone;
          contactName = originalCall.contactName;
          console.log(`📞 [OutboundCallNodeHandler] Found call data:`, {
            phoneNumber,
            contactName
          });
        } else {
          console.warn(`⚠️ [OutboundCallNodeHandler] No call found for callId: ${context.session.callId}`);
        }
      }
      
      // Fallback: check if phone number and contact name are in webhook payload
      if (!phoneNumber || !contactName) {
        const phoneCallPayload = context.session?.payloads?.find((p: any) => 
          p.type === 'PHONE_CALL_CONNECTED' || p.type === 'PHONE_CALL_ENDED'
        );
        
        if (phoneCallPayload?.data) {
          phoneNumber = phoneNumber || phoneCallPayload.data.contactPhone || phoneCallPayload.data.to || phoneCallPayload.data.from;
          contactName = contactName || phoneCallPayload.data.contactName || phoneCallPayload.data.customer_name;
        }
      }

      // Validate that we have the required data
      if (!phoneNumber) {
        throw new Error('Phone number not found in call data. Cannot initiate outbound call.');
      }
      if (!contactName) {
        throw new Error('Contact name not found in call data. Cannot initiate outbound call.');
      }

      // Resolve placeholders in the assistant ID (phone number and contact name come from call data)
      const resolvedAssistantId = this.resolvePlaceholders(assistantId, context);

      console.log(`📞 [OutboundCallNodeHandler] Initiating call:`, {
        assistantId: resolvedAssistantId,
        phoneNumber,
        contactName
      });

      // Import CallService to use the demoCreateCallWithAgent method
      const { callService } = await import('../../../calls/services/CallService');
      
      // Create the call using the same logic as the Create Outbound Call modal
      const result = await callService.demoCreateCallWithAgent(context.organizationId, {
        assistantId: resolvedAssistantId,
        toNumber: phoneNumber,
        contactName: contactName
      });

      console.log(`✅ [OutboundCallNodeHandler] Call initiated successfully:`, result);

      return {
        exitHandle: 'success',
        data: {
          call_id: result.callId,
          phone_number: phoneNumber,
          contact_name: contactName,
          assistant_id: resolvedAssistantId,
          status: result.status || 'initiated',
          initiated_at: new Date().toISOString()
        }
      };

    } catch (error: any) {
      console.error(`❌ [OutboundCallNodeHandler] Error in outbound call node ${node.id}:`, error);
      
      return {
        exitHandle: 'error',
        data: {
          error: error.message,
          failed_at: new Date().toISOString()
        }
      };
    }
  }


}
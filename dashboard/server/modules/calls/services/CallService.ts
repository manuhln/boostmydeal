import { Call } from '../../../models/Call';
import { Callback } from '../../../models/Callback';
import { Agent } from '../../agent/Agent';
import { PhoneNumber } from '../../phone_number/PhoneNumber';
import { outboundCallQueue } from '../redis/queues';
import { decrypt } from '../../../integrations/common/encryption.util';
import { callDAL } from '../../../dal/call.dal';
import { callTimeoutQueue } from '../workers/callTimeoutChecker';

export interface CallInitiationPayload {
  assistantId: string;
  toNumber: string;
  message: string;
}

export interface CallQueuePayload {
  provider: string;
  config: {
    account_sid: string;
    auth_token: string;
    from_number: string;
    twiml_url: string;
  };
  to_number: string;
  message: string;
  assistantId: string;
  organizationId: string;
  workspaceId?: string;
  user_tags?: string[];
  system_tags?: string[];
  // Call settings
  callRecording?: boolean;
  callRecordingFormat?: string;
  backgroundAmbientSound?: string;
  rememberLeadPreference?: boolean;
  voicemailDetection?: boolean;
  voicemailMessage?: string;
  // Call transfer settings
  enableCallTransfer?: boolean;
  transferPhoneNumber?: string;
}

export class CallService {
  /**
   * Get all calls for an organization
   */
  async getCallsByOrganization(organizationId: string) {
    console.log(`📋 [CallService] Retrieving calls for organization: ${organizationId}`);
    
    try {
      const calls = await callDAL.findCallsByOrganization(organizationId);
      console.log(`✅ [CallService] Found ${calls.length} calls for organization`);
      return calls;
    } catch (error) {
      console.error(`❌ [CallService] Error retrieving calls:`, error);
      throw error;
    }
  }

  /**
   * Get calls for organization with filters and pagination
   */
  async getCallsByOrganizationWithFilters(organizationId: string, filters: any) {
    console.log(`📋 [CallService] Retrieving filtered calls for organization: ${organizationId}`);
    console.log(`🔍 [CallService] Applied filters:`, filters);
    
    try {
      const result = await callDAL.getPaginatedCalls(organizationId, filters.page || 1, filters.limit || 20, filters);
      console.log(`✅ [CallService] Found ${result.data.length} calls out of ${result.total} total`);
      return result; // Return full result with data and total
    } catch (error) {
      console.error(`❌ [CallService] Error retrieving filtered calls:`, error);
      throw error;
    }
  }

  /**
   * Get filtered calls for export (no pagination)
   */
  async getFilteredCalls(organizationId: string, filters: any) {
    console.log(`📊 [CallService] Retrieving filtered calls for export: ${organizationId}`);
    console.log(`🔍 [CallService] Applied export filters:`, filters);
    
    try {
      // Use existing filtering logic but without pagination
      const calls = await callDAL.getFilteredCalls(organizationId, filters);
      console.log(`✅ [CallService] Found ${calls.length} calls for export`);
      return calls;
    } catch (error) {
      console.error(`❌ [CallService] Error retrieving filtered calls for export:`, error);
      throw error;
    }
  }

  /**
   * Prepare call payload for queue processing (extracted from initiateCall)
   */
  async prepareCallForQueue(payload: CallInitiationPayload, organizationId: string): Promise<{ success: boolean; message: string; payload?: CallQueuePayload }> {
    try {
      console.log(`🎯 [CallService] Preparing call for queue - assistant: ${payload.assistantId}, organization: ${organizationId}`);
      
      // Step 1: Fetch the assistant/agent object
      console.log(`📋 [CallService] Fetching agent with ID: ${payload.assistantId}`);
      const agent = await Agent.findOne({ 
        _id: payload.assistantId, 
        organizationId: organizationId 
      });

      if (!agent) {
        console.error(`❌ [CallService] Agent not found: ${payload.assistantId} for organization: ${organizationId}`);
        return { success: false, message: 'Assistant not found or access denied' };
      }

      console.log(`✅ [CallService] Agent found: ${agent.name}, phoneNumberId: ${agent.phoneNumberId}`);

      // Step 2: Get phoneNumberId and fetch phone number config
      if (!agent.phoneNumberId) {
        console.error(`❌ [CallService] Agent ${agent.name} has no phoneNumberId configured`);
        return { success: false, message: 'Assistant has no phone number configured' };
      }

      console.log(`📞 [CallService] Fetching phone number with ID: ${agent.phoneNumberId}`);
      let phoneNumber = await PhoneNumber.findOne({ 
        _id: agent.phoneNumberId, 
        organizationId: organizationId 
      });

      // If not found in the organization, try to find it without org constraint for debugging
      if (!phoneNumber) {
        console.warn(`⚠️  [CallService] Phone number not found in organization ${organizationId}, checking if it exists elsewhere...`);
        const phoneNumberAnyOrg = await PhoneNumber.findOne({ _id: agent.phoneNumberId });
        if (phoneNumberAnyOrg) {
          console.warn(`⚠️  [CallService] Phone number EXISTS but belongs to organization: ${phoneNumberAnyOrg.organizationId}, expected: ${organizationId}`);
        } else {
          console.warn(`⚠️  [CallService] Phone number does not exist in database at all`);
        }
        console.error(`❌ [CallService] Phone number not found: ${agent.phoneNumberId} for organization: ${organizationId}`);
        return { success: false, message: 'Phone number configuration not found' };
      }

      console.log(`✅ [CallService] Phone number found: ${phoneNumber.phoneNumber}, provider: ${phoneNumber.provider}`);

      // Step 3: Decrypt credentials and prepare call payload
      console.log(`🔓 [CallService] Decrypting credentials for provider: ${phoneNumber.provider}`);
      const decryptedAccountSid = decrypt(phoneNumber.accountSid);
      const decryptedAuthToken = decrypt(phoneNumber.authToken);

      console.log(`🔧 [CallService] Credentials decrypted successfully, account SID length: ${decryptedAccountSid.length}`);

      // Prepare the queue payload
      const callQueuePayload: CallQueuePayload = {
        provider: phoneNumber.provider,
        config: {
          account_sid: decryptedAccountSid,
          auth_token: decryptedAuthToken,
          from_number: phoneNumber.phoneNumber,
          twiml_url: process.env.TWILIO_TWIML_URL || 'https://handler.twilio.com/twiml/EH74e428ffd64e795d5e2dba74362e1380'
        },
        to_number: payload.toNumber,
        message: payload.message,
        assistantId: payload.assistantId,
        organizationId: organizationId,
        workspaceId: phoneNumber.workspaceId?.toString() || '1',
        user_tags: agent.userTags || [],
        system_tags: agent.systemTags || [],
        // Include call settings from agent
        callRecording: agent.callRecording,
        callRecordingFormat: agent.callRecordingFormat,
        backgroundAmbientSound: agent.backgroundAmbientSound,
        rememberLeadPreference: agent.rememberLeadPreference,
        voicemailDetection: agent.voicemailDetection,
        voicemailMessage: agent.voicemailMessage,
        // Include call transfer settings from agent
        enableCallTransfer: agent.enableCallTransfer,
        transferPhoneNumber: agent.transferPhoneNumber
      };

      console.log(`📦 [CallService] Call payload prepared for queue:`, {
        provider: callQueuePayload.provider,
        to_number: callQueuePayload.to_number,
        assistantId: callQueuePayload.assistantId,
        user_tags: callQueuePayload.user_tags,
        system_tags: callQueuePayload.system_tags
      });

      return { 
        success: true, 
        message: 'Call payload prepared successfully',
        payload: callQueuePayload
      };

    } catch (error) {
      console.error(`❌ [CallService] Error preparing call for queue:`, error);
      return { 
        success: false, 
        message: 'Failed to prepare call payload', 
      };
    }
  }

  /**
   * Get webhook data for a specific call
   */
  async getCallWebhookData(callId: string, organizationId: string): Promise<any> {
    try {
      console.log(`🔍 [CallService] Getting webhook data for call: ${callId}`);
      
      let call;
      
      // First try to find by twilioSid
      call = await Call.findOne({
        twilioSid: callId,
        organizationId: organizationId
      });
      
      // If not found by twilioSid, try by MongoDB _id (only if it looks like a valid ObjectId)
      if (!call && callId.match(/^[0-9a-fA-F]{24}$/)) {
        call = await Call.findOne({
          _id: callId,
          organizationId: organizationId
        });
      }

      if (!call) {
        console.log(`❌ [CallService] Call not found with ID/TwilioSid: ${callId}`);
        return null;
      }

      console.log(`✅ [CallService] Found call with ${call.webhookPayload?.length || 0} webhook entries`);
      console.log(`🔍 [CallService] Webhook types found:`, call.webhookPayload?.map(w => w.type).join(', ') || 'none');
      
      return {
        callId: call._id,
        twilioSid: call.twilioSid,
        status: call.status,
        duration: call.duration,
        transcript: call.transcript, // Include transcript field
        webhookPayload: call.webhookPayload,
        updatedAt: call.updatedAt
      };

    } catch (error) {
      console.error(`❌ [CallService] Error getting webhook data:`, error);
      return null;
    }
  }

  /**
   * Update call record from Twilio webhook
   */
  async updateCallFromWebhook(twilioSid: string, webhookData: any): Promise<boolean> {
    console.log(`🔄 [CallService] Updating call record for Twilio SID: ${twilioSid}`);
    console.log(`📋 [CallService] Webhook status: ${webhookData.CallStatus}`);
    
    try {
      // Find the call record first to append to existing webhooks
      const callRecord = await Call.findOne({ twilioSid: twilioSid });
      
      if (!callRecord) {
        console.error(`❌ [CallService] Call not found with Twilio SID: ${twilioSid}`);
        return false;
      }

      // Create webhook entry for Twilio webhook
      const webhookEntry = {
        type: 'TWILIO_STATUS_UPDATE',
        call_id: twilioSid,
        data: webhookData,
        timestamp: new Date()
      };

      // Initialize webhookPayload as array if it doesn't exist or is not an array
      const existingWebhooks = Array.isArray(callRecord.webhookPayload) ? callRecord.webhookPayload : [];
      
      // Add new webhook entry to the array
      const updatedWebhooks = [...existingWebhooks, webhookEntry];

      // Extract relevant data from webhook
      const updateData: any = {
        status: this.mapTwilioStatus(webhookData.CallStatus),
        updatedAt: new Date(),
        webhookPayload: updatedWebhooks
      };

      // Add duration if call is completed
      if (webhookData.CallDuration) {
        updateData.duration = parseInt(webhookData.CallDuration);
        console.log(`📞 [CallService] Call duration: ${updateData.duration} seconds`);
      }

      // Add additional webhook fields
      if (webhookData.Direction) updateData.direction = webhookData.Direction;
      if (webhookData.ToCountry) updateData.toCountry = webhookData.ToCountry;
      if (webhookData.ToState) updateData.toState = webhookData.ToState;
      if (webhookData.ToCity) updateData.toCity = webhookData.ToCity;

      console.log(`🔄 [CallService] Updating call with data:`, {
        status: updateData.status,
        duration: updateData.duration,
        webhookCount: updatedWebhooks.length
      });

      const updatedCall = await callDAL.updateCallByTwilioSid(twilioSid, updateData);
      
      if (!updatedCall) {
        console.error(`❌ [CallService] Call not found with Twilio SID: ${twilioSid}`);
        return false;
      }

      console.log(`✅ [CallService] Call record updated successfully with ${updatedWebhooks.length} webhook entries`);
      return true;

    } catch (error) {
      console.error(`❌ [CallService] Error updating call from webhook:`, error);
      return false;
    }
  }

  /**
   * Update call status based on webhook event type (not just Twilio status)
   */
  async updateCallFromWebhookEvent(callId: string, eventType: string, webhookData: any): Promise<boolean> {
    console.log(`🔄 [CallService] Updating call for event: ${eventType}, call ID: ${callId}`);
    
    try {
      const callRecord = await Call.findOne({ twilioSid: callId });
      
      if (!callRecord) {
        console.error(`❌ [CallService] Call not found with ID: ${callId}`);
        return false;
      }

      // Create webhook entry
      const webhookEntry = {
        type: eventType,
        call_id: callId,
        data: webhookData,
        timestamp: new Date()
      };

      // Initialize webhookPayload as array if it doesn't exist
      const existingWebhooks = Array.isArray(callRecord.webhookPayload) ? callRecord.webhookPayload : [];
      const updatedWebhooks = [...existingWebhooks, webhookEntry];

      const updateData: any = {
        updatedAt: new Date(),
        webhookPayload: updatedWebhooks
      };

      // Update call status based on event type
      switch (eventType) {
        case 'PHONE_CALL_CONNECTED':
          updateData.status = 'in-progress';
          if (webhookData.timestamp) {
            updateData.startedAt = new Date(webhookData.timestamp);
          }
          console.log(`✅ [CallService] Call connected, updating status to in-progress`);
          break;
        case 'PHONE_CALL_ENDED':
          updateData.status = 'completed';
          if (webhookData.duration) {
            updateData.duration = webhookData.duration;
          }
          if (webhookData.end_reason) {
            updateData.endReason = webhookData.end_reason;
          }
          console.log(`✅ [CallService] Call ended, updating status to completed`);
          break;
        case 'TRANSCRIPT_COMPLETE':
          // Extract and save transcript from webhook data
          if (webhookData.full_transcript) {
            updateData.transcript = webhookData.full_transcript;
            console.log(`📄 [CallService] Saving transcript to database: ${webhookData.full_transcript.substring(0, 100)}...`);
          }
          // Extract and save cost from webhook data
          if (webhookData.total_call_cost_breakdown?.grand_total_usd) {
            updateData.cost = webhookData.total_call_cost_breakdown.grand_total_usd;
            console.log(`💰 [CallService] Saving call cost to database: $${webhookData.total_call_cost_breakdown.grand_total_usd}`);
          }
          // Check for voicemail detection in transcript
          if (webhookData.is_voicemail || webhookData.voicemail_detected) {
            updateData.status = 'voicemail';
            console.log(`📧 [CallService] Voicemail detected, updating status to voicemail`);
          }
          break;
        default:
          console.log(`📋 [CallService] No status update needed for event type: ${eventType}`);
      }

      const updatedCall = await callDAL.updateCallByTwilioSid(callRecord.twilioSid || '', updateData);
      
      if (updatedCall) {
        console.log(`✅ [CallService] Call record updated successfully for ${eventType}`);
        return true;
      }
      
      return false;

    } catch (error) {
      console.error(`❌ [CallService] Error updating call from webhook event:`, error);
      return false;
    }
  }

  /**
   * Map Twilio call status to our internal status
   */
  private mapTwilioStatus(twilioStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'queued': 'queued',
      'ringing': 'ringing', 
      'in-progress': 'in-progress',
      'completed': 'completed',
      'busy': 'failed',
      'failed': 'failed',
      'no-answer': 'failed',
      'canceled': 'cancelled'
    };

    return statusMap[twilioStatus] || twilioStatus;
  }

  /**
   * Initiate an outbound call by resolving provider config and queueing
   */
  async initiateCall(payload: CallInitiationPayload, organizationId: string): Promise<{ success: boolean; message: string; callId?: string }> {
    try {
      console.log(`🎯 [CallService] Initiating call for assistant: ${payload.assistantId}, organization: ${organizationId}`);
      
      // Check for duplicate/recent calls to prevent multiple initiations
      const recentCall = await Call.findOne({
        organizationId: organizationId,
        assistantId: payload.assistantId,
        contactPhone: payload.toNumber,
        status: { $in: ['queued', 'in-progress', 'ringing', 'answered'] },
        createdAt: { $gte: new Date(Date.now() - 60000) } // Within last 60 seconds
      });

      if (recentCall) {
        console.log(`⚠️ [CallService] Recent active call found for ${payload.toNumber}, skipping duplicate`);
        return {
          success: false,
          message: 'A call to this number is already in progress or was initiated recently',
          callId: recentCall._id.toString()
        };
      }
      
      // Step 1: Fetch the assistant/agent object
      console.log(`📋 [CallService] Fetching agent with ID: ${payload.assistantId}`);
      const agent = await Agent.findOne({ 
        _id: payload.assistantId, 
        organizationId: organizationId 
      });

      if (!agent) {
        console.error(`❌ [CallService] Agent not found: ${payload.assistantId} for organization: ${organizationId}`);
        return { success: false, message: 'Assistant not found or access denied' };
      }

      console.log(`✅ [CallService] Agent found: ${agent.name}, phoneNumberId: ${agent.phoneNumberId}`);

      // Step 2: Get phoneNumberId and fetch phone number config
      if (!agent.phoneNumberId) {
        console.error(`❌ [CallService] Agent ${agent.name} has no phoneNumberId configured`);
        return { success: false, message: 'Assistant has no phone number configured' };
      }

      console.log(`📞 [CallService] Fetching phone number with ID: ${agent.phoneNumberId}`);
      let phoneNumber = await PhoneNumber.findOne({ 
        _id: agent.phoneNumberId, 
        organizationId: organizationId 
      });

      // If not found in the organization, try to find it without org constraint for debugging
      if (!phoneNumber) {
        console.warn(`⚠️  [CallService] Phone number not found in organization ${organizationId}, checking if it exists elsewhere...`);
        const phoneNumberAnyOrg = await PhoneNumber.findOne({ _id: agent.phoneNumberId });
        if (phoneNumberAnyOrg) {
          console.warn(`⚠️  [CallService] Phone number EXISTS but belongs to organization: ${phoneNumberAnyOrg.organizationId}, expected: ${organizationId}`);
        } else {
          console.warn(`⚠️  [CallService] Phone number does not exist in database at all`);
        }
        console.error(`❌ [CallService] Phone number not found: ${agent.phoneNumberId} for organization: ${organizationId}`);
        return { success: false, message: 'Phone number configuration not found' };
      }

      console.log(`✅ [CallService] Phone number found: ${phoneNumber.phoneNumber}, provider: ${phoneNumber.provider}`);

      // Step 3: Decrypt credentials and prepare call payload
      console.log(`🔓 [CallService] Decrypting credentials for provider: ${phoneNumber.provider}`);
      const decryptedAccountSid = decrypt(phoneNumber.accountSid);
      const decryptedAuthToken = decrypt(phoneNumber.authToken);

      console.log(`🔧 [CallService] Credentials decrypted successfully, account SID length: ${decryptedAccountSid.length}`);

      // Prepare the queue payload
      const callQueuePayload: CallQueuePayload = {
        provider: phoneNumber.provider,
        config: {
          account_sid: decryptedAccountSid,
          auth_token: decryptedAuthToken,
          from_number: phoneNumber.phoneNumber,
          twiml_url: process.env.TWILIO_TWIML_URL || 'https://handler.twilio.com/twiml/EH74e428ffd64e795d5e2dba74362e1380'
        },
        to_number: payload.toNumber,
        message: payload.message,
        assistantId: payload.assistantId,
        organizationId: organizationId,
        workspaceId: phoneNumber.workspaceId?.toString() || '1',
        user_tags: agent.userTags || [],
        system_tags: agent.systemTags || [],
        // Include call settings from agent
        callRecording: agent.callRecording,
        callRecordingFormat: agent.callRecordingFormat,
        backgroundAmbientSound: agent.backgroundAmbientSound,
        rememberLeadPreference: agent.rememberLeadPreference,
        voicemailDetection: agent.voicemailDetection,
        voicemailMessage: agent.voicemailMessage,
        // Include call transfer settings from agent
        enableCallTransfer: agent.enableCallTransfer,
        transferPhoneNumber: agent.transferPhoneNumber
      };

      console.log(`📦 [CallService] Call payload prepared:`, {
        provider: callQueuePayload.provider,
        from_number: callQueuePayload.config.from_number,
        to_number: callQueuePayload.to_number,
        assistantId: callQueuePayload.assistantId,
        organizationId: callQueuePayload.organizationId,
        user_tags: callQueuePayload.user_tags,
        system_tags: callQueuePayload.system_tags
      });

      // Step 4: Process call directly (development mode)
      console.log(`🚀 [CallService] Processing call directly without queue`);
      
      // Import the outbound worker logic
      const { processOutboundCall } = await import('../workers/outboundCallWorker');
      
      // Create job data format
      const jobData = {
        data: callQueuePayload,
        id: Date.now().toString()
      };
      
      // Process the call directly
      const result = await processOutboundCall(jobData as any);
      
      console.log(`✅ [CallService] Call processed directly with result:`, result);

      return { 
        success: true, 
        message: 'Call initiated successfully', 
        callId: jobData.id
      };

    } catch (error) {
      console.error(`❌ [CallService] Error initiating call:`, error);
      return { 
        success: false, 
        message: 'Failed to initiate call', 
      };
    }
  }

  /**
   * Create a call record in MongoDB when processing starts
   */
  async createCallRecord(payload: CallQueuePayload): Promise<string | null> {
    try {
      console.log(`💾 [CallService] Creating call record in MongoDB`);
      
      const callRecord = new Call({
        assistantId: payload.assistantId,
        organizationId: payload.organizationId,
        workspaceId: payload.workspaceId || '1',
        contactPhone: payload.to_number,
        message: payload.message,
        provider: payload.provider,
        fromNumber: payload.config.from_number,
        status: 'queued',
        createdAt: new Date(),
        webhookPayload: [],
        user_tags: payload.user_tags || [],
        system_tags: payload.system_tags || []
      });

      const savedCall = await callRecord.save();
      console.log(`✅ [CallService] Call record created with ID: ${savedCall._id}`);
      
      return savedCall._id.toString();
    } catch (error) {
      console.error(`❌ [CallService] Error creating call record:`, error);
      return null;
    }
  }

  /**
   * Update call record with Twilio response
   */
  async updateCallWithTwilioResponse(callId: string, twilioSid: string, status: string): Promise<boolean> {
    try {
      console.log(`🔄 [CallService] Updating call record ${callId} with Twilio SID: ${twilioSid}`);
      
      await Call.findByIdAndUpdate(callId, {
        twilioSid: twilioSid,
        status: status,
        updatedAt: new Date()
      });

      console.log(`✅ [CallService] Call record updated successfully`);
      return true;
    } catch (error) {
      console.error(`❌ [CallService] Error updating call record:`, error);
      return false;
    }
  }

  /**
   * Update call record with success status and call_id from telephonic server
   */
  async updateCallWithSuccess(callId: string, externalCallId: string, responseData: any): Promise<boolean> {
    try {
      console.log(`✅ [CallService] Updating call record ${callId} with success status and external call_id: ${externalCallId}`);
      
      await Call.findByIdAndUpdate(callId, {
        status: 'initiated',
        externalCallId: externalCallId,
        telephoneServerResponse: responseData,
        updatedAt: new Date()
      });

      console.log(`✅ [CallService] Call record updated successfully with success status`);
      return true;
    } catch (error) {
      console.error(`❌ [CallService] Error updating call record with success:`, error);
      return false;
    }
  }

  /**
   * Update call record with failure status and error details
   */
  async updateCallWithFailure(callId: string, errorMessage: string, errorData: any): Promise<boolean> {
    try {
      console.log(`❌ [CallService] Updating call record ${callId} with failure status: ${errorMessage}`);
      
      await Call.findByIdAndUpdate(callId, {
        status: 'failed',
        errorMessage: errorMessage,
        errorData: errorData,
        updatedAt: new Date()
      });

      console.log(`✅ [CallService] Call record updated successfully with failure status`);
      return true;
    } catch (error) {
      console.error(`❌ [CallService] Error updating call record with failure:`, error);
      return false;
    }
  }

  /**
   * Get previous call summaries for a contact
   */
  async getPreviousCallSummaries(organizationId: string, contactPhone: string): Promise<string> {
    try {
      console.log(`📚 [CallService] Retrieving previous calls for contact: ${contactPhone}`);
      
      // Find previous completed calls for this contact
      const previousCalls = await Call.find({
        organizationId: organizationId,
        contactPhone: contactPhone,
        status: 'completed'
      })
      .sort({ createdAt: -1 }) // Most recent first
      .limit(3) // Get last 3 calls only
      .exec();
      
      console.log(`✅ [CallService] Found ${previousCalls.length} previous calls for contact`);
      
      if (previousCalls.length === 0) {
        return "No previous call history with this contact.";
      }
      
      // Build summary from previous calls
      const summaries: string[] = [];
      
      for (const call of previousCalls) {
        let callSummary = '';
        
        // Extract call summary from webhookPayload if available
        const summaryWebhook = call.webhookPayload?.find(w => w.type === 'CALL_SUMMARY');
        
        if (summaryWebhook?.data?.summary) {
          callSummary = summaryWebhook.data.summary;
        } else if (call.transcript) {
          // Fallback to transcript (show more context - 500 characters)
          callSummary = call.transcript.substring(0, 500) + (call.transcript.length > 500 ? '...' : '');
        } else {
          callSummary = `Call completed on ${call.createdAt?.toLocaleDateString() || 'unknown date'}`;
        }
        
        // Format the call info
        const dateStr = call.createdAt ? call.createdAt.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'Unknown date';
        
        const durationStr = call.duration ? `${Math.round(call.duration)}s` : 'N/A';
        
        summaries.push(`[${dateStr}, Duration: ${durationStr}] ${callSummary}`);
      }
      
      const fullSummary = `Previous call history with ${contactPhone}:\n${summaries.join('\n\n')}`;
      console.log(`📋 [CallService] Generated summary for ${previousCalls.length} previous calls`);
      
      return fullSummary;
      
    } catch (error) {
      console.error(`❌ [CallService] Error retrieving previous call summaries:`, error);
      return "Error retrieving previous call history.";
    }
  }

  /**
   * DEMO VERSION: Create call with agent details and send to ngrok endpoint
   * Temporary shortcut bypassing Redis/webhook architecture
   */
  async demoCreateCallWithAgent(organizationId: string, data: { assistantId: string; toNumber: string; contactName: string }) {
    try {
      console.log(`🚀 [Demo CallService] Processing call - assistant: ${data.assistantId}, organization: ${organizationId}`);
      
      // Check for duplicate/recent calls to prevent multiple initiations
      const recentCall = await Call.findOne({
        organizationId: organizationId,
        assistantId: data.assistantId,
        contactPhone: data.toNumber,
        status: { $in: ['queued', 'in-progress', 'ringing', 'answered'] },
        createdAt: { $gte: new Date(Date.now() - 60000) } // Within last 60 seconds
      });

      if (recentCall) {
        console.log(`⚠️ [Demo CallService] Recent active call found for ${data.toNumber}, skipping duplicate`);
        return {
          success: false,
          message: 'A call to this number is already in progress or was initiated recently',
          existingCallId: recentCall._id.toString()
        };
      }
      
      // Step 1: Fetch agent details
      const agent = await Agent.findOne({ 
        _id: data.assistantId, 
        organizationId: organizationId 
      });

      if (!agent) {
        throw new Error(`Agent not found with ID: ${data.assistantId}`);
      }

      console.log(`📋 [Demo CallService] Found agent: ${agent.name}`);

      // Step 2: Get phone number details using phoneNumberId from agent
      let fromNumber = '';
      let twilioAccountSid = '';
      let twilioAuthToken = '';
      
      console.log(`🔍 [Demo CallService] Agent phoneNumberId: ${agent.phoneNumberId}`);
      
      if (agent.phoneNumberId && agent.phoneNumberId !== 'none') {
        const phoneNumber = await PhoneNumber.findOne({
          _id: agent.phoneNumberId,
          organizationId: organizationId
        });
        
        console.log(`🔍 [Demo CallService] Found phone number:`, phoneNumber ? `${phoneNumber.phoneNumber}` : 'null');
        
        if (phoneNumber) {
          fromNumber = phoneNumber.phoneNumber; // Already includes country code
          // Decrypt Twilio credentials
          const { decrypt } = await import('../../../integrations/common/encryption.util');
          twilioAccountSid = decrypt(phoneNumber.accountSid);
          twilioAuthToken = decrypt(phoneNumber.authToken);
          console.log(`📞 [Demo CallService] Using phone number: ${fromNumber} with Twilio credentials`);
        }
      } else {
        // Fallback to environment variables
        console.log(`🔍 [Demo CallService] No phoneNumberId found, using environment variables`);
        fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
        twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || '';
        twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
        console.log(`📞 [Demo CallService] Using env variables - phone: ${fromNumber}, sid: ${twilioAccountSid ? 'present' : 'missing'}`);
      }

      // Step 3: Create call record in database
      const callRecord = new Call({
        assistantId: data.assistantId,
        organizationId: organizationId,
        workspaceId: '1',
        contactPhone: data.toNumber,
        contactName: data.contactName,
        message: `Call to ${data.contactName}`,
        callType: 'outbound',
        provider: 'twilio',
        fromNumber: fromNumber,
        status: 'queued',
        createdAt: new Date(),
        updatedAt: new Date(),
        webhookPayload: []
      });

      const savedCall = await callRecord.save();
      console.log(`✅ [Demo CallService] Call record created with ID: ${savedCall._id}`);

      // Step 4: Retrieve previous call summaries for this contact
      const previousCallSummary = await this.getPreviousCallSummaries(organizationId, data.toNumber);
      console.log(`📋 [Demo CallService] Previous call summary retrieved (${previousCallSummary.length} characters, ~${previousCallSummary.split(' ').length} words):`);
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📚 FULL PREVIOUS CALL SUMMARY`);
      console.log(`${'='.repeat(80)}`);
      console.log(previousCallSummary);
      console.log(`${'='.repeat(80)}\n`);

      // Step 5: Prepare payload for new API endpoint with nested structure
      const currentDate = new Date();
      const payload = {
        to_phone: data.toNumber,
        contact_name: data.contactName,
        from_phone: fromNumber,
        twilio_account_sid: twilioAccountSid,
        twilio_auth_token: twilioAuthToken,
        livekit_sip_trunk_id: process.env.LIVEKIT_SIP_TRUNK_ID,
        agent_initial_message: agent.firstMessage || "Hello! How can I assist you today?",
        agent_prompt_preamble: agent.systemPrompt || "You are a helpful AI assistant.",
        agent_trigger: agent.trigger,
        user_speak_first: agent.userSpeaksFirst || false,
        temperature: agent.temperature,
        language:agent.languages[0],
        agent_speed:agent.speed,
        agent_generate_responses: true,
        previous_call_summary: previousCallSummary,
        current_date: currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        current_time: currentDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: true 
        }),
        tts: {
          provider_name: (() => {
            const provider = agent.voiceProvider?.toLowerCase();
            if (provider === 'elevenlabs') return 'eleven_labs';
            if (provider === 'rime') return 'rime';
            if (provider === 'streamelements') return 'stream_elements';
            if (provider === 'smallest ai') return 'smallest_ai';
            return provider || 'deepgram';
          })(),
          voice_id: agent.voice || "EXAVITQu4vr4xnSDxMaL",
          model_id: (() => {
            const provider = agent.voiceProvider?.toLowerCase();
            if (provider === 'rime') return 'arcana';
            if (provider === 'elevenlabs') return 'eleven_turbo_v2';
            if (provider === 'smallest ai') return 'lightning-large';
            return undefined;
          })(),
          api_key: (() => {
            const provider = agent.voiceProvider?.toLowerCase();
            if (provider === 'deepgram') return process.env.DEEPGRAM_API_KEY;
            if (provider === 'elevenlabs') return process.env.ELEVENLABS_API_KEY;
            if (provider === 'rime') return process.env.RIME_API_KEY;
            if (provider === 'streamelements') return process.env.STREAMELEMENTS_API_KEY;
            if (provider === 'smallest ai') return process.env.SMALLEST_AI_API_KEY;
            return process.env.DEEPGRAM_API_KEY; // default
          })()
        },
        stt: {
          provider_name: (() => {
            const transcriber = agent.transcriber?.toLowerCase();
            if (transcriber === 'openai whisper') return 'openai';
            return transcriber || 'deepgram';
          })(),
          model: (() => {
            const transcriber = agent.transcriber?.toLowerCase();
            if (transcriber === 'openai whisper') return 'whisper-1';
            return 'nova-2'; // Deepgram default
          })(),
          api_key: (() => {
            const transcriber = agent.transcriber?.toLowerCase();
            if (transcriber === 'openai whisper') return process.env.OPENAI_API_KEY;
            return process.env.DEEPGRAM_API_KEY; // Deepgram default
          })()
        },
        model: {
          name: agent.aiModel || "gpt-4",
          api_key: process.env.OPENAI_API_KEY
        },
        rag_response: agent.ragResponse || "",
        user_tags: agent.userTags || [],
        system_tags: agent.systemTags || [],
        // Call settings from agent - using correct field names for API
        recording: agent.callRecording !== undefined ? agent.callRecording : true,
        recording_format: agent.callRecordingFormat || "mp3", 
        voicemail: agent.voicemailDetection !== undefined ? agent.voicemailDetection : false,
        voicemail_message: agent.voicemailMessage || "",
        // Call transfer settings from agent
        enable_call_transfer: agent.enableCallTransfer || false,
        transfer_phone_number: agent.transferPhoneNumber || "",
        // Keyboard sound settings from agent
        keyboard_sound: agent.keyboardSound || false
      };

      console.log(`🏷️ [Demo CallService] Sending payload with tags:`, {
        user_tags: payload.user_tags,
        system_tags: payload.system_tags
      });
      console.log(`📞 [Demo CallService] Twilio configuration in payload:`, {
        to_phone: payload.to_phone,
        from_phone: payload.from_phone,
        twilio_account_sid: payload.twilio_account_sid,
        twilio_auth_token: payload.twilio_auth_token ? "***" : "missing"
      });
      console.log(`📧 [Demo CallService] Agent voicemail settings:`, {
        voicemailDetection: agent.voicemailDetection,
        voicemailMessage: agent.voicemailMessage,
        callRecording: agent.callRecording,
        callRecordingFormat: agent.callRecordingFormat
      });
      console.log(`📧 [Demo CallService] Final API payload voicemail settings:`, {
        recording: payload.recording,
        voicemail: payload.voicemail,
        voicemail_message: payload.voicemail_message,
        recording_format: payload.recording_format
      });
      // Log the complete JSON payload prominently
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🚀 OUTBOUND CALL JSON PAYLOAD`);
      console.log(`${'='.repeat(80)}`);
      console.log(JSON.stringify(payload, null, 2));
      console.log(`${'='.repeat(80)}\n`);

      // Step 5: Send POST request to new API endpoint
      try {
        const apiUrl = process.env.TELEPHONIC_SERVER_URL;
        
        if (!apiUrl) {
          throw new Error('TELEPHONIC_SERVER_URL environment variable is not configured');
        }
        
        console.log(`🌐 [Demo CallService] Sending request to telephonic server: ${apiUrl}`);
        
        const apiKey = process.env.TELEPHONIC_SERVER_API_KEY;
        if (!apiKey) {
          console.warn('⚠️ [Demo CallService] TELEPHONIC_SERVER_API_KEY not configured - request may fail authentication');
        }
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey || '',
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const responseData = await response.json();
          console.log(`✅ [Demo CallService] API request successful:`, responseData);
          
          // Check if response contains call_id to determine success
          if (responseData.call_id || responseData.callId) {
            console.log(`🎉 [Demo CallService] Call initiated successfully with call_id: ${responseData.call_id || responseData.callId}`);
            
            // Update call status to 'in-progress' only when call_id is received
            await Call.findByIdAndUpdate(savedCall._id, {
              status: 'in-progress',
              twilioSid: responseData.call_id || responseData.callId,
              roomName: responseData.room_name || responseData.roomName,
              updatedAt: new Date()
            });

            // Schedule timeout check for PHONE_CALL_CONNECTED webhook
            try {
              console.log(`⏰ [Demo CallService] Scheduling timeout check for call ${savedCall._id} in 2 minutes`);
              
              await callTimeoutQueue.add(
                'check-call-connection-timeout',
                {
                  callId: savedCall._id.toString(),
                  twilioSid: responseData.call_id || responseData.callId,
                  checkAfterMinutes: 2
                },
                {
                  delay: 2 * 60 * 1000, // 2 minutes in milliseconds
                  jobId: `timeout-check-${savedCall._id}`, // Unique job ID to prevent duplicates
                  removeOnComplete: 10,
                  removeOnFail: 5
                }
              );
              
              console.log(`✅ [Demo CallService] Timeout check scheduled successfully for call ${savedCall._id}`);
            } catch (timeoutError) {
              console.error(`❌ [Demo CallService] Failed to schedule timeout check for call ${savedCall._id}:`, timeoutError);
              // Don't fail the call creation if timeout scheduling fails
            }

            return {
              callId: savedCall._id,
              status: 'in-progress',
              call_id: responseData.call_id || responseData.callId,
              apiResponse: responseData
            };
          } else {
            console.error(`❌ [Demo CallService] Call failed - no call_id received in response:`, responseData);
            
            // Update call status to 'failed' when no call_id is received
            await Call.findByIdAndUpdate(savedCall._id, {
              status: 'failed',
              updatedAt: new Date()
            });

            throw new Error('Call failed - no call_id received from telephonic server');
          }
        } else {
          console.error(`❌ [Demo CallService] API request failed:`, response.status, response.statusText);
          
          // Update call status to 'failed'
          await Call.findByIdAndUpdate(savedCall._id, {
            status: 'failed',
            updatedAt: new Date()
          });

          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
      } catch (fetchError) {
        console.error(`❌ [Demo CallService] Network error calling API:`, fetchError);
        
        // Update call status to 'failed'
        await Call.findByIdAndUpdate(savedCall._id, {
          status: 'failed',
          updatedAt: new Date()
        });

        // Throw error instead of returning success for failed calls
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unable to connect to API';
        throw new Error(`Call initiation failed: Network error - ${errorMessage}`);
      }

    } catch (error) {
      console.error(`❌ [Demo CallService] Error in demoCreateCallWithAgent:`, error);
      throw error;
    }
  }
  async updateCallFromWebhookDemo(callId: string, webhookData: any): Promise<void> {
    console.log(`[Webhook Service] Searching for call with ID: ${callId}`);
    console.log(`[Webhook Service] Webhook type: ${webhookData.type}`);

    // Use atomic findOneAndUpdate to prevent race conditions
    const webhookEntry = {
      type: webhookData.type,
      call_id: callId,
      data: webhookData,
      timestamp: new Date()
    };

    // Find call record by either roomName or twilioSid (to support both old and new webhook formats)
    const callRecord = await Call.findOne({ 
      $or: [
        { roomName: callId },
        { twilioSid: callId }
      ]
    });

    if (!callRecord) {
      console.error(`[Webhook Service] No matching call found for ID: ${callId}. Ignoring.`);
      return;
    }

    console.log(`[Webhook Service] Found call record: ${callRecord._id}. Processing webhook type: ${webhookData.type}`);

    // Import workflow webhook controller and trigger workflows
    try {
      const { WebhookController } = await import('../../workflow/controllers/WebhookController');
      const webhookController = new WebhookController();
      
      // Process workflow webhook asynchronously (don't await to avoid blocking)
      setImmediate(() => {
        webhookController.processWorkflowWebhook(callId, webhookData.type, webhookData, callRecord.organizationId)
          .catch(error => {
            console.error(`❌ [Webhook Service] Error processing workflow webhook:`, error);
          });
      });
    } catch (importError) {
      console.error(`❌ [Webhook Service] Error importing workflow controller:`, importError);
    }

    // Use atomic $push operation for webhook array and $set for other fields
    try {
      // Create separate update operations
      const pushUpdate = {
        $push: { webhookPayload: webhookEntry },
        $set: { updatedAt: new Date() }
      };

      // Add conditional updates for other fields
      const conditionalUpdates: any = {};
      
      if (webhookData.type === 'PHONE_CALL_ENDED') {
        // Determine call status based on webhook data
        if (webhookData.is_voicemail) {
          conditionalUpdates.status = 'voicemail';
        } else if (webhookData.call_status === 'no-answer' || webhookData.status === 'no-answer') {
          conditionalUpdates.status = 'no-answer';
        } else {
          conditionalUpdates.status = 'completed';
        }
        
        conditionalUpdates.duration = Math.round(webhookData.duration_seconds || 0);
        conditionalUpdates.endedAt = new Date(webhookData.call_end_time);
        
        if (webhookData.call_start_time && !callRecord.startedAt) {
          conditionalUpdates.startedAt = new Date(webhookData.call_start_time);
        }
        
        // Save recording URL from PHONE_CALL_ENDED webhook
        if (webhookData.recording_url) {
          conditionalUpdates.recording = webhookData.recording_url;
          console.log(`🎥 [Webhook Service] Saved recording URL from PHONE_CALL_ENDED: ${webhookData.recording_url}`);
        }
        
        console.log(`📱 [Webhook Service] Call ended with status: ${conditionalUpdates.status}, voicemail: ${webhookData.is_voicemail}, duration: ${conditionalUpdates.duration}s`);
      } else if (webhookData.type === 'PHONE_CALL_CONNECTED') {
        conditionalUpdates.status = 'in-progress';
        if (webhookData.call_start_time) {
          conditionalUpdates.startedAt = new Date(webhookData.call_start_time);
        }
      } else if (webhookData.type === 'TRANSCRIPT_COMPLETE') {
        // Check for voicemail detection in transcript completion
        if (webhookData.voicemail_detected === true || webhookData.is_voicemail === true) {
          conditionalUpdates.status = 'voicemail';
          console.log(`📱 [Webhook Service] Voicemail detected in TRANSCRIPT_COMPLETE - setting status to voicemail`);
        } else if (callRecord.status !== 'voicemail' && callRecord.status !== 'no-answer') {
          // Only update to completed if not already marked with a final status
          conditionalUpdates.status = 'completed';
          console.log(`📱 [Webhook Service] Call completed normally - setting status to completed`);
        }

        if (webhookData.full_transcript) {
          conditionalUpdates.transcript = webhookData.full_transcript;
          conditionalUpdates.user_tags = [
            ...(webhookData.user_tags_found || []),
            ...(webhookData.system_tags_found || [])
          ];
        }

        // Save recording URL from TRANSCRIPT_COMPLETE webhook
        // recording_urls is an array of strings
        if (webhookData.recording_urls && webhookData.recording_urls.length > 0) {
          conditionalUpdates.recording = webhookData.recording_urls[0];
          console.log(`🎥 [Webhook Service] Saved recording URL from TRANSCRIPT_COMPLETE: ${webhookData.recording_urls[0]}`);
        }
        
        // Store the cost value from cost_breakdown.total_cost if received
        if (webhookData.cost_breakdown?.total_cost !== undefined && webhookData.cost_breakdown.total_cost !== null) {
          conditionalUpdates.cost = webhookData.cost_breakdown.total_cost;
          console.log(`💰 [Webhook Service] Recording call cost: $${webhookData.cost_breakdown.total_cost} ${webhookData.cost_breakdown.currency || 'USD'}`);
          console.log(`💰 [Webhook Service] Cost breakdown - Calling: $${webhookData.cost_breakdown.calling_provider_cost}, TTS: $${webhookData.cost_breakdown.tts_cost}, STT: $${webhookData.cost_breakdown.stt_cost}, LLM: $${webhookData.cost_breakdown.llm_cost}`);
          
          // Deduct credits from organization
          const callCost = typeof webhookData.cost_breakdown.total_cost === 'string' 
            ? parseFloat(webhookData.cost_breakdown.total_cost) 
            : webhookData.cost_breakdown.total_cost;
          
          if (callCost > 0 && callRecord.organizationId) {
            console.log(`💰 [Webhook Service] Deducting $${callCost} from organization ${callRecord.organizationId}`);
            
            try {
              // Import billing service dynamically to avoid circular dependencies
              const { billingService } = await import('../../billing/services/BillingService');
              const deductionResult = await billingService.deductCredits(callRecord.organizationId, callCost);
              
              if (deductionResult.success) {
                console.log(`✅ [Webhook Service] Credits deducted successfully. New balance: $${deductionResult.newBalance.toFixed(4)}`);
              } else {
                console.error(`❌ [Webhook Service] Failed to deduct credits: ${deductionResult.message}`);
              }
            } catch (creditError) {
              console.error(`❌ [Webhook Service] Error processing credit deduction:`, creditError);
            }
          }
        }
      } else if (webhookData.type === 'VOICEMAIL_DETECTED') {
        // Handle voicemail detection webhook
        if (webhookData.is_voicemail === true) {
          conditionalUpdates.status = 'voicemail';
          console.log(`📱 [Webhook Service] Voicemail detected via VOICEMAIL_DETECTED webhook - setting status to voicemail`);
        }
      }

      // Combine all updates
      if (Object.keys(conditionalUpdates).length > 0) {
        Object.assign(pushUpdate.$set, conditionalUpdates);
      }

      const updateResult = await Call.findByIdAndUpdate(
        callRecord._id, 
        pushUpdate, 
        { new: true, runValidators: true }
      );
      
      if (!updateResult) {
        console.error(`[Webhook Service] Failed to update call record ${callRecord._id} for webhook type: ${webhookData.type}`);
        return;
      }
      
      console.log(`[Webhook Service] Call record ${callRecord._id} was successfully updated for webhook type: ${webhookData.type}`);
      console.log(`[Webhook Service] Updated webhook count: ${updateResult.webhookPayload?.length || 0}`);
      console.log(`[Webhook Service] All webhook types: ${updateResult.webhookPayload?.map(w => w.type).join(', ') || 'none'}`);
      
      if (webhookData.type === 'TRANSCRIPT_COMPLETE' && updateResult.user_tags?.length && updateResult.user_tags.length > 0) {
        console.log(`✅ [Webhook Service] Stored ${updateResult.user_tags.length} tags from webhook`);
      }

      // Handle callback request from TRANSCRIPT_COMPLETE webhook
      if (webhookData.type === 'TRANSCRIPT_COMPLETE' && webhookData.callback_requested === true) {
        console.log(`📞 [Webhook Service] Callback requested detected for call ${callRecord._id}`);
        
        try {
          // Prepare callback data by copying the entire updated call record
          const callbackData = {
            organizationId: updateResult.organizationId,
            workspaceId: updateResult.workspaceId,
            assistantId: updateResult.assistantId,
            contactPhone: updateResult.contactPhone,
            contactName: updateResult.contactName,
            message: updateResult.message,
            callType: updateResult.callType,
            status: updateResult.status,
            duration: updateResult.duration,
            cost: updateResult.cost,
            transcript: updateResult.transcript,
            recording: updateResult.recording,
            provider: updateResult.provider,
            fromNumber: updateResult.fromNumber,
            twilioSid: updateResult.twilioSid,
            startedAt: updateResult.startedAt,
            endedAt: updateResult.endedAt,
            webhookPayload: updateResult.webhookPayload,
            user_tags: updateResult.user_tags,
            callbacks_time: webhookData.callback_time ? new Date(webhookData.callback_time) : new Date(),
          };

          // Create new callback record
          const callbackRecord = await Callback.create(callbackData);
          console.log(`✅ [Webhook Service] Callback record created successfully with ID: ${callbackRecord._id}, scheduled for: ${callbackData.callbacks_time}`);
        } catch (callbackError) {
          console.error(`❌ [Webhook Service] Error creating callback record:`, callbackError);
          // Don't throw - we still want the webhook processing to succeed even if callback creation fails
        }
      }
      
    } catch (updateError) {
      console.error(`[Webhook Service] Database update error for webhook type ${webhookData.type}:`, updateError);
      throw updateError;
    }
  }
}

export const callService = new CallService();
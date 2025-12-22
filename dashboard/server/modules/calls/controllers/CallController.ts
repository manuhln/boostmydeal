import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { callService } from '../services/CallService';
import { outboundCallQueue, webhookQueue } from '../redis/queues';
import { billingService } from '../../billing/services/BillingService';
import { redisPool } from '../redis/config';

export class CallController {
  /**
   * Get webhook payload data for a specific call
   * GET /api/calls/:callId/webhooks
   */
  async getCallWebhooks(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId;
      const callId = req.params.callId;
      
      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      console.log(`🔍 [CallController] Getting webhook data for call: ${callId}`);
      
      const callData = await callService.getCallWebhookData(callId, organizationId);
      
      if (!callData) {
        res.status(404).json({
          success: false,
          message: 'Call not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          callId: callData.callId,
          twilioSid: callData.twilioSid,
          status: callData.status,
          duration: callData.duration,
          webhookCount: callData.webhookPayload?.length || 0,
          webhooks: callData.webhookPayload || [],
          lastUpdated: callData.updatedAt
        },
        message: 'Webhook data retrieved successfully'
      });

    } catch (error) {
      console.error(`❌ [CallController] Error getting webhook data:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webhook data'
      });
    }
  }

  /**
   * Get transcript data for a specific call
   * GET /api/calls/:callId/transcript
   */
  async getCallTranscript(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId;
      const callId = req.params.callId;
      
      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      console.log(`🔍 [CallController] Getting transcript data for call: ${callId}`);
      
      // Get call data with transcript
      const callData = await callService.getCallWebhookData(callId, organizationId);
      
      if (!callData) {
        res.status(404).json({
          success: false,
          message: 'Call not found'
        });
        return;
      }

      // Get live transcript data from CallSession
      const { CallSession } = await import('../../workflow/models/CallSession');
      const callSession = await CallSession.findOne({ callId: callData.twilioSid });

      // Process transcript data
      const transcriptData = {
        callId: callData.callId,
        twilioSid: callData.twilioSid,
        status: callData.status,
        transcript: callData.transcript || null,
        liveTranscripts: [] as any[],
        lastUpdated: callData.updatedAt
      };

      // Add live transcript data from CallSession payloads
      if (callSession?.payloads && Array.isArray(callSession.payloads)) {
        console.log(`🔍 [CallController] CallSession found with ${callSession.payloads.length} payloads`);
        const liveTranscriptPayloads = callSession.payloads.filter((payload: any) => 
          payload.type === 'LIVE_TRANSCRIPT' || 
          payload.type === 'TRANSCRIPT_COMPLETE' ||
          payload.type === 'TRANSCRIPT_PARTIAL'
        );
        console.log(`📋 [CallController] Found ${liveTranscriptPayloads.length} transcript payloads:`, 
          liveTranscriptPayloads.map(p => ({ type: p.type, hasData: !!p.data })));
        (transcriptData.liveTranscripts as any[]) = liveTranscriptPayloads;
      }

      // Also check webhookPayload for transcript data from the main Call document
      if (callData.webhookPayload && Array.isArray(callData.webhookPayload)) {
        console.log(`🔍 [CallController] Call has ${callData.webhookPayload.length} webhook payloads`);
        const transcriptWebhooks = callData.webhookPayload.filter((webhook: any) =>
          webhook.type === 'LIVE_TRANSCRIPT' ||
          webhook.type === 'TRANSCRIPT_COMPLETE' ||
          webhook.type === 'TRANSCRIPT_PARTIAL'
        );
        console.log(`📋 [CallController] Found ${transcriptWebhooks.length} transcript webhooks:`,
          transcriptWebhooks.map(w => ({ type: w.type, hasData: !!w.data })));
        
        // Merge webhook transcript data with CallSession data
        transcriptData.liveTranscripts = [...(transcriptData.liveTranscripts || []), ...transcriptWebhooks];
      }

      console.log(`📊 [CallController] Final transcript data:`, {
        callId: transcriptData.callId,
        hasStaticTranscript: !!transcriptData.transcript,
        liveTranscriptCount: transcriptData.liveTranscripts.length,
        status: transcriptData.status
      });

      res.status(200).json({
        success: true,
        data: transcriptData,
        message: 'Transcript data retrieved successfully'
      });

    } catch (error) {
      console.error(`❌ [CallController] Error getting transcript data:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve transcript data'
      });
    }
  }

  /**
   * Get all calls for organization with optional filters
   * GET /api/calls
   */
  async getCalls(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId;
      
      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      // Extract filters from query parameters
      const filters = {
        agentId: req.query.agentId as string,
        callType: req.query.callType as 'inbound' | 'outbound',
        status: req.query.status as 'initiated' | 'in_progress' | 'completed' | 'failed' | 'cancelled',
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        contactName: req.query.contactName as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      console.log('🔍 [CallController] Applying filters:', filters);

      const result = await callService.getCallsByOrganizationWithFilters(organizationId, filters);
      
      // Format response with proper field names and data types
      const formattedCalls = result.data.map(call => ({
        _id: call._id,
        organizationId: call.organizationId,
        workspaceId: call.workspaceId,
        assistantId: call.assistantId,
        contactPhone: call.contactPhone,
        contactName: call.message || call.contactName,
        callType: call.callType,
        status: call.status,
        provider: call.provider,
        fromNumber: call.fromNumber,
        twilioSid: call.twilioSid,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
        duration: call.duration || 0,
        cost: call.cost || null,
        recording: call.recording || null,
        createdAt: call.createdAt || new Date(),
        updatedAt: call.updatedAt || new Date(),
        user_tags: call.user_tags || [],
        // Remove hardcoded agent field - use assistantId populated data instead
      }));

      res.status(200).json({
        success: true,
        data: formattedCalls,
        total: result.total,
        page: result.page,
        message: 'Calls retrieved successfully'
      });

    } catch (error) {
      console.error(`❌ [CallController] Error in getCalls:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Initiate an outbound call
   * POST /api/calls/initiate
   */
  async initiateCall(req: Request, res: Response): Promise<void> {
    try {
      console.log(`🚀 [CallController] Received call initiation request`);
      console.log(`📋 [CallController] Request body:`, req.body);
      console.log(`👤 [CallController] User organization: ${(req as any).user?.organizationId}`);

      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error(`❌ [CallController] Validation errors:`, errors.array());
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { assistantId, toNumber, message } = req.body;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        console.error(`❌ [CallController] Missing organization ID from user context`);
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      console.log(`🎯 [CallController] Processing call request:`, {
        assistantId,
        toNumber,
        organizationId
      });

      // Check if organization has sufficient credits
      console.log(`💰 [CallController] Checking credit availability`);
      const creditCheck = await billingService.checkSufficientCredits(organizationId, 0.10); // Minimum $0.10 required
      
      if (!creditCheck.hasCredits) {
        console.error(`❌ [CallController] Insufficient credits: ${creditCheck.message}`);
        res.status(402).json({
          success: false,
          message: creditCheck.message || 'Insufficient credits',
          data: {
            currentBalance: creditCheck.currentBalance,
            requiresPayment: true,
            estimatedCost: 0.02
          }
        });
        return;
      }

      console.log(`✅ [CallController] Credits available: $${creditCheck.currentBalance.toFixed(4)}`);

      // Prepare call for queue processing
      const callData = await callService.prepareCallForQueue(
        { assistantId, toNumber, message },
        organizationId
      );

      if (!callData.success) {
        res.status(400).json({
          success: false,
          message: callData.message
        });
        return;
      }

      // Try to add job to outbound call queue, fallback to direct processing
      console.log(`📋 [CallController] Adding call job to queue`);
      
      try {
        const job = await outboundCallQueue.add(
          'process-outbound-call',
          callData.payload,
          {
            priority: 1,
            delay: 0,
            attempts: 3,
          }
        );

        console.log(`✅ [CallController] Call job ${job.id} added to queue successfully`);

        // Wait for job completion to get the actual result
        console.log(`⏳ [CallController] Waiting for job ${job.id} to complete...`);
        const result = await job.waitUntilFinished();

        console.log(`🎉 [CallController] Job ${job.id} completed with result:`, result);

        // Return the actual result from the telephonic server
        if (result && result.call_id) {
          res.status(200).json({
            status: "success",
            message: result.message,
            call_id: result.call_id,
            to_phone: result.to_phone,
            from_phone: result.from_phone
          });
        } else {
          res.status(500).json({
            status: "error",
            message: "Call failed - no call_id received"
          });
        }

      } catch (queueError) {
        console.warn(`⚠️ [CallController] Queue failed, falling back to direct processing:`);
        console.error(`❌ [CallController] Queue error type:`, (queueError as any)?.constructor?.name);
        console.error(`❌ [CallController] Queue error message:`, (queueError as Error)?.message);
        console.error(`❌ [CallController] Queue error code:`, (queueError as any)?.code);
        console.error(`❌ [CallController] Queue error stack:`, (queueError as Error)?.stack);
        
        try {
          // Import and execute outbound call processing directly
          const { processOutboundCall } = await import('../workers/outboundCallWorker');
          
          // Create job data format
          const jobData = {
            data: callData.payload,
            id: Date.now().toString()
          };
          
          // Process the call directly and wait for result
          const result = await processOutboundCall(jobData as any);
          
          console.log(`✅ [CallController] Call processed directly as fallback with result:`, result);

          // Return the actual result from the telephonic server
          if (result && result.call_id) {
            res.status(200).json({
              status: "success",
              message: result.message,
              call_id: result.call_id,
              to_phone: result.to_phone,
              from_phone: result.from_phone
            });
          } else {
            res.status(500).json({
              status: "error",
              message: "Call failed - no call_id received"
            });
          }

        } catch (directProcessError) {
          console.error(`❌ [CallController] Direct processing failed:`, directProcessError);
          res.status(500).json({
            status: "error",
            message: `Call failed: ${(directProcessError as Error)?.message || 'Unknown error'}`
          });
        }
      }

    } catch (error) {
      console.error(`❌ [CallController] Error in initiateCall:`, error);
      console.error(`❌ [CallController] Full error stack:`, (error as Error)?.stack);
      res.status(500).json({
        success: false,
        message: `Internal server error: ${(error as Error)?.message || 'Unknown error'}`
      });
    }
  }

  /**
   * Handle Twilio webhook for call status updates
   * POST /api/webhook/call-status
   */
  async handleCallStatusWebhook(req: Request, res: Response): Promise<void> {
    try {
      console.log(`📨 [CallController] Received webhook from Twilio`);
      console.log(`📋 [CallController] Webhook headers:`, {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent'],
        'x-twilio-signature': req.headers['x-twilio-signature'] ? 'present' : 'missing'
      });
      console.log(`📋 [CallController] Webhook body:`, req.body);

      const webhookData = req.body;
      const twilioSid = webhookData.CallSid;

      if (!twilioSid) {
        console.error(`❌ [CallController] Missing CallSid in webhook`);
        res.status(400).json({
          success: false,
          message: 'Missing CallSid in webhook'
        });
        return;
      }

      console.log(`📞 [CallController] Processing webhook for call: ${twilioSid}`);
      console.log(`📊 [CallController] Call status: ${webhookData.CallStatus}`);

      // Try to add webhook to processing queue, fallback to direct processing
      console.log(`📋 [CallController] Adding webhook job to queue`);
      
      try {
        const job = await webhookQueue.add(
          'process-webhook',
          {
            twilioSid: twilioSid,
            webhookData: webhookData
          },
          {
            priority: 1,
            delay: 0,
            removeOnComplete: 10,
            removeOnFail: 5,
            attempts: 3,
          }
        );

        console.log(`✅ [CallController] Webhook job ${job.id} added to queue successfully`);

        // Respond to Twilio immediately
        res.status(200).json({
          success: true,
          message: 'Webhook received and queued for processing'
        });

      } catch (queueError) {
        console.warn(`⚠️ [CallController] Webhook queue failed, falling back to direct processing:`, (queueError as Error)?.message);
        
        // Process webhook directly as fallback
        const updateSuccess = await callService.updateCallFromWebhook(twilioSid, webhookData);
        
        if (!updateSuccess) {
          console.error(`❌ [CallController] Failed to update call from webhook (fallback)`);
          res.status(500).json({
            success: false,
            message: 'Failed to update call record'
          });
          return;
        }

        console.log(`✅ [CallController] Webhook processed directly as fallback`);

        // Respond to Twilio immediately
        res.status(200).json({
          success: true,
          message: 'Webhook received and processed (direct fallback)'
        });
      }

    } catch (error) {
      console.error(`❌ [CallController] Error in handleCallStatusWebhook:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * DEMO VERSION: Temporary call initiation bypassing Redis/webhook
   * POST /api/calls/demo-initiate
   */
  async demoInitiateCall(req: Request, res: Response): Promise<void> {
    try {
      const { assistantId, toNumber, contactName } = req.body;
      const organizationId = (req as any).user?.organizationId;
      
      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      console.log("🚀 [Demo] Initiating call with data:", { assistantId, toNumber, contactName });

      // Check if organization has sufficient credits (minimum $0.1 required)
      console.log(`💰 [Demo CallController] Checking credit availability`);
      const creditCheck = await billingService.checkSufficientCredits(organizationId, 0.10);
      
      if (!creditCheck.hasCredits) {
        console.error(`❌ [Demo CallController] Insufficient credits: ${creditCheck.message}`);
        res.status(402).json({
          success: false,
          message: 'Low Credits, please add more credits to make call.',
          data: {
            currentBalance: creditCheck.currentBalance,
            requiresPayment: true,
            minimumRequired: 0.10
          }
        });
        return;
      }

      // Create the call with demo processing
      const result = await callService.demoCreateCallWithAgent(organizationId, {
        assistantId,
        toNumber,
        contactName
      });

      // Handle duplicate call response
      if (result && result.success === false && result.message?.includes('already in progress')) {
        res.status(409).json({
          success: false,
          message: result.message,
          data: { existingCallId: result.existingCallId }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
        message: 'Demo call initiated successfully'
      });

    } catch (error) {
      console.error(`❌ [Demo CallController] Error in demoInitiateCall:`, error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Call initiation failed'
      });
    }
  }

  async handleStatusWebhook(req: Request, res: Response) {
    try {
      console.log('📞 [Webhook] Received webhook:', req.body);
      console.log('📞 [Webhook] Webhook type:', req.body.type);

      // The entire JSON payload from the webhook is in req.body
      const webhookData = req.body;

      // Validate webhook data
      if (!webhookData.call_id) {
        console.error('❌ [Webhook] Error: Missing call identifier in webhook payload.');
        return res.status(400).json({ success: false, message: 'Missing call identifier.' });
      }

      if (!webhookData.type) {
        console.error('❌ [Webhook] Error: Missing webhook type in payload.');
        return res.status(400).json({ success: false, message: 'Missing webhook type.' });
      }

      // Validate webhook type
      const validTypes = ['PHONE_CALL_CONNECTED', 'TRANSCRIPT_COMPLETE', 'PHONE_CALL_ENDED','CALL_SUMMARY'];
      if (!validTypes.includes(webhookData.type)) {
        console.warn(`⚠️ [Webhook] Unknown webhook type: ${webhookData.type}. Processing anyway.`);
      }

      // Process the webhook using the updated service method
      await callService.updateCallFromWebhookDemo(webhookData.call_id, webhookData);

      // Acknowledge receipt of the webhook with a 200 OK response.
      res.status(200).json({ success: true, message: 'Webhook received and processed.' });

    } catch (error) {
      console.error(`❌ [Webhook] Error processing webhook:`, error);
      // Don't send a detailed error back to the webhook sender for security reasons.
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }

  /**
   * Export calls to CSV
   * GET /api/calls/export
   */
  async exportCalls(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId;
      
      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      console.log(`📊 [CallController] Exporting calls for organization: ${organizationId}`);
      
      // Get filters from query parameters
      const filters = req.query as any;
      
      // Get calls with optional filters
      const calls = await callService.getFilteredCalls(organizationId, filters);
      
      // Convert calls to CSV format
      const csvHeaders = [
        'Call ID',
        'Agent Name', 
        'Contact Name',
        'Phone Number',
        'Date',
        'Duration (seconds)',
        'Status',
        'User Tags',
        'Created At'
      ];
      
      const csvRows = calls.map((call: any) => [
        call.callId || call._id?.toString().slice(-6) || 'N/A',
        call.assistantId?.name || call.agentName || 'N/A',
        call.contactName || 'N/A',
        call.toNumber || call.contactPhone || call.phoneNumber || 'N/A',
        call.createdAt ? new Date(call.createdAt).toLocaleDateString() : 'N/A',
        call.duration || 0,
        call.status || 'N/A',
        Array.isArray(call.user_tags) ? call.user_tags.join('; ') : 'N/A',
        call.createdAt ? new Date(call.createdAt).toISOString() : 'N/A'
      ]);
      
      // Create CSV content
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row: any[]) => row.map((field: any) => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      // Set response headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="call_logs.csv"');
      
      res.status(200).send(csvContent);
      
    } catch (error) {
      console.error(`❌ [CallController] Error in exportCalls:`, error);
      res.status(500).json({
        success: false,
        message: `Export failed: ${(error as Error)?.message || 'Unknown error'}`
      });
    }
  }
  
}




// Validation rules for call initiation
export const validateCallInitiation = [
  body('assistantId')
    .notEmpty()
    .withMessage('Assistant ID is required')
    .isString()
    .withMessage('Assistant ID must be a string'),
  body('toNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Phone number must be in E.164 format (e.g., +1234567890)'),
  body('message')
    .optional()
    .isString()
    .withMessage('Message must be a string')
    .isLength({ max: 1000 })
    .withMessage('Message must be less than 1000 characters')
];

// Demo validation rules for call initiation
export const validateDemoCallInitiation = [
  body('assistantId')
    .notEmpty()
    .withMessage('Assistant ID is required')
    .isString()
    .withMessage('Assistant ID must be a string'),
  body('toNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .isString()
    .withMessage('Phone number must be a string'),
  body('contactName')
    .notEmpty()
    .withMessage('Contact name is required')
    .isString()
    .withMessage('Contact name must be a string')
];

export const callController = new CallController();
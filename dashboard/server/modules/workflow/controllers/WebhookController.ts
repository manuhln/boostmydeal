import { Request, Response } from 'express';
import { CallSession } from '../models/CallSession';
import { Agent } from '../../agent/Agent';
import { Workflow } from '../models/Workflow';
import { workflowExecutor } from '../services/WorkflowExecutor';
import { Call } from '../../../models/Call';
import { callService } from '../../calls/services/CallService';

export class WebhookController {
  // This integrates with the existing webhook flow
  async processWorkflowWebhook(callId: string, type: string, data: any, organizationId: string): Promise<void> {
    try {
      console.log(`🎯 [WebhookController] Processing workflow webhook: ${callId} - ${type}`);
      console.log(`📋 [WebhookController] Organization ID: ${organizationId}`);

      // 1. Find or create call session
      let session = await CallSession.findOne({ callId }).populate('assistantId');

      if (!session) {
        // Try to find the assistant from the original call data
        // This assumes we can extract assistantId from webhook data or find it another way
        let assistantId = data.assistantId;
        
        if (!assistantId && data.call_id) {
          // Try to find from existing Call model if needed
          const existingCall = await Call.findOne({ twilioSid: callId });
          if (existingCall) {
            assistantId = existingCall.assistantId;
          }
        }

        if (assistantId) {
          console.log(`✅ [WebhookController] Found assistantId: ${assistantId} for call ${callId}`);
          session = new CallSession({
            callId,
            assistantId,
            payloads: [],
            organizationId
          });
        } else {
          console.warn(`⚠️ [WebhookController] No assistant found for call ${callId}, skipping workflow processing`);
          return;
        }
      }

      // 2. Add payload to session
      session.payloads.push({
        type,
        data,
        timestamp: new Date()
      });
      session.lastUpdatedAt = new Date();
      await session.save();

      console.log(`📝 [WebhookController] Updated call session with ${type} payload`);

      // 2.5. Update call status based on webhook event type
      try {
        const statusUpdated = await callService.updateCallFromWebhookEvent(callId, type, data);
        if (statusUpdated) {
          console.log(`✅ [WebhookController] Call status updated for ${type} event`);
        }
      } catch (error) {
        console.error(`❌ [WebhookController] Error updating call status:`, error);
      }

      // 3. Check if assistant has workflows
      const assistant = await Agent.findById(session.assistantId);
      if (!assistant) {
        console.warn(`⚠️ [WebhookController] Assistant not found: ${session.assistantId}`);
        return;
      }

      // Check if assistant has workflows assigned
      console.log(`📋 [WebhookController] Assistant found: ${assistant.name}, workflowIds: ${assistant.workflowIds?.join(', ')}`);
      if (!assistant.workflowIds || assistant.workflowIds.length === 0) {
        console.log(`📋 [WebhookController] Assistant ${assistant.name} has no workflows assigned`);
        return;
      }

      // 4. Use webhook type directly as trigger type
      let triggerType = type;
      
      // Find all workflows assigned to the assistant that match the trigger type
      const workflows = await Workflow.find({
        _id: { $in: assistant.workflowIds },
        organizationId,
        isActive: true,
        'nodes.type': 'TRIGGER',
        'nodes.data.triggerType': triggerType
      });

      console.log(`🔍 [WebhookController] Webhook type: ${type} mapped to trigger type: ${triggerType}`);
      
      if (!workflows || workflows.length === 0) {
        console.log(`📋 [WebhookController] No matching workflows found for assistant ${assistant.name} with trigger type ${triggerType}`);
        return;
      }

      console.log(`✅ [WebhookController] Found ${workflows.length} workflow(s) for assistant "${assistant.name}" with ${triggerType} trigger`);
      workflows.forEach((workflow: any) => {
        console.log(`  - ${workflow.name} (${workflow._id})`);
      });

      // 5. Execute each matching workflow asynchronously
      for (const workflow of workflows) {
        try {
          console.log(`🚀 [WebhookController] Starting workflow execution: ${workflow.name} (${workflow._id})`);
          // Execute workflow in background - don't await to avoid blocking webhook response
          setImmediate(() => {
            console.log(`⏳ [WebhookController] Executing workflow ${workflow._id} in background`);
            workflowExecutor.start((workflow._id as any).toString(), triggerType, session)
              .then(() => {
                console.log(`✅ [WebhookController] Workflow ${workflow._id} execution completed`);
              })
              .catch(error => {
                console.error(`❌ [WebhookController] Workflow ${workflow._id} execution failed:`, error);
              });
          });
        } catch (workflowError) {
          console.error(`❌ [WebhookController] Error starting workflow ${(workflow._id as any)}:`, workflowError);
        }
      }

    } catch (error) {
      console.error(`❌ [WebhookController] Error processing workflow webhook:`, error);
    }
  }

  // Manual trigger endpoint for testing
  async triggerWorkflow(req: Request, res: Response) {
    try {
      const { workflowId, callId, triggerType } = req.body;
      const organizationId = (req as any).user.organizationId;

      if (!workflowId || !callId || !triggerType) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: workflowId, callId, triggerType'
        });
      }

      // Find call session
      const session = await CallSession.findOne({ callId, organizationId });
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Call session not found'
        });
      }

      // Start workflow execution
      await workflowExecutor.start(workflowId, triggerType, session);

      res.json({
        success: true,
        message: 'Workflow triggered successfully'
      });

    } catch (error) {
      console.error('❌ [WebhookController] Error triggering workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger workflow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
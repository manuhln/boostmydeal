import { IBaseNodeHandler, IExecutionContext, INodeExecutionResult } from './IBaseNodeHandler';
import { SmtpService } from '../../../../integrations/providers/smtp/smtp.service';
import { SmtpIntegration, EmailPayload } from '../../../../integrations/providers/smtp/smtp.integration';

export class EmailNodeHandler extends IBaseNodeHandler {
  async execute(node: any, context: IExecutionContext): Promise<INodeExecutionResult> {
    try {
      console.log(`📧 [EmailNodeHandler] Executing email node ${node.id}`);

      // Get configuration from node
      const config = node.data.config || node.data;

      // Check if there's AI agent output to use
      const aiAgentOutputs = this.findAIAgentOutputs(context);
      console.log(`🤖 [EmailNodeHandler] Found AI agent outputs:`, aiAgentOutputs);

      // If AI agent determined email is not wanted, skip sending
      if (aiAgentOutputs && aiAgentOutputs.email_want === false) {
        console.log(`⏭️ [EmailNodeHandler] AI agent determined email is not wanted, skipping`);
        return {
          exitHandle: 'default',
          data: {
            email_sent: false,
            reason: 'AI agent determined customer does not want email',
            ai_analysis: aiAgentOutputs
          }
        };
      }

      // Use AI agent output for recipient if available, otherwise use configured recipient
      let recipient = config.recipient || '';
      if (aiAgentOutputs?.email && aiAgentOutputs.email !== null && aiAgentOutputs.email !== 'null') {
        recipient = aiAgentOutputs.email;
        console.log(`📧 [EmailNodeHandler] Using email from AI agent analysis: ${recipient}`);
      } else {
        recipient = this.resolvePlaceholders(recipient, context);
      }

      // Check if AI wants email but no valid email address found
      if (aiAgentOutputs?.email_want === true && (!recipient || recipient === '' || recipient === 'null')) {
        console.log(`⚠️ [EmailNodeHandler] Customer wants email but no email address found in transcript`);
        return {
          exitHandle: 'default',
          data: {
            email_sent: false,
            reason: 'Customer wants email but no email address found in transcript',
            ai_analysis: aiAgentOutputs
          }
        };
      }

      // Resolve placeholders in email data, enriching with AI agent data
      const enrichedContext = {
        ...context,
        aiAnalysis: aiAgentOutputs
      };
      
      const subject = this.resolvePlaceholders(config.subject || '', enrichedContext);
      
      // Use AI agent output for email body if available, otherwise use configured body
      let body = '';
      if (aiAgentOutputs?.email_body) {
        body = aiAgentOutputs.email_body;
        console.log(`📝 [EmailNodeHandler] Using email body from AI agent analysis`);
      } else {
        body = this.resolvePlaceholders(config.body || '', enrichedContext);
        console.log(`📝 [EmailNodeHandler] Using configured email body`);
      }

      console.log(`📬 [EmailNodeHandler] Sending email to: ${recipient}`);

      // Validate recipient email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipient)) {
        console.log(`❌ [EmailNodeHandler] Invalid email address: ${recipient}`);
        return {
          exitHandle: 'default',
          data: {
            email_sent: false,
            reason: `Invalid email address: ${recipient}`,
            recipient_attempted: recipient,
            ai_analysis: aiAgentOutputs
          }
        };
      }

      // Get SMTP configuration for the organization
      // Since agents don't have userIds, we need to find any SMTP config for this organization
      const { IntegrationConfig } = await import('../../../../integrations/common/integration-config.model');
      const integrationConfig = await IntegrationConfig.findOne({
        organizationId: context.organizationId,
        type: 'SMTP',
        isActive: true
      });

      if (!integrationConfig) {
        throw new Error('No SMTP configuration found for this organization. Please configure SMTP integration first.');
      }

      // Decrypt the configuration manually since we're bypassing the service
      const { decrypt } = await import('../../../../integrations/common/encryption.util');
      const decryptedConfig = decrypt(integrationConfig.config);
      const smtpConfig = JSON.parse(decryptedConfig);

      console.log(`🔧 [EmailNodeHandler] Using SMTP config: ${smtpConfig.host}:${smtpConfig.port}`);

      // Create SMTP integration instance
      const smtpIntegration = new SmtpIntegration(smtpConfig);

      // Prepare email payload
      const emailPayload: EmailPayload = {
        to: recipient,
        subject: subject,
        html: body,
        text: body.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };

      // Send email using the existing SMTP integration
      const info = await smtpIntegration.performAction(emailPayload);

      console.log(`✅ [EmailNodeHandler] Email sent successfully: ${info.messageId}`);

      return {
        exitHandle: 'default',
        data: {
          email_sent: true,
          recipient: recipient,
          subject: subject,
          message_id: info.messageId,
          smtp_response: info.response,
          accepted: info.accepted,
          rejected: info.rejected,
          sent_at: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`❌ [EmailNodeHandler] Error in email node ${node.id}:`, error);
      
      return {
        exitHandle: 'error',
        data: {
          email_sent: false,
          error: true,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // Helper method to find AI agent outputs from previous nodes
  private findAIAgentOutputs(context: IExecutionContext): any {
    // Look through all node outputs for AI agent results
    for (const [nodeId, output] of Object.entries(context.outputs || {})) {
      // Check if this output has AI agent characteristics
      if (output && typeof output === 'object' && 'ai_analysis_complete' in output) {
        return output;
      }
    }
    return null;
  }
}
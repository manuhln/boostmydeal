import { IBaseNodeHandler, IExecutionContext, INodeExecutionResult } from './IBaseNodeHandler';

export class AiAgentNodeHandler extends IBaseNodeHandler {
  async execute(node: any, context: IExecutionContext): Promise<INodeExecutionResult> {
    try {
      // Get configuration from node data
      const config = node.data.config || node.data;
      const inputField = config.inputField || 'transcript';
      const prompt = config.prompt || '';
      const tool = config.tool || 'email';

      console.log(`🔧 [AiAgentNodeHandler] Configuration:`, {
        inputField,
        tool,
        hasPrompt: !!prompt,
        callId: context.session?.callId,
        hasPayloads: !!context.session?.payloads?.length
      });

      // Get input data based on inputField selection
      let inputData = '';
      if (inputField === 'transcript') {
        // First check if we have the transcript from TRANSCRIPT_COMPLETE webhook
        const transcriptPayload = context.session?.payloads?.find((p: any) => p.type === 'TRANSCRIPT_COMPLETE');
        if (transcriptPayload?.data?.full_transcript) {
          inputData = transcriptPayload.data.full_transcript;
          console.log(`📝 [AiAgentNodeHandler] Using transcript from TRANSCRIPT_COMPLETE webhook`);
        } else if (context.session?.callId) {
          // If not in webhook payload, fetch from Call model
          const { Call } = await import('../../../../models/Call');
          const call = await Call.findOne({ twilioSid: context.session.callId });
          if (call?.transcript) {
            inputData = call.transcript;
            console.log(`📝 [AiAgentNodeHandler] Using transcript from Call model`);
          }
        }
        
        if (!inputData) {
          console.warn(`⚠️ [AiAgentNodeHandler] No transcript found for call`);
        }
      }

      // Build enhanced prompt with input data and tool-specific output schema
      let outputSchema = '';
      switch (tool) {
        case 'email':
          outputSchema = `{
  email_want: true,
  email: "actual_email@domain.com_or_null_if_not_found",
  email_body: "Email body text based on conversation"
}`;
          break;
        case 'hubspot':
          outputSchema = `{
  hubspot_want: true,
  deal_name: "Customer Deal Name",
  amount: 5000
}`;
          break;
        case 'zoho':
          outputSchema = `{
  zoho_want: true,
  deal_name: "Customer Deal Name", 
  amount: 5000
}`;
          break;
        default:
          outputSchema = `{
  ${tool}_want: true,
  email: "abc@gmail.com"
}`;
      }

      const enhancedPrompt = `${prompt}

Input data (${inputField}): ${inputData}

Tool to use: ${tool}

Give output in the following example JSON structure:
${outputSchema}

Important: 
- Set ${tool}_want to true only if the customer actually wants to use this tool/service
- Extract relevant information from the input data to populate the fields
- For email extraction: ONLY use actual email addresses found in the conversation. If no email is mentioned, set email to null
- For email body: Generate relevant content based on the actual conversation, not placeholder text
- For deal amounts, use reasonable estimates based on the conversation context
- For stages, choose appropriate values based on the customer's interest level
- Never use placeholder emails like "john.doe@example.com" or "abc@gmail.com" - only extract real emails from the transcript`;

      const resolvedPrompt = this.resolvePlaceholders(enhancedPrompt, context);
      
      console.log(`🤖 [AiAgentNodeHandler] Executing AI node ${node.id} with prompt:`, resolvedPrompt);

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Using latest model as per blueprint
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that analyzes call transcripts and provides structured JSON responses.'
            },
            {
              role: 'user',
              content: resolvedPrompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const aiResponse = result.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('No response from AI model');
      }

      // Parse JSON response
      let parsedResult;
      try {
        parsedResult = JSON.parse(aiResponse);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', aiResponse);
        // Fallback: return raw response
        parsedResult = { response: aiResponse };
      }

      console.log(`✅ [AiAgentNodeHandler] AI node ${node.id} completed:`, parsedResult);

      // Store the AI response in workflow data for other nodes to use
      return {
        exitHandle: 'default',
        data: {
          ...parsedResult,
          ai_analysis_complete: true,
          analyzed_tool: tool,
          input_field_used: inputField
        }
      };
    } catch (error) {
      console.error(`❌ [AiAgentNodeHandler] Error in AI node ${node.id}:`, error);
      
      return {
        exitHandle: 'error',
        data: {
          error: true,
          message: error instanceof Error ? error.message : 'Unknown error',
          ai_analysis_complete: false
        }
      };
    }
  }
}
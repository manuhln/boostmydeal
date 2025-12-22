import { Worker, Job } from 'bullmq';
import { redisPool } from '../redis/connection-pool';
import { callService } from '../services/CallService';
import { CallQueuePayload } from '../services/CallService';
import { callTimeoutQueue } from './callTimeoutChecker';
import twilio from 'twilio';

/**
 * Process outbound call function for BullMQ
 */
export async function processOutboundCall(job: Job<CallQueuePayload>) {
  const payload: CallQueuePayload = job.data;
  
  console.log(`🔄 [OutboundWorker] Processing outbound call job ${job.id}`);
  
  // Log the complete call queue payload prominently
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔄 CALL QUEUE PAYLOAD (Internal)`);
  console.log(`${'='.repeat(80)}`);
  console.log(JSON.stringify(payload, null, 2));
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Step 1: Create call record in MongoDB
    console.log(`💾 [OutboundWorker] Creating call record in database`);
    const callId = await callService.createCallRecord(payload);
    
    if (!callId) {
      console.error(`❌ [OutboundWorker] Failed to create call record`);
      throw new Error('Failed to create call record in database');
    }

    console.log(`✅ [OutboundWorker] Call record created with ID: ${callId}`);

    // Step 2: Initialize Twilio client
    console.log(`📞 [OutboundWorker] Initializing Twilio client`);
    const client = twilio(payload.config.account_sid, payload.config.auth_token);
    
    console.log(`🔧 [OutboundWorker] Twilio client initialized with account: ${payload.config.account_sid.substring(0, 10)}...`);

    // Step 3: Make the Twilio API call
    console.log(`🚀 [OutboundWorker] Making Twilio API call`);
    console.log(`🏷️ [OutboundWorker] Including tags - user_tags: ${JSON.stringify(payload.user_tags)}, system_tags: ${JSON.stringify(payload.system_tags)}`);
    
    // Create URL with tags as query parameters
    const twimlUrlWithTags = new URL(payload.config.twiml_url);
    if (payload.user_tags && payload.user_tags.length > 0) {
      twimlUrlWithTags.searchParams.set('user_tags', JSON.stringify(payload.user_tags));
    }
    if (payload.system_tags && payload.system_tags.length > 0) {
      twimlUrlWithTags.searchParams.set('system_tags', JSON.stringify(payload.system_tags));
    }
    twimlUrlWithTags.searchParams.set('assistant_id', payload.assistantId);
    twimlUrlWithTags.searchParams.set('call_id', callId);
    
    const twilioCallPayload = {
      url: twimlUrlWithTags.toString(),
      to: payload.to_number,
      from: payload.config.from_number,
      statusCallback: `https://c274131b-ce69-4963-95cc-126befb9097c-00-2runy6vs2ky1.kirk.replit.dev/api/webhook/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    };

    // Log the complete Twilio call payload prominently
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📞 TWILIO CALL INITIATION JSON PAYLOAD`);
    console.log(`${'='.repeat(80)}`);
    console.log(JSON.stringify(twilioCallPayload, null, 2));
    console.log(`${'='.repeat(80)}\n`);

    const call = await client.calls.create(twilioCallPayload);

    console.log(`✅ [OutboundWorker] Twilio call created successfully`);
    console.log(`📋 [OutboundWorker] Twilio response:`, {
      sid: call.sid,
      status: call.status,
      to: call.to,
      from: call.from
    });

    // Step 3.5: Send JSON payload to telephonic server with agent tags
    console.log(`🌐 [OutboundWorker] Sending agent data with tags to telephonic server`);
    
    try {
      // Fetch agent details to get all the required information
      const Agent = (await import('../../agent/Agent')).Agent;
      const agent = await Agent.findById(payload.assistantId);
      
      if (agent) {
        console.log(`📧 [OutboundWorker] Received payload voicemail settings:`, {
          voicemailDetection: payload.voicemailDetection,
          voicemailMessage: payload.voicemailMessage,
          callRecording: payload.callRecording,
          callRecordingFormat: payload.callRecordingFormat
        });
        console.log(`📧 [OutboundWorker] Agent voicemail settings from DB:`, {
          voicemailDetection: agent.voicemailDetection,
          voicemailMessage: agent.voicemailMessage,
          callRecording: agent.callRecording,
          callRecordingFormat: agent.callRecordingFormat
        });

        const telephonePayload = {
          to_phone: payload.to_number,
          from_phone: payload.config.from_number,
          twilio_account_sid: payload.config.account_sid,
          twilio_auth_token: payload.config.auth_token,
          agent_initial_message: agent.firstMessage || "Hello! How can I assist you today?",
          agent_prompt_preamble: agent.systemPrompt || "You are a helpful AI assistant.",
          agent_trigger: agent.trigger,
          user_speak_first: agent.userSpeaksFirst || false,
          agent_generate_responses: true,
          tts: {
            provider_name: (() => {
              const provider = agent.voiceProvider?.toLowerCase();
              if (provider === 'elevenlabs') return 'eleven_labs';
              if (provider === 'rime') return 'rime';
              if (provider === 'streamelements') return 'stream_elements';
              return provider || 'deepgram';
            })(),
            voice_id: agent.voice || "EXAVITQu4vr4xnSDxMaL",
            model_id: agent.voiceProvider?.toLowerCase() === 'rime' ? 'arcana' : (agent.voiceProvider?.toLowerCase() === 'elevenlabs' ? 'eleven_turbo_v2' : undefined),
            api_key: (() => {
              const provider = agent.voiceProvider?.toLowerCase();
              if (provider === 'deepgram') return process.env.DEEPGRAM_API_KEY;
              if (provider === 'elevenlabs') return process.env.ELEVENLABS_API_KEY;
              if (provider === 'rime') return process.env.RIME_API_KEY;
              if (provider === 'streamelements') return process.env.STREAMELEMENTS_API_KEY;
              return process.env.DEEPGRAM_API_KEY; // default
            })()
          },
          stt: {
            provider_name: agent.transcriber?.toLowerCase() || "deepgram",
            model: "nova-2",
            api_key: process.env.DEEPGRAM_API_KEY
          },
          model: {
            name: agent.aiModel || "gpt-4",
            api_key: process.env.OPENAI_API_KEY
          },
          rag_response: agent.ragResponse || "",
          user_tags: payload.user_tags || [],
          system_tags: payload.system_tags || [],
          recording: agent.callRecording !== undefined ? agent.callRecording : true,
          voicemail: agent.voicemailDetection !== undefined ? agent.voicemailDetection : false,
          voicemail_message: agent.voicemailMessage || "",
          recording_format: agent.callRecordingFormat || "mp3"
        };

        console.log(`🏷️ [OutboundWorker] Sending payload with tags:`, {
          user_tags: telephonePayload.user_tags,
          system_tags: telephonePayload.system_tags
        });
        console.log(`📧 [OutboundWorker] Final telephonic payload voicemail settings:`, {
          recording: telephonePayload.recording,
          voicemail: telephonePayload.voicemail,
          voicemail_message: telephonePayload.voicemail_message,
          recording_format: telephonePayload.recording_format
        });

        const apiUrl = process.env.TELEPHONIC_SERVER_URL;
        
        if (!apiUrl) {
          throw new Error('TELEPHONIC_SERVER_URL environment variable is not configured');
        }
        
        console.log(`🌐 [OutboundWorker] Sending request to telephonic server: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(telephonePayload)
        });

        if (response.ok) {
          const responseData = await response.json();
          console.log(`✅ [OutboundWorker] Telephonic server response:`, responseData);
          
          // Check if response contains call_id to determine success
          if (responseData.call_id || responseData.callId) {
            console.log(`🎉 [OutboundWorker] Call initiated successfully with call_id: ${responseData.call_id || responseData.callId}`);
            
            // Update call record with success status and call_id
            await callService.updateCallWithSuccess(callId, responseData.call_id || responseData.callId, responseData);
            
            // Schedule timeout check for PHONE_CALL_CONNECTED webhook
            try {
              console.log(`⏰ [OutboundWorker] Scheduling timeout check for call ${callId} in 2 minutes`);
              
              await callTimeoutQueue.add(
                'check-call-connection-timeout',
                {
                  callId: callId,
                  twilioSid: responseData.call_id || responseData.callId,
                  checkAfterMinutes: 2
                },
                {
                  delay: 2 * 60 * 1000, // 2 minutes in milliseconds
                  jobId: `timeout-check-${callId}`, // Unique job ID to prevent duplicates
                  removeOnComplete: 10,
                  removeOnFail: 5
                }
              );
              
              console.log(`✅ [OutboundWorker] Timeout check scheduled successfully for call ${callId}`);
            } catch (timeoutError) {
              console.error(`❌ [OutboundWorker] Failed to schedule timeout check for call ${callId}:`, timeoutError);
              // Don't fail the call initiation if timeout scheduling fails
            }
            
            // Return successful result
            return {
              success: true,
              message: 'Outbound call initiated',
              call_id: responseData.call_id || responseData.callId,
              to_phone: payload.to_number,
              from_phone: payload.config.from_number,
              callId: callId,
              twilioSid: call.sid,
              status: 'initiated'
            };
          } else {
            console.error(`❌ [OutboundWorker] Call failed - no call_id received in response:`, responseData);
            
            // Update call record with failed status
            await callService.updateCallWithFailure(callId, 'No call_id received from telephonic server', responseData);
            
            throw new Error('Call failed - no call_id received from telephonic server');
          }
        } else {
          const errorText = await response.text();
          console.error(`❌ [OutboundWorker] Telephonic server request failed:`, response.status, response.statusText, errorText);
          
          // Update call record with failed status
          await callService.updateCallWithFailure(callId, `Telephonic server error: ${response.status} ${response.statusText}`, { error: errorText });
          
          throw new Error(`Telephonic server request failed: ${response.status} ${response.statusText}`);
        }
      }
    } catch (telephoneError) {
      const error = telephoneError as Error;
      console.error(`❌ [OutboundWorker] Error sending to telephonic server:`, error);
      
      // Update call record with failed status
      await callService.updateCallWithFailure(callId, `Error connecting to telephonic server: ${error.message}`, { error: error.message });
      
      throw new Error(`Error connecting to telephonic server: ${error.message}`);
    }

  } catch (error) {
    const err = error as Error;
    console.error(`❌ [OutboundWorker] Error processing outbound call job ${job.id}:`, err);
    
    // Log specific Twilio errors
    if ((error as any).code) {
      console.error(`🔥 [OutboundWorker] Twilio error code: ${(error as any).code}, message: ${err.message}`);
    }
    
    throw err; // Re-throw to mark job as failed
  }
}

/**
 * BullMQ Worker to process outbound calls from Redis Cloud queue
 */
const outboundCallWorker = new Worker(
  'call-queue-outbound',
  processOutboundCall,
  {
    connection: redisPool.getConnection('outbound-worker'),
    concurrency: 5,
  }
);

// Worker event handlers
outboundCallWorker.on('completed', (job) => {
  console.log(`✅ [OutboundWorker] Job ${job.id} completed successfully`);
});

outboundCallWorker.on('failed', (job, err) => {
  console.error(`❌ [OutboundWorker] Job ${job?.id} failed:`, err.message);
});

outboundCallWorker.on('error', (err) => {
  console.error('❌ [OutboundWorker] Worker error:', err);
});

console.log('🚀 [OutboundWorker] BullMQ outbound call worker initialized and listening for jobs');

export default outboundCallWorker;
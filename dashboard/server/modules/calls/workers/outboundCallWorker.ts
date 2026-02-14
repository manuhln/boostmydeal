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

    // Step 2: Route based on provider (Twilio or Voxsun)
    console.log(`📱 [OutboundWorker] Call provider: ${payload.provider}`);
    
    let externalCallIdentifier: string | null = null; // Track call ID from provider (Twilio SID or Voxsun ID)
    
    if (payload.provider === 'voxsun') {
      // VOXSUN FLOW: Use LiveKit SIP API
      console.log(`🔄 [OutboundWorker] Using Voxsun/LiveKit SIP API for call`);
      
      // For now, we'll create a placeholder call ID and proceed to the telephonic server
      // LiveKit SIP calls are managed through the telephonic server
      const voxsunCallId = `voxsun-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`📞 [OutboundWorker] Generated Voxsun call ID: ${voxsunCallId}`);
      
      // Save Voxsun call ID (will be updated once telephonic server responds with actual ID)
      await callService.saveVoxsunCallId(callId, voxsunCallId);
      externalCallIdentifier = voxsunCallId;
      
      // Log Voxsun config
      console.log(`🔧 [OutboundWorker] Voxsun config:`, {
        domain: payload.config.voxsun_domain,
        port: payload.config.voxsun_port,
        livekit_trunk_id: payload.config.voxsun_livekit_trunk_id
      });
      
      // Continue to telephonic server with Voxsun config
      // The telephonic server will handle the SIP call creation via LiveKit
    } else {
      // TWILIO FLOW: Use Twilio API (existing flow)
      console.log(`🔄 [OutboundWorker] Using Twilio API for call`);
      
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
      
      const appUrl = process.env.APP_URL || 'https://portal.boostmydeal.com';
      const twilioCallPayload = {
        url: twimlUrlWithTags.toString(),
        to: payload.to_number,
        from: payload.config.from_number,
        statusCallback: `${appUrl}/api/webhook/call-status`,
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

      // Save Twilio SID immediately so webhooks can find this call
      console.log(`💾 [OutboundWorker] Saving Twilio SID to call record`);
      await callService.saveTwilioSid(callId, call.sid);
      externalCallIdentifier = call.sid;
    }

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
          provider: payload.provider || 'twilio', // Include provider information
          to_phone: payload.to_number,
          from_phone: payload.config.from_number,
          // Only include Twilio credentials if provider is twilio
          ...(payload.provider === 'twilio' && {
            twilio_account_sid: payload.config.account_sid,
            twilio_auth_token: payload.config.auth_token,
          }),
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
            const conversationId = responseData.call_id || responseData.callId;
            console.log(`🎉 [OutboundWorker] Call initiated successfully with call_id: ${conversationId}`);
            
            // For Voxsun, make additional call to LiveKit to initiate the actual SIP call
            if (payload.provider === 'voxsun') {
              console.log(`📞 [OutboundWorker] Initiating Voxsun SIP call via LiveKit for conversation ${conversationId}`);
              
              const liveKitServerUrl = process.env.LIVEKIT_SERVER_URL || 'http://localhost:5000';
              const liveKitApiKey = process.env.LIVEKIT_API_KEY || 'dev-api-key';
              
              try {
                // Use AbortController for timeout - wait_until_answered=True in the
                // SIP endpoint means this call blocks until the phone is picked up
                // or VoxSun returns a SIP error. Allow up to 90 seconds for ringing.
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout
                
                const sipCallResponse = await fetch(`${liveKitServerUrl}/start_sip_call`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': liveKitApiKey
                  },
                  signal: controller.signal,
                  body: JSON.stringify({
                    room: conversationId,
                    to_phone: payload.to_number,
                    from_phone: payload.config.from_number,
                    contact_name: 'Customer',
                    user_speak_first: false,
                    livekit_sip_trunk_id: payload.config.voxsun_livekit_trunk_id,
                    // Agent configuration for the LiveKit agent worker
                    agent_initial_message: telephonePayload.agent_initial_message,
                    agent_prompt_preamble: telephonePayload.agent_prompt_preamble,
                    tts_provider: telephonePayload.tts?.provider_name,
                    tts_voice_id: telephonePayload.tts?.voice_id,
                    stt_provider: telephonePayload.stt?.provider_name,
                    stt_model: telephonePayload.stt?.model,
                    llm_model: telephonePayload.model?.name,
                    llm_api_key: telephonePayload.model?.api_key,
                    voicemail_detection: telephonePayload.voicemail,
                    voicemail_message: telephonePayload.voicemail_message,
                    recording: telephonePayload.recording
                  })
                });
                
                clearTimeout(timeoutId);
                
                if (sipCallResponse.ok) {
                  const sipData = await sipCallResponse.json();
                  console.log(`✅ [OutboundWorker] LiveKit SIP call created:`, sipData);
                  
                  // Update call record with success status and conversation_id
                  await callService.updateCallWithSuccess(callId, conversationId, sipData);
                  
                  // Schedule timeout check
                  try {
                    await callTimeoutQueue.add(
                      'check-call-connection-timeout',
                      {
                        callId: callId,
                        twilioSid: conversationId,
                        checkAfterMinutes: 2
                      },
                      {
                        delay: 2 * 60 * 1000,
                        jobId: `timeout-check-${callId}`,
                        removeOnComplete: 10,
                        removeOnFail: 5
                      }
                    );
                    console.log(`✅ [OutboundWorker] Timeout check scheduled for Voxsun call ${callId}`);
                  } catch (timeoutError) {
                    console.error(`⚠️ [OutboundWorker] Failed to schedule timeout check:`, timeoutError);
                  }
                  
                  return {
                    success: true,
                    message: 'Voxsun SIP call initiated',
                    call_id: conversationId,
                    to_phone: payload.to_number,
                    from_phone: payload.config.from_number,
                    callId: callId,
                    externalCallIdentifier: conversationId,
                    status: 'initiated'
                  };
                } else {
                  const sipError = await sipCallResponse.text();
                  console.error(`❌ [OutboundWorker] LiveKit SIP call failed:`, sipCallResponse.status, sipError);
                  await callService.updateCallWithFailure(callId, `LiveKit SIP call failed: ${sipCallResponse.status}`, { error: sipError });
                  throw new Error(`LiveKit SIP call failed: ${sipCallResponse.status}`);
                }
              } catch (sipError) {
                console.error(`❌ [OutboundWorker] Error calling LiveKit SIP:`, sipError instanceof Error ? sipError.message : String(sipError));
                await callService.updateCallWithFailure(callId, `Failed to initiate LiveKit SIP call`, { error: String(sipError) });
                throw sipError;
              }
            } else {
              // For Twilio, update call record directly
              await callService.updateCallWithSuccess(callId, conversationId, responseData);
              
              // Schedule timeout check for PHONE_CALL_CONNECTED webhook
              try {
                console.log(`⏰ [OutboundWorker] Scheduling timeout check for call ${callId} in 2 minutes`);
                
                await callTimeoutQueue.add(
                  'check-call-connection-timeout',
                  {
                    callId: callId,
                    twilioSid: conversationId,
                    checkAfterMinutes: 2
                  },
                  {
                    delay: 2 * 60 * 1000,
                    jobId: `timeout-check-${callId}`,
                    removeOnComplete: 10,
                    removeOnFail: 5
                  }
                );
                
                console.log(`✅ [OutboundWorker] Timeout check scheduled successfully for call ${callId}`);
              } catch (timeoutError) {
                console.error(`❌ [OutboundWorker] Failed to schedule timeout check for call ${callId}:`, timeoutError);
              }
              
              // Return successful result
              return {
                success: true,
                message: 'Outbound call initiated',
                call_id: conversationId,
                to_phone: payload.to_number,
                from_phone: payload.config.from_number,
                callId: callId,
                externalCallIdentifier: externalCallIdentifier,
                status: 'initiated'
              };
            }
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
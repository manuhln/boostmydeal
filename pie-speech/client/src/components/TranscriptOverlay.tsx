import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, User, Bot, Clock, Loader2, Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface TranscriptMessage {
  id: string;
  speaker: 'user' | 'assistant';
  message: string;
  timestamp: string;
  is_final?: boolean;
}

interface TranscriptOverlayProps {
  callId: string;
  isOpen: boolean;
  onClose: () => void;
  contactName?: string;
  status?: string;
}

export function TranscriptOverlay({ callId, isOpen, onClose, contactName, status }: TranscriptOverlayProps) {
  const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Fetch transcript data from the API
  const { data: transcriptData, isLoading, refetch } = useQuery({
    queryKey: [`/api/calls/${callId}/transcript`, callId, isOpen],
    enabled: isOpen && !!callId,
    refetchInterval: status === 'in_progress' || status === 'in-progress' ? 3000 : false, // Auto-refresh for active calls
    staleTime: 0, // Always refetch fresh data
    cacheTime: 1000, // Keep cache for 1 second only
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Update transcript messages when data changes
  useEffect(() => {
    console.log('TranscriptOverlay: transcriptData changed', transcriptData);
    
    if (transcriptData && typeof transcriptData === 'object' && 'data' in transcriptData) {
      const data = transcriptData.data as any;
      const messages: TranscriptMessage[] = [];
      
      console.log('TranscriptOverlay: processing data', data);
      console.log('TranscriptOverlay: liveTranscripts length', data?.liveTranscripts?.length);
      console.log('TranscriptOverlay: sample liveTranscript data:', data?.liveTranscripts?.[0]);
      
      // Process different types of transcript data
      if (data?.transcript) {
        // Static transcript from completed calls
        messages.push({
          id: 'static-transcript',
          speaker: 'assistant',
          message: data.transcript,
          timestamp: new Date().toISOString(),
          is_final: true
        });
      }
      
      // Process live transcript segments from CallSession payloads and webhook data
      if (data?.liveTranscripts && Array.isArray(data.liveTranscripts) && data.liveTranscripts.length > 0) {
        data.liveTranscripts.forEach((payload: any, index: number) => {
          // Handle different data structures for live transcripts
          let transcriptText = '';
          let speaker = 'assistant';
          let timestamp = new Date().toISOString();
          let isFinal = false;

          // Check various possible data structures
          if (payload?.data) {
            // Skip TRANSCRIPT_COMPLETE with full_transcript if we have individual LIVE_TRANSCRIPT messages
            if (payload.type === 'TRANSCRIPT_COMPLETE' && payload.data.full_transcript) {
              // Check if we have LIVE_TRANSCRIPT messages - if so, skip the full transcript
              const hasLiveTranscripts = data.liveTranscripts.some((p: any) => p.type === 'LIVE_TRANSCRIPT');
              if (hasLiveTranscripts) {
                return; // Skip this TRANSCRIPT_COMPLETE payload
              }
            }
            
            // Handle webhook data structure - check for different field names
            transcriptText = payload.data.transcript || 
                           payload.data.segment || 
                           payload.data.text || 
                           payload.data.message ||
                           (payload.type !== 'TRANSCRIPT_COMPLETE' ? payload.data.full_transcript || '' : '');
            
            // Handle speaker identification
            speaker = payload.data.speaker || payload.data.sender || payload.data.role || 'assistant';
            
            // Handle timestamp - use proper format
            timestamp = payload.data.timestamp || payload.timestamp || new Date().toISOString();
            
            // Determine if final
            isFinal = payload.data.is_final === true || 
                     payload.data.is_partial === false ||
                     payload.type === 'TRANSCRIPT_COMPLETE' ||
                     !payload.data.is_partial;
          } else {
            // Handle direct payload structure
            transcriptText = payload.transcript || payload.segment || payload.text || payload.message || '';
            speaker = payload.speaker || payload.sender || payload.role || 'assistant';
            timestamp = payload.timestamp || new Date().toISOString();
            isFinal = payload.is_final === true || payload.type === 'TRANSCRIPT_COMPLETE' || !payload.is_partial;
          }

          // Process transcript text - split by speaker if it contains multiple speakers
          if (transcriptText && transcriptText.trim()) {
            // Check if this is a combined transcript that needs splitting
            const combinedPattern = /(BOT|HUMAN|ASSISTANT|USER|CUSTOMER):\s*/gi;
            if (combinedPattern.test(transcriptText)) {
              // Split combined transcript into individual messages
              const parts = transcriptText.split(combinedPattern).filter(part => part.trim());
              
              for (let i = 0; i < parts.length - 1; i += 2) {
                const speakerLabel = parts[i];
                const messageText = parts[i + 1];
                
                if (messageText && messageText.trim()) {
                  const messageSpeaker = speakerLabel.toLowerCase().includes('human') || 
                                       speakerLabel.toLowerCase().includes('user') || 
                                       speakerLabel.toLowerCase().includes('customer') ? 'user' : 'assistant';
                  
                  messages.push({
                    id: `transcript-${index}-${i}-${Date.now()}`,
                    speaker: messageSpeaker,
                    message: messageText.trim(),
                    timestamp: timestamp,
                    is_final: isFinal
                  });
                }
              }
            } else {
              // Single message
              const isLiveCall = status === 'in_progress' || status === 'in-progress';
              const isCompletedCall = status === 'completed';
              // For completed calls, show all transcript messages regardless of isFinal status
              if (isLiveCall || isFinal || isCompletedCall) {
                console.log('TranscriptOverlay: adding single message', { 
                  transcriptText: transcriptText.substring(0, 50) + '...', 
                  speaker, 
                  timestamp, 
                  isFinal,
                  payloadType: payload.type,
                  callStatus: status 
                });
                messages.push({
                  id: `transcript-${index}-${Date.now()}`,
                  speaker: speaker === 'user' || speaker === 'human' || speaker === 'customer' ? 'user' : 'assistant',
                  message: transcriptText.trim(),
                  timestamp: timestamp,
                  is_final: isFinal
                });
              }
            }
          }
        });
      }
      
      // Sort by timestamp
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Remove duplicates based on message content and timestamp (keep the most recent)
      const uniqueMessages = messages.reduce((acc: TranscriptMessage[], current) => {
        const exists = acc.find(msg => 
          msg.message === current.message && 
          Math.abs(new Date(msg.timestamp).getTime() - new Date(current.timestamp).getTime()) < 5000 // within 5 seconds
        );
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);
      
      console.log('TranscriptOverlay: final messages', uniqueMessages.length, 'messages processed');
      setTranscriptMessages(uniqueMessages);
    }
  }, [transcriptData, status]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current && transcriptMessages.length > 0) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [transcriptMessages]);

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    } catch {
      return '';
    }
  };

  // Determine call status from transcript data and webhooks
  const getCallStatus = () => {
    if (!transcriptData?.data) return null;
    
    const data = transcriptData.data as any;
    const webhookTypes = data.liveTranscripts?.map((payload: any) => payload.type) || [];
    
    // Check for specific webhook types to determine status
    if (webhookTypes.includes('PHONE_CALL_ENDED') || webhookTypes.includes('TRANSCRIPT_COMPLETE')) {
      return null; // Don't show status for ended calls
    }
    
    if (status === 'in_progress' || status === 'in-progress') {
      if (webhookTypes.includes('PHONE_CALL_CONNECTED')) {
        return 'Connected';
      } else {
        return 'Connecting';
      }
    }
    
    if (status === 'completed' || status === 'ended') {
      return null; // Don't show status for completed calls
    }
    
    return 'Connecting'; // Default for unknown states
  };

  const isLiveCall = status === 'in_progress' || status === 'in-progress';
  const callStatus = getCallStatus();

  return (
    <>
      {/* Slide-in overlay from left - no backdrop, pure overlay */}
      <div className={`fixed left-0 top-0 h-full w-96 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } flex flex-col`}>
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[#3B82F6] text-lg font-bold">Transcriber</span>
              {isLiveCall && (
                <Badge className="bg-[#3B82F6] text-white animate-pulse text-xs">
                  LIVE
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white w-8 h-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600 dark:text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">{contactName || 'Call to Hardik Khandal'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isLiveCall ? 'Online' : 'Call Ended'}
              </p>
            </div>
          </div>
          
          {/* Status indicator - only show for active calls */}
          {callStatus && (
            <div className="w-full p-3 rounded-lg bg-[#3B82F6] flex items-center justify-center">
              <span className="text-white font-medium">
                {callStatus}
              </span>
              {callStatus === 'Connecting' && (
                <div className="ml-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )}
        </div>

        {/* Content - scrollable area */}
        <div className="flex-1 min-h-0">
          <div 
            ref={scrollAreaRef} 
            className="h-full px-4 py-2 overflow-y-auto overflow-x-hidden transcript-scroll"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#3B82F6]" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Loading transcript...</p>
                </div>
              </div>
            ) : transcriptMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Bot className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No transcript available yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {isLiveCall 
                      ? "Transcript will appear here as the conversation progresses" 
                      : "This call may not have generated a transcript"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                {transcriptMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.speaker === 'user' ? 'flex-row' : 'flex-row'}`}
                  >
                    {/* Speaker Avatar */}
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.speaker === 'user' 
                          ? 'bg-blue-500' 
                          : 'bg-[#3B82F6]'
                      }`}>
                        {message.speaker === 'user' ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Bot className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                    
                    {/* Message Content */}
                    <div className="flex-1 min-w-0 max-w-[85%]">
                      {/* Speaker Label */}
                      <div className="mb-1">
                        <span className={`text-xs font-medium ${
                          message.speaker === 'user' ? 'text-blue-500 dark:text-blue-400' : 'text-[#3B82F6]'
                        }`}>
                          {message.speaker === 'user' ? 'HUMAN' : 'BOT'}
                        </span>
                      </div>
                      
                      {/* Message Bubble */}
                      <div className={`p-3 rounded-lg ${
                        message.speaker === 'user'
                          ? 'bg-blue-600/20 border border-blue-500/30' 
                          : 'bg-[#3B82F6]/20 border border-[#3B82F6]/30'
                      }`}>
                        <p className="text-gray-900 dark:text-white text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {message.message}
                        </p>
                      </div>
                      
                      {/* Timestamp */}
                      <div className="flex items-center gap-1 mt-1 ml-1">
                        <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom typing indicator for live calls */}
        {isLiveCall && (
          <div className="border-t border-gray-200 dark:border-gray-800 p-3">
            <div className="flex items-center gap-2 text-[#3B82F6]">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-[#3B82F6] rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-[#3B82F6] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-[#3B82F6] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <span className="text-sm">AI is responding...</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
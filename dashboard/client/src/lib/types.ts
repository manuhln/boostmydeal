export interface MetricCardData {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
  iconBg: string;
}

export interface CallLogFilters {
  agentId?: string;
  callType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  contactName?: string;
  page?: number;
  limit?: number;
}

export interface VoiceProvider {
  id: string;
  name: string;
  models: string[];
}

export const VOICE_PROVIDERS: VoiceProvider[] = [
  {
    id: 'vapi',
    name: 'VAPI',
    models: ['burt', 'sarah', 'mark', 'emily']
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    models: ['eleven_multilingual_v2', 'eleven_turbo_v2', 'eleven_monolingual_v1']
  },
  {
    id: 'openai',
    name: 'OpenAI TTS',
    models: ['tts-1', 'tts-1-hd']
  },
  {
    id: 'azure',
    name: 'Azure Speech',
    models: ['neural', 'standard']
  },
  {
    id: 'smallestai',
    name: 'Smallest AI',
    models: ['lightning-large']
  }
];

export const AI_MODELS = [
  'mist'
];

export const CALL_STATUSES = [
  { value: 'queued', label: 'Queued', color: 'blue' },
  { value: 'in-progress', label: 'In Progress', color: 'yellow' },
  { value: 'ringing', label: 'Ringing', color: 'purple' },
  { value: 'answered', label: 'Answered', color: 'green' },
  { value: 'completed', label: 'Completed', color: 'emerald' },
  { value: 'failed', label: 'Failed', color: 'red' },
  { value: 'busy', label: 'Busy', color: 'orange' },
  { value: 'no-answer', label: 'No Answer', color: 'gray' },
  { value: 'canceled', label: 'Canceled', color: 'gray' },
  { value: 'voicemail', label: 'Voicemail', color: 'orange' }
];

export const CALL_TYPES = [
  { value: 'inbound', label: 'Inbound' },
  { value: 'outbound', label: 'Outbound' }
];

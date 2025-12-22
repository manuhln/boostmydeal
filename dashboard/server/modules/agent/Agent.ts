import mongoose, { Document, Schema } from 'mongoose';
// Agent Model
export interface IAgent extends Document {
  _id: string;
  organizationId: string;
  workspaceId: number;
  name: string;
  description?: string;
  gender: 'male' | 'female' | 'neutral';
  aiModel: string;
  voiceProvider: string;
  voiceModel: string;
  voice: string;
  transcriber?: string;
  transcriberVoiceId?: string;
  modelProvider?: string;
  firstMessage?: string;
  userSpeaksFirst?: boolean;
  systemPrompt?: string;
  knowledgeBase?: string[];
  ragResponse?: string;
  trigger: 'TRANSCRIPT' | 'TRANSCRIPT_COMPLETE' | 'ACTION' | 'PHONE_CALL_CONNECTED' | 'PHONE_CALL_ENDED';
  postWorkflow: 'none' | 'zoho_crm' | 'salesforce' | 'hubspot' | 'pipedrive' | 'webhook' | 'email';
  workflowIds?: string[];
  temperature: number;
  maxTokens: number;
  speed: number;
  country?: string;
  languages: string[];
  profileImageUrl?: string;
  phoneNumberId?: string;
  cost: number;
  latency: number;
  isActive: boolean;
  userTags?: string[];
  systemTags?: string[];
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
  // Keyboard sound settings
  keyboardSound?: boolean;
  metadata: Record<string, any>;
  providerSync: {
    vapi?: {
      agentId: string;
      lastSync: Date;
      status: 'synced' | 'pending' | 'failed';
    };
    vocode?: {
      agentId: string;
      lastSync: Date;
      status: 'synced' | 'pending' | 'failed';
    };
    elevenlabs?: {
      agentId: string;
      lastSync: Date;
      status: 'synced' | 'pending' | 'failed';
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const agentSchema = new Schema<IAgent>({
  organizationId: { 
    type: String, 
    required: true, 
    ref: 'Organization',
    index: true 
  },
  workspaceId: { type: Number, required: true, default: 1 },
  name: { type: String, required: true },
  description: { type: String },
  gender: { 
    type: String, 
    enum: ['male', 'female', 'neutral'], 
    required: true 
  },
  aiModel: { type: String, required: true },
  voiceProvider: { type: String, required: true },
  voiceModel: { type: String, required: true },
  voice: { type: String, required: true },
  transcriber: { type: String },
  transcriberVoiceId: { type: String },
  modelProvider: { type: String },
  firstMessage: String,
  userSpeaksFirst: { type: Boolean, default: false },
  systemPrompt: String,
  knowledgeBase: [{ type: String }],
  ragResponse: String,
  trigger: {
    type: String,
    enum: ['TRANSCRIPT', 'TRANSCRIPT_COMPLETE', 'ACTION', 'PHONE_CALL_CONNECTED', 'PHONE_CALL_ENDED'],
    required: true,
    default: 'TRANSCRIPT'
  },
  postWorkflow: {
    type: String,
    enum: ['none', 'zoho_crm', 'salesforce', 'hubspot', 'pipedrive', 'webhook', 'email'],
    required: true,
    default: 'none'
  },
  workflowIds: [{ 
    type: String, 
    ref: 'Workflow' 
  }],
  temperature: { type: Number, default: 0.7, min: 0, max: 2 },
  maxTokens: { type: Number, default: 150, min: 1, max: 4000 },
  speed: { type: Number, default: 1.0, min: 0.5, max: 2.0 },
  country: String,
  languages: [{ type: String }],
  profileImageUrl: String,
  phoneNumberId: { 
    type: String, 
    ref: 'PhoneNumber' 
  },
  cost: { type: Number, default: 0 },
  latency: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  userTags: [{ type: String }],
  systemTags: [{ type: String }],
  // Call settings
  callRecording: { type: Boolean, default: true },
  callRecordingFormat: { type: String, default: 'mp3' },
  backgroundAmbientSound: { type: String },
  rememberLeadPreference: { type: Boolean, default: true },
  voicemailDetection: { type: Boolean, default: true },
  voicemailMessage: { type: String },
  // Call transfer settings
  enableCallTransfer: { type: Boolean, default: false },
  transferPhoneNumber: { type: String },
  // Keyboard sound settings
  keyboardSound: { type: Boolean, default: false },
  metadata: { type: Schema.Types.Mixed, default: {} },
  providerSync: {
    vapi: {
      agentId: String,
      lastSync: Date,
      status: { 
        type: String, 
        enum: ['synced', 'pending', 'failed'],
        default: 'pending'
      },
    },
    vocode: {
      agentId: String,
      lastSync: Date,
      status: { 
        type: String, 
        enum: ['synced', 'pending', 'failed'],
        default: 'pending'
      },
    },
    elevenlabs: {
      agentId: String,
      lastSync: Date,
      status: { 
        type: String, 
        enum: ['synced', 'pending', 'failed'],
        default: 'pending'
      },
    },
  },
}, {
  timestamps: true,
});

// Indexes
agentSchema.index({ organizationId: 1, name: 1 });
agentSchema.index({ organizationId: 1, isActive: 1 });
agentSchema.index({ voiceProvider: 1 });

export const Agent = mongoose.model<IAgent>('Agent', agentSchema);
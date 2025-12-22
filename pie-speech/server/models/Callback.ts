import mongoose, { Document, Schema } from 'mongoose';

export interface ICallback extends Document {
  _id: string;
  organizationId: string;
  workspaceId?: string;
  assistantId: string;
  contactPhone: string;
  contactName?: string;
  message?: string;
  callType: 'inbound' | 'outbound';
  status: 'queued' | 'in-progress' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no-answer' | 'canceled' | 'voicemail';
  duration?: number;
  cost?: number;
  transcript?: string;
  recording?: string;
  provider?: string;
  fromNumber?: string;
  twilioSid?: string;
  startedAt?: Date;
  endedAt?: Date;
  webhookPayload: Array<{
    type: string;
    call_id: string;
    data: Record<string, any>;
    timestamp?: Date;
  }>;
  user_tags?: string[];
  callbacks_time?: Date; // Extra field for callback time from TRANSCRIPT_COMPLETE webhook
  createdAt: Date;
  updatedAt: Date;
}

const callbackSchema = new Schema<ICallback>({
  organizationId: { 
    type: String, 
    required: true, 
    ref: 'Organization',
    index: true 
  },
  workspaceId: { 
    type: String, 
    default: '1' 
  },
  assistantId: { 
    type: String, 
    required: true, 
    ref: 'Agent',
    index: true 
  },
  contactPhone: { type: String, required: true },
  contactName: String,
  message: String,
  callType: { 
    type: String, 
    enum: ['inbound', 'outbound'], 
    default: 'outbound'
  },
  status: { 
    type: String, 
    enum: ['queued', 'in-progress', 'ringing', 'answered', 'completed', 'failed', 'busy', 'no-answer', 'canceled', 'voicemail'],
    default: 'queued'
  },
  duration: Number,
  cost: Number,
  transcript: String,
  recording: String,
  provider: String,
  fromNumber: String,
  twilioSid: { type: String, index: true },
  startedAt: Date,
  endedAt: Date,
  webhookPayload: [Schema.Types.Mixed],
  user_tags: { type: [String], default: [] },
  callbacks_time: Date, // Extra field for callback requested time
}, {
  timestamps: true,
});

// Indexes
callbackSchema.index({ organizationId: 1, createdAt: -1 });
callbackSchema.index({ organizationId: 1, assistantId: 1 });
callbackSchema.index({ organizationId: 1, status: 1 });
callbackSchema.index({ twilioSid: 1 });
callbackSchema.index({ provider: 1, twilioSid: 1 });
callbackSchema.index({ callbacks_time: 1 }); // Index for callback time queries

export const Callback = mongoose.model<ICallback>('Callback', callbackSchema);

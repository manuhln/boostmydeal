import mongoose, { Document, Schema } from 'mongoose';

export interface ICall extends Document {
  _id: string;
  organizationId: string;
  workspaceId?: string;
  assistantId: string; // Changed from agentId to assistantId
  contactPhone: string;
  contactName?: string;
  message?: string; // Message to be delivered
  callType: 'inbound' | 'outbound';
  status: 'queued' | 'in-progress' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no-answer' | 'canceled' | 'voicemail';
  duration?: number;
  cost?: number;
  transcript?: string;
  recording?: string;
  provider?: string; // Provider used (twilio, voxsun, etc.)
  fromNumber?: string; // Phone number used to make the call
  twilioSid?: string; // Twilio call SID
  voxsunCallId?: string; // Voxsun/LiveKit SIP call ID
  roomName?: string; // Room name from telephonic server
  startedAt?: Date;
  endedAt?: Date;
  webhookPayload: Array<{
    type: string;
    call_id: string;
    data: Record<string, any>;
    timestamp?: Date;
  }>; // Store array of webhook data for different event types
  user_tags?: string[]; // Array of user-defined tags
  createdAt: Date;
  updatedAt: Date;
}

const callSchema = new Schema<ICall>({
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
  voxsunCallId: { type: String, index: true },
  roomName: { type: String, index: true },
  startedAt: Date,
  endedAt: Date,
  webhookPayload: [Schema.Types.Mixed],
  user_tags: { type: [String], default: [] },
}, {
  timestamps: true,
});

// Indexes
callSchema.index({ organizationId: 1, createdAt: -1 });
callSchema.index({ organizationId: 1, assistantId: 1 });
callSchema.index({ organizationId: 1, status: 1 });
callSchema.index({ twilioSid: 1 });
callSchema.index({ voxsunCallId: 1 });
callSchema.index({ roomName: 1 });
callSchema.index({ provider: 1, twilioSid: 1 });
callSchema.index({ provider: 1, voxsunCallId: 1 });

// Compound index for duplicate prevention
callSchema.index({ 
  organizationId: 1, 
  assistantId: 1, 
  contactPhone: 1, 
  status: 1, 
  createdAt: -1 
}, { 
  name: 'duplicate_prevention_idx',
  partialFilterExpression: { 
    status: { $in: ['queued', 'in-progress', 'ringing', 'answered'] }
  }
});

export const Call = mongoose.model<ICall>('Call', callSchema);
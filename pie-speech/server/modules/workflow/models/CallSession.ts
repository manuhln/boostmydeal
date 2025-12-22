import mongoose, { Document, Schema } from 'mongoose';

export interface ICallSession extends Document {
  callId: string;
  assistantId: mongoose.Types.ObjectId;
  payloads: Array<{
    type: string;
    data: any;
    timestamp?: Date;
  }>;
  lastUpdatedAt: Date;
  organizationId: string;
}

const CallSessionSchema = new Schema<ICallSession>({
  callId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  assistantId: {
    type: Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  payloads: [{
    type: {
      type: String,
      required: true,
      enum: ['PHONE_CALL_CONNECTED', 'TRANSCRIPT_COMPLETE', 'CALL_SUMMARY', 'PHONE_CALL_ENDED', 'LIVE_TRANSCRIPT']
    },
    data: {
      type: Schema.Types.Mixed,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

CallSessionSchema.index({ callId: 1, organizationId: 1 });

export const CallSession = mongoose.model<ICallSession>('CallSession', CallSessionSchema);
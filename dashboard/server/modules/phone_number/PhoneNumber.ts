import { Schema, model, Document } from 'mongoose';

export interface IPhoneNumber extends Document {
  organizationId: string;
  workspaceId: string;
  phoneNumber: string; // concatenated with country code (also used as Voxsun DID)
  provider: 'twilio' | 'voxsun';
  
  // Twilio fields
  accountSid: string; // encrypted
  authToken: string; // encrypted
  
  // Voxsun SIP trunk fields
  voxsunUsername?: string; // encrypted
  voxsunPassword?: string; // encrypted
  voxsunDomain?: string;
  voxsunPort?: number;
  voxsunLiveKitTrunkId?: string; // SIP trunk ID from LiveKit (e.g., "ST_yKBcCX3ekUZy")
  
  createdAt: Date;
  updatedAt: Date;
}

const phoneNumberSchema = new Schema<IPhoneNumber>({
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  workspaceId: {
    type: String,
    required: true,
    default: '1'
  },
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['twilio', 'voxsun'],
    required: true
  },
  // Twilio fields
  accountSid: {
    type: String,
    required: true
  },
  authToken: {
    type: String,
    required: true
  },
  // Voxsun SIP trunk fields
  voxsunUsername: {
    type: String,
    default: null
  },
  voxsunPassword: {
    type: String,
    default: null
  },
  voxsunDomain: {
    type: String,
    default: null
  },
  voxsunPort: {
    type: Number,
    default: null
  },
  voxsunLiveKitTrunkId: {
    type: String,
    default: null,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
phoneNumberSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Compound index for organization-based queries
phoneNumberSchema.index({ organizationId: 1, provider: 1 });
phoneNumberSchema.index({ organizationId: 1, phoneNumber: 1 });

export const PhoneNumber = model<IPhoneNumber>('PhoneNumber', phoneNumberSchema);
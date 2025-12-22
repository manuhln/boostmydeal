import { Schema, model, Document } from 'mongoose';

export interface IPhoneNumber extends Document {
  organizationId: string;
  workspaceId: string;
  phoneNumber: string; // concatenated with country code
  provider: 'twilio' | 'voxsun';
  accountSid: string; // encrypted
  authToken: string; // encrypted
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
  accountSid: {
    type: String,
    required: true
  },
  authToken: {
    type: String,
    required: true
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
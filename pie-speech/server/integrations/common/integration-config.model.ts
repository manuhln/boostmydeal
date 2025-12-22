import mongoose, { Document, Schema } from 'mongoose';

export interface IIntegrationConfig extends Document {
  userId: string;
  organizationId: string;
  type: string; // 'SMTP', 'ZOHO', 'HUBSPOT', 'WEBHOOK', etc.
  name: string; // User-friendly name for the integration
  config: string; // Encrypted JSON config
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationConfigSchema = new Schema<IIntegrationConfig>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['SMTP', 'ZOHO', 'HUBSPOT', 'ZAPIER', 'WEBHOOK', 'ELEVENLABS'] // Extensible for future providers
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  config: {
    type: String, // Encrypted JSON string
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
IntegrationConfigSchema.index({ userId: 1, organizationId: 1, type: 1 });

export const IntegrationConfig = mongoose.model<IIntegrationConfig>('IntegrationConfig', IntegrationConfigSchema);
import mongoose, { Document, Schema } from 'mongoose';

export interface IMetric extends Document {
  _id: string;
  organizationId: string;
  date: string; // YYYY-MM-DD format
  totalCalls: number;
  demosBooked: number;
  interestedLeads: number;
  followUps: number;
  totalDuration: number;
  totalCost: number;
  successRate: number;
  averageCallDuration: number;
  providerBreakdown: {
    [key: string]: {
      calls: number;
      cost: number;
      duration: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const metricSchema = new Schema<IMetric>({
  organizationId: { 
    type: String, 
    required: true, 
    ref: 'Organization',
    index: true 
  },
  date: { type: String, required: true }, // YYYY-MM-DD format
  totalCalls: { type: Number, default: 0 },
  demosBooked: { type: Number, default: 0 },
  interestedLeads: { type: Number, default: 0 },
  followUps: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  successRate: { type: Number, default: 0 },
  averageCallDuration: { type: Number, default: 0 },
  providerBreakdown: {
    type: Schema.Types.Mixed,
    default: {}
  },
}, {
  timestamps: true,
});

// Compound unique index
metricSchema.index({ organizationId: 1, date: 1 }, { unique: true });

export const Metric = mongoose.model<IMetric>('Metric', metricSchema);
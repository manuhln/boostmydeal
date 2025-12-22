import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
  _id: string;
  organizationId: string;
  name: string;
  email?: string;
  phone: string;
  company?: string;
  position?: string;
  tags: string[];
  notes?: string;
  lastContactDate?: Date;
  totalCalls: number;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>({
  organizationId: { 
    type: String, 
    required: true, 
    ref: 'Organization',
    index: true 
  },
  name: { type: String, required: true },
  email: { type: String, lowercase: true },
  phone: { type: String, required: true },
  company: String,
  position: String,
  tags: [{ type: String }],
  notes: String,
  lastContactDate: Date,
  totalCalls: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
});

// Indexes
contactSchema.index({ organizationId: 1, name: 1 });
contactSchema.index({ organizationId: 1, phone: 1 });
contactSchema.index({ organizationId: 1, email: 1 });
contactSchema.index({ organizationId: 1, isActive: 1 });

export const Contact = mongoose.model<IContact>('Contact', contactSchema);
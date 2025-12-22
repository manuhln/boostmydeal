import mongoose, { Document, Schema } from 'mongoose';

export interface IBilling extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  totalPaymentCompleted: number;
  paymentOutstanding: number;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  paymentHistory: Array<{
    amount: number;
    date: Date;
    stripePaymentIntentId?: string;
    status: 'completed' | 'pending' | 'failed';
    description?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const billingSchema = new Schema<IBilling>({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  totalPaymentCompleted: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentOutstanding: {
    type: Number,
    default: 0,
    min: 0
  },
  lastPaymentDate: Date,
  lastPaymentAmount: Number,
  paymentHistory: [{
    amount: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    stripePaymentIntentId: String,
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed'],
      default: 'pending'
    },
    description: String
  }]
}, {
  timestamps: true
});

// Create a compound index for organization and user
billingSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export const Billing = mongoose.model<IBilling>('Billing', billingSchema);
import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
  _id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  website?: string;
  logo?: string;
  plan: 'starter' | 'professional' | 'enterprise';
  settings: {
    timezone: string;
    currency: string;
    dateFormat: string;
    language: string;
  };
  providers: {
    vapi?: {
      apiKey: string;
      isActive: boolean;
      isValidated: boolean;
      lastValidated?: Date;
    };
    elevenlabs?: {
      apiKey: string;
      isActive: boolean;
      isValidated: boolean;
      lastValidated?: Date;
    };
    openai?: {
      apiKey: string;
      isActive: boolean;
      isValidated: boolean;
      lastValidated?: Date;
    };
    vocode?: {
      apiKey: string;
      isActive: boolean;
      isValidated: boolean;
      lastValidated?: Date;
    };
  };
  billing: {
    stripeCustomerId?: string;
    subscription?: {
      id: string;
      status: string;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
    };
    credits: {
      totalBalance: number;
      freeCredits: number;
      paidCredits: number;
      usedCredits: number;
      lastUpdated: Date;
    };
    lowCreditThreshold: number;
    paymentHistory: Array<{
      amount: number;
      currency: string;
      stripePaymentIntentId?: string;
      status: string;
      createdAt: Date;
    }>;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  website: String,
  logo: String,
  plan: { 
    type: String, 
    enum: ['starter', 'professional', 'enterprise'], 
    default: 'starter' 
  },
  settings: {
    timezone: { type: String, default: 'UTC' },
    currency: { type: String, default: 'USD' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    language: { type: String, default: 'en' },
  },
  providers: {
    vapi: {
      apiKey: { type: String, select: false },
      isActive: { type: Boolean, default: false },
      isValidated: { type: Boolean, default: false },
      lastValidated: Date,
    },
    elevenlabs: {
      apiKey: { type: String, select: false },
      isActive: { type: Boolean, default: false },
      isValidated: { type: Boolean, default: false },
      lastValidated: Date,
    },
    openai: {
      apiKey: { type: String, select: false },
      isActive: { type: Boolean, default: false },
      isValidated: { type: Boolean, default: false },
      lastValidated: Date,
    },
    vocode: {
      apiKey: { type: String, select: false },
      isActive: { type: Boolean, default: false },
      isValidated: { type: Boolean, default: false },
      lastValidated: Date,
    },
  },
  billing: {
    stripeCustomerId: String,
    subscription: {
      id: String,
      status: String,
      currentPeriodStart: Date,
      currentPeriodEnd: Date,
    },
    credits: {
      totalBalance: { type: Number, default: 5.00 }, // Total available credits
      freeCredits: { type: Number, default: 5.00 }, // Initial free credits
      paidCredits: { type: Number, default: 0.00 }, // Credits from payments
      usedCredits: { type: Number, default: 0.00 }, // Total used credits
      lastUpdated: { type: Date, default: Date.now },
    },
    lowCreditThreshold: { type: Number, default: 1.00 }, // When to prompt for payment
    paymentHistory: [{
      amount: Number,
      currency: { type: String, default: 'USD' },
      stripePaymentIntentId: String,
      status: String,
      createdAt: { type: Date, default: Date.now },
    }],
  },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

// Indexes
organizationSchema.index({ slug: 1 });
organizationSchema.index({ email: 1 });
organizationSchema.index({ 'billing.stripeCustomerId': 1 });

export const Organization = mongoose.model<IOrganization>('Organization', organizationSchema);
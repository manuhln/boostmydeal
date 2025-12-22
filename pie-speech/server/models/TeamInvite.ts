import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamInvite extends Document {
  email: string;
  role: 'admin' | 'user';
  organizationId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const teamInviteSchema = new Schema<ITeamInvite>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'user'],
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired'],
    default: 'pending',
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  },
  acceptedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for faster lookups
teamInviteSchema.index({ token: 1 });
teamInviteSchema.index({ email: 1, organizationId: 1 });
teamInviteSchema.index({ status: 1, expiresAt: 1 });

export const TeamInvite = mongoose.model<ITeamInvite>('TeamInvite', teamInviteSchema);
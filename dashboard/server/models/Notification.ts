import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'call_success'
  | 'call_failed'
  | 'call_no_answer'
  | 'call_timeout'
  | 'call_busy'
  | 'system_error';

export interface INotification extends Document {
  _id: string;
  organizationId: string;
  workspaceId?: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: {
    callId?: string;
    endReason?: string;
    failureType?: string;
    contactPhone?: string;
    contactName?: string;
    [key: string]: any;
  };
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    organizationId: {
      type: String,
      required: true,
      ref: 'Organization',
      index: true,
    },
    workspaceId: {
      type: String,
      default: '1',
    },
    type: {
      type: String,
      enum: ['call_success', 'call_failed', 'call_no_answer', 'call_timeout', 'call_busy', 'system_error'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ organizationId: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, read: 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);

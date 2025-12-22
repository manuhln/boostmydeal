import mongoose, { Document, Schema } from 'mongoose';

export interface IKnowledgeBase extends Document {
  _id: string;
  organizationId: string;
  name: string;
  description?: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  websiteUrl?: string;
  ragResponse?: {
    summary: string;
    keyPoints: string[];
    totalChunks: number;
    textLength: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeBaseSchema = new Schema<IKnowledgeBase>({
  organizationId: { 
    type: String, 
    required: true, 
    ref: 'Organization',
    index: true 
  },
  name: { type: String, required: true },
  description: String,
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true },
  websiteUrl: String,
  ragResponse: {
    summary: String,
    keyPoints: [String],
    totalChunks: Number,
    textLength: Number
  },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
});

// Indexes
knowledgeBaseSchema.index({ organizationId: 1, createdAt: -1 });
knowledgeBaseSchema.index({ organizationId: 1, name: 1 });

export const KnowledgeBase = mongoose.model<IKnowledgeBase>('KnowledgeBase', knowledgeBaseSchema);
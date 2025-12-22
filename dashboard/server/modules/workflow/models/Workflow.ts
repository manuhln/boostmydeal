import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkflowNode {
  id: string;
  type: 'TRIGGER' | 'AI_AGENT' | 'CONDITION' | 'EMAIL_TOOL' | 'WEBHOOK_TOOL' | 'HUBSPOT_TOOL';
  position: {
    x: number;
    y: number;
  };
  data: any;
}

export interface IWorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

export interface IWorkflow extends Document {
  name: string;
  userId: mongoose.Types.ObjectId;
  organizationId: string;
  nodes: IWorkflowNode[];
  edges: IWorkflowEdge[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowNodeSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['TRIGGER', 'AI_AGENT', 'CONDITION', 'EMAIL_TOOL', 'WEBHOOK_TOOL', 'HUBSPOT_TOOL', 'ZOHO_TOOL']
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  data: {
    type: Schema.Types.Mixed,
    required: true
  }
}, { _id: false });

const WorkflowEdgeSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true
  },
  target: {
    type: String,
    required: true
  },
  sourceHandle: {
    type: String,
    default: null
  }
}, { _id: false });

const WorkflowSchema = new Schema<IWorkflow>({
  name: {
    type: String,
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  nodes: [WorkflowNodeSchema],
  edges: [WorkflowEdgeSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

WorkflowSchema.index({ userId: 1, organizationId: 1 });
WorkflowSchema.index({ organizationId: 1, isActive: 1 });

export const Workflow = mongoose.model<IWorkflow>('Workflow', WorkflowSchema);
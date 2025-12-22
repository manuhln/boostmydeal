import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkflowExecution extends Document {
  workflowId: mongoose.Types.ObjectId;
  callSessionId: mongoose.Types.ObjectId;
  triggerType: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  nodeOutputs: Record<string, any>;
  currentNodeId?: string;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  organizationId: string;
}

const WorkflowExecutionSchema = new Schema<IWorkflowExecution>({
  workflowId: {
    type: Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true
  },
  callSessionId: {
    type: Schema.Types.ObjectId,
    ref: 'CallSession',
    required: true
  },
  triggerType: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'RUNNING'
  },
  nodeOutputs: {
    type: Schema.Types.Mixed,
    default: {}
  },
  currentNodeId: {
    type: String
  },
  errorMessage: {
    type: String
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

WorkflowExecutionSchema.index({ workflowId: 1, organizationId: 1 });
WorkflowExecutionSchema.index({ callSessionId: 1 });
WorkflowExecutionSchema.index({ status: 1, organizationId: 1 });

export const WorkflowExecution = mongoose.model<IWorkflowExecution>('WorkflowExecution', WorkflowExecutionSchema);
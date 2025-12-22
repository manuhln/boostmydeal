import { Workflow } from '../models/Workflow';
import { WorkflowExecution } from '../models/WorkflowExecution';
import { CallSession } from '../models/CallSession';
import { NodeHandlerFactory } from './NodeHandlerFactory';
import { IExecutionContext } from './nodes/IBaseNodeHandler';
import { Call } from '../../../models/Call';

export class WorkflowExecutor {
  private static instance: WorkflowExecutor;

  private constructor() {
    console.log('🚀 [WorkflowExecutor] Singleton instance created');
  }

  static getInstance(): WorkflowExecutor {
    if (!WorkflowExecutor.instance) {
      WorkflowExecutor.instance = new WorkflowExecutor();
    }
    return WorkflowExecutor.instance;
  }

  async start(workflowId: string, triggerType: string, session: any): Promise<void> {
    try {
      console.log(`🎯 [WorkflowExecutor] Starting workflow ${workflowId} with trigger ${triggerType}`);

      // 1. Fetch workflow details
      const workflow = await Workflow.findById(workflowId);
      if (!workflow) {
        console.error(`❌ [WorkflowExecutor] Workflow not found: ${workflowId}`);
        return;
      }

      // 2. Find the trigger node that matches the incoming webhook type
      const triggerNode = workflow.nodes.find(n => 
        n.type === 'TRIGGER' && n.data.triggerType === triggerType
      );
      
      if (!triggerNode) {
        console.log(`⏭️ [WorkflowExecutor] No matching trigger node for ${triggerType} in workflow ${workflowId}`);
        return;
      }

      // 3. Create workflow execution record
      const execution = new WorkflowExecution({
        workflowId: workflow._id,
        callSessionId: session._id,
        triggerType,
        status: 'RUNNING',
        nodeOutputs: {},
        currentNodeId: triggerNode.id,
        organizationId: session.organizationId
      });
      await execution.save();

      // 4. Begin execution from the trigger node
      const executionContext: IExecutionContext = {
        session,
        outputs: {},
        organizationId: session.organizationId
      };

      await this.processNode(triggerNode, workflow, executionContext, execution);

      // 5. Mark execution as completed
      execution.status = 'COMPLETED';
      execution.completedAt = new Date();
      execution.nodeOutputs = executionContext.outputs;
      await execution.save();

      console.log(`✅ [WorkflowExecutor] Workflow ${workflowId} completed successfully`);

    } catch (error) {
      console.error(`❌ [WorkflowExecutor] Error executing workflow ${workflowId}:`, error);
      
      // Update execution status to failed
      try {
        await WorkflowExecution.findOneAndUpdate(
          { workflowId, callSessionId: session._id, status: 'RUNNING' },
          { 
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date()
          }
        );
      } catch (updateError) {
        console.error('Failed to update execution status:', updateError);
      }
    }
  }

  private async processNode(
    node: any, 
    workflow: any, 
    context: IExecutionContext, 
    execution: any
  ): Promise<void> {
    try {
      console.log(`🔄 [WorkflowExecutor] Processing node ${node.id} (${node.type})`);

      // Update current node in execution
      execution.currentNodeId = node.id;
      await execution.save();

      // Use the Factory to get the correct handler
      const handler = NodeHandlerFactory.getHandler(node.type);
      const result = await handler.execute(node, context);

      // Store the node's output
      context.outputs[node.id] = result.data;

      console.log(`📝 [WorkflowExecutor] Node ${node.id} output:`, result.data);

      // Find the next node to process
      const nextNodeId = this.findNextNode(node, result.exitHandle, workflow.edges);
      
      if (nextNodeId) {
        const nextNode = workflow.nodes.find((n: any) => n.id === nextNodeId);
        if (nextNode) {
          await this.processNode(nextNode, workflow, context, execution);
        } else {
          console.warn(`⚠️ [WorkflowExecutor] Next node not found: ${nextNodeId}`);
        }
      } else {
        console.log(`🏁 [WorkflowExecutor] No next node found for ${node.id} with exit handle '${result.exitHandle}' - workflow path ended`);
      }

    } catch (error) {
      console.error(`❌ [WorkflowExecutor] Error processing node ${node.id}:`, error);
      throw error;
    }
  }

  private findNextNode(currentNode: any, exitHandle: string, edges: any[]): string | null {
    // Find an edge that starts from the current node
    const outgoingEdges = edges.filter(edge => edge.source === currentNode.id);

    if (outgoingEdges.length === 0) {
      return null; // No outgoing edges
    }

    // For nodes with multiple exit handles (like conditions), find the matching handle
    const matchingEdge = outgoingEdges.find(edge => {
      // If sourceHandle is specified, it must match the exitHandle
      if (edge.sourceHandle) {
        return edge.sourceHandle === exitHandle;
      }
      // If no sourceHandle specified, use it for 'default' exit handle
      return exitHandle === 'default';
    });

    return matchingEdge ? matchingEdge.target : null;
  }

  // Method to get workflow executions for monitoring
  async getExecutions(organizationId: string, filters?: any) {
    const query: any = { organizationId };
    
    if (filters?.workflowId) {
      query.workflowId = filters.workflowId;
    }
    
    if (filters?.status) {
      query.status = filters.status;
    }

    const executions = await WorkflowExecution.find(query)
      .populate('workflowId', 'name')
      .populate({
        path: 'callSessionId',
        populate: {
          path: 'assistantId',
          select: 'name'
        }
      })
      .sort({ startedAt: -1 })
      .limit(filters?.limit || 50);
    
    // Fetch call details for each execution
    const executionsWithCallDetails = await Promise.all(
      executions.map(async (execution) => {
        const executionObj = execution.toObject();
        if (executionObj.callSessionId && executionObj.callSessionId.callId) {
          const call = await Call.findOne({ twilioSid: executionObj.callSessionId.callId })
            .select('contactPhone contactName');
          if (call) {
            executionObj.callSession = {
              ...executionObj.callSessionId,
              contactPhone: call.contactPhone,
              contactName: call.contactName,
              assistant: executionObj.callSessionId.assistantId
            };
          }
        }
        return executionObj;
      })
    );
    
    return executionsWithCallDetails;
  }
}

// Export singleton instance
export const workflowExecutor = WorkflowExecutor.getInstance();
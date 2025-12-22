import { Request, Response } from 'express';
import { Workflow } from '../models/Workflow';
import { WorkflowExecution } from '../models/WorkflowExecution';
import { NodeHandlerFactory } from '../services/NodeHandlerFactory';
import { workflowExecutor } from '../services/WorkflowExecutor';

export class WorkflowController {
  // Create a new workflow
  async createWorkflow(req: Request, res: Response) {
    try {
      const { name, nodes, edges } = req.body;
      const userId = (req as any).user._id;
      const organizationId = (req as any).user.organizationId;

      console.log('📝 [WorkflowController] Creating workflow:', { name, nodeCount: nodes?.length, edgeCount: edges?.length });
      console.log('🔍 [WorkflowController] User data:', { userId, organizationId });

      // Validate required fields
      if (!name || !nodes || !edges) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, nodes, edges'
        });
      }

      // Validate node types (convert to uppercase for validation)
      const supportedTypes = NodeHandlerFactory.getSupportedNodeTypes();
      const invalidNodes = nodes.filter((node: any) => !supportedTypes.includes(node.type.toUpperCase()));
      
      if (invalidNodes.length > 0) {
        console.log('❌ [WorkflowController] Invalid node types:', invalidNodes.map((n: any) => n.type));
        console.log('📋 [WorkflowController] Supported types:', supportedTypes);
        return res.status(400).json({
          success: false,
          message: `Unsupported node types: ${invalidNodes.map((n: any) => n.type).join(', ')}. Supported types: ${supportedTypes.join(', ')}`
        });
      }

      // Transform trigger nodes: Map PHONE_CALL_ENDED to TRANSCRIPT_COMPLETE
      const transformedNodes = nodes.map((node: any) => {
        if (node.type === 'TRIGGER' && node.data?.triggerType === 'PHONE_CALL_ENDED') {
          console.log('🔄 [WorkflowController] Mapping PHONE_CALL_ENDED to TRANSCRIPT_COMPLETE for better timing');
          return {
            ...node,
            data: {
              ...node.data,
              triggerType: 'TRANSCRIPT_COMPLETE'
            }
          };
        }
        return node;
      });

      // Debug: Log the nodes data being saved
      console.log('📝 [WorkflowController] Creating workflow with nodes:', JSON.stringify(transformedNodes, null, 2));
      transformedNodes.forEach((node: any, idx: number) => {
        console.log(`Node ${idx}:`, {
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
          hasData: !!node.data && Object.keys(node.data).length > 0
        });
      });

      // Create workflow
      const workflow = new Workflow({
        name,
        userId,
        organizationId,
        nodes: transformedNodes,
        edges,
        isActive: true
      });

      await workflow.save();

      console.log('✅ [WorkflowController] Workflow created:', workflow._id);

      res.status(201).json({
        success: true,
        data: workflow,
        message: 'Workflow created successfully'
      });

    } catch (error) {
      console.error('❌ [WorkflowController] Error creating workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create workflow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get all workflows for organization
  async getWorkflows(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;
      const { page = 1, limit = 20, isActive } = req.query;

      const query: any = { organizationId };
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      const workflows = await Workflow.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await Workflow.countDocuments(query);

      res.json({
        success: true,
        data: workflows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('❌ [WorkflowController] Error getting workflows:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workflows',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get workflow by ID
  async getWorkflowById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const workflow = await Workflow.findOne({ _id: id, organizationId })
        .populate('userId', 'name email');

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      res.json({
        success: true,
        data: workflow
      });

    } catch (error) {
      console.error('❌ [WorkflowController] Error getting workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workflow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Update workflow
  async updateWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, nodes, edges, isActive } = req.body;
      const organizationId = (req as any).user.organizationId;

      // Transform trigger nodes if provided: Map PHONE_CALL_ENDED to TRANSCRIPT_COMPLETE
      let transformedNodes = nodes;
      if (nodes !== undefined) {
        transformedNodes = nodes.map((node: any) => {
          if (node.type === 'TRIGGER' && node.data?.triggerType === 'PHONE_CALL_ENDED') {
            console.log('🔄 [WorkflowController] Mapping PHONE_CALL_ENDED to TRANSCRIPT_COMPLETE for better timing');
            return {
              ...node,
              data: {
                ...node.data,
                triggerType: 'TRANSCRIPT_COMPLETE'
              }
            };
          }
          return node;
        });
      }

      // Debug: Log the nodes data being updated
      if (transformedNodes !== undefined) {
        console.log('🔄 [WorkflowController] Updating workflow with nodes:', JSON.stringify(transformedNodes, null, 2));
        transformedNodes.forEach((node: any, idx: number) => {
          console.log(`Update Node ${idx}:`, {
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data,
            hasData: !!node.data && Object.keys(node.data).length > 0
          });
        });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (nodes !== undefined) updateData.nodes = transformedNodes;
      if (edges !== undefined) updateData.edges = edges;
      if (isActive !== undefined) updateData.isActive = isActive;

      const workflow = await Workflow.findOneAndUpdate(
        { _id: id, organizationId },
        updateData,
        { new: true }
      ).populate('userId', 'name email');

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      console.log('✅ [WorkflowController] Workflow updated:', workflow._id);

      res.json({
        success: true,
        data: workflow,
        message: 'Workflow updated successfully'
      });

    } catch (error) {
      console.error('❌ [WorkflowController] Error updating workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update workflow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Delete workflow
  async deleteWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const workflow = await Workflow.findOneAndDelete({ _id: id, organizationId });

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      console.log('🗑️ [WorkflowController] Workflow deleted:', workflow._id);

      res.json({
        success: true,
        message: 'Workflow deleted successfully'
      });

    } catch (error) {
      console.error('❌ [WorkflowController] Error deleting workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete workflow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get workflow executions
  async getWorkflowExecutions(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;
      const { id } = req.params; // Get workflowId from URL params
      const { status, page = 1, limit = 20 } = req.query;

      const filters = {
        workflowId: id,
        status: status as string,
        limit: Number(limit),
        page: Number(page)
      };

      const executions = await workflowExecutor.getExecutions(organizationId, filters);

      res.json({
        success: true,
        data: executions
      });

    } catch (error) {
      console.error('❌ [WorkflowController] Error getting executions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workflow executions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Toggle workflow active status
  async toggleWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const organizationId = (req as any).user.organizationId;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isActive must be a boolean value'
        });
      }

      const workflow = await Workflow.findOneAndUpdate(
        { _id: id, organizationId },
        { isActive },
        { new: true }
      ).populate('userId', 'name email');

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      console.log(`🔄 [WorkflowController] Workflow ${workflow.name} toggled to ${isActive ? 'active' : 'inactive'}`);

      res.json({
        success: true,
        data: workflow,
        message: `Workflow ${isActive ? 'activated' : 'deactivated'} successfully`
      });

    } catch (error) {
      console.error('❌ [WorkflowController] Error toggling workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle workflow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
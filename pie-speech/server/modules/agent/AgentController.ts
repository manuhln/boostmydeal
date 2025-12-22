import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ResponseUtil } from '../../utils/response';
import { AgentService } from './AgentService';
import { CreateAgentDto, UpdateAgentDto } from './agent.dto';
import { validationResult } from 'express-validator';

export class AgentController {
  /**
   * Get all agents for the organization
   */
  static getAgents = ResponseUtil.handleAsync(async (req: AuthRequest, res: Response) => {
    const organizationId = req.organization!._id;
    const agentService = new AgentService(organizationId);
    
    const agents = await agentService.getAgents(organizationId);
    
    
    return ResponseUtil.success(res, agents, 'Agents retrieved successfully');
  });

  /**
   * Get single agent by ID
   */
  static getAgent = ResponseUtil.handleAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const organizationId = req.organization!._id;
    const agentService = new AgentService(organizationId);
    
    const agent = await agentService.getAgent(id, organizationId);
    if (!agent) {
      return ResponseUtil.notFound(res, 'Agent not found');
    }

    return ResponseUtil.success(res, agent, 'Agent retrieved successfully');
  });

  /**
   * Create new agent
   */
  static createAgent = ResponseUtil.handleAsync(async (req: AuthRequest, res: Response) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMap: Record<string, string[]> = {};
      errors.array().forEach(error => {
        if (error.type === 'field') {
          if (!errorMap[error.path]) {
            errorMap[error.path] = [];
          }
          errorMap[error.path].push(error.msg);
        }
      });
      return ResponseUtil.validationError(res, errorMap);
    }

    const organizationId = req.organization!._id;
    const createDto: CreateAgentDto = req.body;
    const agentService = new AgentService(organizationId);

    const agent = await agentService.createAgent(organizationId, createDto);
    return ResponseUtil.success(res, agent, 'Agent created successfully', 201);
  });

  /**
   * Update existing agent
   */
  static updateAgent = ResponseUtil.handleAsync(async (req: AuthRequest, res: Response) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMap: Record<string, string[]> = {};
      errors.array().forEach(error => {
        if (error.type === 'field') {
          if (!errorMap[error.path]) {
            errorMap[error.path] = [];
          }
          errorMap[error.path].push(error.msg);
        }
      });
      return ResponseUtil.validationError(res, errorMap);
    }

    const { id } = req.params;
    const organizationId = req.organization!._id;
    const updateDto: UpdateAgentDto = req.body;

    console.log('🔄 [AgentController] Received agent update request:', {
      agentId: id,
      organizationId,
      enableCallTransfer: updateDto.enableCallTransfer,
      transferPhoneNumber: updateDto.transferPhoneNumber,
      bodyKeys: Object.keys(updateDto)
    });

    const agentService = new AgentService(organizationId);

    const updatedAgent = await agentService.updateAgent(id, organizationId, updateDto);
    if (!updatedAgent) {
      return ResponseUtil.notFound(res, 'Agent not found');
    }

    console.log('✅ [AgentController] Agent update completed:', {
      agentId: id,
      enableCallTransfer: updatedAgent.enableCallTransfer,
      transferPhoneNumber: updatedAgent.transferPhoneNumber
    });

    return ResponseUtil.success(res, updatedAgent, 'Agent updated successfully');
  });

  /**
   * Delete agent
   */
  static deleteAgent = ResponseUtil.handleAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const organizationId = req.organization!._id;
    const agentService = new AgentService(organizationId);

    const deleted = await agentService.deleteAgent(id, organizationId);
    if (!deleted) {
      return ResponseUtil.notFound(res, 'Agent not found');
    }

    return ResponseUtil.success(res, null, 'Agent deleted successfully');
  });
}
/**
 * Agent Module Index
 * Central export file for all agent-related components
 */

// Model exports
export { Agent, type IAgent } from './Agent';

// DAL exports
export { AgentDAL, agentDAL } from './agent.dal';

// DTO exports
export * from './agent.dto';

// Service exports
export { AgentService } from './AgentService';

// Controller exports
export { AgentController } from './AgentController';

// Routes exports
export { default as agentRoutes } from './agents';
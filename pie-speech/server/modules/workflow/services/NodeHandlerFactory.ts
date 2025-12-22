import { IBaseNodeHandler } from './nodes/IBaseNodeHandler';
import { TriggerNodeHandler } from './nodes/TriggerNodeHandler';
import { AiAgentNodeHandler } from './nodes/AiAgentNodeHandler';
import { ConditionNodeHandler } from './nodes/ConditionNodeHandler';
import { EmailNodeHandler } from './nodes/EmailNodeHandler';
import { HubSpotNodeHandler } from './nodes/HubSpotNodeHandler';
import { ZohoNodeHandler } from './nodes/ZohoNodeHandler';
import { OutboundCallNodeHandler } from './nodes/OutboundCallNodeHandler';

export class NodeHandlerFactory {
  private static handlers: Map<string, IBaseNodeHandler> = new Map();

  static getHandler(nodeType: string): IBaseNodeHandler {
    // Use singleton pattern for handlers
    if (!this.handlers.has(nodeType)) {
      switch (nodeType.toUpperCase()) {
        case 'TRIGGER':
          this.handlers.set(nodeType, new TriggerNodeHandler());
          break;
        case 'AI_AGENT':
          this.handlers.set(nodeType, new AiAgentNodeHandler());
          break;
        case 'CONDITION':
          this.handlers.set(nodeType, new ConditionNodeHandler());
          break;
        case 'EMAIL_TOOL':
          this.handlers.set(nodeType, new EmailNodeHandler());
          break;
        case 'HUBSPOT_TOOL':
          this.handlers.set(nodeType, new HubSpotNodeHandler());
          break;
        case 'ZOHO_TOOL':
          this.handlers.set(nodeType, new ZohoNodeHandler());
          break;
        case 'OUTBOUND_CALL':
          this.handlers.set(nodeType, new OutboundCallNodeHandler());
          break;
        default:
          throw new Error(`Unknown node type: ${nodeType}`);
      }
    }

    return this.handlers.get(nodeType)!;
  }

  static getSupportedNodeTypes(): string[] {
    return ['TRIGGER', 'AI_AGENT', 'CONDITION', 'EMAIL_TOOL', 'HUBSPOT_TOOL', 'ZOHO_TOOL', 'OUTBOUND_CALL'];
  }
}
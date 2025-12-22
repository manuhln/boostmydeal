export interface IExecutionContext {
  session: any;
  outputs: Record<string, any>;
  organizationId: string;
}

export interface INodeExecutionResult {
  exitHandle: string;
  data: any;
}

export abstract class IBaseNodeHandler {
  abstract execute(node: any, context: IExecutionContext): Promise<INodeExecutionResult>;
  
  protected resolvePlaceholders(templateString: string, context: IExecutionContext | any): string {
    if (!templateString || typeof templateString !== 'string') {
      return templateString;
    }

    let resolved = templateString;

    // Replace trigger placeholders like {{trigger.full_transcript}}
    const triggerMatches = resolved.match(/\{\{trigger\.(\w+)\}\}/g);
    if (triggerMatches) {
      triggerMatches.forEach(match => {
        const property = match.replace(/\{\{trigger\.(\w+)\}\}/, '$1');
        const transcriptPayload = context.session?.payloads?.find((p: any) => p.type === 'TRANSCRIPT_COMPLETE');
        const value = transcriptPayload?.data?.[property] || '';
        resolved = resolved.replace(match, value);
      });
    }

    // Replace node output placeholders like {{node-2.send_email}}
    const nodeMatches = resolved.match(/\{\{(node-\w+)\.(\w+)\}\}/g);
    if (nodeMatches) {
      nodeMatches.forEach(match => {
        const [, nodeId, property] = match.match(/\{\{(node-\w+)\.(\w+)\}\}/) || [];
        const value = context.outputs?.[nodeId]?.[property] || '';
        resolved = resolved.replace(match, String(value));
      });
    }

    // Replace AI analysis placeholders like {{aiAnalysis.email}} or {{aiAnalysis.customer_name}}
    const aiMatches = resolved.match(/\{\{aiAnalysis\.(\w+)\}\}/g);
    if (aiMatches && context.aiAnalysis) {
      aiMatches.forEach(match => {
        const property = match.replace(/\{\{aiAnalysis\.(\w+)\}\}/, '$1');
        const value = context.aiAnalysis[property] || '';
        resolved = resolved.replace(match, String(value));
      });
    }

    return resolved;
  }
}
import { IBaseNodeHandler, IExecutionContext, INodeExecutionResult } from './IBaseNodeHandler';

export class TriggerNodeHandler extends IBaseNodeHandler {
  async execute(node: any, context: IExecutionContext): Promise<INodeExecutionResult> {
    // Trigger nodes don't do any processing, they just pass data forward
    // Extract relevant data from the session based on trigger type
    const triggerData: any = {};

    switch (node.data.triggerType) {
      case 'PHONE_CALL_CONNECTED':
        const connectedPayload = context.session.payloads?.find((p: any) => p.type === 'PHONE_CALL_CONNECTED');
        triggerData.connectedAt = connectedPayload?.data?.timestamp || new Date().toISOString();
        break;

      case 'TRANSCRIPT_COMPLETE':
        const transcriptPayload = context.session.payloads?.find((p: any) => p.type === 'TRANSCRIPT_COMPLETE');
        triggerData.full_transcript = transcriptPayload?.data?.full_transcript || '';
        triggerData.transcript_segments = transcriptPayload?.data?.transcript_segments || [];
        break;

      case 'CALL_SUMMARY':
        const summaryPayload = context.session.payloads?.find((p: any) => p.type === 'CALL_SUMMARY');
        triggerData.summary = summaryPayload?.data?.summary || '';
        triggerData.key_points = summaryPayload?.data?.key_points || [];
        break;

      case 'PHONE_CALL_ENDED':
        const endedPayload = context.session.payloads?.find((p: any) => p.type === 'PHONE_CALL_ENDED');
        triggerData.duration = endedPayload?.data?.duration || 0;
        triggerData.end_reason = endedPayload?.data?.end_reason || 'unknown';
        triggerData.full_transcript = endedPayload?.data?.full_transcript || '';
        break;

      case 'LIVE_TRANSCRIPT':
        const liveTranscriptPayload = context.session.payloads?.find((p: any) => p.type === 'LIVE_TRANSCRIPT');
        triggerData.live_transcript = liveTranscriptPayload?.data?.transcript || '';
        triggerData.transcript_segment = liveTranscriptPayload?.data?.segment || '';
        triggerData.is_final = liveTranscriptPayload?.data?.is_final || false;
        triggerData.timestamp = liveTranscriptPayload?.data?.timestamp || new Date().toISOString();
        break;

      default:
        console.warn(`Unknown trigger type: ${node.data.triggerType}`);
    }

    return {
      exitHandle: 'default',
      data: triggerData
    };
  }
}
import { useQuery } from '@tanstack/react-query';

export interface CallMetrics {
  totalCalls: number;
  demosBooked: number;
  averageCallDuration: number;
  positiveResponses: number;
  negativeResponses: number;
  voicemailsLeft: number;
  followUpsScheduled: number;
}

export function useCallMetrics() {
  return useQuery<{ success: boolean; data: CallMetrics }>({
    queryKey: ['/api/metrics/callsMetrics'],
  });
}

export function useTodayCallMetrics() {
  return useQuery<{ success: boolean; data: CallMetrics }>({
    queryKey: ['/api/metrics/today'],
  });
}
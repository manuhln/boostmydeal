import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Metric, InsertMetric } from "@shared/schema";

export function useMetrics(date?: string) {
  const url = date ? `/api/metrics?date=${date}` : '/api/metrics/today';
  
  return useQuery<Metric>({
    queryKey: ["/api/metrics", date || 'today'],
    queryFn: async () => {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useTodayMetrics() {
  return useQuery<ApiResponse<Metric>>({
    queryKey: ["/api/metrics", "today"],
    queryFn: async () => {
      const response = await fetch('/api/metrics/today', { credentials: "include" });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });
}

export function useUpdateMetrics() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (metrics: InsertMetric) => {
      const response = await apiRequest("POST", "/api/metrics", metrics);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
    },
  });
}

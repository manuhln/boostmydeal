import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface ProviderInfo {
  name: string;
  type: string;
  isConfigured: boolean;
  isValidated: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useProviders() {
  return useQuery<ApiResponse<ProviderInfo[]>>({
    queryKey: ["/api/providers"],
    retry: (failureCount, error) => {
      // Don't retry on 401 errors
      if (error.message.includes('401')) return false;
      return failureCount < 3;
    },
  });
}

export function useValidateProvider() {
  return useMutation({
    mutationFn: async (providerType: string) => {
      const response = await apiRequest("GET", `/api/providers/validate/${providerType}`);
      return response.json();
    },
  });
}

export function useSyncAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ agentId, providerType }: { agentId: number; providerType: string }) => {
      const response = await apiRequest("POST", `/api/agents/${agentId}/sync`, { providerType });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    },
  });
}

export function useCallStatus() {
  return useMutation({
    mutationFn: async (callId: number) => {
      const response = await apiRequest("GET", `/api/calls/${callId}/status`);
      return response.json();
    },
  });
}
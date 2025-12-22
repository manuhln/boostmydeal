import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Agent, InsertAgent } from "@shared/schema";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useAgents() {
  return useQuery<ApiResponse<Agent[]>>({
    queryKey: ["/api/agents"],
    retry: (failureCount, error) => {
      // Don't retry on 401 errors
      if (error.message.includes('401')) return false;
      return failureCount < 3;
    },
  });
}

export function useAgent(id: string) {
  return useQuery<Agent>({
    queryKey: ["/api/agents", id],
    enabled:!!id,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (agent: InsertAgent) => {
      const response = await apiRequest("POST", "/api/agents", agent);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, agent }: { id: string; agent: Partial<InsertAgent> }) => {
      const response = await apiRequest("PUT", `/api/agents/${id}`, agent);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/agents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    },
  });
}

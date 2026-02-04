import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { CallWithAgent, InsertCall } from "@shared/schema";
import type { CallLogFilters } from "@/lib/types";

export function useCalls(filters?: CallLogFilters) {
  const params = new URLSearchParams();
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        params.append(key, String(value));
      }
    });
  }

  const queryString = params.toString();
  const url = queryString ? `/api/calls?${queryString}` : '/api/calls';
  
  console.log('🌐 [useCalls] Making request to:', url);
  console.log('🌐 [useCalls] Applied filters:', filters);

interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  page?: number;
  message?: string;
}

  return useQuery<ApiResponse<CallWithAgent[]>>({
    queryKey: ["/api/calls", filters],
    queryFn: () => apiRequest("GET", url),
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue refetching when tab is in background
  });
}

export function useCall(id: number) {
  return useQuery<CallWithAgent>({
    queryKey: ["/api/calls", id],
    enabled: !!id,
  });
}

export function useCreateCall() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (call: InsertCall) => {
      return await apiRequest("POST", "/api/calls", call);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
    },
  });
}

export function useInitiateCall() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      assistantId: string; 
      toNumber: string; 
      message?: string;
    }) => {
      console.log("🌐 API Request - Making call to /api/calls/initiate with:", data);
      const result = await apiRequest("POST", "/api/calls/initiate", data);
      console.log("🌐 API Request - Response received:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("🎉 Mutation success callback - invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
    },
    onError: (error) => {
      console.error("💥 Mutation error callback:", error);
    },
  });
}

// Temporary demo method - bypasses Redis/webhook architecture
export function useInitiateCallDemo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      assistantId: string; 
      toNumber: string; 
      contactName: string;
    }) => {
      console.log("🚀 Demo API Request - Making call to /api/calls/demo-initiate with:", data);
      const result = await apiRequest("POST", "/api/calls/demo-initiate", data);
      console.log("🚀 Demo API Request - Response received:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("🎉 Demo Mutation success - invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
    },
    onError: (error) => {
      console.error("💥 Demo Mutation error:", error);
    },
  });
}

export function useExportCalls() {
  return useMutation({
    mutationFn: async (filters?: CallLogFilters) => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
      }

      const queryString = params.toString();
      const url = queryString ? `/api/calls/export?${queryString}` : '/api/calls/export';

      // Get the auth token from localStorage
      const authToken = localStorage.getItem('authToken');
      
      const response = await fetch(url, { 
        credentials: "include",
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Export failed: ${errorText}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'call_logs.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    },
  });
}

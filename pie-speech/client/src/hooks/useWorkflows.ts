import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'email' | 'ai_agent' | 'condition';
  position: { x: number; y: number };
  data: {
    [key: string]: any;
  };
  connections?: {
    [exitHandle: string]: string; // Maps exit handle to next node ID
  };
}

export interface Workflow {
  _id: string;
  name: string;
  description?: string;
  organizationId?: string;
  isActive?: boolean;
  nodes: Array<{
    id: string;
    type: string;
    data: any;
    position?: { x: number; y: number };
  }>;
  edges?: Array<{
    from: string;
    to: string;
    condition?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWorkflowData {
  name: string;
  description?: string;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: any;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
  }>;
}

export function useWorkflows() {
  return useQuery<{ success: boolean; data: Workflow[] }>({
    queryKey: ['/api/workflows'],
    retry: false,
  });
}

export function useWorkflow(workflowId: string, options?: { enabled?: boolean }) {
  return useQuery<{ success: boolean; data: Workflow }>({
    queryKey: [`/api/workflows/${workflowId}`],
    enabled: options?.enabled !== undefined ? options.enabled : !!workflowId,
    retry: false,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateWorkflowData) => {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create workflow');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      toast({
        title: "Success",
        description: "Workflow created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create workflow",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ workflowId, data }: { workflowId: string; data: Partial<CreateWorkflowData> }) => {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to update workflow');
      }
      
      return response.json();
    },
    onSuccess: (_, { workflowId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workflows', workflowId] });
      toast({
        title: "Success",
        description: "Workflow updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workflow",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (workflowId: string) => {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to delete workflow');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      toast({
        title: "Success",
        description: "Workflow deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete workflow",
        variant: "destructive",
      });
    },
  });
}

export function useToggleWorkflow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ workflowId, isActive }: { workflowId: string; isActive: boolean }) => {
      const response = await fetch(`/api/workflows/${workflowId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ isActive }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to toggle workflow');
      }
      
      return response.json();
    },
    onSuccess: (_, { workflowId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workflows', workflowId] });
      toast({
        title: "Success",
        description: "Workflow status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workflow status",
        variant: "destructive",
      });
    },
  });
}

export function useWorkflowExecutions(workflowId?: string) {
  return useQuery({
    queryKey: ['/api/workflow-executions', workflowId],
    enabled: !!workflowId,
    retry: false,
  });
}

export function useTriggerWorkflow() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ workflowId, data }: { workflowId: string; data: any }) => {
      const response = await fetch(`/api/workflows/${workflowId}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to trigger workflow');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Workflow triggered successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to trigger workflow",
        variant: "destructive",
      });
    },
  });
}
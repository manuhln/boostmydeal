import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface KnowledgeBaseItem {
  _id: string;
  organizationId: string;
  name: string;
  description?: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  websiteUrl?: string;
  ragResponse?: {
    summary: string;
    keyPoints: string[];
    totalChunks: number;
    textLength: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKnowledgeBaseData {
  name: string;
  description?: string;
  websiteUrl?: string;
  file?: File;
}

export function useKnowledgeBase() {
  return useQuery({
    queryKey: ['/api/knowledge'],
    queryFn: () => apiRequest('GET', '/api/knowledge'),
  });
}

export function useCreateKnowledgeBase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateKnowledgeBaseData) => {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.description) {
        formData.append('description', data.description);
      }
      if (data.websiteUrl) {
        formData.append('websiteUrl', data.websiteUrl);
      }
      if (data.file) {
        formData.append('file', data.file);
      }

      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create knowledge base item');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge'] });
    },
  });
}

export function useDeleteKnowledgeBase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/knowledge/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge'] });
    },
  });
}
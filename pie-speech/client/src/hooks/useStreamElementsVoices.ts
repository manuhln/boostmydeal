import { useQuery } from '@tanstack/react-query';

interface StreamElementsVoice {
  voice_id: string;
  name: string;
  gender: string;
  age: string;
  accent: string;
  tone: string[];
  characteristics: string[];
  language: string;
  provider?: string;
}

interface StreamElementsVoicesResponse {
  success: boolean;
  data: StreamElementsVoice[];
  message: string;
}

interface VoiceFilters {
  name?: string;
  gender?: string;
  country?: string;
  accent?: string;
  language?: string;
}

export function useStreamElementsVoices(filters?: VoiceFilters) {
  const queryParams = new URLSearchParams();
  
  if (filters?.name) queryParams.set('name', filters.name);
  if (filters?.gender) queryParams.set('gender', filters.gender);
  if (filters?.country) queryParams.set('country', filters.country);
  if (filters?.accent) queryParams.set('accent', filters.accent);
  if (filters?.language) queryParams.set('language', filters.language);
  
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/api/streamelements/voices?${queryString}` : '/api/streamelements/voices';
  
  return useQuery<StreamElementsVoicesResponse>({
    queryKey: ['/api/streamelements/voices', filters],
    queryFn: () => fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    }).then(res => res.json()),
    enabled: true,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

export type { StreamElementsVoice, StreamElementsVoicesResponse, VoiceFilters };
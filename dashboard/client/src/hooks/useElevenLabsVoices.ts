import { useQuery } from '@tanstack/react-query';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  labels?: Record<string, string>;
  personality?: {
    gender: string;
    age: string;
    accent: string;
    tone: string[];
    characteristics: string[];
  };
}

interface ElevenLabsVoicesResponse {
  success: boolean;
  data: ElevenLabsVoice[];
}

interface VoiceFilters {
  name?: string;
  gender?: string;
  country?: string;
  accent?: string;
  language?: string;
}

export function useElevenLabsVoices(filters?: VoiceFilters) {
  const queryParams = new URLSearchParams();
  
  if (filters?.name) queryParams.set('name', filters.name);
  if (filters?.gender) queryParams.set('gender', filters.gender);
  if (filters?.country) queryParams.set('country', filters.country);
  if (filters?.accent) queryParams.set('accent', filters.accent);
  if (filters?.language) queryParams.set('language', filters.language);
  
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/api/elevenlabs/voices?${queryString}` : '/api/elevenlabs/voices';
  
  return useQuery<ElevenLabsVoicesResponse>({
    queryKey: ['/api/elevenlabs/voices', filters],
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

export type { ElevenLabsVoice, ElevenLabsVoicesResponse, VoiceFilters };
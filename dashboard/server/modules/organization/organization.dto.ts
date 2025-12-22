/**
 * Organization Data Transfer Objects
 * Define the structure of data transferred between layers
 */

export interface CreateOrganizationDto {
  name: string;
  slug: string;
  email: string;
  phone?: string;
  website?: string;
  logo?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
}

export interface UpdateOrganizationDto {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  logo?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
  settings?: {
    timezone?: string;
    currency?: string;
    dateFormat?: string;
    language?: string;
  };
}

export interface OrganizationResponseDto {
  _id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  website?: string;
  logo?: string;
  plan: 'starter' | 'professional' | 'enterprise';
  settings: {
    timezone: string;
    currency: string;
    dateFormat: string;
    language: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProviderConfigDto {
  provider: 'vapi' | 'elevenlabs' | 'openai' | 'vocode';
  apiKey?: string;
  isActive?: boolean;
}
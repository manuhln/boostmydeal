export interface CreateContactDto {
  name: string;
  email?: string;
  phone: string;
  company?: string;
  position?: string;
  tags: string[];
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateContactDto {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  tags?: string[];
  notes?: string;
  lastContactDate?: Date;
  totalCalls?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface ContactResponseDto {
  _id: string;
  organizationId: string;
  name: string;
  email?: string;
  phone: string;
  company?: string;
  position?: string;
  tags: string[];
  notes?: string;
  lastContactDate?: Date;
  totalCalls: number;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactListDto {
  contacts: ContactResponseDto[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}
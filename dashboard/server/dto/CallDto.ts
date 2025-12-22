export interface CreateCallDto {
  agentId: string;
  contactPhone: string;
  contactName?: string;
  callType: 'inbound' | 'outbound';
  metadata?: Record<string, any>;
}

export interface UpdateCallDto {
  status?: 'initiated' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  duration?: number;
  cost?: number;
  transcript?: string;
  recording?: string;
  endedAt?: Date;
  metadata?: Record<string, any>;
}

export interface CallResponseDto {
  _id: string;
  organizationId: string;
  agentId: string;
  contactPhone: string;
  contactName?: string;
  callType: 'inbound' | 'outbound';
  status: 'initiated' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  duration?: number;
  cost?: number;
  transcript?: string;
  recording?: string;
  startedAt: Date;
  endedAt?: Date;
  metadata: Record<string, any>;
  providerData: {
    provider: string;
    callId: string;
    webhookData?: Record<string, any>;
  };
  agent?: {
    _id: string;
    name: string;
    voiceModel: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CallListDto {
  calls: CallResponseDto[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CallFiltersDto {
  agentId?: string;
  callType?: 'inbound' | 'outbound';
  status?: 'initiated' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  dateFrom?: string;
  dateTo?: string;
  contactName?: string;
  page?: number;
  limit?: number;
}
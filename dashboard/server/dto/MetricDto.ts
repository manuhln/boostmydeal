export interface CreateMetricDto {
  date: string; // YYYY-MM-DD format
  totalCalls: number;
  demosBooked: number;
  interestedLeads: number;
  followUps: number;
  totalDuration: number;
  totalCost: number;
  successRate: number;
  averageCallDuration: number;
  providerBreakdown?: {
    vapi?: {
      calls: number;
      cost: number;
      duration: number;
    };
    vocode?: {
      calls: number;
      cost: number;
      duration: number;
    };
    elevenlabs?: {
      calls: number;
      cost: number;
      duration: number;
    };
  };
}

export interface UpdateMetricDto {
  totalCalls?: number;
  demosBooked?: number;
  interestedLeads?: number;
  followUps?: number;
  totalDuration?: number;
  totalCost?: number;
  successRate?: number;
  averageCallDuration?: number;
  providerBreakdown?: {
    vapi?: {
      calls: number;
      cost: number;
      duration: number;
    };
    vocode?: {
      calls: number;
      cost: number;
      duration: number;
    };
    elevenlabs?: {
      calls: number;
      cost: number;
      duration: number;
    };
  };
}

export interface MetricResponseDto {
  _id: string;
  organizationId: string;
  date: string;
  totalCalls: number;
  demosBooked: number;
  interestedLeads: number;
  followUps: number;
  totalDuration: number;
  totalCost: number;
  successRate: number;
  averageCallDuration: number;
  providerBreakdown: {
    vapi?: {
      calls: number;
      cost: number;
      duration: number;
    };
    vocode?: {
      calls: number;
      cost: number;
      duration: number;
    };
    elevenlabs?: {
      calls: number;
      cost: number;
      duration: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}
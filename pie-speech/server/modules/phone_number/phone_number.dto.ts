export interface CreatePhoneNumberDTO {
  phoneNumber: string;
  countryCode: string;
  provider: 'twilio' | 'voxsun';
  accountSid: string;
  authToken: string;
}

export interface UpdatePhoneNumberDTO {
  phoneNumber?: string;
  countryCode?: string;
  provider?: 'twilio' | 'voxsun';
  accountSid?: string;
  authToken?: string;
}

export interface PhoneNumberResponseDTO {
  _id: string;
  organizationId: string;
  workspaceId: string;
  phoneNumber: string;
  provider: 'twilio' | 'voxsun';
  accountSid: string; // This will be decrypted for response
  createdAt: Date;
  updatedAt: Date;
}

export interface PhoneNumberListDTO {
  phoneNumbers: PhoneNumberResponseDTO[];
  total: number;
  page: number;
  limit: number;
}
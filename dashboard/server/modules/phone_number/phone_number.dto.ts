export interface CreatePhoneNumberDTO {
  phoneNumber: string;
  countryCode: string;
  provider: 'twilio' | 'voxsun';
  // Twilio fields
  accountSid?: string;
  authToken?: string;
  // Voxsun SIP trunk fields
  voxsunUsername?: string;
  voxsunPassword?: string;
  voxsunDomain?: string;
  voxsunPort?: number;
}

export interface UpdatePhoneNumberDTO {
  phoneNumber?: string;
  countryCode?: string;
  provider?: 'twilio' | 'voxsun';
  // Twilio fields
  accountSid?: string;
  authToken?: string;
  // Voxsun SIP trunk fields
  voxsunUsername?: string;
  voxsunPassword?: string;
  voxsunDomain?: string;
  voxsunPort?: number;
}

export interface PhoneNumberResponseDTO {
  _id: string;
  organizationId: string;
  workspaceId: string;
  phoneNumber: string;
  provider: 'twilio' | 'voxsun';
  accountSid?: string; // This will be decrypted for response (Twilio)
  // Voxsun fields (without credentials in response)
  voxsunDomain?: string;
  voxsunPort?: number;
  voxsunLiveKitTrunkId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhoneNumberListDTO {
  phoneNumbers: PhoneNumberResponseDTO[];
  total: number;
  page: number;
  limit: number;
}
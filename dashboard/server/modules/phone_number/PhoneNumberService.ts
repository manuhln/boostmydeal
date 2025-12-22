import { PhoneNumberDAL } from './phone_number.dal';
import { CreatePhoneNumberDTO, UpdatePhoneNumberDTO, PhoneNumberResponseDTO, PhoneNumberListDTO } from './phone_number.dto';
import { IPhoneNumber } from './PhoneNumber';

export class PhoneNumberService {
  private phoneNumberDAL: PhoneNumberDAL;

  constructor() {
    this.phoneNumberDAL = new PhoneNumberDAL();
  }

  async createPhoneNumber(organizationId: string, phoneNumberData: CreatePhoneNumberDTO): Promise<PhoneNumberResponseDTO> {
    // Validate phone number format
    this.validatePhoneNumber(phoneNumberData.phoneNumber);
    
    // Check if phone number already exists for this organization
    const existingPhoneNumber = await this.phoneNumberDAL.findPhoneNumberByNumber(
      organizationId,
      phoneNumberData.countryCode + phoneNumberData.phoneNumber
    );
    
    if (existingPhoneNumber) {
      throw new Error('Phone number already exists for this organization');
    }

    const phoneNumber = await this.phoneNumberDAL.createPhoneNumber(organizationId, phoneNumberData);
    return this.mapToResponseDTO(phoneNumber);
  }

  async getPhoneNumbersByOrganization(organizationId: string): Promise<PhoneNumberResponseDTO[]> {
    const phoneNumbers = await this.phoneNumberDAL.findPhoneNumbersByOrganization(organizationId);
    return phoneNumbers.map(phoneNumber => this.mapToResponseDTO(phoneNumber));
  }

  async getPhoneNumbersByProvider(organizationId: string, provider: 'twilio' | 'voxsun'): Promise<PhoneNumberResponseDTO[]> {
    const phoneNumbers = await this.phoneNumberDAL.findPhoneNumbersByProvider(organizationId, provider);
    return phoneNumbers.map(phoneNumber => this.mapToResponseDTO(phoneNumber));
  }

  async getPhoneNumberById(phoneNumberId: string, organizationId: string): Promise<PhoneNumberResponseDTO | null> {
    const phoneNumber = await this.phoneNumberDAL.findPhoneNumberById(phoneNumberId, organizationId);
    return phoneNumber ? this.mapToResponseDTO(phoneNumber) : null;
  }

  async updatePhoneNumber(
    phoneNumberId: string,
    organizationId: string,
    updateData: UpdatePhoneNumberDTO
  ): Promise<PhoneNumberResponseDTO | null> {
    // Validate phone number format if being updated
    if (updateData.phoneNumber) {
      this.validatePhoneNumber(updateData.phoneNumber);
    }

    const phoneNumber = await this.phoneNumberDAL.updatePhoneNumber(phoneNumberId, organizationId, updateData);
    return phoneNumber ? this.mapToResponseDTO(phoneNumber) : null;
  }

  async deletePhoneNumber(phoneNumberId: string, organizationId: string): Promise<boolean> {
    return await this.phoneNumberDAL.deletePhoneNumber(phoneNumberId, organizationId);
  }

  async getPhoneNumbersPaginated(
    organizationId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PhoneNumberListDTO> {
    const { phoneNumbers, total } = await this.phoneNumberDAL.findPhoneNumbersPaginated(organizationId, page, limit);
    
    return {
      phoneNumbers: phoneNumbers.map(phoneNumber => this.mapToResponseDTO(phoneNumber)),
      total,
      page,
      limit
    };
  }

  async getPhoneNumbersCount(organizationId: string): Promise<number> {
    return await this.phoneNumberDAL.countPhoneNumbersByOrganization(organizationId);
  }

  // Validation methods
  private validatePhoneNumber(phoneNumber: string): void {
    // Remove any non-digit characters for validation
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    
    if (cleanedNumber.length < 10) {
      throw new Error('Phone number must be at least 10 digits long');
    }
    
    if (cleanedNumber.length > 15) {
      throw new Error('Phone number cannot be longer than 15 digits');
    }
  }

  // Mapping methods
  private mapToResponseDTO(phoneNumber: IPhoneNumber): PhoneNumberResponseDTO {
    return {
      _id: phoneNumber._id?.toString() || '',
      organizationId: phoneNumber.organizationId,
      workspaceId: phoneNumber.workspaceId,
      phoneNumber: phoneNumber.phoneNumber,
      provider: phoneNumber.provider,
      accountSid: phoneNumber.accountSid, // This is already decrypted by DAL
      createdAt: phoneNumber.createdAt,
      updatedAt: phoneNumber.updatedAt
    };
  }
}
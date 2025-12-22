import { PhoneNumber, IPhoneNumber } from './PhoneNumber';
import { BaseDAL } from '../../dal/base.dal';
import { CreatePhoneNumberDTO, UpdatePhoneNumberDTO } from './phone_number.dto';
import { encrypt, decrypt } from '../../integrations/common/encryption.util';

export class PhoneNumberDAL extends BaseDAL<IPhoneNumber> {
  constructor() {
    super(PhoneNumber);
  }

  // Business-focused methods
  async findPhoneNumbersByOrganization(organizationId: string): Promise<IPhoneNumber[]> {
    const phoneNumbers = await this.model.find({ organizationId }).sort({ createdAt: -1 });
    return phoneNumbers.map(phoneNumber => this.sanitizePhoneNumberForDisplay(phoneNumber));
  }

  async findPhoneNumbersByProvider(organizationId: string, provider: 'twilio' | 'voxsun'): Promise<IPhoneNumber[]> {
    const phoneNumbers = await this.model.find({ organizationId, provider }).sort({ createdAt: -1 });
    return phoneNumbers.map(phoneNumber => this.sanitizePhoneNumberForDisplay(phoneNumber));
  }

  async findPhoneNumberByNumber(organizationId: string, phoneNumber: string): Promise<IPhoneNumber | null> {
    const result = await this.findOne({ organizationId, phoneNumber });
    return result ? this.sanitizePhoneNumberForDisplay(result) : null;
  }

  async findPhoneNumberById(phoneNumberId: string, organizationId: string): Promise<IPhoneNumber | null> {
    const result = await this.findOne({ _id: phoneNumberId, organizationId });
    return result ? this.sanitizePhoneNumberForDisplay(result) : null;
  }

  async createPhoneNumber(organizationId: string, phoneNumberData: CreatePhoneNumberDTO): Promise<IPhoneNumber> {
    // Concatenate country code with phone number
    const fullPhoneNumber = phoneNumberData.countryCode + phoneNumberData.phoneNumber;
    
    // Encrypt sensitive data
    const encryptedData = {
      organizationId,
      workspaceId: '1',
      phoneNumber: fullPhoneNumber,
      provider: phoneNumberData.provider,
      accountSid: encrypt(phoneNumberData.accountSid),
      authToken: encrypt(phoneNumberData.authToken)
    };

    const phoneNumber = await this.create(encryptedData);
    return this.sanitizePhoneNumberForDisplay(phoneNumber);
  }

  // Method to get decrypted credentials for API calls (internal use only)
  async getPhoneNumberCredentials(phoneNumberId: string, organizationId: string): Promise<{ accountSid: string; authToken: string } | null> {
    const result = await this.findOne({ _id: phoneNumberId, organizationId });
    if (!result) return null;
    
    return {
      accountSid: decrypt(result.accountSid),
      authToken: decrypt(result.authToken)
    };
  }

  async updatePhoneNumber(phoneNumberId: string, organizationId: string, updateData: UpdatePhoneNumberDTO): Promise<IPhoneNumber | null> {
    const encryptedUpdateData: any = { ...updateData };
    
    // Concatenate country code with phone number if both are provided
    if (updateData.countryCode && updateData.phoneNumber) {
      encryptedUpdateData.phoneNumber = updateData.countryCode + updateData.phoneNumber;
      delete encryptedUpdateData.countryCode;
    }
    
    // Encrypt sensitive fields if they're being updated
    if (updateData.accountSid) {
      encryptedUpdateData.accountSid = encrypt(updateData.accountSid);
    }
    if (updateData.authToken) {
      encryptedUpdateData.authToken = encrypt(updateData.authToken);
    }

    const phoneNumber = await this.updateOne(
      { _id: phoneNumberId, organizationId },
      encryptedUpdateData
    );
    
    return phoneNumber ? this.sanitizePhoneNumberForDisplay(phoneNumber) : null;
  }

  async deletePhoneNumber(phoneNumberId: string, organizationId: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: phoneNumberId, organizationId });
    return result.deletedCount > 0;
  }

  async countPhoneNumbersByOrganization(organizationId: string): Promise<number> {
    return await this.model.countDocuments({ organizationId });
  }

  async findPhoneNumbersPaginated(
    organizationId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ phoneNumbers: IPhoneNumber[]; total: number }> {
    const skip = (page - 1) * limit;
    const [phoneNumbers, total] = await Promise.all([
      this.model.find({ organizationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments({ organizationId })
    ]);

    return {
      phoneNumbers: phoneNumbers.map(phoneNumber => this.sanitizePhoneNumberForDisplay(phoneNumber)),
      total
    };
  }

  // Private helper method to sanitize phone number for display (mask sensitive data)
  private sanitizePhoneNumberForDisplay(phoneNumber: IPhoneNumber): IPhoneNumber {
    const decryptedAccountSid = decrypt(phoneNumber.accountSid);
    const maskedAccountSid = '****' + decryptedAccountSid.slice(-4);
    
    return {
      ...phoneNumber.toObject(),
      accountSid: maskedAccountSid,
      authToken: '****' // Never show auth tokens
    };
  }

  // Private helper method to decrypt sensitive fields (only for internal use)
  private decryptPhoneNumber(phoneNumber: IPhoneNumber): IPhoneNumber {
    const decryptedPhoneNumber = phoneNumber.toObject();
    try {
      decryptedPhoneNumber.accountSid = decrypt(phoneNumber.accountSid);
      decryptedPhoneNumber.authToken = decrypt(phoneNumber.authToken);
    } catch (error) {
      console.error('Error decrypting phone number data:', error);
      // Return original data if decryption fails
    }
    return decryptedPhoneNumber as IPhoneNumber;
  }
}
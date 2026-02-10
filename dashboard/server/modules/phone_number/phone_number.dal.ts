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
    
    // Prepare base data
    const phoneNumberRecord: any = {
      organizationId,
      workspaceId: '1',
      phoneNumber: fullPhoneNumber,
      provider: phoneNumberData.provider
    };

    // Handle provider-specific credentials
    if (phoneNumberData.provider === 'twilio') {
      phoneNumberRecord.accountSid = encrypt(phoneNumberData.accountSid || '');
      phoneNumberRecord.authToken = encrypt(phoneNumberData.authToken || '');
    } else if (phoneNumberData.provider === 'voxsun') {
      // For Voxsun, we still need accountSid and authToken fields (may contain fallback values)
      phoneNumberRecord.accountSid = encrypt(phoneNumberData.accountSid || 'voxsun');
      phoneNumberRecord.authToken = encrypt(phoneNumberData.authToken || 'voxsun');
      
      // Add Voxsun-specific fields
      phoneNumberRecord.voxsunUsername = phoneNumberData.voxsunUsername ? encrypt(phoneNumberData.voxsunUsername) : null;
      phoneNumberRecord.voxsunPassword = phoneNumberData.voxsunPassword ? encrypt(phoneNumberData.voxsunPassword) : null;
      phoneNumberRecord.voxsunDomain = phoneNumberData.voxsunDomain || null;
      phoneNumberRecord.voxsunPort = phoneNumberData.voxsunPort || 5060;
    }

    const phoneNumber = await this.create(phoneNumberRecord);
    return this.sanitizePhoneNumberForDisplay(phoneNumber);
  }

  // Method to get decrypted credentials for API calls (internal use only)
  async getPhoneNumberCredentials(phoneNumberId: string, organizationId: string): Promise<{ accountSid: string; authToken: string } | null> {
    const result = await this.findOne({ _id: phoneNumberId, organizationId });
    if (!result) return null;
    
    try {
      if (!result.accountSid || !result.authToken) {
        console.warn('⚠️  [Phone] Missing accountSid or authToken for phone number:', phoneNumberId);
        return null;
      }
      
      return {
        accountSid: decrypt(result.accountSid),
        authToken: decrypt(result.authToken)
      };
    } catch (error: any) {
      console.error('❌ [Phone] Error decrypting credentials:', error.message);
      return null;
    }
  }

  // Method to get decrypted Voxsun credentials for API calls (internal use only)
  async getVoxsunCredentials(phoneNumberId: string, organizationId: string): Promise<{ username: string; password: string } | null> {
    const result = await this.findOne({ _id: phoneNumberId, organizationId });
    if (!result) return null;
    
    try {
      if (!result.voxsunUsername || !result.voxsunPassword) {
        console.warn('⚠️  [Phone] Missing Voxsun credentials for phone number:', phoneNumberId);
        return null;
      }
      
      return {
        username: decrypt(result.voxsunUsername),
        password: decrypt(result.voxsunPassword)
      };
    } catch (error: any) {
      console.error('❌ [Phone] Error decrypting Voxsun credentials:', error.message);
      return null;
    }
  }

  async updatePhoneNumber(phoneNumberId: string, organizationId: string, updateData: UpdatePhoneNumberDTO): Promise<IPhoneNumber | null> {
    const encryptedUpdateData: any = { ...updateData };
    
    // Concatenate country code with phone number if both are provided
    if (updateData.countryCode && updateData.phoneNumber) {
      encryptedUpdateData.phoneNumber = updateData.countryCode + updateData.phoneNumber;
      delete encryptedUpdateData.countryCode;
    }
    
    // Encrypt Twilio-specific fields if they're being updated
    if (updateData.accountSid) {
      encryptedUpdateData.accountSid = encrypt(updateData.accountSid);
    }
    if (updateData.authToken) {
      encryptedUpdateData.authToken = encrypt(updateData.authToken);
    }

    // Encrypt Voxsun-specific fields if they're being updated
    if (updateData.voxsunUsername) {
      encryptedUpdateData.voxsunUsername = encrypt(updateData.voxsunUsername);
    }
    if (updateData.voxsunPassword) {
      encryptedUpdateData.voxsunPassword = encrypt(updateData.voxsunPassword);
    }
    // Other Voxsun fields (domain, port, did) are not encrypted as they're not sensitive

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
    let maskedAccountSid = '****';
    
    // Check if accountSid exists before attempting to decrypt
    if (!phoneNumber.accountSid) {
      console.warn('⚠️  [Phone Sanitize] Phone number missing accountSid:', phoneNumber._id);
      return {
        ...phoneNumber.toObject(),
        accountSid: '****',
        authToken: '****'
      };
    }
    
    try {
      const decryptedAccountSid = decrypt(phoneNumber.accountSid);
      maskedAccountSid = '****' + decryptedAccountSid.slice(-4);
      console.log('✅ [Phone Decrypt] Successfully decrypted accountSid');
    } catch (error: any) {
      console.warn('🔐 [Phone Decrypt] Could not decrypt accountSid:', error.message);
      // If decryption fails, try to mask what we have
      try {
        const accountSidStr = phoneNumber.accountSid?.toString() || '';
        if (accountSidStr && accountSidStr.length > 4) {
          maskedAccountSid = '****' + accountSidStr.slice(-4);
        }
      } catch (e) {
        console.warn('⚠️  [Phone Sanitize] Could not extract accountSid:', e);
      }
    }
    
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
      if (phoneNumber.accountSid) {
        decryptedPhoneNumber.accountSid = decrypt(phoneNumber.accountSid);
      } else {
        console.warn('⚠️  [Phone Decrypt] Missing accountSid for phone:', phoneNumber._id);
      }
      
      if (phoneNumber.authToken) {
        decryptedPhoneNumber.authToken = decrypt(phoneNumber.authToken);
      } else {
        console.warn('⚠️  [Phone Decrypt] Missing authToken for phone:', phoneNumber._id);
      }
    } catch (error) {
      console.error('❌ [Phone Decrypt] Error decrypting phone number data:', error);
      // Return original data if decryption fails
    }
    return decryptedPhoneNumber as IPhoneNumber;
  }
}
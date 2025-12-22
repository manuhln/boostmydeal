import { Contact, type IContact } from '../models/Contact';
import { BaseDAL } from './base.dal';

/**
 * Contact Data Access Layer
 * Provides descriptive, business-focused methods for contact operations
 */
export class ContactDAL extends BaseDAL<IContact> {
  constructor() {
    super(Contact);
  }

  /**
   * Find all active contacts for organization
   */
  async findActiveContactsByOrganization(organizationId: string): Promise<IContact[]> {
    return this.find(
      { organizationId, isActive: true },
      { sort: { lastName: 1, firstName: 1 } }
    );
  }

  /**
   * Find contact by ID within organization
   */
  async findContactByIdInOrganization(contactId: string, organizationId: string): Promise<IContact | null> {
    return this.findOne({ _id: contactId, organizationId });
  }

  /**
   * Find contact by phone number
   */
  async findContactByPhone(organizationId: string, phone: string): Promise<IContact | null> {
    return this.findOne({ organizationId, phone, isActive: true });
  }

  /**
   * Find contact by email
   */
  async findContactByEmail(organizationId: string, email: string): Promise<IContact | null> {
    return this.findOne({ 
      organizationId, 
      email: email.toLowerCase(), 
      isActive: true 
    });
  }

  /**
   * Find contacts by name (first or last)
   */
  async findContactsByName(organizationId: string, name: string): Promise<IContact[]> {
    return this.find({
      organizationId,
      isActive: true,
      $or: [
        { name: { $regex: name, $options: 'i' } }
      ]
    });
  }

  /**
   * Find contacts by company
   */
  async findContactsByCompany(organizationId: string, company: string): Promise<IContact[]> {
    return this.find({
      organizationId,
      company: { $regex: company, $options: 'i' },
      isActive: true
    });
  }

  /**
   * Find contacts by tag
   */
  async findContactsByTag(organizationId: string, tag: string): Promise<IContact[]> {
    return this.find({
      organizationId,
      tags: { $in: [tag] },
      isActive: true
    });
  }

  /**
   * Find contacts by multiple tags
   */
  async findContactsByTags(organizationId: string, tags: string[]): Promise<IContact[]> {
    return this.find({
      organizationId,
      tags: { $in: tags },
      isActive: true
    });
  }

  /**
   * Find contacts with all specified tags
   */
  async findContactsWithAllTags(organizationId: string, tags: string[]): Promise<IContact[]> {
    return this.find({
      organizationId,
      tags: { $all: tags },
      isActive: true
    });
  }

  /**
   * Find high-value contacts (many calls)
   */
  async findHighValueContacts(organizationId: string, minCalls: number = 5): Promise<IContact[]> {
    return this.find(
      {
        organizationId,
        totalCalls: { $gte: minCalls },
        isActive: true
      },
      { sort: { totalCalls: -1 } }
    );
  }

  /**
   * Find recently contacted contacts
   */
  async findRecentlyContactedContacts(organizationId: string, days: number = 7): Promise<IContact[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.find(
      {
        organizationId,
        lastContactDate: { $gte: cutoffDate },
        isActive: true
      },
      { sort: { lastContactDate: -1 } }
    );
  }

  /**
   * Find contacts due for follow-up
   */
  async findContactsDueForFollowUp(organizationId: string, daysSinceLastContact: number = 30): Promise<IContact[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastContact);

    return this.find({
      organizationId,
      $or: [
        { lastContactDate: { $lte: cutoffDate } },
        { lastContactDate: { $exists: false } }
      ],
      isActive: true
    });
  }

  /**
   * Create new contact
   */
  async createContact(contactData: Partial<IContact>): Promise<IContact> {
    return this.create({
      ...contactData,
      email: contactData.email?.toLowerCase(),
      isActive: true,
      totalCalls: 0,
      tags: contactData.tags || [],
      metadata: contactData.metadata || {}
    });
  }

  /**
   * Update contact information
   */
  async updateContactInfo(contactId: string, organizationId: string, contactData: Partial<IContact>): Promise<IContact | null> {
    const updateData = {
      ...contactData,
      updatedAt: new Date()
    };

    // Handle email case
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
    }

    // Remove sensitive fields that shouldn't be updated via info update
    delete updateData.organizationId;
    delete updateData.totalCalls;
    delete updateData.lastContactDate;

    return this.updateOne(
      { _id: contactId, organizationId },
      updateData
    );
  }

  /**
   * Update contact last contact date
   */
  async updateLastContactDate(contactId: string, organizationId: string, date?: Date): Promise<IContact | null> {
    return this.updateOne(
      { _id: contactId, organizationId },
      { 
        lastContactDate: date || new Date(),
        updatedAt: new Date()
      }
    );
  }

  /**
   * Increment contact call count
   */
  async incrementCallCount(contactId: string, organizationId: string, increment: number = 1): Promise<IContact | null> {
    const result = await this.model.findOneAndUpdate(
      { _id: contactId, organizationId },
      { 
        $inc: { totalCalls: increment },
        $set: { 
          lastContactDate: new Date(),
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    return result;
  }

  /**
   * Add tag to contact
   */
  async addTagToContact(contactId: string, organizationId: string, tag: string): Promise<IContact | null> {
    return this.updateOne(
      { _id: contactId, organizationId },
      { 
        $addToSet: { tags: tag },
        $set: { updatedAt: new Date() }
      }
    );
  }

  /**
   * Remove tag from contact
   */
  async removeTagFromContact(contactId: string, organizationId: string, tag: string): Promise<IContact | null> {
    return this.updateOne(
      { _id: contactId, organizationId },
      { 
        $pull: { tags: tag },
        $set: { updatedAt: new Date() }
      }
    );
  }

  /**
   * Set contact tags (replace all)
   */
  async setContactTags(contactId: string, organizationId: string, tags: string[]): Promise<IContact | null> {
    return this.updateOne(
      { _id: contactId, organizationId },
      { 
        tags,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Update contact notes
   */
  async updateContactNotes(contactId: string, organizationId: string, notes: string): Promise<IContact | null> {
    return this.updateOne(
      { _id: contactId, organizationId },
      { 
        notes,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Deactivate contact (soft delete)
   */
  async deactivateContact(contactId: string, organizationId: string): Promise<IContact | null> {
    return this.updateOne(
      { _id: contactId, organizationId },
      { 
        isActive: false,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Reactivate contact
   */
  async reactivateContact(contactId: string, organizationId: string): Promise<IContact | null> {
    return this.updateOne(
      { _id: contactId, organizationId },
      { 
        isActive: true,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Check if phone number exists
   */
  async phoneExists(organizationId: string, phone: string): Promise<boolean> {
    return this.exists({ organizationId, phone, isActive: true });
  }

  /**
   * Check if email exists
   */
  async emailExists(organizationId: string, email: string): Promise<boolean> {
    return this.exists({ organizationId, email: email.toLowerCase(), isActive: true });
  }

  /**
   * Count active contacts by organization
   */
  async countActiveContactsByOrganization(organizationId: string): Promise<number> {
    return this.count({ organizationId, isActive: true });
  }

  /**
   * Count contacts by tag
   */
  async countContactsByTag(organizationId: string, tag: string): Promise<number> {
    return this.count({
      organizationId,
      tags: { $in: [tag] },
      isActive: true
    });
  }

  /**
   * Get all unique tags for organization
   */
  async getUniqueTagsForOrganization(organizationId: string): Promise<string[]> {
    const result = await this.model.distinct('tags', {
      organizationId,
      isActive: true
    });

    return result || [];
  }

  /**
   * Get all unique companies for organization
   */
  async getUniqueCompaniesForOrganization(organizationId: string): Promise<string[]> {
    const result = await this.model.distinct('company', {
      organizationId,
      isActive: true,
      company: { $exists: true, $ne: null }
    });

    return result || [];
  }

  /**
   * Get paginated contacts with filters
   */
  async getPaginatedContacts(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    filters?: {
      company?: string;
      tag?: string;
      search?: string;
    }
  ) {
    let criteria: any = { organizationId, isActive: true };

    if (filters?.company) {
      criteria.company = { $regex: filters.company, $options: 'i' };
    }

    if (filters?.tag) {
      criteria.tags = { $in: [filters.tag] };
    }

    if (filters?.search) {
      criteria.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
        { company: { $regex: filters.search, $options: 'i' } }
      ];
    }

    return this.paginate(criteria, page, limit, { name: 1 });
  }

  /**
   * Get contact statistics
   */
  async getContactStatistics(organizationId: string) {
    const stats = await this.model.aggregate([
      { $match: { organizationId, isActive: true } },
      {
        $group: {
          _id: null,
          totalContacts: { $sum: 1 },
          totalCalls: { $sum: '$totalCalls' },
          averageCallsPerContact: { $avg: '$totalCalls' },
          contactsWithCalls: {
            $sum: { $cond: [{ $gt: ['$totalCalls', 0] }, 1, 0] }
          },
          contactsWithCompany: {
            $sum: { $cond: [{ $ne: ['$company', null] }, 1, 0] }
          },
          uniqueTags: { $addToSet: '$tags' }
        }
      }
    ]);

    const result = stats[0] || {
      totalContacts: 0,
      totalCalls: 0,
      averageCallsPerContact: 0,
      contactsWithCalls: 0,
      contactsWithCompany: 0,
      uniqueTags: []
    };

    // Flatten the nested tags array
    if (result.uniqueTags && result.uniqueTags.length > 0) {
      const flatTags = result.uniqueTags.flat();
      result.uniqueTags = Array.from(new Set(flatTags));
    }

    return result;
  }
}

// Export singleton instance
export const contactDAL = new ContactDAL();
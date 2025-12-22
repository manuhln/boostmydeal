import { Document, Model } from 'mongoose';

/**
 * Base Data Access Layer with common CRUD operations
 * Provides reusable private methods for all DAL implementations
 */
export abstract class BaseDAL<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  /**
   * Private helper method - Find single document by criteria
   */
  protected async findOne(criteria: any, options?: any): Promise<T | null> {
    return this.model.findOne(criteria, null, options) as Promise<T | null>;
  }

  /**
   * Private helper method - Find multiple documents by criteria
   */
  protected async find(criteria: any = {}, options?: any): Promise<T[]> {
    return this.model.find(criteria, null, options) as Promise<T[]>;
  }

  /**
   * Private helper method - Create new document
   */
  protected async create(data: any): Promise<T> {
    const document = new this.model(data);
    return document.save() as Promise<T>;
  }

  /**
   * Private helper method - Update document by ID
   */
  protected async updateById(id: string, data: any, options = { new: true }): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, data, options) as Promise<T | null>;
  }

  /**
   * Private helper method - Update single document by criteria
   */
  protected async updateOne(criteria: any, data: any, options = { new: true }): Promise<T | null> {
    return this.model.findOneAndUpdate(criteria, data, options) as Promise<T | null>;
  }

  /**
   * Private helper method - Delete document by ID
   */
  protected async deleteById(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id) as Promise<T | null>;
  }

  /**
   * Private helper method - Delete single document by criteria
   */
  protected async deleteOne(criteria: any): Promise<T | null> {
    return this.model.findOneAndDelete(criteria) as Promise<T | null>;
  }

  /**
   * Private helper method - Count documents by criteria
   */
  protected async count(criteria: any = {}): Promise<number> {
    return this.model.countDocuments(criteria);
  }

  /**
   * Private helper method - Check if document exists
   */
  protected async exists(criteria: any): Promise<boolean> {
    const count = await this.model.countDocuments(criteria);
    return count > 0;
  }

  /**
   * Private helper method - Get paginated results
   */
  protected async paginate(
    criteria: any = {}, 
    page: number = 1, 
    limit: number = 10,
    sort: any = { createdAt: -1 }
  ): Promise<{ data: T[]; total: number; page: number; limit: number; hasNext: boolean; hasPrev: boolean }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model.find(criteria).sort(sort).skip(skip).limit(limit) as Promise<T[]>,
      this.model.countDocuments(criteria)
    ]);

    return {
      data,
      total,
      page,
      limit,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
  }

  /**
   * Private helper method - Soft delete (mark as inactive)
   */
  protected async softDelete(criteria: any): Promise<T | null> {
    return this.updateOne(criteria, { isActive: false });
  }
}
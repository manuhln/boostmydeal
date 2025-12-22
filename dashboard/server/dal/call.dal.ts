import { Call, type ICall } from "../models/Call";
import { BaseDAL } from "./base.dal";

/**
 * Call Data Access Layer
 * Provides descriptive, business-focused methods for call operations
 */
export class CallDAL extends BaseDAL<ICall> {
  constructor() {
    super(Call);
  }

  /**
   * Find all calls for organization
   */
  async findCallsByOrganization(organizationId: string): Promise<ICall[]> {
    return this.model
      .find({ organizationId })
      .populate('assistantId', 'name') // Populate assistant name
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find call by ID within organization
   */
  async findCallByIdInOrganization(
    callId: string,
    organizationId: string,
  ): Promise<ICall | null> {
    return this.findOne({ _id: callId, organizationId });
  }

  /**
   * Find call by Twilio SID
   */
  async findCallByTwilioSid(twilioSid: string): Promise<ICall | null> {
    return this.findOne({ twilioSid });
  }

  /**
   * Find calls by agent
   */
  async findCallsByAgent(
    organizationId: string,
    agentId: string,
  ): Promise<ICall[]> {
    return this.find({ organizationId, agentId }, { sort: { createdAt: -1 } });
  }

  /**
   * Find calls by status
   */
  async findCallsByStatus(
    organizationId: string,
    status: string,
  ): Promise<ICall[]> {
    return this.find({ organizationId, status }, { sort: { createdAt: -1 } });
  }

  /**
   * Find calls by type (inbound/outbound)
   */
  async findCallsByType(
    organizationId: string,
    callType: string,
  ): Promise<ICall[]> {
    return this.find({ organizationId, callType }, { sort: { createdAt: -1 } });
  }

  /**
   * Find calls by phone number
   */
  async findCallsByPhone(
    organizationId: string,
    contactPhone: string,
  ): Promise<ICall[]> {
    return this.find(
      { organizationId, contactPhone },
      { sort: { createdAt: -1 } },
    );
  }

  /**
   * Find calls by contact name
   */
  async findCallsByContactName(
    organizationId: string,
    contactName: string,
  ): Promise<ICall[]> {
    return this.find(
      {
        organizationId,
        contactName: { $regex: contactName, $options: "i" },
      },
      { sort: { createdAt: -1 } },
    );
  }

  /**
   * Find calls within date range
   */
  async findCallsByDateRange(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ICall[]> {
    return this.find(
      {
        organizationId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
      { sort: { createdAt: -1 } },
    );
  }

  /**
   * Find today's calls
   */
  async findTodaysCalls(organizationId: string): Promise<ICall[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.findCallsByDateRange(organizationId, today, tomorrow);
  }

  /**
   * Find completed calls
   */
  async findCompletedCalls(organizationId: string): Promise<ICall[]> {
    return this.findCallsByStatus(organizationId, "completed");
  }

  /**
   * Find failed calls
   */
  async findFailedCalls(organizationId: string): Promise<ICall[]> {
    return this.findCallsByStatus(organizationId, "failed");
  }

  /**
   * Find active calls (in progress)
   */
  async findActiveCalls(organizationId: string): Promise<ICall[]> {
    return this.find(
      {
        organizationId,
        status: { $in: ["initiated", "in_progress"] },
      },
      { sort: { createdAt: -1 } },
    );
  }

  /**
   * Get paginated calls with filters
   */
  async getPaginatedCalls(
    organizationId: string,
    page: number = 1,
    limit: number = 20,
    filters: any = {}
  ): Promise<{ data: ICall[]; total: number; page: number; limit: number }> {
    // Build MongoDB query from filters
    const query: any = { organizationId };
    
    // Add filters
    if (filters.agentId) {
      query.assistantId = filters.agentId; // Map agentId filter to assistantId field
    }
    
    if (filters.callType) {
      query.callType = filters.callType;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.contactName) {
      // Test multiple approaches for contact name search
      console.log(`🔍 [CallDAL] Contact name filter input: "${filters.contactName}" (length: ${filters.contactName.length})`);
      
      // Use MongoDB $regex with case insensitive matching
      query.contactName = { $regex: filters.contactName, $options: "i" };
      console.log(`🔍 [CallDAL] Contact name search query:`, query.contactName);
    }
    
    // Date range filters
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.createdAt.$lte = new Date(filters.dateTo);
      }
    }

    console.log(`🔍 [CallDAL] Filtering calls with query:`, JSON.stringify(query, null, 2));

    // Get total count for pagination
    const total = await this.model.countDocuments(query);
    
    // Get paginated results with agent population
    const skip = (page - 1) * limit;
    
    try {
      // Clean up corrupted ObjectIds - run this once to fix existing data
      const corruptedCount = await this.model.countDocuments({
        assistantId: "68ed1ba6c06f2e7bba656c"  // This specific corrupted ID
      });
      
      if (corruptedCount > 0) {
        console.log(`🧹 [CallDAL] Cleaning up ${corruptedCount} calls with corrupted assistantId`);
        await this.model.updateMany(
          { assistantId: "68ed1ba6c06f2e7bba656c" },
          { $unset: { assistantId: "" } }
        );
        console.log(`✅ [CallDAL] Successfully cleaned up corrupted ObjectIds`);
      }
      
      const data = await this.model
        .find(query)
        .populate('assistantId', 'name') // Populate assistant name
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
      
      console.log(`📊 [CallDAL] Found ${data.length} calls out of ${total} total`);
      
      return {
        data,
        total,
        page,
        limit
      };
    } catch (error) {
      console.error(`❌ [CallDAL] Population error, falling back to query without populate:`, (error as Error)?.message);
      
      // Fallback: query without population if ObjectId issue occurs
      const data = await this.model
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
      
      console.log(`📊 [CallDAL] Found ${data.length} calls out of ${total} total (without population)`);
      
      return {
        data,
        total,
        page,
        limit
      };
    }

  }

  /**
   * Create new call
   */
  async createCall(callData: Partial<ICall>): Promise<ICall> {
    return this.create({
      ...callData,
      status: callData.status || "initiated",
      startedAt: callData.startedAt || new Date(),
    });
  }

  /**
   * Update call status
   */
  async updateCallStatus(
    callId: string,
    organizationId: string,
    status: string,
    endedAt?: Date,
  ): Promise<ICall | null> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (endedAt) {
      updateData.endedAt = endedAt;
    }

    return this.updateOne({ _id: callId, organizationId }, updateData);
  }

  /**
   * Update call by Twilio SID (used by webhooks)
   */
  async updateCallByTwilioSid(
    twilioSid: string,
    updateData: any,
  ): Promise<ICall | null> {
    console.log(`🔄 [CallDAL] Updating call with Twilio SID: ${twilioSid}`);

    try {
      const call = await this.findOne({ twilioSid });

      if (!call) {
        console.error(
          `❌ [CallDAL] Call not found with Twilio SID: ${twilioSid}`,
        );
        return null;
      }

      console.log(
        `📋 [CallDAL] Found call with ID: ${call._id}, updating with:`,
        {
          status: updateData.status,
          duration: updateData.duration,
          hasWebhookPayload: !!updateData.webhookPayload,
        },
      );

      const updatedCall = await this.updateOne(
        { twilioSid },
        { ...updateData, updatedAt: new Date() },
      );

      console.log(`✅ [CallDAL] Call updated successfully`);
      return updatedCall;
    } catch (error) {
      console.error(`❌ [CallDAL] Error updating call by Twilio SID:`, error);
      throw error;
    }
  }

  /**
   * Update call duration and cost
   */
  async updateCallMetrics(
    callId: string,
    organizationId: string,
    duration: number,
    cost: number,
  ): Promise<ICall | null> {
    return this.updateOne(
      { _id: callId, organizationId },
      { duration, cost, updatedAt: new Date() },
    );
  }

  /**
   * Update call transcript
   */
  async updateCallTranscript(
    callId: string,
    organizationId: string,
    transcript: string,
  ): Promise<ICall | null> {
    return this.updateOne(
      { _id: callId, organizationId },
      { transcript, updatedAt: new Date() },
    );
  }

  /**
   * Update call recording
   */
  async updateCallRecording(
    callId: string,
    organizationId: string,
    recording: string,
  ): Promise<ICall | null> {
    return this.updateOne(
      { _id: callId, organizationId },
      { recording, updatedAt: new Date() },
    );
  }

  /**
   * Update provider data
   */
  async updateProviderData(
    callId: string,
    organizationId: string,
    providerData: any,
  ): Promise<ICall | null> {
    return this.updateOne(
      { _id: callId, organizationId },
      { providerData, updatedAt: new Date() },
    );
  }

  /**
   * Count calls by status
   */
  async countCallsByStatus(
    organizationId: string,
    status: string,
  ): Promise<number> {
    return this.count({ organizationId, status });
  }

  /**
   * Count today's calls
   */
  async countTodaysCalls(organizationId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.count({
      organizationId,
      createdAt: { $gte: today, $lt: tomorrow },
    });
  }

  /**
   * Count calls by agent
   */
  async countCallsByAgent(
    organizationId: string,
    agentId: string,
  ): Promise<number> {
    return this.count({ organizationId, agentId });
  }

  /**
   * Get call statistics for organization
   */
  async getCallStatistics(
    organizationId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ) {
    const matchCriteria: any = { organizationId };

    if (dateFrom && dateTo) {
      matchCriteria.createdAt = { $gte: dateFrom, $lte: dateTo };
    }

    return this.model.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          completedCalls: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          failedCalls: {
            $sum: {
              $cond: [{ $in: ["$status", ["failed", "cancelled"]] }, 1, 0],
            },
          },
          totalDuration: { $sum: "$duration" },
          avgDuration: { $avg: "$duration" },
          totalCost: { $sum: "$cost" },
        },
      },
    ]);
  }

  /**
   * Get calls by date aggregation
   */
  async getCallsByDateAggregation(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
  ) {
    return this.model.aggregate([
      {
        $match: {
          organizationId,
          createdAt: { $gte: dateFrom, $lte: dateTo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          failed: {
            $sum: {
              $cond: [{ $in: ["$status", ["failed", "cancelled"]] }, 1, 0],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);
  }

  /**
   * Get filtered calls without pagination (for export)
   */
  async getFilteredCalls(organizationId: string, filters: any = {}): Promise<ICall[]> {
    // Build MongoDB query from filters (same as getPaginatedCalls but without pagination)
    const query: any = { organizationId };
    
    // Add filters
    if (filters.agentId) {
      query.assistantId = filters.agentId;
    }
    
    if (filters.callType) {
      query.callType = filters.callType;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.contactName) {
      query.contactName = { $regex: filters.contactName, $options: "i" };
    }
    
    // Date range filters
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.createdAt.$lte = new Date(filters.dateTo);
      }
    }

    console.log(`🔍 [CallDAL] Export filtering calls with query:`, JSON.stringify(query, null, 2));

    try {
      const data = await this.model
        .find(query)
        .populate('assistantId', 'name')
        .sort({ createdAt: -1 })
        .exec();
      
      console.log(`📊 [CallDAL] Found ${data.length} calls for export`);
      return data;
    } catch (error) {
      console.error(`❌ [CallDAL] Export query error, falling back without populate:`, (error as Error)?.message);
      
      // Fallback: query without population if ObjectId issue occurs
      const data = await this.model
        .find(query)
        .sort({ createdAt: -1 })
        .exec();
      
      console.log(`📊 [CallDAL] Found ${data.length} calls for export (without population)`);
      return data;
    }
  }
}

// Export singleton instance
export const callDAL = new CallDAL();

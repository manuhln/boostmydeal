import { Metric, type IMetric } from '../models/Metric';
import { BaseDAL } from './base.dal';

/**
 * Metric Data Access Layer
 * Provides descriptive, business-focused methods for metric operations
 */
export class MetricDAL extends BaseDAL<IMetric> {
  constructor() {
    super(Metric);
  }

  /**
   * Find metrics by organization and date
   */
  async findMetricsByDate(organizationId: string, date: string): Promise<IMetric | null> {
    return this.findOne({ organizationId, date });
  }

  /**
   * Find today's metrics
   */
  async findTodaysMetrics(organizationId: string): Promise<IMetric | null> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return this.findMetricsByDate(organizationId, today);
  }

  /**
   * Find metrics within date range
   */
  async findMetricsByDateRange(organizationId: string, startDate: string, endDate: string): Promise<IMetric[]> {
    return this.find(
      {
        organizationId,
        date: { $gte: startDate, $lte: endDate }
      },
      { sort: { date: 1 } }
    );
  }

  /**
   * Find last N days metrics
   */
  async findLastNDaysMetrics(organizationId: string, days: number): Promise<IMetric[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const endDateStr = endDate.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];

    return this.findMetricsByDateRange(organizationId, startDateStr, endDateStr);
  }

  /**
   * Find this month's metrics
   */
  async findCurrentMonthMetrics(organizationId: string): Promise<IMetric[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startDateStr = startOfMonth.toISOString().split('T')[0];
    const endDateStr = endOfMonth.toISOString().split('T')[0];

    return this.findMetricsByDateRange(organizationId, startDateStr, endDateStr);
  }

  /**
   * Find this week's metrics
   */
  async findCurrentWeekMetrics(organizationId: string): Promise<IMetric[]> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

    const startDateStr = startOfWeek.toISOString().split('T')[0];
    const endDateStr = endOfWeek.toISOString().split('T')[0];

    return this.findMetricsByDateRange(organizationId, startDateStr, endDateStr);
  }

  /**
   * Create or update metrics for a specific date
   */
  async createOrUpdateMetrics(organizationId: string, date: string, metricsData: Partial<IMetric>): Promise<IMetric> {
    const existingMetric = await this.findMetricsByDate(organizationId, date);

    if (existingMetric) {
      return this.updateOne(
        { _id: existingMetric._id },
        { ...metricsData, updatedAt: new Date() }
      ) as Promise<IMetric>;
    } else {
      return this.create({
        organizationId,
        date,
        ...metricsData,
        totalCalls: metricsData.totalCalls || 0,
        demosBooked: metricsData.demosBooked || 0,
        interestedLeads: metricsData.interestedLeads || 0,
        followUps: metricsData.followUps || 0,
        totalDuration: metricsData.totalDuration || 0,
        totalCost: metricsData.totalCost || 0,
        successRate: metricsData.successRate || 0,
        averageCallDuration: metricsData.averageCallDuration || 0,
        providerBreakdown: metricsData.providerBreakdown || {}
      });
    }
  }

  /**
   * Update today's metrics
   */
  async updateTodaysMetrics(organizationId: string, metricsData: Partial<IMetric>): Promise<IMetric> {
    const today = new Date().toISOString().split('T')[0];
    return this.createOrUpdateMetrics(organizationId, today, metricsData);
  }

  /**
   * Increment today's call count
   */
  async incrementTodaysCallCount(organizationId: string, increment: number = 1): Promise<IMetric> {
    const today = new Date().toISOString().split('T')[0];
    const existingMetric = await this.findMetricsByDate(organizationId, today);

    if (existingMetric) {
      return this.updateOne(
        { _id: existingMetric._id },
        { 
          $inc: { totalCalls: increment },
          $set: { updatedAt: new Date() }
        }
      ) as Promise<IMetric>;
    } else {
      return this.createOrUpdateMetrics(organizationId, today, { totalCalls: increment });
    }
  }

  /**
   * Increment demos booked
   */
  async incrementDemosBooked(organizationId: string, date: string, increment: number = 1): Promise<IMetric> {
    const existingMetric = await this.findMetricsByDate(organizationId, date);

    if (existingMetric) {
      return this.updateOne(
        { _id: existingMetric._id },
        { 
          $inc: { demosBooked: increment },
          $set: { updatedAt: new Date() }
        }
      ) as Promise<IMetric>;
    } else {
      return this.createOrUpdateMetrics(organizationId, date, { demosBooked: increment });
    }
  }

  /**
   * Increment interested leads
   */
  async incrementInterestedLeads(organizationId: string, date: string, increment: number = 1): Promise<IMetric> {
    const existingMetric = await this.findMetricsByDate(organizationId, date);

    if (existingMetric) {
      return this.updateOne(
        { _id: existingMetric._id },
        { 
          $inc: { interestedLeads: increment },
          $set: { updatedAt: new Date() }
        }
      ) as Promise<IMetric>;
    } else {
      return this.createOrUpdateMetrics(organizationId, date, { interestedLeads: increment });
    }
  }

  /**
   * Add to total duration and cost
   */
  async addCallMetrics(organizationId: string, date: string, duration: number, cost: number): Promise<IMetric> {
    const existingMetric = await this.findMetricsByDate(organizationId, date);

    if (existingMetric) {
      const newTotalCalls = existingMetric.totalCalls + 1;
      const newTotalDuration = existingMetric.totalDuration + duration;
      const newTotalCost = existingMetric.totalCost + cost;
      const newAverageDuration = newTotalDuration / newTotalCalls;

      return this.updateOne(
        { _id: existingMetric._id },
        {
          $inc: { 
            totalCalls: 1,
            totalDuration: duration,
            totalCost: cost
          },
          $set: { 
            averageCallDuration: newAverageDuration,
            updatedAt: new Date()
          }
        }
      ) as Promise<IMetric>;
    } else {
      return this.createOrUpdateMetrics(organizationId, date, {
        totalCalls: 1,
        totalDuration: duration,
        totalCost: cost,
        averageCallDuration: duration
      });
    }
  }

  /**
   * Update provider breakdown
   */
  async updateProviderBreakdown(organizationId: string, date: string, provider: string, breakdown: any): Promise<IMetric> {
    const existingMetric = await this.findMetricsByDate(organizationId, date);

    if (existingMetric) {
      const newProviderBreakdown = {
        ...existingMetric.providerBreakdown,
        [provider]: breakdown
      };

      return this.updateOne(
        { _id: existingMetric._id },
        { 
          providerBreakdown: newProviderBreakdown,
          updatedAt: new Date()
        }
      ) as Promise<IMetric>;
    } else {
      return this.createOrUpdateMetrics(organizationId, date, {
        providerBreakdown: { [provider]: breakdown }
      });
    }
  }

  /**
   * Calculate and update success rate
   */
  async updateSuccessRate(organizationId: string, date: string): Promise<IMetric | null> {
    const metric = await this.findMetricsByDate(organizationId, date);
    if (!metric) return null;

    const successfulOutcomes = metric.demosBooked + metric.interestedLeads + metric.followUps;
    const successRate = metric.totalCalls > 0 ? (successfulOutcomes / metric.totalCalls) * 100 : 0;

    return this.updateOne(
      { _id: metric._id },
      { 
        successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
        updatedAt: new Date()
      }
    ) as Promise<IMetric | null>;
  }

  /**
   * Get aggregated metrics for date range
   */
  async getAggregatedMetrics(organizationId: string, startDate: string, endDate: string) {
    const aggregation = await this.model.aggregate([
      {
        $match: {
          organizationId,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: '$totalCalls' },
          totalDemosBooked: { $sum: '$demosBooked' },
          totalInterestedLeads: { $sum: '$interestedLeads' },
          totalFollowUps: { $sum: '$followUps' },
          totalDuration: { $sum: '$totalDuration' },
          totalCost: { $sum: '$totalCost' },
          averageSuccessRate: { $avg: '$successRate' },
          averageCallDuration: { $avg: '$averageCallDuration' },
          daysWithData: { $sum: 1 }
        }
      }
    ]);

    return aggregation[0] || {
      totalCalls: 0,
      totalDemosBooked: 0,
      totalInterestedLeads: 0,
      totalFollowUps: 0,
      totalDuration: 0,
      totalCost: 0,
      averageSuccessRate: 0,
      averageCallDuration: 0,
      daysWithData: 0
    };
  }

  /**
   * Get daily metrics for chart data
   */
  async getDailyMetricsForChart(organizationId: string, startDate: string, endDate: string): Promise<any[]> {
    return this.find(
      {
        organizationId,
        date: { $gte: startDate, $lte: endDate }
      },
      { 
        sort: { date: 1 },
        select: 'date totalCalls demosBooked interestedLeads followUps totalCost successRate'
      }
    );
  }

  /**
   * Get top performing days
   */
  async getTopPerformingDays(organizationId: string, startDate: string, endDate: string, limit: number = 5): Promise<IMetric[]> {
    return this.find(
      {
        organizationId,
        date: { $gte: startDate, $lte: endDate }
      },
      { 
        sort: { successRate: -1, totalCalls: -1 },
        limit
      }
    );
  }

  /**
   * Get provider performance comparison
   */
  async getProviderPerformanceComparison(organizationId: string, startDate: string, endDate: string) {
    const metrics = await this.find({
      organizationId,
      date: { $gte: startDate, $lte: endDate }
    });

    const providerStats: any = {};

    metrics.forEach(metric => {
      if (metric.providerBreakdown) {
        Object.keys(metric.providerBreakdown).forEach(provider => {
          if (!providerStats[provider]) {
            providerStats[provider] = {
              totalCalls: 0,
              totalCost: 0,
              totalDuration: 0
            };
          }

          const breakdown = metric.providerBreakdown[provider];
          if (breakdown) {
            providerStats[provider].totalCalls += breakdown.calls || 0;
            providerStats[provider].totalCost += breakdown.cost || 0;
            providerStats[provider].totalDuration += breakdown.duration || 0;
          }
        });
      }
    });

    return providerStats;
  }

  /**
   * Delete old metrics (cleanup)
   */
  async deleteMetricsOlderThan(organizationId: string, cutoffDate: string): Promise<number> {
    const result = await this.model.deleteMany({
      organizationId,
      date: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }
}

// Export singleton instance
export const metricDAL = new MetricDAL();
import { CallDAL, callDAL } from '../dal/call.dal';
import { AgentDAL, agentDAL } from '../modules/agent/agent.dal';
import { ICall } from '../models/Call';

export interface TagAnalytics {
  tagName: string;
  count: number;
  type: 'user' | 'system';
}

export interface CallMetricsResponse {
  totalCalls: number;
  demosBooked: number;
  averageCallDuration: number;
  positiveResponses: number;
  negativeResponses: number;
  voicemailsLeft: number;
  followUpsScheduled: number;
  tagAnalytics?: TagAnalytics[];
}

export class CallMetricsService {
  private callDAL: CallDAL;
  private agentDAL: AgentDAL;

  constructor() {
    this.callDAL = callDAL;
    this.agentDAL = agentDAL;
  }

  /**
   * Get comprehensive call metrics for an organization
   */
  async getCallMetrics(organizationId: string, includeTagAnalytics: boolean = false, dateFilter?: string): Promise<CallMetricsResponse> {
    // Get all calls for the organization
    let calls = await this.callDAL.findCallsByOrganization(organizationId);
    
    // Apply date filter if provided
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      calls = calls.filter(call => {
        const callDate = new Date(call.createdAt);
        return callDate >= filterDate && callDate < nextDay;
      });
    }

    // Calculate total calls
    const totalCalls = calls.length;

    // Calculate average call duration (only for calls with duration)
    const callsWithDuration = calls.filter(call => call.duration && call.duration > 0);
    const totalDuration = callsWithDuration.reduce((sum, call) => sum + (call.duration || 0), 0);
    const averageCallDuration = callsWithDuration.length > 0 
      ? Math.round(totalDuration / callsWithDuration.length) 
      : 0;

    // Count calls by user_tags
    const demosBooked = this.countCallsWithTag(calls, 'demo booked');
    const positiveResponses = this.countCallsWithTag(calls, 'interested');
    const negativeResponses = this.countCallsWithTag(calls, 'not interested');
    const voicemailsLeft = this.countCallsWithTag(calls, 'voicemail');
    const followUpsScheduled = this.countCallsWithTag(calls, 'follow up');

    const response: CallMetricsResponse = {
      totalCalls,
      demosBooked,
      averageCallDuration,
      positiveResponses,
      negativeResponses,
      voicemailsLeft,
      followUpsScheduled
    };

    // Add tag analytics if requested
    if (includeTagAnalytics) {
      response.tagAnalytics = await this.getTagAnalytics(organizationId, calls);
    }

    return response;
  }

  /**
   * Count calls that have a specific tag in their user_tags array
   */
  private countCallsWithTag(calls: ICall[], tag: string): number {
    return calls.filter(call => 
      call.user_tags && 
      call.user_tags.some(userTag => 
        userTag.toLowerCase().includes(tag.toLowerCase())
      )
    ).length;
  }

  /**
   * Get tag analytics by analyzing agent tags against call user_tags
   */
  private async getTagAnalytics(organizationId: string, calls: ICall[]): Promise<TagAnalytics[]> {
    // Get all agents for the organization
    const agents = await this.agentDAL.findActiveAgentsByOrganization(organizationId);
    
    // Collect all unique tags from agents
    const allUserTags = new Set<string>();
    const allSystemTags = new Set<string>();
    
    agents.forEach(agent => {
      if (agent.userTags) {
        agent.userTags.forEach(tag => allUserTags.add(tag.toLowerCase()));
      }
      if (agent.systemTags) {
        agent.systemTags.forEach(tag => allSystemTags.add(tag.toLowerCase()));
      }
    });

    const tagAnalytics: TagAnalytics[] = [];

    // Analyze user tags
    allUserTags.forEach(tag => {
      const count = this.countCallsWithExactTag(calls, tag);
      if (count > 0) {
        tagAnalytics.push({
          tagName: tag,
          count,
          type: 'user'
        });
      }
    });

    // Analyze system tags
    allSystemTags.forEach(tag => {
      const count = this.countCallsWithExactTag(calls, tag);
      if (count > 0) {
        tagAnalytics.push({
          tagName: tag,
          count,
          type: 'system'
        });
      }
    });

    // Sort by count descending
    return tagAnalytics.sort((a, b) => b.count - a.count);
  }

  /**
   * Count calls that have an exact tag match in their user_tags array
   */
  private countCallsWithExactTag(calls: ICall[], tag: string): number {
    return calls.filter(call => 
      call.user_tags && 
      call.user_tags.some(userTag => 
        userTag.toLowerCase() === tag.toLowerCase()
      )
    ).length;
  }

  /**
   * Get metrics for today only
   */
  async getTodayCallMetrics(organizationId: string): Promise<CallMetricsResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's calls using the DAL method
    const allCalls = await this.callDAL.findCallsByOrganization(organizationId);
    const todayCalls = allCalls.filter(call => {
      const callDate = new Date(call.createdAt);
      return callDate >= today && callDate < tomorrow;
    });

    // Calculate metrics for today's calls
    const totalCalls = todayCalls.length;

    const callsWithDuration = todayCalls.filter(call => call.duration && call.duration > 0);
    const totalDuration = callsWithDuration.reduce((sum, call) => sum + (call.duration || 0), 0);
    const averageCallDuration = callsWithDuration.length > 0 
      ? Math.round(totalDuration / callsWithDuration.length) 
      : 0;

    const demosBooked = this.countCallsWithTag(todayCalls, 'demo booked');
    const positiveResponses = this.countCallsWithTag(todayCalls, 'interested');
    const negativeResponses = this.countCallsWithTag(todayCalls, 'not interested');
    const voicemailsLeft = this.countCallsWithTag(todayCalls, 'voicemail');
    const followUpsScheduled = this.countCallsWithTag(todayCalls, 'follow up');

    return {
      totalCalls,
      demosBooked,
      averageCallDuration,
      positiveResponses,
      negativeResponses,
      voicemailsLeft,
      followUpsScheduled
    };
  }

  /**
   * Get last 7 days chart data for calls
   */
  async getLast7DaysChartData(organizationId: string): Promise<Array<{date: string, totalCalls: number}>> {
    const allCalls = await this.callDAL.findCallsByOrganization(organizationId);
    
    // Generate last 7 days dates
    const chartData = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      // Filter calls for this specific day
      const daysCalls = allCalls.filter(call => {
        const callDate = new Date(call.createdAt);
        return callDate >= date && callDate < nextDay;
      });
      
      chartData.push({
        date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        totalCalls: daysCalls.length
      });
    }
    
    return chartData;
  }
}

// Export singleton instance
export const callMetricsService = new CallMetricsService();
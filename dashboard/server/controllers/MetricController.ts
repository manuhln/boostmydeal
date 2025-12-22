import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { callMetricsService } from '../services/CallMetricsService';

export class MetricController {
  static async getTodayMetrics(req: AuthRequest, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID is required'
        });
      }

      const metrics = await callMetricsService.getTodayCallMetrics(organizationId);
      
      return res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error getting today metrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get today metrics'
      });
    }
  }

  static async getMetricsRange(req: AuthRequest, res: Response) {
    return res.json({
      success: true,
      data: []
    });
  }

  static async getMetrics(req: AuthRequest, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID is required'
        });
      }

      const includeTagAnalytics = req.query.includeTagAnalytics === 'true';
      const metrics = await callMetricsService.getCallMetrics(organizationId, includeTagAnalytics);
      
      return res.json({
        success: true,
        data: {
          date: req.params.date,
          ...metrics
        }
      });
    } catch (error) {
      console.error('Error getting metrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get metrics'
      });
    }
  }

  static async getDashboardMetrics(req: AuthRequest, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID is required'
        });
      }

      const dateFilter = req.query.date as string;

      const [metrics, chartData] = await Promise.all([
        callMetricsService.getCallMetrics(organizationId, true, dateFilter),
        callMetricsService.getLast7DaysChartData(organizationId)
      ]);
      
      return res.json({
        success: true,
        data: {
          ...metrics,
          chartData
        }
      });
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get dashboard metrics'
      });
    }
  }
}
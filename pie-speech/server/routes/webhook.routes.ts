import { Router, Request, Response } from 'express';
import { WebhookService } from '../integrations/providers/webhook/webhook.service';

const router = Router();

/**
 * Custom Webhook Endpoint for External Platforms
 * GET /api/webhook/calls - Returns call details in JSON with Basic Auth
 * 
 * Query parameters:
 * - limit: number of results to return (default: 50, max: 100)
 * - offset: number of results to skip (default: 0)
 * - status: filter by call status (completed, in_progress, missed, failed)
 * - startDate: filter calls from this date (ISO format)
 * - endDate: filter calls until this date (ISO format)
 * - agentId: filter calls by specific agent ID
 */
router.get('/calls', async (req: Request, res: Response) => {
  try {
    // Extract Basic Auth credentials
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Basic Auth required. Please provide Authorization: Basic <base64(username:password)>'
      });
    }

    // Decode Basic Auth
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if (!username || !password) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid Basic Auth format. Expected username:password'
      });
    }

    // Authenticate webhook credentials
    const isValidAuth = await WebhookService.validateWebhookAuth(username, password);
    
    if (!isValidAuth) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid webhook credentials'
      });
    }

    // Get the organization ID for the authenticated webhook user
    const organizationId = await WebhookService.getOrganizationForWebhook(username);
    
    if (!organizationId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Unable to determine organization for webhook user'
      });
    }

    // Parse query parameters
    const {
      limit = 50,
      offset = 0,
      status,
      startDate,
      endDate,
      agentId
    } = req.query;

    // Validate limit
    const parsedLimit = Math.min(parseInt(limit as string) || 50, 100);
    const parsedOffset = parseInt(offset as string) || 0;

    // Build filter object
    const filters: any = { organizationId };
    
    if (status) filters.status = status;
    if (agentId) filters.agentId = parseInt(agentId as string);
    
    if (startDate || endDate) {
      filters.dateRange = {};
      if (startDate) filters.dateRange.start = new Date(startDate as string);
      if (endDate) filters.dateRange.end = new Date(endDate as string);
    }

    // Get call data
    const callData = await WebhookService.getCallData({
      organizationId,
      filters,
      limit: parsedLimit,
      offset: parsedOffset
    });

    // Return JSON response
    res.json({
      success: true,
      data: {
        calls: callData.calls,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          total: callData.total,
          hasMore: callData.total > parsedOffset + parsedLimit
        },
        filters: {
          status: status || null,
          agentId: agentId ? parseInt(agentId as string) : null,
          startDate: startDate || null,
          endDate: endDate || null
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Webhook] Error in /calls endpoint:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while processing your request'
    });
  }
});

export { router as webhookRoutes };
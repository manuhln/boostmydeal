import { Request, Response } from 'express';
import { billingService } from '../services/BillingService';
import { invoiceEmailService } from '../services/InvoiceEmailService';
import { invoiceScheduler } from '../services/InvoiceScheduler';

export class BillingController {
  /**
   * Get billing information for organization
   * GET /api/billing
   */
  async getBillingInfo(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId;
      
      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      const billingInfo = await billingService.getBillingInfo(organizationId);
      
      res.status(200).json({
        success: true,
        data: billingInfo,
        message: 'Billing information retrieved successfully'
      });
    } catch (error: any) {
      console.error('❌ [BillingController] Error getting billing info:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve billing information'
      });
    }
  }

  /**
   * Create payment intent for adding credits
   * POST /api/billing/create-payment-intent
   */
  async createPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { amount } = req.body;
      
      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      if (!amount || amount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
        return;
      }

      const result = await billingService.createPaymentIntent(organizationId, amount);
      
      if (result.error) {
        res.status(500).json({
          success: false,
          message: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { clientSecret: result.clientSecret },
        message: 'Payment intent created successfully'
      });
    } catch (error: any) {
      console.error('❌ [BillingController] Error creating payment intent:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create payment intent'
      });
    }
  }

  /**
   * Get payment history for organization
   * GET /api/billing/history
   */
  async getPaymentHistory(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId;
      
      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      const history = await billingService.getPaymentHistory(organizationId);
      
      res.status(200).json({
        success: true,
        data: history,
        message: 'Payment history retrieved successfully'
      });
    } catch (error: any) {
      console.error('❌ [BillingController] Error getting payment history:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve payment history'
      });
    }
  }

  /**
   * Handle Stripe webhook for payment success
   * POST /api/billing/webhook
   */
  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { type, data } = req.body;

      if (type === 'payment_intent.succeeded') {
        const paymentIntentId = data.object.id;
        const result = await billingService.handlePaymentSuccess(paymentIntentId);
        
        if (result.success) {
          console.log(`✅ [BillingController] Payment processed: ${result.message}`);
        } else {
          console.error(`❌ [BillingController] Payment processing failed: ${result.message}`);
        }
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('❌ [BillingController] Webhook error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Webhook processing failed'
      });
    }
  }

  /**
   * Handle payment success callback from frontend
   * POST /api/billing/payment-success
   */
  async handlePaymentSuccess(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { amount } = req.body;
      
      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      if (!amount || amount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
        return;
      }

      // Add credits directly (payment has already been processed by Stripe)
      const result = await billingService.addCredits(organizationId, amount);
      
      res.status(200).json({
        success: true,
        data: { newBalance: result.newBalance },
        message: result.message || 'Payment processed successfully'
      });
    } catch (error: any) {
      console.error('❌ [BillingController] Error handling payment success:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process payment'
      });
    }
  }

  /**
   * Check if organization has sufficient credits
   * GET /api/billing/check-credits
   */
  async checkCredits(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId;
      const estimatedCost = parseFloat(req.query.cost as string) || 0.02;
      
      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      const result = await billingService.checkSufficientCredits(organizationId, estimatedCost);
      
      res.status(200).json({
        success: true,
        data: result,
        message: result.hasCredits ? 'Sufficient credits available' : 'Insufficient credits'
      });
    } catch (error: any) {
      console.error('❌ [BillingController] Error checking credits:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check credits'
      });
    }
  }

  /**
   * Send monthly invoice for a specific organization and month
   * POST /api/billing/send-invoice
   */
  async sendMonthlyInvoice(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { month, year } = req.body;
      
      if (!organizationId) {
        res.status(401).json({
          success: false,
          message: 'Organization context required'
        });
        return;
      }

      if (!month || !year || month < 1 || month > 12) {
        res.status(400).json({
          success: false,
          message: 'Valid month (1-12) and year are required'
        });
        return;
      }

      const result = await invoiceEmailService.sendMonthlyInvoice(organizationId, month, year);
      
      res.status(200).json({
        success: result.success,
        message: result.message
      });
    } catch (error: any) {
      console.error('❌ [BillingController] Error sending monthly invoice:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to send monthly invoice'
      });
    }
  }

  /**
   * Manually trigger monthly invoices for all organizations (admin only)
   * POST /api/billing/send-all-invoices
   */
  async sendAllMonthlyInvoices(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { month, year } = req.body;
      
      // Check if user has admin privileges (owner role)
      if (!user || user.role !== 'owner') {
        res.status(403).json({
          success: false,
          message: 'Admin privileges required'
        });
        return;
      }

      if (!month || !year || month < 1 || month > 12) {
        res.status(400).json({
          success: false,
          message: 'Valid month (1-12) and year are required'
        });
        return;
      }

      const result = await invoiceScheduler.sendInvoicesForMonth(month, year);
      
      res.status(200).json({
        success: true,
        data: result,
        message: `Monthly invoices processed: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`
      });
    } catch (error: any) {
      console.error('❌ [BillingController] Error sending all monthly invoices:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to send monthly invoices'
      });
    }
  }

  /**
   * Get invoice scheduler status
   * GET /api/billing/scheduler-status
   */
  async getSchedulerStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = invoiceScheduler.getStatus();
      
      res.status(200).json({
        success: true,
        data: status,
        message: 'Scheduler status retrieved successfully'
      });
    } catch (error: any) {
      console.error('❌ [BillingController] Error getting scheduler status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get scheduler status'
      });
    }
  }
}

export const billingController = new BillingController();
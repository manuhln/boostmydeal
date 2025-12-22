import { Router } from 'express';
import { billingController } from '../modules/billing/controllers/BillingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all billing routes
router.use(authMiddleware);

// Get billing information
router.get('/', billingController.getBillingInfo.bind(billingController));

// Create payment intent for adding credits
router.post('/create-payment-intent', billingController.createPaymentIntent.bind(billingController));

// Handle payment success callback from frontend
router.post('/payment-success', billingController.handlePaymentSuccess.bind(billingController));

// Get payment history
router.get('/history', billingController.getPaymentHistory.bind(billingController));

// Check if organization has sufficient credits
router.get('/check-credits', billingController.checkCredits.bind(billingController));

// Send monthly invoice for current organization
router.post('/send-invoice', billingController.sendMonthlyInvoice.bind(billingController));

// Send monthly invoices for all organizations (admin only)
router.post('/send-all-invoices', billingController.sendAllMonthlyInvoices.bind(billingController));

// Get invoice scheduler status
router.get('/scheduler-status', billingController.getSchedulerStatus.bind(billingController));

// Stripe webhook (no auth required)
router.post('/webhook', (req, res, next) => {
  // Skip auth for webhooks
  (req as any).skipAuth = true;
  next();
}, billingController.handleStripeWebhook.bind(billingController));

export default router;
import { Organization, IOrganization } from '../../organization/Organization';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

export class BillingService {
  /**
   * Get organization billing information
   */
  async getBillingInfo(organizationId: string): Promise<any> {
    try {
      const organization = await Organization.findById(organizationId);
      
      if (!organization) {
        throw new Error('Organization not found');
      }

      return {
        credits: organization.billing?.credits || {
          totalBalance: 5.00,
          freeCredits: 5.00,
          paidCredits: 0.00,
          usedCredits: 0.00,
          lastUpdated: new Date(),
        },
        lowCreditThreshold: organization.billing?.lowCreditThreshold || 1.00,
        paymentHistory: organization.billing?.paymentHistory || [],
        isLowBalance: (organization.billing?.credits?.totalBalance || 5.00) <= (organization.billing?.lowCreditThreshold || 1.00),
      };
    } catch (error) {
      console.error('❌ [BillingService] Error getting billing info:', error);
      throw error;
    }
  }

  /**
   * Check if organization has sufficient credits for a call
   */
  async checkSufficientCredits(organizationId: string, estimatedCost: number = 0.02): Promise<{ hasCredits: boolean; currentBalance: number; message?: string }> {
    try {
      const organization = await Organization.findById(organizationId);
      
      if (!organization) {
        return { hasCredits: false, currentBalance: 0, message: 'Organization not found' };
      }

      const currentBalance = organization.billing?.credits?.totalBalance || 0;
      
      if (currentBalance < estimatedCost) {
        return { 
          hasCredits: false, 
          currentBalance, 
          message: `Insufficient credits. Current balance: $${currentBalance.toFixed(4)}, Required: $${estimatedCost.toFixed(4)}` 
        };
      }

      return { hasCredits: true, currentBalance };
    } catch (error) {
      console.error('❌ [BillingService] Error checking credits:', error);
      return { hasCredits: false, currentBalance: 0, message: 'Error checking credits' };
    }
  }

  /**
   * Deduct credits after a call is completed
   */
  async deductCredits(organizationId: string, callCost: number): Promise<{ success: boolean; newBalance: number; message?: string }> {
    try {
      console.log(`💰 [BillingService] Deducting $${callCost} from organization ${organizationId}`);
      
      const organization = await Organization.findById(organizationId);
      
      if (!organization) {
        return { success: false, newBalance: 0, message: 'Organization not found' };
      }

      // Initialize billing structure if it doesn't exist
      if (!organization.billing) {
        organization.billing = {
          credits: {
            totalBalance: 5.00,
            freeCredits: 5.00,
            paidCredits: 0.00,
            usedCredits: 0.00,
            lastUpdated: new Date(),
          },
          lowCreditThreshold: 1.00,
          paymentHistory: [],
        };
      }

      if (!organization.billing.credits) {
        organization.billing.credits = {
          totalBalance: 5.00,
          freeCredits: 5.00,
          paidCredits: 0.00,
          usedCredits: 0.00,
          lastUpdated: new Date(),
        };
      }

      const currentBalance = organization.billing.credits.totalBalance;
      
      if (currentBalance < callCost) {
        return { 
          success: false, 
          newBalance: currentBalance, 
          message: 'Insufficient credits for this call cost' 
        };
      }

      // Update credits
      organization.billing.credits.totalBalance -= callCost;
      organization.billing.credits.usedCredits += callCost;
      organization.billing.credits.lastUpdated = new Date();

      await organization.save();

      console.log(`✅ [BillingService] Credits deducted successfully. New balance: $${organization.billing.credits.totalBalance.toFixed(4)}`);

      return { 
        success: true, 
        newBalance: organization.billing.credits.totalBalance,
        message: `Credits deducted successfully. New balance: $${organization.billing.credits.totalBalance.toFixed(4)}`
      };
    } catch (error) {
      console.error('❌ [BillingService] Error deducting credits:', error);
      return { success: false, newBalance: 0, message: 'Error deducting credits' };
    }
  }

  /**
   * Add credits from payment
   */
  async addCredits(organizationId: string, amount: number, paymentIntentId?: string): Promise<{ success: boolean; newBalance: number; message?: string }> {
    try {
      console.log(`💳 [BillingService] Adding $${amount} credits to organization ${organizationId}`);
      
      const organization = await Organization.findById(organizationId);
      
      if (!organization) {
        return { success: false, newBalance: 0, message: 'Organization not found' };
      }

      // Initialize billing structure if it doesn't exist
      if (!organization.billing) {
        organization.billing = {
          credits: {
            totalBalance: 5.00,
            freeCredits: 5.00,
            paidCredits: 0.00,
            usedCredits: 0.00,
            lastUpdated: new Date(),
          },
          lowCreditThreshold: 1.00,
          paymentHistory: [],
        };
      }

      if (!organization.billing.credits) {
        organization.billing.credits = {
          totalBalance: 5.00,
          freeCredits: 5.00,
          paidCredits: 0.00,
          usedCredits: 0.00,
          lastUpdated: new Date(),
        };
      }

      // Add credits
      organization.billing.credits.totalBalance += amount;
      organization.billing.credits.paidCredits += amount;
      organization.billing.credits.lastUpdated = new Date();

      // Add to payment history
      if (!organization.billing.paymentHistory) {
        organization.billing.paymentHistory = [];
      }

      organization.billing.paymentHistory.push({
        amount: amount,
        currency: 'USD',
        stripePaymentIntentId: paymentIntentId || undefined,
        status: 'completed',
        createdAt: new Date(),
      });

      await organization.save();

      console.log(`✅ [BillingService] Credits added successfully. New balance: $${organization.billing.credits.totalBalance.toFixed(4)}`);

      return { 
        success: true, 
        newBalance: organization.billing.credits.totalBalance,
        message: `$${amount} credits added successfully. New balance: $${organization.billing.credits.totalBalance.toFixed(4)}`
      };
    } catch (error) {
      console.error('❌ [BillingService] Error adding credits:', error);
      return { success: false, newBalance: 0, message: 'Error adding credits' };
    }
  }

  /**
   * Get or create Stripe customer for organization
   */
  async getOrCreateStripeCustomer(organization: any): Promise<string> {
    // If organization already has a Stripe customer, return it
    if (organization.billing?.stripeCustomerId) {
      try {
        // Verify the customer still exists in Stripe
        await stripe.customers.retrieve(organization.billing.stripeCustomerId);
        return organization.billing.stripeCustomerId;
      } catch (error) {
        console.log('⚠️ [BillingService] Stripe customer not found, creating new one');
        // Customer doesn't exist, create a new one
      }
    }

    // Create new Stripe customer for this organization
    const customer = await stripe.customers.create({
      email: organization.email,
      name: organization.name,
      metadata: {
        organizationId: organization._id.toString(),
        organizationSlug: organization.slug
      }
    });

    // Save the customer ID to the organization
    if (!organization.billing) {
      organization.billing = {};
    }
    organization.billing.stripeCustomerId = customer.id;
    await organization.save();

    console.log(`✅ [BillingService] Created Stripe customer ${customer.id} for organization ${organization.name}`);
    return customer.id;
  }

  /**
   * Create Stripe payment intent for adding credits
   */
  async createPaymentIntent(organizationId: string, amount: number): Promise<{ clientSecret?: string; error?: string }> {
    try {
      const organization = await Organization.findById(organizationId);
      
      if (!organization) {
        return { error: 'Organization not found' };
      }

      // Get or create organization-specific Stripe customer
      const customerId = await this.getOrCreateStripeCustomer(organization);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: customerId, // Associate with organization's customer
        payment_method_types: ['card'], // Only allow card payments
        setup_future_usage: 'on_session', // Allow saving payment method for this customer only
        metadata: {
          organizationId: organizationId,
          type: 'credit_topup'
        },
      });

      console.log(`💳 [BillingService] Created payment intent for organization ${organization.name} with customer ${customerId}`);
      return { clientSecret: paymentIntent.client_secret || undefined };
    } catch (error: any) {
      console.error('❌ [BillingService] Error creating payment intent:', error);
      return { error: error.message };
    }
  }

  /**
   * Get payment history for organization
   */
  async getPaymentHistory(organizationId: string): Promise<any[]> {
    try {
      const organization = await Organization.findById(organizationId);
      
      if (!organization) {
        return [];
      }

      return organization.billing?.paymentHistory || [];
    } catch (error) {
      console.error('❌ [BillingService] Error getting payment history:', error);
      return [];
    }
  }

  /**
   * Handle successful payment webhook from Stripe
   */
  async handlePaymentSuccess(paymentIntentId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded' && paymentIntent.metadata?.organizationId) {
        const organizationId = paymentIntent.metadata.organizationId;
        const amount = paymentIntent.amount / 100; // Convert from cents
        
        const result = await this.addCredits(organizationId, amount, paymentIntentId);
        
        return { 
          success: result.success, 
          message: result.message 
        };
      }

      return { success: false, message: 'Payment not successful or missing organization metadata' };
    } catch (error) {
      console.error('❌ [BillingService] Error handling payment success:', error);
      return { success: false, message: 'Error processing payment' };
    }
  }
}

export const billingService = new BillingService();
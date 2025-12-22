import { sendEmail } from '../../../utils/emailService';
import { Organization } from '../../organization/Organization';
import { User } from '../../user/User';

export interface InvoiceData {
  invoiceNumber: string;
  organizationName: string;
  organizationEmail: string;
  userFirstName: string;
  userLastName: string;
  invoiceMonth: string;
  invoiceYear: number;
  billingPeriod: string;
  totalAmount: number;
  paymentHistory: Array<{
    amount: number;
    date: Date;
    description?: string;
    status: string;
  }>;
  creditsUsed: number;
  remainingBalance: number;
}

export class InvoiceEmailService {
  /**
   * Generate invoice data for a specific month for an organization
   */
  async generateInvoiceData(organizationId: string, month: number, year: number): Promise<InvoiceData | null> {
    try {
      const organization = await Organization.findById(organizationId);
      
      if (!organization) {
        console.error(`❌ [InvoiceEmailService] Organization ${organizationId} not found`);
        return null;
      }

      // Get the organization owner/primary user
      const user = await User.findOne({ 
        organizationId: organizationId, 
        role: 'owner' 
      });

      if (!user) {
        console.error(`❌ [InvoiceEmailService] No owner found for organization ${organizationId}`);
        return null;
      }

      // Filter payment history for the specific month
      const startDate = new Date(year, month - 1, 1); // month is 0-indexed
      const endDate = new Date(year, month, 0); // Last day of the month
      
      const monthlyPayments = organization.billing?.paymentHistory?.filter(payment => {
        const paymentDate = new Date(payment.createdAt);
        return paymentDate >= startDate && paymentDate <= endDate;
      }) || [];

      // Calculate totals
      const totalAmount = monthlyPayments.reduce((sum, payment) => {
        return payment.status === 'completed' ? sum + payment.amount : sum;
      }, 0);

      // Get month name
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const invoiceData: InvoiceData = {
        invoiceNumber: `INV-${organization.slug}-${year}${month.toString().padStart(2, '0')}`,
        organizationName: organization.name,
        organizationEmail: organization.email,
        userFirstName: user.firstName,
        userLastName: user.lastName,
        invoiceMonth: monthNames[month - 1],
        invoiceYear: year,
        billingPeriod: `${monthNames[month - 1]} ${year}`,
        totalAmount: totalAmount,
        paymentHistory: monthlyPayments.map(payment => ({
          amount: payment.amount,
          date: payment.createdAt,
          description: 'Credit Top-up', // Default description since Organization schema doesn't have this field
          status: payment.status
        })),
        creditsUsed: organization.billing?.credits?.usedCredits || 0,
        remainingBalance: organization.billing?.credits?.totalBalance || 0
      };

      return invoiceData;
    } catch (error) {
      console.error('❌ [InvoiceEmailService] Error generating invoice data:', error);
      return null;
    }
  }

  /**
   * Generate HTML invoice email template
   */
  generateInvoiceEmailHTML(invoiceData: InvoiceData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Monthly Invoice - BoostMyLead</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #F74000; margin-bottom: 30px; }
          .content { padding: 20px 0; }
          .invoice-header { background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-left: 4px solid #F74000; border-radius: 4px; }
          .invoice-details { display: flex; justify-content: space-between; margin: 20px 0; }
          .invoice-details > div { flex: 1; }
          .payment-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .payment-table th, .payment-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .payment-table th { background-color: #F74000; color: white; font-weight: bold; }
          .payment-table tr:nth-child(even) { background-color: #f9f9f9; }
          .summary-box { background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 4px; border: 1px solid #ddd; }
          .total-amount { font-size: 24px; font-weight: bold; color: #F74000; text-align: center; margin: 20px 0; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .no-payments { text-align: center; color: #666; font-style: italic; padding: 20px; }
          .status-completed { color: #28a745; font-weight: bold; }
          .status-pending { color: #ffc107; font-weight: bold; }
          .status-failed { color: #dc3545; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="color: #F74000; margin: 0;">BoostMyLead</h1>
        </div>
        
        <div class="content">
          <h2 style="color: #F74000; margin-bottom: 20px;">Monthly Invoice - ${invoiceData.billingPeriod}</h2>
          
          <div class="invoice-header">
            <h3 style="margin-top: 0; color: #F74000;">Invoice Details</h3>
            <div class="invoice-details">
              <div>
                <strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}<br>
                <strong>Billing Period:</strong> ${invoiceData.billingPeriod}<br>
                <strong>Invoice Date:</strong> ${new Date().toLocaleDateString()}
              </div>
              <div>
                <strong>Organization:</strong> ${invoiceData.organizationName}<br>
                <strong>Contact:</strong> ${invoiceData.userFirstName} ${invoiceData.userLastName}<br>
                <strong>Email:</strong> ${invoiceData.organizationEmail}
              </div>
            </div>
          </div>

          <p>Hello ${invoiceData.userFirstName},</p>
          <p>Here's your monthly invoice for <strong>${invoiceData.organizationName}</strong> covering the billing period of <strong>${invoiceData.billingPeriod}</strong>.</p>

          ${invoiceData.paymentHistory.length > 0 ? `
          <h3 style="color: #F74000;">Payment Summary</h3>
          <table class="payment-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.paymentHistory.map(payment => `
                <tr>
                  <td>${new Date(payment.date).toLocaleDateString()}</td>
                  <td>${payment.description}</td>
                  <td>$${payment.amount.toFixed(2)}</td>
                  <td class="status-${payment.status}">${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : `
          <div class="no-payments">
            <p>No payments were made during ${invoiceData.billingPeriod}.</p>
          </div>
          `}

          <div class="summary-box">
            <h3 style="color: #F74000; margin-top: 0;">Billing Summary</h3>
            <div style="display: flex; justify-content: space-between; margin: 10px 0;">
              <span><strong>Total Payments:</strong></span>
              <span>$${invoiceData.totalAmount.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0;">
              <span><strong>Credits Used This Period:</strong></span>
              <span>$${invoiceData.creditsUsed.toFixed(4)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; border-top: 1px solid #ddd; padding-top: 10px;">
              <span><strong>Current Account Balance:</strong></span>
              <span style="color: #F74000; font-weight: bold;">$${invoiceData.remainingBalance.toFixed(4)}</span>
            </div>
          </div>

          <div class="total-amount">
            Total Amount: $${invoiceData.totalAmount.toFixed(2)}
          </div>

          <p><strong>Account Status:</strong> Your BoostMyLead account is ${invoiceData.remainingBalance > 1 ? 'active' : 'low on credits'}. 
          ${invoiceData.remainingBalance <= 1 ? 'Please consider adding credits to continue using our services.' : ''}</p>

          <p>Thank you for using BoostMyLead! If you have any questions about this invoice, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>The BoostMyLead Team</p>
        </div>
        
        <div class="footer">
          <p><strong>BoostMyLead</strong> - AI Communication Platform</p>
          <p>Streamline your business communication through intelligent automation</p>
          <p>© ${new Date().getFullYear()} BoostMyLead. All rights reserved.</p>
          <p>This is an automated invoice. For billing inquiries, contact our support team.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send monthly invoice email to organization
   */
  async sendMonthlyInvoice(organizationId: string, month: number, year: number): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`📧 [InvoiceEmailService] Generating invoice for organization ${organizationId} for ${month}/${year}`);
      
      const invoiceData = await this.generateInvoiceData(organizationId, month, year);
      
      if (!invoiceData) {
        return { success: false, message: 'Failed to generate invoice data' };
      }

      // Only send invoice if there were payments or if there's activity
      if (invoiceData.totalAmount === 0 && invoiceData.creditsUsed === 0) {
        console.log(`📧 [InvoiceEmailService] Skipping invoice for ${invoiceData.organizationName} - no activity in ${invoiceData.billingPeriod}`);
        return { success: true, message: 'No activity to invoice' };
      }

      const htmlContent = this.generateInvoiceEmailHTML(invoiceData);

      await sendEmail({
        to: invoiceData.organizationEmail,
        subject: `Monthly Invoice - ${invoiceData.billingPeriod} | BoostMyLead`,
        html: htmlContent
      });

      console.log(`✅ [InvoiceEmailService] Monthly invoice sent successfully to ${invoiceData.organizationEmail}`);
      return { 
        success: true, 
        message: `Monthly invoice sent to ${invoiceData.organizationName}` 
      };
    } catch (error: any) {
      console.error('❌ [InvoiceEmailService] Error sending monthly invoice:', error);
      return { 
        success: false, 
        message: `Failed to send invoice: ${error?.message || 'Unknown error'}` 
      };
    }
  }

  /**
   * Send invoices to all organizations for a specific month
   */
  async sendAllMonthlyInvoices(month: number, year: number): Promise<{ sent: number; failed: number; skipped: number }> {
    try {
      console.log(`📧 [InvoiceEmailService] Starting monthly invoice process for ${month}/${year}`);
      
      // Get all organizations
      const organizations = await Organization.find({ isActive: true });
      
      let sent = 0;
      let failed = 0;
      let skipped = 0;

      for (const organization of organizations) {
        try {
          const result = await this.sendMonthlyInvoice(organization._id.toString(), month, year);
          
          if (result.success) {
            if (result.message.includes('no activity')) {
              skipped++;
            } else {
              sent++;
            }
          } else {
            failed++;
            console.error(`❌ [InvoiceEmailService] Failed to send invoice to ${organization.name}: ${result.message}`);
          }
        } catch (error) {
          failed++;
          console.error(`❌ [InvoiceEmailService] Error processing invoice for ${organization.name}:`, error);
        }
      }

      console.log(`✅ [InvoiceEmailService] Monthly invoice process completed: ${sent} sent, ${failed} failed, ${skipped} skipped`);
      return { sent, failed, skipped };
    } catch (error) {
      console.error('❌ [InvoiceEmailService] Error in monthly invoice process:', error);
      throw error;
    }
  }
}

export const invoiceEmailService = new InvoiceEmailService();
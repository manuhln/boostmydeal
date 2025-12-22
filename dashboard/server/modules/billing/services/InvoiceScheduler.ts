import * as cron from 'node-cron';
import { invoiceEmailService } from './InvoiceEmailService';

export class InvoiceScheduler {
  private static instance: InvoiceScheduler;
  private scheduledTask: any | null = null;

  private constructor() {}

  static getInstance(): InvoiceScheduler {
    if (!InvoiceScheduler.instance) {
      InvoiceScheduler.instance = new InvoiceScheduler();
    }
    return InvoiceScheduler.instance;
  }

  /**
   * Start the monthly invoice scheduler
   * Runs on the 1st of every month at 9:00 AM
   */
  startScheduler(): void {
    if (this.scheduledTask) {
      console.log('📅 [InvoiceScheduler] Scheduler already running');
      return;
    }

    try {
      // Cron pattern: "0 9 1 * *" = At 9:00 AM on the 1st of every month
      this.scheduledTask = cron.schedule('0 9 1 * *', async () => {
        console.log('📅 [InvoiceScheduler] Monthly invoice scheduler triggered');
        await this.sendMonthlyInvoices();
      }, {
        timezone: "UTC" // Use UTC to ensure consistency across different server timezones
      });

      console.log('✅ [InvoiceScheduler] Monthly invoice scheduler started - will run on 1st of every month at 9:00 AM UTC');
    } catch (error) {
      console.error('❌ [InvoiceScheduler] Error starting scheduler:', error);
    }
  }

  /**
   * Stop the monthly invoice scheduler
   */
  stopScheduler(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      console.log('🛑 [InvoiceScheduler] Monthly invoice scheduler stopped');
    }
  }

  /**
   * Send monthly invoices for the previous month
   */
  private async sendMonthlyInvoices(): Promise<void> {
    try {
      const now = new Date();
      
      // Get previous month and year
      let previousMonth = now.getMonth(); // 0-indexed (0 = January)
      let previousYear = now.getFullYear();
      
      if (previousMonth === 0) {
        // If current month is January, previous month is December of previous year
        previousMonth = 12;
        previousYear = previousYear - 1;
      }

      console.log(`📧 [InvoiceScheduler] Sending invoices for ${previousMonth}/${previousYear}`);
      
      const result = await invoiceEmailService.sendAllMonthlyInvoices(previousMonth, previousYear);
      
      console.log(`✅ [InvoiceScheduler] Monthly invoice process completed:`, result);
    } catch (error) {
      console.error('❌ [InvoiceScheduler] Error in monthly invoice process:', error);
    }
  }

  /**
   * Manually trigger invoice sending for a specific month (for testing/manual runs)
   */
  async sendInvoicesForMonth(month: number, year: number): Promise<{ sent: number; failed: number; skipped: number }> {
    try {
      console.log(`📧 [InvoiceScheduler] Manually sending invoices for ${month}/${year}`);
      const result = await invoiceEmailService.sendAllMonthlyInvoices(month, year);
      console.log(`✅ [InvoiceScheduler] Manual invoice process completed:`, result);
      return result;
    } catch (error) {
      console.error('❌ [InvoiceScheduler] Error in manual invoice process:', error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { running: boolean; nextRun?: string } {
    if (!this.scheduledTask) {
      return { running: false };
    }

    return {
      running: true,
      nextRun: '1st of next month at 9:00 AM UTC'
    };
  }
}

export const invoiceScheduler = InvoiceScheduler.getInstance();
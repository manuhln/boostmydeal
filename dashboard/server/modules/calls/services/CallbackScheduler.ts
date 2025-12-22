import * as cron from 'node-cron';
import mongoose from 'mongoose';
import { Callback } from '../../../models/Callback';
import { CallService } from './CallService';
import { BillingService } from '../../billing/services/BillingService';

export class CallbackScheduler {
  private static instance: CallbackScheduler;
  private scheduledTask: any | null = null;
  private callService: CallService;
  private billingService: BillingService;

  private constructor() {
    this.callService = new CallService();
    this.billingService = new BillingService();
  }

  static getInstance(): CallbackScheduler {
    if (!CallbackScheduler.instance) {
      CallbackScheduler.instance = new CallbackScheduler();
    }
    return CallbackScheduler.instance;
  }

  /**
   * Start the callback scheduler
   * Runs every minute to check for scheduled callbacks
   */
  startScheduler(): void {
    if (this.scheduledTask) {
      console.log('📅 [CallbackScheduler] Scheduler already running');
      return;
    }

    try {
      // Cron pattern: "* * * * *" = Every minute
      this.scheduledTask = cron.schedule('* * * * *', async () => {
        await this.processScheduledCallbacks();
      }, {
        timezone: "UTC" // Use UTC to ensure consistency
      });

      console.log('✅ [CallbackScheduler] Callback scheduler started - will run every minute');
    } catch (error) {
      console.error('❌ [CallbackScheduler] Error starting scheduler:', error);
    }
  }

  /**
   * Stop the callback scheduler
   */
  stopScheduler(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      console.log('🛑 [CallbackScheduler] Callback scheduler stopped');
    }
  }

  /**
   * Process scheduled callbacks for the current minute
   */
  private async processScheduledCallbacks(): Promise<void> {
    const now = new Date();
    
    // Check if MongoDB is connected before proceeding
    if (mongoose.connection.readyState !== 1) {
      console.log(`⏸️ [CallbackScheduler] MongoDB not ready (state: ${mongoose.connection.readyState}), skipping this minute`);
      return;
    }
    
    try {
      // Create time window for matching (current minute)
      const startOfMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0);
      const endOfMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 59, 999);
      
      console.log(`⏰ [CallbackScheduler] Checking for callbacks at ${now.toISOString()}`);
      console.log(`🔍 [CallbackScheduler] Time window: ${startOfMinute.toISOString()} to ${endOfMinute.toISOString()}`);
      
      // Find all callbacks scheduled for this minute
      const scheduledCallbacks = await Callback.find({
        callbacks_time: {
          $gte: startOfMinute,
          $lte: endOfMinute
        }
      });
      
      if (scheduledCallbacks.length === 0) {
        console.log(`📋 [CallbackScheduler] No callbacks scheduled for this minute`);
        return;
      }
      
      console.log(`📋 [CallbackScheduler] Found ${scheduledCallbacks.length} callbacks scheduled for this minute`);
      
      // Process each callback with individual error isolation
      let successCount = 0;
      let failureCount = 0;
      
      for (const callback of scheduledCallbacks) {
        // Wrap each callback processing in its own try-catch to prevent one failure from blocking others
        try {
          console.log(`📞 [CallbackScheduler] Processing callback ${callback._id} for contact ${callback.contactPhone}`);
          
          // Validate callback has required fields
          if (!callback.organizationId || !callback.assistantId || !callback.contactPhone) {
            console.error(`❌ [CallbackScheduler] Callback ${callback._id} missing required fields. Skipping.`);
            failureCount++;
            continue;
          }
          
          // Check if organization has sufficient credits (minimum $0.10 required)
          const creditCheck = await this.billingService.checkSufficientCredits(callback.organizationId, 0.10);
          if (!creditCheck.hasCredits) {
            console.error(`❌ [CallbackScheduler] Callback ${callback._id} skipped - insufficient credits: ${creditCheck.message}`);
            failureCount++;
            continue;
          }
          
          // Call demoCreateCallWithAgent (same as controller does)
          const result = await this.callService.demoCreateCallWithAgent(
            callback.organizationId,
            {
              assistantId: callback.assistantId,
              toNumber: callback.contactPhone,
              contactName: callback.contactName || callback.contactPhone
            }
          );
          
          // Only delete callback if call was successfully initiated (confirmed by presence of callId)
          if (result && result.callId) {
            console.log(`✅ [CallbackScheduler] Successfully initiated callback call ${callback._id}, new call ID: ${result.callId}`);
            
            // Delete the callback record only after confirmed success
            const deletedCallback = await Callback.findByIdAndDelete(callback._id);
            
            if (deletedCallback) {
              console.log(`🗑️ [CallbackScheduler] Deleted callback record ${callback._id}`);
            } else {
              console.warn(`⚠️ [CallbackScheduler] Callback ${callback._id} was already deleted`);
            }
            
            successCount++;
          } else {
            console.error(`❌ [CallbackScheduler] Failed to initiate callback ${callback._id} - no callId returned`);
            failureCount++;
            // Keep callback in database for potential retry in next minute
          }
          
        } catch (callbackError) {
          // Isolate error - log it but continue processing other callbacks
          console.error(`❌ [CallbackScheduler] Error processing callback ${callback._id}:`, callbackError);
          console.error(`❌ [CallbackScheduler] Error details:`, {
            message: callbackError instanceof Error ? callbackError.message : 'Unknown error',
            stack: callbackError instanceof Error ? callbackError.stack : undefined
          });
          failureCount++;
          // Keep callback in database for potential retry
        }
      }
      
      // Log summary with structured metrics
      const summary = {
        timestamp: now.toISOString(),
        totalFound: scheduledCallbacks.length,
        successful: successCount,
        failed: failureCount
      };
      
      console.log(`📊 [CallbackScheduler] Batch complete:`, summary);
      
      if (failureCount > 0) {
        console.warn(`⚠️ [CallbackScheduler] ${failureCount} callbacks failed - they remain in database for retry`);
      }
      
    } catch (error) {
      // Catch any top-level errors (e.g., database connection issues)
      console.error('❌ [CallbackScheduler] Critical error in callback processing:', error);
      console.error('❌ [CallbackScheduler] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Don't throw - let the cron job continue running
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
      nextRun: 'Every minute'
    };
  }
}

export const callbackScheduler = CallbackScheduler.getInstance();

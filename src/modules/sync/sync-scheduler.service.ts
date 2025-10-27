import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncLogsService } from './sync-logs.service';
import { PaymentProvidersService } from '../payment-providers/payment-providers.service';
import { SyncType, SyncStatus } from './dto';

@Injectable()
export class SyncScheduler {
  private readonly logger = new Logger(SyncScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncLogsService: SyncLogsService,
    private readonly providersService: PaymentProvidersService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async syncAllPlatforms(): Promise<void> {
    this.logger.log('Starting scheduled sync for all platforms');

    try {
      const platforms = await this.prisma.platform.findMany({
        where: { isEnabled: true },
      });

      this.logger.log(`Found ${platforms.length} enabled platforms`);

      for (const platform of platforms) {
        try {
          await this.syncPlatform(platform.id, platform.slug);
        } catch (error) {
          this.logger.error(`Failed to sync platform ${platform.slug}:`, error);
        }
      }

      this.logger.log('Completed scheduled sync for all platforms');
    } catch (error) {
      this.logger.error('Error in scheduled sync:', error);
    }
  }

  async syncPlatform(platformId: string, platformSlug: string): Promise<void> {
    this.logger.log(`Starting sync for platform: ${platformSlug}`);

    // Skip sync for Cartpanda and Hotmart - they only use webhooks
    if (platformSlug === 'cartpanda' || platformSlug === 'hotmart') {
      this.logger.log(`Skipping sync for ${platformSlug} - webhook-only platform`);
      return;
    }

    // Sync subscriptions
    await this.syncSubscriptions(platformId, platformSlug);

    // Sync transactions
    await this.syncTransactions(platformId, platformSlug);

    // Sync customers
    await this.syncCustomers(platformId, platformSlug);

    this.logger.log(`Completed sync for platform: ${platformSlug}`);
  }

  private async syncSubscriptions(platformId: string, platformSlug: string): Promise<void> {
    const syncLog = await this.syncLogsService.create({
      platformId,
      syncType: SyncType.SUBSCRIPTIONS,
      status: SyncStatus.RUNNING,
      startedAt: new Date(),
    });

    try {
      this.logger.log(`Syncing subscriptions for ${platformSlug}`);

      // Get provider
      const provider = await this.providersService.getProvider(platformSlug);
      
      // Get last 24 hours of data
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

      // Fetch subscriptions from platform
      const externalSubscriptions = await provider.fetchSubscriptions({
        startDate,
        endDate,
        limit: 1000,
      });

      let synced = 0;
      let failed = 0;
      let missing = 0;

      for (const externalSub of externalSubscriptions) {
        try {
          // Check if subscription already exists
          const existing = await this.prisma.subscription.findFirst({
            where: {
              platformId,
              externalSubscriptionId: externalSub.externalSubscriptionId,
            },
          });

          if (!existing) {
            // Missing subscription - create webhook event for processing
            missing++;
            await this.createMissingWebhookEvent(platformId, 'subscription.created', externalSub);
          } else {
            // Check if data needs updating
            const needsUpdate = this.compareSubscriptionData(existing, externalSub);
            if (needsUpdate) {
              await this.updateSubscription(existing.id, externalSub);
              synced++;
            }
          }
        } catch (error) {
          failed++;
          this.logger.error(`Failed to sync subscription ${externalSub.externalSubscriptionId}:`, error);
        }
      }

      // Update sync log
      await this.syncLogsService.complete(syncLog.id, {
        status: SyncStatus.COMPLETED,
        completedAt: new Date(),
        recordsSynced: synced,
        recordsFailed: failed,
        missingRecordsFound: missing,
      });

      this.logger.log(`Subscriptions sync completed for ${platformSlug}: ${synced} synced, ${failed} failed, ${missing} missing`);

      // Alert if many missing records
      if (missing > 10) {
        this.logger.warn(`High number of missing subscriptions found for ${platformSlug}: ${missing}`);
        // TODO: Send alert notification
      }
    } catch (error) {
      await this.syncLogsService.fail(syncLog.id, error);
      this.logger.error(`Subscriptions sync failed for ${platformSlug}:`, error);
    }
  }

  private async syncTransactions(platformId: string, platformSlug: string): Promise<void> {
    const syncLog = await this.syncLogsService.create({
      platformId,
      syncType: SyncType.TRANSACTIONS,
      status: SyncStatus.RUNNING,
      startedAt: new Date(),
    });

    try {
      this.logger.log(`Syncing transactions for ${platformSlug}`);

      // Get provider
      const provider = await this.providersService.getProvider(platformSlug);
      
      // Get last 24 hours of data
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

      // Fetch transactions from platform
      const externalTransactions = await provider.fetchTransactions({
        startDate,
        endDate,
        limit: 1000,
      });

      let synced = 0;
      let failed = 0;
      let missing = 0;

      for (const externalTx of externalTransactions) {
        try {
          // Check if transaction already exists
          const existing = await this.prisma.transaction.findFirst({
            where: {
              platformId,
              externalTransactionId: externalTx.externalTransactionId,
            },
          });

          if (!existing) {
            // Missing transaction - create webhook event for processing
            missing++;
            await this.createMissingWebhookEvent(platformId, 'transaction.created', externalTx);
          } else {
            // Check if data needs updating
            const needsUpdate = this.compareTransactionData(existing, externalTx);
            if (needsUpdate) {
              await this.updateTransaction(existing.id, externalTx);
              synced++;
            }
          }
        } catch (error) {
          failed++;
          this.logger.error(`Failed to sync transaction ${externalTx.externalTransactionId}:`, error);
        }
      }

      // Update sync log
      await this.syncLogsService.complete(syncLog.id, {
        status: SyncStatus.COMPLETED,
        completedAt: new Date(),
        recordsSynced: synced,
        recordsFailed: failed,
        missingRecordsFound: missing,
      });

      this.logger.log(`Transactions sync completed for ${platformSlug}: ${synced} synced, ${failed} failed, ${missing} missing`);
    } catch (error) {
      await this.syncLogsService.fail(syncLog.id, error);
      this.logger.error(`Transactions sync failed for ${platformSlug}:`, error);
    }
  }

  private async syncCustomers(platformId: string, platformSlug: string): Promise<void> {
    const syncLog = await this.syncLogsService.create({
      platformId,
      syncType: SyncType.CUSTOMERS,
      status: SyncStatus.RUNNING,
      startedAt: new Date(),
    });

    try {
      this.logger.log(`Syncing customers for ${platformSlug}`);

      // Get provider
      const provider = await this.providersService.getProvider(platformSlug);
      
      // Get last 24 hours of data
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

      // Fetch customers from platform
      const externalCustomers = await provider.fetchCustomers({
        startDate,
        endDate,
        limit: 1000,
      });

      let synced = 0;
      let failed = 0;
      let missing = 0;

      for (const externalCustomer of externalCustomers) {
        try {
          // Check if customer already exists
          const existing = await this.prisma.customer.findFirst({
            where: {
              platformId,
              externalCustomerId: externalCustomer.externalCustomerId,
            },
          });

          if (!existing) {
            // Missing customer - create webhook event for processing
            missing++;
            await this.createMissingWebhookEvent(platformId, 'customer.created', externalCustomer);
          } else {
            // Check if data needs updating
            const needsUpdate = this.compareCustomerData(existing, externalCustomer);
            if (needsUpdate) {
              await this.updateCustomer(existing.id, externalCustomer);
              synced++;
            }
          }
        } catch (error) {
          failed++;
          this.logger.error(`Failed to sync customer ${externalCustomer.externalCustomerId}:`, error);
        }
      }

      // Update sync log
      await this.syncLogsService.complete(syncLog.id, {
        status: SyncStatus.COMPLETED,
        completedAt: new Date(),
        recordsSynced: synced,
        recordsFailed: failed,
        missingRecordsFound: missing,
      });

      this.logger.log(`Customers sync completed for ${platformSlug}: ${synced} synced, ${failed} failed, ${missing} missing`);
    } catch (error) {
      await this.syncLogsService.fail(syncLog.id, error);
      this.logger.error(`Customers sync failed for ${platformSlug}:`, error);
    }
  }

  private async createMissingWebhookEvent(platformId: string, eventType: string, data: any): Promise<void> {
    await this.prisma.webhookEvent.create({
      data: {
        platformId,
        eventType,
        externalEventId: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        payload: data,
        signature: 'N/A (from sync)',
        status: 'pending',
        receivedAt: new Date(),
      },
    });
  }

  private compareSubscriptionData(existing: any, external: any): boolean {
    // Compare key fields to determine if update is needed
    return (
      existing.status !== external.status ||
      existing.isTrial !== external.isTrial ||
      existing.recurringAmount !== external.recurringAmount ||
      existing.currentPeriodEnd?.getTime() !== external.currentPeriodEnd?.getTime()
    );
  }

  private compareTransactionData(existing: any, external: any): boolean {
    return (
      existing.status !== external.status ||
      existing.netAmount !== external.netAmount ||
      existing.transactionDate?.getTime() !== external.transactionDate?.getTime()
    );
  }

  private compareCustomerData(existing: any, external: any): boolean {
    return (
      existing.email !== external.email ||
      existing.name !== external.name ||
      existing.totalSpentBrl !== external.totalSpentBrl
    );
  }

  private async updateSubscription(id: string, data: any): Promise<void> {
    await this.prisma.subscription.update({
      where: { id },
      data: {
        status: data.status,
        isTrial: data.isTrial,
        recurringAmount: data.recurringAmount,
        currentPeriodEnd: data.currentPeriodEnd,
        updatedAt: new Date(),
      },
    });
  }

  private async updateTransaction(id: string, data: any): Promise<void> {
    await this.prisma.transaction.update({
      where: { id },
      data: {
        status: data.status,
        netAmount: data.netAmount,
        transactionDate: data.transactionDate,
      },
    });
  }

  private async updateCustomer(id: string, data: any): Promise<void> {
    await this.prisma.customer.update({
      where: { id },
      data: {
        email: data.email,
        name: data.name,
        totalSpentBrl: data.totalSpentBrl,
        updatedAt: new Date(),
      },
    });
  }
}

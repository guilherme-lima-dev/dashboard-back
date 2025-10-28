import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculateDailyMetrics(date: Date, platformId?: string | null, productId?: string | null): Promise<void> {
    this.logger.log(`Calculating daily metrics for ${date.toISOString().split('T')[0]}`);

    const queryWhereClause = this.buildWhereClause(date, platformId, productId);

    const [
      revenueMetrics,
      subscriptionMetrics,
      customerMetrics,
      churnMetrics,
    ] = await Promise.all([
      this.calculateRevenueMetrics(queryWhereClause),
      this.calculateSubscriptionMetrics(queryWhereClause),
      this.calculateCustomerMetrics(queryWhereClause),
      this.calculateChurnMetrics(queryWhereClause),
    ]);

    const metrics = {
      metricDate: date,
      platformId,
      productId,
      ...revenueMetrics,
      ...subscriptionMetrics,
      ...customerMetrics,
      ...churnMetrics,
    };

    const existing = await this.prisma.dailyMetrics.findFirst({
      where: {
        metricDate: date,
        platformId: platformId ?? null,
        productId: productId ?? null,
      },
    });

    if (existing) {
      await this.prisma.dailyMetrics.update({
        where: { id: existing.id },
        data: metrics,
      });
    } else {
      await this.prisma.dailyMetrics.create({
        data: metrics,
      });
    }

    this.logger.log(`Daily metrics calculated and saved for ${date.toISOString().split('T')[0]}`);
  }

  async calculateCohortAnalysis(cohortDate: Date, platformId?: string | null, productId?: string | null): Promise<void> {
    this.logger.log(`Calculating cohort analysis for ${cohortDate.toISOString().split('T')[0]}`);

    const whereClause = this.buildWhereClause(cohortDate, platformId, productId);

    for (let period = 0; period <= 12; period++) {
      const cohortData = await this.calculateCohortPeriod(cohortDate, period, whereClause);

      const cohortWhereClause: any = {
        cohortDate,
        period,
      };
      
      if (platformId) {
        cohortWhereClause.platformId = platformId;
      } else {
        cohortWhereClause.platformId = null;
      }
      
      if (productId) {
        cohortWhereClause.productId = productId;
      } else {
        cohortWhereClause.productId = null;
      }

      await this.prisma.cohortAnalysis.upsert({
        where: {
          cohortDate_platformId_productId_period: cohortWhereClause,
        },
        update: cohortData,
        create: {
          cohortDate,
          platformId,
          productId,
          period,
          ...cohortData,
        },
      });
    }

    this.logger.log(`Cohort analysis calculated for ${cohortDate.toISOString().split('T')[0]}`);
  }

  async calculateAffiliateMetrics(date: Date, platformId?: string | null): Promise<void> {
    this.logger.log(`Calculating affiliate metrics for ${date.toISOString().split('T')[0]}`);

    const whereClause = this.buildWhereClause(date, platformId);

    const affiliates = await this.prisma.subscription.findMany({
      where: {
        ...whereClause,
        affiliateId: { not: null },
      },
      select: {
        affiliateId: true,
      },
      distinct: ['affiliateId'],
    });

    for (const affiliate of affiliates) {
      if (!affiliate.affiliateId) continue;

      const affiliateData = await this.calculateAffiliateData(affiliate.affiliateId, whereClause);

      const affiliateWhereClause: any = {
        affiliateId: affiliate.affiliateId,
        metricDate: date,
      };
      
      if (platformId) {
        affiliateWhereClause.platformId = platformId;
      } else {
        affiliateWhereClause.platformId = null;
      }

      await this.prisma.affiliateMetrics.upsert({
        where: {
          affiliateId_metricDate_platformId: affiliateWhereClause,
        },
        update: affiliateData,
        create: {
          affiliateId: affiliate.affiliateId,
          metricDate: date,
          platformId,
          ...affiliateData,
        },
      });
    }

    this.logger.log(`Affiliate metrics calculated for ${date.toISOString().split('T')[0]}`);
  }

  private async calculateRevenueMetrics(whereClause: any) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        ...whereClause,
        status: 'active',
        isTrial: false,
      },
      select: {
        recurringAmountBrl: true,
        recurringAmountUsd: true,
      },
    });

    const transactionWhereClause = {
      platformId: whereClause.platformId,
      status: 'succeeded',
    };

    const transactions = await this.prisma.transaction.findMany({
      where: transactionWhereClause,
      select: {
        netAmountBrl: true,
        netAmountUsd: true,
        transactionType: true,
      },
    });

    const mrrBrl = subscriptions.reduce((sum, sub) => sum.add(sub.recurringAmountBrl), new Decimal(0));
    const mrrUsd = subscriptions.reduce((sum, sub) => sum.add(sub.recurringAmountUsd), new Decimal(0));
    const arrBrl = mrrBrl.mul(12);
    const arrUsd = mrrUsd.mul(12);

    const revenueBrl = transactions
      .filter(t => t.transactionType === 'payment')
      .reduce((sum, t) => sum.add(t.netAmountBrl), new Decimal(0));

    const revenueUsd = transactions
      .filter(t => t.transactionType === 'payment')
      .reduce((sum, t) => sum.add(t.netAmountUsd), new Decimal(0));

    const refundsBrl = transactions
      .filter(t => t.transactionType === 'refund')
      .reduce((sum, t) => sum.add(t.netAmountBrl), new Decimal(0));

    const refundsUsd = transactions
      .filter(t => t.transactionType === 'refund')
      .reduce((sum, t) => sum.add(t.netAmountUsd), new Decimal(0));

    return {
      mrrBrl,
      mrrUsd,
      arrBrl,
      arrUsd,
      revenueBrl,
      revenueUsd,
      refundsBrl,
      refundsUsd,
    };
  }

  private async calculateSubscriptionMetrics(whereClause: any) {
    const [
      activeSubscriptions,
      trialSubscriptions,
      canceledSubscriptions,
      newSubscriptions,
    ] = await Promise.all([
      this.prisma.subscription.count({
        where: { ...whereClause, status: 'active', isTrial: false },
      }),
      this.prisma.subscription.count({
        where: { ...whereClause, isTrial: true },
      }),
      this.prisma.subscription.count({
        where: { ...whereClause, status: 'canceled' },
      }),
      this.prisma.subscription.count({
        where: {
          ...whereClause,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    const churnCount = canceledSubscriptions;
    const churnRate = activeSubscriptions > 0 ? (churnCount / activeSubscriptions) * 100 : 0;

    const trialConversions = await this.prisma.subscription.count({
      where: {
        ...whereClause,
        isTrial: false,
        status: 'active',
        trialEnd: { not: null },
      },
    });

    const trialConversionRate = trialSubscriptions > 0 ? (trialConversions / trialSubscriptions) * 100 : 0;

    return {
      activeSubscriptionsCount: activeSubscriptions,
      trialSubscriptionsCount: trialSubscriptions,
      canceledSubscriptionsCount: canceledSubscriptions,
      newSubscriptionsCount: newSubscriptions,
      churnCount,
      churnRate: new Decimal(churnRate),
      trialConversionRate: new Decimal(trialConversionRate),
    };
  }

  private async calculateCustomerMetrics(whereClause: any) {
    const customerWhereClause = {
      platformId: whereClause.platformId,
    };

    const transactionWhereClause = {
      platformId: whereClause.platformId,
    };

    const [
      newCustomers,
      totalCustomers,
    ] = await Promise.all([
      this.prisma.customer.count({
        where: {
          ...customerWhereClause,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      this.prisma.customer.count({
        where: customerWhereClause,
      }),
    ]);

    const revenueData = await this.prisma.transaction.aggregate({
      where: {
        ...transactionWhereClause,
        status: 'succeeded',
        transactionType: 'payment',
      },
      _sum: {
        netAmountBrl: true,
        netAmountUsd: true,
      },
    });

    const arpuBrl = totalCustomers > 0 ? (revenueData._sum?.netAmountBrl || new Decimal(0)).div(totalCustomers) : new Decimal(0);
    const arpuUsd = totalCustomers > 0 ? (revenueData._sum?.netAmountUsd || new Decimal(0)).div(totalCustomers) : new Decimal(0);

    const clvBrl = arpuBrl.mul(12);
    const clvUsd = arpuUsd.mul(12);

    return {
      newCustomersCount: newCustomers,
      totalCustomersCount: totalCustomers,
      averageRevenuePerUserBrl: arpuBrl,
      averageRevenuePerUserUsd: arpuUsd,
      customerLifetimeValueBrl: clvBrl,
      customerLifetimeValueUsd: clvUsd,
    };
  }

  private async calculateChurnMetrics(whereClause: any) {
    const churnCount = await this.prisma.subscription.count({
      where: {
        ...whereClause,
        status: 'canceled',
        canceledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    });

    return { churnCount };
  }

  private async calculateCohortPeriod(cohortDate: Date, period: number, whereClause: any) {
    const periodStart = new Date(cohortDate);
    periodStart.setMonth(periodStart.getMonth() + period);

    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const customerWhereClause = {
      platformId: whereClause.platformId,
    };

    const customersCount = await this.prisma.customer.count({
      where: {
        ...customerWhereClause,
        createdAt: {
          gte: cohortDate,
          lt: new Date(cohortDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const retainedCount = await this.prisma.subscription.count({
      where: {
        ...whereClause,
        customer: {
          createdAt: {
            gte: cohortDate,
            lt: new Date(cohortDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        status: 'active',
        currentPeriodStart: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    });

    const retentionRate = customersCount > 0 ? (retainedCount / customersCount) * 100 : 0;
    const transactionWhereClause = {
      platformId: whereClause.platformId,
    };

    const revenueData = await this.prisma.transaction.aggregate({
      where: {
        ...transactionWhereClause,
        customer: {
          createdAt: {
            gte: cohortDate,
            lt: new Date(cohortDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        transactionDate: {
          gte: periodStart,
          lt: periodEnd,
        },
        status: 'succeeded',
        transactionType: 'payment',
      },
      _sum: {
        netAmountBrl: true,
        netAmountUsd: true,
      },
    });

    return {
      customersCount,
      retainedCount,
      retentionRate: new Decimal(retentionRate),
      revenueBrl: revenueData._sum?.netAmountBrl || new Decimal(0),
      revenueUsd: revenueData._sum?.netAmountUsd || new Decimal(0),
    };
  }

  private async calculateAffiliateData(affiliateId: string, whereClause: any) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        ...whereClause,
        affiliateId,
      },
    });

    const salesCount = subscriptions.length;

    const revenueData = await this.prisma.transaction.aggregate({
      where: {
        ...whereClause,
        subscription: {
          affiliateId,
        },
        status: 'succeeded',
        transactionType: 'payment',
      },
      _sum: {
        netAmountBrl: true,
        netAmountUsd: true,
      },
    });

    const customers = await this.prisma.customer.findMany({
      where: {
        ...whereClause,
        subscriptions: {
          some: {
            affiliateId,
          },
        },
      },
      select: {
        id: true,
        subscriptions: {
          where: { affiliateId },
          select: { id: true },
        },
      },
    });

    const newCustomersCount = customers.filter(c => c.subscriptions.length === 1).length;
    const repeatCustomersCount = customers.filter(c => c.subscriptions.length > 1).length;

    const conversionRate = 0;

    return {
      salesCount,
      revenueBrl: revenueData._sum?.netAmountBrl || new Decimal(0),
      revenueUsd: revenueData._sum?.netAmountUsd || new Decimal(0),
      conversionRate: new Decimal(conversionRate),
      newCustomersCount,
      repeatCustomersCount,
    };
  }

  private buildWhereClause(date: Date, platformId?: string | null, productId?: string | null): any {
    const where: any = {};

    if (platformId) {
      where.platformId = platformId;
    }

    if (productId) {
      where.productId = productId;
    }

    return where;
  }
}

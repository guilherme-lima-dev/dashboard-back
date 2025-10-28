import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsQueryDto, DashboardMetricsDto, RevenueMetricsDto, SubscriptionMetricsDto, CustomerMetricsDto, CohortAnalysisDto, AffiliateMetricsDto } from './dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardMetrics(query: MetricsQueryDto): Promise<DashboardMetricsDto> {
    const where = this.buildWhereClause(query);
    const date = query.endDate || new Date().toISOString().split('T')[0];

    const [revenue, subscriptions, customers] = await Promise.all([
      this.getRevenueMetrics(where),
      this.getSubscriptionMetrics(where),
      this.getCustomerMetrics(where),
    ]);

    return {
      revenue,
      subscriptions,
      customers,
      date,
    };
  }

  async getRevenueMetrics(where: any): Promise<RevenueMetricsDto> {
    const hasDateRange = where.metricDate && (where.metricDate.gte || where.metricDate.lte);
    
    if (hasDateRange) {
      const aggregatedMetrics = await this.prisma.dailyMetrics.aggregate({
        where,
        _sum: {
          revenueBrl: true,
          revenueUsd: true,
          refundsBrl: true,
          refundsUsd: true,
          mrrBrl: true,
          mrrUsd: true,
          arrBrl: true,
          arrUsd: true,
        },
      });

      return {
        mrrBrl: Number(aggregatedMetrics._sum.mrrBrl) || 0,
        mrrUsd: Number(aggregatedMetrics._sum.mrrUsd) || 0,
        arrBrl: Number(aggregatedMetrics._sum.arrBrl) || 0,
        arrUsd: Number(aggregatedMetrics._sum.arrUsd) || 0,
        revenueBrl: Number(aggregatedMetrics._sum.revenueBrl) || 0,
        revenueUsd: Number(aggregatedMetrics._sum.revenueUsd) || 0,
        refundsBrl: Number(aggregatedMetrics._sum.refundsBrl) || 0,
        refundsUsd: Number(aggregatedMetrics._sum.refundsUsd) || 0,
      };
    }

    const metrics = await this.prisma.dailyMetrics.findFirst({
      where,
      orderBy: { metricDate: 'desc' },
    });

    if (!metrics) {
      return {
        mrrBrl: 0,
        mrrUsd: 0,
        arrBrl: 0,
        arrUsd: 0,
        revenueBrl: 0,
        revenueUsd: 0,
        refundsBrl: 0,
        refundsUsd: 0,
      };
    }

    return {
      mrrBrl: Number(metrics.mrrBrl),
      mrrUsd: Number(metrics.mrrUsd),
      arrBrl: Number(metrics.arrBrl),
      arrUsd: Number(metrics.arrUsd),
      revenueBrl: Number(metrics.revenueBrl),
      revenueUsd: Number(metrics.revenueUsd),
      refundsBrl: Number(metrics.refundsBrl),
      refundsUsd: Number(metrics.refundsUsd),
    };
  }

  async getSubscriptionMetrics(where: any): Promise<SubscriptionMetricsDto> {
    if (where.metricDate && typeof where.metricDate === 'object' && (where.metricDate.gte || where.metricDate.lte)) {
      const aggregatedMetrics = await this.prisma.dailyMetrics.aggregate({
        where,
        _sum: {
          newSubscriptionsCount: true,
          churnCount: true,
        },
        _avg: {
          activeSubscriptionsCount: true,
          trialSubscriptionsCount: true,
          canceledSubscriptionsCount: true,
          churnRate: true,
          trialConversionRate: true,
        },
      });

      return {
        activeSubscriptionsCount: Math.round(aggregatedMetrics._avg.activeSubscriptionsCount || 0),
        trialSubscriptionsCount: Math.round(aggregatedMetrics._avg.trialSubscriptionsCount || 0),
        canceledSubscriptionsCount: Math.round(aggregatedMetrics._avg.canceledSubscriptionsCount || 0),
        newSubscriptionsCount: aggregatedMetrics._sum.newSubscriptionsCount || 0,
        churnCount: aggregatedMetrics._sum.churnCount || 0,
        churnRate: Number(aggregatedMetrics._avg.churnRate || 0),
        trialConversionRate: Number(aggregatedMetrics._avg.trialConversionRate || 0),
      };
    }

    const metrics = await this.prisma.dailyMetrics.findFirst({
      where: {
        ...where,
        metricDate: where.metricDate || new Date(),
      },
      orderBy: { metricDate: 'desc' },
    });

    if (!metrics) {
      return {
        activeSubscriptionsCount: 0,
        trialSubscriptionsCount: 0,
        canceledSubscriptionsCount: 0,
        newSubscriptionsCount: 0,
        churnCount: 0,
        churnRate: 0,
        trialConversionRate: 0,
      };
    }

    return {
      activeSubscriptionsCount: metrics.activeSubscriptionsCount,
      trialSubscriptionsCount: metrics.trialSubscriptionsCount,
      canceledSubscriptionsCount: metrics.canceledSubscriptionsCount,
      newSubscriptionsCount: metrics.newSubscriptionsCount,
      churnCount: metrics.churnCount,
      churnRate: Number(metrics.churnRate),
      trialConversionRate: Number(metrics.trialConversionRate),
    };
  }

  async getCustomerMetrics(where: any): Promise<CustomerMetricsDto> {
    if (where.metricDate && typeof where.metricDate === 'object' && (where.metricDate.gte || where.metricDate.lte)) {
      const aggregatedMetrics = await this.prisma.dailyMetrics.aggregate({
        where,
        _sum: {
          newCustomersCount: true,
        },
        _avg: {
          totalCustomersCount: true,
          averageRevenuePerUserBrl: true,
          averageRevenuePerUserUsd: true,
          customerLifetimeValueBrl: true,
          customerLifetimeValueUsd: true,
        },
      });

      return {
        newCustomersCount: aggregatedMetrics._sum.newCustomersCount || 0,
        totalCustomersCount: Math.round(aggregatedMetrics._avg.totalCustomersCount || 0),
        averageRevenuePerUserBrl: Number(aggregatedMetrics._avg.averageRevenuePerUserBrl || 0),
        averageRevenuePerUserUsd: Number(aggregatedMetrics._avg.averageRevenuePerUserUsd || 0),
        customerLifetimeValueBrl: Number(aggregatedMetrics._avg.customerLifetimeValueBrl || 0),
        customerLifetimeValueUsd: Number(aggregatedMetrics._avg.customerLifetimeValueUsd || 0),
      };
    }

    const metrics = await this.prisma.dailyMetrics.findFirst({
      where: {
        ...where,
        metricDate: where.metricDate || new Date(),
      },
      orderBy: { metricDate: 'desc' },
    });

    if (!metrics) {
      return {
        newCustomersCount: 0,
        totalCustomersCount: 0,
        averageRevenuePerUserBrl: 0,
        averageRevenuePerUserUsd: 0,
        customerLifetimeValueBrl: 0,
        customerLifetimeValueUsd: 0,
      };
    }

    return {
      newCustomersCount: metrics.newCustomersCount,
      totalCustomersCount: metrics.totalCustomersCount,
      averageRevenuePerUserBrl: Number(metrics.averageRevenuePerUserBrl),
      averageRevenuePerUserUsd: Number(metrics.averageRevenuePerUserUsd),
      customerLifetimeValueBrl: Number(metrics.customerLifetimeValueBrl),
      customerLifetimeValueUsd: Number(metrics.customerLifetimeValueUsd),
    };
  }

  async getCohortAnalysis(query: MetricsQueryDto): Promise<CohortAnalysisDto[]> {
    const where = this.buildCohortWhereClause(query);

    const cohorts = await this.prisma.cohortAnalysis.findMany({
      where,
      orderBy: [
        { cohortDate: 'desc' },
        { period: 'asc' },
      ],
    });

    return cohorts.map(cohort => ({
      cohortDate: cohort.cohortDate.toISOString().split('T')[0],
      period: cohort.period,
      customersCount: cohort.customersCount,
      retainedCount: cohort.retainedCount,
      retentionRate: Number(cohort.retentionRate),
      revenueBrl: Number(cohort.revenueBrl),
      revenueUsd: Number(cohort.revenueUsd),
    }));
  }

  async getAffiliateMetrics(query: MetricsQueryDto): Promise<AffiliateMetricsDto[]> {
    const where = this.buildWhereClause(query);

    const metrics = await this.prisma.affiliateMetrics.findMany({
      where,
      orderBy: { revenueBrl: 'desc' },
    });

    return metrics.map(metric => ({
      affiliateId: metric.affiliateId,
      salesCount: metric.salesCount,
      revenueBrl: Number(metric.revenueBrl),
      revenueUsd: Number(metric.revenueUsd),
      conversionRate: Number(metric.conversionRate),
      newCustomersCount: metric.newCustomersCount,
      repeatCustomersCount: metric.repeatCustomersCount,
    }));
  }

  async getMetricsHistory(query: MetricsQueryDto): Promise<any[]> {
    const where = this.buildWhereClause(query);

    const metrics = await this.prisma.dailyMetrics.findMany({
      where,
      orderBy: { metricDate: 'asc' },
    });

    return metrics.map(metric => ({
      date: metric.metricDate.toISOString().split('T')[0],
      mrrBrl: Number(metric.mrrBrl),
      mrrUsd: Number(metric.mrrUsd),
      activeSubscriptions: metric.activeSubscriptionsCount,
      newSubscriptions: metric.newSubscriptionsCount,
      churnRate: Number(metric.churnRate),
      revenueBrl: Number(metric.revenueBrl),
      revenueUsd: Number(metric.revenueUsd),
    }));
  }

  async getRevenueTrend(query: MetricsQueryDto): Promise<any> {
    const where = this.buildWhereClause(query);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 12);

    const metrics = await this.prisma.dailyMetrics.findMany({
      where: {
        ...where,
        metricDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { metricDate: 'asc' },
    });

    const monthlyData = new Map();
    for (let i = 0; i < 12; i++) {
      const date = new Date(endDate);
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      monthlyData.set(monthKey, {
        month: monthKey,
        revenue: 0,
        subscriptions: 0,
      });
    }

    metrics.forEach(metric => {
      const monthKey = metric.metricDate.toISOString().slice(0, 7);
      if (monthlyData.has(monthKey)) {
        const data = monthlyData.get(monthKey);
        data.revenue += Number(metric.revenueBrl);
        data.subscriptions += metric.activeSubscriptionsCount;
      }
    });

    return {
      monthlyTrend: Array.from(monthlyData.values()).reverse(),
      totalRevenue: metrics.reduce((sum, m) => sum + Number(m.revenueBrl), 0),
      totalSubscriptions: metrics.reduce((sum, m) => sum + m.activeSubscriptionsCount, 0),
    };
  }

  async getRevenueByProduct(query: MetricsQueryDto): Promise<any> {
    const where = this.buildWhereClause(query);
    const transactions = await this.prisma.transaction.findMany({
      where: {
        platformId: where.platformId,
        status: 'succeeded',
        transactionType: 'payment',
      },
      select: {
        netAmountBrl: true,
        transactionSubscriptions: {
          select: {
            subscription: {
              select: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const productRevenue = new Map();
    transactions.forEach(transaction => {
      transaction.transactionSubscriptions.forEach(ts => {
        const product = ts.subscription?.product;
        if (product) {
          const current = productRevenue.get(product.id) || {
            productId: product.id,
            productName: product.name,
            revenue: 0,
          };
          const transactionRevenue = Number(transaction.netAmountBrl);
          const subscriptionCount = transaction.transactionSubscriptions.length;
          const revenuePerSubscription = subscriptionCount > 0 ? transactionRevenue / subscriptionCount : 0;
          
          current.revenue += revenuePerSubscription;
          productRevenue.set(product.id, current);
        }
      });
    });

    const totalRevenue = Array.from(productRevenue.values()).reduce((sum, p) => sum + p.revenue, 0);
    
    return {
      revenueByProduct: Array.from(productRevenue.values()).map(product => ({
        ...product,
        percentage: totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0,
      })),
    };
  }

  async getSubscriptionTrend(query: MetricsQueryDto): Promise<any> {
    const where = this.buildWhereClause(query);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 12);

    const metrics = await this.prisma.dailyMetrics.findMany({
      where: {
        ...where,
        metricDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { metricDate: 'asc' },
    });

    const monthlyData = new Map();
    for (let i = 0; i < 12; i++) {
      const date = new Date(endDate);
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      monthlyData.set(monthKey, {
        month: monthKey,
        subscriptions: 0,
        revenue: 0,
      });
    }

    metrics.forEach(metric => {
      const monthKey = metric.metricDate.toISOString().slice(0, 7);
      if (monthlyData.has(monthKey)) {
        const data = monthlyData.get(monthKey);
        data.subscriptions += metric.activeSubscriptionsCount;
        data.revenue += Number(metric.revenueBrl);
      }
    });

    return {
      monthlyTrend: Array.from(monthlyData.values()).reverse(),
      totalSubscriptions: metrics.reduce((sum, m) => sum + m.activeSubscriptionsCount, 0),
    };
  }

  async getSubscriptionByProduct(query: MetricsQueryDto): Promise<any> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        platformId: query.platformId,
        status: 'active',
      },
      select: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const productSubscriptions = new Map();
    subscriptions.forEach(subscription => {
      const product = subscription.product;
      if (product) {
        const current = productSubscriptions.get(product.id) || {
          productId: product.id,
          productName: product.name,
          count: 0,
        };
        current.count += 1;
        productSubscriptions.set(product.id, current);
      }
    });

    const totalSubscriptions = Array.from(productSubscriptions.values()).reduce((sum, p) => sum + p.count, 0);
    
    return {
      subscriptionsByProduct: Array.from(productSubscriptions.values()).map(product => ({
        ...product,
        percentage: totalSubscriptions > 0 ? (product.count / totalSubscriptions) * 100 : 0,
      })),
    };
  }

  async getRecentActivities(query: MetricsQueryDto): Promise<any[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - 24);

    const activities: any[] = [];

    try {
      const newSubscriptions = await this.prisma.subscription.findMany({
        where: {
          platformId: query.platformId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          createdAt: true,
          customer: {
            select: {
              name: true,
            },
          },
          recurringAmountBrl: true,
        },
        take: 5,
      });

      newSubscriptions.forEach(sub => {
        activities.push({
          id: `sub-${sub.id}`,
          type: 'subscription',
          title: 'Nova assinatura criada',
          description: `Cliente ${sub.customer.name || 'Anônimo'} assinou um plano`,
          timestamp: sub.createdAt.toISOString(),
          user: sub.customer.name || 'Anônimo',
          amount: Number(sub.recurringAmountBrl),
          currency: 'BRL',
        });
      });

      const newCustomers = await this.prisma.customer.findMany({
        where: {
          platformId: query.platformId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
        take: 5,
      });

      newCustomers.forEach(customer => {
        activities.push({
          id: `customer-${customer.id}`,
          type: 'user',
          title: 'Novo cliente registrado',
          description: `${customer.name || 'Anônimo'} se registrou na plataforma`,
          timestamp: customer.createdAt.toISOString(),
          user: customer.name || 'Anônimo',
        });
      });

      const successfulTransactions = await this.prisma.transaction.findMany({
        where: {
          platformId: query.platformId,
          status: 'succeeded',
          transactionType: 'payment',
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          netAmountBrl: true,
          transactionDate: true,
          customer: {
            select: {
              name: true,
            },
          },
        },
        take: 5,
      });

      successfulTransactions.forEach(transaction => {
        activities.push({
          id: `transaction-${transaction.id}`,
          type: 'payment',
          title: 'Pagamento processado',
          description: `Pagamento de R$ ${Number(transaction.netAmountBrl).toFixed(2)} processado com sucesso`,
          timestamp: transaction.transactionDate.toISOString(),
          user: transaction.customer.name || 'Anônimo',
          amount: Number(transaction.netAmountBrl),
          currency: 'BRL',
        });
      });
    } catch (error) {}

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }

  private buildWhereClause(query: MetricsQueryDto): any {
    const where: any = {};
    if (!query.startDate && !query.endDate && query.period) {
      const now = new Date();
      const startDate = new Date();
      
      switch (query.period) {
        case 'daily':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'weekly':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'monthly':
          startDate.setDate(now.getDate() - 30);
          break;
        case 'yearly':
          startDate.setDate(now.getDate() - 365);
          break;
      }
      
      where.metricDate = {
        gte: startDate,
        lte: now,
      };
    } else if (query.startDate && query.endDate) {
      where.metricDate = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    } else if (query.startDate) {
      where.metricDate = {
        gte: new Date(query.startDate),
      };
    } else if (query.endDate) {
      where.metricDate = {
        lte: new Date(query.endDate),
      };
    }

    if (query.platformId) {
      where.platformId = query.platformId;
    }

    if (query.productId) {
      where.productId = query.productId;
    }

    return where;
  }

  private buildCohortWhereClause(query: MetricsQueryDto): any {
    const where: any = {};
    if (!query.startDate && !query.endDate && query.period) {
      const now = new Date();
      const startDate = new Date();
      
      switch (query.period) {
        case 'daily':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'weekly':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'yearly':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      where.cohortDate = {
        gte: startDate,
        lte: now,
      };
    } else if (query.startDate && query.endDate) {
      where.cohortDate = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    } else if (query.startDate) {
      where.cohortDate = {
        gte: new Date(query.startDate),
      };
    } else if (query.endDate) {
      where.cohortDate = {
        lte: new Date(query.endDate),
      };
    }

    if (query.platformId) {
      where.platformId = query.platformId;
    }

    if (query.productId) {
      where.productId = query.productId;
    }

    return where;
  }
}

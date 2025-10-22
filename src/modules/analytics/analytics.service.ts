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
    const metrics = await this.prisma.dailyMetrics.findFirst({
      where: {
        ...where,
        metricDate: where.metricDate || new Date(),
      },
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
    const where = this.buildWhereClause(query);

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

  private buildWhereClause(query: MetricsQueryDto): any {
    const where: any = {};

    if (query.startDate && query.endDate) {
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
}

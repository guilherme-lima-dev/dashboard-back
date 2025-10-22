import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    dailyMetrics: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    cohortAnalysis: {
      findMany: jest.fn(),
    },
    affiliateMetrics: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics with all components', async () => {
      const mockMetrics = {
        mrrBrl: new Decimal(1000),
        mrrUsd: new Decimal(200),
        arrBrl: new Decimal(12000),
        arrUsd: new Decimal(2400),
        revenueBrl: new Decimal(5000),
        revenueUsd: new Decimal(1000),
        refundsBrl: new Decimal(100),
        refundsUsd: new Decimal(20),
        activeSubscriptionsCount: 50,
        trialSubscriptionsCount: 10,
        canceledSubscriptionsCount: 5,
        newSubscriptionsCount: 8,
        churnCount: 2,
        churnRate: new Decimal(4.0),
        trialConversionRate: new Decimal(80.0),
        newCustomersCount: 15,
        totalCustomersCount: 100,
        averageRevenuePerUserBrl: new Decimal(50),
        averageRevenuePerUserUsd: new Decimal(10),
        customerLifetimeValueBrl: new Decimal(600),
        customerLifetimeValueUsd: new Decimal(120),
      };

      mockPrismaService.dailyMetrics.findFirst.mockResolvedValue(mockMetrics);

      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        platformId: 'platform-1',
        productId: 'product-1',
      };

      const result = await service.getDashboardMetrics(query);

      expect(result).toEqual({
        revenue: {
          mrrBrl: 1000,
          mrrUsd: 200,
          arrBrl: 12000,
          arrUsd: 2400,
          revenueBrl: 5000,
          revenueUsd: 1000,
          refundsBrl: 100,
          refundsUsd: 20,
        },
        subscriptions: {
          activeSubscriptionsCount: 50,
          trialSubscriptionsCount: 10,
          canceledSubscriptionsCount: 5,
          newSubscriptionsCount: 8,
          churnCount: 2,
          churnRate: 4.0,
          trialConversionRate: 80.0,
        },
        customers: {
          newCustomersCount: 15,
          totalCustomersCount: 100,
          averageRevenuePerUserBrl: 50,
          averageRevenuePerUserUsd: 10,
          customerLifetimeValueBrl: 600,
          customerLifetimeValueUsd: 120,
        },
        date: '2025-01-31',
      });

      expect(mockPrismaService.dailyMetrics.findFirst).toHaveBeenCalledTimes(3);
    });

    it('should return zero values when no metrics found', async () => {
      mockPrismaService.dailyMetrics.findFirst.mockResolvedValue(null);

      const query = {};
      const result = await service.getDashboardMetrics(query);

      expect(result.revenue.mrrBrl).toBe(0);
      expect(result.subscriptions.activeSubscriptionsCount).toBe(0);
      expect(result.customers.totalCustomersCount).toBe(0);
    });
  });

  describe('getRevenueMetrics', () => {
    it('should return revenue metrics', async () => {
      const mockMetrics = {
        mrrBrl: new Decimal(1000),
        mrrUsd: new Decimal(200),
        arrBrl: new Decimal(12000),
        arrUsd: new Decimal(2400),
        revenueBrl: new Decimal(5000),
        revenueUsd: new Decimal(1000),
        refundsBrl: new Decimal(100),
        refundsUsd: new Decimal(20),
      };

      mockPrismaService.dailyMetrics.findFirst.mockResolvedValue(mockMetrics);

      const where = { platformId: 'platform-1' };
      const result = await service.getRevenueMetrics(where);

      expect(result).toEqual({
        mrrBrl: 1000,
        mrrUsd: 200,
        arrBrl: 12000,
        arrUsd: 2400,
        revenueBrl: 5000,
        revenueUsd: 1000,
        refundsBrl: 100,
        refundsUsd: 20,
      });
    });
  });

  describe('getSubscriptionMetrics', () => {
    it('should return subscription metrics', async () => {
      const mockMetrics = {
        activeSubscriptionsCount: 50,
        trialSubscriptionsCount: 10,
        canceledSubscriptionsCount: 5,
        newSubscriptionsCount: 8,
        churnCount: 2,
        churnRate: new Decimal(4.0),
        trialConversionRate: new Decimal(80.0),
      };

      mockPrismaService.dailyMetrics.findFirst.mockResolvedValue(mockMetrics);

      const where = { platformId: 'platform-1' };
      const result = await service.getSubscriptionMetrics(where);

      expect(result).toEqual({
        activeSubscriptionsCount: 50,
        trialSubscriptionsCount: 10,
        canceledSubscriptionsCount: 5,
        newSubscriptionsCount: 8,
        churnCount: 2,
        churnRate: 4.0,
        trialConversionRate: 80.0,
      });
    });
  });

  describe('getCustomerMetrics', () => {
    it('should return customer metrics', async () => {
      const mockMetrics = {
        newCustomersCount: 15,
        totalCustomersCount: 100,
        averageRevenuePerUserBrl: new Decimal(50),
        averageRevenuePerUserUsd: new Decimal(10),
        customerLifetimeValueBrl: new Decimal(600),
        customerLifetimeValueUsd: new Decimal(120),
      };

      mockPrismaService.dailyMetrics.findFirst.mockResolvedValue(mockMetrics);

      const where = { platformId: 'platform-1' };
      const result = await service.getCustomerMetrics(where);

      expect(result).toEqual({
        newCustomersCount: 15,
        totalCustomersCount: 100,
        averageRevenuePerUserBrl: 50,
        averageRevenuePerUserUsd: 10,
        customerLifetimeValueBrl: 600,
        customerLifetimeValueUsd: 120,
      });
    });
  });

  describe('getCohortAnalysis', () => {
    it('should return cohort analysis data', async () => {
      const mockCohorts = [
        {
          cohortDate: new Date('2025-01-01'),
          period: 0,
          customersCount: 100,
          retainedCount: 100,
          retentionRate: new Decimal(100.0),
          revenueBrl: new Decimal(5000),
          revenueUsd: new Decimal(1000),
        },
        {
          cohortDate: new Date('2025-01-01'),
          period: 1,
          customersCount: 100,
          retainedCount: 80,
          retentionRate: new Decimal(80.0),
          revenueBrl: new Decimal(4000),
          revenueUsd: new Decimal(800),
        },
      ];

      mockPrismaService.cohortAnalysis.findMany.mockResolvedValue(mockCohorts);

      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const result = await service.getCohortAnalysis(query);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        cohortDate: '2025-01-01',
        period: 0,
        customersCount: 100,
        retainedCount: 100,
        retentionRate: 100.0,
        revenueBrl: 5000,
        revenueUsd: 1000,
      });
    });
  });

  describe('getAffiliateMetrics', () => {
    it('should return affiliate metrics', async () => {
      const mockAffiliates = [
        {
          affiliateId: 'affiliate-1',
          salesCount: 10,
          revenueBrl: new Decimal(1000),
          revenueUsd: new Decimal(200),
          conversionRate: new Decimal(5.0),
          newCustomersCount: 8,
          repeatCustomersCount: 2,
        },
      ];

      mockPrismaService.affiliateMetrics.findMany.mockResolvedValue(mockAffiliates);

      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const result = await service.getAffiliateMetrics(query);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        affiliateId: 'affiliate-1',
        salesCount: 10,
        revenueBrl: 1000,
        revenueUsd: 200,
        conversionRate: 5.0,
        newCustomersCount: 8,
        repeatCustomersCount: 2,
      });
    });
  });

  describe('getMetricsHistory', () => {
    it('should return metrics history', async () => {
      const mockHistory = [
        {
          metricDate: new Date('2025-01-01'),
          mrrBrl: new Decimal(1000),
          mrrUsd: new Decimal(200),
          activeSubscriptionsCount: 50,
          newSubscriptionsCount: 8,
          churnRate: new Decimal(4.0),
          revenueBrl: new Decimal(5000),
          revenueUsd: new Decimal(1000),
        },
      ];

      mockPrismaService.dailyMetrics.findMany.mockResolvedValue(mockHistory);

      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const result = await service.getMetricsHistory(query);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '2025-01-01',
        mrrBrl: 1000,
        mrrUsd: 200,
        activeSubscriptions: 50,
        newSubscriptions: 8,
        churnRate: 4.0,
        revenueBrl: 5000,
        revenueUsd: 1000,
      });
    });
  });

  describe('buildWhereClause', () => {
    it('should build where clause with date range', () => {
      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        platformId: 'platform-1',
        productId: 'product-1',
      };

      const result = (service as any).buildWhereClause(query);

      expect(result.metricDate).toEqual({
        gte: new Date('2025-01-01'),
        lte: new Date('2025-01-31'),
      });
      expect(result.platformId).toBe('platform-1');
      expect(result.productId).toBe('product-1');
    });

    it('should build where clause with only start date', () => {
      const query = {
        startDate: '2025-01-01',
        platformId: 'platform-1',
      };

      const result = (service as any).buildWhereClause(query);

      expect(result.metricDate).toEqual({
        gte: new Date('2025-01-01'),
      });
      expect(result.platformId).toBe('platform-1');
    });

    it('should build where clause with only end date', () => {
      const query = {
        endDate: '2025-01-31',
        productId: 'product-1',
      };

      const result = (service as any).buildWhereClause(query);

      expect(result.metricDate).toEqual({
        lte: new Date('2025-01-31'),
      });
      expect(result.productId).toBe('product-1');
    });

    it('should build empty where clause for empty query', () => {
      const query = {};

      const result = (service as any).buildWhereClause(query);

      expect(result).toEqual({});
    });
  });
});

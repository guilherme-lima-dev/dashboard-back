import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('MetricsService', () => {
  let service: MetricsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    dailyMetrics: {
      upsert: jest.fn(),
    },
    cohortAnalysis: {
      upsert: jest.fn(),
    },
    affiliateMetrics: {
      upsert: jest.fn(),
    },
    subscription: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    customer: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDailyMetrics', () => {
    it('should calculate and save daily metrics', async () => {
      const date = new Date('2025-01-01');
      const platformId = 'platform-1';
      const productId = 'product-1';

      const mockSubscriptions = [
        {
          recurringAmountBrl: new Decimal(100),
          recurringAmountUsd: new Decimal(20),
        },
      ];

      const mockTransactions = [
        {
          netAmountBrl: new Decimal(100),
          netAmountUsd: new Decimal(20),
          transactionType: 'payment',
        },
      ];

      mockPrismaService.subscription.findMany.mockResolvedValue(mockSubscriptions);
      mockPrismaService.transaction.findMany.mockResolvedValue(mockTransactions);
      mockPrismaService.subscription.count.mockResolvedValue(10);
      mockPrismaService.customer.count.mockResolvedValue(5);
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: {
          netAmountBrl: new Decimal(1000),
          netAmountUsd: new Decimal(200),
        },
      });
      mockPrismaService.dailyMetrics.upsert.mockResolvedValue({});

      await service.calculateDailyMetrics(date, platformId, productId);

      expect(mockPrismaService.dailyMetrics.upsert).toHaveBeenCalledWith({
        where: {
          metricDate_platformId_productId: {
            metricDate: date,
            platformId: platformId,
            productId: productId,
          },
        },
        update: expect.any(Object),
        create: expect.any(Object),
      });
    });

    it('should calculate metrics without platform and product filters', async () => {
      const date = new Date('2025-01-01');

      mockPrismaService.subscription.findMany.mockResolvedValue([]);
      mockPrismaService.transaction.findMany.mockResolvedValue([]);
      mockPrismaService.subscription.count.mockResolvedValue(0);
      mockPrismaService.customer.count.mockResolvedValue(0);
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { netAmountBrl: new Decimal(0), netAmountUsd: new Decimal(0) },
      });
      mockPrismaService.dailyMetrics.upsert.mockResolvedValue({});

      await service.calculateDailyMetrics(date);

      expect(mockPrismaService.dailyMetrics.upsert).toHaveBeenCalled();
    });
  });

  describe('calculateCohortAnalysis', () => {
    it('should calculate cohort analysis for all periods', async () => {
      const cohortDate = new Date('2025-01-01');
      const platformId = 'platform-1';
      const productId = 'product-1';

      mockPrismaService.customer.count.mockResolvedValue(100);
      mockPrismaService.subscription.count.mockResolvedValue(80);
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: {
          netAmountBrl: new Decimal(5000),
          netAmountUsd: new Decimal(1000),
        },
      });
      mockPrismaService.cohortAnalysis.upsert.mockResolvedValue({});

      await service.calculateCohortAnalysis(cohortDate, platformId, productId);

      expect(mockPrismaService.cohortAnalysis.upsert).toHaveBeenCalledTimes(13);
    });
  });

  describe('calculateAffiliateMetrics', () => {
    it('should calculate affiliate metrics for all affiliates', async () => {
      const date = new Date('2025-01-01');
      const platformId = 'platform-1';

      const mockAffiliates = [
        { affiliateId: 'affiliate-1' },
        { affiliateId: 'affiliate-2' },
      ];

      mockPrismaService.subscription.findMany.mockResolvedValue(mockAffiliates);
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: {
          netAmountBrl: new Decimal(1000),
          netAmountUsd: new Decimal(200),
        },
      });
      mockPrismaService.customer.findMany.mockResolvedValue([]);
      mockPrismaService.affiliateMetrics.upsert.mockResolvedValue({});

      await service.calculateAffiliateMetrics(date, platformId);

      expect(mockPrismaService.affiliateMetrics.upsert).toHaveBeenCalledTimes(2);
    });

    it('should skip affiliates without affiliateId', async () => {
      const date = new Date('2025-01-01');

      const mockAffiliates = [
        { affiliateId: 'affiliate-1' },
        { affiliateId: null },
      ];

      mockPrismaService.subscription.findMany.mockResolvedValue(mockAffiliates);
      mockPrismaService.affiliateMetrics.upsert.mockResolvedValue({});

      await service.calculateAffiliateMetrics(date);

      expect(mockPrismaService.affiliateMetrics.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('calculateRevenueMetrics', () => {
    it('should calculate revenue metrics correctly', async () => {
      const whereClause = { platformId: 'platform-1' };

      const mockSubscriptions = [
        {
          recurringAmountBrl: new Decimal(100),
          recurringAmountUsd: new Decimal(20),
        },
        {
          recurringAmountBrl: new Decimal(200),
          recurringAmountUsd: new Decimal(40),
        },
      ];

      const mockTransactions = [
        {
          netAmountBrl: new Decimal(100),
          netAmountUsd: new Decimal(20),
          transactionType: 'payment',
        },
        {
          netAmountBrl: new Decimal(50),
          netAmountUsd: new Decimal(10),
          transactionType: 'refund',
        },
      ];

      mockPrismaService.subscription.findMany.mockResolvedValue(mockSubscriptions);
      mockPrismaService.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await (service as any).calculateRevenueMetrics(whereClause);

      expect(result.mrrBrl.toNumber()).toBe(300);
      expect(result.mrrUsd.toNumber()).toBe(60);
      expect(result.arrBrl.toNumber()).toBe(3600);
      expect(result.arrUsd.toNumber()).toBe(720);
      expect(result.revenueBrl.toNumber()).toBe(100);
      expect(result.revenueUsd.toNumber()).toBe(20);
      expect(result.refundsBrl.toNumber()).toBe(50);
      expect(result.refundsUsd.toNumber()).toBe(10);
    });
  });

  describe('calculateSubscriptionMetrics', () => {
    it('should calculate subscription metrics correctly', async () => {
      const whereClause = { platformId: 'platform-1' };

      mockPrismaService.subscription.count
        .mockResolvedValueOnce(50) // activeSubscriptionsCount
        .mockResolvedValueOnce(10) // trialSubscriptionsCount
        .mockResolvedValueOnce(5)  // canceledSubscriptionsCount
        .mockResolvedValueOnce(8)  // newSubscriptionsCount
        .mockResolvedValueOnce(5); // churnCount (canceledSubscriptionsCount)

      const result = await (service as any).calculateSubscriptionMetrics(whereClause);

      expect(result.activeSubscriptionsCount).toBe(50);
      expect(result.trialSubscriptionsCount).toBe(10);
      expect(result.canceledSubscriptionsCount).toBe(5);
      expect(result.newSubscriptionsCount).toBe(8);
      expect(result.churnCount).toBe(5);
      expect(result.churnRate.toNumber()).toBe(10.0);
    });
  });

  describe('calculateCustomerMetrics', () => {
    it('should calculate customer metrics correctly', async () => {
      const whereClause = { platformId: 'platform-1' };

      mockPrismaService.customer.count
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(100);

      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: {
          netAmountBrl: new Decimal(5000),
          netAmountUsd: new Decimal(1000),
        },
      });

      const result = await (service as any).calculateCustomerMetrics(whereClause);

      expect(result.newCustomersCount).toBe(15);
      expect(result.totalCustomersCount).toBe(100);
      expect(result.averageRevenuePerUserBrl.toNumber()).toBe(50);
      expect(result.averageRevenuePerUserUsd.toNumber()).toBe(10);
      expect(result.customerLifetimeValueBrl.toNumber()).toBe(600);
      expect(result.customerLifetimeValueUsd.toNumber()).toBe(120);
    });
  });

  describe('calculateCohortPeriod', () => {
    it('should calculate cohort period metrics correctly', async () => {
      const cohortDate = new Date('2025-01-01');
      const period = 1;
      const whereClause = { platformId: 'platform-1' };

      mockPrismaService.customer.count.mockResolvedValue(100);
      mockPrismaService.subscription.count.mockResolvedValue(80);
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: {
          netAmountBrl: new Decimal(5000),
          netAmountUsd: new Decimal(1000),
        },
      });

      const result = await (service as any).calculateCohortPeriod(
        cohortDate,
        period,
        whereClause,
      );

      expect(result.customersCount).toBe(100);
      expect(result.retainedCount).toBe(80);
      expect(result.retentionRate.toNumber()).toBe(80.0);
      expect(result.revenueBrl.toNumber()).toBe(5000);
      expect(result.revenueUsd.toNumber()).toBe(1000);
    });
  });

  describe('calculateAffiliateData', () => {
    it('should calculate affiliate data correctly', async () => {
      const affiliateId = 'affiliate-1';
      const whereClause = { platformId: 'platform-1' };

      const mockSubscriptions = [{ id: 'sub-1' }, { id: 'sub-2' }];

      const mockCustomers = [
        {
          id: 'customer-1',
          subscriptions: [{ id: 'sub-1' }],
        },
        {
          id: 'customer-2',
          subscriptions: [{ id: 'sub-2' }, { id: 'sub-3' }],
        },
      ];

      mockPrismaService.subscription.findMany.mockResolvedValue(mockSubscriptions);
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: {
          netAmountBrl: new Decimal(1000),
          netAmountUsd: new Decimal(200),
        },
      });
      mockPrismaService.customer.findMany.mockResolvedValue(mockCustomers);

      const result = await (service as any).calculateAffiliateData(
        affiliateId,
        whereClause,
      );

      expect(result.salesCount).toBe(2);
      expect(result.revenueBrl.toNumber()).toBe(1000);
      expect(result.revenueUsd.toNumber()).toBe(200);
      expect(result.newCustomersCount).toBe(1);
      expect(result.repeatCustomersCount).toBe(1);
    });
  });

  describe('buildWhereClause', () => {
    it('should build where clause with platform and product', () => {
      const date = new Date('2025-01-01');
      const platformId = 'platform-1';
      const productId = 'product-1';

      const result = (service as any).buildWhereClause(date, platformId, productId);

      expect(result.platformId).toBe('platform-1');
      expect(result.productId).toBe('product-1');
    });

    it('should build where clause without platform and product', () => {
      const date = new Date('2025-01-01');

      const result = (service as any).buildWhereClause(date);

      expect(result).toEqual({});
    });
  });
});

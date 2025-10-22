import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ReportsService } from './reports.service';
import { ReportType, ReportFormat } from './dto';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: AnalyticsService;
  let reportsService: ReportsService;

  const mockAnalyticsService = {
    getDashboardMetrics: jest.fn(),
    getRevenueMetrics: jest.fn(),
    getSubscriptionMetrics: jest.fn(),
    getCustomerMetrics: jest.fn(),
    getCohortAnalysis: jest.fn(),
    getAffiliateMetrics: jest.fn(),
    getMetricsHistory: jest.fn(),
  };

  const mockReportsService = {
    generateReport: jest.fn(),
    getReportStatus: jest.fn(),
    downloadReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);
    reportsService = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics', async () => {
      const mockMetrics = {
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
      };

      mockAnalyticsService.getDashboardMetrics.mockResolvedValue(mockMetrics);

      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        platformId: 'platform-1',
        productId: 'product-1',
      };

      const result = await controller.getDashboardMetrics(query);

      expect(result).toEqual(mockMetrics);
      expect(mockAnalyticsService.getDashboardMetrics).toHaveBeenCalledWith(query);
    });
  });

  describe('getRevenueMetrics', () => {
    it('should return revenue metrics', async () => {
      const mockMetrics = {
        mrrBrl: 1000,
        mrrUsd: 200,
        arrBrl: 12000,
        arrUsd: 2400,
        revenueBrl: 5000,
        revenueUsd: 1000,
        refundsBrl: 100,
        refundsUsd: 20,
      };

      mockAnalyticsService.getRevenueMetrics.mockResolvedValue(mockMetrics);

      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        platformId: 'platform-1',
      };

      const result = await controller.getRevenueMetrics(query);

      expect(result).toEqual(mockMetrics);
      expect(mockAnalyticsService.getRevenueMetrics).toHaveBeenCalled();
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
        churnRate: 4.0,
        trialConversionRate: 80.0,
      };

      mockAnalyticsService.getSubscriptionMetrics.mockResolvedValue(mockMetrics);

      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const result = await controller.getSubscriptionMetrics(query);

      expect(result).toEqual(mockMetrics);
      expect(mockAnalyticsService.getSubscriptionMetrics).toHaveBeenCalled();
    });
  });

  describe('getCustomerMetrics', () => {
    it('should return customer metrics', async () => {
      const mockMetrics = {
        newCustomersCount: 15,
        totalCustomersCount: 100,
        averageRevenuePerUserBrl: 50,
        averageRevenuePerUserUsd: 10,
        customerLifetimeValueBrl: 600,
        customerLifetimeValueUsd: 120,
      };

      mockAnalyticsService.getCustomerMetrics.mockResolvedValue(mockMetrics);

      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const result = await controller.getCustomerMetrics(query);

      expect(result).toEqual(mockMetrics);
      expect(mockAnalyticsService.getCustomerMetrics).toHaveBeenCalled();
    });
  });

  describe('getCohortAnalysis', () => {
    it('should return cohort analysis', async () => {
      const mockCohorts = [
        {
          cohortDate: '2025-01-01',
          period: 0,
          customersCount: 100,
          retainedCount: 100,
          retentionRate: 100.0,
          revenueBrl: 5000,
          revenueUsd: 1000,
        },
      ];

      mockAnalyticsService.getCohortAnalysis.mockResolvedValue(mockCohorts);

      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const result = await controller.getCohortAnalysis(query);

      expect(result).toEqual(mockCohorts);
      expect(mockAnalyticsService.getCohortAnalysis).toHaveBeenCalledWith(query);
    });
  });

  describe('getAffiliateMetrics', () => {
    it('should return affiliate metrics', async () => {
      const mockAffiliates = [
        {
          affiliateId: 'affiliate-1',
          salesCount: 10,
          revenueBrl: 1000,
          revenueUsd: 200,
          conversionRate: 5.0,
          newCustomersCount: 8,
          repeatCustomersCount: 2,
        },
      ];

      mockAnalyticsService.getAffiliateMetrics.mockResolvedValue(mockAffiliates);

      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const result = await controller.getAffiliateMetrics(query);

      expect(result).toEqual(mockAffiliates);
      expect(mockAnalyticsService.getAffiliateMetrics).toHaveBeenCalledWith(query);
    });
  });

  describe('getMetricsHistory', () => {
    it('should return metrics history', async () => {
      const mockHistory = [
        {
          date: '2025-01-01',
          mrrBrl: 1000,
          mrrUsd: 200,
          activeSubscriptions: 50,
          newSubscriptions: 8,
          churnRate: 4.0,
          revenueBrl: 5000,
          revenueUsd: 1000,
        },
      ];

      mockAnalyticsService.getMetricsHistory.mockResolvedValue(mockHistory);

      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const result = await controller.getMetricsHistory(query);

      expect(result).toEqual(mockHistory);
      expect(mockAnalyticsService.getMetricsHistory).toHaveBeenCalledWith(query);
    });
  });

  describe('generateReport', () => {
    it('should generate a report', async () => {
      const mockReport = {
        id: 'report-123',
        type: ReportType.REVENUE,
        status: 'processing',
        progress: 0,
        createdAt: '2025-01-01T00:00:00Z',
      };

      mockReportsService.generateReport.mockResolvedValue(mockReport);

      const dto = {
        type: ReportType.REVENUE,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        format: ReportFormat.PDF,
      };

      const result = await controller.generateReport(dto);

      expect(result).toEqual(mockReport);
      expect(mockReportsService.generateReport).toHaveBeenCalledWith(dto);
    });
  });

  describe('getReportStatus', () => {
    it('should return report status', async () => {
      const mockStatus = {
        id: 'report-123',
        type: ReportType.REVENUE,
        status: 'completed',
        progress: 100,
        downloadUrl: '/reports/report-123/download',
        createdAt: '2025-01-01T00:00:00Z',
        completedAt: '2025-01-01T00:05:00Z',
      };

      mockReportsService.getReportStatus.mockResolvedValue(mockStatus);

      const result = await controller.getReportStatus('report-123');

      expect(result).toEqual(mockStatus);
      expect(mockReportsService.getReportStatus).toHaveBeenCalledWith('report-123');
    });

    it('should return null when report not found', async () => {
      mockReportsService.getReportStatus.mockResolvedValue(null);

      const result = await controller.getReportStatus('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('downloadReport', () => {
    it('should download report when available', async () => {
      const mockData = Buffer.from('test report data');
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      };

      mockReportsService.downloadReport.mockResolvedValue(mockData);

      await controller.downloadReport('report-123', mockResponse as any);

      expect(mockReportsService.downloadReport).toHaveBeenCalledWith('report-123');
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="report_report-123.pdf"',
      });
      expect(mockResponse.send).toHaveBeenCalledWith(mockData);
    });

    it('should return 404 when report not found', async () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      mockReportsService.downloadReport.mockResolvedValue(null);

      await controller.downloadReport('non-existent', mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Report not found or not ready',
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

      const result = (controller as any).buildWhereClause(query);

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

      const result = (controller as any).buildWhereClause(query);

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

      const result = (controller as any).buildWhereClause(query);

      expect(result.metricDate).toEqual({
        lte: new Date('2025-01-31'),
      });
      expect(result.productId).toBe('product-1');
    });

    it('should build empty where clause for empty query', () => {
      const query = {};

      const result = (controller as any).buildWhereClause(query);

      expect(result).toEqual({});
    });
  });
});

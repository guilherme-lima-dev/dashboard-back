import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportType, ReportFormat } from './dto';

describe('ReportsService', () => {
  let service: ReportsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    dailyMetrics: {
      findMany: jest.fn(),
    },
    affiliateMetrics: {
      findMany: jest.fn(),
    },
    cohortAnalysis: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    it('should generate a revenue report', async () => {
      const dto = {
        type: ReportType.REVENUE,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        format: ReportFormat.PDF,
      };

      const result = await service.generateReport(dto);

      expect(result).toEqual({
        id: expect.any(String),
        type: ReportType.REVENUE,
        status: 'processing',
        progress: expect.any(Number),
        createdAt: expect.any(String),
      });
    });

    it('should generate a subscription report', async () => {
      const dto = {
        type: ReportType.SUBSCRIPTIONS,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        format: ReportFormat.CSV,
      };

      const result = await service.generateReport(dto);

      expect(result.type).toBe(ReportType.SUBSCRIPTIONS);
      expect(result.status).toBe('processing');
    });
  });

  describe('getReportStatus', () => {
    it('should return report status when found', async () => {
      const reportId = 'report-123';
      const mockReport = {
        id: reportId,
        type: ReportType.REVENUE,
        status: 'completed',
        progress: 100,
        createdAt: '2025-01-01T00:00:00Z',
      };

      (service as any).reportJobs.set(reportId, mockReport);

      const result = await service.getReportStatus(reportId);

      expect(result).toEqual(mockReport);
    });

    it('should return null when report not found', async () => {
      const result = await service.getReportStatus('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('downloadReport', () => {
    it('should return report data when completed', async () => {
      const reportId = 'report-123';
      const mockData = Buffer.from('test data');
      const mockReport = {
        id: reportId,
        type: ReportType.REVENUE,
        status: 'completed',
        progress: 100,
        data: mockData,
      };

      (service as any).reportJobs.set(reportId, mockReport);

      const result = await service.downloadReport(reportId);

      expect(result).toEqual(mockData);
    });

    it('should return null when report not completed', async () => {
      const reportId = 'report-123';
      const mockReport = {
        id: reportId,
        type: ReportType.REVENUE,
        status: 'processing',
        progress: 50,
      };

      (service as any).reportJobs.set(reportId, mockReport);

      const result = await service.downloadReport(reportId);

      expect(result).toBeNull();
    });

    it('should return null when report not found', async () => {
      const result = await service.downloadReport('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('collectReportData', () => {
    it('should collect revenue data', async () => {
      const mockData = [
        {
          metricDate: new Date('2025-01-01'),
          mrrBrl: 1000,
          mrrUsd: 200,
          arrBrl: 12000,
          arrUsd: 2400,
          revenueBrl: 5000,
          revenueUsd: 1000,
          refundsBrl: 100,
          refundsUsd: 20,
        },
      ];

      mockPrismaService.dailyMetrics.findMany.mockResolvedValue(mockData);

      const whereClause = { platformId: 'platform-1' };
      const result = await (service as any).collectReportData({
        type: ReportType.REVENUE,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(result.title).toBe('Revenue Report');
      expect(result.description).toBe('Monthly and annual recurring revenue analysis');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].date).toBe('2025-01-01');
      expect(result.data[0].mrrBrl).toBe(1000);
    });

    it('should collect subscription data', async () => {
      const mockData = [
        {
          metricDate: new Date('2025-01-01'),
          activeSubscriptionsCount: 50,
          trialSubscriptionsCount: 10,
          canceledSubscriptionsCount: 5,
          newSubscriptionsCount: 8,
          churnCount: 2,
          churnRate: 4.0,
          trialConversionRate: 80.0,
        },
      ];

      mockPrismaService.dailyMetrics.findMany.mockResolvedValue(mockData);

      const result = await (service as any).collectReportData({
        type: ReportType.SUBSCRIPTIONS,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(result.title).toBe('Subscriptions Report');
      expect(result.description).toBe('Subscription metrics and churn analysis');
      expect(result.data[0].activeSubscriptions).toBe(50);
    });

    it('should collect customer data', async () => {
      const mockData = [
        {
          metricDate: new Date('2025-01-01'),
          newCustomersCount: 15,
          totalCustomersCount: 100,
          averageRevenuePerUserBrl: 50,
          averageRevenuePerUserUsd: 10,
          customerLifetimeValueBrl: 600,
          customerLifetimeValueUsd: 120,
        },
      ];

      mockPrismaService.dailyMetrics.findMany.mockResolvedValue(mockData);

      const result = await (service as any).collectReportData({
        type: ReportType.CUSTOMERS,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(result.title).toBe('Customers Report');
      expect(result.description).toBe('Customer acquisition and lifetime value analysis');
      expect(result.data[0].newCustomers).toBe(15);
    });

    it('should collect churn data', async () => {
      const mockData = [
        {
          metricDate: new Date('2025-01-01'),
          churnCount: 2,
          churnRate: 4.0,
          activeSubscriptionsCount: 50,
          canceledSubscriptionsCount: 5,
        },
      ];

      mockPrismaService.dailyMetrics.findMany.mockResolvedValue(mockData);

      const result = await (service as any).collectReportData({
        type: ReportType.CHURN,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(result.title).toBe('Churn Analysis Report');
      expect(result.description).toBe('Customer churn and retention analysis');
      expect(result.data[0].churnCount).toBe(2);
    });

    it('should collect affiliate data', async () => {
      const mockData = [
        {
          affiliateId: 'affiliate-1',
          metricDate: new Date('2025-01-01'),
          salesCount: 10,
          revenueBrl: 1000,
          revenueUsd: 200,
          conversionRate: 5.0,
          newCustomersCount: 8,
          repeatCustomersCount: 2,
        },
      ];

      mockPrismaService.affiliateMetrics.findMany.mockResolvedValue(mockData);

      const result = await (service as any).collectReportData({
        type: ReportType.AFFILIATES,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(result.title).toBe('Affiliates Report');
      expect(result.description).toBe('Affiliate performance and revenue analysis');
      expect(result.data[0].affiliateId).toBe('affiliate-1');
    });

    it('should collect cohort data', async () => {
      const mockData = [
        {
          cohortDate: new Date('2025-01-01'),
          period: 0,
          customersCount: 100,
          retainedCount: 100,
          retentionRate: 100.0,
          revenueBrl: 5000,
          revenueUsd: 1000,
        },
      ];

      mockPrismaService.cohortAnalysis.findMany.mockResolvedValue(mockData);

      const result = await (service as any).collectReportData({
        type: ReportType.COHORT,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(result.title).toBe('Cohort Analysis Report');
      expect(result.description).toBe('Customer retention by cohort analysis');
      expect(result.data[0].cohortDate).toBe('2025-01-01');
    });

    it('should throw error for unknown report type', async () => {
      await expect(
        (service as any).collectReportData({
          type: 'unknown' as ReportType,
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        }),
      ).rejects.toThrow('Unknown report type: unknown');
    });
  });

  describe('formatReportData', () => {
    it('should format report data correctly', () => {
      const dto = {
        type: ReportType.REVENUE,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        platformIds: ['platform-1'],
        productIds: ['product-1'],
        affiliateIds: ['affiliate-1'],
      };

      const data = {
        title: 'Test Report',
        description: 'Test Description',
        data: [{ test: 'value' }],
      };

      const result = (service as any).formatReportData(dto, data);

      expect(result.title).toBe('Test Report');
      expect(result.description).toBe('Test Description');
      expect(result.generatedAt).toBeDefined();
      expect(result.periodStart).toBe('2025-01-01');
      expect(result.periodEnd).toBe('2025-01-31');
      expect(result.filters.platformIds).toEqual(['platform-1']);
      expect(result.filters.productIds).toEqual(['product-1']);
      expect(result.filters.affiliateIds).toEqual(['affiliate-1']);
    });
  });

  describe('generateFile', () => {
    it('should generate CSV file', async () => {
      const data = {
        data: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      };

      const result = await (service as any).generateFile(ReportFormat.CSV, data);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toContain('name,age');
      expect(result.toString()).toContain('"John","30"');
    });

    it('should generate Excel file', async () => {
      const data = {
        data: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      };

      const result = await (service as any).generateFile(ReportFormat.EXCEL, data);

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should generate PDF file by default', async () => {
      const data = {
        data: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      };

      const result = await (service as any).generateFile(ReportFormat.PDF, data);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toContain('<!DOCTYPE html>');
    });
  });

  describe('convertToCSV', () => {
    it('should convert data to CSV format', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ];

      const result = (service as any).convertToCSV(data);

      expect(result).toContain('name,age');
      expect(result).toContain('"John","30"');
      expect(result).toContain('"Jane","25"');
    });

    it('should return empty string for empty data', () => {
      const result = (service as any).convertToCSV([]);

      expect(result).toBe('');
    });
  });

  describe('convertToHTML', () => {
    it('should convert data to HTML format', () => {
      const data = {
        title: 'Test Report',
        description: 'Test Description',
        data: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      };

      const result = (service as any).convertToHTML(data);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<title>Test Report</title>');
      expect(result).toContain('<h1>Test Report</h1>');
      expect(result).toContain('<table>');
      expect(result).toContain('<th>name</th>');
      expect(result).toContain('<th>age</th>');
    });
  });

  describe('buildWhereClause', () => {
    it('should build where clause with all filters', () => {
      const dto = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        platformIds: ['platform-1', 'platform-2'],
        productIds: ['product-1'],
        affiliateIds: ['affiliate-1'],
      };

      const result = (service as any).buildWhereClause(dto);

      expect(result.metricDate).toEqual({
        gte: new Date('2025-01-01'),
        lte: new Date('2025-01-31'),
      });
      expect(result.platformId).toEqual({ in: ['platform-1', 'platform-2'] });
      expect(result.productId).toEqual({ in: ['product-1'] });
      expect(result.affiliateId).toEqual({ in: ['affiliate-1'] });
    });

    it('should build where clause with partial filters', () => {
      const dto = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        platformIds: ['platform-1'],
      };

      const result = (service as any).buildWhereClause(dto);

      expect(result.metricDate).toEqual({
        gte: new Date('2025-01-01'),
        lte: new Date('2025-01-31'),
      });
      expect(result.platformId).toEqual({ in: ['platform-1'] });
      expect(result.productId).toBeUndefined();
      expect(result.affiliateId).toBeUndefined();
    });

    it('should build empty where clause for empty dto', () => {
      const dto = {};

      const result = (service as any).buildWhereClause(dto);

      expect(result).toEqual({});
    });
  });

  describe('generateReportId', () => {
    it('should generate unique report ID', () => {
      const id1 = (service as any).generateReportId();
      const id2 = (service as any).generateReportId();

      expect(id1).toMatch(/^report_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^report_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});

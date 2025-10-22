import { Test, TestingModule } from '@nestjs/testing';
import { MetricsCalculatorProcessor } from './metrics-calculator.processor';
import { MetricsService } from '../metrics.service';

describe('MetricsCalculatorProcessor', () => {
  let processor: MetricsCalculatorProcessor;
  let metricsService: MetricsService;

  const mockMetricsService = {
    calculateDailyMetrics: jest.fn(),
    calculateCohortAnalysis: jest.fn(),
    calculateAffiliateMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsCalculatorProcessor,
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    processor = module.get<MetricsCalculatorProcessor>(MetricsCalculatorProcessor);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDailyMetrics', () => {
    it('should process daily metrics calculation', async () => {
      const jobData = {
        type: 'daily' as const,
        date: '2025-01-01',
        platformId: 'platform-1',
        productId: 'product-1',
      };

      const mockJob = {
        data: jobData,
      } as any;

      mockMetricsService.calculateDailyMetrics.mockResolvedValue(undefined);

      await processor.handleDailyMetrics(mockJob);

      expect(mockMetricsService.calculateDailyMetrics).toHaveBeenCalledWith(
        new Date('2025-01-01'),
        'platform-1',
        'product-1',
      );
    });

    it('should process daily metrics without platform and product', async () => {
      const jobData = {
        type: 'daily' as const,
        date: '2025-01-01',
      };

      const mockJob = {
        data: jobData,
      } as any;

      mockMetricsService.calculateDailyMetrics.mockResolvedValue(undefined);

      await processor.handleDailyMetrics(mockJob);

      expect(mockMetricsService.calculateDailyMetrics).toHaveBeenCalledWith(
        new Date('2025-01-01'),
        undefined,
        undefined,
      );
    });

    it('should throw error when calculation fails', async () => {
      const jobData = {
        type: 'daily' as const,
        date: '2025-01-01',
        platformId: 'platform-1',
      };

      const mockJob = {
        data: jobData,
      } as any;

      const error = new Error('Calculation failed');
      mockMetricsService.calculateDailyMetrics.mockRejectedValue(error);

      await expect(processor.handleDailyMetrics(mockJob)).rejects.toThrow(
        'Calculation failed',
      );
    });
  });

  describe('handleCohortAnalysis', () => {
    it('should process cohort analysis calculation', async () => {
      const jobData = {
        type: 'cohort' as const,
        date: '2025-01-01',
        platformId: 'platform-1',
        productId: 'product-1',
      };

      const mockJob = {
        data: jobData,
      } as any;

      mockMetricsService.calculateCohortAnalysis.mockResolvedValue(undefined);

      await processor.handleCohortAnalysis(mockJob);

      expect(mockMetricsService.calculateCohortAnalysis).toHaveBeenCalledWith(
        new Date('2025-01-01'),
        'platform-1',
        'product-1',
      );
    });

    it('should process cohort analysis without platform and product', async () => {
      const jobData = {
        type: 'cohort' as const,
        date: '2025-01-01',
      };

      const mockJob = {
        data: jobData,
      } as any;

      mockMetricsService.calculateCohortAnalysis.mockResolvedValue(undefined);

      await processor.handleCohortAnalysis(mockJob);

      expect(mockMetricsService.calculateCohortAnalysis).toHaveBeenCalledWith(
        new Date('2025-01-01'),
        undefined,
        undefined,
      );
    });

    it('should throw error when cohort calculation fails', async () => {
      const jobData = {
        type: 'cohort' as const,
        date: '2025-01-01',
      };

      const mockJob = {
        data: jobData,
      } as any;

      const error = new Error('Cohort calculation failed');
      mockMetricsService.calculateCohortAnalysis.mockRejectedValue(error);

      await expect(processor.handleCohortAnalysis(mockJob)).rejects.toThrow(
        'Cohort calculation failed',
      );
    });
  });

  describe('handleAffiliateMetrics', () => {
    it('should process affiliate metrics calculation', async () => {
      const jobData = {
        type: 'affiliate' as const,
        date: '2025-01-01',
        platformId: 'platform-1',
      };

      const mockJob = {
        data: jobData,
      } as any;

      mockMetricsService.calculateAffiliateMetrics.mockResolvedValue(undefined);

      await processor.handleAffiliateMetrics(mockJob);

      expect(mockMetricsService.calculateAffiliateMetrics).toHaveBeenCalledWith(
        new Date('2025-01-01'),
        'platform-1',
      );
    });

    it('should process affiliate metrics without platform', async () => {
      const jobData = {
        type: 'affiliate' as const,
        date: '2025-01-01',
      };

      const mockJob = {
        data: jobData,
      } as any;

      mockMetricsService.calculateAffiliateMetrics.mockResolvedValue(undefined);

      await processor.handleAffiliateMetrics(mockJob);

      expect(mockMetricsService.calculateAffiliateMetrics).toHaveBeenCalledWith(
        new Date('2025-01-01'),
        undefined,
      );
    });

    it('should throw error when affiliate calculation fails', async () => {
      const jobData = {
        type: 'affiliate' as const,
        date: '2025-01-01',
      };

      const mockJob = {
        data: jobData,
      } as any;

      const error = new Error('Affiliate calculation failed');
      mockMetricsService.calculateAffiliateMetrics.mockRejectedValue(error);

      await expect(processor.handleAffiliateMetrics(mockJob)).rejects.toThrow(
        'Affiliate calculation failed',
      );
    });
  });

  describe('handleRecalculateAll', () => {
    it('should recalculate all metrics for date range', async () => {
      const jobData = {
        startDate: '2025-01-01',
        endDate: '2025-01-03',
      };

      const mockJob = {
        data: jobData,
      } as any;

      mockMetricsService.calculateDailyMetrics.mockResolvedValue(undefined);
      mockMetricsService.calculateCohortAnalysis.mockResolvedValue(undefined);
      mockMetricsService.calculateAffiliateMetrics.mockResolvedValue(undefined);

      await processor.handleRecalculateAll(mockJob);

      expect(mockMetricsService.calculateDailyMetrics).toHaveBeenCalledTimes(3);
      expect(mockMetricsService.calculateCohortAnalysis).toHaveBeenCalledTimes(3);
      expect(mockMetricsService.calculateAffiliateMetrics).toHaveBeenCalledTimes(3);
    });

    it('should recalculate all metrics for single day', async () => {
      const jobData = {
        startDate: '2025-01-01',
        endDate: '2025-01-01',
      };

      const mockJob = {
        data: jobData,
      } as any;

      mockMetricsService.calculateDailyMetrics.mockResolvedValue(undefined);
      mockMetricsService.calculateCohortAnalysis.mockResolvedValue(undefined);
      mockMetricsService.calculateAffiliateMetrics.mockResolvedValue(undefined);

      await processor.handleRecalculateAll(mockJob);

      expect(mockMetricsService.calculateDailyMetrics).toHaveBeenCalledTimes(1);
      expect(mockMetricsService.calculateCohortAnalysis).toHaveBeenCalledTimes(1);
      expect(mockMetricsService.calculateAffiliateMetrics).toHaveBeenCalledTimes(1);
    });

    it('should throw error when recalculation fails', async () => {
      const jobData = {
        startDate: '2025-01-01',
        endDate: '2025-01-01',
      };

      const mockJob = {
        data: jobData,
      } as any;

      const error = new Error('Recalculation failed');
      mockMetricsService.calculateDailyMetrics.mockRejectedValue(error);

      await expect(processor.handleRecalculateAll(mockJob)).rejects.toThrow(
        'Recalculation failed',
      );
    });
  });
});

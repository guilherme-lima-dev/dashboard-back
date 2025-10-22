import { Test, TestingModule } from '@nestjs/testing';
import { AffiliatesController } from './affiliates.controller';
import { AffiliatesService } from './affiliates.service';
import { CreateAffiliateDto, UpdateAffiliateDto, AffiliateQueryDto, AffiliatePerformanceDto, AffiliateDashboardDto, AffiliateTier } from './dto';

describe('AffiliatesController', () => {
  let controller: AffiliatesController;
  let service: AffiliatesService;

  const mockAffiliatesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByExternalId: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getPerformance: jest.fn(),
    getDashboard: jest.fn(),
    recalculateTiers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AffiliatesController],
      providers: [
        {
          provide: AffiliatesService,
          useValue: mockAffiliatesService,
        },
      ],
    }).compile();

    controller = module.get<AffiliatesController>(AffiliatesController);
    service = module.get<AffiliatesService>(AffiliatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new affiliate', async () => {
      const createDto: CreateAffiliateDto = {
        platformId: 'platform-1',
        externalAffiliateId: 'affiliate-123',
        name: 'Test Affiliate',
        email: 'test@affiliate.com',
        tier: AffiliateTier.BRONZE,
      };

      const mockAffiliate = {
        id: 'affiliate-id',
        ...createDto,
        totalSalesCount: 0,
        totalRevenueBrl: 0,
        totalRevenueUsd: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAffiliatesService.create.mockResolvedValue(mockAffiliate);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockAffiliate);
      expect(mockAffiliatesService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated affiliates', async () => {
      const query: AffiliateQueryDto = {
        page: 1,
        limit: 10,
        platformId: 'platform-1',
      };

      const mockResult = {
        data: [
          {
            id: 'affiliate-1',
            name: 'Test Affiliate',
            totalRevenueBrl: 1000,
            totalRevenueUsd: 200,
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      mockAffiliatesService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockResult);
      expect(mockAffiliatesService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getPerformance', () => {
    it('should return affiliate performance metrics', async () => {
      const query: AffiliateQueryDto = {
        platformId: 'platform-1',
        limit: 10,
      };

      const mockPerformance: AffiliatePerformanceDto[] = [
        {
          affiliateId: 'affiliate-1',
          name: 'Test Affiliate',
          tier: 'gold',
          salesCount: 10,
          revenueBrl: 1000,
          revenueUsd: 200,
          conversionRate: 80,
          newCustomersCount: 8,
          repeatCustomersCount: 5,
          averageOrderValueBrl: 100,
          averageOrderValueUsd: 20,
          firstSaleAt: new Date('2025-01-01'),
          lastSaleAt: new Date('2025-01-15'),
        },
      ];

      mockAffiliatesService.getPerformance.mockResolvedValue(mockPerformance);

      const result = await controller.getPerformance(query);

      expect(result).toEqual(mockPerformance);
      expect(mockAffiliatesService.getPerformance).toHaveBeenCalledWith(query);
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard data', async () => {
      const mockDashboard: AffiliateDashboardDto = {
        totalAffiliates: 10,
        activeAffiliates: 8,
        totalRevenueBrl: 5000,
        totalRevenueUsd: 1000,
        topPerformers: [],
        tierDistribution: {
          bronze: 5,
          silver: 3,
          gold: 2,
          diamond: 1,
        },
      };

      mockAffiliatesService.getDashboard.mockResolvedValue(mockDashboard);

      const result = await controller.getDashboard();

      expect(result).toEqual(mockDashboard);
      expect(mockAffiliatesService.getDashboard).toHaveBeenCalled();
    });
  });

  describe('recalculateTiers', () => {
    it('should recalculate all affiliate tiers', async () => {
      mockAffiliatesService.recalculateTiers.mockResolvedValue(undefined);

      const result = await controller.recalculateTiers();

      expect(result).toEqual({ message: 'Tiers recalculated successfully' });
      expect(mockAffiliatesService.recalculateTiers).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return affiliate by ID', async () => {
      const affiliateId = 'affiliate-1';
      const mockAffiliate = {
        id: affiliateId,
        name: 'Test Affiliate',
        email: 'test@affiliate.com',
      };

      mockAffiliatesService.findOne.mockResolvedValue(mockAffiliate);

      const result = await controller.findOne(affiliateId);

      expect(result).toEqual(mockAffiliate);
      expect(mockAffiliatesService.findOne).toHaveBeenCalledWith(affiliateId);
    });
  });

  describe('findByExternalId', () => {
    it('should return affiliate by external ID', async () => {
      const platformId = 'platform-1';
      const externalId = 'external-123';
      const mockAffiliate = {
        id: 'affiliate-1',
        platformId,
        externalAffiliateId: externalId,
      };

      mockAffiliatesService.findByExternalId.mockResolvedValue(mockAffiliate);

      const result = await controller.findByExternalId(platformId, externalId);

      expect(result).toEqual(mockAffiliate);
      expect(mockAffiliatesService.findByExternalId).toHaveBeenCalledWith(
        platformId,
        externalId,
      );
    });
  });

  describe('update', () => {
    it('should update affiliate', async () => {
      const affiliateId = 'affiliate-1';
      const updateDto: UpdateAffiliateDto = {
        name: 'Updated Name',
        email: 'updated@affiliate.com',
      };

      const mockUpdatedAffiliate = {
        id: affiliateId,
        ...updateDto,
      };

      mockAffiliatesService.update.mockResolvedValue(mockUpdatedAffiliate);

      const result = await controller.update(affiliateId, updateDto);

      expect(result).toEqual(mockUpdatedAffiliate);
      expect(mockAffiliatesService.update).toHaveBeenCalledWith(
        affiliateId,
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete affiliate', async () => {
      const affiliateId = 'affiliate-1';

      mockAffiliatesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(affiliateId);

      expect(result).toBeUndefined();
      expect(mockAffiliatesService.remove).toHaveBeenCalledWith(affiliateId);
    });
  });
});

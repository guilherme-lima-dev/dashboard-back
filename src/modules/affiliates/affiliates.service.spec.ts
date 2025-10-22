import { Test, TestingModule } from '@nestjs/testing';
import { AffiliatesService } from './affiliates.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AffiliateTier } from './dto';
import { Decimal } from '@prisma/client/runtime/library';

describe('AffiliatesService', () => {
  let service: AffiliatesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    affiliate: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliatesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AffiliatesService>(AffiliatesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new affiliate', async () => {
      const dto = {
        platformId: 'platform-1',
        externalAffiliateId: 'affiliate-123',
        name: 'Test Affiliate',
        email: 'test@affiliate.com',
        tier: AffiliateTier.BRONZE,
      };

      mockPrismaService.affiliate.findUnique.mockResolvedValue(null);
      mockPrismaService.affiliate.create.mockResolvedValue({
        id: 'affiliate-id',
        ...dto,
        totalSalesCount: 0,
        totalRevenueBrl: new Decimal(0),
        totalRevenueUsd: new Decimal(0),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(mockPrismaService.affiliate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          platformId: dto.platformId,
          externalAffiliateId: dto.externalAffiliateId,
          name: dto.name,
          email: dto.email,
          tier: dto.tier,
        }),
      });
    });

    it('should return existing affiliate if already exists', async () => {
      const dto = {
        platformId: 'platform-1',
        externalAffiliateId: 'affiliate-123',
        name: 'Test Affiliate',
        email: 'test@affiliate.com',
      };

      const existingAffiliate = {
        id: 'existing-id',
        platformId: 'platform-1',
        externalAffiliateId: 'affiliate-123',
        name: 'Existing Affiliate',
        email: 'existing@affiliate.com',
      };

      mockPrismaService.affiliate.findUnique.mockResolvedValue(existingAffiliate);

      const result = await service.create(dto);

      expect(result).toEqual(existingAffiliate);
      expect(mockPrismaService.affiliate.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated affiliates', async () => {
      const query = {
        page: 1,
        limit: 10,
        platformId: 'platform-1',
      };

      const mockAffiliates = [
        {
          id: 'affiliate-1',
          name: 'Affiliate 1',
          totalRevenueBrl: new Decimal(1000),
          totalRevenueUsd: new Decimal(200),
        },
      ];

      mockPrismaService.affiliate.findMany.mockResolvedValue(mockAffiliates);
      mockPrismaService.affiliate.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toEqual(mockAffiliates);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should apply filters correctly', async () => {
      const query = {
        platformId: 'platform-1',
        tier: 'gold',
        isActive: true,
        search: 'test',
      };

      mockPrismaService.affiliate.findMany.mockResolvedValue([]);
      mockPrismaService.affiliate.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(mockPrismaService.affiliate.findMany).toHaveBeenCalledWith({
        where: {
          platformId: 'platform-1',
          tier: 'gold',
          isActive: true,
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { email: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 20,
        orderBy: { totalRevenueBrl: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return affiliate by ID', async () => {
      const affiliateId = 'affiliate-1';
      const mockAffiliate = {
        id: affiliateId,
        name: 'Test Affiliate',
      };

      mockPrismaService.affiliate.findUnique.mockResolvedValue(mockAffiliate);

      const result = await service.findOne(affiliateId);

      expect(result).toEqual(mockAffiliate);
      expect(mockPrismaService.affiliate.findUnique).toHaveBeenCalledWith({
        where: { id: affiliateId },
      });
    });

    it('should throw NotFoundException when affiliate not found', async () => {
      const affiliateId = 'non-existent';

      mockPrismaService.affiliate.findUnique.mockResolvedValue(null);

      await expect(service.findOne(affiliateId)).rejects.toThrow(
        `Affiliate with ID ${affiliateId} not found`,
      );
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

      mockPrismaService.affiliate.findUnique.mockResolvedValue(mockAffiliate);

      const result = await service.findByExternalId(platformId, externalId);

      expect(result).toEqual(mockAffiliate);
      expect(mockPrismaService.affiliate.findUnique).toHaveBeenCalledWith({
        where: {
          platformId_externalAffiliateId: {
            platformId,
            externalAffiliateId: externalId,
          },
        },
      });
    });
  });

  describe('update', () => {
    it('should update affiliate', async () => {
      const affiliateId = 'affiliate-1';
      const updateDto = {
        name: 'Updated Name',
        email: 'updated@affiliate.com',
      };

      const existingAffiliate = {
        id: affiliateId,
        name: 'Original Name',
        totalRevenueBrl: new Decimal(1000),
      };

      const updatedAffiliate = {
        ...existingAffiliate,
        ...updateDto,
      };

      mockPrismaService.affiliate.findUnique.mockResolvedValue(existingAffiliate);
      mockPrismaService.affiliate.update.mockResolvedValue(updatedAffiliate);

      const result = await service.update(affiliateId, updateDto);

      expect(result).toEqual(updatedAffiliate);
      expect(mockPrismaService.affiliate.update).toHaveBeenCalledWith({
        where: { id: affiliateId },
        data: {
          ...updateDto,
          tier: expect.any(String),
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('remove', () => {
    it('should delete affiliate', async () => {
      const affiliateId = 'affiliate-1';
      const mockAffiliate = { id: affiliateId };

      mockPrismaService.affiliate.findUnique.mockResolvedValue(mockAffiliate);
      mockPrismaService.affiliate.delete.mockResolvedValue(mockAffiliate);

      await service.remove(affiliateId);

      expect(mockPrismaService.affiliate.delete).toHaveBeenCalledWith({
        where: { id: affiliateId },
      });
    });
  });

  describe('upsert', () => {
    it('should create new affiliate if not exists', async () => {
      const platformId = 'platform-1';
      const externalId = 'external-123';
      const data = {
        name: 'New Affiliate',
        email: 'new@affiliate.com',
      };

      const createdAffiliate = {
        id: 'new-id',
        platformId,
        externalAffiliateId: externalId,
        ...data,
      };

      mockPrismaService.affiliate.upsert.mockResolvedValue(createdAffiliate);

      const result = await service.upsert(platformId, externalId, data);

      expect(result).toEqual(createdAffiliate);
      expect(mockPrismaService.affiliate.upsert).toHaveBeenCalledWith({
        where: {
          platformId_externalAffiliateId: {
            platformId,
            externalAffiliateId: externalId,
          },
        },
        update: {
          ...data,
          updatedAt: expect.any(Date),
        },
        create: expect.objectContaining({
          platformId,
          externalAffiliateId: externalId,
          ...data,
        }),
      });
    });
  });

  describe('updateStats', () => {
    it('should update affiliate statistics', async () => {
      const affiliateId = 'affiliate-1';
      const revenueBrl = 100;
      const revenueUsd = 20;

      const existingAffiliate = {
        id: affiliateId,
        totalSalesCount: 5,
        totalRevenueBrl: new Decimal(500),
        totalRevenueUsd: new Decimal(100),
        firstSaleAt: new Date('2025-01-01'),
      };

      const updatedAffiliate = {
        ...existingAffiliate,
        totalSalesCount: 6,
        totalRevenueBrl: new Decimal(600),
        totalRevenueUsd: new Decimal(120),
        lastSaleAt: new Date(),
      };

      mockPrismaService.affiliate.findUnique.mockResolvedValue(existingAffiliate);
      mockPrismaService.affiliate.update.mockResolvedValue(updatedAffiliate);

      const result = await service.updateStats(affiliateId, revenueBrl, revenueUsd);

      expect(result).toEqual(updatedAffiliate);
      expect(mockPrismaService.affiliate.update).toHaveBeenCalledWith({
        where: { id: affiliateId },
        data: {
          totalSalesCount: 6,
          totalRevenueBrl: 600,
          totalRevenueUsd: 120,
          tier: expect.any(String),
          lastSaleAt: expect.any(Date),
          firstSaleAt: existingAffiliate.firstSaleAt,
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getPerformance', () => {
    it('should return affiliate performance metrics', async () => {
      const query = {
        platformId: 'platform-1',
        limit: 10,
      };

      const mockAffiliates = [
        {
          id: 'affiliate-1',
          name: 'Test Affiliate',
          tier: 'gold',
          totalSalesCount: 10,
          totalRevenueBrl: new Decimal(1000),
          totalRevenueUsd: new Decimal(200),
          firstSaleAt: new Date('2025-01-01'),
          lastSaleAt: new Date('2025-01-15'),
          _count: {
            orders: 8,
            subscriptions: 5,
          },
        },
      ];

      mockPrismaService.affiliate.findMany.mockResolvedValue(mockAffiliates);

      const result = await service.getPerformance(query);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
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
      });
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard metrics', async () => {
      const mockStats = {
        _sum: {
          totalRevenueBrl: new Decimal(5000),
          totalRevenueUsd: new Decimal(1000),
        },
      };

      const mockTiers = [
        { tier: 'bronze', _count: { tier: 5 } },
        { tier: 'silver', _count: { tier: 3 } },
        { tier: 'gold', _count: { tier: 2 } },
        { tier: 'diamond', _count: { tier: 1 } },
      ];

      mockPrismaService.affiliate.count
        .mockResolvedValueOnce(11) // totalAffiliates
        .mockResolvedValueOnce(8); // activeAffiliates

      mockPrismaService.affiliate.aggregate.mockResolvedValue(mockStats);
      mockPrismaService.affiliate.groupBy.mockResolvedValue(mockTiers);

      // Mock getPerformance method
      jest.spyOn(service, 'getPerformance').mockResolvedValue([]);

      const result = await service.getDashboard();

      expect(result).toEqual({
        totalAffiliates: 11,
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
      });
    });
  });

  describe('calculateTier', () => {
    it('should calculate correct tier based on revenue', () => {
      expect((service as any).calculateTier(5000)).toBe(AffiliateTier.BRONZE);
      expect((service as any).calculateTier(15000)).toBe(AffiliateTier.SILVER);
      expect((service as any).calculateTier(75000)).toBe(AffiliateTier.GOLD);
      expect((service as any).calculateTier(150000)).toBe(AffiliateTier.DIAMOND);
    });
  });

  describe('recalculateTiers', () => {
    it('should recalculate all affiliate tiers', async () => {
      const mockAffiliates = [
        { id: 'affiliate-1', totalRevenueBrl: new Decimal(5000) },
        { id: 'affiliate-2', totalRevenueBrl: new Decimal(15000) },
      ];

      mockPrismaService.affiliate.findMany.mockResolvedValue(mockAffiliates);
      mockPrismaService.affiliate.update.mockResolvedValue({});

      await service.recalculateTiers();

      expect(mockPrismaService.affiliate.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.affiliate.update).toHaveBeenCalledWith({
        where: { id: 'affiliate-1' },
        data: { tier: AffiliateTier.BRONZE },
      });
      expect(mockPrismaService.affiliate.update).toHaveBeenCalledWith({
        where: { id: 'affiliate-2' },
        data: { tier: AffiliateTier.SILVER },
      });
    });
  });
});

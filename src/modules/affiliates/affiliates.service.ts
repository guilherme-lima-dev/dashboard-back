import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAffiliateDto, UpdateAffiliateDto, AffiliateQueryDto, AffiliatePerformanceDto, AffiliateDashboardDto, AffiliateTier } from './dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger(AffiliatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAffiliateDto) {
    this.logger.log(`Creating affiliate: ${dto.name} (${dto.externalAffiliateId})`);

    // Check if affiliate already exists
    const existing = await this.prisma.affiliate.findUnique({
      where: {
        platformId_externalAffiliateId: {
          platformId: dto.platformId,
          externalAffiliateId: dto.externalAffiliateId,
        },
      },
    });

    if (existing) {
      this.logger.warn(`Affiliate already exists: ${dto.externalAffiliateId}`);
      return existing;
    }

    // Calculate initial tier based on revenue (if provided)
    const tier = dto.tier || this.calculateTier(0);

    const affiliate = await this.prisma.affiliate.create({
      data: {
        platformId: dto.platformId,
        externalAffiliateId: dto.externalAffiliateId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        tier,
        commissionRate: dto.commissionRate,
        instagramHandle: dto.instagramHandle,
        youtubeHandle: dto.youtubeHandle,
        tiktokHandle: dto.tiktokHandle,
        twitterHandle: dto.twitterHandle,
        isActive: dto.isActive ?? true,
        metadata: dto.metadata,
        totalSalesCount: 0,
        totalRevenueBrl: 0,
        totalRevenueUsd: 0,
      },
    });

    this.logger.log(`Affiliate created: ${affiliate.id}`);
    return affiliate;
  }

  async findAll(query: AffiliateQueryDto) {
    const { platformId, tier, isActive, search, page = 1, limit = 20, sortBy = 'totalRevenueBrl', sortOrder = 'desc' } = query;
    const skip = (page - 1) * Number(limit);

    const where: any = {};

    if (platformId) {
      where.platformId = platformId;
    }

    if (tier) {
      where.tier = tier;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [affiliates, total] = await Promise.all([
      this.prisma.affiliate.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy as string]: sortOrder },
      }),
      this.prisma.affiliate.count({ where }),
    ]);

    return {
      data: affiliates,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async findOne(id: string) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id },
    });

    if (!affiliate) {
      throw new NotFoundException(`Affiliate with ID ${id} not found`);
    }

    return affiliate;
  }

  async findByExternalId(platformId: string, externalAffiliateId: string) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: {
        platformId_externalAffiliateId: {
          platformId,
          externalAffiliateId,
        },
      },
    });

    if (!affiliate) {
      throw new NotFoundException(`Affiliate with external ID ${externalAffiliateId} not found`);
    }

    return affiliate;
  }

  async update(id: string, dto: UpdateAffiliateDto) {
    this.logger.log(`Updating affiliate: ${id}`);

    const affiliate = await this.findOne(id);

    // Recalculate tier if revenue is being updated
    let tier = dto.tier;
    if (dto.tier === undefined) {
      // Use current revenue from database for tier calculation
      tier = this.calculateTier(Number(affiliate.totalRevenueBrl));
    }

    const updatedAffiliate = await this.prisma.affiliate.update({
      where: { id },
      data: {
        ...dto,
        tier,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Affiliate updated: ${id}`);
    return updatedAffiliate;
  }

  async remove(id: string) {
    this.logger.log(`Deleting affiliate: ${id}`);

    await this.findOne(id);

    await this.prisma.affiliate.delete({
      where: { id },
    });

    this.logger.log(`Affiliate deleted: ${id}`);
  }

  async upsert(platformId: string, externalAffiliateId: string, data: Partial<CreateAffiliateDto>) {
    this.logger.log(`Upserting affiliate: ${externalAffiliateId}`);

    const affiliate = await this.prisma.affiliate.upsert({
      where: {
        platformId_externalAffiliateId: {
          platformId,
          externalAffiliateId,
        },
      },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: {
        platformId,
        externalAffiliateId,
        name: data.name || 'Unknown Affiliate',
        email: data.email || 'unknown@affiliate.com',
        phone: data.phone,
        tier: data.tier || AffiliateTier.BRONZE,
        commissionRate: data.commissionRate,
        instagramHandle: data.instagramHandle,
        youtubeHandle: data.youtubeHandle,
        tiktokHandle: data.tiktokHandle,
        twitterHandle: data.twitterHandle,
        isActive: data.isActive ?? true,
        metadata: data.metadata,
        totalSalesCount: 0,
        totalRevenueBrl: 0,
        totalRevenueUsd: 0,
      },
    });

    this.logger.log(`Affiliate upserted: ${affiliate.id}`);
    return affiliate;
  }

  async updateStats(affiliateId: string, revenueBrl: number, revenueUsd: number) {
    this.logger.log(`Updating stats for affiliate: ${affiliateId}`);

    const affiliate = await this.findOne(affiliateId);

    const newTotalRevenueBrl = Number(affiliate.totalRevenueBrl) + revenueBrl;
    const newTotalRevenueUsd = Number(affiliate.totalRevenueUsd) + revenueUsd;
    const newTier = this.calculateTier(newTotalRevenueBrl);

    const updatedAffiliate = await this.prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        totalSalesCount: affiliate.totalSalesCount + 1,
        totalRevenueBrl: newTotalRevenueBrl,
        totalRevenueUsd: newTotalRevenueUsd,
        tier: newTier,
        lastSaleAt: new Date(),
        firstSaleAt: affiliate.firstSaleAt || new Date(),
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Stats updated for affiliate: ${affiliateId} (${newTier})`);
    return updatedAffiliate;
  }

  async getPerformance(query: AffiliateQueryDto): Promise<AffiliatePerformanceDto[]> {
    const { platformId, tier, isActive, search, sortBy, sortOrder, limit = 20 } = query;

    const where: any = {};

    if (platformId) {
      where.platformId = platformId;
    }

    if (tier) {
      where.tier = tier;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const affiliates = await this.prisma.affiliate.findMany({
      where,
      take: limit,
      orderBy: { [sortBy as string]: sortOrder },
      include: {
        _count: {
          select: {
            orders: true,
            subscriptions: true,
          },
        },
      },
    });

    return affiliates.map(affiliate => {
      const conversionRate = affiliate.totalSalesCount > 0 
        ? (affiliate._count.orders / affiliate.totalSalesCount) * 100 
        : 0;

      const averageOrderValueBrl = affiliate.totalSalesCount > 0 
        ? Number(affiliate.totalRevenueBrl) / affiliate.totalSalesCount 
        : 0;

      const averageOrderValueUsd = affiliate.totalSalesCount > 0 
        ? Number(affiliate.totalRevenueUsd) / affiliate.totalSalesCount 
        : 0;

      return {
        affiliateId: affiliate.id,
        name: affiliate.name,
        tier: affiliate.tier,
        salesCount: affiliate.totalSalesCount,
        revenueBrl: Number(affiliate.totalRevenueBrl),
        revenueUsd: Number(affiliate.totalRevenueUsd),
        conversionRate,
        newCustomersCount: affiliate._count.orders,
        repeatCustomersCount: affiliate._count.subscriptions,
        averageOrderValueBrl,
        averageOrderValueUsd,
        firstSaleAt: affiliate.firstSaleAt || undefined,
        lastSaleAt: affiliate.lastSaleAt || undefined,
      };
    });
  }

  async getDashboard(): Promise<AffiliateDashboardDto> {
    const [
      totalAffiliates,
      activeAffiliates,
      revenueStats,
      topPerformers,
      tierDistribution,
    ] = await Promise.all([
      this.prisma.affiliate.count(),
      this.prisma.affiliate.count({ where: { isActive: true } }),
      this.prisma.affiliate.aggregate({
        _sum: {
          totalRevenueBrl: true,
          totalRevenueUsd: true,
        },
      }),
      this.getPerformance({ sortBy: 'totalRevenueBrl', sortOrder: 'desc', limit: 10 }),
      this.getTierDistribution(),
    ]);

    return {
      totalAffiliates,
      activeAffiliates,
      totalRevenueBrl: Number(revenueStats._sum.totalRevenueBrl) || 0,
      totalRevenueUsd: Number(revenueStats._sum.totalRevenueUsd) || 0,
      topPerformers,
      tierDistribution,
    };
  }

  private async getTierDistribution() {
    const tiers = await this.prisma.affiliate.groupBy({
      by: ['tier'],
      _count: {
        tier: true,
      },
    });

    const distribution = {
      bronze: 0,
      silver: 0,
      gold: 0,
      diamond: 0,
    };

    tiers.forEach(tier => {
      distribution[tier.tier as keyof typeof distribution] = tier._count.tier;
    });

    return distribution;
  }

  private calculateTier(revenueBrl: number): AffiliateTier {
    if (revenueBrl >= 100000) {
      return AffiliateTier.DIAMOND;
    } else if (revenueBrl >= 50001) {
      return AffiliateTier.GOLD;
    } else if (revenueBrl >= 10001) {
      return AffiliateTier.SILVER;
    } else {
      return AffiliateTier.BRONZE;
    }
  }

  async recalculateTiers() {
    this.logger.log('Recalculating all affiliate tiers');

    const affiliates = await this.prisma.affiliate.findMany({
      select: { id: true, totalRevenueBrl: true },
    });

    const updates = affiliates.map(affiliate => ({
      id: affiliate.id,
      tier: this.calculateTier(Number(affiliate.totalRevenueBrl)),
    }));

    for (const update of updates) {
      await this.prisma.affiliate.update({
        where: { id: update.id },
        data: { tier: update.tier },
      });
    }

    this.logger.log(`Tiers recalculated for ${updates.length} affiliates`);
  }
}
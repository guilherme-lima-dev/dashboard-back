import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AffiliatePerformanceDto {
  @ApiProperty({ description: 'Affiliate ID' })
  affiliateId: string;

  @ApiProperty({ description: 'Affiliate name' })
  name: string;

  @ApiProperty({ description: 'Affiliate tier' })
  tier: string;

  @ApiProperty({ description: 'Total sales count' })
  salesCount: number;

  @ApiProperty({ description: 'Total revenue in BRL' })
  revenueBrl: number;

  @ApiProperty({ description: 'Total revenue in USD' })
  revenueUsd: number;

  @ApiProperty({ description: 'Conversion rate (%)' })
  conversionRate: number;

  @ApiProperty({ description: 'New customers count' })
  newCustomersCount: number;

  @ApiProperty({ description: 'Repeat customers count' })
  repeatCustomersCount: number;

  @ApiProperty({ description: 'Average order value in BRL' })
  averageOrderValueBrl: number;

  @ApiProperty({ description: 'Average order value in USD' })
  averageOrderValueUsd: number;

  @ApiPropertyOptional({ description: 'First sale date' })
  firstSaleAt?: Date;

  @ApiPropertyOptional({ description: 'Last sale date' })
  lastSaleAt?: Date;
}

export class AffiliateDashboardDto {
  @ApiProperty({ description: 'Total affiliates count' })
  totalAffiliates: number;

  @ApiProperty({ description: 'Active affiliates count' })
  activeAffiliates: number;

  @ApiProperty({ description: 'Total revenue from affiliates in BRL' })
  totalRevenueBrl: number;

  @ApiProperty({ description: 'Total revenue from affiliates in USD' })
  totalRevenueUsd: number;

  @ApiProperty({ description: 'Top performers', type: [AffiliatePerformanceDto] })
  topPerformers: AffiliatePerformanceDto[];

  @ApiProperty({ description: 'Tier distribution' })
  tierDistribution: {
    bronze: number;
    silver: number;
    gold: number;
    diamond: number;
  };
}

export class AffiliateQueryDto {
  @ApiPropertyOptional({ description: 'Platform ID filter' })
  platformId?: string;

  @ApiPropertyOptional({ description: 'Tier filter' })
  tier?: string;

  @ApiPropertyOptional({ description: 'Active status filter' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search term for name or email' })
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', default: 'totalRevenueBrl' })
  sortBy?: string = 'totalRevenueBrl';

  @ApiPropertyOptional({ description: 'Sort order', default: 'desc' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

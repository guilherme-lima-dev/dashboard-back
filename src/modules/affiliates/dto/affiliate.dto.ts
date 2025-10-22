import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AffiliateTier } from './create-affiliate.dto';

export class AffiliateDto {
  @ApiProperty({ description: 'Affiliate ID' })
  id: string;

  @ApiProperty({ description: 'Platform ID' })
  platformId: string;

  @ApiProperty({ description: 'External affiliate ID' })
  externalAffiliateId: string;

  @ApiProperty({ description: 'Affiliate name' })
  name: string;

  @ApiProperty({ description: 'Affiliate email' })
  email: string;

  @ApiPropertyOptional({ description: 'Affiliate phone' })
  phone?: string;

  @ApiProperty({ description: 'Affiliate tier', enum: AffiliateTier })
  tier: AffiliateTier;

  @ApiPropertyOptional({ description: 'Commission rate' })
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Instagram handle' })
  instagramHandle?: string;

  @ApiPropertyOptional({ description: 'YouTube handle' })
  youtubeHandle?: string;

  @ApiPropertyOptional({ description: 'TikTok handle' })
  tiktokHandle?: string;

  @ApiPropertyOptional({ description: 'Twitter handle' })
  twitterHandle?: string;

  @ApiProperty({ description: 'Total sales count' })
  totalSalesCount: number;

  @ApiProperty({ description: 'Total revenue in BRL' })
  totalRevenueBrl: number;

  @ApiProperty({ description: 'Total revenue in USD' })
  totalRevenueUsd: number;

  @ApiPropertyOptional({ description: 'First sale date' })
  firstSaleAt?: Date;

  @ApiPropertyOptional({ description: 'Last sale date' })
  lastSaleAt?: Date;

  @ApiProperty({ description: 'Is affiliate active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

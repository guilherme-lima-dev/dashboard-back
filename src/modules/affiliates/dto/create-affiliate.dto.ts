import { IsString, IsEmail, IsOptional, IsEnum, IsNumber, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AffiliateTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  DIAMOND = 'diamond',
}

export class CreateAffiliateDto {
  @ApiProperty({ description: 'Platform ID' })
  @IsString()
  platformId: string;

  @ApiProperty({ description: 'External affiliate ID from platform' })
  @IsString()
  externalAffiliateId: string;

  @ApiProperty({ description: 'Affiliate name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Affiliate email' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Affiliate phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Affiliate tier', enum: AffiliateTier })
  @IsOptional()
  @IsEnum(AffiliateTier)
  tier?: AffiliateTier;

  @ApiPropertyOptional({ description: 'Commission rate (0-1)' })
  @IsOptional()
  @IsNumber()
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Instagram handle' })
  @IsOptional()
  @IsString()
  instagramHandle?: string;

  @ApiPropertyOptional({ description: 'YouTube handle' })
  @IsOptional()
  @IsString()
  youtubeHandle?: string;

  @ApiPropertyOptional({ description: 'TikTok handle' })
  @IsOptional()
  @IsString()
  tiktokHandle?: string;

  @ApiPropertyOptional({ description: 'Twitter handle' })
  @IsOptional()
  @IsString()
  twitterHandle?: string;

  @ApiPropertyOptional({ description: 'Is affiliate active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

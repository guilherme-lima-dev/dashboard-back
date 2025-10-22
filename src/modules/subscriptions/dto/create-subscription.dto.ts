import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'sub_stripe_123' })
  @IsString()
  externalSubscriptionId: string;

  @ApiProperty({ example: 'cus_stripe_123' })
  @IsString()
  externalCustomerId: string;

  @ApiProperty({ example: 'prod_stripe_123' })
  @IsString()
  externalProductId: string;

  @ApiProperty({ example: 'active' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isTrial?: boolean;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  trialStart?: Date;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  trialEnd?: Date;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  trialEndsAt?: Date;

  @ApiProperty({ example: 29.90 })
  @IsNumber()
  recurringAmount: number;

  @ApiProperty({ example: 'BRL' })
  @IsString()
  currency: string;

  @ApiProperty({ example: 29.90 })
  @IsNumber()
  recurringAmountBrl: number;

  @ApiProperty({ example: 5.98 })
  @IsNumber()
  recurringAmountUsd: number;

  @ApiPropertyOptional({ example: 5.00 })
  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @ApiProperty({ example: 'month' })
  @IsString()
  billingPeriod: string;

  @ApiPropertyOptional({ example: 12 })
  @IsNumber()
  @IsOptional()
  billingCycles?: number;

  @ApiProperty()
  @IsDateString()
  startDate: Date;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  nextBillingDate?: Date;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  currentPeriodStart?: Date;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  currentPeriodEnd?: Date;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  canceledAt?: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cancellationReason?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  canceledBy?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  pausedAt?: Date;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  resumedAt?: Date;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endedAt?: Date;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  affiliateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  platformMetadata?: any;

  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  offerId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  orderId?: string;
}

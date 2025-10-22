import { IsString, IsOptional, IsNumber, IsDateString, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  offerId?: string;

  @ApiProperty({ example: 'prod_stripe_123' })
  @IsString()
  externalProductId: string;

  @ApiProperty({ example: 'subscription' })
  @IsString()
  itemType: string;

  @ApiProperty({ example: 'Premium Plan' })
  @IsString()
  productName: string;

  @ApiProperty({ example: 29.90 })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiProperty({ example: 29.90 })
  @IsNumber()
  subtotal: number;

  @ApiProperty({ example: 'BRL' })
  @IsString()
  currency: string;

  @ApiProperty({ example: 29.90 })
  @IsNumber()
  priceBrl: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  discountAmountBrl?: number;

  @ApiProperty({ example: 29.90 })
  @IsNumber()
  subtotalBrl: number;

  @ApiProperty({ example: 5.98 })
  @IsNumber()
  priceUsd: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  discountAmountUsd?: number;

  @ApiProperty({ example: 5.98 })
  @IsNumber()
  subtotalUsd: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'order_stripe_123' })
  @IsString()
  externalOrderId: string;

  @ApiProperty({ example: 29.90 })
  @IsNumber()
  subtotalAmount: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  taxAmount?: number;

  @ApiProperty({ example: 29.90 })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({ example: 'BRL' })
  @IsString()
  currency: string;

  @ApiProperty({ example: 29.90 })
  @IsNumber()
  subtotalAmountBrl: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  discountAmountBrl?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  taxAmountBrl?: number;

  @ApiProperty({ example: 29.90 })
  @IsNumber()
  totalAmountBrl: number;

  @ApiProperty({ example: 5.98 })
  @IsNumber()
  subtotalAmountUsd: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  discountAmountUsd?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  taxAmountUsd?: number;

  @ApiProperty({ example: 5.98 })
  @IsNumber()
  totalAmountUsd: number;

  @ApiPropertyOptional({ example: 5.00 })
  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @ApiPropertyOptional({ example: 'google' })
  @IsString()
  @IsOptional()
  utmSource?: string;

  @ApiPropertyOptional({ example: 'cpc' })
  @IsString()
  @IsOptional()
  utmMedium?: string;

  @ApiPropertyOptional({ example: 'summer_sale' })
  @IsString()
  @IsOptional()
  utmCampaign?: string;

  @ApiPropertyOptional({ example: 'premium_plan' })
  @IsString()
  @IsOptional()
  utmTerm?: string;

  @ApiPropertyOptional({ example: 'banner_top' })
  @IsString()
  @IsOptional()
  utmContent?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsString()
  @IsOptional()
  referrerUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/checkout' })
  @IsString()
  @IsOptional()
  landingPageUrl?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  affiliateId?: string;

  @ApiPropertyOptional({ example: 'SUMMER20' })
  @IsString()
  @IsOptional()
  couponCode?: string;

  @ApiProperty({ example: 'completed' })
  @IsString()
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  platformMetadata?: any;

  @ApiProperty()
  @IsDateString()
  orderDate: Date;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  completedAt?: Date;

  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty()
  @IsUUID()
  platformId: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

import { IsString, IsOptional, IsNumber, IsDateString, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ example: 'txn_stripe_123' })
  @IsString()
  externalTransactionId: string;

  @ApiPropertyOptional({ example: 'inv_stripe_123' })
  @IsString()
  @IsOptional()
  externalInvoiceId?: string;

  @ApiProperty({ example: 'payment' })
  @IsString()
  transactionType: string;

  @ApiProperty({ example: 'succeeded' })
  @IsString()
  status: string;

  @ApiProperty({ example: 29.90 })
  @IsNumber()
  grossAmount: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  taxAmount?: number;

  @ApiPropertyOptional({ example: 1.50 })
  @IsNumber()
  @IsOptional()
  feeAmount?: number;

  @ApiProperty({ example: 28.40 })
  @IsNumber()
  netAmount: number;

  @ApiProperty({ example: 'BRL' })
  @IsString()
  currency: string;

  @ApiProperty({ example: 29.90 })
  @IsNumber()
  grossAmountBrl: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  discountAmountBrl?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  taxAmountBrl?: number;

  @ApiPropertyOptional({ example: 1.50 })
  @IsNumber()
  @IsOptional()
  feeAmountBrl?: number;

  @ApiProperty({ example: 28.40 })
  @IsNumber()
  netAmountBrl: number;

  @ApiProperty({ example: 5.98 })
  @IsNumber()
  grossAmountUsd: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  discountAmountUsd?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  taxAmountUsd?: number;

  @ApiPropertyOptional({ example: 0.30 })
  @IsNumber()
  @IsOptional()
  feeAmountUsd?: number;

  @ApiProperty({ example: 5.68 })
  @IsNumber()
  netAmountUsd: number;

  @ApiPropertyOptional({ example: 5.00 })
  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @ApiPropertyOptional({ example: 'credit_card' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  paymentMethodDetails?: any;

  @ApiPropertyOptional({ example: 'card_declined' })
  @IsString()
  @IsOptional()
  failureCode?: string;

  @ApiPropertyOptional({ example: 'Your card was declined.' })
  @IsString()
  @IsOptional()
  failureMessage?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  platformMetadata?: any;

  @ApiProperty()
  @IsDateString()
  transactionDate: Date;

  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty()
  @IsUUID()
  platformId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  orderId?: string;
}

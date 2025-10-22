import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsObject, Length, IsUUID, IsIn } from 'class-validator';

export class CreateOfferPlatformMappingDto {
  @ApiProperty({
    description: 'ID da oferta',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  offerId: string;

  @ApiProperty({
    description: 'ID da plataforma',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  platformId: string;

  @ApiProperty({
    description: 'ID do produto na plataforma externa',
    example: 'prod_stripe_123',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  externalProductId: string;

  @ApiProperty({
    description: 'ID do preço na plataforma externa',
    example: 'price_stripe_123',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  externalPriceId?: string;

  @ApiProperty({
    description: 'Valor do preço',
    example: 29.90,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  priceAmount: number;

  @ApiProperty({
    description: 'Moeda do preço',
    example: 'BRL',
    enum: ['BRL', 'USD', 'EUR'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['BRL', 'USD', 'EUR'])
  priceCurrency: string;

  @ApiProperty({
    description: 'Valor do preço em BRL',
    example: 29.90,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  priceAmountBrl?: number;

  @ApiProperty({
    description: 'Valor do preço em USD',
    example: 5.99,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  priceAmountUsd?: number;

  @ApiProperty({
    description: 'Valor do trial',
    example: 9.90,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  trialAmount?: number;

  @ApiProperty({
    description: 'Moeda do trial',
    example: 'BRL',
    enum: ['BRL', 'USD', 'EUR'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['BRL', 'USD', 'EUR'])
  trialCurrency?: string;

  @ApiProperty({
    description: 'Valor do trial em BRL',
    example: 9.90,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  trialAmountBrl?: number;

  @ApiProperty({
    description: 'Valor do trial em USD',
    example: 1.99,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  trialAmountUsd?: number;

  @ApiProperty({
    description: 'Se o mapeamento está ativo',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Metadados adicionais',
    example: { stripeProductId: 'prod_123', webhookUrl: 'https://api.example.com/webhooks' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

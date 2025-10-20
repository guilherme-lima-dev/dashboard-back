import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsInt, IsNumber, Min, Max, IsUUID, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOfferDto {
  @ApiProperty({
    description: 'ID do produto',
    example: 'uuid-123',
    type: String,
  })
  @IsUUID('4', { message: 'ID do produto deve ser um UUID válido' })
  @IsNotEmpty({ message: 'ID do produto é obrigatório' })
  productId: string;

  @ApiProperty({
    description: 'Nome da oferta',
    example: 'Holymind Mensal',
    minLength: 3,
    maxLength: 100,
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @Length(3, 100, { message: 'Nome deve ter entre 3 e 100 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Slug único da oferta',
    example: 'holymind-mensal',
    minLength: 3,
    maxLength: 100,
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Slug é obrigatório' })
  @Length(3, 100, { message: 'Slug deve ter entre 3 e 100 caracteres' })
  slug: string;

  @ApiProperty({
    description: 'Descrição da oferta',
    example: 'Acesso mensal à plataforma Holymind',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Tipo de cobrança',
    enum: ['recurring', 'one_time'],
    example: 'recurring',
  })
  @IsEnum(['recurring', 'one_time'], {
    message: 'Tipo de cobrança deve ser recurring ou one_time',
  })
  billingType: string;

  @ApiProperty({
    description: 'Período de cobrança',
    enum: ['monthly', 'yearly', 'weekly', 'daily'],
    example: 'monthly',
    required: false,
  })
  @IsOptional()
  @IsEnum(['monthly', 'yearly', 'weekly', 'daily'], {
    message: 'Período deve ser monthly, yearly, weekly ou daily',
  })
  billingPeriod?: string;

  @ApiProperty({
    description: 'Intervalo de cobrança',
    example: 1,
    minimum: 1,
    maximum: 12,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Intervalo deve ser um número inteiro' })
  @Min(1, { message: 'Intervalo deve ser no mínimo 1' })
  @Max(12, { message: 'Intervalo deve ser no máximo 12' })
  @Type(() => Number)
  billingInterval?: number;

  @ApiProperty({
    description: 'Se a oferta tem trial',
    example: true,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  hasTrial?: boolean;

  @ApiProperty({
    description: 'Dias do período de trial',
    example: 7,
    minimum: 1,
    maximum: 365,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Dias do trial deve ser um número inteiro' })
  @Min(1, { message: 'Dias do trial deve ser no mínimo 1' })
  @Max(365, { message: 'Dias do trial deve ser no máximo 365' })
  @Type(() => Number)
  trialPeriodDays?: number;

  @ApiProperty({
    description: 'Valor do trial em centavos',
    example: 990,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor do trial deve ter no máximo 2 casas decimais' })
  @Min(0, { message: 'Valor do trial deve ser maior ou igual a 0' })
  @Type(() => Number)
  trialAmount?: number;

  @ApiProperty({
    description: 'Se a oferta está ativa',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Metadata adicional da oferta',
    example: { 
      features: ['unlimited_access', 'premium_content'],
      limitations: ['no_download'],
      targetAudience: 'premium_users'
    },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

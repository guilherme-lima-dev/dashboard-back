import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, MinLength, MaxLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Nome do produto',
    example: 'Holymind',
    minLength: 3,
    maxLength: 100,
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Slug único do produto',
    example: 'holymind',
    minLength: 3,
    maxLength: 100,
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Slug é obrigatório' })
  @MinLength(3, { message: 'Slug deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Slug deve ter no máximo 100 caracteres' })
  slug: string;

  @ApiProperty({
    description: 'Descrição do produto',
    example: 'Plataforma de meditação e mindfulness',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Tipo do produto',
    enum: ['subscription', 'one_time', 'addon'],
    example: 'subscription',
  })
  @IsEnum(['subscription', 'one_time', 'addon'], {
    message: 'Tipo deve ser subscription, one_time ou addon',
  })
  productType: string;

  @ApiProperty({
    description: 'Se o produto está ativo',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Metadata adicional do produto',
    example: { category: 'health', target: 'B2C', features: ['meditation', 'sleep'] },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

import { ApiProperty } from '@nestjs/swagger';

export class OfferDto {
  @ApiProperty({
    description: 'ID único da oferta',
    example: 'uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'ID do produto',
    example: 'uuid-456',
  })
  productId: string;

  @ApiProperty({
    description: 'Nome da oferta',
    example: 'Holymind Mensal',
  })
  name: string;

  @ApiProperty({
    description: 'Slug único da oferta',
    example: 'holymind-mensal',
  })
  slug: string;

  @ApiProperty({
    description: 'Descrição da oferta',
    example: 'Acesso mensal à plataforma Holymind',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Tipo de cobrança',
    example: 'recurring',
    enum: ['recurring', 'one_time'],
  })
  billingType: string;

  @ApiProperty({
    description: 'Período de cobrança',
    example: 'monthly',
    enum: ['monthly', 'yearly', 'weekly', 'daily'],
    required: false,
  })
  billingPeriod?: string;

  @ApiProperty({
    description: 'Intervalo de cobrança',
    example: 1,
  })
  billingInterval: number;

  @ApiProperty({
    description: 'Se a oferta tem trial',
    example: true,
  })
  hasTrial: boolean;

  @ApiProperty({
    description: 'Dias do período de trial',
    example: 7,
    required: false,
  })
  trialPeriodDays?: number;

  @ApiProperty({
    description: 'Valor do trial em centavos',
    example: 990,
    required: false,
  })
  trialAmount?: any;

  @ApiProperty({
    description: 'Se a oferta está ativa',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Metadata adicional da oferta',
    example: { 
      features: ['unlimited_access', 'premium_content'],
      limitations: ['no_download'],
      targetAudience: 'premium_users'
    },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Data de criação',
    example: '2025-01-20T19:04:01.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data de atualização',
    example: '2025-01-20T19:04:01.000Z',
  })
  updatedAt: Date;
}

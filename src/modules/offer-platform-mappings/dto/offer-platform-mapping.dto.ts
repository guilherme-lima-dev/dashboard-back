import { ApiProperty } from '@nestjs/swagger';

export class OfferPlatformMappingDto {
  @ApiProperty({
    description: 'ID do mapeamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'ID da oferta',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  offerId: string;

  @ApiProperty({
    description: 'ID da plataforma',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  platformId: string;

  @ApiProperty({
    description: 'ID do produto na plataforma externa',
    example: 'prod_stripe_123',
  })
  externalProductId: string;

  @ApiProperty({
    description: 'ID do preço na plataforma externa',
    example: 'price_stripe_123',
    nullable: true,
  })
  externalPriceId: string | null;

  @ApiProperty({
    description: 'Valor do preço',
    example: 29.90,
  })
  priceAmount: any;

  @ApiProperty({
    description: 'Moeda do preço',
    example: 'BRL',
  })
  priceCurrency: string;

  @ApiProperty({
    description: 'Valor do preço em BRL',
    example: 29.90,
    nullable: true,
  })
  priceAmountBrl: any | null;

  @ApiProperty({
    description: 'Valor do preço em USD',
    example: 5.99,
    nullable: true,
  })
  priceAmountUsd: any | null;

  @ApiProperty({
    description: 'Valor do trial',
    example: 9.90,
    nullable: true,
  })
  trialAmount: any | null;

  @ApiProperty({
    description: 'Moeda do trial',
    example: 'BRL',
    nullable: true,
  })
  trialCurrency: string | null;

  @ApiProperty({
    description: 'Valor do trial em BRL',
    example: 9.90,
    nullable: true,
  })
  trialAmountBrl: any | null;

  @ApiProperty({
    description: 'Valor do trial em USD',
    example: 1.99,
    nullable: true,
  })
  trialAmountUsd: any | null;

  @ApiProperty({
    description: 'Se o mapeamento está ativo',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Metadados adicionais',
    example: { stripeProductId: 'prod_123', webhookUrl: 'https://api.example.com/webhooks' },
    nullable: true,
  })
  metadata: Record<string, any> | null;

  @ApiProperty({
    description: 'Data de criação',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data de atualização',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Dados da oferta relacionada',
    required: false,
  })
  offer?: {
    id: string;
    name: string;
    slug: string;
    billingType: string;
    product: {
      id: string;
      name: string;
      slug: string;
    };
  };

  @ApiProperty({
    description: 'Dados da plataforma relacionada',
    required: false,
  })
  platform?: {
    id: string;
    name: string;
    slug: string;
  };
}

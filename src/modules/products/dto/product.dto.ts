import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty({
    description: 'ID único do produto',
    example: 'uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Nome do produto',
    example: 'Holymind',
  })
  name: string;

  @ApiProperty({
    description: 'Slug único do produto',
    example: 'holymind',
  })
  slug: string;

  @ApiProperty({
    description: 'Descrição do produto',
    example: 'Plataforma de meditação e mindfulness',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Tipo do produto',
    example: 'subscription',
    enum: ['subscription', 'one_time', 'addon'],
  })
  productType: string;

  @ApiProperty({
    description: 'Se o produto está ativo',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Metadata adicional do produto',
    example: { category: 'health', target: 'B2C', features: ['meditation', 'sleep'] },
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

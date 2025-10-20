import { ApiProperty } from '@nestjs/swagger';

export class PlatformDto {
  @ApiProperty({
    description: 'ID único da plataforma',
    example: 'uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Nome da plataforma',
    example: 'Stripe',
  })
  name: string;

  @ApiProperty({
    description: 'Slug único da plataforma',
    example: 'stripe',
  })
  slug: string;

  @ApiProperty({
    description: 'Se a plataforma está ativa',
    example: true,
  })
  isEnabled: boolean;

  @ApiProperty({
    description: 'Configurações específicas da plataforma',
    example: { webhookSecret: 'whsec_xxx', apiKey: 'sk_test_xxx' },
    required: false,
  })
  config?: Record<string, any>;

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

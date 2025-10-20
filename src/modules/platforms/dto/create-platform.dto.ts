import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreatePlatformDto {
  @ApiProperty({
    description: 'Nome da plataforma',
    example: 'Stripe',
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @ApiProperty({
    description: 'Slug único da plataforma',
    example: 'stripe',
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Slug é obrigatório' })
  slug: string;

  @ApiProperty({
    description: 'Se a plataforma está ativa',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({
    description: 'Configurações específicas da plataforma',
    example: { webhookSecret: 'whsec_xxx', apiKey: 'sk_test_xxx' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

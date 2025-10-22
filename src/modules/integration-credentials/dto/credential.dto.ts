import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CredentialType, Environment } from './credential.enums';

export class CredentialDto {
    @ApiProperty({
        description: 'ID da credencial',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    id: string;

    @ApiProperty({
        description: 'ID da plataforma',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    platformId: string;

    @ApiProperty({
        description: 'Tipo de credencial',
        enum: CredentialType,
        example: CredentialType.API_SECRET_KEY,
    })
    credentialType: CredentialType;

    @ApiProperty({
        description: 'Ambiente da credencial',
        enum: Environment,
        example: Environment.PRODUCTION,
    })
    environment: Environment;

    @ApiProperty({
        description: 'Se a credencial está ativa',
        example: true,
    })
    isActive: boolean;

    @ApiPropertyOptional({
        description: 'Data de expiração da credencial',
        example: '2025-12-31T23:59:59.000Z',
    })
    expiresAt?: Date;

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

    @ApiPropertyOptional({
        description: 'Valor descriptografado da credencial (apenas em contextos seguros)',
        example: 'sk_test_51Hxxxxxxxxxxxxxxxxxxxxxxxxxx',
    })
    decryptedValue?: string;
}

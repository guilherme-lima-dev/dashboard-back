import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsISO8601, IsBoolean } from 'class-validator';
import { CredentialType, Environment } from './credential.enums';

export class CreateCredentialDto {
    @ApiProperty({
        description: 'ID da plataforma',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsString()
    @IsNotEmpty()
    platformId: string;

    @ApiProperty({
        description: 'Tipo de credencial',
        enum: CredentialType,
        example: CredentialType.API_SECRET_KEY,
    })
    @IsEnum(CredentialType)
    @IsNotEmpty()
    credentialType: CredentialType;

    @ApiProperty({
        description: 'Valor da credencial (será criptografado automaticamente)',
        example: 'sk_test_51Hxxxxxxxxxxxxxxxxxxxxxxxxxx',
    })
    @IsString()
    @IsNotEmpty()
    credentialValue: string;

    @ApiProperty({
        description: 'Ambiente da credencial',
        enum: Environment,
        example: Environment.PRODUCTION,
        default: Environment.PRODUCTION,
    })
    @IsEnum(Environment)
    @IsOptional()
    environment?: Environment;

    @ApiProperty({
        description: 'Se a credencial está ativa',
        example: true,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiProperty({
        description: 'Data de expiração da credencial (ISO 8601)',
        example: '2025-12-31T23:59:59.000Z',
        required: false,
    })
    @IsISO8601()
    @IsOptional()
    expiresAt?: string;
}

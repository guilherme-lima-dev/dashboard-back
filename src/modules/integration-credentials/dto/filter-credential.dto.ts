import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { CredentialType, Environment } from './credential.enums';
import { Transform } from 'class-transformer';

export class FilterCredentialDto {
    @ApiPropertyOptional({
        description: 'Filtrar por ID da plataforma',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsString()
    @IsOptional()
    platformId?: string;

    @ApiPropertyOptional({
        description: 'Filtrar por tipo de credencial',
        enum: CredentialType,
        example: CredentialType.API_SECRET_KEY,
    })
    @IsEnum(CredentialType)
    @IsOptional()
    credentialType?: CredentialType;

    @ApiPropertyOptional({
        description: 'Filtrar por ambiente',
        enum: Environment,
        example: Environment.PRODUCTION,
    })
    @IsEnum(Environment)
    @IsOptional()
    environment?: Environment;

    @ApiPropertyOptional({
        description: 'Filtrar por status ativo/inativo',
        example: true,
    })
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Incluir valor descriptografado na resposta (use com cuidado)',
        example: false,
        default: false,
    })
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    @IsOptional()
    includeDecrypted?: boolean;
}

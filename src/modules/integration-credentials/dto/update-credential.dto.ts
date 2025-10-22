import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsISO8601, IsBoolean } from 'class-validator';

export class UpdateCredentialDto {
    @ApiPropertyOptional({
        description: 'Novo valor da credencial (será criptografado automaticamente)',
        example: 'sk_test_51Hxxxxxxxxxxxxxxxxxxxxxxxxxx',
    })
    @IsString()
    @IsOptional()
    credentialValue?: string;

    @ApiPropertyOptional({
        description: 'Se a credencial está ativa',
        example: true,
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Data de expiração da credencial (ISO 8601)',
        example: '2025-12-31T23:59:59.000Z',
    })
    @IsISO8601()
    @IsOptional()
    expiresAt?: string;
}

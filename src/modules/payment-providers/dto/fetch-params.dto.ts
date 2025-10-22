import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsInt, IsString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class FetchParamsDto {
    @ApiPropertyOptional({
        description: 'Data inicial (ISO 8601)',
        example: '2024-01-01T00:00:00.000Z',
    })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'Data final (ISO 8601)',
        example: '2024-12-31T23:59:59.999Z',
    })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiPropertyOptional({
        description: 'Limite de resultados',
        example: 100,
        minimum: 1,
        maximum: 1000,
    })
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    @Max(1000)
    @IsOptional()
    limit?: number;

    @ApiPropertyOptional({
        description: 'Cursor para paginação',
        example: 'sub_1234567890',
    })
    @IsString()
    @IsOptional()
    cursor?: string;
}

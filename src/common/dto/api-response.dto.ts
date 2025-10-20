import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty()
    data?: T;

    @ApiProperty({ example: 'Operação realizada com sucesso', required: false })
    message?: string;
}

export class ApiErrorResponseDto {
    @ApiProperty({ example: 400 })
    statusCode: number;

    @ApiProperty({ example: 'Bad Request' })
    error: string;

    @ApiProperty({ example: 'Validation failed' })
    message: string | string[];

    @ApiProperty({ required: false })
    details?: any;
}

export class PaginatedResponseDto<T> {
    @ApiProperty({ isArray: true })
    data: T[];

    @ApiProperty({
        example: {
            total: 100,
            page: 1,
            limit: 20,
            totalPages: 5,
        },
    })
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

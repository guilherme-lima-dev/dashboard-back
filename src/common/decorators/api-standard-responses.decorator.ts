import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export const ApiStandardResponses = () => {
    return applyDecorators(
        ApiResponse({
            status: 400,
            description: 'Bad Request - Dados inválidos',
            schema: {
                example: {
                    statusCode: 400,
                    message: ['Campo X é obrigatório'],
                    error: 'Bad Request',
                },
            },
        }),
        ApiResponse({
            status: 401,
            description: 'Unauthorized - Token inválido ou ausente',
            schema: {
                example: {
                    statusCode: 401,
                    message: 'Unauthorized',
                },
            },
        }),
        ApiResponse({
            status: 403,
            description: 'Forbidden - Permissões insuficientes',
            schema: {
                example: {
                    statusCode: 403,
                    message: 'Você não tem permissão para acessar este recurso',
                    error: 'Forbidden',
                },
            },
        }),
        ApiResponse({
            status: 500,
            description: 'Internal Server Error',
            schema: {
                example: {
                    statusCode: 500,
                    message: 'Internal server error',
                },
            },
        }),
    );
};

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestConnectionResponseDto {
    @ApiProperty({
        description: 'Se o teste de conexão foi bem-sucedido',
        example: true,
    })
    success: boolean;

    @ApiProperty({
        description: 'Mensagem do resultado do teste',
        example: 'Credencial válida e ativa',
    })
    message: string;

    @ApiPropertyOptional({
        description: 'Detalhes adicionais sobre a credencial testada',
    })
    details?: {
        credentialType: string;
        environment: string;
        isActive: boolean;
        expiresAt?: Date;
    };
}

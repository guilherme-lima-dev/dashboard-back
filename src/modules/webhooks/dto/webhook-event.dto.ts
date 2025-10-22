import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WebhookEventStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    PROCESSED = 'processed',
    FAILED = 'failed',
}

export class WebhookEventDto {
    @ApiProperty({
        description: 'ID do evento de webhook',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    id: string;

    @ApiProperty({
        description: 'ID da plataforma',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    platformId: string;

    @ApiProperty({
        description: 'Tipo do evento',
        example: 'invoice.paid',
    })
    eventType: string;

    @ApiProperty({
        description: 'ID externo do evento',
        example: 'evt_1234567890',
    })
    externalEventId: string;

    @ApiProperty({
        description: 'Payload do webhook',
    })
    payload: any;

    @ApiPropertyOptional({
        description: 'Assinatura do webhook',
    })
    signature?: string;

    @ApiProperty({
        description: 'Status do processamento',
        enum: WebhookEventStatus,
        example: WebhookEventStatus.PENDING,
    })
    status: WebhookEventStatus;

    @ApiPropertyOptional({
        description: 'Data de processamento',
    })
    processedAt?: Date;

    @ApiPropertyOptional({
        description: 'Mensagem de erro (se houver)',
    })
    errorMessage?: string;

    @ApiProperty({
        description: 'Número de tentativas de reprocessamento',
        example: 0,
    })
    retryCount: number;

    @ApiProperty({
        description: 'Data de recebimento',
    })
    receivedAt: Date;

    @ApiProperty({
        description: 'Data de criação',
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Data de atualização',
    })
    updatedAt: Date;
}

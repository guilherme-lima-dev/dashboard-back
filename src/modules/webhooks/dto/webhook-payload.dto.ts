import { ApiProperty } from '@nestjs/swagger';

export class WebhookPayloadDto {
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
        description: 'Dados do evento (JSON)',
        example: { customer: 'cus_123', amount: 9900 },
    })
    data: any;

    @ApiProperty({
        description: 'Timestamp do evento',
        example: '2024-01-01T00:00:00.000Z',
    })
    timestamp?: string;
}

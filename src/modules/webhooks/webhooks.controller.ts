import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Headers,
    RawBodyRequest,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { Public } from '../../common/decorators/public.decorator';
import { WebhookEventDto } from './dto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
    constructor(private readonly webhooksService: WebhooksService) {}

    @Post('stripe')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Receber webhook do Stripe',
        description: 'Endpoint para receber e processar webhooks do Stripe',
    })
    @ApiHeader({
        name: 'stripe-signature',
        description: 'Assinatura do webhook Stripe',
        required: true,
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Webhook recebido com sucesso',
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Assinatura inválida',
    })
    async handleStripeWebhook(
        @Headers('stripe-signature') signature: string,
        @Req() req: Request,
    ) {
        const payload = (req as any).rawBody || req.body;
        return this.webhooksService.handleWebhook('stripe', signature, payload);
    }

    @Post('hotmart')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Receber webhook do Hotmart',
        description: 'Endpoint para receber e processar webhooks do Hotmart',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Webhook recebido com sucesso',
    })
    async handleHotmartWebhook(@Body() payload: any) {
        return this.webhooksService.handleWebhook('hotmart', '', payload);
    }

    @Post('cartpanda')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Receber webhook do Cartpanda',
        description: 'Endpoint para receber e processar webhooks do Cartpanda',
    })
    @ApiHeader({
        name: 'x-cartpanda-signature',
        description: 'Assinatura do webhook Cartpanda',
        required: true,
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Webhook recebido com sucesso',
    })
    async handleCartpandaWebhook(
        @Headers('x-cartpanda-signature') signature: string,
        @Body() payload: any,
    ) {
        return this.webhooksService.handleWebhook('cartpanda', signature, payload);
    }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Listar eventos de webhook',
        description: 'Lista os últimos 100 eventos de webhook recebidos',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Lista de eventos',
        type: [WebhookEventDto],
    })
    async findAll(): Promise<WebhookEventDto[]> {
        return this.webhooksService.findAll();
    }

    @Get('platform/:platformId')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Listar eventos por plataforma',
        description: 'Lista eventos de webhook de uma plataforma específica',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Lista de eventos da plataforma',
        type: [WebhookEventDto],
    })
    async findByPlatform(@Param('platformId') platformId: string): Promise<WebhookEventDto[]> {
        return this.webhooksService.findByPlatform(platformId);
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Buscar evento por ID',
        description: 'Retorna detalhes de um evento de webhook específico',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Evento encontrado',
        type: WebhookEventDto,
    })
    async findOne(@Param('id') id: string): Promise<WebhookEventDto> {
        return this.webhooksService.findOne(id);
    }

    @Post(':id/retry')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Reprocessar evento',
        description: 'Reenvia um evento falhado para reprocessamento',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Evento reenviado para processamento',
        type: WebhookEventDto,
    })
    async retry(@Param('id') id: string): Promise<WebhookEventDto> {
        return this.webhooksService.retry(id);
    }
}

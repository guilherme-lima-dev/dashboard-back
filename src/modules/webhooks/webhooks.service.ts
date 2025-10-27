import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationCredentialsService } from '../integration-credentials/integration-credentials.service';
import { StripeWebhookValidator } from './validators/stripe-webhook-validator';
import { HotmartWebhookValidator } from './validators/hotmart-webhook-validator';
import { CartpandaWebhookValidator } from './validators/cartpanda-webhook-validator';
import { IWebhookValidator } from './validators/webhook-validator.interface';
import { WebhookEventDto } from './dto';

@Injectable()
export class WebhooksService {
    private readonly logger = new Logger(WebhooksService.name);
    private validators: Map<string, IWebhookValidator>;
    private readonly skipWebhookValidation: boolean;

    constructor(
        private readonly prisma: PrismaService,
        private readonly credentialsService: IntegrationCredentialsService,
        @InjectQueue('webhooks') private webhooksQueue: Queue,
        private readonly stripeValidator: StripeWebhookValidator,
        private readonly hotmartValidator: HotmartWebhookValidator,
        private readonly cartpandaValidator: CartpandaWebhookValidator,
    ) {
        this.validators = new Map([
            ['stripe', this.stripeValidator],
            ['hotmart', this.hotmartValidator],
            ['cartpanda', this.cartpandaValidator],
        ]);

        this.skipWebhookValidation = process.env.SKIP_WEBHOOK_VALIDATION === 'true';

        if (this.skipWebhookValidation) {
            this.logger.warn('⚠️  WEBHOOK VALIDATION IS DISABLED - Only use in development!');
        }
    }

    async handleWebhook(
        platformSlug: string,
        signature: string,
        payload: any,
    ): Promise<{ received: boolean; eventId: string }> {
        this.logger.log(`Handling webhook for platform: ${platformSlug}`);

        const platform = await this.prisma.platform.findUnique({
            where: { slug: platformSlug },
        });

        if (!platform) {
            throw new NotFoundException('Plataforma não encontrada');
        }

        const validator = this.validators.get(platformSlug);
        if (!validator) {
            throw new BadRequestException('Validador não encontrado para esta plataforma');
        }

        if (!this.skipWebhookValidation) {
            const webhookSecret = await this.credentialsService.findByType(
                platform.id,
                'webhook_secret',
                'sandbox',
                true,
            );

            if (!webhookSecret || !webhookSecret.decryptedValue) {
                throw new BadRequestException('Webhook secret não configurado');
            }

            // O payload já é o raw body (Buffer ou string) devido ao middleware
            const isValid = validator.validate(signature, payload, webhookSecret.decryptedValue);

            if (!isValid) {
                this.logger.error(`Invalid webhook signature for platform: ${platformSlug}`);
                throw new BadRequestException('Assinatura do webhook inválida');
            }

            this.logger.log(`Webhook signature validated successfully for platform: ${platformSlug}`);
        } else {
            this.logger.warn(`Skipping webhook validation for platform: ${platformSlug} (development mode)`);
        }

        // Converter payload para objeto JSON se for Buffer
        const payloadObject = Buffer.isBuffer(payload) ? JSON.parse(payload.toString('utf8')) : payload;
        const eventData = validator.extractEventData(payloadObject);

        // Verificar se temos um externalEventId válido
        if (!eventData.externalEventId) {
            this.logger.warn('No externalEventId found in webhook payload, skipping idempotency check');
            return this.processWebhookEvent(platform, eventData, payloadObject);
        }

        const existingEvent = await this.prisma.webhookEvent.findUnique({
            where: {
                unique_platform_event: {
                    platformId: platform.id,
                    externalEventId: eventData.externalEventId,
                },
            },
        });

        if (existingEvent) {
            this.logger.log(`Webhook event already exists (idempotency): ${existingEvent.id}`);
            return {
                received: true,
                eventId: existingEvent.id,
            };
        }

        const webhookEvent = await this.prisma.webhookEvent.create({
            data: {
                platformId: platform.id,
                eventType: eventData.eventType,
                externalEventId: eventData.externalEventId,
                payload: eventData.data,
                signature,
                status: 'pending',
            },
        });

        this.logger.log(`Webhook event created: ${webhookEvent.id}, adding to queue...`);

        await this.webhooksQueue.add('process-webhook', {
            webhookEventId: webhookEvent.id,
        });

        return {
            received: true,
            eventId: webhookEvent.id,
        };
    }

    private async processWebhookEvent(platform: any, eventData: any, payload: any) {
        this.logger.log(`Processing webhook event directly: ${eventData.eventType}`);

        // Criar webhook event sem externalEventId se não existir
        const webhookEvent = await this.prisma.webhookEvent.create({
            data: {
                platformId: platform.id,
                eventType: eventData.eventType,
                externalEventId: eventData.externalEventId || `temp_${Date.now()}`,
                payload: eventData.data,
                signature: 'development_mode',
                status: 'pending',
            },
        });

        this.logger.log(`Webhook event created: ${webhookEvent.id}, adding to queue...`);

        await this.webhooksQueue.add('process-webhook', {
            webhookEventId: webhookEvent.id,
        });

        return {
            received: true,
            eventId: webhookEvent.id,
        };
    }

    async findAll(): Promise<WebhookEventDto[]> {
        const events = await this.prisma.webhookEvent.findMany({
            orderBy: { receivedAt: 'desc' },
            take: 100,
        });

        return events as WebhookEventDto[];
    }

    async findByPlatform(platformId: string): Promise<WebhookEventDto[]> {
        const events = await this.prisma.webhookEvent.findMany({
            where: { platformId },
            orderBy: { receivedAt: 'desc' },
            take: 100,
        });

        return events as WebhookEventDto[];
    }

    async findOne(id: string): Promise<WebhookEventDto> {
        const event = await this.prisma.webhookEvent.findUnique({
            where: { id },
        });

        if (!event) {
            throw new NotFoundException('Evento de webhook não encontrado');
        }

        return event as WebhookEventDto;
    }

    async retry(id: string): Promise<WebhookEventDto> {
        const event = await this.prisma.webhookEvent.findUnique({
            where: { id },
        });

        if (!event) {
            throw new NotFoundException('Evento de webhook não encontrado');
        }

        if (event.status === 'processed') {
            throw new BadRequestException('Evento já foi processado com sucesso');
        }

        await this.prisma.webhookEvent.update({
            where: { id },
            data: {
                status: 'pending',
                errorMessage: null,
            },
        });

        await this.webhooksQueue.add('process-webhook', {
            webhookEventId: event.id,
        });

        return this.findOne(id);
    }
}

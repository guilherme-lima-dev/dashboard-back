import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentProvidersService } from '../../payment-providers/payment-providers.service';
import { CustomersService } from '../../customers/customers.service';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { OrdersService } from '../../orders/orders.service';
import { AffiliatesService } from '../../affiliates/affiliates.service';

@Processor('webhooks')
export class WebhookProcessor {
    private readonly logger = new Logger(WebhookProcessor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly providersService: PaymentProvidersService,
        private readonly customersService: CustomersService,
        private readonly subscriptionsService: SubscriptionsService,
        private readonly transactionsService: TransactionsService,
        private readonly ordersService: OrdersService,
        private readonly affiliatesService: AffiliatesService,
        @InjectQueue('metrics-calculator') private readonly metricsQueue: Queue,
    ) {}

    @Process('process-webhook')
    async handleWebhook(job: Job) {
        const { webhookEventId } = job.data;

        this.logger.log(`Processing webhook event: ${webhookEventId}`);

        try {
            const webhookEvent = await this.prisma.webhookEvent.findUnique({
                where: { id: webhookEventId },
                include: {
                    platform: true,
                },
            });

            if (!webhookEvent) {
                throw new Error('Webhook event not found');
            }

            await this.prisma.webhookEvent.update({
                where: { id: webhookEventId },
                data: { status: 'processing' },
            });

            await this.processWebhookLogic(webhookEvent);

            await this.prisma.webhookEvent.update({
                where: { id: webhookEventId },
                data: {
                    status: 'processed',
                    processedAt: new Date(),
                },
            });

            this.logger.log(`Webhook event processed successfully: ${webhookEventId}`);
        } catch (error) {
            this.logger.error(
                `Error processing webhook event ${webhookEventId}:`,
                error.message,
            );

            const webhookEvent = await this.prisma.webhookEvent.findUnique({
                where: { id: webhookEventId },
            });

            const retryCount = (webhookEvent?.retryCount || 0) + 1;
            const maxRetries = 5;

            if (retryCount < maxRetries) {
                await this.prisma.webhookEvent.update({
                    where: { id: webhookEventId },
                    data: {
                        status: 'pending',
                        errorMessage: error.message,
                        retryCount: { increment: 1 },
                    },
                });

                const delay = Math.min(1000 * Math.pow(2, retryCount), 60000);
                this.logger.log(`Scheduling retry #${retryCount} in ${delay}ms`);
                throw error;
            } else {
                await this.prisma.webhookEvent.update({
                    where: { id: webhookEventId },
                    data: {
                        status: 'failed',
                        errorMessage: `Max retries (${maxRetries}) exceeded: ${error.message}`,
                        retryCount: { increment: 1 },
                    },
                });

                this.logger.error(
                    `Webhook event ${webhookEventId} failed after ${maxRetries} retries`,
                );
            }
        }
    }

    private async processWebhookLogic(webhookEvent: any): Promise<void> {
        const { platform, eventType, payload } = webhookEvent;

        this.logger.log(
            `Processing webhook logic for platform ${platform.slug}, event type: ${eventType}`,
        );

        switch (platform.slug) {
            case 'stripe':
                await this.processStripeWebhook(webhookEvent);
                break;
            case 'hotmart':
                await this.processHotmartWebhook(webhookEvent);
                break;
            case 'cartpanda':
                await this.processCartpandaWebhook(webhookEvent);
                break;
            default:
                this.logger.warn(`Unknown platform: ${platform.slug}`);
        }

        await this.enqueueMetricsCalculation(platform.id);
    }

    private async processStripeWebhook(webhookEvent: any): Promise<void> {
        const { eventType, payload } = webhookEvent;

        this.logger.log(`Processing Stripe event: ${eventType}`);

        switch (eventType) {
            case 'customer.subscription.created':
                await this.handleStripeSubscriptionCreated(payload);
                break;

            case 'customer.subscription.updated':
                await this.handleStripeSubscriptionUpdated(payload);
                break;

            case 'customer.subscription.deleted':
                await this.handleStripeSubscriptionDeleted(payload);
                break;

            case 'invoice.paid':
            case 'invoice.payment_succeeded':
                await this.handleStripeInvoicePaid(payload);
                break;

            case 'invoice.payment_failed':
                await this.handleStripeInvoiceFailed(payload);
                break;

            case 'customer.created':
            case 'customer.updated':
                await this.handleStripeCustomerEvent(payload);
                break;

            default:
                this.logger.log(`Unhandled Stripe event type: ${eventType}`);
        }
    }

    private async processHotmartWebhook(webhookEvent: any): Promise<void> {
        const { eventType, payload } = webhookEvent;

        this.logger.log(`Processing Hotmart event: ${eventType}`);

        switch (eventType) {
            case 'PURCHASE_APPROVED':
                await this.handleHotmartPurchaseApproved(payload);
                break;

            case 'PURCHASE_CANCELED':
            case 'SUBSCRIPTION_CANCELLATION':
                await this.handleHotmartSubscriptionCanceled(payload);
                break;

            case 'PURCHASE_REFUNDED':
                await this.handleHotmartRefund(payload);
                break;

            default:
                this.logger.log(`Unhandled Hotmart event type: ${eventType}`);
        }
    }

    private async processCartpandaWebhook(webhookEvent: any): Promise<void> {
        const { eventType, payload } = webhookEvent;

        this.logger.log(`Processing Cartpanda event: ${eventType}`);

        switch (eventType) {
            case 'order.paid':
                await this.handleCartpandaOrderPaid(payload);
                break;

            case 'order.canceled':
                await this.handleCartpandaOrderCanceled(payload);
                break;

            default:
                this.logger.log(`Unhandled Cartpanda event type: ${eventType}`);
        }
    }

    private async handleStripeSubscriptionCreated(payload: any): Promise<void> {
        this.logger.log('Handling Stripe subscription.created event');

        const subscription = payload.object || payload.data?.object;
        const platform = await this.prisma.platform.findFirst({ where: { slug: 'stripe' } });

        if (!platform) {
            throw new Error('Stripe platform not found');
        }

        this.logger.log(
            `Subscription created: ${subscription.id} for customer ${subscription.customer}`,
        );

        try {
            const priceData = subscription.items?.data?.[0]?.price;
            const amount = priceData?.unit_amount ? priceData.unit_amount / 100 : 0;
            const currency = subscription.currency || 'usd';
            
            const exchangeRate = currency === 'usd' ? 5.2 : 1;
            const amountBrl = currency === 'usd' ? amount * exchangeRate : amount;
            const amountUsd = currency === 'brl' ? amount / exchangeRate : amount;

            const normalizedData = {
                customer: {
                    externalCustomerId: subscription.customer || `temp_customer_${Date.now()}`,
                    email: 'customer@example.com',
                    name: 'Customer Name',
                },
                subscription: {
                    externalSubscriptionId: subscription.id,
                    externalCustomerId: subscription.customer || `temp_customer_${Date.now()}`,
                    externalProductId: priceData?.product || 'prod_unknown',
                    status: subscription.status,
                    isTrial: subscription.status === 'trialing',
                    trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,

                    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
                    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
                    recurringAmount: amount,
                    currency: currency,
                    recurringAmountBrl: amountBrl,
                    recurringAmountUsd: amountUsd,
                    exchangeRate: exchangeRate,
                    billingPeriod: priceData?.recurring?.interval || 'month',
                    billingCycles: subscription.items?.data?.[0]?.quantity || null,
                    startDate: subscription.created ? new Date(subscription.created * 1000) : new Date(),
                    nextBillingDate: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
                    currentPeriodStart: subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : null,
                    currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
                    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
                    cancellationReason: subscription.cancellation_details?.reason || null,
                    platformMetadata: {
                        stripe_subscription_id: subscription.id,
                        stripe_customer_id: subscription.customer,
                        stripe_price_id: priceData?.id,
                        stripe_product_id: priceData?.product,
                        collection_method: subscription.collection_method,
                        billing_cycle_anchor: subscription.billing_cycle_anchor,
                        cancel_at_period_end: subscription.cancel_at_period_end,
                        cancel_at: subscription.cancel_at,
                        ended_at: subscription.ended_at,
                    },
                },
            };

            await this.persistData(normalizedData, platform.id);
            this.logger.log('Subscription data persisted successfully');
        } catch (error) {
            this.logger.error('Error persisting subscription data:', error);
            throw error;
        }
    }

    private async handleStripeSubscriptionUpdated(payload: any): Promise<void> {
        this.logger.log('Handling Stripe subscription.updated event');

        const subscription = payload.object || payload.data?.object;

        this.logger.log(
            `Subscription updated: ${subscription.id}, status: ${subscription.status}`,
        );

        const platform = await this.prisma.platform.findFirst({ where: { slug: 'stripe' } });

        if (!platform) {
            throw new Error('Stripe platform not found');
        }

        try {
            const normalizedData = {
                subscription: {
                    externalSubscriptionId: subscription.id,
                    externalCustomerId: subscription.customer || `temp_customer_${Date.now()}`,
                    externalProductId: subscription.items?.data?.[0]?.price?.product || 'prod_unknown',
                    status: subscription.status,
                    isTrial: subscription.status === 'trialing',
                    recurringAmount: subscription.items?.data?.[0]?.price?.unit_amount / 100 || 0,
                    currency: subscription.currency,
                    recurringAmountBrl: subscription.items?.data?.[0]?.price?.unit_amount / 100 || 0,
                    recurringAmountUsd: (subscription.items?.data?.[0]?.price?.unit_amount / 100) / 5 || 0,
                    billingPeriod: subscription.items?.data?.[0]?.price?.recurring?.interval || 'month',
                    startDate: new Date(subscription.created * 1000),
                    nextBillingDate: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
                    currentPeriodStart: subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : null,
                    currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
                },
            };

            await this.persistData(normalizedData, platform.id);
            this.logger.log('Subscription updated successfully');
        } catch (error) {
            this.logger.error('Error updating subscription:', error);
            throw error;
        }
    }

    private async handleStripeSubscriptionDeleted(payload: any): Promise<void> {
        this.logger.log('Handling Stripe subscription.deleted event');

        const subscription = payload.object || payload.data?.object;
        const platform = await this.prisma.platform.findFirst({ where: { slug: 'stripe' } });

        if (!platform) {
            throw new Error('Stripe platform not found');
        }

        this.logger.log(`Subscription canceled: ${subscription.id}`);

        try {
            const existingSubscription = await this.prisma.subscription.findFirst({
                where: {
                    platformId: platform.id,
                    externalSubscriptionId: subscription.id,
                },
            });

            if (existingSubscription) {
                await this.prisma.subscription.update({
                    where: { id: existingSubscription.id },
                    data: {
                        status: 'canceled',
                        canceledAt: new Date(),
                    },
                });
                this.logger.log(`Subscription ${subscription.id} marked as canceled`);
            } else {
                this.logger.warn(`Subscription ${subscription.id} not found in database`);
            }
        } catch (error) {
            this.logger.error('Error canceling subscription:', error);
            throw error;
        }
    }

    private async handleStripeInvoicePaid(payload: any): Promise<void> {
        this.logger.log('Handling Stripe invoice.paid event');

        const invoice = payload.object || payload.data?.object;

        this.logger.log(
            `Invoice paid: ${invoice.id}, amount: ${invoice.amount_paid / 100} ${invoice.currency}`,
        );

        const platform = await this.prisma.platform.findFirst({ where: { slug: 'stripe' } });

        if (!platform) {
            throw new Error('Stripe platform not found');
        }

        try {
            const normalizedData = {
                transaction: {
                    externalTransactionId: invoice.payment_intent || invoice.id,
                    externalCustomerId: invoice.customer,
                    transactionType: 'payment',
                    status: 'succeeded',
                    amount: invoice.amount_paid / 100,
                    currency: invoice.currency,
                    amountBrl: invoice.amount_paid / 100,
                    amountUsd: (invoice.amount_paid / 100) / 5,
                    netAmountBrl: invoice.amount_paid / 100,
                    netAmountUsd: (invoice.amount_paid / 100) / 5,
                    feeAmountBrl: 0,
                    feeAmountUsd: 0,
                    paymentMethod: invoice.payment_intent ? 'card' : 'unknown',
                    processedAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : new Date(),
                },
            };

            await this.persistData(normalizedData, platform.id);
            this.logger.log('Transaction created successfully');
        } catch (error) {
            this.logger.error('Error creating transaction:', error);
            throw error;
        }
    }

    private async handleStripeInvoiceFailed(payload: any): Promise<void> {
        this.logger.log('Handling Stripe invoice.payment_failed event');

        const invoice = payload.object || payload.data?.object;

        this.logger.log(`Invoice payment failed: ${invoice.id}`);

        const platform = await this.prisma.platform.findFirst({ where: { slug: 'stripe' } });

        if (!platform) {
            throw new Error('Stripe platform not found');
        }

        try {
            const subscription = await this.prisma.subscription.findFirst({
                where: {
                    platformId: platform.id,
                    externalSubscriptionId: invoice.subscription,
                },
            });

            if (subscription) {
                await this.prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        status: 'past_due',
                    },
                });
                this.logger.log(`Subscription ${invoice.subscription} marked as past_due`);
            } else {
                this.logger.warn(`Subscription ${invoice.subscription} not found in database`);
            }
        } catch (error) {
            this.logger.error('Error updating subscription status:', error);
            throw error;
        }
    }

    private async handleStripeCustomerEvent(payload: any): Promise<void> {
        this.logger.log('Handling Stripe customer event');

        const customer = payload.object || payload.data?.object;
        const platform = await this.prisma.platform.findFirst({ where: { slug: 'stripe' } });

        if (!platform) {
            throw new Error('Stripe platform not found');
        }

        this.logger.log(`Customer event: ${customer.id}, email: ${customer.email}`);

        try {
            const normalizedData = {
                customer: {
                    externalCustomerId: customer.id,
                    email: customer.email || `${customer.id}@stripe.test`,
                    name: customer.name || customer.email || 'Customer',
                    phone: customer.phone,
                    document: customer.metadata?.document,
                    documentType: customer.metadata?.documentType,
                    countryCode: customer.address?.country,
                    state: customer.address?.state,
                    city: customer.address?.city,
                    metadata: customer.metadata,
                },
            };

            await this.persistData(normalizedData, platform.id);
            this.logger.log('Customer data persisted successfully');
        } catch (error) {
            this.logger.error('Error persisting customer data:', error);
            throw error;
        }
    }

    private async handleHotmartPurchaseApproved(payload: any): Promise<void> {
        this.logger.log('Handling Hotmart PURCHASE_APPROVED event');

        const purchase = payload.data?.purchase || payload;
        const buyer = purchase.buyer || {};
        const product = purchase.product || {};

        this.logger.log(
            `Purchase approved: ${purchase.transaction} for customer ${buyer.email}`,
        );
        this.logger.log(
            `Product: ${product.name} (ID: ${product.id})`,
        );
        this.logger.log(
            `Amount: ${purchase.price?.value} ${purchase.price?.currency_code || 'BRL'}`,
        );

        this.logger.log(
            'TODO (Fase 4): Create subscription and transaction records',
        );
    }

    private async handleHotmartSubscriptionCanceled(payload: any): Promise<void> {
        this.logger.log('Handling Hotmart subscription cancellation event');

        const subscription = payload.data?.subscription || payload.subscription || {};

        this.logger.log(
            `Subscription canceled: ${subscription.subscriber_code}`,
        );
        this.logger.log(
            `Cancellation date: ${subscription.cancellation_date}`,
        );

        this.logger.log(
            'TODO (Fase 4): Mark subscription as canceled in database',
        );
    }

    private async handleHotmartRefund(payload: any): Promise<void> {
        this.logger.log('Handling Hotmart PURCHASE_REFUNDED event');

        const purchase = payload.data?.purchase || payload;

        this.logger.log(
            `Purchase refunded: ${purchase.transaction}`,
        );
        this.logger.log(
            `Refund amount: ${purchase.price?.value} ${purchase.price?.currency_code || 'BRL'}`,
        );

        this.logger.log(
            'TODO (Fase 4): Create refund transaction and update subscription',
        );
    }

    private async handleCartpandaOrderPaid(payload: any): Promise<void> {
        this.logger.log('Handling Cartpanda order.paid event');

        const order = payload.order || payload.data?.order || payload;
        const customer = order.customer || {};

        this.logger.log(
            `Order paid: ${order.id || order.order_number}`,
        );
        this.logger.log(
            `Customer: ${customer.email || customer.name}`,
        );
        this.logger.log(
            `Amount: ${order.amount || order.total} ${order.currency || 'BRL'}`,
        );
        this.logger.log(
            `Payment method: ${order.payment_method}`,
        );

        if (order.subscription_id) {
            this.logger.log(`Subscription ID: ${order.subscription_id}`);
        }

        this.logger.log(
            'TODO (Fase 4): Create subscription and transaction records',
        );
    }

    private async handleCartpandaOrderCanceled(payload: any): Promise<void> {
        this.logger.log('Handling Cartpanda order.canceled event');

        const order = payload.order || payload.data?.order || payload;

        this.logger.log(
            `Order canceled: ${order.id || order.order_number}`,
        );
        this.logger.log(
            `Cancellation reason: ${order.cancellation_reason || 'Not provided'}`,
        );

        if (order.subscription_id) {
            this.logger.log(`Subscription ID: ${order.subscription_id}`);
            this.logger.log(
                'TODO (Fase 4): Mark subscription as canceled in database',
            );
        }
    }

    private async persistData(normalizedData: any, platformId: string) {
        if (normalizedData.customer) {
            if (!normalizedData.customer.externalCustomerId) {
                this.logger.warn('No externalCustomerId found for customer, skipping customer creation');
                return;
            }

            const customer = await this.customersService.upsert(
                platformId,
                normalizedData.customer.externalCustomerId,
                {
                    externalCustomerId: normalizedData.customer.externalCustomerId,
                    email: normalizedData.customer.email,
                    name: normalizedData.customer.name,
                    phone: normalizedData.customer.phone,
                    document: normalizedData.customer.document,
                    documentType: normalizedData.customer.documentType,
                    countryCode: normalizedData.customer.countryCode,
                    state: normalizedData.customer.state,
                    city: normalizedData.customer.city,
                    metadata: normalizedData.customer.metadata,
                },
            );

            normalizedData.customer.id = customer.id;
        }

        // Process affiliate if present
        if (normalizedData.affiliate) {
            try {
                const affiliate = await this.affiliatesService.upsert(
                    platformId,
                    normalizedData.affiliate.externalAffiliateId,
                    {
                        externalAffiliateId: normalizedData.affiliate.externalAffiliateId,
                        name: normalizedData.affiliate.name,
                        email: normalizedData.affiliate.email,
                        phone: normalizedData.affiliate.phone,
                        instagramHandle: normalizedData.affiliate.instagramHandle,
                        youtubeHandle: normalizedData.affiliate.youtubeHandle,
                        tiktokHandle: normalizedData.affiliate.tiktokHandle,
                        twitterHandle: normalizedData.affiliate.twitterHandle,
                        metadata: normalizedData.affiliate.metadata,
                    },
                );

                normalizedData.affiliate.id = affiliate.id;
                this.logger.log(`Affiliate processed: ${affiliate.id} (${affiliate.name})`);
            } catch (error) {
                this.logger.error(`Error processing affiliate: ${error.message}`);
            }
        }

        if (normalizedData.subscription) {
            if (!normalizedData.customer?.id) {
                this.logger.warn('No customer ID available for subscription, skipping subscription creation');
                return;
            }

            const externalProductId = normalizedData.subscription.externalProductId || 'prod_unknown';
            let product = await this.prisma.product.findFirst({
                where: { 
                    slug: externalProductId,
                    isActive: true 
                }
            });

            if (!product) {
                product = await this.prisma.product.create({
                    data: {
                        name: `Stripe Product ${externalProductId}`,
                        slug: externalProductId,
                        description: `Product from Stripe: ${externalProductId}`,
                        productType: 'subscription',
                        isActive: true,
                        metadata: {
                            externalProductId,
                            platform: 'stripe',
                            source: 'webhook'
                        }
                    }
                });
                this.logger.log(`Created new product: ${product.id} for Stripe product: ${externalProductId}`);
            }

            const subscription = await this.subscriptionsService.upsert(
                platformId,
                normalizedData.subscription.externalSubscriptionId,
                {
                    ...normalizedData.subscription,
                    customerId: normalizedData.customer.id,
                    platformId,
                    productId: product.id,
                },
            );

            normalizedData.subscription.id = subscription.id;
        }

        if (normalizedData.transaction) {
            // Verificar se customer foi criado
            if (!normalizedData.customer?.id) {
                this.logger.warn('No customer ID available for transaction, skipping transaction creation');
                return;
            }

            const transaction = await this.transactionsService.create({
                ...normalizedData.transaction,
                customerId: normalizedData.customer.id,
                platformId,
                orderId: normalizedData.order?.id,
            });

            if (normalizedData.subscription?.id) {
                await this.transactionsService.linkToSubscription(
                    transaction.id,
                    normalizedData.subscription.id,
                    Number(transaction.netAmountBrl),
                );
            }

            if (transaction.status === 'succeeded' && transaction.transactionType !== 'refund') {
                await this.customersService.updateTotalSpent(
                    normalizedData.customer.id,
                    Number(transaction.netAmountBrl),
                );

                // Update affiliate stats if affiliate is present
                if (normalizedData.affiliate?.id) {
                    try {
                        await this.affiliatesService.updateStats(
                            normalizedData.affiliate.id,
                            Number(transaction.netAmountBrl),
                            Number(transaction.netAmountUsd),
                        );
                        this.logger.log(`Affiliate stats updated: ${normalizedData.affiliate.id}`);
                    } catch (error) {
                        this.logger.error(`Error updating affiliate stats: ${error.message}`);
                    }
                }
            }
        }

        if (normalizedData.order && !normalizedData.order.id) {
            await this.ordersService.create({
                ...normalizedData.order,
                customerId: normalizedData.customer.id,
                platformId,
            });
        }
    }

    /**
     * Enfileira um job para calcular métricas diárias
     */
    private async enqueueMetricsCalculation(platformId: string): Promise<void> {
        try {
            await this.metricsQueue.add('calculate-daily-metrics', {
                platformId,
                date: new Date().toISOString().split('T')[0],
            });
            
            this.logger.log(`Metrics calculation job enqueued for platform ${platformId}`);
        } catch (error) {
            this.logger.error(`Failed to enqueue metrics calculation: ${error.message}`);
        }
    }
}

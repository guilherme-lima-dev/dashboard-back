import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { WebhookProcessor } from './processors/webhook.processor';
import { StripeWebhookValidator } from './validators/stripe-webhook-validator';
import { HotmartWebhookValidator } from './validators/hotmart-webhook-validator';
import { CartpandaWebhookValidator } from './validators/cartpanda-webhook-validator';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationCredentialsModule } from '../integration-credentials/integration-credential.module';
import { PaymentProvidersModule } from '../payment-providers/payment-providers.module';
import { CustomersModule } from '../customers/customers.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { OrdersModule } from '../orders/orders.module';
import { AffiliatesModule } from '../affiliates/affiliates.module';

@Module({
    imports: [
        PrismaModule,
        IntegrationCredentialsModule,
        PaymentProvidersModule,
        CustomersModule,
        SubscriptionsModule,
        TransactionsModule,
        OrdersModule,
        AffiliatesModule,
        BullModule.registerQueue({
            name: 'webhooks',
        }),
    ],
    controllers: [WebhooksController],
    providers: [
        WebhooksService,
        WebhookProcessor,
        StripeWebhookValidator,
        HotmartWebhookValidator,
        CartpandaWebhookValidator,
    ],
    exports: [WebhooksService],
})
export class WebhooksModule {}

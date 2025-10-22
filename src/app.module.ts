import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PlatformsModule } from './modules/platforms/platforms.module';
import { ProductsModule } from './modules/products/products.module';
import { OffersModule } from './modules/offers/offers.module';
import { OfferPlatformMappingsModule } from './modules/offer-platform-mappings/offer-platform-mappings.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { CustomersModule } from './modules/customers/customers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { AffiliatesModule } from './modules/affiliates/affiliates.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditModule } from './modules/audit/audit.module';
import { JobsModule } from './jobs/jobs.module';
import {APP_GUARD} from "@nestjs/core";
import {JwtAuthGuard} from "./common/guards/jwt-auth.guard";
import {PermissionsGuard} from "./common/guards/permissions.guard";
import {IntegrationCredentialsModule} from "./modules/integration-credentials/integration-credential.module";
import {BullModule} from "@nestjs/bull";
import {WebhooksModule} from "./modules/webhooks/webhooks.module";
import {PaymentProvidersModule} from "./modules/payment-providers/payment-providers.module";
import {SyncModule} from "./modules/sync/sync.module";
import {BullBoardModule} from "@bull-board/nestjs";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    WebhooksModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    PermissionsModule,
    PlatformsModule,
    ProductsModule,
    OffersModule,
    OfferPlatformMappingsModule,
    IntegrationsModule,
    CustomersModule,
    OrdersModule,
    SubscriptionsModule,
    TransactionsModule,
    AffiliatesModule,
    AnalyticsModule,
    AuditModule,
    JobsModule,
    IntegrationCredentialsModule,
    PaymentProvidersModule,
    SyncModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}

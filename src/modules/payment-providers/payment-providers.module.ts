import { Module } from '@nestjs/common';
import { PaymentProvidersService } from './payment-providers.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationCredentialsModule } from '../integration-credentials/integration-credential.module';

@Module({
    imports: [PrismaModule, IntegrationCredentialsModule],
    providers: [PaymentProvidersService],
    exports: [PaymentProvidersService],
})
export class PaymentProvidersModule {}

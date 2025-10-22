import { Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationCredentialsService } from '../integration-credentials/integration-credentials.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeProvider } from './providers/stripe.provider';
import { HotmartProvider } from './providers/hotmart.provider';
import { CartpandaProvider } from './providers/cartpanda.provider';
import { IPaymentProvider } from './interfaces/payment-provider.interface';

@Injectable()
export class PaymentProvidersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly credentialsService: IntegrationCredentialsService,
    ) {}

    async getProvider(platformSlug: string): Promise<IPaymentProvider> {
        const platform = await this.prisma.platform.findUnique({
            where: { slug: platformSlug },
        });

        if (!platform) {
            throw new NotFoundException('Plataforma não encontrada');
        }

        switch (platformSlug) {
            case 'stripe':
                return this.getStripeProvider(platform.id);

            case 'hotmart':
                return this.getHotmartProvider(platform.id);

            case 'cartpanda':
                return this.getCartpandaProvider(platform.id);

            default:
                throw new NotFoundException(`Provider não implementado: ${platformSlug}`);
        }
    }

    private async getStripeProvider(platformId: string): Promise<StripeProvider> {
        const credential = await this.credentialsService.findByType(
            platformId,
            'api_secret_key',
            'sandbox',
            true,
        );

        if (!credential || !credential.decryptedValue) {
            throw new NotFoundException('Credencial Stripe não configurada');
        }

        return new StripeProvider(credential.decryptedValue);
    }

    private async getHotmartProvider(platformId: string): Promise<HotmartProvider> {
        const clientId = await this.credentialsService.findByType(
            platformId,
            'client_id',
            'sandbox',
            true,
        );

        const clientSecret = await this.credentialsService.findByType(
            platformId,
            'client_secret',
            'sandbox',
            true,
        );

        const basicToken = await this.credentialsService.findByType(
            platformId,
            'basic_token',
            'sandbox',
            true,
        );

        if (!clientId?.decryptedValue || !clientSecret?.decryptedValue || !basicToken?.decryptedValue) {
            throw new NotFoundException('Credenciais Hotmart não configuradas completamente');
        }

        return new HotmartProvider(
            clientId.decryptedValue,
            clientSecret.decryptedValue,
            basicToken.decryptedValue,
        );
    }

    private async getCartpandaProvider(platformId: string): Promise<CartpandaProvider> {
        const credential = await this.credentialsService.findByType(
            platformId,
            'api_key',
            'sandbox',
            true,
        );

        if (!credential || !credential.decryptedValue) {
            throw new NotFoundException('Credencial Cartpanda não configurada');
        }

        return new CartpandaProvider(credential.decryptedValue);
    }

    async testConnection(platformSlug: string): Promise<boolean> {
        const provider = await this.getProvider(platformSlug);
        return provider.testConnection();
    }
}

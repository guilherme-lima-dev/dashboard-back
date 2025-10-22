import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
    IPaymentProvider,
    FetchParams,
    NormalizedSubscription,
    NormalizedTransaction,
    NormalizedCustomer,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class HotmartProvider implements IPaymentProvider {
    readonly name = 'Hotmart';
    readonly slug = 'hotmart';
    private readonly logger = new Logger(HotmartProvider.name);
    private api: AxiosInstance;

    constructor(
        private readonly clientId: string,
        private readonly clientSecret: string,
        private readonly basicToken: string,
    ) {
        this.api = axios.create({
            baseURL: 'https://developers.hotmart.com',
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    async testConnection(): Promise<boolean> {
        try {
            const token = await this.getAccessToken();
            return !!token;
        } catch (error) {
            this.logger.error('Hotmart connection test failed:', error.message);
            return false;
        }
    }

    private async getAccessToken(): Promise<string> {
        try {
            const response = await axios.post(
                'https://api-sec-vlc.hotmart.com/security/oauth/token',
                new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            return response.data.access_token;
        } catch (error) {
            this.logger.error('Error getting Hotmart access token:', error.message);
            throw error;
        }
    }

    async fetchSubscriptions(params: FetchParams): Promise<NormalizedSubscription[]> {
        try {
            const token = await this.getAccessToken();

            const queryParams: any = {
                max_results: params.limit || 100,
                transaction_status: 'APPROVED',
            };

            if (params.startDate) {
                queryParams.start_date = params.startDate.getTime();
            }

            if (params.endDate) {
                queryParams.end_date = params.endDate.getTime();
            }

            if (params.cursor) {
                queryParams.page_token = params.cursor;
            }

            const response = await this.api.get('/payments/api/v1/subscriptions', {
                params: queryParams,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const subscriptions = response.data.items || [];

            return subscriptions.map((sub: any) => this.normalizeSubscription(sub));
        } catch (error) {
            this.logger.error('Error fetching subscriptions from Hotmart:', error.message);
            throw error;
        }
    }

    async fetchTransactions(params: FetchParams): Promise<NormalizedTransaction[]> {
        try {
            const token = await this.getAccessToken();

            const queryParams: any = {
                max_results: params.limit || 100,
                transaction_status: 'APPROVED',
            };

            if (params.startDate) {
                queryParams.start_date = params.startDate.getTime();
            }

            if (params.endDate) {
                queryParams.end_date = params.endDate.getTime();
            }

            if (params.cursor) {
                queryParams.page_token = params.cursor;
            }

            const response = await this.api.get('/payments/api/v1/sales/history', {
                params: queryParams,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const transactions = response.data.items || [];

            return transactions.map((tx: any) => this.normalizeTransaction(tx));
        } catch (error) {
            this.logger.error('Error fetching transactions from Hotmart:', error.message);
            throw error;
        }
    }

    async fetchCustomers(params: FetchParams): Promise<NormalizedCustomer[]> {
        this.logger.warn('Hotmart does not provide a dedicated customers API');
        return [];
    }

    private normalizeSubscription(sub: any): NormalizedSubscription {
        const purchase = sub.purchase || sub;
        const subscription = sub.subscription || {};

        const isTrial = subscription.status === 'TRIAL';
        const isActive = ['ACTIVE', 'TRIAL', 'OVERDUE'].includes(subscription.status);

        return {
            externalSubscriptionId: subscription.subscriber_code || purchase.transaction,
            externalCustomerId: purchase.buyer?.email || 'unknown',
            externalProductId: String(purchase.product?.id || ''),
            externalPriceId: String(purchase.offer?.code || ''),

            status: this.mapSubscriptionStatus(subscription.status),

            isTrial,
            trialStartDate: subscription.trial_start_date
                ? new Date(subscription.trial_start_date)
                : undefined,
            trialEndDate: subscription.trial_end_date
                ? new Date(subscription.trial_end_date)
                : undefined,

            recurringAmount: this.convertToMinorUnit(subscription.recurrence_price?.value || 0),
            recurringCurrency: 'BRL',
            billingPeriod: this.mapRecurrencePeriod(subscription.recurrence_period),
            billingInterval: 1,

            startedAt: purchase.approved_date
                ? new Date(purchase.approved_date)
                : new Date(),
            currentPeriodStart: subscription.date_next_charge
                ? new Date(subscription.date_next_charge)
                : undefined,
            currentPeriodEnd: subscription.date_next_charge
                ? new Date(subscription.date_next_charge)
                : undefined,
            canceledAt: subscription.cancellation_date
                ? new Date(subscription.cancellation_date)
                : undefined,

            metadata: {
                productName: purchase.product?.name,
                offerCode: purchase.offer?.code,
            },
        };
    }

    private normalizeTransaction(tx: any): NormalizedTransaction {
        const purchase = tx.purchase || tx;
        const buyer = purchase.buyer || {};

        return {
            externalTransactionId: purchase.transaction,
            externalCustomerId: buyer.email || 'unknown',
            externalSubscriptionId: purchase.subscription?.subscriber_code,

            type: purchase.subscription ? 'subscription_payment' : 'one_time_payment',
            status: this.mapTransactionStatus(purchase.status),

            amount: this.convertToMinorUnit(purchase.price?.value || 0),
            currency: purchase.price?.currency_code || 'BRL',

            paymentMethod: this.mapPaymentType(purchase.payment?.type),

            createdAt: purchase.order_date ? new Date(purchase.order_date) : new Date(),
            paidAt: purchase.approved_date ? new Date(purchase.approved_date) : undefined,

            metadata: {
                commission: purchase.commission,
                productName: purchase.product?.name,
            },
        };
    }

    private normalizeCustomer(buyer: any): NormalizedCustomer {
        return {
            externalCustomerId: buyer.email,

            email: buyer.email,
            name: buyer.name,
            phone: buyer.phone,

            document: buyer.document,
            documentType: 'CPF',

            addressCountry: buyer.address?.country || 'BR',
            addressState: buyer.address?.state,
            addressCity: buyer.address?.city,
            addressZipCode: buyer.address?.zip_code,
            addressLine1: buyer.address?.address,
            addressLine2: buyer.address?.neighborhood,

            createdAt: new Date(),

            metadata: {},
        };
    }

    private mapSubscriptionStatus(status: string): NormalizedSubscription['status'] {
        const statusMap: Record<string, NormalizedSubscription['status']> = {
            'TRIAL': 'trial_active',
            'ACTIVE': 'active',
            'OVERDUE': 'past_due',
            'CANCELLED': 'canceled',
            'CANCELLED_BY_ADMIN': 'canceled',
            'CANCELLED_BY_CUSTOMER': 'canceled',
            'DELAYED': 'past_due',
            'INACTIVE': 'expired',
        };

        return statusMap[status] || 'canceled';
    }

    private mapTransactionStatus(status: string): NormalizedTransaction['status'] {
        const statusMap: Record<string, NormalizedTransaction['status']> = {
            'APPROVED': 'succeeded',
            'COMPLETE': 'succeeded',
            'REFUNDED': 'refunded',
            'CANCELLED': 'failed',
            'CHARGEBACK': 'refunded',
            'BLOCKED': 'failed',
            'PRINTED_BILLET': 'pending',
            'WAITING_PAYMENT': 'pending',
        };

        return statusMap[status] || 'pending';
    }

    private mapRecurrencePeriod(period: string): NormalizedSubscription['billingPeriod'] {
        const periodMap: Record<string, NormalizedSubscription['billingPeriod']> = {
            'WEEKLY': 'week',
            'MONTHLY': 'month',
            'QUARTERLY': 'month',
            'SEMIANNUALLY': 'month',
            'YEARLY': 'year',
        };

        return periodMap[period] || 'month';
    }

    private mapPaymentType(type: string): string {
        const typeMap: Record<string, string> = {
            'CREDIT_CARD': 'card',
            'BILLET': 'boleto',
            'PAYPAL': 'paypal',
            'PIX': 'pix',
        };

        return typeMap[type] || 'unknown';
    }

    private convertToMinorUnit(value: number): number {
        return Math.round(value * 100);
    }
}

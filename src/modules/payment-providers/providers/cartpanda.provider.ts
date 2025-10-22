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
export class CartpandaProvider implements IPaymentProvider {
    readonly name = 'Cartpanda';
    readonly slug = 'cartpanda';
    private readonly logger = new Logger(CartpandaProvider.name);
    private api: AxiosInstance;

    constructor(private readonly apiKey: string) {
        this.api = axios.create({
            baseURL: 'https://api.cartpanda.com/v1',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.api.get('/account');
            return true;
        } catch (error) {
            this.logger.error('Cartpanda connection test failed:', error.message);
            return false;
        }
    }

    async fetchSubscriptions(params: FetchParams): Promise<NormalizedSubscription[]> {
        try {
            const queryParams: any = {
                limit: params.limit || 100,
                status: 'active',
            };

            if (params.startDate) {
                queryParams.created_after = params.startDate.toISOString();
            }

            if (params.endDate) {
                queryParams.created_before = params.endDate.toISOString();
            }

            if (params.cursor) {
                queryParams.starting_after = params.cursor;
            }

            const response = await this.api.get('/subscriptions', {
                params: queryParams,
            });

            const subscriptions = response.data.data || [];

            return subscriptions.map((sub: any) => this.normalizeSubscription(sub));
        } catch (error) {
            this.logger.error('Error fetching subscriptions from Cartpanda:', error.message);
            throw error;
        }
    }

    async fetchTransactions(params: FetchParams): Promise<NormalizedTransaction[]> {
        try {
            const queryParams: any = {
                limit: params.limit || 100,
                status: 'paid',
            };

            if (params.startDate) {
                queryParams.created_after = params.startDate.toISOString();
            }

            if (params.endDate) {
                queryParams.created_before = params.endDate.toISOString();
            }

            if (params.cursor) {
                queryParams.starting_after = params.cursor;
            }

            const response = await this.api.get('/orders', {
                params: queryParams,
            });

            const orders = response.data.data || [];

            return orders.map((order: any) => this.normalizeTransaction(order));
        } catch (error) {
            this.logger.error('Error fetching transactions from Cartpanda:', error.message);
            throw error;
        }
    }

    async fetchCustomers(params: FetchParams): Promise<NormalizedCustomer[]> {
        try {
            const queryParams: any = {
                limit: params.limit || 100,
            };

            if (params.startDate) {
                queryParams.created_after = params.startDate.toISOString();
            }

            if (params.endDate) {
                queryParams.created_before = params.endDate.toISOString();
            }

            if (params.cursor) {
                queryParams.starting_after = params.cursor;
            }

            const response = await this.api.get('/customers', {
                params: queryParams,
            });

            const customers = response.data.data || [];

            return customers.map((customer: any) => this.normalizeCustomer(customer));
        } catch (error) {
            this.logger.error('Error fetching customers from Cartpanda:', error.message);
            throw error;
        }
    }

    private normalizeSubscription(sub: any): NormalizedSubscription {
        const isTrial = sub.trial_end && new Date(sub.trial_end) > new Date();

        return {
            externalSubscriptionId: sub.id,
            externalCustomerId: sub.customer_id || sub.customer?.id,
            externalProductId: sub.product_id || sub.product?.id,
            externalPriceId: sub.plan_id || sub.plan?.id,

            status: this.mapSubscriptionStatus(sub.status),

            isTrial,
            trialStartDate: sub.trial_start ? new Date(sub.trial_start) : undefined,
            trialEndDate: sub.trial_end ? new Date(sub.trial_end) : undefined,

            recurringAmount: this.convertToMinorUnit(sub.amount || sub.plan?.amount || 0),
            recurringCurrency: sub.currency || 'BRL',
            billingPeriod: this.mapBillingPeriod(sub.interval || sub.plan?.interval),
            billingInterval: sub.interval_count || sub.plan?.interval_count || 1,

            startedAt: new Date(sub.created_at),
            currentPeriodStart: sub.current_period_start
                ? new Date(sub.current_period_start)
                : undefined,
            currentPeriodEnd: sub.current_period_end
                ? new Date(sub.current_period_end)
                : undefined,
            canceledAt: sub.canceled_at ? new Date(sub.canceled_at) : undefined,
            cancelAtPeriodEnd: sub.cancel_at_period_end || false,

            metadata: {
                planName: sub.plan?.name,
                productName: sub.product?.name,
            },
        };
    }

    private normalizeTransaction(order: any): NormalizedTransaction {
        return {
            externalTransactionId: order.id,
            externalCustomerId: order.customer_id || order.customer?.id,
            externalSubscriptionId: order.subscription_id,
            externalInvoiceId: order.invoice_id,

            type: order.subscription_id ? 'subscription_payment' : 'one_time_payment',
            status: this.mapTransactionStatus(order.status),

            amount: this.convertToMinorUnit(order.amount || order.total || 0),
            currency: order.currency || 'BRL',

            paymentMethod: this.mapPaymentMethod(order.payment_method),

            createdAt: new Date(order.created_at),
            paidAt: order.paid_at ? new Date(order.paid_at) : undefined,
            refundedAt: order.refunded_at ? new Date(order.refunded_at) : undefined,

            metadata: {
                orderNumber: order.order_number,
                items: order.items,
            },
        };
    }

    private normalizeCustomer(customer: any): NormalizedCustomer {
        return {
            externalCustomerId: customer.id,

            email: customer.email,
            name: customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            phone: customer.phone,

            document: customer.document || customer.cpf || customer.cnpj,
            documentType: customer.document_type || (customer.cpf ? 'CPF' : customer.cnpj ? 'CNPJ' : undefined),

            addressCountry: customer.address?.country || 'BR',
            addressState: customer.address?.state,
            addressCity: customer.address?.city,
            addressZipCode: customer.address?.zipcode || customer.address?.zip_code,
            addressLine1: customer.address?.street,
            addressLine2: customer.address?.complement,

            createdAt: new Date(customer.created_at),

            metadata: {
                customerId: customer.customer_id,
            },
        };
    }

    private mapSubscriptionStatus(status: string): NormalizedSubscription['status'] {
        const statusMap: Record<string, NormalizedSubscription['status']> = {
            'trialing': 'trial_active',
            'active': 'active',
            'past_due': 'past_due',
            'canceled': 'canceled',
            'cancelled': 'canceled',
            'unpaid': 'expired',
            'incomplete': 'expired',
            'paused': 'paused',
        };

        return statusMap[status?.toLowerCase()] || 'canceled';
    }

    private mapTransactionStatus(status: string): NormalizedTransaction['status'] {
        const statusMap: Record<string, NormalizedTransaction['status']> = {
            'paid': 'succeeded',
            'completed': 'succeeded',
            'pending': 'pending',
            'processing': 'pending',
            'failed': 'failed',
            'cancelled': 'failed',
            'refunded': 'refunded',
        };

        return statusMap[status?.toLowerCase()] || 'pending';
    }

    private mapBillingPeriod(interval: string): NormalizedSubscription['billingPeriod'] {
        const intervalMap: Record<string, NormalizedSubscription['billingPeriod']> = {
            'day': 'day',
            'daily': 'day',
            'week': 'week',
            'weekly': 'week',
            'month': 'month',
            'monthly': 'month',
            'year': 'year',
            'yearly': 'year',
            'annual': 'year',
        };

        return intervalMap[interval?.toLowerCase()] || 'month';
    }

    private mapPaymentMethod(method: string): string {
        const methodMap: Record<string, string> = {
            'credit_card': 'card',
            'debit_card': 'card',
            'pix': 'pix',
            'boleto': 'boleto',
            'bank_slip': 'boleto',
        };

        return methodMap[method?.toLowerCase()] || method || 'unknown';
    }

    private convertToMinorUnit(value: number): number {
        return Math.round(value * 100);
    }
}

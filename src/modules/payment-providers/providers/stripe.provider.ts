import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
    IPaymentProvider,
    FetchParams,
    NormalizedSubscription,
    NormalizedTransaction,
    NormalizedCustomer,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class StripeProvider implements IPaymentProvider {
    readonly name = 'Stripe';
    readonly slug = 'stripe';
    private readonly logger = new Logger(StripeProvider.name);
    private stripe: Stripe;

    constructor(apiKey: string) {
        this.stripe = new Stripe(apiKey, {
            apiVersion: '2025-09-30.clover',
        });
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.stripe.accounts.retrieve();
            return true;
        } catch (error) {
            this.logger.error('Stripe connection test failed:', error.message);
            return false;
        }
    }

    async fetchSubscriptions(params: FetchParams): Promise<NormalizedSubscription[]> {
        try {
            const queryParams: Stripe.SubscriptionListParams = {
                limit: params.limit || 100,
            };

            if (params.startDate) {
                queryParams.created = {
                    gte: Math.floor(params.startDate.getTime() / 1000),
                };
            }

            if (params.endDate) {
                if (typeof queryParams.created === 'object') {
                    queryParams.created.lte = Math.floor(params.endDate.getTime() / 1000);
                } else {
                    queryParams.created = {
                        lte: Math.floor(params.endDate.getTime() / 1000),
                    };
                }
            }

            if (params.cursor) {
                queryParams.starting_after = params.cursor;
            }

            const subscriptions = await this.stripe.subscriptions.list(queryParams);

            return subscriptions.data.map((sub) => this.normalizeSubscription(sub));
        } catch (error) {
            this.logger.error('Error fetching subscriptions from Stripe:', error.message);
            throw error;
        }
    }

    async fetchTransactions(params: FetchParams): Promise<NormalizedTransaction[]> {
        try {
            const queryParams: Stripe.InvoiceListParams = {
                limit: params.limit || 100,
                status: 'paid',
            };

            if (params.startDate) {
                queryParams.created = {
                    gte: Math.floor(params.startDate.getTime() / 1000),
                };
            }

            if (params.endDate) {
                if (typeof queryParams.created === 'object') {
                    queryParams.created.lte = Math.floor(params.endDate.getTime() / 1000);
                } else {
                    queryParams.created = {
                        lte: Math.floor(params.endDate.getTime() / 1000),
                    };
                }
            }

            if (params.cursor) {
                queryParams.starting_after = params.cursor;
            }

            const invoices = await this.stripe.invoices.list(queryParams);

            return invoices.data.map((invoice) => this.normalizeTransaction(invoice));
        } catch (error) {
            this.logger.error('Error fetching transactions from Stripe:', error.message);
            throw error;
        }
    }

    async fetchCustomers(params: FetchParams): Promise<NormalizedCustomer[]> {
        try {
            const queryParams: Stripe.CustomerListParams = {
                limit: params.limit || 100,
            };

            if (params.startDate) {
                queryParams.created = {
                    gte: Math.floor(params.startDate.getTime() / 1000),
                };
            }

            if (params.endDate) {
                if (typeof queryParams.created === 'object') {
                    queryParams.created.lte = Math.floor(params.endDate.getTime() / 1000);
                } else {
                    queryParams.created = {
                        lte: Math.floor(params.endDate.getTime() / 1000),
                    };
                }
            }

            if (params.cursor) {
                queryParams.starting_after = params.cursor;
            }

            const customers = await this.stripe.customers.list(queryParams);

            return customers.data.map((customer) => this.normalizeCustomer(customer));
        } catch (error) {
            this.logger.error('Error fetching customers from Stripe:', error.message);
            throw error;
        }
    }

    private normalizeSubscription(sub: Stripe.Subscription): NormalizedSubscription {
        const isTrial = sub.status === 'trialing';
        const firstItem = sub.items.data[0];
        const price = firstItem?.price;

        return {
            externalSubscriptionId: sub.id,
            externalCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
            externalProductId: typeof price?.product === 'string' ? price.product : price?.product?.id || '',
            externalPriceId: price?.id,

            status: this.mapSubscriptionStatus(sub.status),

            isTrial,
            trialStartDate: sub.trial_start ? new Date(sub.trial_start * 1000) : undefined,
            trialEndDate: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,

            recurringAmount: price?.unit_amount || 0,
            recurringCurrency: price?.currency || 'usd',
            billingPeriod: this.mapInterval(price?.recurring?.interval),
            billingInterval: price?.recurring?.interval_count || 1,

            startedAt: new Date(sub.created * 1000),
            currentPeriodStart: firstItem?.current_period_start
                ? new Date(firstItem.current_period_start * 1000)
                : undefined,
            currentPeriodEnd: firstItem?.current_period_end
                ? new Date(firstItem.current_period_end * 1000)
                : undefined,
            canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : undefined,
            cancelAtPeriodEnd: sub.cancel_at_period_end,

            metadata: sub.metadata || undefined,
        };
    }

    private normalizeTransaction(invoice: Stripe.Invoice): NormalizedTransaction {
        const chargeValue = (invoice as any).charge;
        const chargeId = chargeValue && typeof chargeValue === 'string'
            ? chargeValue
            : chargeValue && typeof chargeValue === 'object'
                ? chargeValue.id
                : null;

        const subscriptionValue = (invoice as any).subscription;
        const subscriptionId = subscriptionValue && typeof subscriptionValue === 'string'
            ? subscriptionValue
            : subscriptionValue && typeof subscriptionValue === 'object'
                ? subscriptionValue.id
                : null;

        const paymentIntentValue = (invoice as any).payment_intent;

        return {
            externalTransactionId: chargeId || invoice.id,
            externalCustomerId: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || '',
            externalSubscriptionId: subscriptionId || undefined,
            externalInvoiceId: invoice.id,

            type: subscriptionId ? 'subscription_payment' : 'one_time_payment',
            status: this.mapInvoiceStatus(invoice.status),

            amount: invoice.amount_paid,
            currency: invoice.currency,

            paymentMethod: paymentIntentValue ? 'card' : undefined,

            createdAt: new Date(invoice.created * 1000),
            paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : undefined,

            metadata: invoice.metadata || undefined,
        };
    }

    private normalizeCustomer(customer: Stripe.Customer): NormalizedCustomer {
        return {
            externalCustomerId: customer.id,

            email: customer.email || undefined,
            name: customer.name || undefined,
            phone: customer.phone || undefined,

            addressCountry: customer.address?.country || undefined,
            addressState: customer.address?.state || undefined,
            addressCity: customer.address?.city || undefined,
            addressZipCode: customer.address?.postal_code || undefined,
            addressLine1: customer.address?.line1 || undefined,
            addressLine2: customer.address?.line2 || undefined,

            createdAt: new Date(customer.created * 1000),

            metadata: customer.metadata || undefined,
        };
    }

    private mapSubscriptionStatus(status: Stripe.Subscription.Status): NormalizedSubscription['status'] {
        const statusMap: Record<string, NormalizedSubscription['status']> = {
            'trialing': 'trial_active',
            'active': 'active',
            'past_due': 'past_due',
            'canceled': 'canceled',
            'unpaid': 'expired',
            'incomplete': 'expired',
            'incomplete_expired': 'expired',
            'paused': 'paused',
        };

        return statusMap[status] || 'canceled';
    }

    private mapInvoiceStatus(status: Stripe.Invoice.Status | null): NormalizedTransaction['status'] {
        const statusMap: Record<string, NormalizedTransaction['status']> = {
            'draft': 'pending',
            'open': 'pending',
            'paid': 'succeeded',
            'uncollectible': 'failed',
            'void': 'failed',
        };

        return statusMap[status || ''] || 'pending';
    }

    private mapInterval(interval?: Stripe.Price.Recurring.Interval): NormalizedSubscription['billingPeriod'] {
        const intervalMap: Record<string, NormalizedSubscription['billingPeriod']> = {
            'day': 'day',
            'week': 'week',
            'month': 'month',
            'year': 'year',
        };

        return intervalMap[interval || ''] || 'month';
    }
}

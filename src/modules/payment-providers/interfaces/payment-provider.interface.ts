export interface FetchParams {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    cursor?: string;
}

export interface NormalizedSubscription {
    externalSubscriptionId: string;
    externalCustomerId: string;
    externalProductId: string;
    externalPriceId?: string;

    status: 'trial_active' | 'active' | 'past_due' | 'canceled' | 'expired' | 'paused';

    isTrial: boolean;
    trialAmount?: number;
    trialCurrency?: string;
    trialStartDate?: Date;
    trialEndDate?: Date;

    recurringAmount: number;
    recurringCurrency: string;
    billingPeriod: 'day' | 'week' | 'month' | 'year';
    billingInterval: number;

    startedAt: Date;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    nextBillingDate?: Date;
    canceledAt?: Date;
    cancelAtPeriodEnd?: boolean;

    metadata?: Record<string, any>;
}

export interface NormalizedTransaction {
    externalTransactionId: string;
    externalCustomerId: string;
    externalSubscriptionId?: string;
    externalInvoiceId?: string;

    type: 'subscription_payment' | 'one_time_payment' | 'refund';
    status: 'pending' | 'succeeded' | 'failed' | 'refunded';

    amount: number;
    currency: string;

    paymentMethod?: string;

    createdAt: Date;
    paidAt?: Date;
    refundedAt?: Date;

    metadata?: Record<string, any>;
}

export interface NormalizedCustomer {
    externalCustomerId: string;

    email?: string;
    name?: string;
    phone?: string;

    document?: string;
    documentType?: string;

    addressCountry?: string;
    addressState?: string;
    addressCity?: string;
    addressZipCode?: string;
    addressLine1?: string;
    addressLine2?: string;

    createdAt: Date;

    metadata?: Record<string, any>;
}

export interface IPaymentProvider {
    readonly name: string;
    readonly slug: string;

    fetchSubscriptions(params: FetchParams): Promise<NormalizedSubscription[]>;
    fetchTransactions(params: FetchParams): Promise<NormalizedTransaction[]>;
    fetchCustomers(params: FetchParams): Promise<NormalizedCustomer[]>;

    testConnection(): Promise<boolean>;
}

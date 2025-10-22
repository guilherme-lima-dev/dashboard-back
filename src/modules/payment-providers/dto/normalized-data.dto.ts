import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NormalizedSubscriptionDto {
    @ApiProperty()
    externalSubscriptionId: string;

    @ApiProperty()
    externalCustomerId: string;

    @ApiProperty()
    externalProductId: string;

    @ApiPropertyOptional()
    externalPriceId?: string;

    @ApiProperty({
        enum: ['trial_active', 'active', 'past_due', 'canceled', 'expired', 'paused'],
    })
    status: string;

    @ApiProperty()
    isTrial: boolean;

    @ApiPropertyOptional()
    trialAmount?: number;

    @ApiPropertyOptional()
    trialCurrency?: string;

    @ApiPropertyOptional()
    trialStartDate?: Date;

    @ApiPropertyOptional()
    trialEndDate?: Date;

    @ApiProperty()
    recurringAmount: number;

    @ApiProperty()
    recurringCurrency: string;

    @ApiProperty({
        enum: ['day', 'week', 'month', 'year'],
    })
    billingPeriod: string;

    @ApiProperty()
    billingInterval: number;

    @ApiProperty()
    startedAt: Date;

    @ApiPropertyOptional()
    currentPeriodStart?: Date;

    @ApiPropertyOptional()
    currentPeriodEnd?: Date;

    @ApiPropertyOptional()
    nextBillingDate?: Date;

    @ApiPropertyOptional()
    canceledAt?: Date;

    @ApiPropertyOptional()
    cancelAtPeriodEnd?: boolean;

    @ApiPropertyOptional()
    metadata?: Record<string, any>;
}

export class NormalizedTransactionDto {
    @ApiProperty()
    externalTransactionId: string;

    @ApiProperty()
    externalCustomerId: string;

    @ApiPropertyOptional()
    externalSubscriptionId?: string;

    @ApiPropertyOptional()
    externalInvoiceId?: string;

    @ApiProperty({
        enum: ['subscription_payment', 'one_time_payment', 'refund'],
    })
    type: string;

    @ApiProperty({
        enum: ['pending', 'succeeded', 'failed', 'refunded'],
    })
    status: string;

    @ApiProperty()
    amount: number;

    @ApiProperty()
    currency: string;

    @ApiPropertyOptional()
    paymentMethod?: string;

    @ApiProperty()
    createdAt: Date;

    @ApiPropertyOptional()
    paidAt?: Date;

    @ApiPropertyOptional()
    refundedAt?: Date;

    @ApiPropertyOptional()
    metadata?: Record<string, any>;
}

export class NormalizedCustomerDto {
    @ApiProperty()
    externalCustomerId: string;

    @ApiPropertyOptional()
    email?: string;

    @ApiPropertyOptional()
    name?: string;

    @ApiPropertyOptional()
    phone?: string;

    @ApiPropertyOptional()
    document?: string;

    @ApiPropertyOptional()
    documentType?: string;

    @ApiPropertyOptional()
    addressCountry?: string;

    @ApiPropertyOptional()
    addressState?: string;

    @ApiPropertyOptional()
    addressCity?: string;

    @ApiPropertyOptional()
    addressZipCode?: string;

    @ApiPropertyOptional()
    addressLine1?: string;

    @ApiPropertyOptional()
    addressLine2?: string;

    @ApiProperty()
    createdAt: Date;

    @ApiPropertyOptional()
    metadata?: Record<string, any>;
}

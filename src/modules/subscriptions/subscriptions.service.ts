import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { QuerySubscriptionsDto } from './dto/query-subscriptions.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async upsert(platformId: string, externalSubscriptionId: string, data: CreateSubscriptionDto) {
    const existingActive = await this.prisma.subscription.findFirst({
      where: {
        customerId: data.customerId,
        productId: data.productId,
        status: {
          in: ['trial_active', 'active'],
        },
        id: {
          not: undefined,
        },
      },
    });

    if (existingActive) {
      throw new BadRequestException(
        `Customer already has an active subscription for this product`
      );
    }

    return this.prisma.subscription.upsert({
      where: {
        unique_platform_subscription: {
          platformId,
          externalSubscriptionId,
        },
      },
      update: {
        status: data.status,
        isTrial: data.isTrial,
        trialStart: data.trialStart,
        trialEnd: data.trialEnd,
        trialEndsAt: data.trialEndsAt,
        recurringAmount: data.recurringAmount,
        recurringAmountBrl: data.recurringAmountBrl,
        recurringAmountUsd: data.recurringAmountUsd,
        nextBillingDate: data.nextBillingDate,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        canceledAt: data.canceledAt,
        cancellationReason: data.cancellationReason,
        platformMetadata: data.platformMetadata,
        updatedAt: new Date(),
      },
      create: {
        platformId,
        externalSubscriptionId,
        customerId: data.customerId,
        productId: data.productId,
        offerId: data.offerId,
        orderId: data.orderId,
        externalCustomerId: data.externalCustomerId,
        externalProductId: data.externalProductId,
        status: data.status,
        isTrial: data.isTrial,
        trialStart: data.trialStart,
        trialEnd: data.trialEnd,
        trialEndsAt: data.trialEndsAt,
        recurringAmount: data.recurringAmount,
        currency: data.currency,
        recurringAmountBrl: data.recurringAmountBrl,
        recurringAmountUsd: data.recurringAmountUsd,
        exchangeRate: data.exchangeRate,
        billingPeriod: data.billingPeriod,
        billingCycles: data.billingCycles,
        startDate: data.startDate,
        nextBillingDate: data.nextBillingDate,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        affiliateId: data.affiliateId,
        platformMetadata: data.platformMetadata,
      },
      include: {
        customer: true,
        product: true,
        offer: true,
        platform: true,
      },
    });
  }

  async findAll(query: QuerySubscriptionsDto) {
    const { page = 1, limit = 20, status, productId, platformId, isTrial } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (productId) where.productId = productId;
    if (platformId) where.platformId = platformId;
    if (isTrial !== undefined) where.isTrial = isTrial;

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          product: true,
          offer: true,
          platform: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        offer: true,
        platform: true,
        order: true,
        periods: {
          orderBy: { periodNumber: 'asc' },
        },
        transactionSubscriptions: {
          include: {
            transaction: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return subscription;
  }

  async cancel(id: string, dto: CancelSubscriptionDto) {
    const subscription = await this.findById(id);

    if (!['active', 'trial_active', 'past_due'].includes(subscription.status)) {
      throw new BadRequestException(
        `Cannot cancel subscription with status: ${subscription.status}`
      );
    }

    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
        cancellationReason: dto.reason,
        canceledBy: dto.canceledBy || 'user',
      },
    });
  }

  async pause(id: string) {
    const subscription = await this.findById(id);

    if (subscription.status !== 'active') {
      throw new BadRequestException('Only active subscriptions can be paused');
    }

    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'paused',
        pausedAt: new Date(),
      },
    });
  }

  async resume(id: string) {
    const subscription = await this.findById(id);

    if (subscription.status !== 'paused') {
      throw new BadRequestException('Only paused subscriptions can be resumed');
    }

    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'active',
        resumedAt: new Date(),
      },
    });
  }
}
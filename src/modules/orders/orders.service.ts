import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateOrderDto) {
    return this.prisma.order.create({
      data: {
        platformId: data.platformId,
        externalOrderId: data.externalOrderId,
        customerId: data.customerId,
        subtotalAmount: data.subtotalAmount,
        discountAmount: data.discountAmount,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        currency: data.currency,
        subtotalAmountBrl: data.subtotalAmountBrl,
        discountAmountBrl: data.discountAmountBrl,
        taxAmountBrl: data.taxAmountBrl,
        totalAmountBrl: data.totalAmountBrl,
        subtotalAmountUsd: data.subtotalAmountUsd,
        discountAmountUsd: data.discountAmountUsd,
        taxAmountUsd: data.taxAmountUsd,
        totalAmountUsd: data.totalAmountUsd,
        exchangeRate: data.exchangeRate,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmTerm: data.utmTerm,
        utmContent: data.utmContent,
        referrerUrl: data.referrerUrl,
        landingPageUrl: data.landingPageUrl,
        affiliateId: data.affiliateId,
        couponCode: data.couponCode,
        status: data.status,
        platformMetadata: data.platformMetadata,
        orderDate: data.orderDate,
        completedAt: data.completedAt,
        items: {
          create: data.items,
        },
      },
      include: {
        customer: true,
        platform: true,
        items: {
          include: {
            product: true,
            offer: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        platform: true,
        items: {
          include: {
            product: true,
            offer: true,
          },
        },
        subscriptions: true,
        transactions: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }
}

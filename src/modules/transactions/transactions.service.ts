import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        platformId: data.platformId,
        externalTransactionId: data.externalTransactionId,
        externalInvoiceId: data.externalInvoiceId,
        customerId: data.customerId,
        orderId: data.orderId,
        transactionType: data.transactionType,
        status: data.status,
        grossAmount: data.grossAmount,
        discountAmount: data.discountAmount,
        taxAmount: data.taxAmount,
        feeAmount: data.feeAmount,
        netAmount: data.netAmount,
        currency: data.currency,
        grossAmountBrl: data.grossAmountBrl,
        discountAmountBrl: data.discountAmountBrl,
        taxAmountBrl: data.taxAmountBrl,
        feeAmountBrl: data.feeAmountBrl,
        netAmountBrl: data.netAmountBrl,
        grossAmountUsd: data.grossAmountUsd,
        discountAmountUsd: data.discountAmountUsd,
        taxAmountUsd: data.taxAmountUsd,
        feeAmountUsd: data.feeAmountUsd,
        netAmountUsd: data.netAmountUsd,
        exchangeRate: data.exchangeRate,
        paymentMethod: data.paymentMethod,
        paymentMethodDetails: data.paymentMethodDetails,
        failureCode: data.failureCode,
        failureMessage: data.failureMessage,
        platformMetadata: data.platformMetadata,
        transactionDate: data.transactionDate,
      },
      include: {
        customer: true,
        platform: true,
        order: true,
      },
    });
  }

  async linkToSubscription(transactionId: string, subscriptionId: string, amountAllocatedBrl: number) {
    return this.prisma.transactionSubscription.create({
      data: {
        transactionId,
        subscriptionId,
        amountAllocatedBrl,
      },
    });
  }

  async findAll(query: QueryTransactionsDto) {
    const { page = 1, limit = 20, status, transactionType, platformId, customerId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (transactionType) where.transactionType = transactionType;
    if (platformId) where.platformId = platformId;
    if (customerId) where.customerId = customerId;

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          platform: true,
          order: true,
        },
        orderBy: { transactionDate: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
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
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        platform: true,
        order: {
          include: {
            items: true,
          },
        },
        transactionSubscriptions: {
          include: {
            subscription: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }
}
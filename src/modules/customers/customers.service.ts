import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async upsert(platformId: string, externalCustomerId: string, data: CreateCustomerDto) {
    return this.prisma.customer.upsert({
      where: {
        unique_platform_customer: {
          platformId,
          externalCustomerId,
        },
      },
      update: {
        email: data.email,
        name: data.name,
        phone: data.phone,
        document: data.document,
        documentType: data.documentType,
        countryCode: data.countryCode,
        state: data.state,
        city: data.city,
        metadata: data.metadata,
        lastPurchaseAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        platformId,
        externalCustomerId,
        email: data.email,
        name: data.name,
        phone: data.phone,
        document: data.document,
        documentType: data.documentType,
        countryCode: data.countryCode,
        state: data.state,
        city: data.city,
        metadata: data.metadata,
        firstPurchaseAt: new Date(),
        lastPurchaseAt: new Date(),
        totalSpentBrl: 0,
      },
    });
  }

  async findAll(query: QueryCustomersDto) {
    const { page = 1, limit = 20, platformId, email, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (platformId) where.platformId = platformId;
    if (email) where.email = { contains: email, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { document: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          platform: true,
          _count: {
            select: {
              subscriptions: true,
              transactions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
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
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        platform: true,
        subscriptions: {
          include: {
            product: true,
            offer: true,
          },
        },
        transactions: {
          take: 10,
          orderBy: { transactionDate: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async updateTotalSpent(customerId: string, amountBrl: number) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        totalSpentBrl: {
          increment: amountBrl,
        },
        lastPurchaseAt: new Date(),
      },
    });
  }
}
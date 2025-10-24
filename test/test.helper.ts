import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export class TestHelper {
  private static instance: TestHelper;
  private app: INestApplication;
  private prisma: PrismaService;
  private authToken: string;
  private platformId: string;
  private userId: string;

  private constructor(app: INestApplication, prisma: PrismaService) {
    this.app = app;
    this.prisma = prisma;
  }

  static getInstance(app: INestApplication, prisma: PrismaService): TestHelper {
    if (!TestHelper.instance) {
      TestHelper.instance = new TestHelper(app, prisma);
    }
    return TestHelper.instance;
  }

  async setupTestData() {
    // Limpar dados de teste anteriores
    await this.cleanupTestData();

    // Criar usuário de teste
    const user = await this.prisma.user.upsert({
      where: { email: 'test@analytics.com' },
      update: {},
      create: {
        email: 'test@analytics.com',
        passwordHash: await bcrypt.hash('Test@123', 10),
        fullName: 'Test User',
        status: 'active',
        emailVerified: true,
        userRoles: {
          create: {
            role: {
              connectOrCreate: {
                where: { slug: 'admin' },
                create: { name: 'Admin', slug: 'admin' },
              },
            },
          },
        },
      },
    });

    this.userId = user.id;

    // Criar plataforma de teste
    const platform = await this.prisma.platform.upsert({
      where: { slug: 'test-platform' },
      update: {},
      create: {
        name: 'Test Platform',
        slug: 'test-platform',
        isEnabled: true,
        config: {
          apiUrl: 'https://api.test.com',
          webhookUrl: 'https://webhook.test.com'
        }
      },
    });

    this.platformId = platform.id;

    // Obter token de autenticação
    await this.getAuthToken();
  }

  async getAuthToken(): Promise<string> {
    // Sempre gerar um novo token para evitar problemas de expiração
    const response = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@analytics.com',
        password: 'Test@123'
      }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.authToken = data.accessToken;
    return this.authToken;
  }

  getPlatformId(): string {
    return this.platformId;
  }

  getUserId(): string {
    return this.userId;
  }

  async cleanupTestData() {
    // Limpar dados de teste em ordem reversa das dependências
    await this.prisma.refreshToken.deleteMany({
      where: { user: { email: 'test@analytics.com' } }
    });
    
    await this.prisma.userRole.deleteMany({
      where: { user: { email: 'test@analytics.com' } }
    });
    
    await this.prisma.user.deleteMany({
      where: { email: 'test@analytics.com' }
    });

    await this.prisma.platform.deleteMany({
      where: { slug: 'test-platform' }
    });

    // Limpar outros dados de teste
    await this.prisma.affiliate.deleteMany({
      where: { platform: { slug: 'test-platform' } }
    });

    await this.prisma.product.deleteMany({
      where: { slug: { startsWith: 'test-product-' } }
    });

    await this.prisma.subscription.deleteMany({
      where: { platform: { slug: 'test-platform' } }
    });

    await this.prisma.transaction.deleteMany({
      where: { platform: { slug: 'test-platform' } }
    });

    await this.prisma.customer.deleteMany({
      where: { platform: { slug: 'test-platform' } }
    });
  }

  async createUniqueAffiliate() {
    const affiliate = await this.prisma.affiliate.create({
      data: {
        platformId: this.platformId,
        externalAffiliateId: `test-affiliate-${Date.now()}`,
        name: `Test Affiliate ${Date.now()}`,
        email: `affiliate-${Date.now()}@test.com`,
        commissionRate: 10.5,
        isActive: true,
        tier: 'bronze',
        totalSalesCount: 0,
        totalRevenueBrl: 0,
        totalRevenueUsd: 0,
      },
    });
    return affiliate;
  }

  async createUniqueProduct() {
    const product = await this.prisma.product.create({
      data: {
        name: `Test Product ${Date.now()}`,
        slug: `test-product-${Date.now()}`,
        description: 'Test product description',
        productType: 'subscription',
        isActive: true,
        metadata: {
          price: 99.99,
          currency: 'BRL'
        }
      },
    });
    return product;
  }

  async createUniqueCustomer() {
    const customer = await this.prisma.customer.create({
      data: {
        platformId: this.platformId,
        externalCustomerId: `test-customer-${Date.now()}`,
        name: `Test Customer ${Date.now()}`,
        email: `customer-${Date.now()}@test.com`,
        status: 'active',
        metadata: {}
      },
    });
    return customer;
  }

  async createUniqueSubscription(customerId: string, productId: string) {
    const subscription = await this.prisma.subscription.create({
      data: {
        platformId: this.platformId,
        customerId,
        productId,
        externalSubscriptionId: `test-subscription-${Date.now()}`,
        status: 'active',
        recurringAmountBrl: 99.99,
        recurringAmountUsd: 19.99,
        currency: 'BRL',
        billingCycle: 'monthly',
        metadata: {}
      },
    });
    return subscription;
  }

  async createUniqueTransaction(customerId: string) {
    const transaction = await this.prisma.transaction.create({
      data: {
        platformId: this.platformId,
        customerId,
        externalTransactionId: `test-transaction-${Date.now()}`,
        status: 'succeeded',
        transactionType: 'payment',
        grossAmountBrl: 99.99,
        netAmountBrl: 95.99,
        grossAmountUsd: 19.99,
        netAmountUsd: 18.99,
        currency: 'BRL',
        transactionDate: new Date(),
        metadata: {}
      },
    });
    return transaction;
  }
}

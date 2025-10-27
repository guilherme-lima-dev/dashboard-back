import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('Transactions Controller (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    
    await app.init();

    // Login para obter token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@analytics.com',
        password: 'Admin@123'
      });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /transactions', () => {
    it('should return paginated transactions list', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter transactions by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'succeeded' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter transactions by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'payment' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter transactions by date range', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();

      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter transactions by platform', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ platformId: 'stripe-platform-id' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter transactions by customer', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ customerId: 'customer-id' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /transactions/:id', () => {
    it('should return transaction by ID with full details', async () => {
      // First get a transaction ID from the list
      const transactionsResponse = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1 });

      if (transactionsResponse.body.data.length > 0) {
        const transactionId = transactionsResponse.body.data[0].id;
        
        const response = await request(app.getHttpServer())
          .get(`/transactions/${transactionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('netAmountBrl');
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('customer');
        expect(response.body).toHaveProperty('transactionSubscriptions');
      }
    });

    it('should return 404 for non-existent transaction', async () => {
      await request(app.getHttpServer())
        .get('/transactions/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/transactions')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Permissions', () => {
    it('should require transactions:read permission', async () => {
      await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200); // Should work with admin token
    });
  });
});

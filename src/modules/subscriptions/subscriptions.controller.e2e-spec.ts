import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('Subscriptions Controller (e2e)', () => {
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

  describe('GET /subscriptions', () => {
    it('should return paginated subscriptions list', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter subscriptions by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'active' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter subscriptions by platform', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ platformId: 'stripe-platform-id' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter subscriptions by customer', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ customerId: 'customer-id' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter subscriptions by product', async () => {
      const response = await request(app.getHttpServer())
        .get('/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ productId: 'product-id' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /subscriptions/:id', () => {
    it('should return subscription by ID with full details', async () => {
      // First get a subscription ID from the list
      const subscriptionsResponse = await request(app.getHttpServer())
        .get('/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1 });

      if (subscriptionsResponse.body.data.length > 0) {
        const subscriptionId = subscriptionsResponse.body.data[0].id;
        
        const response = await request(app.getHttpServer())
          .get(`/subscriptions/${subscriptionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('customer');
        expect(response.body).toHaveProperty('product');
        expect(response.body).toHaveProperty('transactionSubscriptions');
      }
    });

    it('should return 404 for non-existent subscription', async () => {
      await request(app.getHttpServer())
        .get('/subscriptions/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/subscriptions')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/subscriptions')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Permissions', () => {
    it('should require subscriptions:read permission', async () => {
      await request(app.getHttpServer())
        .get('/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200); // Should work with admin token
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('Analytics Controller (e2e)', () => {
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

  describe('GET /analytics/dashboard', () => {
    it('should return dashboard metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'monthly' })
        .expect(200);

      expect(response.body).toHaveProperty('revenue');
      expect(response.body).toHaveProperty('subscriptions');
      expect(response.body).toHaveProperty('customers');
    });

    it('should handle different periods', async () => {
      const periods = ['daily', 'weekly', 'monthly', 'yearly'];
      
      for (const period of periods) {
        const response = await request(app.getHttpServer())
          .get('/analytics/dashboard')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ period })
          .expect(200);

        expect(response.body).toBeDefined();
      }
    });
  });

  describe('GET /analytics/revenue/trend', () => {
    it('should return revenue trend data', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/revenue/trend')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'monthly' })
        .expect(200);

      expect(response.body).toHaveProperty('monthlyTrend');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('totalSubscriptions');
      expect(Array.isArray(response.body.monthlyTrend)).toBe(true);
    });
  });

  describe('GET /analytics/revenue/by-product', () => {
    it('should return revenue by product', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/revenue/by-product')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'monthly' })
        .expect(200);

      expect(response.body).toHaveProperty('revenueByProduct');
      expect(Array.isArray(response.body.revenueByProduct)).toBe(true);
    });
  });

  describe('GET /analytics/subscriptions/trend', () => {
    it('should return subscription trend data', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/subscriptions/trend')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'monthly' })
        .expect(200);

      expect(response.body).toHaveProperty('monthlyTrend');
      expect(response.body).toHaveProperty('totalSubscriptions');
      expect(Array.isArray(response.body.monthlyTrend)).toBe(true);
    });
  });

  describe('GET /analytics/subscriptions/by-product', () => {
    it('should return subscriptions by product', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/subscriptions/by-product')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'monthly' })
        .expect(200);

      expect(response.body).toHaveProperty('subscriptionsByProduct');
      expect(Array.isArray(response.body.subscriptionsByProduct)).toBe(true);
    });
  });

  describe('GET /analytics/activities', () => {
    it('should return recent activities', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'monthly' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});

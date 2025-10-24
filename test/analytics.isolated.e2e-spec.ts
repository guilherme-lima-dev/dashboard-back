import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestHelper } from './test.helper';
import { TestDatabaseConfig } from './database.config';

describe('Analytics Controller (Isolated e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testHelper: TestHelper;
  let authToken: string;
  let platformId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    TestDatabaseConfig.setPrisma(prisma);
    await TestDatabaseConfig.seed();
    
    testHelper = TestHelper.getInstance(app, prisma);
    await testHelper.setupTestData();
    
    authToken = await testHelper.getAuthToken();
    platformId = testHelper.getPlatformId();
  });

  afterAll(async () => {
    await testHelper.cleanupTestData();
    await app.close();
  });

  beforeEach(async () => {
    // Limpar dados específicos antes de cada teste
    await prisma.dailyMetrics.deleteMany({});
    await prisma.cohortAnalysis.deleteMany({});
    await prisma.affiliateMetrics.deleteMany({});
    
    // Obter novo token para cada teste
    authToken = await testHelper.getAuthToken();
  });

  describe('GET /analytics/dashboard', () => {
    it('should return dashboard metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'monthly', platformId })
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
          .query({ period, platformId })
          .expect(200);

        expect(response.body).toHaveProperty('revenue');
        expect(response.body).toHaveProperty('subscriptions');
        expect(response.body).toHaveProperty('customers');
      }
    });
  });

  describe('GET /analytics/revenue/trend', () => {
    it('should return revenue trend data', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/revenue/trend')
        .query({ platformId, period: 'monthly' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.revenueTrend)).toBe(true);
    });
  });

  describe('GET /analytics/revenue/by-product', () => {
    it('should return revenue by product', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/revenue/by-product')
        .query({ platformId, period: 'monthly' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.revenueByProduct)).toBe(true);
    });
  });

  describe('GET /analytics/subscriptions/trend', () => {
    it('should return subscription trend data', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/subscriptions/trend')
        .query({ platformId, period: 'monthly' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.subscriptionTrend)).toBe(true);
    });
  });

  describe('GET /analytics/subscriptions/by-product', () => {
    it('should return subscriptions by product', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/subscriptions/by-product')
        .query({ platformId, period: 'monthly' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.subscriptionsByProduct)).toBe(true);
    });
  });

  describe('GET /analytics/activities', () => {
    it('should return recent activities', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/activities')
        .query({ platformId, period: 'daily' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .query({ platformId, period: 'monthly' })
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .query({ platformId, period: 'monthly' })
        .set('Authorization', `Bearer invalid-token`)
        .expect(401);
    });
  });
});

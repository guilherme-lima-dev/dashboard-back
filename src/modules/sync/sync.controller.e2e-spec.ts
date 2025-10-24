import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('Sync Controller (e2e)', () => {
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

  describe('POST /sync/logs', () => {
    it('should create sync log', async () => {
      const logData = {
        platformId: 'stripe-platform-id',
        syncType: 'full',
        status: 'started',
        details: {
          startTime: new Date().toISOString(),
          recordsToSync: 1000
        }
      };

      const response = await request(app.getHttpServer())
        .post('/sync/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(logData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('platformId', logData.platformId);
      expect(response.body).toHaveProperty('syncType', logData.syncType);
      expect(response.body).toHaveProperty('status', logData.status);
    });
  });

  describe('GET /sync/logs', () => {
    it('should return paginated sync logs', async () => {
      const response = await request(app.getHttpServer())
        .get('/sync/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter logs by platform', async () => {
      const response = await request(app.getHttpServer())
        .get('/sync/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ platformId: 'stripe-platform-id' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter logs by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/sync/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'completed' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter logs by sync type', async () => {
      const response = await request(app.getHttpServer())
        .get('/sync/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ syncType: 'full' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /sync/stats', () => {
    it('should return sync statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/sync/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalSyncs');
      expect(response.body).toHaveProperty('successfulSyncs');
      expect(response.body).toHaveProperty('failedSyncs');
      expect(response.body).toHaveProperty('lastSyncTime');
    });
  });

  describe('POST /sync/platform/:platformId', () => {
    it('should trigger platform sync', async () => {
      // First get a platform ID
      const platformsResponse = await request(app.getHttpServer())
        .get('/platforms')
        .set('Authorization', `Bearer ${authToken}`);

      if (platformsResponse.body.length > 0) {
        const platformId = platformsResponse.body[0].id;

        const syncData = {
          syncType: 'incremental',
          force: false
        };

        const response = await request(app.getHttpServer())
          .post(`/sync/platform/${platformId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(syncData)
          .expect(200);

        expect(response.body).toHaveProperty('syncId');
        expect(response.body).toHaveProperty('status');
      }
    });

    it('should handle force sync', async () => {
      const platformsResponse = await request(app.getHttpServer())
        .get('/platforms')
        .set('Authorization', `Bearer ${authToken}`);

      if (platformsResponse.body.length > 0) {
        const platformId = platformsResponse.body[0].id;

        const syncData = {
          syncType: 'full',
          force: true
        };

        const response = await request(app.getHttpServer())
          .post(`/sync/platform/${platformId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(syncData)
          .expect(200);

        expect(response.body).toHaveProperty('syncId');
        expect(response.body).toHaveProperty('status');
      }
    });
  });

  describe('POST /sync/all', () => {
    it('should trigger sync for all platforms', async () => {
      const syncData = {
        syncType: 'incremental',
        platforms: ['stripe', 'paypal'] // Assuming these platforms exist
      };

      const response = await request(app.getHttpServer())
        .post('/sync/all')
        .set('Authorization', `Bearer ${authToken}`)
        .send(syncData)
        .expect(200);

      expect(response.body).toHaveProperty('syncJobs');
      expect(Array.isArray(response.body.syncJobs)).toBe(true);
    });

    it('should handle full sync for all platforms', async () => {
      const syncData = {
        syncType: 'full',
        platforms: ['stripe']
      };

      const response = await request(app.getHttpServer())
        .post('/sync/all')
        .set('Authorization', `Bearer ${authToken}`)
        .send(syncData)
        .expect(200);

      expect(response.body).toHaveProperty('syncJobs');
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/sync/logs')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/sync/logs')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid platform ID', async () => {
      const syncData = {
        syncType: 'incremental',
        force: false
      };

      await request(app.getHttpServer())
        .post('/sync/platform/invalid-platform-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(syncData)
        .expect(404);
    });

    it('should validate sync type', async () => {
      const platformsResponse = await request(app.getHttpServer())
        .get('/platforms')
        .set('Authorization', `Bearer ${authToken}`);

      if (platformsResponse.body.length > 0) {
        const platformId = platformsResponse.body[0].id;

        const syncData = {
          syncType: 'invalid-type',
          force: false
        };

        await request(app.getHttpServer())
          .post(`/sync/platform/${platformId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(syncData)
          .expect(400);
      }
    });
  });
});

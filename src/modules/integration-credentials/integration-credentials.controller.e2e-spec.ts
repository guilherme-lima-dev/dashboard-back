import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('Integration Credentials Controller (e2e)', () => {
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

  describe('GET /integration-credentials', () => {
    it('should return paginated integration credentials', async () => {
      const response = await request(app.getHttpServer())
        .get('/integration-credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter credentials by platform', async () => {
      const response = await request(app.getHttpServer())
        .get('/integration-credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ platformId: 'stripe-platform-id' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter credentials by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/integration-credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'active' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /integration-credentials/:id', () => {
    it('should return integration credential by ID', async () => {
      // First get a credential ID from the list
      const credentialsResponse = await request(app.getHttpServer())
        .get('/integration-credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1 });

      if (credentialsResponse.body.data.length > 0) {
        const credentialId = credentialsResponse.body.data[0].id;
        
        const response = await request(app.getHttpServer())
          .get(`/integration-credentials/${credentialId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('platformId');
        expect(response.body).toHaveProperty('credentials');
        // Note: Sensitive data should be masked in response
        expect(response.body.credentials).not.toHaveProperty('apiKey');
      }
    });

    it('should return 404 for non-existent credential', async () => {
      await request(app.getHttpServer())
        .get('/integration-credentials/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /integration-credentials', () => {
    it('should create new integration credential', async () => {
      // First get a platform ID
      const platformsResponse = await request(app.getHttpServer())
        .get('/platforms')
        .set('Authorization', `Bearer ${authToken}`);

      if (platformsResponse.body.length > 0) {
        const platformId = platformsResponse.body[0].id;

        const credentialData = {
          platformId,
          credentials: {
            apiKey: 'test-api-key',
            secretKey: 'test-secret-key',
            webhookSecret: 'test-webhook-secret'
          },
          isActive: true,
          environment: 'sandbox'
        };

        const response = await request(app.getHttpServer())
          .post('/integration-credentials')
          .set('Authorization', `Bearer ${authToken}`)
          .send(credentialData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('platformId', platformId);
        expect(response.body).toHaveProperty('isActive', true);
        // Sensitive data should not be returned
        expect(response.body.credentials).not.toHaveProperty('apiKey');
      }
    });

    it('should reject duplicate credentials for same platform', async () => {
      const platformsResponse = await request(app.getHttpServer())
        .get('/platforms')
        .set('Authorization', `Bearer ${authToken}`);

      if (platformsResponse.body.length > 0) {
        const platformId = platformsResponse.body[0].id;

        const credentialData = {
          platformId,
          credentials: {
            apiKey: 'duplicate-api-key',
            secretKey: 'duplicate-secret-key'
          },
          isActive: true,
          environment: 'sandbox'
        };

        // First creation should succeed
        await request(app.getHttpServer())
          .post('/integration-credentials')
          .set('Authorization', `Bearer ${authToken}`)
          .send(credentialData)
          .expect(201);

        // Second creation should fail
        await request(app.getHttpServer())
          .post('/integration-credentials')
          .set('Authorization', `Bearer ${authToken}`)
          .send(credentialData)
          .expect(409);
      }
    });
  });

  describe('PUT /integration-credentials/:id', () => {
    it('should update integration credential', async () => {
      // First create a credential
      const platformsResponse = await request(app.getHttpServer())
        .get('/platforms')
        .set('Authorization', `Bearer ${authToken}`);

      if (platformsResponse.body.length > 0) {
        const platformId = platformsResponse.body[0].id;

        const credentialData = {
          platformId,
          credentials: {
            apiKey: 'update-api-key',
            secretKey: 'update-secret-key'
          },
          isActive: true,
          environment: 'sandbox'
        };

        const createResponse = await request(app.getHttpServer())
          .post('/integration-credentials')
          .set('Authorization', `Bearer ${authToken}`)
          .send(credentialData);

        const credentialId = createResponse.body.id;

        const updateData = {
          credentials: {
            apiKey: 'updated-api-key',
            secretKey: 'updated-secret-key',
            webhookSecret: 'updated-webhook-secret'
          },
          isActive: false,
          environment: 'production'
        };

        const response = await request(app.getHttpServer())
          .put(`/integration-credentials/${credentialId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('isActive', false);
        expect(response.body).toHaveProperty('environment', 'production');
      }
    });
  });

  describe('DELETE /integration-credentials/:id', () => {
    it('should delete integration credential', async () => {
      // First create a credential
      const platformsResponse = await request(app.getHttpServer())
        .get('/platforms')
        .set('Authorization', `Bearer ${authToken}`);

      if (platformsResponse.body.length > 0) {
        const platformId = platformsResponse.body[0].id;

        const credentialData = {
          platformId,
          credentials: {
            apiKey: 'delete-api-key',
            secretKey: 'delete-secret-key'
          },
          isActive: true,
          environment: 'sandbox'
        };

        const createResponse = await request(app.getHttpServer())
          .post('/integration-credentials')
          .set('Authorization', `Bearer ${authToken}`)
          .send(credentialData);

        const credentialId = createResponse.body.id;

        await request(app.getHttpServer())
          .delete(`/integration-credentials/${credentialId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }
    });
  });

  describe('POST /integration-credentials/:id/test', () => {
    it('should test integration credentials', async () => {
      // First create a credential
      const platformsResponse = await request(app.getHttpServer())
        .get('/platforms')
        .set('Authorization', `Bearer ${authToken}`);

      if (platformsResponse.body.length > 0) {
        const platformId = platformsResponse.body[0].id;

        const credentialData = {
          platformId,
          credentials: {
            apiKey: 'test-api-key',
            secretKey: 'test-secret-key'
          },
          isActive: true,
          environment: 'sandbox'
        };

        const createResponse = await request(app.getHttpServer())
          .post('/integration-credentials')
          .set('Authorization', `Bearer ${authToken}`)
          .send(credentialData);

        const credentialId = createResponse.body.id;

        const response = await request(app.getHttpServer())
          .post(`/integration-credentials/${credentialId}/test`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('details');
      }
    });
  });

  describe('POST /integration-credentials/:id/rotate', () => {
    it('should rotate integration credentials', async () => {
      // First create a credential
      const platformsResponse = await request(app.getHttpServer())
        .get('/platforms')
        .set('Authorization', `Bearer ${authToken}`);

      if (platformsResponse.body.length > 0) {
        const platformId = platformsResponse.body[0].id;

        const credentialData = {
          platformId,
          credentials: {
            apiKey: 'rotate-api-key',
            secretKey: 'rotate-secret-key'
          },
          isActive: true,
          environment: 'sandbox'
        };

        const createResponse = await request(app.getHttpServer())
          .post('/integration-credentials')
          .set('Authorization', `Bearer ${authToken}`)
          .send(credentialData);

        const credentialId = createResponse.body.id;

        const response = await request(app.getHttpServer())
          .post(`/integration-credentials/${credentialId}/rotate`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('newCredentials');
        expect(response.body).toHaveProperty('rotationDate');
      }
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/integration-credentials')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/integration-credentials')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Security', () => {
    it('should mask sensitive data in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/integration-credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1 });

      if (response.body.data.length > 0) {
        const credential = response.body.data[0];
        expect(credential.credentials).not.toHaveProperty('apiKey');
        expect(credential.credentials).not.toHaveProperty('secretKey');
        expect(credential.credentials).not.toHaveProperty('webhookSecret');
      }
    });
  });
});

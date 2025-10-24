import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('Affiliates Controller (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let platformId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);

    await app.init();

    // Login para obter token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@analytics.com',
        password: 'Admin@123'
      });

    authToken = loginResponse.body.accessToken;
    
    // Buscar uma plataforma existente
    const platforms = await prisma.platform.findMany();
    platformId = platforms[0]?.id || 'test-platform-id';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /affiliates', () => {
    it('should return paginated affiliates list', async () => {
      const response = await request(app.getHttpServer())
        .get('/affiliates')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter affiliates by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/affiliates')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'active' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter affiliates by platform', async () => {
      const response = await request(app.getHttpServer())
        .get('/affiliates')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ platformId: 'stripe-platform-id' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should search affiliates by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/affiliates')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'test' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /affiliates/:id', () => {
    it('should return affiliate by ID with full details', async () => {
      // First get an affiliate ID from the list
      const affiliatesResponse = await request(app.getHttpServer())
        .get('/affiliates')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1 });

      if (affiliatesResponse.body.data.length > 0) {
        const affiliateId = affiliatesResponse.body.data[0].id;
        
        const response = await request(app.getHttpServer())
          .get(`/affiliates/${affiliateId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('email');
        expect(response.body).toHaveProperty('commissionRate');
      }
    });

    it('should return 404 for non-existent affiliate', async () => {
      await request(app.getHttpServer())
        .get('/affiliates/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /affiliates', () => {
    it('should create new affiliate', async () => {
      const affiliateData = {
        name: 'Test Affiliate',
        email: 'affiliate@test.com',
        externalAffiliateId: `affiliate-${Date.now()}`,
        commissionRate: 10.5,
        platformId
      };

      const response = await request(app.getHttpServer())
        .post('/affiliates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(affiliateData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', affiliateData.name);
      expect(response.body).toHaveProperty('email', affiliateData.email);
    });

    it('should create affiliate with unique externalAffiliateId', async () => {
      const affiliateData = {
        name: 'Unique Affiliate',
        email: 'unique@test.com',
        externalAffiliateId: `unique-affiliate-${Date.now()}`,
        commissionRate: 10.5,
        platformId
      };

      const response = await request(app.getHttpServer())
        .post('/affiliates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(affiliateData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', affiliateData.name);
    });
  });

  describe('PUT /affiliates/:id', () => {
    it('should return 404 for non-existent endpoint', async () => {
      await request(app.getHttpServer())
        .put('/affiliates/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);
    });
  });

  describe('DELETE /affiliates/:id', () => {
    it('should delete affiliate', async () => {
      // First create an affiliate
      const affiliateData = {
        name: 'Delete Affiliate',
        email: 'delete@affiliate.com',
        externalAffiliateId: `delete-affiliate-${Date.now()}`,
        commissionRate: 10.5,
        platformId
      };

      const createResponse = await request(app.getHttpServer())
        .post('/affiliates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(affiliateData);

      const affiliateId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/affiliates/${affiliateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/affiliates')
        .expect(401);
    });
  });
});

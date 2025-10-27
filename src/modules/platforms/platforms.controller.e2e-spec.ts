import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('Platforms Controller (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    
    await app.init();

    // Criar usuário de teste se não existir
    await prisma.user.upsert({
      where: { email: 'admin@analytics.com' },
      update: {},
      create: {
        email: 'admin@analytics.com',
        passwordHash: await require('bcrypt').hash('Admin@123', 10),
        fullName: 'Admin User',
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

    // Login para obter token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@analytics.com',
        password: 'Admin@123'
      });

    console.log('Login response status:', loginResponse.status);
    console.log('Login response body:', loginResponse.body);
    
    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /platforms', () => {
    it('should return all platforms', async () => {
      const response = await request(app.getHttpServer())
        .get('/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /platforms/:id', () => {
    it('should return platform by ID', async () => {
      // First get a platform ID from the list
      const platformsResponse = await request(app.getHttpServer())
        .get('/platforms')
        .set('Authorization', `Bearer ${authToken}`);

      if (platformsResponse.body.length > 0) {
        const platformId = platformsResponse.body[0].id;
        
        const response = await request(app.getHttpServer())
          .get(`/platforms/${platformId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('name');
      }
    });

    it('should return 404 for non-existent platform', async () => {
      await request(app.getHttpServer())
        .get('/platforms/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /platforms/slug/:slug', () => {
    it('should return platform by slug', async () => {
      // First get a platform slug from the list
      const platformsResponse = await request(app.getHttpServer())
        .get('/platforms')
        .set('Authorization', `Bearer ${authToken}`);

      if (platformsResponse.body.length > 0) {
        const platformSlug = platformsResponse.body[0].slug;
        
        const response = await request(app.getHttpServer())
          .get(`/platforms/slug/${platformSlug}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('slug', platformSlug);
      }
    });
  });

  describe('POST /platforms', () => {
    it('should create new platform', async () => {
      const platformData = {
        name: 'Test Platform',
        slug: `test-platform-${Date.now()}`,
        isEnabled: true,
        config: {
          apiUrl: 'https://api.test.com',
          webhookUrl: 'https://webhook.test.com'
        }
      };

      const response = await request(app.getHttpServer())
        .post('/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(platformData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', platformData.name);
      expect(response.body).toHaveProperty('slug', platformData.slug);
    });

    it('should reject duplicate slug', async () => {
      // First create a platform
      const firstPlatform = {
        name: 'First Platform',
        slug: `duplicate-test-${Date.now()}`,
        isEnabled: true
      };

      await request(app.getHttpServer())
        .post('/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(firstPlatform)
        .expect(201);

      // Try to create another with same slug
      const duplicatePlatform = {
        name: 'Duplicate Platform',
        slug: firstPlatform.slug, // Same slug
        isEnabled: true
      };

      await request(app.getHttpServer())
        .post('/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicatePlatform)
        .expect(409);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(500);
    });
  });

  describe('PATCH /platforms/:id', () => {
    it('should update platform', async () => {
      // First create a platform
      const platformData = {
        name: 'Update Platform',
        slug: `update-platform-${Date.now()}`,
        isEnabled: true
      };

      const createResponse = await request(app.getHttpServer())
        .post('/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(platformData);

      const platformId = createResponse.body.id;

      const updateData = {
        name: 'Updated Platform Name',
        isEnabled: false
      };

      const response = await request(app.getHttpServer())
        .patch(`/platforms/${platformId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('name', updateData.name);
    });
  });

  describe('DELETE /platforms/:id', () => {
    it('should delete platform', async () => {
      // First create a platform
      const platformData = {
        name: 'Delete Platform',
        slug: `delete-platform-${Date.now()}`,
        isEnabled: true
      };

      const createResponse = await request(app.getHttpServer())
        .post('/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(platformData);

      const platformId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/platforms/${platformId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/platforms')
        .expect(401);
    });
  });
});

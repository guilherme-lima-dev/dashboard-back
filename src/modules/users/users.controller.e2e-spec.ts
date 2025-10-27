import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('Users Controller (e2e)', () => {
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

  describe('GET /users', () => {
    it('should return paginated users list', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('should filter users by role', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ role: 'admin' })
        .expect(200);

      expect(response.body.users).toBeDefined();
    });

    it('should search users by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'admin' })
        .expect(200);

      expect(response.body.users).toBeDefined();
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by ID', async () => {
      // First get a user ID from the list
      const usersResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1 });

      if (usersResponse.body.users.length > 0) {
        const userId = usersResponse.body.users[0].id;
        
        const response = await request(app.getHttpServer())
          .get(`/users/${userId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('email');
        expect(response.body).toHaveProperty('fullName');
      }
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/users/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /users', () => {
    it('should create new user', async () => {
      const userData = {
        email: `newuser-${Date.now()}@example.com`,
        password: 'Password123!',
        fullName: 'New User'
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', userData.email);
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'admin@analytics.com',
        password: 'Password123!',
        fullName: 'Duplicate User',
        role: 'user'
      };

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(409);
    });
  });

  describe('PUT /users/:id', () => {
    it('should return 404 for non-existent endpoint', async () => {
      await request(app.getHttpServer())
        .put('/users/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ fullName: 'Updated Name' })
        .expect(404);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user', async () => {
      // First create a user
      const userData = {
        email: 'deleteuser@example.com',
        password: 'Password123!',
        fullName: 'Delete User',
        role: 'user'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData);

      const userId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });

  describe('POST /users/:id/change-password', () => {
    it('should return 404 for non-existent endpoint', async () => {
      await request(app.getHttpServer())
        .post('/users/non-existent-id/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentPassword: 'old', newPassword: 'new' })
        .expect(404);
    });
  });

  describe('GET /users/stats', () => {
    it('should return 404 for non-existent endpoint', async () => {
      await request(app.getHttpServer())
        .get('/users/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});

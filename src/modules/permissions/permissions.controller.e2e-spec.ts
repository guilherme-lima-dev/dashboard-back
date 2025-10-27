import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('Permissions Controller (e2e)', () => {
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

  describe('GET /permissions/resources', () => {
    it('should return all permission resources', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions/resources')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /permissions/actions', () => {
    it('should return all permission actions', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions/actions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /permissions/roles', () => {
    it('should return all roles', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /permissions/roles/:id', () => {
    it('should return role by ID', async () => {
      // First get a role ID from the list
      const rolesResponse = await request(app.getHttpServer())
        .get('/permissions/roles')
        .set('Authorization', `Bearer ${authToken}`);

      if (rolesResponse.body.length > 0) {
        const roleId = rolesResponse.body[0].id;
        
        const response = await request(app.getHttpServer())
          .get(`/permissions/roles/${roleId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('permissions');
      }
    });
  });

  describe('POST /permissions/roles', () => {
    it('should create new role', async () => {
      const roleData = {
        name: 'Test Role',
        description: 'Test role description',
        permissions: ['users:read', 'users:write']
      };

      const response = await request(app.getHttpServer())
        .post('/permissions/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(roleData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', roleData.name);
      expect(response.body).toHaveProperty('permissions');
    });
  });

  describe('PUT /permissions/roles/:id', () => {
    it('should update role', async () => {
      // First create a role
      const roleData = {
        name: 'Update Role',
        description: 'Update role description',
        permissions: ['users:read']
      };

      const createResponse = await request(app.getHttpServer())
        .post('/permissions/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(roleData);

      const roleId = createResponse.body.id;

      const updateData = {
        name: 'Updated Role Name',
        description: 'Updated description',
        permissions: ['users:read', 'users:write', 'users:delete']
      };

      const response = await request(app.getHttpServer())
        .put(`/permissions/roles/${roleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('permissions');
    });
  });

  describe('DELETE /permissions/roles/:id', () => {
    it('should delete role', async () => {
      // First create a role
      const roleData = {
        name: 'Delete Role',
        description: 'Delete role description',
        permissions: ['users:read']
      };

      const createResponse = await request(app.getHttpServer())
        .post('/permissions/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(roleData);

      const roleId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/permissions/roles/${roleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('GET /permissions/roles/:roleId/permissions', () => {
    it('should return role permissions', async () => {
      // First get a role ID
      const rolesResponse = await request(app.getHttpServer())
        .get('/permissions/roles')
        .set('Authorization', `Bearer ${authToken}`);

      if (rolesResponse.body.length > 0) {
        const roleId = rolesResponse.body[0].id;
        
        const response = await request(app.getHttpServer())
          .get(`/permissions/roles/${roleId}/permissions`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      }
    });
  });

  describe('PUT /permissions/roles/:roleId/permissions', () => {
    it('should update role permissions', async () => {
      // First create a role
      const roleData = {
        name: 'Permission Role',
        description: 'Permission role description',
        permissions: ['users:read']
      };

      const createResponse = await request(app.getHttpServer())
        .post('/permissions/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(roleData);

      const roleId = createResponse.body.id;

      const permissionsData = {
        permissions: ['users:read', 'users:write', 'analytics:read']
      };

      const response = await request(app.getHttpServer())
        .put(`/permissions/roles/${roleId}/permissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(permissionsData)
        .expect(200);

      expect(response.body).toHaveProperty('permissions');
    });
  });

  describe('GET /permissions/users/:userId/roles', () => {
    it('should return user roles', async () => {
      // First get a user ID
      const usersResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1 });

      if (usersResponse.body.data.length > 0) {
        const userId = usersResponse.body.data[0].id;
        
        const response = await request(app.getHttpServer())
          .get(`/permissions/users/${userId}/roles`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      }
    });
  });

  describe('POST /permissions/users/assign-role', () => {
    it('should assign role to user', async () => {
      // First get a user ID and role ID
      const usersResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1 });

      const rolesResponse = await request(app.getHttpServer())
        .get('/permissions/roles')
        .set('Authorization', `Bearer ${authToken}`);

      if (usersResponse.body.data.length > 0 && rolesResponse.body.length > 0) {
        const userId = usersResponse.body.data[0].id;
        const roleId = rolesResponse.body[0].id;

        const assignData = {
          userId,
          roleId
        };

        await request(app.getHttpServer())
          .post('/permissions/users/assign-role')
          .set('Authorization', `Bearer ${authToken}`)
          .send(assignData)
          .expect(200);
      }
    });
  });

  describe('GET /permissions/stats', () => {
    it('should return permission statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalRoles');
      expect(response.body).toHaveProperty('totalPermissions');
      expect(response.body).toHaveProperty('totalUsers');
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/permissions/roles')
        .expect(401);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('Audit Controller (e2e)', () => {
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

  describe('POST /audit/logs', () => {
    it('should create audit log', async () => {
      const logData = {
        action: 'user.login',
        resource: 'user',
        resourceId: 'user-123',
        userId: 'user-123',
        details: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      };

      const response = await request(app.getHttpServer())
        .post('/audit/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(logData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('action', logData.action);
      expect(response.body).toHaveProperty('resource', logData.resource);
    });
  });

  describe('GET /audit/logs', () => {
    it('should return paginated audit logs', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter logs by action', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ action: 'user.login' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter logs by resource', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ resource: 'user' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter logs by user', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ userId: 'user-123' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter logs by date range', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();

      const response = await request(app.getHttpServer())
        .get('/audit/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /audit/logs/:id', () => {
    it('should return audit log by ID', async () => {
      // First create a log
      const logData = {
        action: 'user.view',
        resource: 'user',
        resourceId: 'user-123',
        userId: 'user-123',
        details: { test: 'data' }
      };

      const createResponse = await request(app.getHttpServer())
        .post('/audit/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(logData);

      const logId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/audit/logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', logId);
      expect(response.body).toHaveProperty('action', logData.action);
    });

    it('should return 404 for non-existent log', async () => {
      await request(app.getHttpServer())
        .get('/audit/logs/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /audit/stats', () => {
    it('should return audit statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalLogs');
      expect(response.body).toHaveProperty('actionsCount');
      expect(response.body).toHaveProperty('resourcesCount');
    });
  });

  describe('POST /audit/alerts', () => {
    it('should create audit alert', async () => {
      const alertData = {
        type: 'suspicious_activity',
        severity: 'high',
        message: 'Multiple failed login attempts',
        details: {
          userId: 'user-123',
          attempts: 5,
          timeWindow: '5 minutes'
        }
      };

      const response = await request(app.getHttpServer())
        .post('/audit/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(alertData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('type', alertData.type);
      expect(response.body).toHaveProperty('severity', alertData.severity);
    });
  });

  describe('GET /audit/alerts', () => {
    it('should return paginated audit alerts', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter alerts by severity', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ severity: 'high' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should filter alerts by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'open' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /audit/alerts/:id', () => {
    it('should return audit alert by ID', async () => {
      // First create an alert
      const alertData = {
        type: 'security_breach',
        severity: 'critical',
        message: 'Unauthorized access detected',
        details: { ip: '192.168.1.100' }
      };

      const createResponse = await request(app.getHttpServer())
        .post('/audit/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(alertData);

      const alertId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/audit/alerts/${alertId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', alertId);
      expect(response.body).toHaveProperty('type', alertData.type);
    });
  });

  describe('PATCH /audit/alerts/:id/action', () => {
    it('should update alert action', async () => {
      // First create an alert
      const alertData = {
        type: 'data_breach',
        severity: 'high',
        message: 'Sensitive data accessed',
        details: { table: 'users' }
      };

      const createResponse = await request(app.getHttpServer())
        .post('/audit/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(alertData);

      const alertId = createResponse.body.id;

      const actionData = {
        action: 'acknowledged',
        notes: 'Alert acknowledged by security team'
      };

      const response = await request(app.getHttpServer())
        .patch(`/audit/alerts/${alertId}/action`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(actionData)
        .expect(200);

      expect(response.body).toHaveProperty('status', actionData.action);
    });
  });

  describe('POST /audit/cleanup', () => {
    it('should cleanup old audit logs', async () => {
      const cleanupData = {
        olderThan: 30, // days
        dryRun: true
      };

      const response = await request(app.getHttpServer())
        .post('/audit/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cleanupData)
        .expect(200);

      expect(response.body).toHaveProperty('deletedCount');
      expect(response.body).toHaveProperty('dryRun', true);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/audit/logs')
        .expect(401);
    });
  });
});

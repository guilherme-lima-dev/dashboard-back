import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('Products Controller (e2e)', () => {
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

  describe('GET /products', () => {
    it('should return all products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /products/:id', () => {
    it('should return product by ID', async () => {
      // First get a product ID from the list
      const productsResponse = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${authToken}`);

      if (productsResponse.body.length > 0) {
        const productId = productsResponse.body[0].id;
        
        const response = await request(app.getHttpServer())
          .get(`/products/${productId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('name');
      }
    });
  });

  describe('GET /products/slug/:slug', () => {
    it('should return product by slug', async () => {
      // First get a product slug from the list
      const productsResponse = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${authToken}`);

      if (productsResponse.body.length > 0) {
        const productSlug = productsResponse.body[0].slug;
        
        const response = await request(app.getHttpServer())
          .get(`/products/slug/${productSlug}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('slug', productSlug);
      }
    });
  });

  describe('GET /products/type/:type', () => {
    it('should return products by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/type/subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /products/active/list', () => {
    it('should return active products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/active/list')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /products', () => {
    it('should create new product', async () => {
      const productData = {
        name: 'Test Product',
        slug: `test-product-${Date.now()}`,
        description: 'Test product description',
        productType: 'subscription',
        isActive: true,
        metadata: {
          amount: 29.99,
          currency: 'BRL',
          billingCycle: 'monthly'
        }
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', productData.name);
      expect(response.body).toHaveProperty('slug', productData.slug);
    });

    it('should reject duplicate slug', async () => {
      const productData = {
        name: 'Duplicate Product',
        slug: 'holymind', // Assuming holymind already exists
        description: 'Duplicate product description',
        type: 'subscription',
        isActive: true
      };

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(409);
    });
  });

  describe('PATCH /products/:id', () => {
    it('should return 404 for non-existent endpoint', async () => {
      await request(app.getHttpServer())
        .patch('/products/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete product', async () => {
      // First create a product
      const productData = {
        name: 'Delete Product',
        slug: `delete-product-${Date.now()}`,
        description: 'Delete product description',
        productType: 'subscription',
        isActive: true
      };

      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData);

      const productId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/products')
        .expect(401);
    });
  });
});

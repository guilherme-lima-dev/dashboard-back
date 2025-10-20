import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Validation Pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // CORS
    app.enableCors();

    // Swagger Configuration
    const config = new DocumentBuilder()
        .setTitle('Analytics Platform API')
        .setDescription(
            'API completa para analytics de assinaturas com integração de múltiplas plataformas de pagamento (Stripe, Hotmart, Cartpanda)',
        )
        .setVersion('1.0')
        .setContact(
            'Analytics Platform Team',
            'https://analytics-platform.com',
            'dev@analytics-platform.com',
        )
        .setLicense('MIT', 'https://opensource.org/licenses/MIT')
        .addServer('http://localhost:4000', 'Development Server')
        .addServer('https://api.analytics-platform.com', 'Production Server')
        .addTag('Authentication', 'Endpoints de autenticação e gestão de tokens')
        .addTag('Users', 'Gestão de usuários do sistema')
        .addTag('Permissions', 'Sistema de permissões RBAC')
        .addTag('Products', 'Catálogo de produtos')
        .addTag('Offers', 'Ofertas e preços')
        .addTag('Platforms', 'Plataformas de pagamento')
        .addTag('Customers', 'Gestão de clientes')
        .addTag('Subscriptions', 'Assinaturas e ciclo de vida')
        .addTag('Transactions', 'Transações financeiras')
        .addTag('Affiliates', 'Sistema de afiliados')
        .addTag('Analytics', 'Métricas e dashboards')
        .addTag('Integrations', 'Integrações e webhooks')
        .addTag('Audit', 'Auditoria e compliance')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'JWT-auth',
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
            docExpansion: 'none',
            filter: true,
            showRequestDuration: true,
        },
        customSiteTitle: 'Analytics Platform API Docs',
        customfavIcon: 'https://nestjs.com/img/logo-small.svg',
        customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .info .title { font-size: 36px }
    `,
    });

    const port = process.env.PORT || 4000;
    await app.listen(port);

    console.log(`🚀 Application is running on: http://localhost:${port}`);
    console.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();

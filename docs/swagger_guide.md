# 📚 Guia de Implementação do Swagger/OpenAPI

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Instalação](#instalação)
3. [Configuração Inicial](#configuração-inicial)
4. [Documentando DTOs](#documentando-dtos)
5. [Documentando Controllers](#documentando-controllers)
6. [Decorators Customizados](#decorators-customizados)
7. [Autenticação JWT no Swagger](#autenticação-jwt-no-swagger)
8. [Boas Práticas](#boas-práticas)
9. [Exemplos Completos](#exemplos-completos)
10. [Troubleshooting](#troubleshooting)

---

## Visão Geral

### O que é Swagger/OpenAPI?

Swagger (OpenAPI) é uma especificação para documentação de APIs REST. O NestJS possui integração nativa via `@nestjs/swagger` que:

- ✅ Gera documentação interativa automaticamente
- ✅ Permite testar endpoints diretamente no browser
- ✅ Valida requests e responses
- ✅ Documenta autenticação (JWT, OAuth, etc)
- ✅ Exporta especificação OpenAPI 3.0

### URL da Documentação

Após configurado, a documentação estará disponível em:
```
http://localhost:4000/api/docs
```

---

## Instalação

### 1. Instalar Dependências

```bash
npm install @nestjs/swagger swagger-ui-express
```

**Pacotes instalados:**
- `@nestjs/swagger` - Decorators e utilidades para NestJS
- `swagger-ui-express` - Interface visual do Swagger

---

## Configuração Inicial

### 2. Configurar no `main.ts`

**Caminho:** `src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validation Pipe (necessário para DTOs)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors();

  // ============================================
  // SWAGGER CONFIGURATION
  // ============================================
  const config = new DocumentBuilder()
    // Informações básicas
    .setTitle('Analytics Platform API')
    .setDescription(
      'API completa para analytics de assinaturas com integração de múltiplas plataformas de pagamento (Stripe, Hotmart, Cartpanda)',
    )
    .setVersion('1.0')
    
    // Contato e Licença
    .setContact(
      'Analytics Platform Team',
      'https://analytics-platform.com',
      'dev@analytics-platform.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    
    // Servidores
    .addServer('http://localhost:4000', 'Development Server')
    .addServer('https://api.analytics-platform.com', 'Production Server')
    
    // Tags (organização das rotas)
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
    
    // Autenticação JWT
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // Nome do security scheme
    )
    .build();

  // Criar documento
  const document = SwaggerModule.createDocument(app, config);
  
  // Setup Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,     // Manter token após refresh
      tagsSorter: 'alpha',            // Ordenar tags alfabeticamente
      operationsSorter: 'alpha',      // Ordenar operações alfabeticamente
      docExpansion: 'none',           // Colapsar tudo por padrão
      filter: true,                   // Habilitar busca
      showRequestDuration: true,      // Mostrar tempo de resposta
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
```

**Explicação dos parâmetros:**

| Método | Descrição |
|--------|-----------|
| `.setTitle()` | Título da API |
| `.setDescription()` | Descrição detalhada |
| `.setVersion()` | Versão da API (semantic versioning) |
| `.setContact()` | Informações de contato |
| `.setLicense()` | Tipo de licença |
| `.addServer()` | URLs dos servidores (dev, staging, prod) |
| `.addTag()` | Tags para agrupar endpoints |
| `.addBearerAuth()` | Configurar autenticação JWT |

---

## Documentando DTOs

### 3. Adicionar Decorators aos DTOs

DTOs são as classes que definem a estrutura de dados de entrada e saída. Use `@ApiProperty()` para documentá-las.

**Exemplo:** `src/modules/auth/dto/login.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'admin@analytics.com',
    type: String,
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'Admin@123',
    minLength: 6,
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  password: string;
}
```

**Propriedades do `@ApiProperty()`:**

| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `description` | string | Descrição do campo |
| `example` | any | Valor de exemplo |
| `type` | Type | Tipo do campo (String, Number, Boolean, etc) |
| `enum` | array | Lista de valores válidos |
| `required` | boolean | Se é obrigatório (default: true) |
| `nullable` | boolean | Se pode ser null |
| `minLength` | number | Tamanho mínimo (strings) |
| `maxLength` | number | Tamanho máximo (strings) |
| `minimum` | number | Valor mínimo (números) |
| `maximum` | number | Valor máximo (números) |
| `format` | string | Formato (email, uri, uuid, date-time) |
| `isArray` | boolean | Se é um array |
| `default` | any | Valor padrão |

**Exemplo com mais opções:**

```typescript
export class CreateProductDto {
  @ApiProperty({
    description: 'Nome do produto',
    example: 'Holymind',
    minLength: 3,
    maxLength: 100,
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Tipo do produto',
    enum: ['subscription', 'one_time', 'addon'],
    example: 'subscription',
  })
  @IsEnum(['subscription', 'one_time', 'addon'])
  productType: string;

  @ApiProperty({
    description: 'Se o produto está ativo',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Metadata adicional',
    example: { category: 'health', target: 'B2C' },
    required: false,
    type: 'object',
  })
  @IsOptional()
  metadata?: object;
}
```

### DTO com Arrays

```typescript
export class CreateOrderDto {
  @ApiProperty({
    description: 'Itens do pedido',
    type: [CreateOrderItemDto],
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
```

### DTO com Propriedades Opcionais

```typescript
export class UpdateUserDto {
  @ApiProperty({
    description: 'Nome completo',
    example: 'João Silva',
    required: false,
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({
    description: 'Status do usuário',
    enum: ['active', 'inactive', 'pending_approval'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'pending_approval'])
  status?: string;
}
```

---

## Documentando Controllers

### 4. Adicionar Decorators aos Controllers

**Decorators principais:**

| Decorator | Uso |
|-----------|-----|
| `@ApiTags()` | Tag para agrupar endpoints |
| `@ApiOperation()` | Descrição da operação |
| `@ApiBearerAuth()` | Requer autenticação JWT |
| `@ApiBody()` | Body do request |
| `@ApiQuery()` | Query parameters |
| `@ApiParam()` | Path parameters |
| `@ApiResponse()` | Possíveis respostas |

**Exemplo completo:** `src/modules/auth/auth.controller.ts`

```typescript
import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication')  // ← Tag para agrupar
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description: 'Autentica o usuário e retorna tokens JWT (access + refresh)',
  })
  @ApiBody({ type: LoginDto })  // ← DTO do body
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    schema: {
      example: {
        user: {
          id: 'uuid-123',
          email: 'admin@analytics.com',
          fullName: 'Super Admin',
          roles: ['Super Admin'],
          permissions: ['dashboard:read', 'users:create'],
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: '15m',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas',
    schema: {
      example: {
        statusCode: 401,
        message: 'Email ou senha inválidos',
        error: 'Unauthorized',
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiBearerAuth('JWT-auth')  // ← Requer autenticação
  @Post('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obter perfil do usuário autenticado',
    description: 'Retorna informações do usuário logado',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil retornado com sucesso',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  async getProfile(@CurrentUser() user: any) {
    return { user };
  }
}
```

### Documentar Query Parameters

```typescript
@Get()
@ApiOperation({ summary: 'Listar produtos' })
@ApiQuery({
  name: 'page',
  required: false,
  type: Number,
  description: 'Número da página',
  example: 1,
})
@ApiQuery({
  name: 'limit',
  required: false,
  type: Number,
  description: 'Itens por página',
  example: 20,
})
@ApiQuery({
  name: 'search',
  required: false,
  type: String,
  description: 'Busca por nome',
})
async findAll(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20,
  @Query('search') search?: string,
) {
  return this.productsService.findAll({ page, limit, search });
}
```

### Documentar Path Parameters

```typescript
@Get(':id')
@ApiOperation({ summary: 'Buscar produto por ID' })
@ApiParam({
  name: 'id',
  type: String,
  description: 'UUID do produto',
  example: 'uuid-123',
})
@ApiResponse({
  status: 200,
  description: 'Produto encontrado',
})
@ApiResponse({
  status: 404,
  description: 'Produto não encontrado',
})
async findOne(@Param('id') id: string) {
  return this.productsService.findOne(id);
}
```

---

## Decorators Customizados

### 5. Criar DTOs de Response

**Caminho:** `src/common/dto/api-response.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data?: T;

  @ApiProperty({ example: 'Operação realizada com sucesso', required: false })
  message?: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 'Validation failed' })
  message: string | string[];

  @ApiProperty({ required: false })
  details?: any;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({
    example: {
      total: 100,
      page: 1,
      limit: 20,
      totalPages: 5,
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

### 6. Decorator para Respostas Paginadas

**Caminho:** `src/common/decorators/api-paginated-response.decorator.ts`

```typescript
import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../dto/api-response.dto';

export const ApiPaginatedResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(PaginatedResponseDto, model),
    ApiOkResponse({
      description: 'Lista paginada retornada com sucesso',
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
};
```

**Uso:**
```typescript
@Get()
@ApiPaginatedResponse(ProductDto)
async findAll() {
  return this.productsService.findAll();
}
```

### 7. Decorator para Respostas Padrão

**Caminho:** `src/common/decorators/api-standard-responses.decorator.ts`

```typescript
import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export const ApiStandardResponses = () => {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Bad Request - Dados inválidos',
      schema: {
        example: {
          statusCode: 400,
          message: ['Campo X é obrigatório'],
          error: 'Bad Request',
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Token inválido ou ausente',
      schema: {
        example: {
          statusCode: 401,
          message: 'Unauthorized',
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - Permissões insuficientes',
      schema: {
        example: {
          statusCode: 403,
          message: 'Você não tem permissão para acessar este recurso',
          error: 'Forbidden',
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
      schema: {
        example: {
          statusCode: 500,
          message: 'Internal server error',
        },
      },
    }),
  );
};
```

**Uso:**
```typescript
@Get()
@ApiStandardResponses()
@ApiResponse({ status: 200, description: 'Lista de produtos' })
async findAll() {
  return this.productsService.findAll();
}
```

---

## Autenticação JWT no Swagger

### 8. Testar Endpoints Protegidos

**Passo a passo:**

1. **Fazer login:**
    - Ir em `POST /auth/login`
    - Clicar em "Try it out"
    - Preencher:
      ```json
      {
        "email": "admin@analytics.com",
        "password": "Admin@123"
      }
      ```
    - Clicar em "Execute"
    - Copiar o `accessToken` da resposta

2. **Autorizar:**
    - Clicar no botão **"Authorize"** no topo da página
    - Colar o token (sem "Bearer ")
    - Clicar em "Authorize"
    - Fechar o modal

3. **Testar endpoint protegido:**
    - Ir em `POST /auth/me`
    - Clicar em "Try it out"
    - Clicar em "Execute"
    - ✅ Deve retornar o perfil do usuário

**Importante:** Não adicione "Bearer " manualmente. O Swagger já faz isso automaticamente.

---

## Boas Práticas

### 9. Checklist de Documentação

**Para cada DTO:**
- ✅ `@ApiProperty()` em todos os campos
- ✅ `description` clara
- ✅ `example` realista
- ✅ `type` correto
- ✅ `required` definido (quando opcional)

**Para cada Controller:**
- ✅ `@ApiTags()` no controller
- ✅ `@ApiOperation()` em cada endpoint
- ✅ `@ApiBody()` quando há body
- ✅ `@ApiResponse()` para sucesso (200/201)
- ✅ `@ApiResponse()` para erros (400/401/403/404/500)
- ✅ `@ApiBearerAuth()` em rotas protegidas

**Responses:**
- ✅ Sempre incluir exemplo no `schema`
- ✅ Documentar todos os status codes possíveis
- ✅ Usar DTOs tipados quando possível

### 10. Organização

**Tags recomendadas:**
```typescript
.addTag('Authentication', 'Autenticação e tokens')
.addTag('Users', 'Gestão de usuários')
.addTag('Products', 'Catálogo de produtos')
.addTag('Subscriptions', 'Assinaturas')
.addTag('Analytics', 'Métricas e dashboards')
```

**Estrutura de URLs:**
```
/api/v1/auth/login
/api/v1/users
/api/v1/products
/api/v1/subscriptions
```

---

## Exemplos Completos

### 11. CRUD Completo Documentado

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductDto } from './dto/product.dto';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { ApiStandardResponses } from '../../common/decorators/api-standard-responses.decorator';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@ApiStandardResponses()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermission('products:read')
  @ApiOperation({
    summary: 'Listar produtos',
    description: 'Retorna lista paginada de produtos com filtros opcionais',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Busca por nome' })
  @ApiQuery({
    name: 'productType',
    required: false,
    enum: ['subscription', 'one_time', 'addon'],
  })
  @ApiPaginatedResponse(ProductDto)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('productType') productType?: string,
  ) {
    return this.productsService.findAll({ page, limit, search, productType });
  }

  @Get(':id')
  @RequirePermission('products:read')
  @ApiOperation({
    summary: 'Buscar produto por ID',
    description: 'Retorna detalhes completos de um produto',
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID do produto' })
  @ApiResponse({
    status: 200,
    description: 'Produto encontrado',
    type: ProductDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado',
  })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @RequirePermission('products:create')
  @ApiOperation({
    summary: 'Criar produto',
    description: 'Cria um novo produto no catálogo',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: 'Produto criado com sucesso',
    type: ProductDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Produto com esse slug já existe',
  })
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch(':id')
  @RequirePermission('products:update')
  @ApiOperation({
    summary: 'Atualizar produto',
    description: 'Atualiza dados de um produto existente',
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID do produto' })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: 200,
    description: 'Produto atualizado com sucesso',
    type: ProductDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado',
  })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @RequirePermission('products:delete')
  @ApiOperation({
    summary: 'Deletar produto',
    description: 'Remove um produto do catálogo (soft delete)',
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID do produto' })
  @ApiResponse({
    status: 200,
    description: 'Produto deletado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado',
  })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
```

---

## Troubleshooting

### 12. Problemas Comuns

**1. Swagger não aparece**
```bash
# Verificar se está instalado
npm list @nestjs/swagger

# Reinstalar se necessário
npm install @nestjs/swagger swagger-ui-express
```

**2. DTOs não aparecem na documentação**
```typescript
// Certifique-se de adicionar @ApiProperty() em TODOS os campos
export class MyDto {
  @ApiProperty()  // ← OBRIGATÓRIO
  field: string;
}
```

**3. Autenticação não funciona**
```typescript
// No main.ts, verificar:
.addBearerAuth(
  { /* config */ },
  'JWT-auth'  // ← Nome deve ser o mesmo usado nos controllers
)

// No controller:
@ApiBearerAuth('JWT-auth')  // ← Mesmo nome aqui
```

**4. Exemplos não aparecem**
```typescript
// Use 'schema' com 'example':
@ApiResponse({
  status: 200,
  schema: {
    example: { /* seu objeto */ }
  }
})
```

**5. Response vazio**
```typescript
// Adicione 'type' ou 'schema':
@ApiResponse({
  status: 200,
  type: ProductDto  // ← ou use schema
})
```

---

## Resumo dos Decorators

### Controllers
| Decorator | Uso |
|-----------|-----|
| `@ApiTags('Name')` | Agrupar endpoints por tag |
| `@ApiBearerAuth('JWT-auth')` | Requer autenticação |
| `@ApiOperation({ summary, description })` | Descrever operação |

### Requests
| Decorator | Uso |
|-----------|-----|
| `@ApiBody({ type: Dto })` | Body do request |
| `@ApiQuery({ name, type, required })` | Query parameter |
| `@ApiParam({ name, type })` | Path parameter |

### Responses
| Decorator | Uso |
|-----------|-----|
| `@ApiResponse({ status, description, type })` | Documentar response |
| `@ApiOkResponse({ type })` | Shortcut para 200 |
| `@ApiCreatedResponse({ type })` | Shortcut para 201 |
| `@ApiBadRequestResponse()` | Shortcut para 400 |
| `@ApiUnauthorizedResponse()` | Shortcut para 401 |
| `@ApiForbiddenResponse()` | Shortcut para 403 |
| `@ApiNotFoundResponse()` | Shortcut para 404 |

### DTOs
| Decorator | Uso |
|-----------|-----|
| `@ApiProperty({ description, example })` | Documentar campo |
| `@ApiPropertyOptional()` | Campo opcional |
| `@ApiHideProperty()` | Ocultar campo |

---

## Checklist Final

Antes de finalizar a documentação, verifique:

- [ ] `@nestjs/swagger` instalado
- [ ] Swagger configurado no `main.ts`
- [ ] Todas as tags criadas
- [ ] Autenticação JWT configurada
- [ ] Todos os DTOs com `@ApiProperty()`
- [ ] Todos os controllers com `@ApiTags()`
- [ ] Todas as operações com `@ApiOperation()`
- [ ] Rotas protegidas com `@ApiBearerAuth()`
- [ ] Responses documentadas (200, 400, 401, 404, etc)
- [ ] Exemplos realistas em todas as responses
- [ ] Query/Path params documentados
- [ ] Testado no browser em `/api/docs`

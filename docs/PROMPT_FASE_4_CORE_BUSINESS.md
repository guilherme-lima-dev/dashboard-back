# 🎯 PROMPT DE IMPLEMENTAÇÃO - FASE 4: CORE BUSINESS

## 📋 CONTEXTO DO PROJETO

Você está trabalhando no **Analytics Platform**, um sistema de analytics de assinaturas que consolida dados de múltiplas plataformas de pagamento (Stripe, Hotmart, Cartpanda).

### Estado Atual do Projeto:
- ✅ **Fase 1:** Authentication & Authorization (100% completa)
- ✅ **Fase 2:** Products Catalog (100% completa)
- ✅ **Fase 3:** Integration Infrastructure (95% completa - falta apenas Sync Jobs)
  - Credentials Management implementado
  - Webhook Infrastructure implementado
  - 3 Providers implementados (Stripe, Hotmart, Cartpanda)
  - Webhooks são recebidos, validados e processados
  - **PROBLEMA:** Dados são normalizados mas NÃO são salvos no banco (apenas logs)

### O que você vai implementar:

**Fase 4: Core Business** - Criar as tabelas e lógica para **persistir** os dados processados pelos webhooks, permitindo cálculo de métricas futuras.

---

## 🎯 OBJETIVOS DA FASE 4

1. Criar **7 tabelas** no banco de dados (via Prisma)
2. Implementar **4 módulos NestJS** com services
3. Criar **endpoints REST** (somente leitura + operações específicas)
4. **Integrar** com WebhookProcessor para salvar dados
5. Atualizar **seeds, Swagger e Postman**

---

## 📐 PADRÕES DO PROJETO (CRÍTICO - SEGUIR RIGOROSAMENTE)

### 1. Convenções de Código

**OBRIGATÓRIO:**
- ❌ **NUNCA escrever comentários no código**
- ✅ Código em **inglês** (variáveis, funções, classes)
- ✅ Nomes descritivos e autoexplicativos
- ✅ TypeScript strict mode
- ✅ Usar decorators do NestJS (@Injectable, @Controller, etc)

### 2. Estrutura de Arquivos

```
src/modules/{module-name}/
├── {module-name}.module.ts
├── {module-name}.controller.ts
├── {module-name}.service.ts
└── dto/
    ├── create-{entity}.dto.ts
    ├── update-{entity}.dto.ts
    └── query-{entity}.dto.ts
```

### 3. Naming Conventions

**Prisma Models:**
- PascalCase singular: `Customer`, `Subscription`, `Transaction`
- Campos em camelCase: `customerId`, `recurringAmountBrl`
- Map para snake_case: `@map("customer_id")`, `@@map("customers")`

**Database:**
- Tabelas: plural snake_case: `customers`, `subscriptions`
- Colunas: snake_case: `customer_id`, `recurring_amount_brl`
- Timestamps: `created_at`, `updated_at`
- Primary keys: sempre UUID

**TypeScript:**
- Interfaces: PascalCase com prefixo `I`: `ICustomer`, `ISubscription`
- Classes: PascalCase: `CustomersService`, `SubscriptionsController`
- Métodos: camelCase: `findById`, `createSubscription`
- Constantes: UPPER_SNAKE_CASE: `MAX_RETRY_ATTEMPTS`

### 4. DTOs (Data Transfer Objects)

**SEMPRE usar class-validator:**

```typescript
import { IsString, IsEmail, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'cus_stripe_123' })
  @IsString()
  externalCustomerId: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;
}
```

### 5. Services Pattern

**SEMPRE injetar PrismaService:**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
      include: {
        platform: true,
        subscriptions: true,
      },
    });
  }
}
```

### 6. Controllers Pattern

**SEMPRE usar decorators do Swagger:**

```typescript
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'List all customers' })
  async findAll(@Query() query: QueryCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'Get customer by ID' })
  async findOne(@Param('id') id: string) {
    return this.customersService.findById(id);
  }
}
```

### 7. Valores Monetários

**CRÍTICO:** SEMPRE armazenar valores em **3 moedas**:
- Original (moeda da transação)
- BRL (Real brasileiro)
- USD (Dólar americano)

```typescript
// Exemplo no Prisma Schema
recurringAmount      Decimal  @map("recurring_amount") @db.Decimal(10, 2)
currency             String   @db.VarChar(3)
recurringAmountBrl   Decimal  @map("recurring_amount_brl") @db.Decimal(10, 2)
recurringAmountUsd   Decimal  @map("recurring_amount_usd") @db.Decimal(10, 2)
exchangeRate         Decimal? @map("exchange_rate") @db.Decimal(10, 6)
```

### 8. Migrations

**Padrão de nomenclatura:**
```bash
npx prisma migrate dev --name add_core_business_tables
```

**Incremental, não tudo de uma vez!**

---

## 📊 ETAPA 1: SCHEMA PRISMA (PRIORIDADE MÁXIMA)

### Tarefa: Adicionar 7 models ao `prisma/schema.prisma`

#### Model 1: Customer

```prisma
model Customer {
  id                   String   @id @default(uuid()) @db.Uuid
  platformId           String   @map("platform_id") @db.Uuid
  platform             Platform @relation(fields: [platformId], references: [id])
  
  externalCustomerId   String   @map("external_customer_id") @db.VarChar(255)
  
  email                String   @db.VarChar(255)
  name                 String?  @db.VarChar(255)
  phone                String?  @db.VarChar(50)
  document             String?  @db.VarChar(50)
  documentType         String?  @map("document_type") @db.VarChar(20)
  
  countryCode          String?  @map("country_code") @db.VarChar(2)
  state                String?  @db.VarChar(100)
  city                 String?  @db.VarChar(100)
  
  metadata             Json?    @db.JsonB
  
  firstPurchaseAt      DateTime? @map("first_purchase_at") @db.Timestamp
  lastPurchaseAt       DateTime? @map("last_purchase_at") @db.Timestamp
  totalSpentBrl        Decimal   @default(0) @map("total_spent_brl") @db.Decimal(10, 2)
  
  createdAt            DateTime  @default(now()) @map("created_at") @db.Timestamp
  updatedAt            DateTime  @updatedAt @map("updated_at") @db.Timestamp
  
  orders               Order[]
  subscriptions        Subscription[]
  transactions         Transaction[]
  
  @@unique([platformId, externalCustomerId], name: "unique_platform_customer")
  @@index([platformId, externalCustomerId], name: "idx_customers_platform_external")
  @@index([email], name: "idx_customers_email")
  @@map("customers")
}
```

#### Model 2: Order

```prisma
model Order {
  id                   String   @id @default(uuid()) @db.Uuid
  customerId           String   @map("customer_id") @db.Uuid
  customer             Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  platformId           String   @map("platform_id") @db.Uuid
  platform             Platform @relation(fields: [platformId], references: [id])
  
  externalOrderId      String   @map("external_order_id") @db.VarChar(255)
  
  subtotalAmount       Decimal  @map("subtotal_amount") @db.Decimal(10, 2)
  discountAmount       Decimal  @default(0) @map("discount_amount") @db.Decimal(10, 2)
  taxAmount            Decimal  @default(0) @map("tax_amount") @db.Decimal(10, 2)
  totalAmount          Decimal  @map("total_amount") @db.Decimal(10, 2)
  currency             String   @db.VarChar(3)
  
  subtotalAmountBrl    Decimal  @map("subtotal_amount_brl") @db.Decimal(10, 2)
  discountAmountBrl    Decimal  @default(0) @map("discount_amount_brl") @db.Decimal(10, 2)
  taxAmountBrl         Decimal  @default(0) @map("tax_amount_brl") @db.Decimal(10, 2)
  totalAmountBrl       Decimal  @map("total_amount_brl") @db.Decimal(10, 2)
  
  subtotalAmountUsd    Decimal  @map("subtotal_amount_usd") @db.Decimal(10, 2)
  discountAmountUsd    Decimal  @default(0) @map("discount_amount_usd") @db.Decimal(10, 2)
  taxAmountUsd         Decimal  @default(0) @map("tax_amount_usd") @db.Decimal(10, 2)
  totalAmountUsd       Decimal  @map("total_amount_usd") @db.Decimal(10, 2)
  
  exchangeRate         Decimal? @map("exchange_rate") @db.Decimal(10, 6)
  
  utmSource            String?  @map("utm_source") @db.VarChar(255)
  utmMedium            String?  @map("utm_medium") @db.VarChar(255)
  utmCampaign          String?  @map("utm_campaign") @db.VarChar(255)
  utmTerm              String?  @map("utm_term") @db.VarChar(255)
  utmContent           String?  @map("utm_content") @db.VarChar(255)
  
  referrerUrl          String?  @map("referrer_url") @db.Text
  landingPageUrl       String?  @map("landing_page_url") @db.Text
  
  affiliateId          String?  @map("affiliate_id") @db.Uuid
  couponCode           String?  @map("coupon_code") @db.VarChar(100)
  
  status               String   @db.VarChar(50)
  platformMetadata     Json?    @map("platform_metadata") @db.JsonB
  
  orderDate            DateTime @map("order_date") @db.Timestamp
  completedAt          DateTime? @map("completed_at") @db.Timestamp
  
  createdAt            DateTime @default(now()) @map("created_at") @db.Timestamp
  updatedAt            DateTime @updatedAt @map("updated_at") @db.Timestamp
  
  items                OrderItem[]
  subscriptions        Subscription[]
  transactions         Transaction[]
  
  @@unique([platformId, externalOrderId], name: "unique_platform_order")
  @@index([customerId], name: "idx_orders_customer")
  @@index([platformId], name: "idx_orders_platform")
  @@index([status], name: "idx_orders_status")
  @@index([orderDate], name: "idx_orders_date")
  @@map("orders")
}
```

#### Model 3: OrderItem

```prisma
model OrderItem {
  id                   String   @id @default(uuid()) @db.Uuid
  orderId              String   @map("order_id") @db.Uuid
  order                Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  productId            String?  @map("product_id") @db.Uuid
  product              Product? @relation(fields: [productId], references: [id], onDelete: SetNull)
  
  offerId              String?  @map("offer_id") @db.Uuid
  offer                Offer?   @relation(fields: [offerId], references: [id], onDelete: SetNull)
  
  externalProductId    String   @map("external_product_id") @db.VarChar(255)
  
  itemType             String   @map("item_type") @db.VarChar(50)
  
  productName          String   @map("product_name") @db.VarChar(255)
  
  price                Decimal  @db.Decimal(10, 2)
  quantity             Int      @default(1)
  discountAmount       Decimal  @default(0) @map("discount_amount") @db.Decimal(10, 2)
  subtotal             Decimal  @db.Decimal(10, 2)
  currency             String   @db.VarChar(3)
  
  priceBrl             Decimal  @map("price_brl") @db.Decimal(10, 2)
  discountAmountBrl    Decimal  @default(0) @map("discount_amount_brl") @db.Decimal(10, 2)
  subtotalBrl          Decimal  @map("subtotal_brl") @db.Decimal(10, 2)
  
  priceUsd             Decimal  @map("price_usd") @db.Decimal(10, 2)
  discountAmountUsd    Decimal  @default(0) @map("discount_amount_usd") @db.Decimal(10, 2)
  subtotalUsd          Decimal  @map("subtotal_usd") @db.Decimal(10, 2)
  
  createdAt            DateTime @default(now()) @map("created_at") @db.Timestamp
  
  @@index([orderId], name: "idx_order_items_order")
  @@index([productId], name: "idx_order_items_product")
  @@map("order_items")
}
```

#### Model 4: Subscription

```prisma
model Subscription {
  id                      String   @id @default(uuid()) @db.Uuid
  customerId              String   @map("customer_id") @db.Uuid
  customer                Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  
  productId               String   @map("product_id") @db.Uuid
  product                 Product  @relation(fields: [productId], references: [id])
  
  offerId                 String?  @map("offer_id") @db.Uuid
  offer                   Offer?   @relation(fields: [offerId], references: [id], onDelete: SetNull)
  
  platformId              String   @map("platform_id") @db.Uuid
  platform                Platform @relation(fields: [platformId], references: [id])
  
  orderId                 String?  @map("order_id") @db.Uuid
  order                   Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)
  
  externalSubscriptionId  String   @map("external_subscription_id") @db.VarChar(255)
  externalCustomerId      String   @map("external_customer_id") @db.VarChar(255)
  externalProductId       String   @map("external_product_id") @db.VarChar(255)
  
  status                  String   @db.VarChar(50)
  
  isTrial                 Boolean  @default(false) @map("is_trial")
  trialStart              DateTime? @map("trial_start") @db.Timestamp
  trialEnd                DateTime? @map("trial_end") @db.Timestamp
  trialEndsAt             DateTime? @map("trial_ends_at") @db.Timestamp
  
  recurringAmount         Decimal  @map("recurring_amount") @db.Decimal(10, 2)
  currency                String   @db.VarChar(3)
  recurringAmountBrl      Decimal  @map("recurring_amount_brl") @db.Decimal(10, 2)
  recurringAmountUsd      Decimal  @map("recurring_amount_usd") @db.Decimal(10, 2)
  exchangeRate            Decimal? @map("exchange_rate") @db.Decimal(10, 6)
  
  billingPeriod           String   @map("billing_period") @db.VarChar(20)
  billingCycles           Int?     @map("billing_cycles")
  
  startDate               DateTime @map("start_date") @db.Timestamp
  nextBillingDate         DateTime? @map("next_billing_date") @db.Timestamp
  currentPeriodStart      DateTime? @map("current_period_start") @db.Timestamp
  currentPeriodEnd        DateTime? @map("current_period_end") @db.Timestamp
  
  canceledAt              DateTime? @map("canceled_at") @db.Timestamp
  cancellationReason      String?   @map("cancellation_reason") @db.Text
  canceledBy              String?   @map("canceled_by") @db.VarChar(50)
  
  pausedAt                DateTime? @map("paused_at") @db.Timestamp
  resumedAt               DateTime? @map("resumed_at") @db.Timestamp
  
  endedAt                 DateTime? @map("ended_at") @db.Timestamp
  
  affiliateId             String?   @map("affiliate_id") @db.Uuid
  
  platformMetadata        Json?     @map("platform_metadata") @db.JsonB
  
  createdAt               DateTime  @default(now()) @map("created_at") @db.Timestamp
  updatedAt               DateTime  @updatedAt @map("updated_at") @db.Timestamp
  
  periods                 SubscriptionPeriod[]
  transactionSubscriptions TransactionSubscription[]
  
  @@unique([platformId, externalSubscriptionId], name: "unique_platform_subscription")
  @@index([customerId], name: "idx_subscriptions_customer")
  @@index([productId], name: "idx_subscriptions_product")
  @@index([platformId], name: "idx_subscriptions_platform")
  @@index([status], name: "idx_subscriptions_status")
  @@index([nextBillingDate], name: "idx_subscriptions_next_billing")
  @@map("subscriptions")
}
```

#### Model 5: Transaction

```prisma
model Transaction {
  id                      String   @id @default(uuid()) @db.Uuid
  orderId                 String?  @map("order_id") @db.Uuid
  order                   Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)
  
  customerId              String   @map("customer_id") @db.Uuid
  customer                Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  
  platformId              String   @map("platform_id") @db.Uuid
  platform                Platform @relation(fields: [platformId], references: [id])
  
  externalTransactionId   String   @map("external_transaction_id") @db.VarChar(255)
  externalInvoiceId       String?  @map("external_invoice_id") @db.VarChar(255)
  
  transactionType         String   @map("transaction_type") @db.VarChar(50)
  status                  String   @db.VarChar(50)
  
  grossAmount             Decimal  @map("gross_amount") @db.Decimal(10, 2)
  discountAmount          Decimal  @default(0) @map("discount_amount") @db.Decimal(10, 2)
  taxAmount               Decimal  @default(0) @map("tax_amount") @db.Decimal(10, 2)
  feeAmount               Decimal  @default(0) @map("fee_amount") @db.Decimal(10, 2)
  netAmount               Decimal  @map("net_amount") @db.Decimal(10, 2)
  currency                String   @db.VarChar(3)
  
  grossAmountBrl          Decimal  @map("gross_amount_brl") @db.Decimal(10, 2)
  discountAmountBrl       Decimal  @default(0) @map("discount_amount_brl") @db.Decimal(10, 2)
  taxAmountBrl            Decimal  @default(0) @map("tax_amount_brl") @db.Decimal(10, 2)
  feeAmountBrl            Decimal  @default(0) @map("fee_amount_brl") @db.Decimal(10, 2)
  netAmountBrl            Decimal  @map("net_amount_brl") @db.Decimal(10, 2)
  
  grossAmountUsd          Decimal  @map("gross_amount_usd") @db.Decimal(10, 2)
  discountAmountUsd       Decimal  @default(0) @map("discount_amount_usd") @db.Decimal(10, 2)
  taxAmountUsd            Decimal  @default(0) @map("tax_amount_usd") @db.Decimal(10, 2)
  feeAmountUsd            Decimal  @default(0) @map("fee_amount_usd") @db.Decimal(10, 2)
  netAmountUsd            Decimal  @map("net_amount_usd") @db.Decimal(10, 2)
  
  exchangeRate            Decimal? @map("exchange_rate") @db.Decimal(10, 6)
  
  paymentMethod           String?  @map("payment_method") @db.VarChar(100)
  paymentMethodDetails    Json?    @map("payment_method_details") @db.JsonB
  
  failureCode             String?  @map("failure_code") @db.VarChar(100)
  failureMessage          String?  @map("failure_message") @db.Text
  
  platformMetadata        Json?    @map("platform_metadata") @db.JsonB
  
  transactionDate         DateTime @map("transaction_date") @db.Timestamp
  
  createdAt               DateTime @default(now()) @map("created_at") @db.Timestamp
  
  transactionSubscriptions TransactionSubscription[]
  
  @@unique([platformId, externalTransactionId], name: "unique_platform_transaction")
  @@index([orderId], name: "idx_transactions_order")
  @@index([customerId], name: "idx_transactions_customer")
  @@index([platformId], name: "idx_transactions_platform")
  @@index([status], name: "idx_transactions_status")
  @@index([transactionType], name: "idx_transactions_type")
  @@index([transactionDate], name: "idx_transactions_date")
  @@map("transactions")
}
```

#### Model 6: TransactionSubscription (Join Table)

```prisma
model TransactionSubscription {
  id                   String       @id @default(uuid()) @db.Uuid
  transactionId        String       @map("transaction_id") @db.Uuid
  transaction          Transaction  @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  
  subscriptionId       String       @map("subscription_id") @db.Uuid
  subscription         Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  
  amountAllocatedBrl   Decimal      @map("amount_allocated_brl") @db.Decimal(10, 2)
  
  createdAt            DateTime     @default(now()) @map("created_at") @db.Timestamp
  
  @@unique([transactionId, subscriptionId], name: "unique_transaction_subscription")
  @@index([transactionId], name: "idx_trans_sub_transaction")
  @@index([subscriptionId], name: "idx_trans_sub_subscription")
  @@map("transaction_subscriptions")
}
```

#### Model 7: SubscriptionPeriod

```prisma
model SubscriptionPeriod {
  id                   String        @id @default(uuid()) @db.Uuid
  subscriptionId       String        @map("subscription_id") @db.Uuid
  subscription         Subscription  @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  
  periodNumber         Int           @map("period_number")
  
  periodStart          DateTime      @map("period_start") @db.Timestamp
  periodEnd            DateTime      @map("period_end") @db.Timestamp
  
  expectedAmountBrl    Decimal       @map("expected_amount_brl") @db.Decimal(10, 2)
  actualAmountBrl      Decimal?      @map("actual_amount_brl") @db.Decimal(10, 2)
  
  paymentStatus        String        @map("payment_status") @db.VarChar(50)
  paymentDate          DateTime?     @map("payment_date") @db.Timestamp
  
  transactionId        String?       @map("transaction_id") @db.Uuid
  
  createdAt            DateTime      @default(now()) @map("created_at") @db.Timestamp
  
  @@unique([subscriptionId, periodNumber], name: "unique_subscription_period")
  @@index([subscriptionId], name: "idx_sub_periods_subscription")
  @@index([periodStart, periodEnd], name: "idx_sub_periods_dates")
  @@map("subscription_periods")
}
```

### ⚠️ IMPORTANTE: Atualizar Models Existentes

Você também precisa **adicionar relacionamentos** nos models existentes:

#### Atualizar model Platform:

```prisma
model Platform {
  // ... campos existentes ...
  
  // ADICIONAR estes relacionamentos:
  customers            Customer[]
  orders               Order[]
  subscriptions        Subscription[]
  transactions         Transaction[]
}
```

#### Atualizar model Product:

```prisma
model Product {
  // ... campos existentes ...
  
  // ADICIONAR estes relacionamentos:
  subscriptions        Subscription[]
  orderItems           OrderItem[]
}
```

#### Atualizar model Offer:

```prisma
model Offer {
  // ... campos existentes ...
  
  // ADICIONAR estes relacionamentos:
  subscriptions        Subscription[]
  orderItems           OrderItem[]
}
```

---

## 🔄 ETAPA 2: CRIAR MIGRATION

Após adicionar todos os models ao `schema.prisma`:

```bash
npx prisma migrate dev --name add_core_business_tables
```

**Verificar:**
- Migration foi criada em `prisma/migrations/`
- Todas as tabelas foram criadas no banco
- Todos os indexes foram criados
- Todos os constraints foram aplicados

---

## 🏗️ ETAPA 3: IMPLEMENTAR SERVICES

### 3.1 CustomersService

**Arquivo:** `src/modules/customers/customers.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async upsert(platformId: string, externalCustomerId: string, data: CreateCustomerDto) {
    return this.prisma.customer.upsert({
      where: {
        unique_platform_customer: {
          platformId,
          externalCustomerId,
        },
      },
      update: {
        email: data.email,
        name: data.name,
        phone: data.phone,
        document: data.document,
        documentType: data.documentType,
        countryCode: data.countryCode,
        state: data.state,
        city: data.city,
        metadata: data.metadata,
        lastPurchaseAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        platformId,
        externalCustomerId,
        email: data.email,
        name: data.name,
        phone: data.phone,
        document: data.document,
        documentType: data.documentType,
        countryCode: data.countryCode,
        state: data.state,
        city: data.city,
        metadata: data.metadata,
        firstPurchaseAt: new Date(),
        lastPurchaseAt: new Date(),
        totalSpentBrl: 0,
      },
    });
  }

  async findAll(query: QueryCustomersDto) {
    const { page = 1, limit = 20, platformId, email, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (platformId) where.platformId = platformId;
    if (email) where.email = { contains: email, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { document: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        include: {
          platform: true,
          _count: {
            select: {
              subscriptions: true,
              transactions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        platform: true,
        subscriptions: {
          include: {
            product: true,
            offer: true,
          },
        },
        transactions: {
          take: 10,
          orderBy: { transactionDate: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async updateTotalSpent(customerId: string, amountBrl: number) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        totalSpentBrl: {
          increment: amountBrl,
        },
        lastPurchaseAt: new Date(),
      },
    });
  }
}
```

### 3.2 SubscriptionsService

**Arquivo:** `src/modules/subscriptions/subscriptions.service.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { QuerySubscriptionsDto } from './dto/query-subscriptions.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async upsert(platformId: string, externalSubscriptionId: string, data: CreateSubscriptionDto) {
    const existingActive = await this.prisma.subscription.findFirst({
      where: {
        customerId: data.customerId,
        productId: data.productId,
        status: {
          in: ['trial_active', 'active'],
        },
        id: {
          not: data.id,
        },
      },
    });

    if (existingActive) {
      throw new BadRequestException(
        `Customer already has an active subscription for this product`
      );
    }

    return this.prisma.subscription.upsert({
      where: {
        unique_platform_subscription: {
          platformId,
          externalSubscriptionId,
        },
      },
      update: {
        status: data.status,
        isTrial: data.isTrial,
        trialStart: data.trialStart,
        trialEnd: data.trialEnd,
        trialEndsAt: data.trialEndsAt,
        recurringAmount: data.recurringAmount,
        recurringAmountBrl: data.recurringAmountBrl,
        recurringAmountUsd: data.recurringAmountUsd,
        nextBillingDate: data.nextBillingDate,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        canceledAt: data.canceledAt,
        cancellationReason: data.cancellationReason,
        platformMetadata: data.platformMetadata,
        updatedAt: new Date(),
      },
      create: {
        platformId,
        externalSubscriptionId,
        customerId: data.customerId,
        productId: data.productId,
        offerId: data.offerId,
        orderId: data.orderId,
        externalCustomerId: data.externalCustomerId,
        externalProductId: data.externalProductId,
        status: data.status,
        isTrial: data.isTrial,
        trialStart: data.trialStart,
        trialEnd: data.trialEnd,
        trialEndsAt: data.trialEndsAt,
        recurringAmount: data.recurringAmount,
        currency: data.currency,
        recurringAmountBrl: data.recurringAmountBrl,
        recurringAmountUsd: data.recurringAmountUsd,
        exchangeRate: data.exchangeRate,
        billingPeriod: data.billingPeriod,
        billingCycles: data.billingCycles,
        startDate: data.startDate,
        nextBillingDate: data.nextBillingDate,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        affiliateId: data.affiliateId,
        platformMetadata: data.platformMetadata,
      },
      include: {
        customer: true,
        product: true,
        offer: true,
        platform: true,
      },
    });
  }

  async findAll(query: QuerySubscriptionsDto) {
    const { page = 1, limit = 20, status, productId, platformId, isTrial } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (productId) where.productId = productId;
    if (platformId) where.platformId = platformId;
    if (isTrial !== undefined) where.isTrial = isTrial;

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          product: true,
          offer: true,
          platform: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        offer: true,
        platform: true,
        order: true,
        periods: {
          orderBy: { periodNumber: 'asc' },
        },
        transactionSubscriptions: {
          include: {
            transaction: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return subscription;
  }

  async cancel(id: string, dto: CancelSubscriptionDto) {
    const subscription = await this.findById(id);

    if (!['active', 'trial_active', 'past_due'].includes(subscription.status)) {
      throw new BadRequestException(
        `Cannot cancel subscription with status: ${subscription.status}`
      );
    }

    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
        cancellationReason: dto.reason,
        canceledBy: dto.canceledBy || 'user',
      },
    });
  }

  async pause(id: string) {
    const subscription = await this.findById(id);

    if (subscription.status !== 'active') {
      throw new BadRequestException('Only active subscriptions can be paused');
    }

    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'paused',
        pausedAt: new Date(),
      },
    });
  }

  async resume(id: string) {
    const subscription = await this.findById(id);

    if (subscription.status !== 'paused') {
      throw new BadRequestException('Only paused subscriptions can be resumed');
    }

    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'active',
        resumedAt: new Date(),
      },
    });
  }
}
```

### 3.3 TransactionsService

**Arquivo:** `src/modules/transactions/transactions.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        platformId: data.platformId,
        externalTransactionId: data.externalTransactionId,
        externalInvoiceId: data.externalInvoiceId,
        customerId: data.customerId,
        orderId: data.orderId,
        transactionType: data.transactionType,
        status: data.status,
        grossAmount: data.grossAmount,
        discountAmount: data.discountAmount,
        taxAmount: data.taxAmount,
        feeAmount: data.feeAmount,
        netAmount: data.netAmount,
        currency: data.currency,
        grossAmountBrl: data.grossAmountBrl,
        discountAmountBrl: data.discountAmountBrl,
        taxAmountBrl: data.taxAmountBrl,
        feeAmountBrl: data.feeAmountBrl,
        netAmountBrl: data.netAmountBrl,
        grossAmountUsd: data.grossAmountUsd,
        discountAmountUsd: data.discountAmountUsd,
        taxAmountUsd: data.taxAmountUsd,
        feeAmountUsd: data.feeAmountUsd,
        netAmountUsd: data.netAmountUsd,
        exchangeRate: data.exchangeRate,
        paymentMethod: data.paymentMethod,
        paymentMethodDetails: data.paymentMethodDetails,
        failureCode: data.failureCode,
        failureMessage: data.failureMessage,
        platformMetadata: data.platformMetadata,
        transactionDate: data.transactionDate,
      },
      include: {
        customer: true,
        platform: true,
        order: true,
      },
    });
  }

  async linkToSubscription(transactionId: string, subscriptionId: string, amountAllocatedBrl: number) {
    return this.prisma.transactionSubscription.create({
      data: {
        transactionId,
        subscriptionId,
        amountAllocatedBrl,
      },
    });
  }

  async findAll(query: QueryTransactionsDto) {
    const { page = 1, limit = 20, status, transactionType, platformId, customerId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (transactionType) where.transactionType = transactionType;
    if (platformId) where.platformId = platformId;
    if (customerId) where.customerId = customerId;

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          platform: true,
          order: true,
        },
        orderBy: { transactionDate: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        platform: true,
        order: {
          include: {
            items: true,
          },
        },
        transactionSubscriptions: {
          include: {
            subscription: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }
}
```

### 3.4 OrdersService

**Arquivo:** `src/modules/orders/orders.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateOrderDto) {
    return this.prisma.order.create({
      data: {
        platformId: data.platformId,
        externalOrderId: data.externalOrderId,
        customerId: data.customerId,
        subtotalAmount: data.subtotalAmount,
        discountAmount: data.discountAmount,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        currency: data.currency,
        subtotalAmountBrl: data.subtotalAmountBrl,
        discountAmountBrl: data.discountAmountBrl,
        taxAmountBrl: data.taxAmountBrl,
        totalAmountBrl: data.totalAmountBrl,
        subtotalAmountUsd: data.subtotalAmountUsd,
        discountAmountUsd: data.discountAmountUsd,
        taxAmountUsd: data.taxAmountUsd,
        totalAmountUsd: data.totalAmountUsd,
        exchangeRate: data.exchangeRate,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmTerm: data.utmTerm,
        utmContent: data.utmContent,
        referrerUrl: data.referrerUrl,
        landingPageUrl: data.landingPageUrl,
        affiliateId: data.affiliateId,
        couponCode: data.couponCode,
        status: data.status,
        platformMetadata: data.platformMetadata,
        orderDate: data.orderDate,
        completedAt: data.completedAt,
        items: {
          create: data.items,
        },
      },
      include: {
        customer: true,
        platform: true,
        items: {
          include: {
            product: true,
            offer: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        platform: true,
        items: {
          include: {
            product: true,
            offer: true,
          },
        },
        subscriptions: true,
        transactions: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }
}
```

---

## 🔌 ETAPA 4: INTEGRAR COM WEBHOOKPROCESSOR

### Atualizar: `src/modules/integrations/webhooks/webhook.processor.ts`

**CRÍTICO:** Remover todos os `console.log('TODO: Save to database')` e implementar a persistência real.

```typescript
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { WebhookEventsService } from './webhook-events.service';
import { PaymentProviderFactory } from '../providers/payment-provider.factory';
import { CustomersService } from '../../customers/customers.service';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { OrdersService } from '../../orders/orders.service';

interface WebhookJobData {
  webhookEventId: string;
  platformSlug: string;
}

@Processor('webhooks')
@Injectable()
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private webhookEventsService: WebhookEventsService,
    private providerFactory: PaymentProviderFactory,
    private customersService: CustomersService,
    private subscriptionsService: SubscriptionsService,
    private transactionsService: TransactionsService,
    private ordersService: OrdersService,
  ) {}

  @Process()
  async processWebhook(job: Job<WebhookJobData>) {
    const { webhookEventId, platformSlug } = job.data;

    this.logger.log(`Processing webhook event ${webhookEventId} from ${platformSlug}`);

    try {
      await this.webhookEventsService.updateStatus(webhookEventId, 'processing');

      const webhookEvent = await this.webhookEventsService.findById(webhookEventId);
      const provider = this.providerFactory.getProvider(platformSlug);

      const normalizedData = await provider.normalizeWebhookPayload(
        webhookEvent.payload,
        webhookEvent.eventType,
      );

      await this.persistData(normalizedData, webhookEvent.platformId);

      await this.webhookEventsService.updateStatus(webhookEventId, 'processed', null, new Date());

      this.logger.log(`Successfully processed webhook event ${webhookEventId}`);
    } catch (error) {
      this.logger.error(`Error processing webhook ${webhookEventId}: ${error.message}`, error.stack);

      await this.webhookEventsService.updateStatus(
        webhookEventId,
        'failed',
        error.message,
        new Date(),
      );

      throw error;
    }
  }

  private async persistData(normalizedData: any, platformId: string) {
    if (normalizedData.customer) {
      const customer = await this.customersService.upsert(
        platformId,
        normalizedData.customer.externalCustomerId,
        {
          email: normalizedData.customer.email,
          name: normalizedData.customer.name,
          phone: normalizedData.customer.phone,
          document: normalizedData.customer.document,
          documentType: normalizedData.customer.documentType,
          countryCode: normalizedData.customer.countryCode,
          state: normalizedData.customer.state,
          city: normalizedData.customer.city,
          metadata: normalizedData.customer.metadata,
        },
      );

      normalizedData.customer.id = customer.id;
    }

    if (normalizedData.subscription) {
      const subscription = await this.subscriptionsService.upsert(
        platformId,
        normalizedData.subscription.externalSubscriptionId,
        {
          ...normalizedData.subscription,
          customerId: normalizedData.customer.id,
          platformId,
        },
      );

      normalizedData.subscription.id = subscription.id;
    }

    if (normalizedData.transaction) {
      const transaction = await this.transactionsService.create({
        ...normalizedData.transaction,
        customerId: normalizedData.customer.id,
        platformId,
        orderId: normalizedData.order?.id,
      });

      if (normalizedData.subscription?.id) {
        await this.transactionsService.linkToSubscription(
          transaction.id,
          normalizedData.subscription.id,
          transaction.netAmountBrl,
        );
      }

      if (transaction.status === 'succeeded' && transaction.transactionType !== 'refund') {
        await this.customersService.updateTotalSpent(
          normalizedData.customer.id,
          Number(transaction.netAmountBrl),
        );
      }
    }

    if (normalizedData.order && !normalizedData.order.id) {
      await this.ordersService.create({
        ...normalizedData.order,
        customerId: normalizedData.customer.id,
        platformId,
      });
    }
  }
}
```

---

## 🎮 ETAPA 5: IMPLEMENTAR CONTROLLERS

### 5.1 CustomersController

**Arquivo:** `src/modules/customers/customers.controller.ts`

```typescript
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'List all customers with pagination' })
  async findAll(@Query() query: QueryCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'Get customer by ID with subscriptions and transactions' })
  async findOne(@Param('id') id: string) {
    return this.customersService.findById(id);
  }
}
```

### 5.2 SubscriptionsController

**Arquivo:** `src/modules/subscriptions/subscriptions.controller.ts`

```typescript
import { Controller, Get, Param, Patch, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { QuerySubscriptionsDto } from './dto/query-subscriptions.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get()
  @RequirePermissions('subscriptions:read')
  @ApiOperation({ summary: 'List all subscriptions with filters' })
  async findAll(@Query() query: QuerySubscriptionsDto) {
    return this.subscriptionsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('subscriptions:read')
  @ApiOperation({ summary: 'Get subscription by ID with full details' })
  async findOne(@Param('id') id: string) {
    return this.subscriptionsService.findById(id);
  }

  @Patch(':id/cancel')
  @RequirePermissions('subscriptions:manage')
  @ApiOperation({ summary: 'Cancel an active subscription' })
  async cancel(@Param('id') id: string, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptionsService.cancel(id, dto);
  }

  @Patch(':id/pause')
  @RequirePermissions('subscriptions:manage')
  @ApiOperation({ summary: 'Pause an active subscription' })
  async pause(@Param('id') id: string) {
    return this.subscriptionsService.pause(id);
  }

  @Patch(':id/resume')
  @RequirePermissions('subscriptions:manage')
  @ApiOperation({ summary: 'Resume a paused subscription' })
  async resume(@Param('id') id: string) {
    return this.subscriptionsService.resume(id);
  }
}
```

### 5.3 TransactionsController

**Arquivo:** `src/modules/transactions/transactions.controller.ts`

```typescript
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  @RequirePermissions('transactions:read')
  @ApiOperation({ summary: 'List all transactions with filters' })
  async findAll(@Query() query: QueryTransactionsDto) {
    return this.transactionsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('transactions:read')
  @ApiOperation({ summary: 'Get transaction by ID with full details' })
  async findOne(@Param('id') id: string) {
    return this.transactionsService.findById(id);
  }
}
```

---

## 📝 ETAPA 6: CRIAR DTOs

### Exemplo: CreateCustomerDto

**Arquivo:** `src/modules/customers/dto/create-customer.dto.ts`

```typescript
import { IsString, IsEmail, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'cus_stripe_123' })
  @IsString()
  externalCustomerId: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '12345678900' })
  @IsString()
  @IsOptional()
  document?: string;

  @ApiPropertyOptional({ example: 'cpf' })
  @IsString()
  @IsOptional()
  documentType?: string;

  @ApiPropertyOptional({ example: 'BR' })
  @IsString()
  @IsOptional()
  countryCode?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: any;
}
```

### Exemplo: QueryCustomersDto

**Arquivo:** `src/modules/customers/dto/query-customers.dto.ts`

```typescript
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryCustomersDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  platformId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
```

**IMPORTANTE:** Criar todos os DTOs necessários seguindo este mesmo padrão para:
- Subscriptions (create, query, cancel)
- Transactions (create, query)
- Orders (create, query)

---

## 🌱 ETAPA 7: SEEDS

### Atualizar: `prisma/seed.ts`

Adicionar seeds de teste para as novas entidades:

```typescript
async function seedCustomers(prisma: PrismaService) {
  const stripe = await prisma.platform.findFirst({ where: { slug: 'stripe' } });
  
  await prisma.customer.upsert({
    where: {
      unique_platform_customer: {
        platformId: stripe.id,
        externalCustomerId: 'cus_test_123',
      },
    },
    update: {},
    create: {
      platformId: stripe.id,
      externalCustomerId: 'cus_test_123',
      email: 'john.doe@example.com',
      name: 'John Doe',
      phone: '+5511999999999',
      document: '12345678900',
      documentType: 'cpf',
      countryCode: 'BR',
      state: 'SP',
      city: 'São Paulo',
      firstPurchaseAt: new Date(),
      lastPurchaseAt: new Date(),
      totalSpentBrl: 97.00,
    },
  });
}

async function seedSubscriptions(prisma: PrismaService) {
  const customer = await prisma.customer.findFirst();
  const product = await prisma.product.findFirst();
  const platform = await prisma.platform.findFirst({ where: { slug: 'stripe' } });

  await prisma.subscription.upsert({
    where: {
      unique_platform_subscription: {
        platformId: platform.id,
        externalSubscriptionId: 'sub_test_123',
      },
    },
    update: {},
    create: {
      platformId: platform.id,
      externalSubscriptionId: 'sub_test_123',
      customerId: customer.id,
      productId: product.id,
      externalCustomerId: customer.externalCustomerId,
      externalProductId: 'prod_test_123',
      status: 'active',
      isTrial: false,
      recurringAmount: 29.90,
      currency: 'BRL',
      recurringAmountBrl: 29.90,
      recurringAmountUsd: 5.98,
      exchangeRate: 5.00,
      billingPeriod: 'month',
      startDate: new Date(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}
```

---

## 📚 ETAPA 8: DOCUMENTAÇÃO

### Atualizar Swagger

Todos os endpoints devem estar documentados com:
- `@ApiTags()`
- `@ApiOperation()`
- `@ApiBearerAuth()`
- `@ApiProperty()` nos DTOs

### Atualizar Postman Collection

Adicionar novos requests para:
- **Customers:**
  - GET /customers (listar)
  - GET /customers/:id (detalhes)
  
- **Subscriptions:**
  - GET /subscriptions (listar)
  - GET /subscriptions/:id (detalhes)
  - PATCH /subscriptions/:id/cancel
  - PATCH /subscriptions/:id/pause
  - PATCH /subscriptions/:id/resume
  
- **Transactions:**
  - GET /transactions (listar)
  - GET /transactions/:id (detalhes)

### Atualizar development_guide.md

Marcar a Fase 4 como completa e documentar:
- Tabelas criadas
- Endpoints disponíveis
- Fluxo de dados webhook → persistência
- Exemplos de uso

---

## ✅ CHECKLIST FINAL

Antes de considerar a Fase 4 completa, verificar:

- [ ] ✅ Schema Prisma com 7 models criados
- [ ] ✅ Migration aplicada com sucesso
- [ ] ✅ CustomersService implementado com upsert
- [ ] ✅ SubscriptionsService implementado
- [ ] ✅ TransactionsService implementado
- [ ] ✅ OrdersService implementado
- [ ] ✅ WebhookProcessor atualizado (sem TODOs)
- [ ] ✅ Controllers com endpoints REST
- [ ] ✅ DTOs com validações
- [ ] ✅ Seeds de teste funcionando
- [ ] ✅ Swagger atualizado
- [ ] ✅ Postman collection atualizada
- [ ] ✅ Testar webhook end-to-end (dados salvos no banco)
- [ ] ✅ Verificar idempotência (reenviar webhook não duplica)
- [ ] ✅ Validar relacionamentos (customer → subscriptions → transactions)

---

## 🚨 PONTOS CRÍTICOS DE ATENÇÃO

### 1. Não Duplicar Clientes
```typescript
// SEMPRE usar upsert baseado em platform + externalCustomerId
await prisma.customer.upsert({
  where: {
    unique_platform_customer: {
      platformId,
      externalCustomerId,
    },
  },
  // ...
});
```

### 2. Validar Subscription Duplicada
```typescript
// Cliente NÃO pode ter 2 subscriptions ativas do MESMO produto
const existingActive = await prisma.subscription.findFirst({
  where: {
    customerId: data.customerId,
    productId: data.productId,
    status: { in: ['trial_active', 'active'] },
  },
});

if (existingActive) {
  throw new BadRequestException('Customer already has an active subscription');
}
```

### 3. Valores Sempre em 3 Moedas
```typescript
// NUNCA esquecer de converter para BRL e USD
{
  recurringAmount: 29.90,
  currency: 'BRL',
  recurringAmountBrl: 29.90,
  recurringAmountUsd: 5.98,
  exchangeRate: 5.00,
}
```

### 4. Atualizar Customer Stats
```typescript
// Sempre que houver uma transaction succeeded
await customersService.updateTotalSpent(customerId, netAmountBrl);
```

### 5. Linking Transaction ↔ Subscription
```typescript
// Uma transaction pode renovar múltiplas subscriptions
await transactionsService.linkToSubscription(
  transactionId,
  subscriptionId,
  amountAllocatedBrl
);
```

---

## 🎯 ORDEM DE EXECUÇÃO RECOMENDADA

1. **Etapa 1:** Schema Prisma (adicionar 7 models)
2. **Etapa 2:** Migration (criar e aplicar)
3. **Etapa 3:** Services (implementar lógica)
4. **Etapa 4:** Integrar WebhookProcessor
5. **Etapa 5:** Controllers (endpoints REST)
6. **Etapa 6:** DTOs (validações)
7. **Etapa 7:** Seeds (dados de teste)
8. **Etapa 8:** Documentação (Swagger + Postman)

---

## 📞 SUCESSO DA IMPLEMENTAÇÃO

Ao final, você deve conseguir:

1. **Receber um webhook** (Stripe, Hotmart ou Cartpanda)
2. **Ver os dados salvos** em `customers`, `subscriptions`, `transactions`
3. **Consultar via API REST** os dados salvos
4. **Cancelar/pausar subscriptions** via endpoints
5. **Ver relacionamentos** funcionando (customer → subs → trans)

---

## 🏁 PRÓXIMOS PASSOS (FASE 5)

Após completar a Fase 4, a próxima fase será:

**Fase 5: Analytics & Metrics**
- Cálculo de MRR, ARR, Churn, LTV
- Tabela de métricas pré-computadas (daily_metrics)
- Dashboard com KPIs em tempo real
- Análise de coortes

Mas isso é para DEPOIS da Fase 4 estar 100% completa! 🎯

---

**BOA SORTE NA IMPLEMENTAÇÃO! 🚀**

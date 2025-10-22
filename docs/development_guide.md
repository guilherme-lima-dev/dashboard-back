# 📚 Guia Completo de Desenvolvimento - Analytics Platform

## 📋 Índice

1. [Visão Geral do Projeto](#visão-geral-do-projeto)
2. [Decisões Arquiteturais Críticas](#decisões-arquiteturais-críticas)
3. [Estrutura do Monolito Modular](#estrutura-do-monolito-modular)
4. [Fases de Desenvolvimento Detalhadas](#fases-de-desenvolvimento-detalhadas)
5. [Convenções e Padrões do Projeto](#convenções-e-padrões-do-projeto)
6. [Regras de Negócio Fundamentais](#regras-de-negócio-fundamentais)
7. [Sistema de Permissões (RBAC)](#sistema-de-permissões-rbac)
8. [Integrações e Strategy Pattern](#integrações-e-strategy-pattern)
9. [Métricas e Performance](#métricas-e-performance)
10. [Audit e Compliance](#audit-e-compliance)
11. [Estado Atual do Projeto](#estado-atual-do-projeto)
12. [Próximos Passos](#próximos-passos)

---

## Visão Geral do Projeto

### Objetivo Principal

Construir uma plataforma de analytics de assinaturas que consolida dados de múltiplos provedores de pagamento (Stripe, Hotmart, Cartpanda, futuramente App Store) para fornecer insights em tempo real sobre:

- **MRR (Monthly Recurring Revenue)** - Receita recorrente mensal
- **ARR (Annual Recurring Revenue)** - Receita anualizada
- **Churn Rate** - Taxa de cancelamento
- **LTV (Lifetime Value)** - Valor médio por cliente
- **Trial Conversion Rate** - Taxa de conversão de trials
- **CAC (Customer Acquisition Cost)** - Custo de aquisição
- **Análise de Coortes** - Retenção por período
- **Performance de Afiliados** - ROI de marketing

### Contexto de Uso

- **Tipo:** Sistema interno (não multi-tenant)
- **Usuários:** Equipe da empresa (admins, analistas, marketing)
- **Volume Atual:** ~5.000 vendas/dia
- **Volume Esperado:** Sistema deve suportar 50k vendas/dia sem mudanças arquiteturais

### Premissas Críticas

⚠️ **MANDATORY (conforme documentação):**

1. ❌ **Sem MVP** - Sistema completo de produção desde o dia 1
2. ✅ **3 Plataformas obrigatórias** - Stripe, Hotmart e Cartpanda devem funcionar no launch
3. ✅ **Testes automatizados** - 90%+ de cobertura em cálculos críticos
4. ✅ **Migrações incrementais** - Schema construído fase por fase
5. ✅ **Código em inglês** - Variáveis, funções, commits, documentação
6. ✅ **UI em português (BR)** - Todo texto visível ao usuário
7. ✅ **Sistema de audit completo** - Rastreamento de operações críticas
8. ✅ **Tracking de afiliados** - Para análise de ROI de marketing

### Fora do Escopo (Versão Inicial)

- ❌ App Store (Apple) - fase futura
- ❌ Multi-tenant - uso único da empresa
- ❌ Mobile apps - apenas web
- ❌ Gestão de cupons - apenas tracking de cupons recebidos
- ❌ Pagamentos de afiliados - apenas tracking de performance

---

## Decisões Arquiteturais Críticas

### 1. Monolito Modular vs Microservices

**Decisão:** Iniciar com monolito modular.

**Justificativa Técnica:**

| Aspecto | Monolito Modular | Microservices |
|---------|------------------|---------------|
| **Desenvolvimento** | ✅ 3-4x mais rápido | ❌ Complexidade de distribuição |
| **Debugging** | ✅ Stack trace completo | ❌ Logs distribuídos |
| **Transações** | ✅ ACID nativo | ❌ Saga Pattern/2PC |
| **Latência** | ✅ In-process calls | ❌ Network overhead |
| **Custo** | ✅ 1 servidor | ❌ N servidores + service mesh |
| **Para 5k/day** | ✅ **IDEAL** | ❌ Over-engineering |

**Quando migrar:**
- Volume > 50k vendas/dia
- Módulos específicos precisam escalar independentemente
- Múltiplos times trabalhando simultaneamente

**Estrutura Preparada para Extração:**
```
Cada módulo é autocontido com:
- Imports explícitos (dependências claras)
- Exports bem definidos (interface pública)
- Event-driven interno (EventEmitter + BullMQ)

Migração futura = Adicionar MessagePattern + Deploy separado
```

### 2. Strategy Pattern para Payment Providers

**Problema:** Precisamos suportar 3+ plataformas diferentes sem criar acoplamento.

**Solução:** Interface comum + Factory Pattern.

**Interface Base:**
```typescript
interface IPaymentProvider {
  readonly name: string;        // "Stripe"
  readonly slug: string;        // "stripe"
  
  // Métodos de sincronização
  fetchSubscriptions(params: FetchParams): Promise<NormalizedSubscription[]>;
  fetchTransactions(params: FetchParams): Promise<NormalizedTransaction[]>;
  fetchCustomer(customerId: string): Promise<NormalizedCustomer>;
  fetchAffiliate(affiliateId: string): Promise<NormalizedAffiliate>;
  
  // Métodos de webhook
  validateWebhook(signature: string, payload: any): boolean;
  normalizeWebhook(payload: any): WebhookEvent;
  
  // Utilidades
  testConnection(): Promise<boolean>;
}
```

**Factory Pattern:**
```typescript
class PaymentProviderFactory {
  private providers = new Map<string, IPaymentProvider>();
  
  register(provider: IPaymentProvider) {
    this.providers.set(provider.slug, provider);
  }
  
  getProvider(slug: string): IPaymentProvider {
    const provider = this.providers.get(slug);
    if (!provider) throw new Error(`Provider ${slug} not found`);
    return provider;
  }
}
```

**Benefícios:**
- ✅ Adicionar novo provider = ~500 linhas isoladas
- ✅ Remover provider = apenas unregister
- ✅ Testes isolados = mock da interface
- ✅ Zero acoplamento entre providers

### 3. Pre-computed Metrics

**Problema:** Queries complexas são lentas (MRR com filtros > 5 segundos).

**Solução:** Calcular métricas em background e armazenar em `daily_metrics`.

**Fluxo de Dados:**
```
1. Webhook chega
   ↓
2. Salvar dados transacionais (subscriptions, transactions, customers)
   ↓
3. Enfileirar job: "metrics-calculator"
   ↓
4. Worker processa e atualiza daily_metrics
   ↓
5. Dashboard consulta daily_metrics (< 200ms)
```

**Comparação:**

**Sem pré-computação (LENTO):**
```sql
SELECT 
  SUM(recurring_amount_brl) as mrr,
  COUNT(*) as active_subs,
  (SELECT COUNT(*) FROM subscriptions WHERE canceled_at >= :start) as churned
FROM subscriptions 
WHERE status = 'active' 
  AND is_trial = false
  AND current_period_end >= CURRENT_DATE
  AND platform_id = :platform
  AND product_id = :product
-- Query time: 5-10 segundos
```

**Com pré-computação (RÁPIDO):**
```sql
SELECT mrr_brl, active_subscriptions_count, churn_count
FROM daily_metrics
WHERE metric_date = CURRENT_DATE
  AND product_id = :product
  AND platform_id = :platform
-- Query time: < 200ms
```

**Trade-offs:**
- ✅ Dashboard instantâneo (< 200ms)
- ✅ Consultas complexas viáveis
- ⚠️ Latência aceitável (~30 segundos após evento)
- ⚠️ Storage adicional (~1GB/ano)

**Estratégia de Refresh:**
- **On webhook:** Recalcular métricas afetadas (async)
- **Nightly:** Recalcular todas as métricas (validação)
- **On demand:** Admin pode forçar recálculo

### 4. Migrações Incrementais

**Decisão:** NÃO criar schema completo de uma vez.

**Anti-pattern (NÃO FAZER):**
```bash
# ❌ ERRADO
npx prisma migrate dev --name init_all_tables
# (cria 40 tabelas de uma vez)
```

**Pattern Correto (FAZER):**
```bash
# ✅ CORRETO - Por fase
npx prisma migrate dev --name init_auth_system          # Fase 1
npx prisma migrate dev --name add_products_catalog      # Fase 2
npx prisma migrate dev --name add_integrations          # Fase 3
```

**Benefícios:**
- ✅ Revisão de código mais fácil (PRs menores)
- ✅ Rollback granular (desfazer fase específica)
- ✅ Testes progressivos (validar cada fase)
- ✅ Git history claro (evolução do schema)

### 5. Workers no Mesmo Container (Inicial)

**Decisão:** BullMQ workers rodam no mesmo processo que a API.

**Arquitetura Atual:**
```
ECS Task (Fargate)
├── NestJS API (HTTP port 4000)
└── BullMQ Workers (mesma instância)
    ├── webhook-processor
    ├── metrics-calculator
    ├── sync-validator
    └── audit-alert-processor
```

**Justificativa:**
- ✅ Deploy mais simples (1 container)
- ✅ Menor custo (não precisa de tasks separados)
- ✅ Suficiente para 5k sales/day (~3.5 webhooks/min)
- ✅ Fácil separar depois se necessário

**Quando Separar:**
- Processamento de webhook > 5s consistentemente
- Workers afetando latência da API
- Volume > 50k sales/day
- Workers precisam escalar independentemente

### 6. Multi-Currency Storage

**Decisão:** Armazenar valores em moeda original + BRL + USD.

**Estrutura:**
```typescript
{
  amount: 9.99,              // Valor original
  currency: 'USD',           // Moeda original
  amount_brl: 54.23,         // Convertido para BRL
  amount_usd: 9.99,          // Convertido para USD
  exchange_rate: 5.43        // Taxa usada
}
```

**Fluxo de Conversão:**
```
1. Webhook com $9.99 USD
   ↓
2. Verificar cache Redis (TTL 15min) para taxa USD→BRL
   ↓
3. Se não cached: Buscar de Exchange Rate API → Cache
   ↓
4. Converter: $9.99 × 5.43 = R$54.23
   ↓
5. Salvar tudo: original + conversões + taxa
```

**Benefícios:**
- ✅ Dashboard pode alternar moeda sem API calls
- ✅ Taxa histórica preservada (não muda)
- ✅ Relatórios consistentes ao longo do tempo
- ✅ Performance (sem conversão on-the-fly)

---

## Estrutura do Monolito Modular

### Organização de Diretórios

```
src/
├── modules/                    # Módulos de negócio
│   ├── auth/                   # Autenticação e JWT
│   ├── users/                  # Gestão de usuários
│   ├── permissions/            # RBAC dinâmico
│   ├── platforms/              # Plataformas de pagamento
│   ├── products/               # Catálogo de produtos
│   ├── offers/                 # Ofertas e preços
│   ├── integrations/           # Webhooks e sync
│   │   ├── credentials/        # Armazenamento de credenciais
│   │   ├── webhooks/           # Recebimento de eventos
│   │   ├── providers/          # Strategy Pattern (Stripe, Hotmart, etc)
│   │   └── sync/               # Sincronização periódica
│   ├── customers/              # Clientes
│   ├── orders/                 # Pedidos
│   ├── subscriptions/          # Assinaturas
│   ├── transactions/           # Transações financeiras
│   ├── affiliates/             # Sistema de afiliados
│   ├── analytics/              # Métricas e dashboards
│   │   ├── metrics/            # Cálculo de métricas
│   │   ├── ltv/                # Lifetime Value
│   │   ├── cohort/             # Análise de coorte
│   │   └── marketing/          # Marketing spend
│   └── audit/                  # Sistema de auditoria
│       └── alerts/             # Alertas automáticos
│
├── common/                     # Código compartilhado
│   ├── decorators/             # @Public, @CurrentUser, @RequirePermission
│   ├── guards/                 # JwtAuthGuard, PermissionsGuard
│   ├── filters/                # Exception handling
│   ├── interceptors/           # Logging, Transform
│   ├── pipes/                  # Validation
│   └── interfaces/             # Types compartilhados
│
├── config/                     # Configurações
│   ├── database.config.ts
│   ├── redis.config.ts
│   ├── jwt.config.ts
│   └── providers.config.ts
│
├── jobs/                       # BullMQ workers
│   ├── processors/             # Lógica dos jobs
│   └── queues/                 # Definição de filas
│
├── prisma/                     # Database
│   ├── prisma.service.ts
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── app.module.ts               # Módulo raiz
└── main.ts                     # Bootstrap
```

### Princípios de Modularização

**Cada módulo deve ser:**

1. **Autocontido:**
  - Toda lógica relacionada em um lugar
  - DTOs, services, controllers juntos
  - Dependências explícitas via imports

2. **Com interface clara:**
   ```typescript
   @Module({
     imports: [CustomersModule],      // Dependências
     providers: [SubscriptionsService],
     exports: [SubscriptionsService]  // O que expõe
   })
   ```

3. **Independente:**
  - Não acessar diretamente outro módulo
  - Comunicação via serviços exportados
  - Eventos para ações assíncronas

4. **Testável:**
  - Services mockáveis
  - Testes unitários isolados
  - Testes de integração por módulo

### Comunicação Entre Módulos

**Síncrona (Direct Call):**
```typescript
// subscriptions.service.ts
constructor(
  private customersService: CustomersService,  // Injeção de dependência
  private productsService: ProductsService
) {}

async create(dto: CreateSubscriptionDto) {
  const customer = await this.customersService.findOne(dto.customerId);
  const product = await this.productsService.findOne(dto.productId);
  // ...
}
```

**Assíncrona (Event Emitter):**
```typescript
// subscriptions.service.ts
constructor(
  private eventEmitter: EventEmitter2
) {}

async cancel(id: string) {
  const subscription = await this.update(id, { status: 'canceled' });
  
  // Emitir evento para outros módulos
  this.eventEmitter.emit('subscription.canceled', {
    subscriptionId: id,
    customerId: subscription.customerId,
    revenue: subscription.recurringAmountBrl
  });
}

// analytics.service.ts - em outro módulo
@OnEvent('subscription.canceled')
handleSubscriptionCanceled(payload: any) {
  // Recalcular métricas de churn
}
```

**Background Jobs (BullMQ):**
```typescript
// subscriptions.service.ts
constructor(
  @InjectQueue('metrics') private metricsQueue: Queue
) {}

async create(dto: CreateSubscriptionDto) {
  const subscription = await this.prisma.subscription.create({...});
  
  // Enfileirar cálculo de métricas
  await this.metricsQueue.add('calculate-mrr', {
    date: new Date(),
    productId: subscription.productId
  });
}
```

---

## Fases de Desenvolvimento Detalhadas

### Timeline Geral

| Fase | Descrição | Duração | Prioridade | Status |
|------|-----------|---------|------------|--------|
| **Phase 1** | Auth & RBAC | 1 semana | 🔴 Crítica | ✅ **COMPLETO** |
| **Phase 2** | Products Catalog | 1 semana | 🔴 Crítica | ⏳ Próxima |
| **Phase 3** | Integration Infrastructure | 1 semana | 🔴 Crítica | ⏳ Pendente |
| **Phase 4** | Core Business | 2 semanas | 🔴 Crítica | ⏳ Pendente |
| **Phase 5** | Analytics & Metrics | 2 semanas | 🟡 Alta | ⏳ Pendente |
| **Phase 6** | Affiliates System | 1-2 semanas | 🟡 Alta | ⏳ Pendente |
| **Phase 7** | Audit System | 1 semana | 🟡 Alta | ⏳ Pendente |

---

## Phase 1: Authentication & Authorization (✅ COMPLETO)

### Objetivos Alcançados

✅ Sistema JWT com access + refresh tokens  
✅ RBAC dinâmico (Resources, Actions, Permissions, Roles)  
✅ Guards globais automatizando proteção  
✅ Decorators para facilitar uso (@Public, @RequirePermission, @CurrentUser)  
✅ Audit logs de permissões  
✅ Seed com dados iniciais (3 roles, 78 permissions, 1 super admin)

### Tabelas Criadas

| Tabela | Propósito | Registros Iniciais |
|--------|-----------|-------------------|
| `users` | Usuários do sistema | 1 (admin@analytics.com) |
| `roles` | Papéis | 3 (Super Admin, Admin, Analyst) |
| `resources` | Recursos do sistema | 13 (dashboard, users, products, etc) |
| `actions` | Ações permitidas | 6 (create, read, update, delete, export, manage) |
| `permissions` | Resource × Action | 78 combinações |
| `role_permissions` | Permissões por role | Configurado para 3 roles |
| `user_roles` | Roles por usuário | 1 (admin = Super Admin) |
| `refresh_tokens` | Tokens de refresh | 0 (criados no login) |
| `permission_audit_logs` | Logs de acesso | 0 (populado em uso) |

### Hierarquia de Permissões

```
Resource (ex: "users")
    ├── Action: create  → Permission: "users:create"
    ├── Action: read    → Permission: "users:read"
    ├── Action: update  → Permission: "users:update"
    ├── Action: delete  → Permission: "users:delete"
    ├── Action: export  → Permission: "users:export"
    └── Action: manage  → Permission: "users:manage"
```

### Roles Padrão

**Super Admin:**
- **Permissões:** TODAS (78)
- **Descrição:** Acesso total ao sistema
- **Casos de uso:** Founders, CTO

**Admin:**
- **Permissões:** Todas EXCETO gestão de roles/permissions/audit-logs
- **Descrição:** Administrador operacional
- **Casos de uso:** COO, Head of Operations

**Analyst:**
- **Permissões:** Apenas `read` e `export` em todos os recursos
- **Descrição:** Somente leitura para análise
- **Casos de uso:** Analistas de dados, Marketing

### Como Funciona o Sistema de Autenticação

**1. Registro de Usuário:**
```
POST /auth/register
{
  "email": "novo@empresa.com",
  "fullName": "João Silva",
  "password": "Senha@123"
}

→ Cria usuário com status "pending_approval"
→ Admin precisa aprovar antes do primeiro login
```

**2. Login:**
```
POST /auth/login
{
  "email": "admin@analytics.com",
  "password": "Admin@123"
}

→ Valida credenciais
→ Verifica se usuário está ativo
→ Carrega roles e permissions do usuário
→ Gera access token (15min) + refresh token (7 days)
→ Retorna: { user, accessToken, refreshToken, expiresIn }
```

**3. Acesso a Rota Protegida:**
```
GET /subscriptions
Authorization: Bearer {accessToken}

→ JwtAuthGuard valida o token
→ JwtStrategy extrai payload e valida usuário
→ Request.user recebe: { userId, email, permissions, roles }
→ PermissionsGuard verifica se user.permissions contém permissão necessária
→ Se autorizado: processa request
→ Se não: HTTP 403 Forbidden
```

**4. Renovação de Token:**
```
POST /auth/refresh
{
  "refreshToken": "{refreshToken}"
}

→ Valida refresh token (não revogado, não expirado)
→ Revoga token antigo
→ Gera novo access + refresh token
→ Retorna novos tokens
```

### Guards Aplicados Globalmente

**Localização:** `src/common/guards/`

**Por que em `common/` e não em `modules/auth/`?**
- Guards registrados como `APP_GUARD` são infraestrutura global
- Padrão do NestJS para guards/filters/interceptors globais
- Evita dependência circular quando outros módulos importam

**JwtAuthGuard:**
```typescript
// Protege TODAS as rotas por padrão
// Rotas públicas usam @Public()

@Public()  // ← Desativa guard para esta rota
@Post('login')
async login() { }

@Get('profile')  // ← Protegida automaticamente
async getProfile() { }
```

**PermissionsGuard:**
```typescript
// Valida permissões específicas quando decorator usado

@RequirePermission('users:create')
@Post('users')
async createUser() { }

@RequirePermission('users:delete', 'users:manage')  // OR logic
@Delete('users/:id')
async deleteUser() { }
```

### Decorators Disponíveis

**@Public()** - Desabilita JwtAuthGuard
```typescript
@Public()
@Get('health')
checkHealth() {
  return { status: 'ok' };
}
```

**@CurrentUser()** - Acessa usuário autenticado
```typescript
@Get('me')
getProfile(@CurrentUser() user: any) {
  return { id: user.userId, email: user.email };
}

@Get('my-data')
getData(@CurrentUser('userId') userId: string) {
  return this.service.getUserData(userId);
}
```

**@RequirePermission()** - Valida permissões
```typescript
@RequirePermission('products:create')
@Post('products')
createProduct() { }

// Múltiplas permissões (OR)
@RequirePermission('products:update', 'products:manage')
@Patch('products/:id')
updateProduct() { }
```

### Fluxo de Aprovação de Usuários

```
1. Usuário se registra
   ↓
2. Status = "pending_approval"
   ↓
3. Admin acessa /users e vê lista de pending
   ↓
4. Admin aprova: PATCH /users/:id { status: "active" }
   ↓
5. Usuário pode fazer login
```

**Nota:** Sistema de notificação (email ao aprovar) está fora do escopo inicial.

### Segurança Implementada

**Passwords:**
- Hash: bcrypt com 10 rounds
- Validação: mínimo 8 caracteres, maiúscula, minúscula, número, especial

**JWT:**
- Access Token: 15 minutos de validade
- Refresh Token: 7 dias de validade
- Secret keys diferentes para cada tipo
- Refresh tokens podem ser revogados manualmente

**Rate Limiting:**
- 100 requisições/minuto por IP
- Implementado via @nestjs/throttler

**Audit:**
- Logs de login/logout
- Logs de mudanças de permissões
- Rastreamento por IP e User-Agent

---

## Phase 2: Products Catalog (⏳ PRÓXIMA FASE)

### Objetivos

Criar estrutura para gerenciar:
- **Plataformas** (Stripe, Hotmart, Cartpanda)
- **Produtos** (Holymind, Holyguide, etc)
- **Ofertas** (Monthly, Annual, Lifetime, etc)
- **Mapeamentos** (como cada oferta se chama em cada plataforma)

### Conceitos-Chave

**Produto:**
- Representa o app/serviço vendido
- Exemplo: "Holymind", "Holyguide"
- Pode ter múltiplas ofertas

**Oferta:**
- Variação de preço/billing de um produto
- Exemplo: "Monthly $29", "Annual $299", "Lifetime $999"
- Configuração de trial (se tem, duração, preço)
- Tipo de cobrança (recurring, one_time)

**Platform:**
- Provedor de pagamento (Stripe, Hotmart, Cartpanda)
- Pode estar habilitado/desabilitado
- Configurações específicas (credenciais vêm depois)

**Offer Platform Mapping:**
- Vincula uma oferta a um produto em uma plataforma específica
- Exemplo:
  - Oferta: "Holymind Monthly"
  - Platform: Stripe
  - External Product ID: "prod_stripe123"
  - External Price ID: "price_stripe456"
  - Preço: $29.00 USD = R$157.27 BRL

### Relacionamentos

```
Platform ──< OfferPlatformMapping >── Offer >── Product
   (1)              (N)              (N)  (1)    (1)

Exemplo concreto:
Stripe ──< "prod_stripe123" >── "Monthly $29" >── Holymind
Hotmart ──< "999888" >── "Monthly $29" >── Holymind
Cartpanda ──< "plan_xyz" >── "Monthly $29" >── Holymind
```

### Tabelas a Criar

**platforms:**
- `id` (UUID)
- `name` (String) - "Stripe"
- `slug` (String, unique) - "stripe"
- `is_enabled` (Boolean) - Pode desabilitar temporariamente
- `config` (JSON) - Configurações opcionais
- `created_at`, `updated_at`

**products:**
- `id` (UUID)
- `name` (String) - "Holymind"
- `slug` (String, unique) - "holymind"
- `description` (Text)
- `product_type` (String) - "subscription", "one_time", "addon"
- `is_active` (Boolean)
- `metadata` (JSON)
- `created_at`, `updated_at`

**offers:**
- `id` (UUID)
- `product_id` (FK → products)
- `name` (String) - "Monthly Subscription"
- `slug` (String) - "monthly" (único por produto)
- `description` (Text)
- `billing_type` (String) - "recurring", "one_time"
- `billing_period` (String) - "day", "week", "month", "year"
- `billing_interval` (Integer) - Ex: 3 (a cada 3 meses)
- `has_trial` (Boolean)
- `trial_period_days` (Integer)
- `trial_amount` (Decimal)
- `is_active` (Boolean)
- `metadata` (JSON)
- `created_at`, `updated_at`
- **Constraint:** UNIQUE(product_id, slug)

**offer_platform_mappings:**
- `id` (UUID)
- `offer_id` (FK → offers)
- `platform_id` (FK → platforms)
- `external_product_id` (String) - ID no sistema externo
- `external_price_id` (String, nullable) - Stripe tem price_id separado
- `price_amount` (Decimal) - Preço na moeda original
- `price_currency` (String) - "USD", "BRL"
- `price_amount_brl` (Decimal) - Preço convertido para BRL
- `price_amount_usd` (Decimal) - Preço convertido para USD
- `trial_amount`, `trial_currency`, `trial_amount_brl`, `trial_amount_usd` - Mesma lógica
- `is_active` (Boolean)
- `metadata` (JSON)
- `created_at`, `updated_at`
- **Constraint:** UNIQUE(platform_id, external_product_id)

### Regras de Negócio

**Produtos:**
1. Slug único globalmente
2. Nome obrigatório e descritivo
3. `product_type` deve ser: "subscription", "one_time", "addon"
4. Pode ser desativado (soft delete via `is_active`)

**Ofertas:**
1. Slug único dentro do mesmo produto
2. Se `billing_type = "recurring"`:
  - `billing_period` é obrigatório
  - `billing_interval` padrão = 1
3. Se `has_trial = true`:
  - `trial_period_days` é obrigatório (mínimo 1)
  - `trial_amount` pode ser 0 (trial grátis) ou valor (trial pago)
4. Pode ter múltiplas ofertas ativas do mesmo produto (ex: Monthly + Annual)

**Mapeamentos:**
1. Combinação `platform_id + external_product_id` deve ser única
2. Preços sempre com 2 casas decimais
3. Se oferta tem trial, mapping deve ter valores de trial
4. Conversão de moeda feita no momento da criação do mapping

### Flux

### Fluxo de Criação de Produto Completo

**Cenário:** Criar produto "Holymind" com oferta mensal em 3 plataformas.

```
1. Criar Produto
   POST /products
   {
   "name": "Holymind",
   "slug": "holymind",
   "description": "App de meditação e mindfulness",
   "productType": "subscription",
   "isActive": true
   }
   → Retorna: { id: "prod-uuid-123", ... }

2. Criar Oferta
   POST /offers
   {
   "productId": "prod-uuid-123",
   "name": "Assinatura Mensal",
   "slug": "monthly",
   "billingType": "recurring",
   "billingPeriod": "month",
   "billingInterval": 1,
   "hasTrial": true,
   "trialPeriodDays": 7,
   "trialAmount": 9.00
   }
   → Retorna: { id: "offer-uuid-456", ... }

3. Mapear para Stripe
   POST /offers/offer-uuid-456/mappings
   {
   "platformId": "stripe-uuid",
   "externalProductId": "prod_NmXXXXXXXXXX",
   "externalPriceId": "price_1MXXXXXXXXXXx",
   "priceAmount": 29.00,
   "priceCurrency": "USD",
   "trialAmount": 9.00,
   "trialCurrency": "USD"
   }
   → Sistema converte automaticamente:
  - priceAmountBrl: 157.27 (29 × taxa do dia)
  - priceAmountUsd: 29.00
  - trialAmountBrl: 48.87
  - trialAmountUsd: 9.00

4. Mapear para Hotmart
   POST /offers/offer-uuid-456/mappings
   {
   "platformId": "hotmart-uuid",
   "externalProductId": "999888",
   "priceAmount": 147.00,
   "priceCurrency": "BRL",
   "trialAmount": 47.00,
   "trialCurrency": "BRL"
   }
   → Sistema converte:
  - priceAmountBrl: 147.00 (já está em BRL)
  - priceAmountUsd: 27.08 (147 / taxa do dia)

5. Mapear para Cartpanda
   POST /offers/offer-uuid-456/mappings
   {
   "platformId": "cartpanda-uuid",
   "externalProductId": "plan_xyz_123",
   "priceAmount": 147.00,
   "priceCurrency": "BRL",
   "trialAmount": 47.00,
   "trialCurrency": "BRL"
   }
```

### Validações Necessárias

**Ao criar Produto:**
- ✅ Slug não pode existir
- ✅ Nome obrigatório (mínimo 3 caracteres)
- ✅ `productType` deve ser enum válido

**Ao criar Oferta:**
- ✅ `productId` deve existir e estar ativo
- ✅ Slug único dentro do produto
- ✅ Se `billingType = "recurring"` → `billingPeriod` obrigatório
- ✅ Se `hasTrial = true` → `trialPeriodDays` obrigatório
- ✅ `trialAmount` não pode ser negativo

**Ao criar Mapping:**
- ✅ `offerId` e `platformId` devem existir
- ✅ Combinação `platform + externalProductId` única
- ✅ `priceAmount` > 0
- ✅ `priceCurrency` deve ser código válido (ISO 4217)
- ✅ Se oferta tem trial → mapping deve ter valores de trial

### DTOs Esperados

**CreateProductDto:**
```typescript
{
  name: string;              // required, min 3
  slug: string;              // required, lowercase, unique
  description?: string;
  productType: 'subscription' | 'one_time' | 'addon';  // enum
  isActive?: boolean;        // default true
  metadata?: object;
}
```

**CreateOfferDto:**
```typescript
{
  productId: string;         // UUID, required
  name: string;              // required
  slug: string;              // required, unique per product
  description?: string;
  billingType: 'recurring' | 'one_time';
  billingPeriod?: 'day' | 'week' | 'month' | 'year';  // required if recurring
  billingInterval?: number;  // default 1, min 1
  hasTrial?: boolean;        // default false
  trialPeriodDays?: number;  // required if hasTrial, min 1
  trialAmount?: number;      // default 0 if hasTrial
  isActive?: boolean;        // default true
  metadata?: object;
}
```

**CreateOfferMappingDto:**
```typescript
{
  platformId: string;        // UUID, required
  externalProductId: string; // required
  externalPriceId?: string;  // optional (Stripe usa)
  priceAmount: number;       // required, min 0.01
  priceCurrency: string;     // ISO 4217, required
  trialAmount?: number;      // required if offer has trial
  trialCurrency?: string;    // required if trialAmount provided
  isActive?: boolean;        // default true
  metadata?: object;
}
```

### Endpoints a Implementar

**Products:**
| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/products` | Listar todos produtos | `products:read` |
| GET | `/products/:id` | Detalhes de um produto | `products:read` |
| POST | `/products` | Criar produto | `products:create` |
| PATCH | `/products/:id` | Atualizar produto | `products:update` |
| DELETE | `/products/:id` | Deletar produto (soft) | `products:delete` |

**Offers:**
| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/offers` | Listar ofertas (filtrar por produto) | `offers:read` |
| GET | `/offers/:id` | Detalhes de oferta | `offers:read` |
| POST | `/offers` | Criar oferta | `offers:create` |
| PATCH | `/offers/:id` | Atualizar oferta | `offers:update` |
| DELETE | `/offers/:id` | Deletar oferta (soft) | `offers:delete` |

**Offer Mappings:**
| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/offers/:id/mappings` | Listar mapeamentos de uma oferta | `offers:read` |
| POST | `/offers/:id/mappings` | Criar mapeamento | `offers:create` |
| PATCH | `/mappings/:id` | Atualizar mapeamento | `offers:update` |
| DELETE | `/mappings/:id` | Deletar mapeamento | `offers:delete` |

**Platforms:**
| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/platforms` | Listar plataformas | `integrations:read` |
| GET | `/platforms/:id` | Detalhes de plataforma | `integrations:read` |
| PATCH | `/platforms/:id` | Atualizar (habilitar/desabilitar) | `integrations:manage` |

### Módulos e Estrutura de Código

```
src/modules/platforms/
├── platforms.module.ts
├── platforms.service.ts
└── dto/
    └── update-platform.dto.ts

src/modules/products/
├── products.module.ts
├── products.controller.ts
├── products.service.ts
└── dto/
    ├── create-product.dto.ts
    ├── update-product.dto.ts
    └── query-product.dto.ts

src/modules/offers/
├── offers.module.ts
├── offers.controller.ts
├── offers.service.ts
├── offer-mappings.service.ts
└── dto/
    ├── create-offer.dto.ts
    ├── update-offer.dto.ts
    ├── create-offer-mapping.dto.ts
    ├── update-offer-mapping.dto.ts
    └── query-offer.dto.ts
```

### Seed Inicial Necessário

**Plataformas (criar no seed):**
```typescript
const platforms = [
  { name: 'Stripe', slug: 'stripe', isEnabled: true },
  { name: 'Hotmart', slug: 'hotmart', isEnabled: true },
  { name: 'Cartpanda', slug: 'cartpanda', isEnabled: true },
];
```

**Produto Exemplo (opcional, para testes):**
```typescript
const holymind = {
  name: 'Holymind',
  slug: 'holymind',
  description: 'App de meditação guiada',
  productType: 'subscription',
  isActive: true
};
```

### Conversão de Moedas

**Serviço de Exchange Rate:**

Criar `src/common/services/exchange-rate.service.ts`:

```typescript
@Injectable()
export class ExchangeRateService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private httpService: HttpService,
    private configService: ConfigService
  ) {}

  async convert(
    amount: number,
    from: string,
    to: string
  ): Promise<{ converted: number; rate: number }> {
    
    if (from === to) {
      return { converted: amount, rate: 1 };
    }

    const cacheKey = `exchange_rate:${from}:${to}`;
    
    // Verificar cache (TTL 15 minutos)
    let rate = await this.cacheManager.get<number>(cacheKey);
    
    if (!rate) {
      // Buscar da API
      const apiKey = this.configService.get('EXCHANGE_RATE_API_KEY');
      const url = `https://api.exchangerate.host/latest?base=${from}&symbols=${to}`;
      
      const response = await this.httpService.get(url).toPromise();
      rate = response.data.rates[to];
      
      // Cachear por 15 minutos
      await this.cacheManager.set(cacheKey, rate, { ttl: 900 });
    }
    
    return {
      converted: parseFloat((amount * rate).toFixed(2)),
      rate
    };
  }

  async convertToBRL(amount: number, from: string): Promise<number> {
    const result = await this.convert(amount, from, 'BRL');
    return result.converted;
  }

  async convertToUSD(amount: number, from: string): Promise<number> {
    const result = await this.convert(amount, from, 'USD');
    return result.converted;
  }
}
```

**Uso no OfferMappingService:**
```typescript
async create(dto: CreateOfferMappingDto) {
  const { priceAmount, priceCurrency, trialAmount, trialCurrency } = dto;
  
  // Converter preço
  const [priceInBRL, priceInUSD, exchangeRate] = await Promise.all([
    this.exchangeRateService.convertToBRL(priceAmount, priceCurrency),
    this.exchangeRateService.convertToUSD(priceAmount, priceCurrency),
    this.exchangeRateService.convert(priceAmount, priceCurrency, 'BRL')
      .then(r => r.rate)
  ]);
  
  // Converter trial (se existe)
  let trialInBRL, trialInUSD;
  if (trialAmount && trialCurrency) {
    [trialInBRL, trialInUSD] = await Promise.all([
      this.exchangeRateService.convertToBRL(trialAmount, trialCurrency),
      this.exchangeRateService.convertToUSD(trialAmount, trialCurrency)
    ]);
  }
  
  return this.prisma.offerPlatformMapping.create({
    data: {
      ...dto,
      priceAmountBrl: priceInBRL,
      priceAmountUsd: priceInUSD,
      trialAmountBrl: trialInBRL,
      trialAmountUsd: trialInUSD,
    }
  });
}
```

### Testes Necessários

**Unit Tests (products.service.spec.ts):**
- ✅ Criar produto com dados válidos
- ✅ Rejeitar slug duplicado
- ✅ Rejeitar productType inválido
- ✅ Listar produtos com filtros
- ✅ Soft delete (isActive = false)

**Unit Tests (offers.service.spec.ts):**
- ✅ Criar oferta com trial
- ✅ Criar oferta sem trial
- ✅ Rejeitar oferta recurring sem billingPeriod
- ✅ Rejeitar oferta com trial sem trialPeriodDays
- ✅ Slug único por produto

**Unit Tests (offer-mappings.service.spec.ts):**
- ✅ Criar mapping com conversão de moeda
- ✅ Rejeitar mapping duplicado (platform + externalProductId)
- ✅ Validar preços positivos
- ✅ Cachear taxa de câmbio

**Integration Tests:**
- ✅ Criar produto → oferta → 3 mappings (Stripe, Hotmart, Cartpanda)
- ✅ Listar ofertas de um produto com mappings
- ✅ Desativar produto e verificar cascata

---

## Phase 3: Integration Infrastructure (⏳ PENDENTE)

### Objetivos

Construir a infraestrutura que permite:
- ✅ Armazenar credenciais das plataformas de forma segura
- ✅ Receber webhooks das 3 plataformas
- ✅ Validar assinaturas de webhooks
- ✅ Normalizar payloads diferentes em formato comum
- ✅ Implementar Strategy Pattern para providers
- ✅ Sincronização periódica como fallback
- ✅ Logging de webhooks e syncs

### Conceitos-Chave

**Webhook:**
- Notificação HTTP enviada pela plataforma quando evento ocorre
- Exemplos: `subscription.created`, `invoice.paid`, `customer.updated`
- Deve ser processado rapidamente (< 100ms de resposta)
- Processamento real acontece em background (BullMQ)

**Sync (Sincronização):**
- Busca periódica de dados via API da plataforma
- Serve como validação e recuperação de eventos perdidos
- Roda a cada 6 horas
- Compara com banco local e detecta discrepâncias

**Strategy Pattern:**
- Cada provider implementa interface comum
- Factory registra e fornece providers
- Fácil adicionar/remover providers sem afetar outros

### Tabelas a Criar

**integration_credentials:**
- `id` (UUID)
- `platform_id` (FK → platforms)
- `credential_type` (String) - "api_key", "client_secret", "webhook_secret"
- `credential_value` (Text) - **ENCRYPTED**
- `environment` (String) - "production", "sandbox"
- `is_active` (Boolean)
- `expires_at` (DateTime, nullable)
- `created_at`, `updated_at`
- **Constraint:** UNIQUE(platform_id, credential_type, environment)

**webhook_events:**
- `id` (UUID)
- `platform_id` (FK → platforms)
- `event_type` (String) - "subscription.created", etc
- `external_event_id` (String) - ID do evento na plataforma
- `payload` (JSONB) - Payload completo recebido
- `signature` (String) - Assinatura do webhook
- `status` (String) - "pending", "processing", "processed", "failed"
- `processed_at` (DateTime)
- `error_message` (Text)
- `retry_count` (Integer)
- `received_at` (DateTime)
- **Constraint:** UNIQUE(platform_id, external_event_id)
- **Index:** (platform_id, status, received_at)

**sync_logs:**
- `id` (UUID)
- `platform_id` (FK → platforms)
- `sync_type` (String) - "subscriptions", "transactions", "customers"
- `status` (String) - "running", "completed", "failed"
- `started_at` (DateTime)
- `completed_at` (DateTime)
- `records_synced` (Integer)
- `records_failed` (Integer)
- `missing_records_found` (Integer) - Eventos que webhook perdeu
- `error_details` (JSONB)
- `created_at`

### Strategy Pattern - Interface

**IPaymentProvider:**
```typescript
interface IPaymentProvider {
  // Identificação
  readonly name: string;      // "Stripe"
  readonly slug: string;      // "stripe"
  
  // Sincronização via API
  fetchSubscriptions(params: FetchParams): Promise<NormalizedSubscription[]>;
  fetchTransactions(params: FetchParams): Promise<NormalizedTransaction[]>;
  fetchCustomers(params: FetchParams): Promise<NormalizedCustomer[]>;
  fetchAffiliates(params: FetchParams): Promise<NormalizedAffiliate[]>;
  
  // Webhook handling
  validateWebhook(signature: string, payload: any, secret: string): boolean;
  normalizeWebhook(payload: any): WebhookEvent;
  
  // Health check
  testConnection(): Promise<boolean>;
}

interface FetchParams {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  cursor?: string;  // Para paginação
}

interface WebhookEvent {
  type: 'subscription.created' | 'subscription.updated' | 'subscription.canceled' 
        | 'invoice.paid' | 'invoice.payment_failed' | 'customer.created'
        | 'customer.updated';
  data: NormalizedData;
  metadata: {
    eventId: string;
    timestamp: Date;
    platformSlug: string;
  };
}
```

**Normalized Data Structures:**
```typescript
interface NormalizedSubscription {
  externalSubscriptionId: string;
  externalCustomerId: string;
  externalProductId: string;
  externalPriceId?: string;
  
  status: 'trial_active' | 'active' | 'past_due' | 'canceled' | 'expired';
  
  isTrial: boolean;
  trialAmount?: number;
  trialCurrency?: string;
  trialStartDate?: Date;
  trialEndDate?: Date;
  
  recurringAmount: number;
  recurringCurrency: string;
  billingPeriod: 'day' | 'week' | 'month' | 'year';
  billingInterval: number;
  
  startedAt: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  nextBillingDate?: Date;
  canceledAt?: Date;
  
  cancellationReason?: string;
  cancellationType?: 'voluntary' | 'involuntary';
  
  affiliateId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  
  metadata?: Record<string, any>;
}

interface NormalizedTransaction {
  externalTransactionId: string;
  externalCustomerId: string;
  externalSubscriptionId?: string;
  externalInvoiceId?: string;
  
  type: 'trial_purchase' | 'trial_conversion' | 'subscription_renewal' 
        | 'one_time_purchase' | 'refund';
  
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  
  grossAmount: number;
  discountAmount: number;
  taxAmount: number;
  feeAmount: number;
  netAmount: number;
  currency: string;
  
  paymentMethod?: string;
  failureCode?: string;
  failureMessage?: string;
  
  transactionDate: Date;
  
  metadata?: Record<string, any>;
}
```

### Fluxo de Webhook

```
1. Platform envia POST /webhooks/{platform-slug}
   ↓
2. WebhookController recebe
   ↓
3. Validar assinatura (provider.validateWebhook)
   ↓
4. Salvar raw payload em webhook_events (status: pending)
   ↓
5. Responder 200 OK rapidamente (< 100ms)
   ↓
6. Enfileirar job: webhook-processor
   ↓
7. Worker processa:
   - Normalizar evento (provider.normalizeWebhook)
   - Identificar tipo de evento
   - Chamar handler apropriado
   - Atualizar status: processed
   ↓
8. Se falhar:
   - Incrementar retry_count
   - Salvar error_message
   - Retentar até 3x com backoff exponencial
```

**Exemplo de Handler:**
```typescript
// subscriptions/handlers/subscription-created.handler.ts
@Injectable()
export class SubscriptionCreatedHandler {
  constructor(
    private subscriptionsService: SubscriptionsService,
    private customersService: CustomersService,
    private productsService: ProductsService
  ) {}

  async handle(event: WebhookEvent) {
    const data = event.data as NormalizedSubscription;
    
    // 1. Garantir que customer existe
    const customer = await this.customersService.findOrCreate({
      platformId: platform.id,
      externalCustomerId: data.externalCustomerId
    });
    
    // 2. Mapear produto/oferta via external IDs
    const offer = await this.productsService.findOfferByExternalId(
      platform.id,
      data.externalProductId
    );
    
    // 3. Converter valores para BRL/USD
    const [amountBrl, amountUsd, exchangeRate] = await this.convertCurrency(
      data.recurringAmount,
      data.recurringCurrency
    );
    
    // 4. Criar subscription
    const subscription = await this.subscriptionsService.create({
      customerId: customer.id,
      productId: offer.productId,
      offerId: offer.id,
      platformId: platform.id,
      externalSubscriptionId: data.externalSubscriptionId,
      status: data.status,
      isTrial: data.isTrial,
      recurringAmount: data.recurringAmount,
      recurringCurrency: data.recurringCurrency,
      recurringAmountBrl: amountBrl,
      recurringAmountUsd: amountUsd,
      // ... outros campos
    });
    
    // 5. Enfileirar cálculo de métricas
    await this.metricsQueue.add('calculate-daily-metrics', {
      date: new Date(),
      productId: offer.productId,
      platformId: platform.id
    });
    
    return subscription;
  }
}
```

### Implementação por Provider

**Stripe Provider:**
```typescript
@Injectable()
export class StripeProvider implements IPaymentProvider {
  readonly name = 'Stripe';
  readonly slug = 'stripe';
  
  private stripe: Stripe;
  
  constructor(
    private credentialsService: IntegrationCredentialsService
  ) {}
  
  async init() {
    const apiKey = await this.credentialsService.getDecrypted(
      'stripe',
      'api_key'
    );
    this.stripe = new Stripe(apiKey, { apiVersion: '2023-10-16' });
  }
  
  validateWebhook(signature: string, payload: any, secret: string): boolean {
    try {
      Stripe.webhooks.constructEvent(payload, signature, secret);
      return true;
    } catch (err) {
      return false;
    }
  }
  
  normalizeWebhook(payload: any): WebhookEvent {
    const event = payload;
    
    switch (event.type) {
      case 'customer.subscription.created':
        return this.normalizeSubscriptionCreated(event.data.object);
      
      case 'invoice.payment_succeeded':
        return this.normalizeInvoicePaid(event.data.object);
      
      // ... outros eventos
    }
  }
  
  private normalizeSubscriptionCreated(sub: Stripe.Subscription): WebhookEvent {
    return {
      type: 'subscription.created',
      data: {
        externalSubscriptionId: sub.id,
        externalCustomerId: sub.customer as string,
        externalProductId: sub.items.data[0].price.product as string,
        externalPriceId: sub.items.data[0].price.id,
        status: this.mapStatus(sub.status),
        isTrial: sub.trial_end ? sub.trial_end > Date.now() / 1000 : false,
        trialEndDate: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
        recurringAmount: sub.items.data[0].price.unit_amount! / 100,
        recurringCurrency: sub.items.data[0].price.currency.toUpperCase(),
        billingPeriod: sub.items.data[0].price.recurring!.interval,
        billingInterval: sub.items.data[0].price.recurring!.interval_count,
        startedAt: new Date(sub.created * 1000),
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        // ... extrair metadata, UTMs se existirem
      },
      metadata: {
        eventId: `evt_${sub.id}`,
        timestamp: new Date(),
        platformSlug: this.slug
      }
    };
  }
  
  async fetchSubscriptions(params: FetchParams): Promise<NormalizedSubscription[]> {
    const subscriptions = await this.stripe.subscriptions.list({
      created: {
        gte: Math.floor(params.startDate!.getTime() / 1000),
        lte: Math.floor(params.endDate!.getTime() / 1000)
      },
      limit: params.limit || 100,
      starting_after: params.cursor
    });
    
    return subscriptions.data.map(sub => this.normalizeSubscription(sub));
  }
  
  async testConnection(): Promise<boolean> {
    try {
      await this.stripe.accounts.retrieve();
      return true;
    } catch {
      return false;
    }
  }
}
```

**Hotmart Provider:**
```typescript
@Injectable()
export class HotmartProvider implements IPaymentProvider {
  readonly name = 'Hotmart';
  readonly slug = 'hotmart';
  
  private httpService: HttpService;
  private baseURL = 'https://developers.hotmart.com/api/v2';
  
  validateWebhook(signature: string, payload: any, secret: string): boolean {
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return hmac === signature;
  }
  
  normalizeWebhook(payload: any): WebhookEvent {
    const { event, data } = payload;
    
    switch (event) {
      case 'PURCHASE_COMPLETE':
        return this.normalizePurchaseComplete(data);
      
      case 'SUBSCRIPTION_CANCELLATION':
        return this.normalizeSubscriptionCanceled(data);
      
      // ... outros eventos
    }
  }
  
  private normalizePurchaseComplete(data: any): WebhookEvent {
    const isTrial = data.purchase.order_bump?.trial_days > 0;
    
    return {
      type: 'subscription.created',
      data: {
        externalSubscriptionId: data.subscription.subscriber_code,
        externalCustomerId: data.buyer.email,  // Hotmart usa email como ID
        externalProductId: data.product.id.toString(),
        status: 'active',
        isTrial,
        trialPeriodDays: data.purchase.order_bump?.trial_days,
        recurringAmount: data.purchase.price.value,
        recurringCurrency: data.purchase.price.currency_code,
        billingPeriod: this.mapRecurrency(data.subscription.recurrency_period),
        billingInterval: 1,
        startedAt: new Date(data.purchase.approved_date),
        affiliateId: data.affiliates?.[0]?.affiliate_code,
        utmSource: data.purchase.utm_source,
        utmMedium: data.purchase.utm_medium,
        utmCampaign: data.purchase.utm_campaign,
        metadata: data
      },
      metadata: {
        eventId: data.id,
        timestamp: new Date(),
        platformSlug: this.slug
      }
    };
  }
  
  async fetchSubscriptions(params: FetchParams): Promise<NormalizedSubscription[]> {
    const token = await this.getAccessToken();
    
    const response = await this.httpService.get(
      `${this.baseURL}/subscriptions`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          start_date: params.startDate.toISOString(),
          end_date: params.endDate.toISOString(),
          max_results: params.limit || 100,
          page_token: params.cursor
        }
      }
    ).toPromise();
    
    return response.data.items.map(sub => this.normalizeSubscription(sub));
  }
}
```

### Sync Periódica (Fallback)

**Cron Job (a cada 6 horas):**
```typescript
@Injectable()
export class SyncScheduler {
  constructor(
    private providerFactory: PaymentProviderFactory,
    private syncLogsService: SyncLogsService,
    private subscriptionsService: SubscriptionsService
  ) {}
  
  @Cron('0 */6 * * *')  // A cada 6 horas
  async syncAllPlatforms() {
    const platforms = await this.platformsService.findAllEnabled();
    
    for (const platform of platforms) {
      await this.syncPlatform(platform);
    }
  }
  
  private async syncPlatform(platform: Platform) {
    const provider = this.providerFactory.getProvider(platform.slug);
    
    const syncLog = await this.syncLogsService.create({
      platformId: platform.id,
      syncType: 'subscriptions',
      status: 'running',
      startedAt: new Date()
    });
    
    try {
      // Buscar últimas 24h
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      
      const subscriptions = await provider.
      const subscriptions = await provider.fetchSubscriptions({
        startDate,
        endDate,
        limit: 100
      });
      
      let synced = 0;
      let failed = 0;
      let missing = 0;
      
      for (const normalizedSub of subscriptions) {
        try {
          // Verificar se já existe
          const existing = await this.subscriptionsService.findByExternalId(
            platform.id,
            normalizedSub.externalSubscriptionId
          );
          
          if (!existing) {
            // Evento perdido! Webhook não chegou
            missing++;
            await this.handleMissingSubscription(platform, normalizedSub);
          } else {
            // Verificar se dados estão sincronizados
            const needsUpdate = this.compareSubscriptionData(existing, normalizedSub);
            
            if (needsUpdate) {
              await this.subscriptionsService.update(existing.id, normalizedSub);
              synced++;
            }
          }
        } catch (error) {
          failed++;
          console.error(`Failed to sync subscription ${normalizedSub.externalSubscriptionId}:`, error);
        }
      }
      
      // Atualizar log
      await this.syncLogsService.complete(syncLog.id, {
        status: 'completed',
        completedAt: new Date(),
        recordsSynced: synced,
        recordsFailed: failed,
        missingRecordsFound: missing
      });
      
      // Alertar se muitos eventos perdidos
      if (missing > 10) {
        await this.alertService.send({
          channel: 'slack',
          message: `⚠️ Sync encontrou ${missing} assinaturas perdidas no ${platform.name}`,
          severity: 'warning'
        });
      }
      
    } catch (error) {
      await this.syncLogsService.fail(syncLog.id, {
        status: 'failed',
        completedAt: new Date(),
        errorDetails: { message: error.message, stack: error.stack }
      });
      
      throw error;
    }
  }
  
  private async handleMissingSubscription(
    platform: Platform,
    normalizedSub: NormalizedSubscription
  ) {
    // Criar webhook event sintético
    await this.webhookEventsService.create({
      platformId: platform.id,
      eventType: 'subscription.created',
      externalEventId: `sync_${normalizedSub.externalSubscriptionId}`,
      payload: normalizedSub,
      signature: 'N/A (from sync)',
      status: 'pending',
      receivedAt: new Date()
    });
    
    // Enfileirar processamento
    await this.webhookQueue.add('process-webhook', {
      eventId: event.id
    });
  }
}
```

### Provider Factory

```typescript
@Injectable()
export class PaymentProviderFactory {
  private providers = new Map<string, IPaymentProvider>();
  
  constructor(
    private stripeProvider: StripeProvider,
    private hotmartProvider: HotmartProvider,
    private cartpandaProvider: CartpandaProvider
  ) {
    this.register(this.stripeProvider);
    this.register(this.hotmartProvider);
    this.register(this.cartpandaProvider);
  }
  
  register(provider: IPaymentProvider) {
    this.providers.set(provider.slug, provider);
    console.log(`✅ Provider registered: ${provider.name}`);
  }
  
  getProvider(slug: string): IPaymentProvider {
    const provider = this.providers.get(slug);
    
    if (!provider) {
      throw new NotFoundException(`Provider ${slug} not found`);
    }
    
    return provider;
  }
  
  getAllProviders(): IPaymentProvider[] {
    return Array.from(this.providers.values());
  }
  
  isProviderRegistered(slug: string): boolean {
    return this.providers.has(slug);
  }
}
```

### Endpoints

**Webhooks (públicos - sem autenticação):**
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/webhooks/stripe` | Receber eventos do Stripe |
| POST | `/webhooks/hotmart` | Receber eventos do Hotmart |
| POST | `/webhooks/cartpanda` | Receber eventos do Cartpanda |

**Integration Credentials (protegidos):**
| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/integrations/credentials` | Listar credenciais (mascaradas) | `integrations:read` |
| POST | `/integrations/credentials` | Adicionar credencial | `integrations:manage` |
| PATCH | `/integrations/credentials/:id` | Atualizar credencial | `integrations:manage` |
| DELETE | `/integrations/credentials/:id` | Deletar credencial | `integrations:manage` |
| POST | `/integrations/:platform/test` | Testar conexão | `integrations:manage` |

**Webhook Events (protegidos):**
| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/integrations/webhooks` | Listar eventos recebidos | `integrations:read` |
| GET | `/integrations/webhooks/:id` | Detalhes de evento | `integrations:read` |
| POST | `/integrations/webhooks/:id/retry` | Reprocessar evento | `integrations:manage` |

**Sync Logs (protegidos):**
| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/integrations/sync-logs` | Histórico de syncs | `integrations:read` |
| POST | `/integrations/:platform/sync` | Forçar sync manual | `integrations:manage` |

### Segurança de Credenciais

**Encryption Service:**
```typescript
@Injectable()
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;
  private saltLength = 64;
  private tagLength = 16;
  
  constructor(private configService: ConfigService) {}
  
  encrypt(text: string): string {
    const masterKey = this.configService.get<string>('ENCRYPTION_KEY');
    
    if (!masterKey) {
      throw new Error('ENCRYPTION_KEY not configured');
    }
    
    const salt = crypto.randomBytes(this.saltLength);
    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, this.keyLength, 'sha512');
    const iv = crypto.randomBytes(this.ivLength);
    
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combinar salt + iv + tag + encrypted
    return salt.toString('hex') + 
           iv.toString('hex') + 
           tag.toString('hex') + 
           encrypted;
  }
  
  decrypt(encryptedText: string): string {
    const masterKey = this.configService.get<string>('ENCRYPTION_KEY');
    
    const salt = Buffer.from(encryptedText.slice(0, this.saltLength * 2), 'hex');
    const iv = Buffer.from(
      encryptedText.slice(this.saltLength * 2, this.saltLength * 2 + this.ivLength * 2),
      'hex'
    );
    const tag = Buffer.from(
      encryptedText.slice(
        this.saltLength * 2 + this.ivLength * 2,
        this.saltLength * 2 + this.ivLength * 2 + this.tagLength * 2
      ),
      'hex'
    );
    const encrypted = encryptedText.slice(this.saltLength * 2 + this.ivLength * 2 + this.tagLength * 2);
    
    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, this.keyLength, 'sha512');
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

**Credentials Service:**
```typescript
@Injectable()
export class IntegrationCredentialsService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService
  ) {}
  
  async create(dto: CreateCredentialDto): Promise<IntegrationCredential> {
    const encrypted = this.encryptionService.encrypt(dto.credentialValue);
    
    return this.prisma.integrationCredential.create({
      data: {
        ...dto,
        credentialValue: encrypted
      }
    });
  }
  
  async getDecrypted(
    platformSlug: string,
    credentialType: string,
    environment: string = 'production'
  ): Promise<string> {
    const platform = await this.prisma.platform.findUnique({
      where: { slug: platformSlug }
    });
    
    const credential = await this.prisma.integrationCredential.findFirst({
      where: {
        platformId: platform.id,
        credentialType,
        environment,
        isActive: true
      }
    });
    
    if (!credential) {
      throw new NotFoundException(
        `Credential ${credentialType} not found for ${platformSlug}`
      );
    }
    
    return this.encryptionService.decrypt(credential.credentialValue);
  }
  
  async findAll(platformId: string) {
    const credentials = await this.prisma.integrationCredential.findMany({
      where: { platformId }
    });
    
    // Mascarar valores
    return credentials.map(cred => ({
      ...cred,
      credentialValue: this.maskCredential(cred.credentialValue)
    }));
  }
  
  private maskCredential(value: string): string {
    if (value.length <= 8) {
      return '***';
    }
    return value.slice(0, 4) + '***' + value.slice(-4);
  }
}
```

### Variáveis de Ambiente Necessárias

```env
# Encryption
ENCRYPTION_KEY="your-256-bit-encryption-key-here-change-in-production"

# Hotmart
HOTMART_CLIENT_ID="..."
HOTMART_CLIENT_SECRET="..."
HOTMART_WEBHOOK_SECRET="..."

# Cartpanda
CARTPANDA_API_KEY="..."
CARTPANDA_WEBHOOK_SECRET="..."
```

### Estrutura de Módulos

```
src/modules/integrations/
├── integrations.module.ts
├── credentials/
│   ├── credentials.service.ts
│   ├── encryption.service.ts
│   └── dto/
│       ├── create-credential.dto.ts
│       └── test-connection.dto.ts
├── webhooks/
│   ├── webhooks.controller.ts
│   ├── webhooks.service.ts
│   ├── webhook-events.service.ts
│   └── handlers/
│       ├── subscription-created.handler.ts
│       ├── subscription-updated.handler.ts
│       ├── subscription-canceled.handler.ts
│       ├── invoice-paid.handler.ts
│       └── customer-created.handler.ts
├── providers/
│   ├── interfaces/
│   │   ├── payment-provider.interface.ts
│   │   └── normalized-data.interface.ts
│   ├── payment-provider.factory.ts
│   ├── stripe.provider.ts
│   ├── hotmart.provider.ts
│   └── cartpanda.provider.ts
└── sync/
    ├── sync-logs.service.ts
    ├── sync-scheduler.service.ts
    └── sync-validator.service.ts
```

### Testes Necessários

**Unit Tests:**
- ✅ EncryptionService: encrypt/decrypt round-trip
- ✅ PaymentProviderFactory: register e retrieve providers
- ✅ StripeProvider: normalizeWebhook para cada evento
- ✅ HotmartProvider: normalizeWebhook para cada evento
- ✅ CartpandaProvider: normalizeWebhook para cada evento

**Integration Tests:**
- ✅ Receber webhook válido → processar → criar subscription
- ✅ Receber webhook com assinatura inválida → rejeitar 401
- ✅ Receber webhook duplicado → idempotência
- ✅ Sync encontrar evento perdido → criar via sync
- ✅ Testar conexão com cada provider

**E2E Tests:**
- ✅ Fluxo completo: webhook → processamento → métricas atualizadas
- ✅ Fluxo de retry: webhook falha → retenta → sucesso
- ✅ Sync periódica encontra discrepâncias

---

## Phase 4: Core Business (⏳ PENDENTE)

### Objetivos

Implementar as entidades principais do negócio:
- **Customers** - Clientes consolidados
- **Orders** - Pedidos/Compras
- **Subscriptions** - Assinaturas ativas/canceladas
- **Transactions** - Transações financeiras
- **Subscription Periods** - Períodos de cobrança

### Conceitos-Chave

**Customer:**
- Cliente único na plataforma
- Pode ter múltiplas assinaturas (de produtos diferentes)
- Não é unificado entre plataformas (um cliente no Stripe ≠ cliente no Hotmart)

**Order:**
- Representa uma compra/pedido
- Pode conter múltiplos itens (subscription + upsells + bumps)
- Rastreia UTMs e afiliados

**Subscription:**
- Assinatura de um produto específico
- Ciclo de vida: trial → active → canceled/expired
- ⚠️ **REGRA CRÍTICA:** Cliente não pode ter 2 assinaturas ativas do MESMO produto

**Transaction:**
- Evento financeiro (pagamento, reembolso, falha)
- Pode estar ligado a subscription (renewal) ou order (one-time)
- Relacionamento N:N com subscriptions (uma transaction pode renovar múltiplas subs)

**Subscription Period:**
- Período de cobrança individual de uma subscription
- Usado para tracking de renewals e churn por período

### Tabelas a Criar

**customers:**
- `id` (UUID)
- `platform_id` (FK → platforms)
- `external_customer_id` (String)
- `email` (String)
- `name` (String)
- `phone` (String)
- `document` (String) - CPF/CNPJ
- `country_code` (String) - ISO 3166-1 alpha-2
- `state` (String)
- `city` (String)
- `metadata` (JSONB)
- `first_purchase_at` (DateTime)
- `last_purchase_at` (DateTime)
- `total_spent_brl` (Decimal) - Soma de todas as purchases
- `created_at`, `updated_at`
- **Constraint:** UNIQUE(platform_id, external_customer_id)
- **Index:** (platform_id, external_customer_id), (email)

**orders:**
- `id` (UUID)
- `customer_id` (FK → customers)
- `platform_id` (FK → platforms)
- `external_order_id` (String)
- `subtotal_amount`, `discount_amount`, `tax_amount`, `total_amount` (Decimal)
- `currency` (String)
- `subtotal_amount_brl`, `discount_amount_brl`, `tax_amount_brl`, `total_amount_brl` (Decimal)
- `subtotal_amount_usd`, `discount_amount_usd`, `tax_amount_usd`, `total_amount_usd` (Decimal)
- `exchange_rate` (Decimal)
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` (String)
- `referrer_url`, `landing_page_url` (Text)
- `affiliate_id` (FK → affiliates)
- `coupon_code` (String)
- `status` (String) - "pending", "completed", "canceled", "refunded"
- `platform_metadata` (JSONB)
- `order_date` (DateTime)
- `completed_at` (DateTime)
- `created_at`, `updated_at`
- **Constraint:** UNIQUE(platform_id, external_order_id)
- **Index:** (customer_id), (platform_id), (status), (order_date DESC)

**order_items:**
- `id` (UUID)
- `order_id` (FK → orders)
- `product_id` (FK → products, nullable)
- `offer_id` (FK → offers, nullable)
- `external_product_id` (String)
- `item_name` (String)
- `item_description` (Text)
- `item_type` (String) - "subscription", "one_time", "upsell", "bump", "addon"
- `quantity` (Integer)
- `unit_price`, `total_price` (Decimal)
- `currency` (String)
- `unit_price_brl`, `total_price_brl` (Decimal)
- `unit_price_usd`, `total_price_usd` (Decimal)
- `metadata` (JSONB)
- `created_at`
- **Index:** (order_id), (product_id), (item_type)

**subscriptions:**
- `id` (UUID)
- `customer_id` (FK → customers)
- `product_id` (FK → products)
- `offer_id` (FK → offers)
- `platform_id` (FK → platforms)
- `external_subscription_id` (String)
- `status` (String) - "trial_pending", "trial_active", "active", "past_due", "canceled", "expired", "paused"
- `substatus` (String, nullable) - Estados adicionais específicos
- `is_trial` (Boolean)
- `trial_amount`, `trial_currency` (Decimal, String)
- `trial_amount_brl`, `trial_amount_usd` (Decimal)
- `trial_start_date`, `trial_end_date`, `trial_converted_at` (DateTime)
- `recurring_amount`, `recurring_currency` (Decimal, String)
- `recurring_amount_brl`, `recurring_amount_usd` (Decimal)
- `billing_period` (String) - "day", "week", "month", "year"
- `billing_interval` (Integer)
- `started_at` (DateTime)
- `first_renewal_date` (DateTime) - Quando trial converteu
- `current_period_start`, `current_period_end` (DateTime)
- `next_billing_date` (DateTime)
- `canceled_at`, `cancel_scheduled_for`, `ended_at`, `paused_at` (DateTime)
- `cancellation_reason` (String)
- `cancellation_type` (String) - "voluntary", "involuntary"
- `cancellation_details` (JSONB)
- `previous_subscription_id` (FK → subscriptions) - Para upgrades/downgrades
- `superseded_by_subscription_id` (FK → subscriptions)
- `renewal_count` (Integer) - Quantas vezes renovou
- `failed_payment_count` (Integer)
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` (String)
- `acquisition_channel` (String) - Mapeado de utm_source
- `affiliate_id` (FK → affiliates)
- `platform_metadata` (JSONB)
- `created_at`, `updated_at`
- **Constraint:** UNIQUE(platform_id, external_subscription_id)
- **Index:** (customer_id), (product_id), (offer_id), (platform_id), (status), (external_subscription_id), (started_at, current_period_end), (next_billing_date) WHERE status='active', (utm_source), (acquisition_channel), (affiliate_id)

**subscription_periods:**
- `id` (UUID)
- `subscription_id` (FK → subscriptions)
- `period_number` (Integer) - 1, 2, 3... (incrementa a cada renewal)
- `period_start`, `period_end` (DateTime)
- `amount`, `currency` (Decimal, String)
- `amount_brl`, `amount_usd` (Decimal)
- `status` (String) - "upcoming", "active", "completed", "failed"
- `payment_status` (String) - "pending", "succeeded", "failed"
- `payment_date` (DateTime)
- `transaction_id` (FK → transactions)
- `created_at`
- **Constraint:** UNIQUE(subscription_id, period_number)
- **Index:** (subscription_id), (period_start, period_end)

**transactions:**
- `id` (UUID)
- `order_id` (FK → orders, nullable)
- `customer_id` (FK → customers)
- `platform_id` (FK → platforms)
- `external_transaction_id` (String)
- `external_invoice_id` (String)
- `transaction_type` (String) - "trial_purchase", "trial_conversion", "subscription_renewal", "one_time_purchase", "refund", "chargeback"
- `status` (String) - "pending", "succeeded", "failed", "refunded"
- `gross_amount`, `discount_amount`, `tax_amount`, `fee_amount`, `net_amount` (Decimal)
- `currency` (String)
- `gross_amount_brl`, `discount_amount_brl`, `tax_amount_brl`, `fee_amount_brl`, `net_amount_brl` (Decimal)
- `gross_amount_usd`, `discount_amount_usd`, `tax_amount_usd`, `fee_amount_usd`, `net_amount_usd` (Decimal)
- `exchange_rate` (Decimal)
- `payment_method` (String) - "credit_card", "debit_card", "pix", "boleto"
- `payment_method_details` (JSONB)
- `failure_code`, `failure_message` (String, Text)
- `platform_metadata` (JSONB)
- `transaction_date` (DateTime)
- `created_at`
- **Constraint:** UNIQUE(platform_id, external_transaction_id)
- **Index:** (order_id), (customer_id), (platform_id), (status), (transaction_type), (transaction_date DESC), (external_transaction_id)

**transaction_subscriptions (N:N):**
- `id` (UUID)
- `transaction_id` (FK → transactions)
- `subscription_id` (FK → subscriptions)
- `is_initial_purchase` (Boolean)
- `is_renewal` (Boolean)
- `is_upgrade` (Boolean)
- `is_downgrade` (Boolean)
- `created_at`
- **Constraint:** UNIQUE(transaction_id, subscription_id)
- **Index:** (transaction_id), (subscription_id)

### Regras de Negócio Críticas

**1. Trial Logic:**
```
❌ Trial NÃO conta como assinatura ativa
❌ Trial NÃO soma no MRR
✅ Trial só conta em métricas de trial (trial_count, trial_rate)
✅ Apenas subscriptions com first_renewal_date ≠ NULL contam no MRR
```

**2. Subscription Status Transitions:**
```
trial_pending → trial_active → active (após primeira renovação)
                     ↓
                trial_expired (não converteu)

active → past_due (pagamento falhou, retry em andamento)
      → canceled (cancelou antes do fim do período)
      → expired (período terminou sem renovar)
      → paused (pausada temporariamente)
```

**3. Customer Constraints:**
```
❌ Cliente NÃO PODE ter 2+ subscriptions ativas do MESMO produto
✅ Cliente PODE ter subscriptions de produtos diferentes
✅ Clientes NÃO são unificados entre plataformas
   (customer no Stripe ≠ customer no Hotmart)
```

**4. Cancellation Types:**
```
Voluntary Churn:
- Cliente clica em "cancelar"
- cancellation_type = "voluntary"

Involuntary Churn:
- Pagamento falha múltiplas vezes
- Cartão expira e não renova
- cancellation_type = "involuntary"
```

**5. Upgrade/Downgrade:**
```
Opção A (Recomendada): Criar nova subscription
1. subscription_old.status = "canceled"
2. subscription_old.superseded_by_subscription_id = subscription_new.id
3. subscription_new.previous_subscription_id = subscription_old.id
4. transaction vinculada a ambas via transaction_subscriptions

Opção B: Atualizar existente
1. subscription.offer_id = new_offer_id
2. subscription.recurring_amount = new_amount
3. Criar transaction de tipo "upgrade" ou "downgrade"
```

### Fluxo de Processamento de Webhook

**Exemplo: subscription.created do Stripe**

```
1. Webhook chega em /webhooks/stripe
   ↓
2. StripeProvider.normalizeWebhook() → NormalizedSubscription
   ↓
3. SubscriptionCreatedHandler.handle()
   ↓
4. Buscar/Criar Customer:
   - Verificar se customer existe (platform_id + external_customer_id)
   - Se não: criar customer
   ↓
5. Mapear Produto/Oferta:
   - Buscar OfferPlatformMapping via external_product_id
   - Obter product_id e offer_id
   ↓
6. Validar Constraint:
   - Verificar se customer já tem subscription ativa deste produto
   - Se sim: cancelar antiga ou rejeitar nova
   ↓
7. Converter Moedas:
   - recurring_amount → recurring_amount_brl, recurring_amount_usd
   - trial_amount → trial_amount_brl, trial_amount_usd
   ↓
8. Criar Subscription:
   - status = "trial_active" (se tem trial) ou "active"
   - is_trial = true/false
   - Preencher todos os campos
   ↓
9. Criar Order (se for primeira compra):
   - Vincular customer
   - Adicionar order_items
   ↓
10. Criar Transaction:
    - type = "trial_purchase" ou "subscription_purchase"
    - Vincular à subscription via transaction_subscriptions
   ↓
11. Atualizar Customer Stats:
    - first_purchase_at (se primeira)
    - last_purchase_at
    - total_spent_brl += amount
   ↓
12. Enfileirar Jobs:
    - calculate-daily-metrics
    - update-customer-ltv
    - process-affiliate-stats
   ↓
13. Audit Log:
    - entity_type = "subscription"
    - action = "created"
    - source = "webhook"
```

### Endpoints

**Customers:**
| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/customers` | Listar clientes | `customers:read` |
| GET | `/customers/:id` | Detalhes + LTV | `customers:read` |
| GET | `/customers/:id/subscriptions` | Assinaturas do cliente | `customers:read` |
| GET | `/customers/:id/transactions` | Transações do cliente | `customers:read` |
| PATCH | `/customers/:id` | Atualizar dados | `customers:update` |

**Subscriptions:**
| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/subscriptions` | Listar subscriptions | `subscriptions:read` |
| GET | `/subscriptions/:id` | Detalhes completos | `subscriptions:read` |
| GET | `/subscriptions/:id/periods` | Períodos de cobrança | `subscriptions:read` |
| PATCH | `/subscriptions/:id/cancel` | Cancelar subscription | `subscriptions:manage` |
| PATCH | `/subscriptions/:id/pause` | Pausar subscription | `subscriptions:manage` |
| PATCH | `/subscriptions/:id/resume` | Retomar subscription | `subscriptions:manage` |

**Transactions:**
| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/transactions` | Listar transações | `transactions:read` |
| GET | `/transactions/:id` | Detalhes da transação | `transactions:read` |
| POST | `/transactions/:id/refund` | Processar reembolso | `transactions:manage` |

### Estrutura de Módulos

```
src/modules/customers/
├── customers.module.ts
├── customers.controller.ts
├── customers.service.ts
└── dto/
    ├── create-customer.dto.ts
    ├── update-customer.dto.ts
    └── query-customer.dto.ts

src/modules/orders/
├── orders.module.ts
├── orders.service.ts
├── order-items.service.ts
└── dto/
    ├── create-order.dto.ts
    └── create-order-item.dto.ts

src/modules/subscriptions/
├── subscriptions.module.ts
├── subscriptions.controller.ts
├── subscriptions.service.ts
├── subscription-periods.service.ts
├── handlers/
│   ├── subscription-lifecycle.handler.ts
│   └── subscription-validator.service.ts
└── dto/
    ├── create-subscription.dto.ts
    ├── update-subscription-status.dto.ts
    ├── cancel-subscription.dto.ts
    └── query-subscription.dto.ts

src/modules/transactions/
├── transactions.module.ts
├── transactions.service.ts
└── dto/
    ├── create-transaction.dto.ts
    ├── refund-transaction.dto.ts
    └── query-transaction.dto.ts
```

### Testes Necessários

**Unit Tests:**
- ✅ CustomersService: findOrCreate com deduplicação
- ✅ SubscriptionsService: validar constraint (1 produto por customer)
- ✅ SubscriptionsService: trial → active transition
- ✅ SubscriptionsService: cancelamento voluntary vs involuntary
- ✅ TransactionsService: calcular net_amount corretamente

**Integration Tests:**
- ✅ Webhook completo: subscription.created → DB populated
- ✅ Webhook renewal: subscription.updated → period criado
- ✅ Webhook cancellation → status atualizado + churn calculado
- ✅ Tentativa de criar 2ª subscription mesmo produto → rejeitar
- ✅ Upgrade: cancelar antiga + criar nova

**Business Logic Tests:**
- ✅ Trial de $9 + conversão $29 → MRR só conta $29
- ✅ Subscription ativa conta no MRR
- ✅ Subscription trial_active NÃO conta no MRR
- ✅ Subscription canceled remove do MRR
---

## Phase 5: Analytics & Metrics (⏳ PENDENTE)

### Objetivos

Implementar o sistema de métricas pré-calculadas para dashboard instantâneo:
- **Daily Metrics** - Métricas diárias agregadas
- **Customer LTV** - Lifetime Value por cliente
- **Cohort Analysis** - Análise de retenção por coorte
- **Marketing Spend** - ROI de marketing
- **Metrics Calculator** - Worker que processa métricas

### Conceitos-Chave

**Pre-computed Metrics:**
- Cálculos pesados rodam em background (BullMQ)
- Resultados armazenados em tabelas otimizadas
- Dashboard consulta dados pré-calculados (< 200ms)
- Atualização incremental (só recalcula o que mudou)

**Granularidade:**
- Métricas globais (toda empresa)
- Por produto
- Por oferta
- Por plataforma
- Por afiliado
- Combinações (produto + plataforma)

**Refresh Strategy:**
- **On webhook:** Recalcular métricas afetadas (async, ~30s latência)
- **Nightly:** Recalcular tudo para validação (3am)
- **On demand:** Admin pode forçar recálculo

### Tabelas a Criar

**daily_metrics:**
- `id` (UUID)
- `metric_date` (Date)
- `product_id` (FK → products, nullable) - NULL = global
- `offer_id` (FK → offers, nullable)
- `platform_id` (FK → platforms, nullable)
- `affiliate_id` (FK → affiliates, nullable)
- **New Orders:**
  - `new_orders_count` (Integer)
  - `new_orders_revenue_brl`, `new_orders_revenue_usd` (Decimal)
- **New Subscriptions:**
  - `new_subscriptions_count` (Integer)
  - `new_subscriptions_revenue_brl`, `new_subscriptions_revenue_usd` (Decimal)
  - `active_subscriptions_count` (Integer)
- **Trials:**
  - `new_trials_count` (Integer)
  - `trial_revenue_brl`, `trial_revenue_usd` (Decimal)
  - `trial_conversions_count` (Integer)
  - `trial_conversion_rate` (Decimal) - %
  - `trial_expired_count` (Integer)
- **Revenue:**
  - `mrr_brl`, `mrr_usd` (Decimal)
  - `arr_brl`, `arr_usd` (Decimal)
  - `total_revenue_brl`, `total_revenue_usd` (Decimal)
  - `recurring_revenue_brl`, `recurring_revenue_usd` (Decimal)
  - `non_recurring_revenue_brl`, `non_recurring_revenue_usd` (Decimal)
- **Churn:**
  - `canceled_subscriptions_count` (Integer)
  - `churned_revenue_brl`, `churned_revenue_usd` (Decimal)
  - `churn_rate` (Decimal) - %
  - `voluntary_churn_count` (Integer)
  - `involuntary_churn_count` (Integer)
- **Transactions:**
  - `successful_transactions_count` (Integer)
  - `failed_transactions_count` (Integer)
  - `refunded_transactions_count` (Integer)
- `created_at`, `updated_at`
- **Constraint:** UNIQUE(metric_date, COALESCE(product_id), COALESCE(offer_id), COALESCE(platform_id), COALESCE(affiliate_id))
- **Index:** (metric_date DESC), (product_id, metric_date DESC), (platform_id, metric_date DESC), (affiliate_id, metric_date DESC)

**customer_ltv:**
- `id` (UUID)
- `customer_id` (FK → customers)
- `product_id` (FK → products, nullable) - NULL = global LTV
- `total_spent_brl`, `total_spent_usd` (Decimal)
- `total_orders_count` (Integer)
- `total_transactions_count` (Integer)
- `avg_order_value_brl`, `avg_order_value_usd` (Decimal)
- `first_purchase_at`, `last_purchase_at` (DateTime)
- `months_active` (Integer)
- `ltv_brl`, `ltv_usd` (Decimal)
- `calculated_at` (DateTime)
- **Constraint:** UNIQUE(customer_id, COALESCE(product_id))
- **Index:** (customer_id), (product_id), (ltv_brl DESC)

**cohort_analysis:**
- `id` (UUID)
- `cohort_month` (Date) - Primeiro dia do mês de aquisição
- `product_id` (FK → products, nullable)
- `platform_id` (FK → platforms, nullable)
- `cohort_size` (Integer) - Quantos customers entraram neste mês
- **Retention Counts:**
  - `retention_month_0` (Integer) - No mês de entrada
  - `retention_month_1` (Integer) - 1 mês depois
  - `retention_month_2`, `retention_month_3`, `retention_month_6`, `retention_month_12` (Integer)
- **Retention Rates:**
  - `retention_rate_month_1`, `retention_rate_month_3`, `retention_rate_month_6`, `retention_rate_month_12` (Decimal) - %
- **Revenue:**
  - `cumulative_revenue_brl`, `cumulative_revenue_usd` (Decimal)
  - `avg_ltv_brl`, `avg_ltv_usd` (Decimal)
- `calculated_at` (DateTime)
- **Constraint:** UNIQUE(cohort_month, COALESCE(product_id), COALESCE(platform_id))
- **Index:** (cohort_month DESC), (product_id), (platform_id)

**marketing_spend:**
- `id` (UUID)
- `spend_date` (Date)
- `channel` (String) - "Meta Ads", "Google Ads", "TikTok Ads", etc
- `platform_id` (FK → platforms, nullable)
- `amount`, `currency` (Decimal, String)
- `amount_brl`, `amount_usd` (Decimal)
- `notes` (Text)
- `created_at`
- **Index:** (spend_date DESC), (channel)

### Fórmulas de Cálculo

**1. MRR (Monthly Recurring Revenue):**
```sql
-- MRR = Soma de recurring_amount de todas subscriptions ativas (não-trial)
SELECT 
  COALESCE(SUM(recurring_amount_brl), 0) as mrr_brl,
  COALESCE(SUM(recurring_amount_usd), 0) as mrr_usd
FROM subscriptions
WHERE status = 'active'
  AND is_trial = false
  AND current_period_end >= CURRENT_DATE
  AND (:product_id IS NULL OR product_id = :product_id)
  AND (:platform_id IS NULL OR platform_id = :platform_id);
```

**Importante:**
- ✅ Apenas subscriptions com `is_trial = false`
- ✅ Apenas com `status = 'active'`
- ✅ Apenas com `current_period_end >= hoje` (não expiradas)
- ❌ Trials NÃO contam (mesmo pagos)

**2. ARR (Annual Recurring Revenue):**
```sql
-- ARR = MRR × 12
SELECT mrr_brl * 12 as arr_brl
FROM daily_metrics
WHERE metric_date = CURRENT_DATE;
```

**3. Churn Rate:**
```sql
-- Churn Rate = (Cancelamentos no período / Assinaturas ativas início do período) × 100
WITH active_start AS (
  SELECT COUNT(*) as count
  FROM subscriptions
  WHERE status = 'active'
    AND is_trial = false
    AND started_at < :period_start
),
canceled_period AS (
  SELECT COUNT(*) as count
  FROM subscriptions
  WHERE canceled_at >= :period_start
    AND canceled_at < :period_end
)
SELECT 
  (canceled_period.count::float / NULLIF(active_start.count, 0) * 100) as churn_rate
FROM canceled_period, active_start;
```

**4. Trial Conversion Rate:**
```sql
-- Trial Rate = (Trials que converteram / Total de trials) × 100
WITH total_trials AS (
  SELECT COUNT(*) as count
  FROM subscriptions
  WHERE trial_start_date >= :start_date
    AND trial_start_date < :end_date
),
converted_trials AS (
  SELECT COUNT(*) as count
  FROM subscriptions
  WHERE trial_start_date >= :start_date
    AND trial_start_date < :end_date
    AND trial_converted_at IS NOT NULL
)
SELECT 
  (converted_trials.count::float / NULLIF(total_trials.count, 0) * 100) as trial_rate
FROM converted_trials, total_trials;
```

**5. LTV (Lifetime Value):**
```sql
-- LTV por Customer = Total gasto pelo customer
SELECT 
  customer_id,
  SUM(gross_amount_brl) as ltv_brl
FROM transactions
WHERE customer_id = :customer_id
  AND status = 'succeeded'
GROUP BY customer_id;

-- LTV Médio = Ticket Médio / Churn Rate Mensal
SELECT 
  (SUM(total_spent_brl) / NULLIF(COUNT(DISTINCT customer_id), 0)) / 
  NULLIF((churn_rate / 100), 0) as avg_ltv
FROM customer_ltv;
```

**6. CAC (Customer Acquisition Cost):**
```sql
-- CAC = Gasto Total em Marketing / Novos Customers
WITH marketing AS (
  SELECT COALESCE(SUM(amount_brl), 0) as spend
  FROM marketing_spend
  WHERE spend_date >= :start_date
    AND spend_date < :end_date
),
new_customers AS (
  SELECT COUNT(DISTINCT customer_id) as count
  FROM orders
  WHERE order_date >= :start_date
    AND order_date < :end_date
)
SELECT 
  marketing.spend / NULLIF(new_customers.count, 0) as cac
FROM marketing, new_customers;
```

**7. LTV:CAC Ratio:**
```sql
SELECT 
  avg_ltv / NULLIF(cac, 0) as ltv_cac_ratio
FROM (
  SELECT ... as avg_ltv
) ltv,
(
  SELECT ... as cac
) cac;
```

**Interpretação:**
- < 1.0x = Perdendo dinheiro
- 1.0x - 3.0x = Aceitável
- > 3.0x = Excelente

### Metrics Calculator (BullMQ Worker)

**Processor:**
```typescript
@Processor('metrics')
export class MetricsCalculatorProcessor {
  constructor(
    private dailyMetricsService: DailyMetricsService,
    private customerLtvService: CustomerLtvService,
    private cohortAnalysisService: CohortAnalysisService
  ) {}
  
  @Process('calculate-daily-metrics')
  async calculateDailyMetrics(job: Job<CalculateMetricsDto>) {
    const { date, productId, platformId, affiliateId } = job.data;
    
    // 1. Calcular métricas do dia
    const metrics = await this.dailyMetricsService.calculate({
      date,
      productId,
      platformId,
      affiliateId
    });
    
    // 2. Upsert na tabela
    await this.dailyMetricsService.upsert(metrics);
    
    return { success: true, metrics };
  }
  
  @Process('recalculate-all-metrics')
  @Cron('0 3 * * *')  // Todo dia às 3am
  async recalculateAllMetrics() {
    // Recalcular últimos 90 dias (validação)
    const today = new Date();
    const startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    for (let date = startDate; date <= today; date.setDate(date.getDate() + 1)) {
      await this.calculateDailyMetrics({
        data: { date: new Date(date) }
      });
    }
  }
  
  @Process('update-customer-ltv')
  async updateCustomerLtv(job: Job<{ customerId: string }>) {
    const { customerId } = job.data;
    
    const ltv = await this.customerLtvService.calculate(customerId);
    await this.customerLtvService.upsert(ltv);
    
    return { success: true, ltv };
  }
  
  @Process('calculate-cohorts')
  @Cron('0 4 1 * *')  // Todo dia 1 do mês às 4am
  async calculateCohorts() {
    // Recalcular coortes dos últimos 24 meses
    const today = new Date();
    
    for (let i = 0; i < 24; i++) {
      const cohortMonth = new Date(today.getFullYear(), today.getMonth() - i, 1);
      
      await this.cohortAnalysisService.calculate(cohortMonth);
    }
  }
}
```

**DailyMetricsService:**
```typescript
@Injectable()
export class DailyMetricsService {
  constructor(private prisma: PrismaService) {}
  
  async calculate(params: CalculateMetricsDto): Promise<DailyMetric> {
    const { date, productId, platformId, affiliateId } = params;
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Base WHERE clause
    const whereClause = {
      ...(productId && { productId }),
      ...(platformId && { platformId }),
      ...(affiliateId && { affiliateId })
    };
    
    // 1. New Orders
    const newOrders = await this.prisma.order.aggregate({
      where: {
        ...whereClause,
        orderDate: { gte: startOfDay, lte: endOfDay },
        status: 'completed'
      },
      _count: true,
      _sum: {
        totalAmountBrl: true,
        totalAmountUsd: true
      }
    });
    
    // 2. New Subscriptions
    const newSubscriptions = await this.prisma.subscription.aggregate({
      where: {
        ...whereClause,
        startedAt: { gte: startOfDay, lte: endOfDay }
      },
      _count: true,
      _sum: {
        recurringAmountBrl: true,
        recurringAmountUsd: true
      }
    });
    
    // 3. Active Subscriptions (no final do dia)
    const activeSubscriptions = await this.prisma.subscription.count({
      where: {
        ...whereClause,
        status: 'active',
        isTrial: false,
        currentPeriodEnd: { gte: endOfDay }
      }
    });
    
    // 4. MRR (no final do dia)
    const mrr = await this.prisma.subscription.aggregate({
      where: {
        ...whereClause,
        status: 'active',
        isTrial: false,
        currentPeriodEnd: { gte: endOfDay }
      },
      _sum: {
        recurringAmountBrl: true,
        recurringAmountUsd: true
      }
    });
    
    // 5. New Trials
    const newTrials = await this.prisma.subscription.aggregate({
      where: {
        ...whereClause,
        trialStartDate: { gte: startOfDay, lte: endOfDay },
        isTrial: true
      },
      _count: true,
      _sum: {
        trialAmountBrl: true,
        trialAmountUsd: true
      }
    });
    
    // 6. Trial Conversions
    const trialConversions = await this.prisma.subscription.count({
      where: {
        ...whereClause,
        trialConvertedAt: { gte: startOfDay, lte: endOfDay }
      }
    });
    
    // 7. Trial Expired
    const trialExpired = await this.prisma.subscription.count({
      where: {
        ...whereClause,
        trialEndDate: { gte: startOfDay, lte: endOfDay },
        status: 'trial_expired'
      }
    });
    
    // 8. Trial Rate
    const totalTrialsInPeriod = await this.prisma.subscription.count({
      where: {
        ...whereClause,
        trialStartDate: { lte: endOfDay },
        isTrial: true
      }
    });
    const trialRate = totalTrialsInPeriod > 0 
      ? (trialConversions / totalTrialsInPeriod) * 100 
      : 0;
    
    // 9. Cancellations
    const cancellations = await this.prisma.subscription.aggregate({
      where: {
        ...whereClause,
        canceledAt: { gte: startOfDay, lte: endOfDay }
      },
      _count: true,
      _sum: {
        recurringAmountBrl: true,
        recurringAmountUsd: true
      }
    });
    
    const voluntaryChurn = await this.prisma.subscription.count({
      where: {
        ...whereClause,
        canceledAt: { gte: startOfDay, lte: endOfDay },
        cancellationType: 'voluntary'
      }
    });
    
    const involuntaryChurn = await this.prisma.subscription.count({
      where: {
        ...whereClause,
        canceledAt: { gte: startOfDay, lte: endOfDay },
        cancellationType: 'involuntary'
      }
    });
    
    // 10. Churn Rate
    const churnRate = activeSubscriptions > 0
      ? (cancellations._count / activeSubscriptions) * 100
      : 0;
    
    // 11. Transactions
    const transactions = await this.prisma.transaction.groupBy({
      by: ['status'],
      where: {
        ...whereClause,
        transactionDate: { gte: startOfDay, lte: endOfDay }
      },
      _count: true
    });
    
    const successfulTx = transactions.find(t => t.status === 'succeeded')?._count || 0;
    const failedTx = transactions.find(t => t.status === 'failed')?._count || 0;
    const refundedTx = transactions.find(t => t.status === 'refunded')?._count || 0;
    
    // 12. Revenue Breakdown
    const totalRevenue = await this.prisma.transaction.aggregate({
      where: {
        ...whereClause,
        transactionDate: { gte: startOfDay, lte: endOfDay },
        status: 'succeeded'
      },
      _sum: {
        grossAmountBrl: true,
        grossAmountUsd: true
      }
    });
    
    const recurringRevenue = await this.prisma.transaction.aggregate({
      where: {
        ...whereClause,
        transactionDate: { gte: startOfDay, lte: endOfDay },
        status: 'succeeded',
        transactionType: { in: ['trial_conversion', 'subscription_renewal'] }
      },
      _sum: {
        grossAmountBrl: true,
        grossAmountUsd: true
      }
    });
    
    const nonRecurringRevenue = {
      _sum: {
        grossAmountBrl: (totalRevenue._sum.grossAmountBrl || 0) - (recurringRevenue._sum.grossAmountBrl || 0),
        grossAmountUsd: (totalRevenue._sum.grossAmountUsd || 0) - (recurringRevenue._sum.grossAmountUsd || 0)
      }
    };
    
    // Montar objeto final
    return {
      metricDate: startOfDay,
      productId,
      offerId: null,  // Pode adicionar aggregação por offer depois
      platformId,
      affiliateId,
      
      newOrdersCount: newOrders._count,
      newOrdersRevenueBrl: newOrders._sum.totalAmountBrl || 0,
      newOrdersRevenueUsd: newOrders._sum.totalAmountUsd || 0,
      
      newSubscriptionsCount: newSubscriptions._count,
      newSubscriptionsRevenueBrl: newSubscriptions._sum.recurringAmountBrl || 0,
      newSubscriptionsRevenueUsd: newSubscriptions._sum.recurringAmountUsd || 0,
      activeSubscriptionsCount: activeSubscriptions,
      
      newTrialsCount: newTrials._count,
      trialRevenueBrl: newTrials._sum.trialAmountBrl || 0,
      trialRevenueUsd: newTrials._sum.trialAmountUsd || 0,
      trialConversionsCount: trialConversions,
      trialConversionRate: parseFloat(trialRate.toFixed(2)),
      trialExpiredCount: trialExpired,
      
      mrrBrl: mrr._sum.recurringAmountBrl || 0,
      mrrUsd: mrr._sum.recurringAmountUsd || 0,
      arrBrl: (mrr._sum.recurringAmountBrl || 0) * 12,
      arrUsd: (mrr._sum.recurringAmountUsd || 0) * 12,
      
      totalRevenueBrl: totalRevenue._sum.grossAmountBrl || 0,
      totalRevenueUsd: totalRevenue._sum.grossAmountUsd || 0,
      recurringRevenueBrl: recurringRevenue._sum.grossAmountBrl || 0,
      recurringRevenueUsd: recurringRevenue._sum.grossAmountUsd || 0,
      nonRecurringRevenueBrl: nonRecurringRevenue._sum.grossAmountBrl,
      nonRecurringRevenueUsd: nonRecurringRevenue._sum.grossAmountUsd,
      
      canceledSubscriptionsCount: cancellations._count,
      churnedRevenueBrl: cancellations._sum.recurringAmountBrl || 0,
      churnedRevenueUsd: cancellations._sum.recurringAmountUsd || 0,
      churnRate: parseFloat(churnRate.toFixed(2)),
      voluntaryChurnCount: voluntaryChurn,
      involuntaryChurnCount: involuntaryChurn,
      
      successfulTransactionsCount: successfulTx,
      failedTransactionsCount: failedTx,
      refundedTransactionsCount: refundedTx
    };
  }
  
  async upsert(metrics: DailyMetric) {
    return this.prisma.dailyMetric.upsert({
      where: {
        metricDate_productId_offerId_platformId_affiliateId: {
          metricDate: metrics.metricDate,
          productId: metrics.productId || null,
          offerId: metrics.offerId || null,
          platformId: metrics.platformId || null,
          affiliateId: metrics.affiliateId || null
        }
      },
      update: metrics,
      create: metrics
    });
  }
}
```

### Dashboard Endpoints

**Analytics Controller:**
| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/analytics/dashboard` | KPIs principais | `analytics:read` |
| GET | `/analytics/mrr` | Evolução de MRR | `analytics:read` |
| GET | `/analytics/churn` | Análise de churn | `analytics:read` |
| GET | `/analytics/trials` | Métricas de trials | `analytics:read` |
| GET | `/analytics/ltv` | Lifetime Value | `analytics:read` |
| GET | `/analytics/cohorts` | Análise de coortes | `analytics:read` |
| GET | `/analytics/revenue` | Breakdown de receita | `analytics:read` |
| POST | `/analytics/recalculate` | Forçar recálculo | `analytics:manage` |

**Query Params Comuns:**
```typescript
class DashboardFiltersDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;  // default: 30 days ago
  
  @IsOptional()
  @IsDateString()
  endDate?: string;  // default: today
  
  @IsOptional()
  @IsUUID()
  productId?: string;
  
  @IsOptional()
  @IsUUID()
  platformId?: string;
  
  @IsOptional()
  @IsString()
  acquisitionChannel?: string;
  
  @IsOptional()
  @IsUUID()
  affiliateId?: string;
  
  @IsOptional()
  @IsEnum(['BRL', 'USD'])
  currency?: string;  // default: BRL
}
```

**Exemplo de Response (Dashboard):**
```json
{
  "period": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "days": 31
  },
  "filters": {
    "productId": null,
    "platformId": null,
    "currency": "BRL"
  },
  "kpis": {
    "newSubscriptions": {
      "count": 813,
      "revenue": 23277.00,
      "change": "+12.5%"
    },
    "mrr": {
      "value": 22774.00,
      "activeCount": 796,
      "change": "+5.3%"
    },
    "arr": {
      "value": 273288.00
    },
    "newRevenue": {
      "value": 5000.00
    },
    "totalRevenue": {
      "value": 28277.00
    },
    "trial": {
      "count": 150,
      "revenue": 1350.00,
      "conversionRate": 40.0
    },
    "cancellations": {
      "count": 17,
      "revenue": 503.00
    },
    "churnRate": {
      "value": 6.6
    },
    "ltv": {
      "value": 4000.00
    },
    "cac": {
      "value": 2000.00
    },
    "ltvCacRatio": {
      "value": 2.0
    }
  },
  "charts": {
    "mrrEvolution": [
      { "month": "2024-09", "mrr": 18000 },
      { "month": "2024-10", "mrr": 20000 },
      { "month": "2024-11", "mrr": 21500 },
      { "month": "2024-12", "mrr": 22000 },
      { "month": "2025-01", "mrr": 22774 }
    ],
    "userGrowth": [
      { "month": "2024-09", "new": 650, "canceled": 50 },
      { "month": "2024-10", "new": 720, "canceled": 45 },
      { "month": "2024-11", "new": 780, "canceled": 60 },
      { "month": "2024-12", "new": 800, "canceled": 55 },
      { "month": "2025-01", "new": 813, "canceled": 17 }
    ]
  }
}
```

### Estrutura de Módulos

```
src/modules/analytics/
├── analytics.module.ts
├── analytics.controller.ts
├── metrics/
│   ├── daily-metrics.service.ts
│   ├── metrics-calculator.service.ts
│   └── metrics-queries.service.ts
├── ltv/
│   └── customer-ltv.service.ts
├── cohort/
│   └── cohort-analysis.service.ts
├── marketing/
│   └── marketing-spend.service.ts
└── dto/
    ├── dashboard-filters.dto.ts
    ├── calculate-metrics.dto.ts
    └── dashboard-response.dto.ts
```

### Testes Necessários

**Unit Tests:**
- ✅ DailyMetricsService: cálculo correto de MRR
- ✅ DailyMetricsService: churn rate calculation
- ✅ DailyMetricsService: trial conversion rate
- ✅ CustomerLtvService: LTV calculation
- ✅ CohortAnalysisService: retention rates

**Integration Tests:**
- ✅ Webhook cria subscription → enfileira metrics job → metrics atualizadas
- ✅ Recalcular métricas de dias anteriores
- ✅ Dashboard query com filtros (produto, plataforma, afiliado)
- ✅ Currency toggle (BRL ↔ USD)

**Performance Tests:**
- ✅ Dashboard load < 200ms
- ✅ Metrics calculation < 30s após webhook
- ✅ Nightly recalculation completa em < 10min

---

## Phase 6: Affiliates System (⏳ PENDENTE)

### Objetivos

Sistema completo de tracking de afiliados:
- ✅ Criação automática de affiliates via webhooks
- ✅ Atualização de estatísticas em tempo real
- ✅ Classificação por tier (Bronze, Silver, Gold, Diamond)
- ✅ Dashboard específico para afiliados
- ✅ Top performers e análise de conversão

### Conceitos-Chave

**Affiliate:**
- Parceiro que promove produtos e gera vendas
- Identificado por código único por plataforma
- Rastreado via UTMs ou affiliate_id nos webhooks
- Performance medida por vendas e receita gerada

**O que NÃO fazemos:**
- ❌ Gestão de signup de afiliados (feito na plataforma)
- ❌ Processamento de pagamentos de comissão
- ❌ Aprovação/rejeição de afiliados
- ✅ **Apenas tracking de performance para análise de ROI**

### Tabela (Já Criada no Schema)

**affiliates:**
- `id`, `platform_id`, `external_affiliate_id`
- `name`, `email`, `phone`
- `tier` - "bronze", "silver", "gold", "diamond"
- `commission_rate` - Apenas referência, não processamos pagamentos
- `instagram_handle`, `youtube_handle`, `tiktok_handle`, `twitter_handle`
- `total_sales_count`, `total_revenue_brl`, `total_revenue_usd`
- `first_sale_at`, `last_sale_at`
- `is_active`, `metadata`
- `created_at`, `updated_at`

### Regras de Negócio

**1. Criação Automática:**
```
Quando webhook contém affiliate_id:

1. Verificar se affiliate existe (platform_id + external_affiliate_id)
2. Se NÃO existe → Criar registro automático
3. Se existe → Atualizar last_sale_at
4. Atualizar estatísticas (total_sales_count, total_revenue)
```

**2. Atualização de Stats:**
```
Em cada transação bem-sucedida com affiliate_id:
1. Incrementar total_sales_count += 1
2. Somar amount ao total_revenue_brl/usd
3. Atualizar last_sale_at = transaction_date
4. Se primeira venda → Definir first_sale_at
5. Recalcular tier baseado em revenue
```

**3. Classificação por Tier:**
```
Baseado em total_revenue_brl (mensal/total):

Bronze:   R$0 - R$10.000
Silver:   R$10.001 - R$50.000
Gold:     R$50.001 - R$100.000
Diamond:  R$100.000+

Recalculado:
- Em tempo real após cada venda
- Nightly job (validação)
```

**4. Vinculação a Orders/Subscriptions:**
```
orders.affiliate_id → FK affiliates.id
subscriptions.affiliate_id → FK affiliates.id

Permite queries:
- Quantos customers vieram do afiliado X?
- Qual o LTV médio dos customers do afiliado Y?
- Qual a taxa de churn por afiliado?
```

### Fluxo de Processamento

**Exemplo: Hotmart envia webhook com afiliado**

```
1. Webhook payload contém:
   {
   "affiliates": [{
   "affiliate_code": "AFF123",
   "name": "João Silva",
   "email": "joao@example.com"
   }],
   "purchase": { ... }
   }
   ↓
2. HotmartProvider.normalizeWebhook() extrai:
   affiliateId: "AFF123"
   ↓
3. SubscriptionCreatedHandler processa:
   ↓
4. AffiliatesService.findOrCreate("AFF123"):
  - Buscar affiliate (platform_id="hotmart", external_affiliate_id="AFF123")
  - Se não existe → Criar com dados do webhook
  - Retornar affiliate.id
    ↓
5. Criar subscription vinculada:
   subscription.affiliate_id = affiliate.id
   ↓
6. Criar transaction vinculada:
   transaction → order → order.affiliate_id = affiliate.id
   ↓
7. AffiliatesService.updateStats(affiliate.id, transaction.amount):
  - total_sales_count += 1
  - total_revenue_brl += transaction.gross_amount_brl
  - total_revenue_usd += transaction.gross_amount_usd
  - last_sale_at = transaction.transaction_date
  - Recalcular tier
    ↓
8. Enfileirar job: update-affiliate-metrics
```

### Services

**AffiliatesService:**
```typescript
@Injectable()
export class AffiliatesService {
  constructor(
    private prisma: PrismaService,
    private tierCalculator: TierCalculatorService
  ) {}
  
  async findOrCreate(
    platformId: string,
    externalAffiliateId: string,
    data?: Partial<CreateAffiliateDto>
  ): Promise<Affiliate> {
    
    let affiliate = await this.prisma.affiliate.findUnique({
      where: {
        platformId_externalAffiliateId: {
          platformId,
          externalAffiliateId
        }
      }
    });
    
    if (!affiliate) {
      affiliate = await this.prisma.affiliate.create({
        data: {
          platformId,
          externalAffiliateId,
          name: data?.name,
          email: data?.email,
          phone: data?.phone,
          tier: 'bronze',
          totalSalesCount: 0,
          totalRevenueBrl: 0,
          totalRevenueUsd: 0,
          isActive: true
        }
      });
      
      console.log(`✅ New affiliate created: ${externalAffiliateId}`);
    }
    
    return affiliate;
  }
  
  async updateStats(
    affiliateId: string,
    transactionAmountBrl: number,
    transactionAmountUsd: number,
    transactionDate: Date
  ): Promise<Affiliate> {
    
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id: affiliateId }
    });
    
    if (!affiliate) {
      throw new NotFoundException('Affiliate not found');
    }
    
    const newRevenueBrl = affiliate.totalRevenueBrl + transactionAmountBrl;
    const newTier = this.tierCalculator.calculate(newRevenueBrl);
    
    const updated = await this.prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        totalSalesCount: { increment: 1 },
        totalRevenueBrl: { increment: transactionAmountBrl },
        totalRevenueUsd: { increment: transactionAmountUsd },
        lastSaleAt: transactionDate,
        firstSaleAt: affiliate.firstSaleAt || transactionDate,
        tier: newTier
      }
    });
    
    // Se mudou de tier, notificar (opcional)
    if (newTier !== affiliate.tier) {
      console.log(`🎉 Affiliate ${affiliate.name} upgraded to ${newTier}!`);
      // await this.notificationService.send(...);
    }
    
    return updated;
  }
  
  async getTopPerformers(
    limit: number = 20,
    filters?: {
      platformId?: string;
      tier?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    // Query para top affiliates com métricas agregadas
    const affiliates = await this.prisma.affiliate.findMany({
      where: {
        ...(filters?.platformId && { platformId: filters.platformId }),
        ...(filters?.tier && { tier: filters.tier }),
        isActive: true
      },
      orderBy: {
        totalRevenueBrl: 'desc'
      },
      take: limit,
      include: {
        platform: true,
        _count: {
          select: {
            orders: true,
            subscriptions: true
          }
        }
      }
    });
    
    // Enriquecer com métricas adicionais
    const enriched = await Promise.all(
      affiliates.map(async (affiliate) => {
        const [avgTicket, conversionRate, ltv] = await Promise.all([
          this.calculateAvgTicket(affiliate.id, filters),
          this.calculateConversionRate(affiliate.id, filters),
          this.calculateAvgLtv(affiliate.id)
        ]);
        
        return {
          ...affiliate,
          metrics: {
            avgTicketBrl: avgTicket,
            conversionRate,
            avgLtvBrl: ltv
          }
        };
      })
    );
    
    return enriched;
  }
  
  private async calculateAvgTicket(
    affiliateId: string,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<number> {
    const result = await this.prisma.transaction.aggregate({
      where: {
        order: { affiliateId },
        status: 'succeeded',
        ...(filters?.startDate && {
          transactionDate: { gte: filters.startDate }
        }),
        ...(filters?.endDate && {
          transactionDate: { lte: filters.endDate }
        })
      },
      _avg: {
        grossAmountBrl: true
      }
    });
    
    return result._avg.grossAmountBrl || 0;
  }
  
  private async calculateConversionRate(
    affiliateId: string,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<number> {
    // Taxa de conversão = (Subscriptions ativas / Total de trials) × 100
    const trials = await this.prisma.subscription.count({
      where: {
        affiliateId,
        isTrial: true,
        ...(filters?.startDate && {
          trialStartDate: { gte: filters.startDate }
        })
      }
    });
    
    const converted = await this.prisma.subscription.count({
      where: {
        affiliateId,
        trialConvertedAt: { not: null },
        ...(filters?.startDate && {
          trialStartDate: { gte: filters.startDate }
        })
      }
    });
    
    return trials > 0 ? (converted / trials) * 100 : 0;
  }
  
  private async calculateAvgLtv(affiliateId: string): Promise<number> {
    const customers = await this.prisma.customer.findMany({
      where: {
        orders: {
          some: { affiliateId }
        }
      },
      select: { id: true }
    });
    
    if (customers.length === 0) return 0;
    
    const ltv = await this.prisma.customerLtv.aggregate({
      where: {
        customerId: { in: customers.map(c => c.id) }
      },
      _avg: {
        ltvBrl: true
      }
    });
    
    return ltv._avg.ltvBrl || 0;
  }
  
  async getPerformanceOverTime(
    affiliateId: string,
    startDate: Date,
    endDate: Date
  ) {
    // Agregar por mês
    const months = this.generateMonthsArray(startDate, endDate);
    
    const data = await Promise.all(
      months.map(async (month) => {
        const monthStart = new Date(month.year, month.month, 1);
        const monthEnd = new Date(month.year, month.month + 1, 0, 23, 59, 59);
        
        const [sales, revenue] = await Promise.all([
          this.prisma.transaction.count({
            where: {
              order: { affiliateId },
              transactionDate: { gte: monthStart, lte: monthEnd },
              status: 'succeeded'
            }
          }),
          this.prisma.transaction.aggregate({
            where: {
              order: { affiliateId },
              transactionDate: { gte: monthStart, lte: monthEnd },
              status: 'succeeded'
            },
            _sum: {
              grossAmountBrl: true
            }
          })
        ]);
        
        return {
          month: `${month.year}-${String(month.month + 1).padStart(2, '0')}`,
          salesCount: sales,
          revenueBrl: revenue._sum.grossAmountBrl || 0
        };
      })
    );
    
    return data;
  }
  
  private generateMonthsArray(start: Date, end: Date) {
    const months = [];
    const current = new Date(start);
    
    while (current <= end) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth()
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  }
}
```

**TierCalculatorService:**
```typescript
@Injectable()
export class TierCalculatorService {
  private readonly tiers = [
    { name: 'diamond', minRevenue: 100000 },
    { name: 'gold', minRevenue: 50001 },
    { name: 'silver', minRevenue: 10001 },
    { name: 'bronze', minRevenue: 0 }
  ];
  
  calculate(totalRevenueBrl: number): string {
    for (const tier of this.tiers) {
      if (totalRevenueBrl >= tier.minRevenue) {
        return tier.name;
      }
    }
    return 'bronze';
  }
  
  @Cron('0 5 * * *')  // Todo dia às 5am
  async recalculateAllTiers() {
    const affiliates = await this.prisma.affiliate.findMany({
      where: { isActive: true }
    });
    
    for (const affiliate of affiliates) {
      const newTier = this.calculate(affiliate.totalRevenueBrl);
      
      if (newTier !== affiliate.tier) {
        await this.prisma.affiliate.update({
          where: { id: affiliate.id },
          data: { tier: newTier }
        });
        
        console.log(`Updated ${affiliate.name} tier: ${affiliate.tier} → ${newTier}`);
      }
    }
  }
}
```

### Endpoints

**Affiliates Controller:**
| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/affiliates` | Listar afiliados | `affiliates:read` |
| GET | `/affiliates/top` | Top 20 performers | `affiliates:read` |
| GET | `/affiliates/:id` | Detalhes do afiliado | `affiliates:read` |
| GET | `/affiliates/:id/performance` | Performance ao longo do tempo | `affiliates:read` |
| GET | `/affiliates/:id/customers` | Clientes gerados | `affiliates:read` |
| PATCH | `/affiliates/:id` | Atualizar dados (manual) | `affiliates:update` |
| PATCH | `/affiliates/:id/deactivate` | Desativar afiliado | `affiliates:manage` |

**Query Params:**
```typescript
class AffiliatesFiltersDto {
  @IsOptional()
  @IsUUID()
  platformId?: string;
  
  @IsOptional()
  @IsEnum(['bronze', 'silver', 'gold', 'diamond'])
  tier?: string;
  
  @IsOptional()
  @IsDateString()
  startDate?: string;
  
  @IsOptional()
  @IsDateString()
  endDate?: string;
  
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;  // default 20
  
  @IsOptional()
  @IsEnum(['revenue', 'sales', 'conversionRate'])
  sortBy?: string;  // default 'revenue'
}
```

### Dashboard de Afiliados

**Visão Geral (/analytics/affiliates):**

**Cards Principais:**
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Total Afiliados │ Receita Total   │ Ticket Médio    │ Taxa Conversão  │
│ 150             │ R$ 1.2M         │ R$ 8.000        │ 42%             │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

**Filtros:**
- Plataforma (Stripe, Hotmart, Cartpanda)
- Tier (Bronze, Silver, Gold, Diamond)
- Período (Last 30 days, Last 90 days, This year, Custom)

**Tabela Top Performers:**
| Nome | Email | Tier | Vendas | Receita | Ticket Médio | Conversão | Ações |
|------|-------|------|--------|---------|--------------|-----------|-------|
| João Silva | joao@... | 💎 Diamond | 450 | R$ 180k | R$ 400 | 45% | 👁️ |
| Maria Santos | maria@... | 🥇 Gold | 280 | R$ 85k | R$ 303 | 38% | 👁️ |
| ... | ... | ... | ... | ... | ... | ... | ... |

**Gráfico: Receita por Tier (Pizza)**
- Diamond: 45%
- Gold: 30%
- Silver: 20%
- Bronze: 5%

**Gráfico: Performance ao Longo do Tempo (Linha)**
- Eixo X: Meses
- Eixo Y: Receita
- Linhas: Top 5 afiliados

**Detalhes de Afiliado (/analytics/affiliates/:id):**

**Header:**
```
João Silva (@joaosilva_oficial)
💎 Diamond Tier | 450 vendas | R$ 180.000 gerados
🔗 Instagram | YouTube | TikTok
📧 joao@example.com | 📱 (11) 99999-9999
```

**KPIs:**
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Receita Total   │ Ticket Médio    │ LTV Médio       │ Taxa Conversão  │
│ R$ 180.000      │ R$ 400          │ R$ 4.200        │ 45%             │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘

┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Primeira Venda  │ Última Venda    │ Clientes Únicos │ Churn Médio     │
│ 15/03/2024      │ 20/10/2025      │ 385             │ 5.2%            │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

**Gráfico: Performance Mensal**
- Vendas por mês (barras)
- Receita por mês (linha)

**Tabela: Produtos Mais Vendidos**
| Produto | Vendas | Receita | % do Total |
|---------|--------|---------|------------|
| Holymind Monthly | 320 | R$ 125k | 69% |
| Holyguide Annual | 80 | R$ 40k | 22% |
| ... | ... | ... | ... |

**Tabela: Clientes Gerados (Últimos 10)**
| Cliente | Email | Primeira Compra | LTV | Status |
|---------|-------|-----------------|-----|--------|
| Pedro Lima | pedro@... | 18/10/2025 | R$ 4.5k | ✅ Ativo |
| ... | ... | ... | ... | ... |

### Integrações com Outros Módulos

**1. daily_metrics com affiliates:**
```sql
-- Métricas diárias filtradas por afiliado
SELECT 
  metric_date,
  new_subscriptions_count,
  new_subscriptions_revenue_brl,
  mrr_brl,
  churn_rate
FROM daily_metrics
WHERE affiliate_id = :affiliate_id
  AND metric_date >= :start_date
ORDER BY metric_date DESC;
```

**2. Afiliado com maior churn:**
```sql
SELECT 
  a.name,
  a.tier,
  COUNT(s.id) FILTER (WHERE s.status = 'canceled') as cancellations,
  COUNT(s.id) FILTER (WHERE s.status = 'active') as active,
  (COUNT(s.id) FILTER (WHERE s.status = 'canceled')::float / 
   NULLIF(COUNT(s.id), 0) * 100) as churn_rate
FROM affiliates a
LEFT JOIN subscriptions s ON s.affiliate_id = a.id
GROUP BY a.id
HAVING COUNT(s.id) > 10  -- Mínimo de vendas para ser relevante
ORDER BY churn_rate DESC
LIMIT 10;
```

**3. ROI por Afiliado:**
```sql
-- Se tivermos comissões pagas (futuro)
SELECT 
  a.name,
  a.total_revenue_brl as revenue_generated,
  COALESCE(SUM(ap.amount_brl), 0) as commission_paid,
  (a.total_revenue_brl - COALESCE(SUM(ap.amount_brl), 0)) as net_revenue,
  ((a.total_revenue_brl - COALESCE(SUM(ap.amount_brl), 0)) / 
   NULLIF(a.total_revenue_brl, 0) * 100) as roi_percentage
FROM affiliates a
LEFT JOIN affiliate_payments ap ON ap.affiliate_id = a.id
GROUP BY a.id
ORDER BY net_revenue DESC;
```

### Estrutura de Módulos

```
src/modules/affiliates/
├── affiliates.module.ts
├── affiliates.controller.ts
├── affiliates.service.ts
├── tier-calculator.service.ts
└── dto/
    ├── create-affiliate.dto.ts
    ├── update-affiliate.dto.ts
    ├── affiliates-filters.dto.ts
    └── affiliate-performance.dto.ts
```

### Testes Necessários

**Unit Tests:**
- ✅ TierCalculatorService: classificação correta por receita
- ✅ AffiliatesService: findOrCreate (deduplicação)
- ✅ AffiliatesService: updateStats (incrementos corretos)
- ✅ AffiliatesService: cálculo de métricas (avgTicket, conversionRate, ltv)

**Integration Tests:**
- ✅ Webhook com affiliate_id → criar affiliate → vincular à subscription
- ✅ Transaction com affiliate → atualizar stats → recalcular tier
- ✅ Top performers query com múltiplos filtros
- ✅ Performance over time com agregação mensal

**Business Logic Tests:**
- ✅ Afiliado sobe de Bronze → Silver após R$10.001
- ✅ Afiliado com 100 vendas e 45 conversões = 45% conversion rate
- ✅ LTV médio dos customers de um afiliado calculado corretamente

---

## Phase 7: Audit System (⏳ PENDENTE)

### Objetivos

Sistema completo de auditoria e alertas:
- ✅ Log de todas as operações críticas
- ✅ Rastreamento de mudanças (before/after)
- ✅ Alertas automáticos para anomalias
- ✅ Retenção de 2 anos
- ✅ Integração com Slack/Email

### Conceitos-Chave

**Audit Log:**
- Registro imutável de operações no sistema
- Rastreia: quem, o quê, quando, onde, por quê
- Usado para compliance, debugging e segurança

**Audit Alert:**
- Notificação automática quando evento crítico ocorre
- Baseado em regras configuráveis
- Canais: Slack, Email, SMS (futuro)

**O que Auditar:**
- ✅ Mudanças em subscriptions (status, cancelamentos)
- ✅ Transações (pagamentos, reembolsos, falhas)
- ✅ Mudanças em permissões
- ✅ Credenciais de integração (create/update/delete)
- ✅ Modificações de customers

**O que NÃO Auditar:**
- ❌ Queries de leitura (SELECT)
- ❌ Views de dashboard
- ❌ Geração de relatórios

### Tabelas (Já Criadas no Schema)

**audit_logs:**
- `id`, `entity_type`, `entity_id`, `action`
- `old_values`, `new_values`, `changed_fields` (JSONB)
- `user_id`, `source`, `source_details`
- `ip_address`, `user_agent`
- `created_at`

**audit_alert_rules:**
- `id`, `rule_name`, `description`
- `entity_type`, `action`
- `condition` (JSONB) - Regras de trigger
- `alert_channel`, `alert_recipients` (JSONB)
- `is_enabled`
- `created_at`, `updated_at`

**audit_alerts_sent:**
- `id`, `alert_rule_id`, `audit_log_id`
- `alert_channel`, `alert_recipient`
- `sent_at`, `delivery_status`, `error_message`

### Implementação

**AuditService:**
```typescript
@Injectable()
export class AuditService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}
  
  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const log = await this.prisma.auditLog.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        action: dto.action,
        oldValues: dto.oldValues,
        newValues: dto.newValues,
        changedFields: dto.changedFields,
        userId: dto.userId,
        source: dto.source,
        sourceDetails: dto.sourceDetails,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent
      }
    });
    
    // Emitir evento para processamento de alertas
    this.eventEmitter.emit('audit.logged', log);
    
    return log;
  }
  
  async logSubscriptionChange(
    subscriptionId: string,
    action: string,
    oldData: any,
    newData: any,
    context: {
      userId?: string;
      source: string;
      ipAddress?: string;
    }
  ) {
    const changedFields = this.getChangedFields(oldData, newData);
    
    return this.log({
      entityType: 'subscription',
      entityId: subscriptionId,
      action,
      oldValues: oldData,
      newValues: newData,
      changedFields,
      userId: context.userId,
      source: context.source,
      sourceDetails: {},
      ipAddress: context.ipAddress
    });
  }
  
  async logTransactionEvent(
    transactionId: string,
    action: string,
    data: any,
    context: {
      source: string;
      platformId: string;
    }
  ) {
    return this.log({
      entityType: 'transaction',
      entityId: transactionId,
      action,
      newValues: data,
      source: context.source,
      sourceDetails: {
        platformId: context.platformId
      }
    });
  }
  
  private getChangedFields(oldData: any, newData: any): string[] {
    if (!oldData || !newData) return [];
    
    const changed = [];
    const allKeys = new Set([
      ...Object.keys(oldData),
      ...Object.keys(newData)
    ]);
    
    for (const key of allKeys) {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changed.push(key);
      }
    }
    
    return changed;
  }
  
  async search(filters: AuditSearchDto) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.entityId && { entityId: filters.entityId }),
        ...(filters.action && { action: filters.action }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.source && { source: filters.source }),
        ...(filters.startDate && {
          createdAt: { gte: filters.startDate }
        }),
        ...(filters.endDate && {
          createdAt: { lte: filters.endDate }
        })
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        }
      }
    });
  }
}
```

**AuditAlertService:**
```typescript
@Injectable()
export class AuditAlertService {
  constructor(
    private prisma: PrismaService,
    private slackService: SlackAlertService,
    private emailService: EmailAlertService
  ) {}
  
  @OnEvent('audit.logged')
  async processAuditLog(log: AuditLog) {
    const rules = await this.getMatchingRules(log.entityType, log.action);
    
    for (const rule of rules) {
      if (!rule.isEnabled) continue;
      
      const shouldAlert = await this.evaluateCondition(rule.condition, log);
      
      if (shouldAlert) {
        await this.sendAlert(rule, log);
      }
    }
  }
  
  private async getMatchingRules(
    entityType: string,
    action?: string
  ): Promise<AuditAlertRule[]> {
    return this.prisma.auditAlertRule.findMany({
      where: {
        entityType,
        ...(action && { action }),
        isEnabled: true
      }
    });
  }
  
  private async evaluateCondition(
    condition: any,
    log: AuditLog
  ): Promise<boolean> {
    // Sempre alertar
    if (condition.always === true) {
      return true;
    }
    
    // Verificar threshold em janela de tempo
    if (condition.window && condition.threshold) {
      const windowStart = new Date(
        log.createdAt.getTime() - this.parseWindow(condition.window)
      );
      
      const count = await this.prisma.auditLog.count({
        where: {
          entityType: log.entityType,
          action: log.action,
          createdAt: { gte: windowStart }
        }
      });
      
      return this.compare(count, condition.threshold, condition.comparison);
    }
    
    // Verificar mudança em campo específico
    if (condition.field && condition.value) {
      const changedFields = log.changedFields as string[];
      if (!changedFields.includes(condition.field)) {
        return false;
      }
      
      const newValue = log.newValues?.[condition.field];
      return newValue === condition.value;
    }
    
    return false;
  }
  
  private parseWindow(window: string): number {
    // "1 hour" → ms
    const match = window.match(/(\d+)\s+(minute|hour|day)/);
    if (!match) return 0;
    
    const [, amount, unit] = match;
    const multipliers = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000
    };
    
    return parseInt(amount) * multipliers[unit];
  }
  
  private compare(value: number, threshold: number, comparison: string): boolean {
    switch (comparison) {
      case 'greater_than': return value > threshold;
      case 'greater_than_or_equal': return value >= threshold;
      case 'less_than': return value < threshold;
      case 'less_than_or_equal': return value <= threshold;
      case 'equal': return value === threshold;
      default: return false;
    }
  }
  
  private async sendAlert(rule: AuditAlertRule, log: AuditLog) {
    const recipients = rule.alertRecipients as string[];
    
    for (const recipient of recipients) {
      try {
        let sent = false;
        
        if (rule.alertChannel === 'slack') {
          await this.slackService.send(recipient, this.formatSlackMessage(rule, log));
          sent = true;
        } else if (rule.alertChannel === 'email') {
          await this.emailService.send(recipient, this.formatEmailMessage(rule, log));
          sent = true;
        }
        
        // Registrar envio
        await this.prisma.auditAlertSent.create({
          data: {
            alertRuleId: rule.id,
            auditLogId: log.id,
            alertChannel: rule.alertChannel,
            alertRecipient: recipient,
            deliveryStatus: sent ? 'sent' : 'failed'
          }
        });
        
      } catch (error) {
        console.error(`Failed to send alert to ${recipient}:`, error);
        
        await this.prisma.auditAlertSent.create({
          data: {
            alertRuleId: rule.id,
            auditLogId: log.id,
            alertChannel: rule.alertChannel,
            alertRecipient: recipient,
            deliveryStatus: 'failed',
            errorMessage: error.message
          }
        });
      }
    }
  }
  
  private formatSlackMessage(rule: AuditAlertRule, log: AuditLog): any {
    return {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🚨 ${rule.ruleName}`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Entity:*\n${log.entityType}`
            },
            {
              type: 'mrkdwn',
              text: `*Action:*\n${log.action}`
            },
            {
              type: 'mrkdwn',
              text: `*Entity ID:*\n${log.entityId}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n${log.createdAt.toISOString()}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Source:* ${log.source}\n*User:* ${log.userId || 'System'}`
          }
        },
        ...(log.changedFields && log.changedFields.length > 0 ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Changed Fields:* ${log.changedFields.join(', ')}`
          }
        }] : []),
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Rule: ${rule.ruleName} | Alert ID: ${log.id}`
            }
          ]
        }
      ]
    };
  }
  
  private formatEmailMessage(rule: AuditAlertRule, log: AuditLog): any {
    return {
      subject: `🚨 ${rule.ruleName}`,
      html: `
        <h2>${rule.ruleName}</h2>
        <p><strong>Description:</strong> ${rule.description || 'N/A'}</p>
        
        <h3>Event Details</h3>
        <ul>
          <li><strong>Entity Type:</strong> ${log.entityType}</li>
          <li><strong>Entity ID:</strong> ${log.entityId}</li>
          <li><strong>Action:</strong> ${log.action}</li>
          <li><strong>Time:</strong> ${log.createdAt.toISOString()}</li>
          <li><strong>Source:</strong> ${log.source}</li>
          <li><strong>User:</strong> ${log.userId || 'System'}</li>
        </ul>
        
        ${log.changedFields && log.changedFields.length > 0 ? `
          <h3>Changed Fields</h3>
          <ul>
            ${log.changedFields.map(field => `<li>${field}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${log.oldValues && log.newValues ? `
          <h3>Changes</h3>
          <table border="1" cellpadding="5">
            <tr>
              <th>Field</th>
              <th>Old Value</th>
              <th>New Value</th>
            </tr>
            ${log.changedFields.map(field => `
              <tr>
                <td>${field}</td>
                <td>${JSON.stringify(log.oldValues[field])}</td>
                <td>${JSON.stringify(log.newValues[field])}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}
      `
    };
  }
}
```

**SlackAlertService:**
```typescript
@Injectable()
export class SlackAlertService {
  private webhook: WebClient;
  
  constructor(private configService: ConfigService) {
    const token = this.configService.get('SLACK_BOT_TOKEN');
    this.webhook = new WebClient(token);
  }
  
  async send(channel: string, message: any) {
    await this.webhook.chat.postMessage({
      channel,
      ...message
    });
  }
}
```

### Seed de Regras Padrão

**Regras Iniciais (Phase 7 seed):**
```typescript
const defaultRules = [
  {
    ruleName: 'High Cancellation Rate',
    description: 'Alerta quando mais de 50 cancelamentos em 1 hora',
    entityType: 'subscription',
    action: 'canceled',
    condition: {
      window: '1 hour',
      threshold: 50,
      comparison: 'greater_than'
    },
    alertChannel: 'slack',
    alertRecipients: ['#alerts-subscriptions'],
    isEnabled: true
  },
  {
    ruleName: 'High Payment Failure Rate',
    description: 'Alerta quando mais de 100 falhas de pagamento em 1 hora',
    entityType: 'transaction',
    action: 'failed',
    condition: {
      window: '1 hour',
      threshold: 100,
      comparison: 'greater_than'
    },
    alertChannel: 'slack',
    alertRecipients: ['#alerts-payments'],
    isEnabled: true
  },
  {
    ruleName: 'Integration Credential Changed',
    description: 'Alerta sempre que credenciais são modificadas',
    entityType: 'integration_credentials',
    action: 'updated',
    condition: {
      always: true
    },
    alertChannel: 'slack',
    alertRecipients: ['#alerts-security', '@admin'],
    isEnabled: true
  },
  {
    ruleName: 'Bulk Subscription Status Change',
    description: 'Alerta quando mais de 20 subscriptions mudam status em 5 minutos',
    entityType: 'subscription',
    action: 'status_changed',
    condition: {
      window: '5 minutes',
      threshold: 20,
      comparison: 'greater_than'
    },
    alertChannel: 'slack',
    alertRecipients: ['#alerts-system'],
    isEnabled: true
  },
  {
    ruleName: 'Low Trial Conversion Rate',
    description: 'Alerta quando taxa de conversão de trial < 20% no dia',
    entityType: 'subscription',
    action: 'trial_expired',
    condition: {
      window: '1 day',
      conversionRate: 20,
      comparison: 'less_than'
    },
    alertChannel: 'slack',
    alertRecipients: ['#alerts-marketing'],
    isEnabled: true
  },
  {
    ruleName: 'Permission Changes',
    description: 'Alerta quando permissões de usuário são alteradas',
    entityType: 'user_roles',
    action: 'updated',
    condition: {
      always: true
    },
    alertChannel: 'slack',
    alertRecipients: ['#alerts-security'],
    isEnabled: true
  }
];

for (const rule of defaultRules) {
  await prisma.auditAlertRule.upsert({
    where: { ruleName: rule.ruleName },
    update: {},
    create: rule
  });
}
```

### Interceptor de Audit (Automático)

**AuditInterceptor:**
```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;
    
    // Apenas auditar operações de escrita
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }
    
    // Capturar dados antes da execução
    const beforeData = { ...request.body };
    
    return next.handle().pipe(
      tap(async (response) => {
        // Extrair informações da resposta para audit
        const entityInfo = this.extractEntityInfo(url, response);
        
        if (entityInfo) {
          await this.auditService.log({
            entityType: entityInfo.type,
            entityId: entityInfo.id,
            action: this.mapHttpMethodToAction(method),
            oldValues: method === 'PATCH' || method === 'PUT' ? beforeData : undefined,
            newValues: response,
            userId: user?.userId,
            source: 'api',
            sourceDetails: { endpoint: url, method },
            ipAddress: ip,
            userAgent: headers['user-agent']
          });
        }
      })
    );
  }
  
  private extractEntityInfo(url: string, response: any): { type: string; id: string } | null {
    // Detectar tipo de entidade pela URL
    const patterns = [
      { regex: /\/subscriptions\/([a-f0-9-]+)/, type: 'subscription' },
      { regex: /\/customers\/([a-f0-9-]+)/, type: 'customer' },
      { regex: /\/transactions\/([a-f0-9-]+)/, type: 'transaction' },
      { regex: /\/users\/([a-f0-9-]+)/, type: 'user' },
      { regex: /\/products\/([a-f0-9-]+)/, type: 'product' },
    ];
    
    for (const { regex, type } of patterns) {
      const match = url.match(regex);
      if (match) {
        return { type, id: match[1] };
      }
    }
    
    // Fallback: tentar extrair da resposta
    if (response?.id) {
      return { type: 'unknown', id: response.id };
    }
    
    return null;
  }
  
  private mapHttpMethodToAction(method: string): string {
    const map = {
      POST: 'created',
      PATCH: 'updated',
      PUT: 'updated',
      DELETE: 'deleted'
    };
    return map[method] || 'modified';
  }
}
```

**Aplicar Interceptor:**
```typescript
// app.module.ts
providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: AuditInterceptor
  }
]
```

### Limpeza Automática (2 anos)

**AuditCleanupService:**
```typescript
@Injectable()
export class AuditCleanupService {
  constructor(private prisma: PrismaService) {}
  
  @Cron('0 2 * * 0')  // Todo domingo às 2am
  async cleanupOldLogs() {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    // Opcional: Arquivar para S3 antes de deletar
    await this.archiveToS3(twoYearsAgo);
    
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: twoYearsAgo }
      }
    });
    
    console.log(`🗑️ Cleaned up ${result.count} audit logs older than 2 years`);
    
    // Notificar admin
    if (result.count > 0) {
      // await slackService.send(...);
    }
  }
  
  private async archiveToS3(beforeDate: Date) {
    const oldLogs = await this.prisma.auditLog.findMany({
      where: { createdAt: { lt: beforeDate } },
      take: 10000  // Processar em lotes
    });
    
    if (oldLogs.length === 0) return;
    
    const filename = `audit-logs-archive-${Date.now()}.json.gz`;
    const compressed = zlib.gzipSync(JSON.stringify(oldLogs));
    
    // Upload to S3 (pseudo-código)
    // await s3.upload({
    //   Bucket: 'analytics-platform-archives',
    //   Key: `audit-logs/${filename}`,
    //   Body: compressed
    // });
    
    console.log(`📦 Archived ${oldLogs.length} logs to S3: ${filename}`);
  }
}
```

### Endpoints

**Audit Controller:**
| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/audit/logs` | Buscar audit logs | `audit-logs:read` |
| GET | `/audit/logs/:id` | Detalhes de um log | `audit-logs:read` |
| GET | `/audit/entity/:type/:id` | Histórico de uma entidade | `audit-logs:read` |
| GET | `/audit/rules` | Listar regras de alerta | `audit-logs:manage` |
| POST | `/audit/rules` | Criar regra de alerta | `audit-logs:manage` |
| PATCH | `/audit/rules/:id` | Atualizar regra | `audit-logs:manage` |
| DELETE | `/audit/rules/:id` | Deletar regra | `audit-logs:manage` |
| GET | `/audit/alerts` | Histórico de alertas enviados | `audit-logs:read` |

### Estrutura de Módulos

```
src/modules/audit/
├── audit.module.ts
├── audit.service.ts
├── audit-logger.service.ts
├── audit.controller.ts
├── audit-interceptor.ts
├── alerts/
│   ├── audit-alert.service.ts
│   ├── alert-rules.service.ts
│   └── channels/
│       ├── slack-alert.service.ts
│       └── email-alert.service.ts
├── cleanup/
│   └── audit-cleanup.service.ts
└── dto/
    ├── create-audit-log.dto.ts
    ├── audit-search.dto.ts
    ├── create-alert-rule.dto.ts
    └── update-alert-rule.dto.ts
```

### Testes Necessários

**Unit Tests:**
- ✅ AuditService: log creation com todos os campos
- ✅ AuditAlertService: condição de threshold avaliada corretamente
- ✅ AuditAlertService: formato de mensagem Slack/Email
- ✅ AuditCleanupService: deleção apenas de logs > 2 anos

**Integration Tests:**
- ✅ Subscription cancelada → audit log criado → alerta disparado
- ✅ 51 cancelamentos em 1h → alerta "High Cancellation Rate"
- ✅ Credencial modificada → alerta imediato
- ✅ Buscar histórico de uma subscription

**E2E Tests:**
- ✅ PATCH /subscriptions/:id → AuditInterceptor captura → log salvo
- ✅ Alert enviado para Slack com payload correto
- ✅ Cleanup job roda e deleta logs antigos

---

## Infraestrutura Transversal

### Jobs Module (BullMQ)

**Filas Configuradas:**
```
- webhook-processing: Processar webhooks recebidos
- metrics-calculation: Calcular métricas diárias
- sync-validation: Validação periódica com plataformas
- audit-alerts: Processar alertas de auditoria
- affiliate-stats: Atualizar estatísticas de afiliados
- customer-ltv: Recalcular LTV de customers
- cohort-analysis: Análise de coortes
```

**Jobs Module Structure:**
```
src/jobs/
├── jobs.module.ts
├── processors/
│   ├── webhook.processor.ts
│   ├── metrics-calculator.processor.ts
│   ├── sync-validator.processor.ts
│   ├── audit-alert.processor.ts
│   ├── affiliate-stats.processor.ts
│   └── customer-ltv.processor.ts
├── queues/
│   └── queue.constants.ts
└── config/
    └── bullmq.config.ts
```

**Configuração BullMQ:**
```typescript
// jobs/config/bullmq.config.ts
export const bullmqConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: {
      age: 7 * 24 * 3600  // 7 dias
    },
    removeOnFail: {
      age: 30 * 24 * 3600  // 30 dias
    }
  }
};
```

### Common Module

**Decorators:**
- `@Public()` - Desabilita JwtAuthGuard
- `@CurrentUser()` - Acessa usuário autenticado
- `@RequirePermission()` - Valida permissões RBAC
- `@ApiPaginatedResponse()` - Documenta responses paginadas

**Guards:**
- `JwtAuthGuard` - Validação de JWT (global)
- `PermissionsGuard` - Validação de RBAC (global)

**Filters:**
- `HttpExceptionFilter` - Formatação de erros HTTP
- `PrismaExceptionFilter` - Tratamento de erros Prisma

**Interceptors:**
- `LoggingInterceptor` - Log de requests/responses
- `TransformInterceptor` - Padronização de responses
- `AuditInterceptor` - Audit automático

**Pipes:**
- `ValidationPipe` - Validação de DTOs (global)

### Interfaces Compartilhadas

```typescript
// common/interfaces/pagination.interface.ts
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// common/interfaces/api-response.interface.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

---

## Convenções e Padrões

### Nomenclatura

**Arquivos:**
- Controllers: `*.controller.ts`
- Services: `*.service.ts`
- DTOs: `*.dto.ts`
- Guards: `*.guard.ts`
- Interceptors: `*.interceptor.ts`
- Tests: `*.spec.ts` (unit), `*.e2e-spec.ts` (e2e)

**Classes:**
- Controllers: `EntityController`
- Services: `EntityService`
- DTOs: `CreateEntityDto`, `UpdateEntityDto`, `QueryEntityDto`
- Guards: `EntityGuard`

**Métodos:**
- CRUD: `create`, `findAll`, `findOne`, `update`, `remove`
- Async sempre: `async/await`
- CamelCase: `getUserProfile()`, `calculateMonthlyRevenue()`

**Variáveis:**
- CamelCase: `userId`, `subscriptionId`
- Constants: `UPPER_SNAKE_CASE`
- Boolean: prefixo `is`, `has`, `can`

### DTOs e Validação

**Sempre usar class-validator:**
```typescript
export class CreateSubscriptionDto {
  @IsUUID()
  @IsNotEmpty()
  customerId: string;
  
  @IsUUID()
  @IsNotEmpty()
  productId: string;
  
  @IsDecimal({ decimal_digits: '2' })
  @Min(0)
  recurringAmount: number;
  
  @IsEnum(['day', 'week', 'month', 'year'])
  billingPeriod: string;
  
  @IsOptional()
  @IsBoolean()
  isTrial?: boolean;
}
```

### Error Handling

**Usar exceptions do NestJS:**
```typescript
throw new NotFoundException('Subscription not found');
throw new BadRequestException('Invalid subscription status');
throw new ConflictException('Customer already has active subscription');
throw new UnauthorizedException('Invalid credentials');
throw new ForbiddenException('Insufficient permissions');
```

**Custom Exceptions:**
```typescript
export class BusinessRuleException extends BadRequestException {
  constructor(message: string) {
    super({
      statusCode: 400,
      error: 'Business Rule Violation',
      message
    });
  }
}
```

### Logging

**Padrão:**
```typescript
this.logger.log(`Creating subscription for customer ${customerId}`);
this.logger.error(`Failed to process webhook: ${error.message}`, error.stack);
this.logger.warn(`Unusual churn rate detected: ${churnRate}%`);
this.logger.debug(`Calculated MRR: ${mrr}`);
```

### Testing

**Estrutura de Testes:**
```typescript
describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: PrismaService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        }
      ]
    }).compile();
    
    service = module.get(SubscriptionsService);
    prisma = module.get(PrismaService);
  });
  
  describe('create', () => {
    it('should create subscription successfully', async () => {
      // Arrange
      const dto = { ... };
      prisma.subscription.create.mockResolvedValue({ ... });
      
      // Act
      const result = await service.create(dto);
      
      // Assert
      expect(result).toBeDefined();
      expect(prisma.subscription.create).toHaveBeenCalledWith({ ... });
    });
    
    it('should throw error if customer already has active subscription', async () => {
      // Arrange + Act + Assert
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });
});
```

---

## Troubleshooting

### Problemas Comuns

**1. "Cannot find module 'prisma/prisma.service'"**
```bash
# Gerar Prisma Client
npx prisma generate
```

**2. "JWT token invalid"**
```
- Verificar JWT_SECRET no .env
- Verificar se token não expirou
- Testar com /auth/refresh
```

**3. "Permission denied"**
```
- Verificar se user tem role correto
- Verificar se role tem permission
- Checar audit logs para detalhes
```

**4. "Webhook signature validation failed"**
```
- Verificar WEBHOOK_SECRET correto
- Verificar se payload não foi modificado
- Testar com webhook de teste da plataforma
```

**5. "Metrics not updating"**
```
- Verificar se BullMQ está rodando
- Checar Redis connection
- Ver logs do metrics-calculator processor
```

---

## Estado Atual do Projeto

### ✅ Completo (Phase 1)

- [x] Prisma configurado
- [x] Docker Compose (Postgres + Redis)
- [x] Estrutura de módulos criada
- [x] Auth System completo
- [x] RBAC dinâmico funcionando
- [x] Guards globais aplicados
- [x] Seed com dados iniciais
- [x] Super Admin user criado

### ⏳ Próximas Fases

**Phase 2** (Estimativa: 1 semana)
- [ ] Products, Offers, Platforms
- [ ] Offer Platform Mappings
- [ ] Seed de plataformas
- [ ] Conversão de moedas

**Phase 3** (Estimativa: 1 semana)
- [ ] Integration Credentials (encrypted)
- [ ] Webhook endpoints (Stripe, Hotmart, Cartpanda)
- [ ] Strategy Pattern para providers
- [ ] Sync periódica

**Phase 4** (Estimativa: 2 semanas)
- [ ] Customers, Orders, Subscriptions, Transactions
- [ ] Webhook handlers completos
- [ ] Validation de business rules
- [ ] BullMQ workers

**Phase 5** (Estimativa: 2 semanas)
- [ ] Daily Metrics calculation
- [ ] Customer LTV
- [ ] Cohort Analysis
- [ ] Dashboard endpoints

**Phase 6** (Estimativa: 1-2 semanas)
- [ ] Affiliates tracking
- [ ] Tier calculation
- [ ] Performance analytics
- [ ] Dashboard de afiliados

**Phase 7** (Estimativa: 1 semana)
- [ ] Audit logs automáticos
- [ ] Alert rules
- [ ] Slack/Email integration
- [ ] Cleanup automático

---

## Próximos Passos

### Imediato (Agora)

1. **Confirmar Phase 1 está funcionando:**
   ```bash
   npm run start:dev
   # Testar login
   # Testar endpoints protegidos
   ```

2. **Decidir se continua Phase 2 ou ajusta Phase 1**

### Para Continuar (Phase 2)

1. **Criar migration de Products:**
   ```bash
   # Atualizar prisma/schema.prisma com tabelas da Phase 2
   npx prisma migrate dev --name add_products_catalog
   ```

2. **Seed de Platforms:**
   ```typescript
   // Adicionar ao seed.ts
   ```

3. **Implementar Services e Controllers**

4. **Testes**

---

## Considerações Finais

Este documento serve como **base de conhecimento completa** para qualquer desenvolvedor continuar o projeto. Todos os conceitos, decisões arquiteturais, regras de negócio e convenções estão documentados.

**Importante:**
- ✅ Nunca gerar código sem autorização explícita
- ✅ Sempre questionar decisões que pareçam incorretas
- ✅ Validar regras de negócio antes de implementar
- ✅ Manter este documento atualizado conforme projeto evolui

**Para mais detalhes:**
- `01-PROJECT-OVERVIEW.md` - Visão geral e decisões
- `02-DATABASE-SCHEMA.md` - Schema completo
- `03-BUSINESS-RULES.md` - Regras de negócio e cálculos
- `04-DEVELOPMENT-GUIDE.md` - Setup e workflows
- `05-DEPLOYMENT-REFERENCE.md` - Infraestrutura e CI/CD

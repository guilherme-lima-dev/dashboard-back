# 01 - Project Overview

## 📋 Table of Contents

1. [Project Summary](#project-summary)
2. [Technical Stack](#technical-stack)
3. [Architecture Decisions](#architecture-decisions)
4. [Integration Strategy](#integration-strategy)
5. [Performance Requirements](#performance-requirements)

---

## Project Summary

### Objective
Build a subscription analytics platform that integrates with multiple payment providers (Stripe, Hotmart, Cartpanda) to provide real-time insights on MRR, churn, LTV, and other critical SaaS metrics.

### Key Features
- **Real-time webhook processing** from multiple payment platforms
- **Pre-computed metrics** for instant dashboard loading
- **Granular RBAC** (Role-Based Access Control) with dynamic permissions
- **Multi-currency support** (BRL as base, USD support)
- **Multi-product** and **multi-platform** tracking
- **Comprehensive analytics** (MRR, ARR, Churn, LTV, Trial Rate, etc.)
- **Affiliate tracking** for marketing insights
- **Complete audit trail** for compliance and debugging

### Project Context
- **Target Users:** Internal company use (not multi-tenant)
- **Current Volume:** ~5,000 sales/day across all platforms
- **Expected Growth:** System should handle 10x volume (50k sales/day) without major changes

### Critical Requirements

⚠️ **MANDATORY:**
- ❌ **No MVP approach** - full production system from day one
- ✅ **All 3 platforms** (Stripe, Hotmart, Cartpanda) must work at launch
- ✅ **Automated tests** for all critical calculations and integrations (90%+ coverage)
- ✅ **Incremental migrations** - build database schema phase by phase
- ✅ **All code in English** - variables, functions, comments, commits, documentation
- ✅ **UI in Portuguese** (Brazilian) - all user-facing text
- ✅ **Complete audit system** - track all critical operations
- ✅ **Affiliate tracking** - for marketing ROI analysis

### Out of Scope (Initial Release)
- ❌ App Store (Apple) integration - future phase
- ❌ Multi-tenant architecture - single company use
- ❌ Mobile apps - web only initially
- ❌ Coupon management - only track received coupons
- ❌ Affiliate payments - only track affiliate performance

---

## Technical Stack

### Backend

**Framework & Language:**
- **NestJS 10.x** - Node.js framework with TypeScript
- **TypeScript 5.x** - Strict mode enabled
- **Node.js 18.x+** - LTS version

**Database & ORM:**
- **PostgreSQL 15+** - Primary database
- **Prisma 5.x** - Type-safe ORM
- **Migrations** - Incremental schema evolution

**Cache & Queue:**
- **Redis 7.x** - Caching and session storage
- **BullMQ** - Background job processing
- **Workers** - Run in same container as API initially

**Authentication & Security:**
- **JWT** - Access tokens (15min) + Refresh tokens (7 days)
- **Passport.js** - Authentication strategies
- **bcrypt** - Password hashing (10 rounds)
- **@nestjs/throttler** - Rate limiting (100 req/min)

**Testing:**
- **Jest** - Test runner and assertions
- **Supertest** - HTTP integration testing
- **@faker-js/faker** - Test data generation
- **TestContainers** - Isolated database for integration tests

**Utilities:**
- **class-validator** - DTO validation
- **class-transformer** - Object transformation
- **decimal.js** - Precise decimal calculations (for money)

### Frontend

**Framework:**
- **Next.js 14+** - React framework with App Router
- **React 18+** - UI library
- **TypeScript 5.x** - Type safety

**Rendering Strategy:**
- **CSR (Client-Side Rendering)** - No SSR needed for private dashboard

**State Management:**
- **TanStack Query (React Query)** - Server state management
- **React Context** - Minimal local state (auth, theme)

**API Communication:**
- **REST** - Standard HTTP/JSON APIs
- **Fetch API** - Native browser fetch
- **Type-safe** - Shared types from backend

**UI & Styling:**
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Reusable component library
- **Radix UI** - Accessible primitives
- **Recharts** - Chart library

### Infrastructure (AWS)

**Compute:**
- **ECS Fargate** - Serverless containers for backend
- **Auto-scaling** - Based on CPU utilization
- **Multi-AZ** - High availability

**Database:**
- **Aurora PostgreSQL** - Managed database
- **Multi-AZ** - Automatic failover
- **Automated backups** - Daily snapshots, 30-day retention
- **Point-in-time recovery** - Up to 35 days

**Cache:**
- **ElastiCache Redis** - Managed Redis cluster
- **Cluster mode** - For scalability
- **Multi-AZ replica** - High availability

**Networking:**
- **Application Load Balancer (ALB)** - Distribute traffic
- **VPC** - Isolated network
- **Security Groups** - Firewall rules
- **SSL/TLS** - AWS Certificate Manager (free)

**Storage:**
- **S3** - Static assets and backups
- **CloudFront** - CDN (optional)

**Frontend Hosting:**
- **AWS Amplify** - Managed Next.js hosting
- **Automatic deployments** - From Git
- **SSL included** - HTTPS by default

**Monitoring & Logging:**
- **CloudWatch** - Logs, metrics, dashboards
- **Sentry** - Error tracking and alerts
- **CloudWatch Alarms** - Automated alerts to Slack
- **SNS** - Notification service for audit alerts

**CI/CD:**
- **GitHub Actions** - Automated pipelines
- **AWS ECR** - Docker image registry
- **Automated testing** - Run on every PR

### Development Tools

**Version Control:**
- **Git** - Version control
- **GitHub** - Repository hosting
- **Git Flow** - Branching strategy

**Code Quality:**
- **ESLint** - Linting (TypeScript rules)
- **Prettier** - Code formatting
- **Husky** - Git hooks (pre-commit checks)

**API Development:**
- **Postman/Insomnia** - API testing
- **Swagger/OpenAPI** - API documentation (auto-generated)

**Database Management:**
- **Prisma Studio** - Visual database browser
- **pgAdmin** - PostgreSQL administration (optional)

**Local Development:**
- **Docker** - Containerization
- **Docker Compose** - Local services orchestration
- **VS Code** - Recommended IDE with extensions

---

## Architecture Decisions

### 1. Monolithic Modular Architecture

**Decision:** Start with a modular monolith instead of microservices.

**Rationale:**
- ✅ **Faster development** - No distributed systems complexity
- ✅ **Easier debugging** - Single codebase, single deployment
- ✅ **Lower operational costs** - One server, one database
- ✅ **Better performance** - No network latency between modules
- ✅ **Simpler data consistency** - ACID transactions in single database
- ✅ **Future-proof** - Can extract modules to microservices later

**When to Split:**
- When volume exceeds 50k sales/day
- When specific modules need independent scaling
- When multiple teams work on different modules

**Structure:**
```
NestJS Monolith
├── Auth Module (JWT, RBAC)
├── Users Module (User management)
├── Permissions Module (Dynamic permissions)
├── Products Module (Catalog)
├── Integrations Module (Payment providers - plugin system)
├── Customers Module (Customer data)
├── Affiliates Module (Affiliate tracking)
├── Subscriptions Module (Subscriptions, Orders, Transactions)
├── Analytics Module (Metrics, Dashboard, Charts)
├── Audit Module (Audit logs, alerts)
└── Jobs Module (Background workers - BullMQ)
```

**Module Communication:**
- **Internal:** Direct function calls (in-process)
- **Asynchronous:** Event emitter + BullMQ queues
- **No HTTP calls** between modules

---

### 2. Strategy Pattern for Payment Integrations

**Decision:** Use Strategy Pattern with plugin architecture for payment providers.

**Rationale:**
- ✅ **Easy to add new providers** - Just implement interface
- ✅ **Easy to remove providers** - Unregister from factory
- ✅ **Zero coupling** - Providers don't know about each other
- ✅ **Testable in isolation** - Mock providers easily
- ✅ **Enable/disable dynamically** - Via configuration

**Core Interface:**
```typescript
interface IPaymentProvider {
  readonly name: string;
  readonly slug: string;
  
  fetchSubscriptions(params: FetchParams): Promise<NormalizedSubscription[]>;
  fetchTransactions(params: FetchParams): Promise<NormalizedTransaction[]>;
  fetchCustomer(customerId: string): Promise<NormalizedCustomer>;
  fetchAffiliate(affiliateId: string): Promise<NormalizedAffiliate>;
  
  validateWebhook(signature: string, payload: any): boolean;
  normalizeWebhook(payload: any): WebhookEvent;
  
  testConnection(): Promise<boolean>;
}
```

**Provider Registration:**
```typescript
class PaymentProviderFactory {
  private providers = new Map<string, IPaymentProvider>();
  
  register(provider: IPaymentProvider) {
    this.providers.set(provider.slug, provider);
  }
  
  getProvider(slug: string): IPaymentProvider {
    return this.providers.get(slug);
  }
}

@Injectable()
export class StripeProvider implements IPaymentProvider {
  readonly name = 'Stripe';
  readonly slug = 'stripe';
}
```

**Benefits:**
- Adding Stripe = ~500 lines of code
- Adding Hotmart = ~500 lines of code (doesn't affect Stripe)
- Removing Cartpanda = Just unregister from factory
- Testing = Mock the interface, not the implementation

---

### 3. Pre-computed Metrics for Performance

**Decision:** Pre-calculate complex metrics in background and store in `daily_metrics` table.

**Rationale:**
- ✅ **Instant dashboard loading** - < 200ms for all KPIs
- ✅ **Reduced database load** - No complex aggregations on read
- ✅ **Acceptable latency** - Metrics update within 30 seconds of webhook
- ✅ **Historical data** - Easy to query time-series

**Flow:**
```
Webhook arrives
    ↓
Process and save to transactional tables
    ↓
Enqueue job: metrics-calculator
    ↓
Worker calculates affected metrics
    ↓
Update/Insert into daily_metrics
    ↓
Dashboard queries daily_metrics (fast)
```

**Comparison:**

**Without pre-computation (slow):**
```sql
SELECT 
  SUM(recurring_amount_brl) as mrr,
  COUNT(*) as active_subs,
  (SELECT COUNT(*) FROM subscriptions WHERE canceled_at >= :start) as churned
FROM subscriptions 
WHERE status = 'active' AND is_trial = false
```

**With pre-computation (fast):**
```sql
SELECT mrr_brl, active_subscriptions_count, churn_count
FROM daily_metrics
WHERE metric_date = CURRENT_DATE
  AND product_id IS NULL
  AND platform_id IS NULL
```

**Metrics Refresh Strategy:**
- **On webhook:** Recalculate affected metrics (async)
- **Nightly:** Recalculate all metrics (validation)
- **On demand:** Admin can trigger recalculation

---

### 4. Incremental Database Migrations

**Decision:** Build database schema incrementally via Prisma migrations (NOT create full schema upfront).

**Rationale:**
- ✅ **Safer** - Test each phase before moving forward
- ✅ **Easier to review** - Smaller changesets in PRs
- ✅ **Matches development phases** - Auth → Products → Integrations → etc
- ✅ **Better Git history** - Clear evolution of schema
- ✅ **Easier rollback** - Undo specific migrations

**Anti-pattern (DON'T DO THIS):**
```bash
npx prisma migrate dev --name init_all_tables
```

**Correct approach (DO THIS):**
```bash
npx prisma migrate dev --name init_auth_system
npx prisma migrate dev --name add_products_catalog
npx prisma migrate dev --name add_integrations
```

**Workflow:**
```
1. Design phase requirements (tables needed)
2. Update prisma/schema.prisma (add models)
3. Create migration (prisma migrate dev)
4. Review generated SQL
5. Test migration on clean database
6. Implement module that uses new tables
7. Write tests
8. Commit (migration + code together)
9. Move to next phase
```

---

### 5. Workers in Same Container (Initially)

**Decision:** Run BullMQ workers in the same ECS container as the API.

**Rationale:**
- ✅ **Simpler deployment** - One container image, one task definition
- ✅ **Lower infrastructure costs** - No separate worker tasks
- ✅ **Sufficient for volume** - 5k sales/day = ~3.5 webhooks/min
- ✅ **Easy to separate later** - When volume justifies it

**Current Architecture:**
```
ECS Task (Fargate)
├── NestJS API (port 4000)
└── BullMQ Workers (same process)
    ├── webhook-processor
    ├── metrics-calculator
    ├── sync-validator
    ├── cohort-analyzer
    └── audit-alert-processor
```

**When to Separate:**
- When webhook processing takes > 5 seconds consistently
- When API response time affected by worker load
- When volume exceeds 50k sales/day
- When workers need different scaling rules than API

---

### 6. Multi-Currency Storage

**Decision:** Store all monetary values in BOTH original currency AND converted values (BRL + USD).

**Rationale:**
- ✅ **No real-time conversion needed** - Pre-calculated
- ✅ **Consistent reporting** - Exchange rate doesn't change historical data
- ✅ **Performance** - No API calls during dashboard queries
- ✅ **Audit trail** - Know exact rate used for each transaction

**Implementation:**
```typescript
{
  amount: 9.99,
  currency: 'USD',
  amount_brl: 54.23,
  amount_usd: 9.99,
  exchange_rate: 5.43
}
```

**Conversion Strategy:**
```
Webhook arrives with $9.99 USD
    ↓
Check Redis cache for USD→BRL rate (15min TTL)
    ↓
If cached: Use cached rate
If not: Fetch from Exchange Rate API → cache for 15min
    ↓
Convert: $9.99 × 5.43 = R$54.23
    ↓
Store: amount=9.99, currency=USD, amount_brl=54.23, amount_usd=9.99, exchange_rate=5.43
```

**Dashboard Toggle:**
- User clicks "R$" → Show all `*_brl` columns
- User clicks "$" → Show all `*_usd` columns
- No API calls, instant switch

---

### 7. Attribution Tracking

**Decision:** Store UTM parameters and acquisition channel in both `orders` and `subscriptions` tables.

**Rationale:**
- ✅ **Filter by channel** - Essential for ROI analysis
- ✅ **Track lifecycle** - From click to subscription to churn
- ✅ **Denormalized** - Faster queries (no joins)

**Fields:**
```typescript
{
  utm_source: 'facebook',
  utm_medium: 'cpc',
  utm_campaign: 'summer_launch',
  utm_term: 'subscription_app',
  utm_content: 'video_ad_v2',
  referrer_url: 'https://...',
  landing_page_url: 'https://...',
  affiliate_id: 'AFF123',
  acquisition_channel: 'Meta Ads'
}
```

**Capture Strategy:**
- **If webhook contains UTM** → Extract and save
- **If not** → Requires pre-checkout capture (tracking pixel, session cookie)

**Channel Mapping:**
```typescript
const channelMap = {
  'facebook': 'Meta Ads',
  'instagram': 'Meta Ads',
  'google': 'Google Ads',
  'google-ads': 'Google Ads',
  'tiktok': 'TikTok Ads',
  'organic': 'Organic',
  'direct': 'Direct',
};
```

---

### 8. Affiliate Tracking System

**Decision:** Create dedicated `affiliates` table to track affiliate performance.

**Rationale:**
- ✅ **Marketing ROI** - Know which affiliates drive revenue
- ✅ **Actionable insights** - Target top performers with campaigns
- ✅ **Historical tracking** - Affiliate performance over time
- ✅ **Relationship management** - Contact info for outreach

**What We Track:**
- Total sales count per affiliate
- Total revenue generated
- Conversion rates
- Tier/category (Bronze, Silver, Gold, Diamond)
- Commission rates (reference only, not for payments)
- Social media handles for marketing

**What We DON'T Do:**
- ❌ Process affiliate payments (external system)
- ❌ Manage affiliate signup/approval
- ❌ Track commission payouts

---

### 9. Complete Audit System

**Decision:** Implement comprehensive audit logging for compliance and debugging.

**Rationale:**
- ✅ **Compliance** - Track all changes to critical data
- ✅ **Debugging** - Trace issues back to root cause
- ✅ **Security** - Detect unauthorized changes
- ✅ **Automated alerts** - Notify admins of critical events

**What We Audit:**
- All subscription status changes
- Payment transactions (success/failure)
- Cancellations and refunds
- User permission changes
- Integration credential updates
- Customer data modifications

**What We DON'T Audit:**
- ❌ Read-only queries (SELECT statements)
- ❌ Dashboard views
- ❌ Report generation

**Retention Policy:**
- Keep audit logs for **2 years**
- Archive to S3 after 6 months (optional)
- Automatic cleanup via scheduled job

**Alert System:**
```typescript
// Example: Alert on suspicious cancellation spike
if (cancellations_last_hour > threshold) {
  sendSlackAlert({
    channel: '#alerts-subscriptions',
    message: '⚠️ Unusual cancellation spike detected',
    details: { count: cancellations_last_hour }
  });
}
```

---

## Integration Strategy

### Supported Platforms

**Launch (Phase 1):**
- ✅ **Stripe** - Credit cards, international
- ✅ **Hotmart** - Brazilian market, affiliates
- ✅ **Cartpanda** - Brazilian funnels

**Future:**
- ⏸️ **App Store (Apple)** - iOS in-app purchases
- ⏸️ **Google Play** - Android in-app purchases
- ⏸️ **Mercado Pago** - Latin America
- ⏸️ **PayPal** - Global

### Integration Methods

**Primary: Webhooks (Real-time)**
- Platform sends HTTP POST to our endpoint
- We validate signature
- Process asynchronously via BullMQ
- Response < 100ms (fast acknowledgment)

**Secondary: Periodic Sync (Validation)**
- Every 6 hours
- Fetch last 24h of data via API
- Compare with local database
- Process missing transactions
- Alert if discrepancies found

**Flow:**
```
Real-time (webhooks):
Stripe → POST /webhooks/stripe → Validate → Queue → Process → Update DB

Validation (sync):
Cron (every 6h) → Fetch from Stripe API → Compare → Process missing → Alert admin
```

### Webhook Security

**Stripe:**
```typescript
// Webhook secret é obtido do banco de dados via IntegrationCredentialsService
const webhookSecret = await this.credentialsService.findByType(
  platformId,
  'webhook_secret',
  'sandbox',
  true
);
const signature = request.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  request.body,
  signature,
  webhookSecret.decryptedValue
);
```

**Hotmart:**
```typescript
const signature = request.headers['x-hotmart-hottok'];
const isValid = verifyHMAC(request.body, signature, hotmartSecret);
```

**Cartpanda:**
```typescript
const apiKey = request.headers['x-cartpanda-key'];
const isValid = apiKey === process.env.CARTPANDA_API_KEY;
```

---

## Performance Requirements

### Response Time Targets

**Dashboard (Critical Path):**
| Endpoint | Target | Method |
|----------|--------|--------|
| Simple KPIs (counts) | < 500ms | Direct query |
| Complex KPIs (MRR, LTV) | < 200ms | Pre-computed |
| Charts (30 days) | < 200ms | Pre-computed |
| Charts (custom range) | < 1s | On-demand aggregation |
| Overall page load | < 1s | All combined |

**Analytics Pages:**
| Feature | Target |
|---------|--------|
| Detailed charts | < 500ms |
| Cohort analysis | < 1s |
| Customer list (paginated) | < 500ms |
| Export CSV | < 5s |

**Webhooks:**
| Stage | Target |
|-------|--------|
| Receive + Validate + Enqueue | < 100ms |
| Process in background | < 5s |
| Metrics update | < 30s |

### Data Freshness

**Acceptable Latency:**
| Data Type | Latency |
|-----------|---------|
| Real-time (subscription count) | < 1s |
| Computed metrics (MRR, Churn) | < 30s |
| Cohort analysis | 1 day (recalculated nightly) |
| Historical data | As-is (never changes) |
| Audit logs | Real-time (< 1s) |

### Caching Strategy

**Redis Cache:**
- **Exchange rates:** 15 minutes TTL
- **Dashboard summary:** NOT cached (use pre-computed metrics instead)
- **Session data:** 7 days TTL
- **Rate limiting counters:** 1 minute TTL
- **Affiliate stats:** 5 minutes TTL

**Database Query Optimization:**
- Indexes on frequently queried columns
- Composite indexes for common filter combinations
- Avoid N+1 queries (use Prisma's `include`)
- Connection pooling (max 20 connections)

### Scaling Plan

**Current Capacity:**
- 5,000 sales/day = ~208 webhooks/hour = ~3.5/minute
- Single ECS task handles this easily

**Scaling Triggers:**
```
CPU > 70% for 5 min → Scale to 2 tasks
CPU > 80% for 5 min → Scale to 3 tasks
CPU > 90% for 5 min → Scale to 4 tasks
CPU < 30% for 10 min → Scale down
```

**Maximum Capacity (before architectural changes):**
- With 4 ECS tasks: ~50k sales/day
- At that point, consider:
  - Separate workers from API
  - Read replicas for database
  - Horizontal scaling of workers

---

## Next Steps

This document provides the foundation. Continue to:

📄 **02-DATABASE-SCHEMA.md** - Complete database structure with all tables and relationships
📄 **03-BUSINESS-RULES.md** - All calculation formulas, dashboard requirements, KPI definitions
📄 **04-DEVELOPMENT-GUIDE.md** - Setup instructions, coding standards, testing, workflows
📄 **05-DEPLOYMENT-REFERENCE.md** - Infrastructure, CI/CD, monitoring, troubleshooting
# 02 - Database Schema

## ðŸ“‹ Table of Contents

1. [Schema Design Principles](#schema-design-principles)
2. [Authentication & Authorization](#authentication--authorization)
3. [Products & Catalog](#products--catalog)
4. [Customers & Sales](#customers--sales)
5. [Subscriptions](#subscriptions)
6. [Transactions](#transactions)
7. [Affiliates](#affiliates)
8. [Aggregated Metrics](#aggregated-metrics)
9. [Integrations & Webhooks](#integrations--webhooks)
10. [Audit System](#audit-system)
11. [Entity Relationship Diagram](#entity-relationship-diagram)
12. [Migration Strategy](#migration-strategy)

---

## Schema Design Principles

### Naming Conventions

**Tables:**
- Plural names in snake_case: `users`, `subscriptions`, `daily_metrics`
- All lowercase
- Descriptive and clear

**Columns:**
- snake_case: `customer_id`, `recurring_amount_brl`, `created_at`
- All lowercase
- Descriptive names (avoid abbreviations unless universally known)

**Prisma Models:**
- PascalCase (singular): `User`, `Subscription`, `Transaction`
- Fields in camelCase: `customerId`, `recurringAmountBrl`
- Map to snake_case in database using `@map()` and `@@map()`

### Data Types

**Primary Keys:**
- Always UUID: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Never use auto-increment integers for distributed systems

**Monetary Values:**
- Always `DECIMAL(10, 2)` - NEVER use Float or Real
- Store in smallest currency unit when possible (cents)
- Always store in multiple currencies (original + BRL + USD)

**Timestamps:**
- Always UTC: `TIMESTAMP` (without timezone)
- Store as `TIMESTAMP`, convert to local in application
- Standard fields: `created_at`, `updated_at`, `deleted_at` (if soft delete)

**Booleans:**
- Use `BOOLEAN` type
- Default values when appropriate: `DEFAULT false`

**JSON Data:**
- Use `JSONB` for flexible data (metadata, platform-specific fields)
- Never store critical business data in JSON that needs querying

**Enums:**
- Avoid PostgreSQL ENUMs (hard to migrate)
- Use `VARCHAR(50)` with CHECK constraints or application-level validation
- Store as strings for flexibility

### Relationships

**Foreign Keys:**
- Always use explicit foreign keys with proper cascades
- Naming: `{referenced_table_singular}_id`
- Example: `customer_id`, `subscription_id`, `product_id`

**Cascade Rules:**
```sql
ON DELETE CASCADE    -- Delete children when parent deleted
ON DELETE SET NULL   -- Set FK to NULL when parent deleted
ON DELETE RESTRICT   -- Prevent deletion if children exist
```

**Many-to-Many:**
- Create explicit join tables
- Naming: `{table1}_singular}_{table2_singular}` or descriptive name
- Example: `user_roles`, `transaction_subscriptions`

### Indexing Strategy

**Always Index:**
- Primary keys (automatic)
- Foreign keys
- Columns used in WHERE clauses frequently
- Columns used in JOIN conditions
- Columns used in ORDER BY

**Composite Indexes:**
- For frequently combined filters
- Example: `(platform_id, external_customer_id)` for uniqueness + lookup

**Partial Indexes:**
- For filtered queries
- Example: `WHERE status = 'active'`

---

## Authentication & Authorization

### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_approval' NOT NULL,
    email_verified BOOLEAN DEFAULT false NOT NULL,
    last_login_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_id UUID REFERENCES users(id),
    
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

**Prisma Model:**
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  fullName      String    @map("full_name")
  status        String    @default("pending_approval")
  emailVerified Boolean   @default(false) @map("email_verified")
  lastLoginAt   DateTime? @map("last_login_at")
  
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  createdById   String?   @map("created_by_id")
  
  createdBy     User?              @relation("UserCreator", fields: [createdById], references: [id])
  createdUsers  User[]             @relation("UserCreator")
  userRoles     UserRole[]
  refreshTokens RefreshToken[]
  
  @@map("users")
}
```

### Roles Table

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_id UUID REFERENCES users(id)
);

CREATE INDEX idx_roles_slug ON roles(slug);
```

### Resources & Actions

```sql
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES resources(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_resources_slug ON resources(slug);
CREATE INDEX idx_resources_parent ON resources(parent_id);
CREATE INDEX idx_actions_slug ON actions(slug);
```

### Permissions Tables

```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    description TEXT,
    conditions JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(resource_id, action_id)
);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT true NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(role_id, permission_id)
);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    assigned_by_id UUID REFERENCES users(id),
    
    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_permissions_resource ON permissions(resource_id);
CREATE INDEX idx_permissions_action ON permissions(action_id);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
```

### Authentication Tables

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    replaced_by_id UUID REFERENCES refresh_tokens(id)
);

CREATE TABLE permission_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_audit_logs_user ON permission_audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON permission_audit_logs(created_at DESC);
```

---

## Products & Catalog

### Platforms Table

```sql
CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    config JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_platforms_slug ON platforms(slug);
CREATE INDEX idx_platforms_enabled ON platforms(is_enabled);
```

### Products Table

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    product_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_type ON products(product_type);
CREATE INDEX idx_products_active ON products(is_active);
```

### Offers Table

```sql
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    
    billing_type VARCHAR(50) NOT NULL,
    billing_period VARCHAR(50),
    billing_interval INTEGER DEFAULT 1,
    
    has_trial BOOLEAN DEFAULT false NOT NULL,
    trial_period_days INTEGER,
    trial_amount DECIMAL(10, 2),
    
    is_active BOOLEAN DEFAULT true NOT NULL,
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(product_id, slug)
);

CREATE INDEX idx_offers_product ON offers(product_id);
CREATE INDEX idx_offers_active ON offers(is_active);
```

### Offer Platform Mappings

```sql
CREATE TABLE offer_platform_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    
    external_product_id VARCHAR(255) NOT NULL,
    external_price_id VARCHAR(255),
    
    price_amount DECIMAL(10, 2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL,
    
    price_amount_brl DECIMAL(10, 2),
    price_amount_usd DECIMAL(10, 2),
    
    trial_amount DECIMAL(10, 2),
    trial_currency VARCHAR(3),
    trial_amount_brl DECIMAL(10, 2),
    trial_amount_usd DECIMAL(10, 2),
    
    is_active BOOLEAN DEFAULT true NOT NULL,
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(platform_id, external_product_id)
);

CREATE INDEX idx_mappings_offer ON offer_platform_mappings(offer_id);
CREATE INDEX idx_mappings_platform ON offer_platform_mappings(platform_id);
CREATE INDEX idx_mappings_external ON offer_platform_mappings(platform_id, external_product_id);
```

---

## Customers & Sales

### Customers Table

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id UUID NOT NULL REFERENCES platforms(id),
    
    external_customer_id VARCHAR(255) NOT NULL,
    
    email VARCHAR(255),
    name VARCHAR(255),
    phone VARCHAR(50),
    document VARCHAR(50),
    
    country_code VARCHAR(2),
    state VARCHAR(100),
    city VARCHAR(100),
    
    metadata JSONB,
    
    first_purchase_at TIMESTAMP,
    last_purchase_at TIMESTAMP,
    total_spent_brl DECIMAL(12, 2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(platform_id, external_customer_id)
);

CREATE INDEX idx_customers_platform ON customers(platform_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_external ON customers(platform_id, external_customer_id);
```

### Orders Table

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    platform_id UUID NOT NULL REFERENCES platforms(id),
    
    external_order_id VARCHAR(255),
    
    subtotal_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    subtotal_amount_brl DECIMAL(10, 2) NOT NULL,
    discount_amount_brl DECIMAL(10, 2) DEFAULT 0,
    tax_amount_brl DECIMAL(10, 2) DEFAULT 0,
    total_amount_brl DECIMAL(10, 2) NOT NULL,
    subtotal_amount_usd DECIMAL(10, 2) NOT NULL,
    discount_amount_usd DECIMAL(10, 2) DEFAULT 0,
    tax_amount_usd DECIMAL(10, 2) DEFAULT 0,
    total_amount_usd DECIMAL(10, 2) NOT NULL,
    exchange_rate DECIMAL(10, 6),
    
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    referrer_url TEXT,
    landing_page_url TEXT,
    affiliate_id UUID REFERENCES affiliates(id),
    
    coupon_code VARCHAR(100),
    
    status VARCHAR(50) NOT NULL,
    
    platform_metadata JSONB,
    
    order_date TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(platform_id, external_order_id)
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_platform ON orders(platform_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date DESC);
CREATE INDEX idx_orders_external ON orders(platform_id, external_order_id);
CREATE INDEX idx_orders_utm_source ON orders(utm_source);
CREATE INDEX idx_orders_affiliate ON orders(affiliate_id);
```

### Order Items Table

```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    product_id UUID REFERENCES products(id),
    offer_id UUID REFERENCES offers(id),
    
    external_product_id VARCHAR(255),
    
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    item_type VARCHAR(50) NOT NULL,
    
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    
    currency VARCHAR(3) NOT NULL,
    unit_price_brl DECIMAL(10, 2) NOT NULL,
    total_price_brl DECIMAL(10, 2) NOT NULL,
    unit_price_usd DECIMAL(10, 2) NOT NULL,
    total_price_usd DECIMAL(10, 2) NOT NULL,
    
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_offer ON order_items(offer_id);
CREATE INDEX idx_order_items_type ON order_items(item_type);
```

---

## Subscriptions

### Subscriptions Table

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    offer_id UUID NOT NULL REFERENCES offers(id),
    platform_id UUID NOT NULL REFERENCES platforms(id),
    
    external_subscription_id VARCHAR(255) NOT NULL,
    
    status VARCHAR(50) NOT NULL,
    substatus VARCHAR(50),
    
    is_trial BOOLEAN DEFAULT false NOT NULL,
    trial_amount DECIMAL(10, 2),
    trial_currency VARCHAR(3),
    trial_amount_brl DECIMAL(10, 2),
    trial_amount_usd DECIMAL(10, 2),
    trial_start_date TIMESTAMP,
    trial_end_date TIMESTAMP,
    trial_converted_at TIMESTAMP,
    
    recurring_amount DECIMAL(10, 2) NOT NULL,
    recurring_currency VARCHAR(3) NOT NULL,
    recurring_amount_brl DECIMAL(10, 2) NOT NULL,
    recurring_amount_usd DECIMAL(10, 2) NOT NULL,
    billing_period VARCHAR(50),
    billing_interval INTEGER DEFAULT 1,
    
    started_at TIMESTAMP NOT NULL,
    first_renewal_date TIMESTAMP,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    next_billing_date TIMESTAMP,
    canceled_at TIMESTAMP,
    cancel_scheduled_for TIMESTAMP,
    ended_at TIMESTAMP,
    paused_at TIMESTAMP,
    
    cancellation_reason VARCHAR(255),
    cancellation_type VARCHAR(50),
    cancellation_details JSONB,
    
    previous_subscription_id UUID REFERENCES subscriptions(id),
    superseded_by_subscription_id UUID REFERENCES subscriptions(id),
    
    renewal_count INTEGER DEFAULT 0,
    failed_payment_count INTEGER DEFAULT 0,
    
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    acquisition_channel VARCHAR(100),
    affiliate_id UUID REFERENCES affiliates(id),
    
    platform_metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(platform_id, external_subscription_id)
);

CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_product ON subscriptions(product_id);
CREATE INDEX idx_subscriptions_offer ON subscriptions(offer_id);
CREATE INDEX idx_subscriptions_platform ON subscriptions(platform_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_external ON subscriptions(platform_id, external_subscription_id);
CREATE INDEX idx_subscriptions_dates ON subscriptions(started_at, current_period_end);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date) WHERE status = 'active';
CREATE INDEX idx_subscriptions_utm_source ON subscriptions(utm_source);
CREATE INDEX idx_subscriptions_channel ON subscriptions(acquisition_channel);
CREATE INDEX idx_subscriptions_affiliate ON subscriptions(affiliate_id);
```

### Subscription Periods Table

```sql
CREATE TABLE subscription_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    
    period_number INTEGER NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    amount_brl DECIMAL(10, 2) NOT NULL,
    amount_usd DECIMAL(10, 2) NOT NULL,
    
    status VARCHAR(50) NOT NULL,
    
    payment_status VARCHAR(50),
    payment_date TIMESTAMP,
    transaction_id UUID REFERENCES transactions(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(subscription_id, period_number)
);

CREATE INDEX idx_sub_periods_subscription ON subscription_periods(subscription_id);
CREATE INDEX idx_sub_periods_dates ON subscription_periods(period_start, period_end);
```

---

## Transactions

### Transactions Table

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    platform_id UUID NOT NULL REFERENCES platforms(id),
    
    external_transaction_id VARCHAR(255) NOT NULL,
    external_invoice_id VARCHAR(255),
    
    transaction_type VARCHAR(50) NOT NULL,
    
    status VARCHAR(50) NOT NULL,
    
    gross_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    fee_amount DECIMAL(10, 2) DEFAULT 0,
    net_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    gross_amount_brl DECIMAL(10, 2) NOT NULL,
    discount_amount_brl DECIMAL(10, 2) DEFAULT 0,
    tax_amount_brl DECIMAL(10, 2) DEFAULT 0,
    fee_amount_brl DECIMAL(10, 2) DEFAULT 0,
    net_amount_brl DECIMAL(10, 2) NOT NULL,
    gross_amount_usd DECIMAL(10, 2) NOT NULL,
    discount_amount_usd DECIMAL(10, 2) DEFAULT 0,
    tax_amount_usd DECIMAL(10, 2) DEFAULT 0,
    fee_amount_usd DECIMAL(10, 2) DEFAULT 0,
    net_amount_usd DECIMAL(10, 2) NOT NULL,
    exchange_rate DECIMAL(10, 6),
    
    payment_method VARCHAR(100),
    payment_method_details JSONB,
    
    failure_code VARCHAR(100),
    failure_message TEXT,
    
    platform_metadata JSONB,
    
    transaction_date TIMESTAMP NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(platform_id, external_transaction_id)
);

CREATE INDEX idx_transactions_order ON transactions(order_id);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_platform ON transactions(platform_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_external ON transactions(platform_id, external_transaction_id);
```

### Transaction Subscriptions (N:N)

```sql
CREATE TABLE transaction_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    
    is_initial_purchase BOOLEAN DEFAULT false,
    is_renewal BOOLEAN DEFAULT false,
    is_upgrade BOOLEAN DEFAULT false,
    is_downgrade BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(transaction_id, subscription_id)
);

CREATE INDEX idx_trans_subs_transaction ON transaction_subscriptions(transaction_id);
CREATE INDEX idx_trans_subs_subscription ON transaction_subscriptions(subscription_id);
```

---

## Affiliates

### Affiliates Table

```sql
CREATE TABLE affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id UUID NOT NULL REFERENCES platforms(id),
    
    external_affiliate_id VARCHAR(255) NOT NULL,
    
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    
    tier VARCHAR(50) DEFAULT 'bronze',
    commission_rate DECIMAL(5, 2),
    
    instagram_handle VARCHAR(255),
    youtube_handle VARCHAR(255),
    tiktok_handle VARCHAR(255),
    twitter_handle VARCHAR(255),
    
    total_sales_count INTEGER DEFAULT 0,
    total_revenue_brl DECIMAL(12, 2) DEFAULT 0,
    total_revenue_usd DECIMAL(12, 2) DEFAULT 0,
    
    first_sale_at TIMESTAMP,
    last_sale_at TIMESTAMP,
    
    is_active BOOLEAN DEFAULT true NOT NULL,
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(platform_id, external_affiliate_id)
);

CREATE INDEX idx_affiliates_platform ON affiliates(platform_id);
CREATE INDEX idx_affiliates_email ON affiliates(email);
CREATE INDEX idx_affiliates_tier ON affiliates(tier);
CREATE INDEX idx_affiliates_active ON affiliates(is_active);
CREATE INDEX idx_affiliates_revenue ON affiliates(total_revenue_brl DESC);
```

**Prisma Model:**
```prisma
model Affiliate {
  id                   String    @id @default(uuid())
  platformId           String    @map("platform_id")
  
  externalAffiliateId  String    @map("external_affiliate_id")
  
  name                 String?
  email                String?
  phone                String?
  
  tier                 String    @default("bronze")
  commissionRate       Decimal?  @map("commission_rate") @db.Decimal(5, 2)
  
  instagramHandle      String?   @map("instagram_handle")
  youtubeHandle        String?   @map("youtube_handle")
  tiktokHandle         String?   @map("tiktok_handle")
  twitterHandle        String?   @map("twitter_handle")
  
  totalSalesCount      Int       @default(0) @map("total_sales_count")
  totalRevenueBrl      Decimal   @default(0) @map("total_revenue_brl") @db.Decimal(12, 2)
  totalRevenueUsd      Decimal   @default(0) @map("total_revenue_usd") @db.Decimal(12, 2)
  
  firstSaleAt          DateTime? @map("first_sale_at")
  lastSaleAt           DateTime? @map("last_sale_at")
  
  isActive             Boolean   @default(true) @map("is_active")
  metadata             Json?
  
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")
  
  platform             Platform  @relation(fields: [platformId], references: [id])
  orders               Order[]
  subscriptions        Subscription[]
  
  @@unique([platformId, externalAffiliateId])
  @@map("affiliates")
}
```

---

## Aggregated Metrics

### Daily Metrics Table

```sql
CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
    platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
    
    new_orders_count INTEGER DEFAULT 0,
    new_orders_revenue_brl DECIMAL(12, 2) DEFAULT 0,
    new_orders_revenue_usd DECIMAL(12, 2) DEFAULT 0,
    
    new_subscriptions_count INTEGER DEFAULT 0,
    new_subscriptions_revenue_brl DECIMAL(12, 2) DEFAULT 0,
    new_subscriptions_revenue_usd DECIMAL(12, 2) DEFAULT 0,
    active_subscriptions_count INTEGER DEFAULT 0,
    
    new_trials_count INTEGER DEFAULT 0,
    trial_revenue_brl DECIMAL(12, 2) DEFAULT 0,
    trial_revenue_usd DECIMAL(12, 2) DEFAULT 0,
    trial_conversions_count INTEGER DEFAULT 0,
    trial_conversion_rate DECIMAL(5, 2) DEFAULT 0,
    trial_expired_count INTEGER DEFAULT 0,
    
    mrr_brl DECIMAL(12, 2) DEFAULT 0,
    mrr_usd DECIMAL(12, 2) DEFAULT 0,
    arr_brl DECIMAL(12, 2) DEFAULT 0,
    arr_usd DECIMAL(12, 2) DEFAULT 0,
    total_revenue_brl DECIMAL(12, 2) DEFAULT 0,
    total_revenue_usd DECIMAL(12, 2) DEFAULT 0,
    recurring_revenue_brl DECIMAL(12, 2) DEFAULT 0,
    recurring_revenue_usd DECIMAL(12, 2) DEFAULT 0,
    non_recurring_revenue_brl DECIMAL(12, 2) DEFAULT 0,
    non_recurring_revenue_usd DECIMAL(12, 2) DEFAULT 0,
    
    canceled_subscriptions_count INTEGER DEFAULT 0,
    churned_revenue_brl DECIMAL(12, 2) DEFAULT 0,
    churned_revenue_usd DECIMAL(12, 2) DEFAULT 0,
    churn_rate DECIMAL(5, 2) DEFAULT 0,
    voluntary_churn_count INTEGER DEFAULT 0,
    involuntary_churn_count INTEGER DEFAULT 0,
    
    successful_transactions_count INTEGER DEFAULT 0,
    failed_transactions_count INTEGER DEFAULT 0,
    refunded_transactions_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(
        metric_date,
        COALESCE(product_id::text, 'all'),
        COALESCE(offer_id::text, 'all'),
        COALESCE(platform_id::text, 'all'),
        COALESCE(affiliate_id::text, 'all')
    )
);

CREATE INDEX idx_daily_metrics_date ON daily_metrics(metric_date DESC);
CREATE INDEX idx_daily_metrics_product ON daily_metrics(product_id, metric_date DESC);
CREATE INDEX idx_daily_metrics_platform ON daily_metrics(platform_id, metric_date DESC);
CREATE INDEX idx_daily_metrics_affiliate ON daily_metrics(affiliate_id, metric_date DESC);
```

### Customer LTV Table

```sql
CREATE TABLE customer_ltv (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    
    total_spent_brl DECIMAL(12, 2) DEFAULT 0,
    total_spent_usd DECIMAL(12, 2) DEFAULT 0,
    total_orders_count INTEGER DEFAULT 0,
    total_transactions_count INTEGER DEFAULT 0,
    
    avg_order_value_brl DECIMAL(10, 2) DEFAULT 0,
    avg_order_value_usd DECIMAL(10, 2) DEFAULT 0,
    
    first_purchase_at TIMESTAMP,
    last_purchase_at TIMESTAMP,
    months_active INTEGER DEFAULT 0,
    
    ltv_brl DECIMAL(12, 2) DEFAULT 0,
    ltv_usd DECIMAL(12, 2) DEFAULT 0,
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(customer_id, COALESCE(product_id::text, 'all'))
);

CREATE INDEX idx_customer_ltv_customer ON customer_ltv(customer_id);
CREATE INDEX idx_customer_ltv_product ON customer_ltv(product_id);
```

### Cohort Analysis Table

```sql
CREATE TABLE cohort_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_month DATE NOT NULL,
    product_id UUID REFERENCES products(id),
    platform_id UUID REFERENCES platforms(id),
    
    cohort_size INTEGER NOT NULL,
    
    retention_month_0 INTEGER DEFAULT 0,
    retention_month_1 INTEGER DEFAULT 0,
    retention_month_2 INTEGER DEFAULT 0,
    retention_month_3 INTEGER DEFAULT 0,
    retention_month_6 INTEGER DEFAULT 0,
    retention_month_12 INTEGER DEFAULT 0,
    
    retention_rate_month_1 DECIMAL(5, 2) DEFAULT 0,
    retention_rate_month_3 DECIMAL(5, 2) DEFAULT 0,
    retention_rate_month_6 DECIMAL(5, 2) DEFAULT 0,
    retention_rate_month_12 DECIMAL(5, 2) DEFAULT 0,
    
    cumulative_revenue_brl DECIMAL(12, 2) DEFAULT 0,
    cumulative_revenue_usd DECIMAL(12, 2) DEFAULT 0,
    avg_ltv_brl DECIMAL(10, 2) DEFAULT 0,
    avg_ltv_usd DECIMAL(10, 2) DEFAULT 0,
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(
        cohort_month,
        COALESCE(product_id::text, 'all'),
        COALESCE(platform_id::text, 'all')
    )
);

CREATE INDEX idx_cohort_analysis_month ON cohort_analysis(cohort_month DESC);
CREATE INDEX idx_cohort_analysis_product ON cohort_analysis(product_id);
CREATE INDEX idx_cohort_analysis_platform ON cohort_analysis(platform_id);
```

### Marketing Spend Table

```sql
CREATE TABLE marketing_spend (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spend_date DATE NOT NULL,
    channel VARCHAR(100),
    platform_id UUID REFERENCES platforms(id),
    
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    amount_brl DECIMAL(10, 2) NOT NULL,
    amount_usd DECIMAL(10, 2) NOT NULL,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_marketing_spend_date ON marketing_spend(spend_date DESC);
CREATE INDEX idx_marketing_spend_channel ON marketing_spend(channel);
```

---

## Integrations & Webhooks

### Integration Credentials Table

```sql
CREATE TABLE integration_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    credential_type VARCHAR(50) NOT NULL,
    credential_value TEXT NOT NULL,
    environment VARCHAR(50) DEFAULT 'production',
    is_active BOOLEAN DEFAULT true NOT NULL,
    expires_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(platform_id, credential_type, environment)
);

CREATE INDEX idx_integration_creds_platform ON integration_credentials(platform_id);
CREATE INDEX idx_integration_creds_active ON integration_credentials(is_active);
```

### Webhook Events Table

```sql
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id UUID NOT NULL REFERENCES platforms(id),
    
    event_type VARCHAR(100) NOT NULL,
    external_event_id VARCHAR(255),
    
    payload JSONB NOT NULL,
    signature VARCHAR(500),
    
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    processed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(platform_id, external_event_id)
);

CREATE INDEX idx_webhook_events_platform ON webhook_events(platform_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_received ON webhook_events(received_at DESC);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
```

### Sync Logs Table

```sql
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id UUID NOT NULL REFERENCES platforms(id),
    
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    
    records_synced INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    missing_records_found INTEGER DEFAULT 0,
    
    error_details JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_sync_logs_platform ON sync_logs(platform_id);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_started ON sync_logs(started_at DESC);
```

---

## Audit System

### Audit Logs Table

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    
    action VARCHAR(50) NOT NULL,
    
    old_values JSONB,
    new_values JSONB,
    changed_fields JSONB,
    
    user_id UUID REFERENCES users(id),
    
    source VARCHAR(50) NOT NULL,
    source_details JSONB,
    
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_source ON audit_logs(source);
```

**Prisma Model:**
```prisma
model AuditLog {
  id             String    @id @default(uuid())
  
  entityType     String    @map("entity_type")
  entityId       String    @map("entity_id")
  
  action         String
  
  oldValues      Json?     @map("old_values")
  newValues      Json?     @map("new_values")
  changedFields  Json?     @map("changed_fields")
  
  userId         String?   @map("user_id")
  
  source         String
  sourceDetails  Json?     @map("source_details")
  
  ipAddress      String?   @map("ip_address")
  userAgent      String?   @map("user_agent")
  
  createdAt      DateTime  @default(now()) @map("created_at")
  
  user           User?     @relation(fields: [userId], references: [id])
  
  @@map("audit_logs")
}
```

### Audit Alert Rules Table

```sql
CREATE TABLE audit_alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    entity_type VARCHAR(100) NOT NULL,
    action VARCHAR(50),
    
    condition JSONB NOT NULL,
    
    alert_channel VARCHAR(50) NOT NULL,
    alert_recipients JSONB NOT NULL,
    
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_alert_rules_entity ON audit_alert_rules(entity_type);
CREATE INDEX idx_alert_rules_enabled ON audit_alert_rules(is_enabled);
```

**Prisma Model:**
```prisma
model AuditAlertRule {
  id              String    @id @default(uuid())
  
  ruleName        String    @map("rule_name")
  description     String?
  
  entityType      String    @map("entity_type")
  action          String?
  
  condition       Json
  
  alertChannel    String    @map("alert_channel")
  alertRecipients Json      @map("alert_recipients")
  
  isEnabled       Boolean   @default(true) @map("is_enabled")
  
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  @@map("audit_alert_rules")
}
```

### Audit Alerts Sent Table

```sql
CREATE TABLE audit_alerts_sent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    alert_rule_id UUID NOT NULL REFERENCES audit_alert_rules(id) ON DELETE CASCADE,
    audit_log_id UUID NOT NULL REFERENCES audit_logs(id) ON DELETE CASCADE,
    
    alert_channel VARCHAR(50) NOT NULL,
    alert_recipient VARCHAR(255) NOT NULL,
    
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    delivery_status VARCHAR(50) DEFAULT 'sent',
    
    error_message TEXT
);

CREATE INDEX idx_alerts_sent_rule ON audit_alerts_sent(alert_rule_id);
CREATE INDEX idx_alerts_sent_log ON audit_alerts_sent(audit_log_id);
CREATE INDEX idx_alerts_sent_date ON audit_alerts_sent(sent_at DESC);
```

---

## Entity Relationship Diagram

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   USERS     â”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
       â”‚
       â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”
       â”‚         â”‚
â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â” â”Œâ–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ USER_ROLES  â”‚ â”‚ PERMISSIONS â”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â”‚
â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”
â”‚   ROLES     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  PLATFORMS   â”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜
       â”‚
       â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
       â”‚          â”‚             â”‚              â”‚           â”‚
â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â” â”Œâ”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ CUSTOMERS â”‚ â”‚ PRODUCTS   â”‚ â”‚ WEBHOOKS   â”‚ â”‚ AFFILIATEâ”‚ â”‚ CREDS    â”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â”‚             â”‚                              â”‚
       â”‚       â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”                        â”‚
       â”‚       â”‚  OFFERS   â”‚                        â”‚
       â”‚       â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜                        â”‚
       â”‚             â”‚                              â”‚
       â”‚       â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”               â”‚
       â”‚       â”‚ OFFER_PLATFORM_MAP â”‚               â”‚
       â”‚       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜               â”‚
       â”‚                                            â”‚
       â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
       â”‚            â”‚             â”‚                 â”‚
â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”‚
â”‚  ORDERS   â”‚ â”‚SUBSCRIPTIONSâ”‚ â”‚TRANSACTIONS â”‚     â”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜     â”‚
       â”‚            â”‚                 â”‚            â”‚
â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”‚            â”‚
â”‚ORDER_ITEMS  â”‚ â”‚SUB_PERIODS  â”‚      â”‚            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â”‚            â”‚
                                     â”‚            â”‚
              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”
              â”‚  TRANSACTION_SUBSCRIPTIONS          â”‚
              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ DAILY_METRICS   â”‚ (Pre-computed)
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ CUSTOMER_LTV    â”‚ (Pre-computed)
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ COHORT_ANALYSIS â”‚ (Pre-computed)
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚MARKETING_SPEND  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  AUDIT_LOGS     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚AUDIT_ALERT_RULESâ”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â”‚
â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚AUDIT_ALERTS_SENTâ”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Migration Strategy

### Phase-by-Phase Implementation

**CRITICAL:** Never create all tables at once. Follow this sequence:

#### Phase 1: Authentication System (Week 1)

**Migration Name:** `init_auth_system`

**Tables:**
- users
- roles
- resources
- actions
- permissions
- role_permissions
- user_roles
- refresh_tokens
- permission_audit_logs

**Command:**
```bash
npx prisma migrate dev --name init_auth_system
```

**Seed:**
- Default actions (create, read, update, delete, export, manage)
- Default resources (dashboard, analytics, subscriptions, etc)
- All permissions (resource Ã— action combinations)
- Super Admin role with all permissions
- First super admin user

**Test:**
- User can register
- Admin can approve users
- User can login with JWT
- Permissions are enforced

---

#### Phase 2: Products Catalog (Week 2)

**Migration Name:** `add_products_catalog`

**Tables:**
- platforms
- products
- offers
- offer_platform_mappings

**Command:**
```bash
npx prisma migrate dev --name add_products_catalog
```

**Seed:**
- Platforms (Stripe, Hotmart, Cartpanda)

**Test:**
- Admin can create products
- Admin can create offers
- Admin can map offers to platforms

---

#### Phase 3: Integration Infrastructure (Week 3)

**Migration Name:** `add_integrations`

**Tables:**
- integration_credentials
- webhook_events
- sync_logs

**Command:**
```bash
npx prisma migrate dev --name add_integrations
```

**Test:**
- Can save encrypted credentials
- Webhooks are logged
- Sync logs are recorded

---

#### Phase 4: Customers & Sales (Week 4-5)

**Migration Name:** `add_customers_and_sales`

**Tables:**
- customers
- orders
- order_items
- subscriptions
- subscription_periods
- transactions
- transaction_subscriptions

**Command:**
```bash
npx prisma migrate dev --name add_customers_and_sales
```

**Test:**
- Webhook creates customer
- Webhook creates subscription
- Webhook creates transaction
- Relationships are linked correctly

---

#### Phase 5: Analytics Metrics (Week 6-7)

**Migration Name:** `add_analytics_metrics`

**Tables:**
- daily_metrics
- customer_ltv
- cohort_analysis
- marketing_spend

**Command:**
```bash
npx prisma migrate dev --name add_analytics_metrics
```

**Test:**
- Metrics are calculated correctly
- Dashboard queries are fast (<200ms)

---

#### Phase 6: Attribution Fields (Week 8)

**Migration Name:** `add_attribution_fields`

**Alter Tables:**
- ALTER TABLE subscriptions ADD COLUMN utm_source, utm_medium, etc
- ALTER TABLE subscriptions ADD COLUMN acquisition_channel

**Command:**
```bash
npx prisma migrate dev --name add_attribution_fields
```

**Test:**
- UTM data is captured from webhooks
- Dashboard filters by channel work

---

#### Phase 7: Affiliates System (Week 9)

**Migration Name:** `add_affiliates_system`

**Tables:**
- affiliates

**Alter Tables:**
- ALTER TABLE orders ADD COLUMN affiliate_id UUID REFERENCES affiliates(id)
- ALTER TABLE subscriptions ADD COLUMN affiliate_id UUID REFERENCES affiliates(id)
- ALTER TABLE daily_metrics ADD COLUMN affiliate_id UUID REFERENCES affiliates(id)

**Command:**
```bash
npx prisma migrate dev --name add_affiliates_system
```

**Seed:**
- Existing affiliate IDs from orders/subscriptions (if any)

**Test:**
- Webhooks create/update affiliates
- Dashboard shows affiliate metrics
- Can filter by affiliate
- Affiliate stats update correctly

---

#### Phase 8: Audit System (Week 10)

**Migration Name:** `add_audit_system`

**Tables:**
- audit_logs
- audit_alert_rules
- audit_alerts_sent

**Command:**
```bash
npx prisma migrate dev --name add_audit_system
```

**Seed:**
- Default alert rules:
  - Suspicious cancellation spike (>50/hour)
  - Failed payment spike (>100/hour)
  - Integration credential changes
  - Subscription status changes to canceled

**Test:**
- All CRUD operations generate audit logs
- Alert rules trigger correctly
- Slack notifications sent
- Audit log retention works (2 years)

---

### Migration Best Practices

**1. Always review generated SQL:**
```bash
cat prisma/migrations/XXXXXX_migration_name/migration.sql
```

**2. Test on clean database:**
```bash
npx prisma migrate reset
npx prisma migrate dev
npm run prisma:seed
npm run test
```

**3. Never modify existing migrations:**
```bash
# âŒ WRONG: Editing old migration file
vim prisma/migrations/20240101_old_migration/migration.sql

# âœ… CORRECT: Create new migration to fix
npx prisma migrate dev --name fix_subscription_status_field
```

**4. Commit migrations with code:**
```bash
git add prisma/schema.prisma
git add prisma/migrations/
git add src/modules/subscriptions/
git commit -m "feat(subscriptions): add subscription lifecycle tracking"
```

**5. Document breaking changes:**
```markdown
## Breaking Changes
- Removed `subscription_status` column
- Replaced with `status` + `substatus` for flexibility

## Migration Path
1. Deploy code that reads both old and new columns
2. Run data migration script to copy data
3. Remove old column in next release
```

---

## Database Functions & Triggers

### Auto-update updated_at Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliates_updated_at
    BEFORE UPDATE ON affiliates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Permission Check Function

```sql
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
    p_resource_slug VARCHAR,
    p_action_slug VARCHAR
) RETURNS BOOLEAN AS $
DECLARE
    has_perm BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        JOIN resources r ON p.resource_id = r.id
        JOIN actions a ON p.action_id = a.id
        WHERE ur.user_id = p_user_id
        AND r.slug = p_resource_slug
        AND a.slug = p_action_slug
        AND rp.granted = true
    ) INTO has_perm;
    
    RETURN has_perm;
END;
$ LANGUAGE plpgsql;
```

### Audit Log Cleanup Function

```sql
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '2 years'
    RETURNING COUNT(*) INTO deleted_count;
    
    RETURN deleted_count;
END;
$ LANGUAGE plpgsql;
```

**Scheduled Job:**
```typescript
@Cron('0 2 * * 0')
async cleanupOldAuditLogs() {
  const result = await this.prisma.$queryRaw`
    SELECT cleanup_old_audit_logs()
  `;
  this.logger.log(`Cleaned up ${result} old audit logs`);
}
```

---

## Summary

This database schema provides:

âœ… **Complete RBAC system** with dynamic permissions
âœ… **Flexible product catalog** supporting multiple platforms
âœ… **Comprehensive sales tracking** (orders, subscriptions, transactions)
âœ… **N:N relationships** where needed (transaction â†” subscriptions)
âœ… **Multi-currency support** (original + BRL + USD)
âœ… **Attribution tracking** (UTM parameters, acquisition channels)
âœ… **Affiliate system** for marketing insights
âœ… **Pre-computed metrics** for performance
âœ… **Complete audit system** with automated alerts
âœ… **Audit trail** for security and compliance
âœ… **Incremental migration** strategy for safe deployment

**Next Document:** `03-BUSINESS-RULES.md` will cover all calculation formulas and dashboard requirements.
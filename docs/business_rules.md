# 03 - Business Rules & Calculations

## ðŸ“‹ Table of Contents

1. [Core Business Concepts](#core-business-concepts)
2. [Trial Definitions & Logic](#trial-definitions--logic)
3. [Subscription Lifecycle](#subscription-lifecycle)
4. [KPI Calculations](#kpi-calculations)
5. [Affiliate Business Rules](#affiliate-business-rules)
6. [Dashboard Requirements](#dashboard-requirements)
7. [Analytics Sections](#analytics-sections)
8. [Audit System Rules](#audit-system-rules)
9. [Data Validation Rules](#data-validation-rules)

---

## Core Business Concepts

### What is a Subscription?

**Definition:** A recurring payment arrangement where a customer pays periodically to access a product/service.

**Key Properties:**
- Has a billing cycle (monthly, yearly, weekly)
- Automatically renews unless canceled
- Can have a trial period (free or paid)
- Generates predictable recurring revenue

**Subscription States:**
```
Trial Pending â†’ Trial Active â†’ Active â†’ Canceled/Expired
                    â†“
                Trial Expired (churn)
```

### What is a Trial?

**Definition:** An introductory period that allows customers to test the product before committing to full price.

**Types:**
1. **Free Trial:** Customer pays $0, gets X days access
2. **Paid Trial:** Customer pays reduced price (e.g., $9), gets X days access, then renews at full price (e.g., $29)

**Critical Rule:**
- âš ï¸ **Trials do NOT count as active subscriptions**
- âš ï¸ **Trials do NOT count in MRR**
- âš ï¸ **Only subscriptions that have renewed at least once count as "active"**

### What is MRR?

**MRR (Monthly Recurring Revenue):** The predictable revenue expected each month from active subscriptions.

**Formula:**
```
MRR = SUM(recurring_amount) 
WHERE status = 'active' 
  AND is_trial = false
  AND current_period_end >= CURRENT_DATE
```

**Example:**
- 300 active subscriptions Ã— $29/month = $8,700 MRR
- 50 trials Ã— $9 = NOT counted in MRR
- Total MRR = $8,700

### What is Churn?

**Churn:** The rate at which customers cancel their subscriptions.

**Types:**
1. **Voluntary Churn:** Customer actively cancels
2. **Involuntary Churn:** Payment fails (expired card, insufficient funds)

**Formula:**
```
Churn Rate = (Canceled Subscriptions / Active Subscriptions) Ã— 100
```

**Example:**
- 100 cancellations / 200 active subscriptions = 50% churn rate

---

## Trial Definitions & Logic

### Trial Flow (Stripe Example)

**Scenario:** Product with $9 trial for 30 days, then $29/month

```
DAY 0: Customer purchases
â”œâ”€ Payment: $9 (trial_purchase)
â”œâ”€ Status: trial_active
â”œâ”€ is_trial: true
â”œâ”€ trial_amount: $9
â”œâ”€ recurring_amount: $29 (future price)
â””â”€ Counts in: Trial metrics, NOT in MRR

DAY 30: Renewal attempt
â”œâ”€ IF payment succeeds:
â”‚   â”œâ”€ Payment: $29 (trial_conversion)
â”‚   â”œâ”€ Status: active
â”‚   â”œâ”€ is_trial: false
â”‚   â”œâ”€ trial_converted_at: NOW()
â”‚   â”œâ”€ first_renewal_date: NOW()
â”‚   â””â”€ Counts in: MRR ($29), Active Subscriptions
â”‚
â””â”€ IF payment fails:
    â”œâ”€ Status: trial_expired
    â”œâ”€ ended_at: NOW()
    â””â”€ Counts in: Trial churn

DAY 60: Monthly renewal
â”œâ”€ Payment: $29 (subscription_renewal)
â”œâ”€ Status: active (unchanged)
â”œâ”€ renewal_count: +1
â””â”€ Counts in: MRR (maintained)
```

### Trial Status Transitions

```
trial_pending
  â”œâ”€ Initial state when trial payment received
  â””â”€ Waiting for trial period to start

trial_active
  â”œâ”€ Trial period in progress
  â””â”€ Customer has access to product

trial_expired
  â”œâ”€ Trial ended without conversion
  â””â”€ This is "trial churn"

active
  â”œâ”€ Trial successfully converted to paid
  â””â”€ OR direct purchase without trial
```

### Trial Business Rules

**Rule 1: Trial Revenue Tracking**
```
Trial revenue is tracked separately from MRR:
- trial_revenue_brl: Sum of trial payments
- Does NOT add to MRR
- Does NOT count in "Active Subscriptions"
```

**Rule 2: Trial Conversion**
```
A trial "converts" when:
- trial_converted_at is NOT NULL
- status changes from trial_active â†’ active
- First renewal payment succeeds
```

**Rule 3: Trial Rate Calculation**
```
Trial Rate = (Trials Converted / Total Trials) Ã— 100

Example:
- 500 trials started
- 200 converted to paid
- Trial Rate = 200/500 = 40%
```

---

## Subscription Lifecycle

### Complete Lifecycle Flow

```
1. NEW SUBSCRIPTION
   â”œâ”€ Source: Webhook (subscription.created)
   â”œâ”€ Create: customer (if not exists)
   â”œâ”€ Create: subscription (is_trial=true if trial)
   â”œâ”€ Create: transaction (type=trial_purchase)
   â””â”€ Trigger: metrics recalculation

2. TRIAL PERIOD
   â”œâ”€ Status: trial_active
   â”œâ”€ Access: Customer has full access
   â”œâ”€ Metrics: NOT in MRR
   â””â”€ Waiting: For trial_end_date

3. TRIAL CONVERSION
   â”œâ”€ Source: Webhook (invoice.payment_succeeded)
   â”œâ”€ Update: subscription
   â”‚   â”œâ”€ is_trial: false
   â”‚   â”œâ”€ status: active
   â”‚   â”œâ”€ trial_converted_at: NOW()
   â”‚   â””â”€ first_renewal_date: NOW()
   â”œâ”€ Create: transaction (type=trial_conversion)
   â”œâ”€ Trigger: metrics recalculation
   â””â”€ Metrics: NOW counts in MRR

4. ACTIVE SUBSCRIPTION
   â”œâ”€ Status: active
   â”œâ”€ Billing: Automatic renewals
   â”œâ”€ Metrics: Counts in MRR
   â””â”€ Each renewal:
       â”œâ”€ Create: transaction (type=subscription_renewal)
       â”œâ”€ Update: renewal_count +1
       â””â”€ Maintain: MRR

5. CANCELLATION
   â”œâ”€ Source: Webhook (subscription.deleted OR subscription.canceled)
   â”œâ”€ Update: subscription
   â”‚   â”œâ”€ status: canceled
   â”‚   â”œâ”€ canceled_at: NOW()
   â”‚   â”œâ”€ cancellation_type: voluntary/involuntary
   â”‚   â””â”€ cancellation_reason: (from metadata)
   â”œâ”€ Trigger: churn metrics recalculation
   â””â”€ Metrics: Remove from MRR

6. EXPIRATION
   â”œâ”€ Status: expired
   â”œâ”€ Occurs: When subscription reaches end date
   â””â”€ Metrics: Removed from active count
```

### Upgrade/Downgrade Logic

**Scenario:** Customer changes from Monthly ($29) to Annual ($299)

**Option 1: Cancel old + Create new (Recommended)**
```
1. Cancel subscription_1 (Monthly)
   â”œâ”€ status: canceled
   â”œâ”€ superseded_by_subscription_id: subscription_2_id
   â””â”€ Remove from MRR calculation

2. Create subscription_2 (Annual)
   â”œâ”€ status: active
   â”œâ”€ previous_subscription_id: subscription_1_id
   â””â”€ Add to MRR (prorated to monthly: $299/12 = $24.92)

3. Create transaction
   â”œâ”€ type: upgrade
   â”œâ”€ Link to both subscriptions via transaction_subscriptions
   â””â”€ amount: $299
```

**Option 2: Update existing subscription**
```
1. Update subscription_1
   â”œâ”€ offer_id: annual_offer_id
   â”œâ”€ recurring_amount: $299
   â”œâ”€ billing_period: yearly
   â””â”€ MRR: $299/12 = $24.92

2. Create transaction
   â”œâ”€ type: upgrade
   â””â”€ amount: $299 (or prorated)
```

**Recommendation:** Use Option 1 for clearer audit trail

### Customer Constraints

**Critical Business Rule:**
```
âŒ A customer CANNOT have 2 active subscriptions of the SAME product
âœ… A customer CAN have subscriptions of DIFFERENT products
```

**Examples:**
```
âœ… ALLOWED:
- JoÃ£o has: Holymind Monthly (active) + Holyguide Annual (active)

âŒ NOT ALLOWED:
- JoÃ£o has: Holymind Monthly (active) + Holymind Annual (active)
- System should: Cancel old subscription when new one is created

âœ… ALLOWED (Edge Case):
- JoÃ£o has: Holymind Monthly on Stripe + Holymind Monthly on Hotmart
- Reason: Customers are NOT unified across platforms
```

**Validation Logic:**
```typescript
async validateSubscription(customerId: string, productId: string) {
  const existingActive = await prisma.subscription.findFirst({
    where: {
      customerId,
      productId,
      status: 'active',
    }
  });
  
  if (existingActive) {
    throw new BusinessRuleException(
      'Customer already has an active subscription for this product'
    );
  }
}
```

---

## KPI Calculations

### 1. New Subscriptions

**Definition:** Total subscriptions created in the period

**SQL Query:**
```sql
SELECT 
  COUNT(*) as new_subscriptions_count,
  SUM(
    CASE 
      WHEN is_trial THEN trial_amount_brl 
      ELSE recurring_amount_brl 
    END
  ) as new_subscriptions_revenue_brl
FROM subscriptions
WHERE started_at >= :start_date
  AND started_at <= :end_date
  AND (:platform_id IS NULL OR platform_id = :platform_id);
```

**Business Logic:**
- Includes both trials and direct purchases
- Revenue = trial_amount for trials, recurring_amount for direct

---

### 2. MRR (Monthly Recurring Revenue)

**Definition:** Expected monthly revenue from active subscriptions

**Formula:**
```
MRR = (Active Subscriptions Ã— Ticket) - Churned Revenue
```

**SQL Query:**
```sql
WITH active_subs AS (
  SELECT 
    COUNT(*) as count,
    SUM(recurring_amount_brl) as mrr_gross
  FROM subscriptions
  WHERE status = 'active'
    AND is_trial = false
    AND current_period_end >= CURRENT_DATE
    AND (:platform_id IS NULL OR platform_id = :platform_id)
),
churned_revenue AS (
  SELECT 
    COALESCE(SUM(recurring_amount_brl), 0) as amount
  FROM subscriptions
  WHERE canceled_at >= :start_date
    AND canceled_at <= :end_date
    AND status = 'canceled'
)
SELECT 
  a.count as active_subscriptions,
  a.mrr_gross,
  c.amount as churned_revenue,
  (a.mrr_gross - c.amount) as mrr_net
FROM active_subs a, churned_revenue c;
```

**Example:**
```
300 active subscriptions Ã— $29 = $8,700
- $1,200 (churned revenue)
= $7,500 MRR
```

**Important Notes:**
- Always exclude trials (is_trial = false)
- Only count active status
- Check current_period_end >= today (not expired)

---

### 3. ARR (Annual Recurring Revenue)

**Definition:** MRR projected annually

**Formula:**
```
ARR = MRR Ã— 12
```

**Example:**
```
MRR = $8,700
ARR = $8,700 Ã— 12 = $104,400
```

**SQL Query:**
```sql
SELECT 
  (mrr_net * 12) as arr
FROM (
  SELECT (a.mrr_gross - c.amount) as mrr_net
  FROM active_subs a, churned_revenue c
) mrr_data;
```

---

### 4. New Revenue (Non-Subscription)

**Definition:** Revenue from non-recurring purchases (upsells, one-time products)

**SQL Query:**
```sql
SELECT 
  SUM(t.gross_amount_brl) as new_revenue
FROM transactions t
INNER JOIN order_items oi ON t.order_id = oi.order_id
WHERE t.transaction_date >= :start_date
  AND t.transaction_date <= :end_date
  AND t.status = 'succeeded'
  AND oi.item_type IN ('one_time', 'addon', 'upsell', 'bump')
  AND (:platform_id IS NULL OR t.platform_id = :platform_id);
```

**Item Types:**
- `one_time`: Single purchase products
- `addon`: Add-ons to existing subscriptions
- `upsell`: Higher-value products offered during checkout
- `bump`: Order bump offers

---

### 5. Total Revenue

**Definition:** All revenue in the period

**Formula:**
```
Total Revenue = Subscription Revenue + New Revenue
```

**SQL Query:**
```sql
WITH subscription_revenue AS (
  SELECT COALESCE(SUM(gross_amount_brl), 0) as amount
  FROM transactions
  WHERE transaction_date >= :start_date
    AND transaction_date <= :end_date
    AND status = 'succeeded'
    AND transaction_type IN ('trial_purchase', 'trial_conversion', 'subscription_renewal')
),
new_revenue AS (
  SELECT COALESCE(SUM(t.gross_amount_brl), 0) as amount
  FROM transactions t
  INNER JOIN order_items oi ON t.order_id = oi.order_id
  WHERE t.transaction_date >= :start_date
    AND t.transaction_date <= :end_date
    AND t.status = 'succeeded'
    AND oi.item_type IN ('one_time', 'addon', 'upsell', 'bump')
)
SELECT 
  (sr.amount + nr.amount) as total_revenue
FROM subscription_revenue sr, new_revenue nr;
```

---

### 6. Trial Metrics

**Trial Count:**
```sql
SELECT 
  COUNT(*) as trial_count,
  SUM(trial_amount_brl) as trial_revenue
FROM subscriptions
WHERE is_trial = true
  AND status IN ('trial_pending', 'trial_active')
  AND trial_start_date >= :start_date
  AND trial_start_date <= :end_date;
```

**Trial Rate (Conversion):**
```sql
WITH trials_total AS (
  SELECT COUNT(*) as total
  FROM subscriptions
  WHERE trial_start_date >= :start_date
    AND trial_start_date <= :end_date
    AND is_trial = true
),
trials_converted AS (
  SELECT COUNT(*) as converted
  FROM subscriptions
  WHERE trial_start_date >= :start_date
    AND trial_start_date <= :end_date
    AND trial_converted_at IS NOT NULL
    AND status = 'active'
)
SELECT 
  tc.converted,
  tt.total,
  (tc.converted::float / NULLIF(tt.total, 0) * 100) as trial_rate
FROM trials_converted tc, trials_total tt;
```

**Example:**
```
500 trials started
200 converted to paid
Trial Rate = 200/500 Ã— 100 = 40%
```

---

### 7. Cancellations & Churn

**Cancellation Count:**
```sql
SELECT 
  COUNT(*) as cancellations_count,
  SUM(recurring_amount_brl) as churned_revenue
FROM subscriptions
WHERE canceled_at >= :start_date
  AND canceled_at <= :end_date
  AND status = 'canceled';
```

**Churn Rate:**
```sql
WITH active_subs AS (
  SELECT COUNT(*) as count
  FROM subscriptions
  WHERE status = 'active'
    AND is_trial = false
    AND current_period_end >= CURRENT_DATE
),
canceled_subs AS (
  SELECT COUNT(*) as count
  FROM subscriptions
  WHERE canceled_at >= :start_date
    AND canceled_at <= :end_date
)
SELECT 
  c.count as cancellations,
  a.count as active_subscriptions,
  (c.count::float / NULLIF(a.count, 0) * 100) as churn_rate
FROM canceled_subs c, active_subs a;
```

**Example:**
```
100 cancellations
200 active subscriptions
Churn Rate = 100/200 Ã— 100 = 50%
```

---

### 8. LTV (Lifetime Value)

**Definition:** Average revenue per customer over their lifetime

**Formula:**
```
LTV = Average Ticket / Monthly Churn Rate
```

**SQL Query:**
```sql
WITH ticket_medio AS (
  SELECT 
    (SUM(gross_amount_brl) / NULLIF(COUNT(*), 0)) as avg_ticket
  FROM transactions
  WHERE status = 'succeeded'
    AND transaction_date >= :start_date
    AND transaction_date <= :end_date
),
churn_rate AS (
  SELECT 
    (c.count::float / NULLIF(a.count, 0)) as rate
  FROM (
    SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active' AND is_trial = false
  ) a,
  (
    SELECT COUNT(*) as count 
    FROM subscriptions 
    WHERE canceled_at >= :start_date AND canceled_at <= :end_date
  ) c
)
SELECT 
  tm.avg_ticket,
  cr.rate as churn_rate,
  (tm.avg_ticket / NULLIF(cr.rate, 0)) as ltv
FROM ticket_medio tm, churn_rate cr;
```

**Example:**
```
Average Ticket = $200
Monthly Churn = 5% (0.05)
LTV = $200 / 0.05 = $4,000
```

---

### 9. CAC (Customer Acquisition Cost)

**Definition:** Marketing spend per acquired customer

**Formula:**
```
CAC = Total Marketing Spend / Total New Customers
```

**SQL Query:**
```sql
WITH marketing_spend AS (
  SELECT COALESCE(SUM(amount_brl), 0) as total
  FROM marketing_spend
  WHERE spend_date >= :start_date
    AND spend_date <= :end_date
),
new_customers AS (
  SELECT COUNT(DISTINCT customer_id) as count
  FROM orders
  WHERE order_date >= :start_date
    AND order_date <= :end_date
    AND status = 'completed'
)
SELECT 
  ms.total as marketing_spend,
  nc.count as new_customers,
  (ms.total / NULLIF(nc.count, 0)) as cac
FROM marketing_spend ms, new_customers nc;
```

**Example:**
```
Marketing Spend = $100,000
New Customers = 50
CAC = $100,000 / 50 = $2,000
```

---

### 10. LTV:CAC Ratio

**Definition:** Relationship between customer value and acquisition cost

**Formula:**
```
LTV:CAC = LTV / CAC
```

**Example:**
```
LTV = $4,000
CAC = $2,000
LTV:CAC = $4,000 / $2,000 = 2.0x
```

**Interpretation:**
- < 1.0x: Losing money on each customer
- 1.0x - 3.0x: Acceptable
- > 3.0x: Excellent unit economics

---

## Affiliate Business Rules

### Affiliate Creation & Updates

**Rule 1: Automatic Affiliate Creation**
```
When webhook contains affiliate_id:
1. Check if affiliate exists (platform_id + external_affiliate_id)
2. If NOT exists â†’ Create new affiliate record
3. If exists â†’ Update last_sale_at timestamp
```

**Rule 2: Affiliate Stats Update**
```
On each successful transaction with affiliate_id:
1. Increment total_sales_count +1
2. Add transaction amount to total_revenue_brl
3. Add transaction amount to total_revenue_usd
4. Update last_sale_at to transaction_date
5. If first sale â†’ set first_sale_at
```

**Implementation:**
```typescript
async processAffiliateTransaction(
  affiliateId: string,
  transactionAmount: Decimal,
  transactionDate: Date
) {
  await prisma.affiliate.update({
    where: { id: affiliateId },
    data: {
      totalSalesCount: { increment: 1 },
      totalRevenueBrl: { increment: transactionAmount },
      lastSaleAt: transactionDate,
      firstSaleAt: {
        setIfNull: transactionDate
      }
    }
  });
}
```

### Affiliate Tier Classification

**Rule: Automatic Tier Assignment**
```
Tiers based on total_revenue_brl (monthly recalculation):

- Bronze: R$0 - R$10,000
- Silver: R$10,001 - R$50,000
- Gold: R$50,001 - R$100,000
- Diamond: R$100,000+
```

**SQL Function:**
```sql
CREATE OR REPLACE FUNCTION calculate_affiliate_tier(revenue DECIMAL)
RETURNS VARCHAR AS $$
BEGIN
  RETURN CASE
    WHEN revenue >= 100000 THEN 'diamond'
    WHEN revenue >= 50001 THEN 'gold'
    WHEN revenue >= 10001 THEN 'silver'
    ELSE 'bronze'
  END;
END;
$$ LANGUAGE plpgsql;
```

**Scheduled Job (Monthly):**
```typescript
@Cron('0 0 1 * *')
async recalculateAffiliateTiers() {
  await prisma.$executeRaw`
    UPDATE affiliates
    SET tier = calculate_affiliate_tier(total_revenue_brl)
  `;
}
```

### Affiliate Metrics in Dashboard

**Top Affiliates Query:**
```sql
SELECT 
  a.id,
  a.name,
  a.email,
  a.tier,
  a.total_sales_count,
  a.total_revenue_brl,
  a.total_revenue_usd,
  COUNT(DISTINCT s.customer_id) as unique_customers,
  AVG(s.recurring_amount_brl) as avg_ticket
FROM affiliates a
LEFT JOIN subscriptions s ON s.affiliate_id = a.id
WHERE a.is_active = true
  AND (:platform_id IS NULL OR a.platform_id = :platform_id)
GROUP BY a.id
ORDER BY a.total_revenue_brl DESC
LIMIT 20;
```

**Affiliate Performance Over Time:**
```sql
SELECT 
  DATE_TRUNC('month', t.transaction_date) as month,
  COUNT(*) as sales_count,
  SUM(t.gross_amount_brl) as revenue
FROM transactions t
WHERE t.order_id IN (
  SELECT o.id FROM orders o WHERE o.affiliate_id = :affiliate_id
)
  AND t.status = 'succeeded'
  AND t.transaction_date >= :start_date
  AND t.transaction_date <= :end_date
GROUP BY month
ORDER BY month DESC;
```

### Affiliate Validation Rules

**Rule 1: Valid Contact Information**
```typescript
if (!affiliate.email && !affiliate.phone) {
  throw new ValidationException(
    'Affiliate must have at least email or phone'
  );
}
```

**Rule 2: Commission Rate Constraints**
```typescript
if (commissionRate < 0 || commissionRate > 100) {
  throw new ValidationException(
    'Commission rate must be between 0 and 100'
  );
}
```

**Rule 3: Unique External ID per Platform**
```sql
UNIQUE(platform_id, external_affiliate_id)
```

---

## Dashboard Requirements

### KPI Cards (Top Section)

**Layout:**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ New Subs        â”‚ MRR             â”‚ ARR             â”‚
â”‚ $23,277.00      â”‚ $22,774.00      â”‚ $273,288.00     â”‚
â”‚ 813 subscr      â”‚ 796 active      â”‚                 â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ New Revenue     â”‚ Total Revenue   â”‚ Trial           â”‚
â”‚ $5,000.00       â”‚ $28,277.00      â”‚ 150 trials      â”‚
â”‚ (non-recurring) â”‚                 â”‚ $1,350.00       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Trial Rate      â”‚ Cancellations   â”‚ Churn Rate      â”‚
â”‚ 40%             â”‚ 17 subs         â”‚ 6.6%            â”‚
â”‚                 â”‚ $503.00         â”‚                 â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ LTV             â”‚ CAC             â”‚ LTV:CAC         â”‚
â”‚ $4,000.00       â”‚ $2,000.00       â”‚ 2.0x            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Filters (Top Bar)

**Date Range:**
- Today
- Yesterday
- Last 7 days
- Last 30 days
- This month
- Custom range
- All time ("Maximum")

**Platform:**
- All
- Stripe
- Hotmart
- Cartpanda

**Acquisition Channel:**
- All
- Meta Ads (Facebook/Instagram)
- Google Ads
- TikTok Ads
- Organic
- (Mapped from utm_source)

**Affiliate:**
- All
- [List of top 20 affiliates]
- Search by name/email

### Currency Toggle

**Top Right Corner:**
- Button: [R$] / [$]
- Toggles between BRL and USD
- All values update instantly
- Uses pre-stored converted values (no API calls)

### Charts

**Chart 1: User Growth (Monthly)**
```
Type: Bar chart
X-axis: Months
Y-axis: Count
Data: 
- Green bars: New subscriptions
- Red bars: Cancellations
- Net growth = New - Canceled
```

**Chart 2: MRR Evolution (Monthly)**
```
Type: Bar + Line chart
X-axis: Months
Y-axis: MRR value
Data:
- Purple bars: MRR value
- Line: MRR growth trend
```

### Card Interactions

**On Click:**
- Clicking any KPI card â†’ Navigate to detailed analytics page
- Example: Click "MRR" â†’ Go to `/analytics/mrr`

---

## Analytics Sections

### Section 1: Revenue Analytics

**URL:** `/analytics/revenue`

**Charts:**
- MRR over time (line chart)
- ARR projection
- Revenue breakdown (recurring vs non-recurring)
- Revenue by product
- Revenue by platform
- Revenue by affiliate (top 10)

**Table:** Monthly revenue data with drill-down

---

### Section 2: Subscription Analytics

**URL:** `/analytics/subscriptions`

**Charts:**
- New subscriptions over time
- Active subscriptions trend
- Subscription status distribution (pie chart)
- Subscriptions by product
- Subscriptions by offer

**Table:** Subscription list with filters

---

### Section 3: Churn Analysis

**URL:** `/analytics/churn`

**Charts:**
- Churn rate over time
- Voluntary vs Involuntary churn
- Churn by product
- Churn by platform
- Churn by cohort

**Table:** Canceled subscriptions with reasons

---

### Section 4: Trial Analysis

**URL:** `/analytics/trials`

**Charts:**
- Trial conversion rate over time
- Trial funnel (started â†’ converted â†’ churned)
- Conversion time distribution
- Trial performance by product

**Table:** Trial subscriptions with conversion status

---

### Section 5: Customer Lifetime Value

**URL:** `/analytics/ltv`

**Charts:**
- LTV distribution histogram
- LTV by product
- LTV by acquisition channel
- LTV trends over time

**Table:** Top customers by LTV

---

### Section 6: Affiliate Performance

**URL:** `/analytics/affiliates`

**Charts:**
- Revenue by affiliate (top 20)
- Sales count by affiliate
- Affiliate tier distribution (pie chart)
- Affiliate performance over time

**Filters:**
- Tier (Bronze, Silver, Gold, Diamond)
- Platform
- Date range

**Table Columns:**
- Name
- Email
- Tier
- Total Sales
- Total Revenue
- Avg Ticket
- First Sale
- Last Sale
- Actions (View Details, Contact)

**Detail View (Click on Affiliate):**
- Full profile with social media
- Revenue timeline chart
- Customer list acquired by this affiliate
- Conversion rate
- Best performing products

---

### Section 7: Geographic Analysis

**URL:** `/analytics/geography`

**Charts:**
- Revenue by country (map or list)
- Subscription count by country
- Average ticket by country
- Conversion rate by country

**Table:** Country-level metrics

---

## Audit System Rules

### What Gets Audited

**Priority 1 (ALWAYS):**
- Subscription status changes
- Subscription cancellations
- Trial conversions
- Payment transactions (success/failure)
- Refunds
- User permission changes
- Integration credential updates

**Priority 2 (IMPORTANT):**
- Customer data modifications
- Product/Offer changes
- Affiliate record changes
- Manual metric recalculations

**Priority 3 (OPTIONAL):**
- User login/logout
- Report generation
- Export operations

**NOT Audited:**
- Read-only queries (SELECT)
- Dashboard views
- Analytics queries

### Audit Log Structure

**Required Fields:**
```typescript
{
  entityType: 'subscription',
  entityId: 'uuid',
  action: 'status_changed',
  oldValues: { status: 'trial_active' },
  newValues: { status: 'active' },
  changedFields: ['status', 'trial_converted_at'],
  userId: 'uuid or null',
  source: 'webhook',
  sourceDetails: {
    platform: 'stripe',
    eventId: 'evt_xxx',
    webhookId: 'whk_xxx'
  },
  createdAt: '2025-01-15T10:30:00Z'
}
```

### Alert Rules Configuration

**Default Alert Rules (Seeded on Phase 8):**

**1. Suspicious Cancellation Spike**
```json
{
  "rule_name": "High Cancellation Rate",
  "entity_type": "subscription",
  "action": "canceled",
  "condition": {
    "window": "1 hour",
    "threshold": 50,
    "comparison": "greater_than"
  },
  "alert_channel": "slack",
  "alert_recipients": ["#alerts-subscriptions"]
}
```

**2. Failed Payment Spike**
```json
{
  "rule_name": "High Payment Failure Rate",
  "entity_type": "transaction",
  "action": "failed",
  "condition": {
    "window": "1 hour",
    "threshold": 100,
    "comparison": "greater_than"
  },
  "alert_channel": "slack",
  "alert_recipients": ["#alerts-payments"]
}
```

**3. Integration Credential Changes**
```json
{
  "rule_name": "Credential Modification",
  "entity_type": "integration_credentials",
  "action": "updated",
  "condition": {
    "always": true
  },
  "alert_channel": "slack",
  "alert_recipients": ["#alerts-security", "@admin"]
}
```

**4. Mass Subscription Status Changes**
```json
{
  "rule_name": "Bulk Status Change",
  "entity_type": "subscription",
  "action": "status_changed",
  "condition": {
    "window": "5 minutes",
    "threshold": 20,
    "comparison": "greater_than"
  },
  "alert_channel": "slack",
  "alert_recipients": ["#alerts-system"]
}
```

**5. Trial Conversion Drop**
```json
{
  "rule_name": "Low Trial Conversion Rate",
  "entity_type": "subscription",
  "action": "trial_expired",
  "condition": {
    "window": "1 day",
    "conversion_rate": 20,
    "comparison": "less_than"
  },
  "alert_channel": "slack",
  "alert_recipients": ["#alerts-marketing"]
}
```

### Alert Processing Logic

**Implementation:**
```typescript
@Injectable()
export class AuditAlertService {
  async processAlert(auditLog: AuditLog) {
    const rules = await this.getMatchingRules(
      auditLog.entityType,
      auditLog.action
    );

    for (const rule of rules) {
      if (!rule.isEnabled) continue;

      const shouldAlert = await this.evaluateCondition(
        rule.condition,
        auditLog
      );

      if (shouldAlert) {
        await this.sendAlert(rule, auditLog);
      }
    }
  }

  private async evaluateCondition(
    condition: any,
    auditLog: AuditLog
  ): Promise<boolean> {
    if (condition.always) return true;

    if (condition.window) {
      const count = await this.countRecentEvents(
        auditLog.entityType,
        auditLog.action,
        condition.window
      );

      return this.compare(
        count,
        condition.threshold,
        condition.comparison
      );
    }

    return false;
  }

  private async sendAlert(rule: AuditAlertRule, auditLog: AuditLog) {
    const recipients = rule.alertRecipients as string[];

    for (const recipient of recipients) {
      if (rule.alertChannel === 'slack') {
        await this.sendSlackAlert(recipient, auditLog, rule);
      } else if (rule.alertChannel === 'email') {
        await this.sendEmailAlert(recipient, auditLog, rule);
      }

      await this.logAlertSent(rule.id, auditLog.id, recipient);
    }
  }

  private async sendSlackAlert(
    channel: string,
    auditLog: AuditLog,
    rule: AuditAlertRule
  ) {
    const message = {
      channel,
      text: `âš ï¸ Alert: ${rule.ruleName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `ðŸš¨ ${rule.ruleName}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Entity:*\n${auditLog.entityType}`
            },
            {
              type: 'mrkdwn',
              text: `*Action:*\n${auditLog.action}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n${auditLog.createdAt}`
            },
            {
              type: 'mrkdwn',
              text: `*Source:*\n${auditLog.source}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:*\n\`\`\`${JSON.stringify(auditLog.newValues, null, 2)}\`\`\``
          }
        }
      ]
    };

    await this.slackClient.chat.postMessage(message);
  }
}
```

### Audit Log Retention

**Rule: Automatic Cleanup After 2 Years**

**Scheduled Job:**
```typescript
@Injectable()
export class AuditCleanupService {
  
  @Cron('0 2 * * 0')
  async cleanupOldAuditLogs() {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: twoYearsAgo
        }
      }
    });

    this.logger.log(`Cleaned up ${result.count} audit logs older than 2 years`);

    await this.notifyAdmin(result.count);
  }

  private async notifyAdmin(count: number) {
    if (count > 0) {
      await this.slackClient.chat.postMessage({
        channel: '#system-logs',
        text: `ðŸ—‘ï¸ Audit log cleanup completed: ${count} records deleted (older than 2 years)`
      });
    }
  }
}
```

**Optional: Archive to S3 Before Deletion**
```typescript
async archiveBeforeCleanup() {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const oldLogs = await this.prisma.auditLog.findMany({
    where: {
      createdAt: { lt: twoYearsAgo }
    }
  });

  if (oldLogs.length > 0) {
    const filename = `audit-logs-archive-${Date.now()}.json`;
    
    await this.s3Client.upload({
      Bucket: 'analytics-platform-archives',
      Key: `audit-logs/${filename}`,
      Body: JSON.stringify(oldLogs),
      ContentType: 'application/json'
    });

    this.logger.log(`Archived ${oldLogs.length} logs to S3: ${filename}`);
  }

  return oldLogs.length;
}
```

### Audit Query Examples

**1. Get All Changes to a Subscription:**
```sql
SELECT 
  al.id,
  al.action,
  al.old_values,
  al.new_values,
  al.changed_fields,
  al.source,
  al.created_at,
  u.full_name as user_name
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.entity_type = 'subscription'
  AND al.entity_id = :subscription_id
ORDER BY al.created_at DESC;
```

**2. Find Who Changed Integration Credentials:**
```sql
SELECT 
  al.*,
  u.full_name,
  u.email,
  p.name as platform_name
FROM audit_logs al
INNER JOIN users u ON al.user_id = u.id
INNER JOIN integration_credentials ic ON al.entity_id = ic.id
INNER JOIN platforms p ON ic.platform_id = p.id
WHERE al.entity_type = 'integration_credentials'
  AND al.action IN ('created', 'updated', 'deleted')
  AND al.created_at >= NOW() - INTERVAL '30 days'
ORDER BY al.created_at DESC;
```

**3. Track Subscription Status Changes:**
```sql
SELECT 
  al.entity_id as subscription_id,
  al.old_values->>'status' as old_status,
  al.new_values->>'status' as new_status,
  al.source,
  al.created_at
FROM audit_logs al
WHERE al.entity_type = 'subscription'
  AND al.action = 'updated'
  AND al.changed_fields @> '["status"]'
  AND al.created_at >= :start_date
ORDER BY al.created_at DESC;
```

**4. Cancellation Pattern Analysis:**
```sql
SELECT 
  al.source,
  COUNT(*) as cancellation_count,
  AVG(EXTRACT(EPOCH FROM (al.created_at - s.started_at)) / 86400) as avg_days_to_cancel
FROM audit_logs al
INNER JOIN subscriptions s ON al.entity_id = s.id
WHERE al.entity_type = 'subscription'
  AND al.action = 'updated'
  AND al.new_values->>'status' = 'canceled'
  AND al.created_at >= :start_date
GROUP BY al.source
ORDER BY cancellation_count DESC;
```

---

## Data Validation Rules

### Customer Data

```typescript
@IsEmail()
email: string;

@Matches(/^\d{11}$|^\d{14}$/)
document: string;

@Length(2, 2)
@IsISO31661Alpha2()
countryCode: string;
```

### Monetary Values

```typescript
@IsPositive()
@IsDecimal({ decimal_digits: '2' })
amount: number;

@Length(3, 3)
@IsUppercase()
currency: string;
```

### Subscription Rules

```typescript
async validateUniqueSubscription(
  customerId: string,
  productId: string
): Promise<void> {
  const existing = await this.prisma.subscription.findFirst({
    where: {
      customerId,
      productId,
      status: 'active',
    },
  });

  if (existing) {
    throw new ConflictException(
      'Customer already has an active subscription for this product'
    );
  }
}
```

### Date Validation

```typescript
if (trialEndDate <= trialStartDate) {
  throw new ValidationException('Trial end must be after trial start');
}

if (currentPeriodEnd <= currentPeriodStart) {
  throw new ValidationException('Period end must be after period start');
}
```

### Affiliate Validation

```typescript
class CreateAffiliateDto {
  @IsString()
  @IsNotEmpty()
  externalAffiliateId: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsEnum(['bronze', 'silver', 'gold', 'diamond'])
  @IsOptional()
  tier?: string;

  @IsDecimal({ decimal_digits: '2' })
  @Min(0)
  @Max(100)
  @IsOptional()
  commissionRate?: number;

  @ValidateIf(o => !o.email && !o.phone)
  @IsNotEmpty({ message: 'Email or phone is required' })
  contactValidation?: any;
}
```

### Audit Log Validation

```typescript
class CreateAuditLogDto {
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsUUID()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsObject()
  @IsOptional()
  oldValues?: any;

  @IsObject()
  @IsOptional()
  newValues?: any;

  @IsArray()
  @IsOptional()
  changedFields?: string[];

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsEnum(['api', 'webhook', 'admin_panel', 'system', 'cron'])
  source: string;

  @IsObject()
  @IsOptional()
  sourceDetails?: any;
}
```

---

## Summary

This document covers all business rules for:

âœ… **Trial logic** - How trials work and when they convert
âœ… **Subscription lifecycle** - Complete flow from creation to cancellation
âœ… **All KPI calculations** - Exact SQL queries for each metric
âœ… **Affiliate system** - Tracking, tier management, and performance metrics
âœ… **Dashboard requirements** - Complete specification
âœ… **Analytics sections** - All detailed views needed including affiliates
âœ… **Audit system** - What gets logged, alerts, retention policies
âœ… **Validation rules** - Data integrity constraints

**Key Business Decisions Confirmed:**
- âœ… Trials are NOT separate entities (state within subscriptions)
- âœ… Coupons tracked via order fields only (no entity)
- âœ… Affiliates have dedicated entity for tracking & marketing
- âœ… Complete audit system with 2-year retention
- âœ… Automated alerts for critical events
- âœ… Affiliate tier classification based on revenue

**Next Document:** `04-DEVELOPMENT-GUIDE.md` will cover setup, coding standards, testing, and workflows.
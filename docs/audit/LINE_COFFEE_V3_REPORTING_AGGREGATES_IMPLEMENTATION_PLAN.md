# Line Coffee V3 — Reporting Aggregates Implementation Plan

Audit date: 2026-07-12  
Scope: plan only for Dashboard, Analytics, and Accounting. No migration, RPC, UI, or formula was changed in this phase.

## 1. Why this is required

The three admin reporting services download capped row sets into the browser and calculate totals there. Once any table exceeds its cap, lifetime totals and some period totals silently omit rows. Query ordering is also inconsistent: several ledgers have no explicit order, so the omitted horizon is not guaranteed to be the oldest or newest data.

Target architecture: Postgres computes authoritative aggregates over the complete eligible row set; the browser receives small typed DTOs plus separately paginated operational tables.

## 2. Current capped queries and affected output

### Dashboard — `src/lib/admin/admin-dashboard.ts`

| Source | Cap | Affected output |
|---|---:|---|
| `orders` | 5,000 | Sales and Orders KPIs, status/payment counts, preparation/fulfillment counts, overdue orders, week/month/year chart |
| `order_items` | 8,000 | Best sellers, units and revenue |
| `order_payments` | 8,000 | Paid and Net Collected totals/trends |
| `order_refunds` | 8,000 | Refunded and Net Collected totals/trends |
| `customers` | 5,000 | Customer KPI, new-customer split and trends |
| `inventory_stock` | 5,000 | on-hand/reserved/low-stock summaries |
| `products` / `categories` | 2,000 / 500 | Best-seller labels, images and categories |
| `reviews` / `contact_messages` | 2,000 / 2,000 | Latest review, average rating, moderation and inbox alerts |

`getAdminOrders()` supplies the six latest-order cards separately; it must remain a paginated/detail concern rather than part of the aggregate RPC.

### Analytics — `src/lib/admin/admin-analytics.ts`

| Source | Cap | Affected output |
|---|---:|---|
| `orders` | 5,000 | all sales/order/AOV/status/payment/geography/customer-order/promo-attribution metrics and charts |
| `order_items` | 12,000 | product and category units/revenue/ranking |
| `order_payments` / `order_refunds` | 8,000 each | paid, refunded, net collected and trends |
| `customers` | 5,000 | registered/guest/new counts and top-customer typing |
| `promo_redemptions` | 5,000 | promo uses, discount, attributed revenue and per-code performance |
| `products` / `categories` | 2,000 / 500 | product/category labels |
| `promo_codes` | 2,000 | active count and code status |
| `reviews` / `contact_messages` | 5,000 each | moderation/inbox counts |

### Accounting — `src/lib/admin/admin-accounting.ts`

| Source | Cap | Affected output |
|---|---:|---|
| `orders` | 5,000 | revenue, discounts, delivery, delivered sales/COGS/profit, receivable, counts, monthly trend and recent order rows |
| `order_payments` / `order_refunds` | 8,000 each | collection totals, per-order outstanding, method split, monthly collections and activity |
| `order_returns` | 5,000 | returns/restocked totals and activity |
| `expenses` | 2,000 | operating expenses, net profit, monthly expenses, expense table/activity |
| `purchases` | 2,000 | purchase totals, supplier payable, purchase table/activity |
| `supplier_payments` | 5,000 | supplier paid balances and activity |
| `suppliers` | 2,000 | supplier labels and balance table |

The current UI intentionally limits recent order display to 60 and recent activity to 50. Those are presentation limits and should remain explicit, server-paginated limits—not aggregate scan limits.

## 3. Current formulas to preserve during reconciliation

### Shared sales/cash rules

- Sales = sum of `orders.total` excluding `cancelled`.
- Valid orders = order count excluding `cancelled`.
- Net Collected = sum of `order_payments.amount` minus sum of `order_refunds.amount`, using each ledger's own event timestamp for trends.
- Refunds/returns do not rewrite historical order totals.

### Dashboard

- Orders KPI counts all statuses; Sales excludes cancelled; Customers counts join/create events.
- Periods: today versus yesterday, rolling 7 days versus prior 7, rolling 30 days versus prior 30, plus all time.
- Sales chart: 7 daily buckets, 6 five-day buckets covering 30 days, and 12 calendar-month buckets.
- Best sellers = sum `order_items.quantity` and `line_total`, excluding lines whose order is cancelled.
- Preparing overdue = `status = preparing` and `placed_at` older than 48 hours.

### Analytics

- AOV = non-cancelled sales / non-cancelled order count.
- Status and payment shares = count / all orders; delivered/cancelled/returned rates use the same denominator.
- Customer order count includes all statuses; customer spend excludes cancelled; repeat means at least two orders across all statuses.
- Product/category revenue = sum `order_items.line_total` excluding cancelled orders; category share = category revenue / total category revenue.
- Promo use/discount counts every redemption; attributed revenue is the linked order total only when the order is not cancelled.
- Geography order count includes all statuses; revenue and AOV exclude cancelled; repeat rate uses customers with at least two overall orders.
- Current 30-day AOV trend divides non-cancelled sales by **all** order events in the window. This differs from lifetime AOV and requires an owner decision before implementation; reconciliation must initially preserve it or explicitly version the correction.

### Accounting

- Gross sales = sum `orders.total` excluding cancelled.
- Net product sales = sum `subtotal` minus sum `discount_total`, excluding cancelled.
- Receivable per non-cancelled order = `max(total - (payments - refunds), 0)`.
- Delivered net sales = sum `subtotal - discount_total` for delivered orders only.
- COGS = sum stored `orders.cogs_total` for delivered orders only; null snapshots count as zero and increment `deliveredMissingCogs`.
- Gross profit = delivered net sales - delivered COGS; margin = gross profit / delivered net sales × 100.
- Operating expenses = sum `expenses.amount`; net profit = gross profit - operating expenses.
- Purchases are inventory/payable, not operating expense. Supplier payable = non-cancelled purchase total minus paid amount, floored at zero.
- Monthly chart uses six calendar months: non-cancelled order total, payments minus refunds, expenses, and delivered net sales minus COGS.

## 4. Proposed database API

Create versioned, admin-only database functions in one additive migration. Keep summary queries separate from paginated tables.

1. `get_admin_dashboard_report_v1(p_as_of timestamptz default now()) returns jsonb`
   - KPI windows, status/payment counts, sales series, best sellers, inventory/review/contact alert counts.
   - Latest orders remain an existing/paginated query.
2. `get_admin_analytics_report_v1(p_from timestamptz, p_to timestamptz, p_statuses text[] default null, p_payment_statuses text[] default null, p_product_slug text default null, p_category_slug text default null, p_governorate text default null) returns jsonb`
   - Summary, trends, customers, products/categories, promos and geography.
3. `get_admin_accounting_report_v1(p_from date, p_to date, p_statuses text[] default null, p_payment_statuses text[] default null) returns jsonb`
   - P&L, cash, receivable, purchasing/payables, return summary, method split and monthly series.
4. Paginated table functions or ordinary filtered reads:
   - `list_admin_accounting_orders_v1`, `list_admin_accounting_purchases_v1`, `list_admin_accounting_expenses_v1`, `list_admin_accounting_activity_v1` with `p_limit`, cursor, and stable descending timestamp/id ordering.

Use CTEs or internal non-exposed views for shared filtered order/payment/refund bases. Do not use a materialized view initially: the dashboards require current operational data, and correctness is more important than caching. Add materialization only after query plans on production-like volume prove it necessary.

## 5. Inputs and filter contract

All report calls need an explicit half-open time range `[from, to)` and a database-generated `calculated_at` timestamp. Dashboard preset windows can be generated from `p_as_of`; Analytics and Accounting accept caller-selected ranges.

Required filters:

- order statuses: nullable array; preserve each metric's existing cancelled/delivered rules when omitted;
- payment statuses: nullable array for order classification;
- product and category: canonical product/category key or slug; custom espresso/flavor map to explicit synthetic category keys;
- governorate: normalized exact value plus an `Unspecified` bucket;
- date dimension: `placed_at` for sales/orders, `paid_at` for payments, `refunded_at` for refunds, `expense_date` for expenses, `purchase_date` for purchases;
- timezone: owner must choose whether business-day buckets use `Africa/Cairo` or UTC. Existing browser calculations use the browser's local timezone.

Reject inverted/excessive ranges and unknown enum values. SQL must use typed inputs, not interpolated dynamic SQL.

## 6. Output DTO shapes

DTOs should use numeric JSON values (not formatted strings) and preserve current UI naming where practical.

```ts
type ReportMeta = {
  version: 1;
  calculatedAt: string;
  from: string | null;
  to: string;
  timezone: "Africa/Cairo" | "UTC";
  complete: true;
};

type DashboardReportV1 = {
  meta: ReportMeta;
  kpis: Array<{ key: "sales" | "orders" | "customers" | "netCollected"; today: number; week: number; month: number; all: number; previousToday: number; previousWeek: number; previousMonth: number }>;
  statusCounts: Record<string, number>;
  paymentStatusCounts: Record<string, number>;
  salesTrend: { week: Array<{ at: string; value: number }>; month: Array<{ at: string; value: number }>; year: Array<{ at: string; value: number }> };
  bestSellers: Array<{ key: string; slug: string | null; name: string; category: string; unitsSold: number; revenue: number }>;
  alerts: { overduePreparing: number; overdueCodes: string[]; lowStock: number; pendingReviews: number; newMessages: number };
  inventory: { onHandKg: number; reservedKg: number; tracked: number };
  reviews: { approved: number; averageRating: number; latest: null | { author: string; product: string; rating: number; text: string; publishedAt: string } };
};

type AnalyticsReportV1 = {
  meta: ReportMeta;
  sales: { ordersTotal: number; validOrders: number; salesTotal: number; paidTotal: number; refundedTotal: number; netCollected: number; averageOrderValue: number };
  rates: { delivered: number; cancelled: number; returned: number };
  statusBreakdown: Array<{ status: string; count: number; share: number }>;
  paymentSplit: Array<{ status: string; count: number; share: number }>;
  trend: { week: TrendPoint[]; month: TrendPoint[]; year: TrendPoint[] };
  comparisons30d: { sales: number | null; orders: number | null; aov: number | null; netCollected: number | null; newCustomers: number | null };
  customers: { total: number; registered: number; guest: number; repeat: number; new30d: number; avgOrders: number; top: TopCustomer[] };
  products: { topBySold: TopProduct[]; topByRevenue: TopProduct[]; categories: CategoryRollup[]; tracked: number };
  marketing: { promoUses: number; promoDiscount: number; promoRevenue: number; activePromos: number; promos: PromoRollup[]; reviewCounts: Record<string, number>; contactCounts: Record<string, number> };
  geography: GeographyRollup[];
};

type AccountingReportV1 = {
  meta: ReportMeta;
  revenue: { salesGross: number; productSubtotal: number; discounts: number; deliveryFees: number; netProductSales: number };
  profit: { deliveredNetSales: number; cogs: number; grossProfit: number; grossMargin: number; operatingExpenses: number; netProfit: number; deliveredMissingCogs: number };
  cash: { paid: number; refunded: number; netCollected: number; receivable: number; methods: MethodRollup[] };
  purchasing: { totalPurchases: number; paidToSuppliers: number; supplierPayable: number };
  returns: { count: number; restockedKg: number };
  counts: { orders: number; delivered: number; cancelled: number };
  monthly: Array<{ month: string; revenue: number; collections: number; expenses: number; grossProfit: number }>;
};
```

The final migration should define corresponding SQL composite types or documented JSON schemas and the TypeScript mapper should validate nullability and enum values at the boundary.

## 7. Migration and rollout strategy

1. Freeze and document formula decisions, timezone, date-boundary semantics and rounding (database numeric scale versus current `round2`/`Math.round`).
2. Add one migration containing internal helper queries and the three versioned RPCs. Do not replace existing functions or tables.
3. Add indexes only from `EXPLAIN (ANALYZE, BUFFERS)` evidence. Likely review targets: order `placed_at/status/payment_status/governorate`, ledger event dates/order IDs, order-item order/product keys, customer join date, expense/purchase dates and promo redemption order/code IDs.
4. Add thin `src/lib/admin/admin-reporting.ts` DTO mapping while retaining old services.
5. In development/staging, call old and new paths side by side, log safe field-level differences, and keep the old UI source.
6. Resolve every unexplained difference on fixed fixtures and production-like data.
7. Switch Dashboard, then Analytics, then Accounting behind an environment/feature flag.
8. Observe latency/error/difference telemetry, then remove capped aggregate scans in a later cleanup. Keep paginated operational lists.

## 8. RLS, security, and grants

- All functions must require an authenticated active admin through `public.is_admin()`; non-admin callers must receive a clear authorization error, not an empty report.
- Prefer `SECURITY INVOKER` (the default) with existing admin-select RLS. If a narrowly justified `SECURITY DEFINER` helper is required, pin `search_path = ''`, schema-qualify every object, validate admin status inside the function, and review every returned field for PII/cost exposure.
- Revoke execute from `PUBLIC` and `anon`; grant only to `authenticated`. RLS remains enabled on all underlying exposed tables.
- Do not return addresses, phone numbers, raw notes, purchase line costs, supplier details, or customer identity beyond fields already required by the admin report UI.
- Any exposed view must use `security_invoker = true`; internal views should live in an unexposed schema with explicit grants.
- Run Supabase database/security advisors and export live function privileges, RLS policies and grants before rollout.

## 9. Reconciliation test plan

Build deterministic fixtures covering: every order status/payment status; cancelled and returned orders; partial/multiple payments; refunds greater/less than payments; discounts and delivery fees; delivered orders with zero/null/nonzero COGS; guest/registered/repeat customers; multiple governorates and unspecified; custom espresso/flavor lines; promo on cancelled/non-cancelled orders; purchases in each status; supplier over/partial payment; expenses and sellable/non-sellable returns.

For each report:

1. Run current TypeScript calculation on the complete fixture dataset below all caps.
2. Run the RPC with the same frozen `as_of`, range and timezone.
3. Compare every scalar exactly at the agreed two-decimal boundary; compare arrays after stable key ordering.
4. Test date edges at midnight, month/year boundaries and Cairo daylight/offset assumptions.
5. Add more rows than every current cap and prove the RPC remains complete while the old result demonstrates the expected truncation.
6. Reconcile independent SQL sums for sales, cash, COGS, expenses and payables.
7. Authorization-test anon, authenticated non-admin, disabled admin, admin and super-admin.

Zero/null distinctions, rounding, custom category naming, cancelled-order denominators, the current 30-day AOV inconsistency, and missing COGS must have explicit assertions.

## 10. Rollout sequence

1. Create versioned RPCs and grants in staging.
2. Compare old and new results side by side in development with a fixed clock.
3. Run reconciliation and query-plan/load tests on production-like volume.
4. Enable the new Dashboard path for admins, then Analytics, then Accounting.
5. Monitor RPC latency, errors, completeness metadata and old/new deltas.
6. Switch UI fully only after owner sign-off.
7. Remove capped aggregate scans later in a separate patch; retain rollback flag until stable.

## 11. Risks and owner decisions

- Choose Cairo business time or UTC for day/month buckets.
- Decide whether to preserve or correct the Analytics 30-day AOV denominator and whether repeat customers count cancelled orders.
- Confirm whether geography order counts should include cancelled orders while revenue excludes them.
- Confirm whether Accounting delivered net sales intentionally excludes delivery fee from gross profit.
- Confirm handling of null COGS: zero plus warning (current behavior) or exclude from margin with an incomplete flag.
- Decide whether report filters affect all cards consistently or only the active tab/domain.
- Agree rounding location and precision; moving rounding into SQL can create one-cent differences.
- Large unindexed grouping can move load from browsers to Postgres; benchmark before adding indexes/materialization.
- JSON RPC payloads can become large if rankings/geography are unbounded; set explicit top/pagination limits while keeping aggregate totals complete.
- Live RLS/grants may differ from repository migrations and must be exported before implementation.

Owner approval is required before any migration because these decisions can change reported business numbers even when the underlying data is unchanged.

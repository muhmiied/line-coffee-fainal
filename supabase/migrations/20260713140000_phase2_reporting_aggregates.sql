-- =====================================================================
-- Line Coffee V3 — Phase 2: Reporting Correctness + Performance
-- Reporting aggregate RPCs (Dashboard / Analytics / Accounting)
-- =====================================================================
-- GOAL
--   Admin Dashboard, Analytics, and Accounting currently download capped row
--   sets into the browser (orders 5,000 / order_items 8,000-12,000 /
--   order_payments+order_refunds 8,000 each / customers 5,000 / etc.) and
--   compute every KPI, trend, and ranking in JavaScript. Once any table grows
--   past its cap, lifetime totals and period sums silently omit rows — with
--   no warning. This migration adds three admin-only, versioned reporting
--   functions that compute every official aggregate with plain SQL
--   aggregation over the COMPLETE table (no LIMIT before aggregating), so the
--   browser receives small, correct, pre-computed numbers instead of raw rows.
--
--   Per-row/paginated tables (latest orders, purchases list, expenses list,
--   CMS lists, etc.) are a SEPARATE, later concern in this same phase and are
--   NOT folded into these functions — they keep their own dedicated,
--   server-paginated reads. `get_admin_orders()` (latest 6 dashboard cards)
--   is untouched.
--
-- FORMULA CONTRACT (verified against the current TypeScript services before
-- writing a single line of SQL — see src/lib/admin/admin-dashboard.ts,
-- admin-analytics.ts, admin-accounting.ts):
--   * Sales / Sales excl. = Σ orders.total EXCLUDING status='cancelled'.
--   * Orders KPI counts ALL statuses (cancelled included).
--   * Net Collected = Σ order_payments.amount − Σ order_refunds.amount,
--     bucketed by each ledger's OWN event timestamp (paid_at / refunded_at).
--   * AOV = Sales(excl. cancelled) ÷ valid (non-cancelled) order count.
--   * Product/category units+revenue = Σ order_items, EXCLUDING lines whose
--     order is cancelled.
--   * COGS = Σ orders.cogs_total for DELIVERED orders only; a null snapshot
--     counts as 0 and is surfaced via `deliveredMissingCogs`, never guessed.
--   * Gross Profit = delivered (subtotal − discount_total) − delivered COGS.
--   * Supplier Payable = Σ max(purchases.total_amount − paid_amount, 0),
--     excluding cancelled purchases. Purchases are NOT operating expenses.
--   * Refunds/returns never rewrite historical order subtotals or COGS.
--   * Customers KPI counts by `customers.joined_at` (a `date`, NOT NULL — the
--     `joined_at || created_at` fallback in the old TS code was dead code;
--     joined_at is always present, so this migration reads it directly).
--
-- TIMEZONE (explicit correction, instructed): the old client-side code bucketed
-- "today/week/month" using the browser's local clock — effectively undefined
-- once run from a server or a different timezone. There is no existing
-- explicit owner decision on record, so per the task instructions this
-- migration uses `Africa/Cairo` consistently for every day/week/month
-- boundary. This is a deliberate, documented timezone-boundary correction, not
-- a silent behavior change — see the Phase 2 final report.
--
-- FORMULA BUG FOUND + FIXED: `admin-analytics.ts`'s payment-status breakdown
-- used a hardcoded enumeration `["paid","partially_paid","unpaid","refunded",
-- "failed"]` that OMITS "pending" — the actual default payment_status every
-- new order is created with (Decision 12: "all payments start Pending").
-- Live data at authoring time: 13 of 14 orders are payment_status='pending',
-- so the existing Analytics "Payment Status" breakdown silently drops 93% of
-- orders today. This migration's payment-status breakdown is DATA-DRIVEN
-- (`jsonb_object_agg` over whatever values actually occur), so this cannot
-- recur. Sales/COGS/profit totals were NOT affected by this bug (it only hid
-- rows from one breakdown card).
--
-- SECURITY (per the Security/SEO/Performance audit, section 8):
--   * SECURITY INVOKER (not DEFINER) — every read runs under the calling
--     admin's own privileges, so the existing admin-only RLS on orders /
--     order_items / order_payments / order_refunds / customers / products /
--     categories / promo_codes / promo_redemptions / reviews /
--     contact_messages / expenses / purchases / supplier_payments / suppliers
--     / order_returns stays the authoritative backstop even if this function
--     is ever reached some other way.
--   * An explicit `if not public.is_admin() then raise exception` runs FIRST,
--     so a non-admin authenticated caller gets a CLEAR authorization error
--     (not a silently empty report from RLS alone).
--   * `set search_path = ''` + fully schema-qualified references throughout.
--   * EXECUTE is revoked from PUBLIC and anon; granted only to authenticated.
--   * No cost/purchase-price/supplier/customer-PII field is returned beyond
--     what the existing admin UI already displays.
--
-- IDEMPOTENCY: `create index if not exists`, `create or replace function`.
-- Re-running this file is safe. Additive only — no existing table, view,
-- RLS policy, or function is altered or dropped.
--
-- NON-GOALS: no checkout/promo/inventory/FIFO/COGS/payment/refund business-
-- rule change. No public redesign. No admin visual change. This migration
-- only ADDS read-only reporting functions + 3 narrowly-justified indexes.
-- =====================================================================


-- =====================================================================
-- SECTION 1 — Supporting indexes
-- =====================================================================
-- The OLD client code never issued a SQL date-range predicate on these three
-- columns (it downloaded every row and filtered in JavaScript), so no index
-- existed for this access pattern. The new reporting functions below filter
-- order_payments/order_refunds/customers by date range for the first time —
-- this is a genuinely new query shape, not speculative index growth. At the
-- current (pre-launch, low-hundreds-of-rows) data volume `EXPLAIN` shows a
-- sequential scan either way (documented in the Phase 2 report); these
-- indexes are added for the query *shape* the new functions introduce, ahead
-- of volume growth — no other index is added.

create index if not exists order_payments_paid_at_idx on public.order_payments (paid_at);
create index if not exists order_refunds_refunded_at_idx on public.order_refunds (refunded_at);
create index if not exists customers_joined_at_idx on public.customers (joined_at);


-- =====================================================================
-- SECTION 2 — get_admin_dashboard_report_v1
-- =====================================================================
-- Replaces the capped client-side scan in getAdminDashboard() for every
-- KPI/aggregate field. `getAdminOrders()` (latest 6 order cards) is untouched
-- and stays a separate, already-paginated read.

create or replace function public.get_admin_dashboard_report_v1(p_as_of timestamptz default now())
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_as_of            timestamptz := coalesce(p_as_of, now());
  v_today_cairo      date        := (v_as_of at time zone 'Africa/Cairo')::date;
  v_today_start      timestamptz := (v_today_cairo::timestamp at time zone 'Africa/Cairo');
  v_yesterday_start  timestamptz := v_today_start - interval '1 day';
  v_week_start       timestamptz := v_as_of - interval '7 days';
  v_week_prev_start  timestamptz := v_as_of - interval '14 days';
  v_month_start      timestamptz := v_as_of - interval '30 days';
  v_month_prev_start timestamptz := v_as_of - interval '60 days';
  v_overdue_cutoff   timestamptz := v_as_of - interval '48 hours';
  v_result           jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  with weekday_names(idx, label) as (
    values (0,'Sun'),(1,'Mon'),(2,'Tue'),(3,'Wed'),(4,'Thu'),(5,'Fri'),(6,'Sat')
  ),
  month_names(idx, label) as (
    values (1,'Jan'),(2,'Feb'),(3,'Mar'),(4,'Apr'),(5,'May'),(6,'Jun'),
           (7,'Jul'),(8,'Aug'),(9,'Sep'),(10,'Oct'),(11,'Nov'),(12,'Dec')
  ),
  orders_all as (
    select o.id, o.code, o.status, o.payment_status, o.total, o.placed_at
    from public.orders o
  ),
  sales_kpi as (
    select jsonb_build_object(
      'today',     round(coalesce(sum(total) filter (where status <> 'cancelled' and placed_at >= v_today_start), 0), 2),
      'prevToday', round(coalesce(sum(total) filter (where status <> 'cancelled' and placed_at >= v_yesterday_start and placed_at < v_today_start), 0), 2),
      'week',      round(coalesce(sum(total) filter (where status <> 'cancelled' and placed_at >= v_week_start), 0), 2),
      'prevWeek',  round(coalesce(sum(total) filter (where status <> 'cancelled' and placed_at >= v_week_prev_start and placed_at < v_week_start), 0), 2),
      'month',     round(coalesce(sum(total) filter (where status <> 'cancelled' and placed_at >= v_month_start), 0), 2),
      'prevMonth', round(coalesce(sum(total) filter (where status <> 'cancelled' and placed_at >= v_month_prev_start and placed_at < v_month_start), 0), 2),
      'all',       round(coalesce(sum(total) filter (where status <> 'cancelled'), 0), 2)
    ) as data
    from orders_all
  ),
  orders_kpi as (
    select jsonb_build_object(
      'today',     count(*) filter (where placed_at >= v_today_start),
      'prevToday', count(*) filter (where placed_at >= v_yesterday_start and placed_at < v_today_start),
      'week',      count(*) filter (where placed_at >= v_week_start),
      'prevWeek',  count(*) filter (where placed_at >= v_week_prev_start and placed_at < v_week_start),
      'month',     count(*) filter (where placed_at >= v_month_start),
      'prevMonth', count(*) filter (where placed_at >= v_month_prev_start and placed_at < v_month_start),
      'all',       count(*)
    ) as data
    from orders_all
  ),
  customers_kpi as (
    select
      jsonb_build_object(
        'today',     count(*) filter (where joined_at::timestamptz >= v_today_start),
        'prevToday', count(*) filter (where joined_at::timestamptz >= v_yesterday_start and joined_at::timestamptz < v_today_start),
        'week',      count(*) filter (where joined_at::timestamptz >= v_week_start),
        'prevWeek',  count(*) filter (where joined_at::timestamptz >= v_week_prev_start and joined_at::timestamptz < v_week_start),
        'month',     count(*) filter (where joined_at::timestamptz >= v_month_start),
        'prevMonth', count(*) filter (where joined_at::timestamptz >= v_month_prev_start and joined_at::timestamptz < v_month_start),
        'all',       count(*)
      ) as data,
      count(*) as total_count,
      count(*) filter (where joined_at::timestamptz >= v_as_of - interval '30 days') as new_30d
    from public.customers
  ),
  net_collected_kpi as (
    select jsonb_build_object(
      'today',
        round(coalesce((select sum(amount) from public.order_payments where paid_at >= v_today_start), 0)
            - coalesce((select sum(amount) from public.order_refunds where refunded_at >= v_today_start), 0), 2),
      'prevToday',
        round(coalesce((select sum(amount) from public.order_payments where paid_at >= v_yesterday_start and paid_at < v_today_start), 0)
            - coalesce((select sum(amount) from public.order_refunds where refunded_at >= v_yesterday_start and refunded_at < v_today_start), 0), 2),
      'week',
        round(coalesce((select sum(amount) from public.order_payments where paid_at >= v_week_start), 0)
            - coalesce((select sum(amount) from public.order_refunds where refunded_at >= v_week_start), 0), 2),
      'prevWeek',
        round(coalesce((select sum(amount) from public.order_payments where paid_at >= v_week_prev_start and paid_at < v_week_start), 0)
            - coalesce((select sum(amount) from public.order_refunds where refunded_at >= v_week_prev_start and refunded_at < v_week_start), 0), 2),
      'month',
        round(coalesce((select sum(amount) from public.order_payments where paid_at >= v_month_start), 0)
            - coalesce((select sum(amount) from public.order_refunds where refunded_at >= v_month_start), 0), 2),
      'prevMonth',
        round(coalesce((select sum(amount) from public.order_payments where paid_at >= v_month_prev_start and paid_at < v_month_start), 0)
            - coalesce((select sum(amount) from public.order_refunds where refunded_at >= v_month_prev_start and refunded_at < v_month_start), 0), 2),
      'all',
        round(coalesce((select sum(amount) from public.order_payments), 0) - coalesce((select sum(amount) from public.order_refunds), 0), 2)
    ) as data
  ),
  status_counts as (
    select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb) as data
    from (select status, count(*) as cnt from orders_all group by status) s
  ),
  payment_status_counts as (
    select coalesce(jsonb_object_agg(payment_status, cnt), '{}'::jsonb) as data
    from (select payment_status, count(*) as cnt from orders_all group by payment_status) s
  ),
  week_buckets as (
    select (v_today_cairo - (6 - g)) as cairo_day from generate_series(0, 6) as g
  ),
  week_trend as (
    select jsonb_agg(jsonb_build_object('label', wn.label, 'value', round(coalesce(s.revenue, 0), 2)) order by wb.cairo_day) as data
    from week_buckets wb
    join weekday_names wn on wn.idx = extract(dow from wb.cairo_day)::int
    left join lateral (
      select sum(total) as revenue
      from orders_all
      where status <> 'cancelled'
        and placed_at >= (wb.cairo_day::timestamp at time zone 'Africa/Cairo')
        and placed_at <  ((wb.cairo_day + 1)::timestamp at time zone 'Africa/Cairo')
    ) s on true
  ),
  month_buckets as (
    select ((v_today_cairo - 29) + (g * 5)) as bucket_start_day from generate_series(0, 5) as g
  ),
  month_trend as (
    select jsonb_agg(jsonb_build_object('label', mn.label || ' ' || extract(day from mb.bucket_start_day)::int, 'value', round(coalesce(s.revenue, 0), 2)) order by mb.bucket_start_day) as data
    from month_buckets mb
    join month_names mn on mn.idx = extract(month from mb.bucket_start_day)::int
    left join lateral (
      select sum(total) as revenue
      from orders_all
      where status <> 'cancelled'
        and placed_at >= (mb.bucket_start_day::timestamp at time zone 'Africa/Cairo')
        and placed_at <  ((mb.bucket_start_day + 5)::timestamp at time zone 'Africa/Cairo')
    ) s on true
  ),
  year_buckets as (
    select (date_trunc('month', v_today_cairo::timestamp) - ((11 - g) || ' months')::interval)::date as month_start_day
    from generate_series(0, 11) as g
  ),
  year_trend as (
    select jsonb_agg(jsonb_build_object('label', mn.label, 'value', round(coalesce(s.revenue, 0), 2)) order by yb.month_start_day) as data
    from year_buckets yb
    join month_names mn on mn.idx = extract(month from yb.month_start_day)::int
    left join lateral (
      select sum(total) as revenue
      from orders_all
      where status <> 'cancelled'
        and placed_at >= (yb.month_start_day::timestamp at time zone 'Africa/Cairo')
        and placed_at <  ((yb.month_start_day + interval '1 month')::date::timestamp at time zone 'Africa/Cairo')
    ) s on true
  ),
  items_valid_dash as (
    select oi.product_slug, oi.name_en, oi.quantity, oi.line_total
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.status <> 'cancelled'
  ),
  product_rollup_dash as (
    select
      coalesce(iv.product_slug, 'custom:' || iv.name_en) as key,
      iv.product_slug as slug,
      max(coalesce(p.name_en, iv.name_en)) as name,
      max(case when p.category_slug is not null then coalesce(cat.name_en, initcap(replace(p.category_slug, '-', ' '))) else 'Custom' end) as category,
      max(p.image_url) as image,
      sum(greatest(iv.quantity, 0)) as units_sold,
      sum(iv.line_total) as revenue
    from items_valid_dash iv
    left join public.products p on p.slug = iv.product_slug
    left join public.categories cat on cat.slug = p.category_slug
    group by 1, 2
  ),
  best_sellers as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'slug', slug, 'name', name, 'category', category, 'image', image,
      'unitsSold', units_sold, 'revenue', round(revenue, 2)
    ) order by units_sold desc, revenue desc), '[]'::jsonb) as data
    from (select * from product_rollup_dash order by units_sold desc, revenue desc limit 5) t
  ),
  inventory_base as (
    select s.product_id, s.available_kg, s.reserved_kg, s.low_stock_threshold_kg, p.name_en
    from public.inventory_stock s
    left join public.products p on p.id = s.product_id
  ),
  inventory_summary as (
    select
      round(coalesce(sum(available_kg), 0), 2) as on_hand_kg,
      round(coalesce(sum(reserved_kg), 0), 2) as reserved_kg,
      count(*) filter (where available_kg <= low_stock_threshold_kg) as low_stock_count,
      count(*) as products_tracked
    from inventory_base
  ),
  low_stock_items as (
    select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(name_en, 'Product'), 'availableKg', round(available_kg, 2)) order by available_kg asc), '[]'::jsonb) as data
    from (select name_en, available_kg from inventory_base where available_kg <= low_stock_threshold_kg order by available_kg asc limit 5) t
  ),
  preparing_overdue_top4 as (
    select code, placed_at
    from orders_all
    where status = 'preparing' and placed_at < v_overdue_cutoff
    order by placed_at desc
    limit 4
  ),
  preparing_info as (
    select
      (select count(*) from orders_all where status = 'preparing') as total,
      (select count(*) from orders_all where status = 'preparing' and placed_at < v_overdue_cutoff) as overdue,
      coalesce((select jsonb_agg(code order by placed_at desc) from preparing_overdue_top4), '[]'::jsonb) as overdue_codes
  ),
  fulfillment_info as (
    select
      count(*) filter (where status = 'delivered') as delivered,
      count(*) filter (where status = 'cancelled') as cancelled,
      count(*) filter (where status = 'returned') as returned
    from orders_all
  ),
  reviews_info as (
    select
      count(*) filter (where status = 'approved' and hidden = false) as approved,
      count(*) filter (where status = 'pending') as pending,
      round(coalesce(avg(rating) filter (where status = 'approved' and hidden = false), 0)::numeric, 1) as avg_rating
    from public.reviews
  ),
  latest_review as (
    select (
      select jsonb_build_object(
        'author', r.customer_name,
        'rating', r.rating,
        'product', r.product_name,
        'text', r.comment_en,
        'date', coalesce(r.published_at, r.created_at)
      )
      from public.reviews r
      where r.status = 'approved' and r.hidden = false
      order by coalesce(r.published_at, r.created_at) desc
      limit 1
    ) as data
  ),
  contact_info as (
    select count(*) filter (where status = 'new') as new_count
    from public.contact_messages
  )
  select jsonb_build_object(
    'meta', jsonb_build_object('version', 1, 'calculatedAt', now(), 'asOf', v_as_of, 'timezone', 'Africa/Cairo'),
    'sales', sales_kpi.data,
    'orders', orders_kpi.data,
    'customers', jsonb_build_object('values', customers_kpi.data, 'totalCount', customers_kpi.total_count, 'newCount30d', customers_kpi.new_30d),
    'netCollected', net_collected_kpi.data,
    'statusCounts', status_counts.data,
    'paymentStatusCounts', payment_status_counts.data,
    'salesTrend', jsonb_build_object('week', week_trend.data, 'month', month_trend.data, 'year', year_trend.data),
    'bestSellers', best_sellers.data,
    'inventory', jsonb_build_object(
      'onHandKg', inventory_summary.on_hand_kg, 'reservedKg', inventory_summary.reserved_kg,
      'lowStockCount', inventory_summary.low_stock_count, 'productsTracked', inventory_summary.products_tracked
    ),
    'lowStockItems', low_stock_items.data,
    'preparing', jsonb_build_object('total', preparing_info.total, 'overdue', preparing_info.overdue, 'overdueCodes', preparing_info.overdue_codes),
    'fulfillment', jsonb_build_object('delivered', fulfillment_info.delivered, 'cancelled', fulfillment_info.cancelled, 'returned', fulfillment_info.returned),
    'reviews', jsonb_build_object('approved', reviews_info.approved, 'pending', reviews_info.pending, 'avgRating', reviews_info.avg_rating),
    'latestReview', latest_review.data,
    'contactNewCount', contact_info.new_count,
    'totalPaid', (select round(coalesce(sum(amount), 0), 2) from public.order_payments),
    'totalRefunded', (select round(coalesce(sum(amount), 0), 2) from public.order_refunds)
  )
  into v_result
  from sales_kpi, orders_kpi, customers_kpi, net_collected_kpi, status_counts, payment_status_counts,
       week_trend, month_trend, year_trend, best_sellers, inventory_summary, low_stock_items,
       preparing_info, fulfillment_info, reviews_info, latest_review, contact_info;

  return v_result;
end;
$$;


-- =====================================================================
-- SECTION 3 — get_admin_analytics_report_v1
-- =====================================================================
-- Replaces the capped client-side scan in getAdminAnalytics(). Percentage/
-- share/rate math and display sorting stay in TypeScript unchanged (fed by
-- these raw, complete numbers instead of a scanned/capped row set), so the
-- actual arithmetic for every ratio is not re-derived in a second language.

create or replace function public.get_admin_analytics_report_v1(p_as_of timestamptz default now())
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_as_of        timestamptz := coalesce(p_as_of, now());
  v_today_cairo  date        := (v_as_of at time zone 'Africa/Cairo')::date;
  v_cur30_start  timestamptz := v_as_of - interval '30 days';
  v_prev30_start timestamptz := v_as_of - interval '60 days';
  v_result       jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  with weekday_names(idx, label) as (
    values (0,'Sun'),(1,'Mon'),(2,'Tue'),(3,'Wed'),(4,'Thu'),(5,'Fri'),(6,'Sat')
  ),
  month_names(idx, label) as (
    values (1,'Jan'),(2,'Feb'),(3,'Mar'),(4,'Apr'),(5,'May'),(6,'Jun'),
           (7,'Jul'),(8,'Aug'),(9,'Sep'),(10,'Oct'),(11,'Nov'),(12,'Dec')
  ),
  orders_all as (
    select o.id, o.customer_id, o.status, o.payment_status, o.total, o.governorate, o.placed_at
    from public.orders o
  ),
  sales_summary as (
    select
      count(*) as orders_total,
      count(*) filter (where status <> 'cancelled') as valid_orders,
      round(coalesce(sum(total) filter (where status <> 'cancelled'), 0), 2) as sales_total
    from orders_all
  ),
  cash_summary as (
    select
      round(coalesce((select sum(amount) from public.order_payments), 0), 2) as paid_total,
      round(coalesce((select sum(amount) from public.order_refunds), 0), 2) as refunded_total
  ),
  status_counts as (
    select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb) as data
    from (select status, count(*) as cnt from orders_all group by status) s
  ),
  payment_status_counts as (
    -- Data-driven (not a hardcoded enum list) — this is the fix for the
    -- confirmed "pending" omission bug documented at the top of this file.
    select coalesce(jsonb_object_agg(payment_status, cnt), '{}'::jsonb) as data
    from (select payment_status, count(*) as cnt from orders_all group by payment_status) s
  ),
  week_buckets as (
    select (v_today_cairo - (6 - g)) as cairo_day from generate_series(0, 6) as g
  ),
  week_trend as (
    select jsonb_agg(jsonb_build_object('label', wn.label, 'revenue', round(coalesce(s.revenue, 0), 2), 'orders', coalesce(s.cnt, 0)) order by wb.cairo_day) as data
    from week_buckets wb
    join weekday_names wn on wn.idx = extract(dow from wb.cairo_day)::int
    left join lateral (
      select sum(total) filter (where status <> 'cancelled') as revenue, count(*) as cnt
      from orders_all
      where placed_at >= (wb.cairo_day::timestamp at time zone 'Africa/Cairo')
        and placed_at <  ((wb.cairo_day + 1)::timestamp at time zone 'Africa/Cairo')
    ) s on true
  ),
  month_buckets as (
    select ((v_today_cairo - 29) + (g * 5)) as bucket_start_day from generate_series(0, 5) as g
  ),
  month_trend as (
    select jsonb_agg(jsonb_build_object('label', mn.label || ' ' || extract(day from mb.bucket_start_day)::int, 'revenue', round(coalesce(s.revenue, 0), 2), 'orders', coalesce(s.cnt, 0)) order by mb.bucket_start_day) as data
    from month_buckets mb
    join month_names mn on mn.idx = extract(month from mb.bucket_start_day)::int
    left join lateral (
      select sum(total) filter (where status <> 'cancelled') as revenue, count(*) as cnt
      from orders_all
      where placed_at >= (mb.bucket_start_day::timestamp at time zone 'Africa/Cairo')
        and placed_at <  ((mb.bucket_start_day + 5)::timestamp at time zone 'Africa/Cairo')
    ) s on true
  ),
  year_buckets as (
    select (date_trunc('month', v_today_cairo::timestamp) - ((11 - g) || ' months')::interval)::date as month_start_day
    from generate_series(0, 11) as g
  ),
  year_trend as (
    select jsonb_agg(jsonb_build_object('label', mn.label, 'revenue', round(coalesce(s.revenue, 0), 2), 'orders', coalesce(s.cnt, 0)) order by yb.month_start_day) as data
    from year_buckets yb
    join month_names mn on mn.idx = extract(month from yb.month_start_day)::int
    left join lateral (
      select sum(total) filter (where status <> 'cancelled') as revenue, count(*) as cnt
      from orders_all
      where placed_at >= (yb.month_start_day::timestamp at time zone 'Africa/Cairo')
        and placed_at <  ((yb.month_start_day + interval '1 month')::date::timestamp at time zone 'Africa/Cairo')
    ) s on true
  ),
  windows30d as (
    select
      round(coalesce(sum(total) filter (where status <> 'cancelled' and placed_at >= v_cur30_start), 0), 2) as sales_cur,
      round(coalesce(sum(total) filter (where status <> 'cancelled' and placed_at >= v_prev30_start and placed_at < v_cur30_start), 0), 2) as sales_prev,
      count(*) filter (where placed_at >= v_cur30_start) as orders_cur,
      count(*) filter (where placed_at >= v_prev30_start and placed_at < v_cur30_start) as orders_prev
    from orders_all
  ),
  net_windows30d as (
    select
      round(coalesce((select sum(amount) from public.order_payments where paid_at >= v_cur30_start), 0)
          - coalesce((select sum(amount) from public.order_refunds where refunded_at >= v_cur30_start), 0), 2) as net_cur,
      round(coalesce((select sum(amount) from public.order_payments where paid_at >= v_prev30_start and paid_at < v_cur30_start), 0)
          - coalesce((select sum(amount) from public.order_refunds where refunded_at >= v_prev30_start and refunded_at < v_cur30_start), 0), 2) as net_prev
  ),
  customers_base as (
    select id, type, joined_at from public.customers
  ),
  customers_summary as (
    select
      count(*) as total,
      count(*) filter (where type = 'registered') as registered,
      count(*) filter (where type <> 'registered') as guest,
      count(*) filter (where joined_at::timestamptz >= v_cur30_start) as new_cur,
      count(*) filter (where joined_at::timestamptz >= v_prev30_start and joined_at::timestamptz < v_cur30_start) as new_prev
    from customers_base
  ),
  customer_orders_ranked as (
    select
      o.customer_id, o.customer_name, o.status, o.total, o.placed_at,
      row_number() over (partition by o.customer_id order by o.placed_at desc) as rn
    from public.orders o
    where o.customer_id is not null
  ),
  customer_agg as (
    select
      customer_id,
      max(customer_name) filter (where rn = 1) as name,
      count(*) as orders_count,
      coalesce(sum(total) filter (where status <> 'cancelled'), 0) as spend,
      max(placed_at) filter (where rn = 1) as last_order_at
    from customer_orders_ranked
    group by customer_id
  ),
  repeat_customers as (
    select customer_id from customer_agg where orders_count >= 2
  ),
  avg_orders as (
    select
      count(*) as ordering_customers,
      coalesce(sum(orders_count), 0) as orders_with_customer,
      count(*) filter (where orders_count >= 2) as repeat_count
    from customer_agg
  ),
  top_customers as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', customer_id, 'name', coalesce(name, 'Customer'),
      'type', case when cb.type = 'registered' then 'registered' else 'guest' end,
      'orders', orders_count, 'spend', round(spend, 2), 'lastOrder', last_order_at
    ) order by spend desc, orders_count desc), '[]'::jsonb) as data
    from (select * from customer_agg order by spend desc, orders_count desc limit 8) ca
    left join customers_base cb on cb.id = ca.customer_id
  ),
  items_valid as (
    select oi.kind, oi.product_slug, oi.name_en, oi.quantity, oi.line_total
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.status <> 'cancelled'
  ),
  product_rollup as (
    select
      coalesce(iv.product_slug, 'custom:' || iv.name_en) as key,
      max(coalesce(p.name_en, iv.name_en)) as name,
      max(case
        when iv.kind = 'custom_espresso' then 'Make Your Espresso'
        when iv.kind = 'custom_flavor' then 'Make Your Flavor'
        when p.category_slug is not null then coalesce(cat.name_en, initcap(replace(p.category_slug, '-', ' ')))
        else 'Other'
      end) as category,
      sum(greatest(iv.quantity, 0)) as units_sold,
      sum(iv.line_total) as revenue
    from items_valid iv
    left join public.products p on p.slug = iv.product_slug
    left join public.categories cat on cat.slug = p.category_slug
    group by 1
  ),
  top_by_sold as (
    select coalesce(jsonb_agg(jsonb_build_object('key', key, 'name', name, 'category', category, 'unitsSold', units_sold, 'revenue', round(revenue, 2)) order by units_sold desc, revenue desc), '[]'::jsonb) as data
    from (select * from product_rollup order by units_sold desc, revenue desc limit 8) t
  ),
  top_by_revenue as (
    select coalesce(jsonb_agg(jsonb_build_object('key', key, 'name', name, 'category', category, 'unitsSold', units_sold, 'revenue', round(revenue, 2)) order by revenue desc, units_sold desc), '[]'::jsonb) as data
    from (select * from product_rollup order by revenue desc, units_sold desc limit 8) t
  ),
  category_rollup as (
    select max(category) as category, sum(units_sold) as units_sold, sum(revenue) as revenue
    from product_rollup
    group by category
  ),
  categories as (
    select coalesce(jsonb_agg(jsonb_build_object('key', category, 'name', category, 'unitsSold', units_sold, 'revenue', round(revenue, 2)) order by revenue desc), '[]'::jsonb) as data
    from category_rollup
  ),
  products_tracked as (
    select count(*) as cnt from product_rollup
  ),
  promo_redemptions_valid as (
    select
      pr.discount_amount,
      coalesce(pc.code, pr.code_snapshot, 'Unknown') as code,
      coalesce(pc.status, 'unknown') as status,
      o.total, o.status as order_status
    from public.promo_redemptions pr
    left join public.promo_codes pc on pc.id = pr.promo_code_id
    left join public.orders o on o.id = pr.order_id
  ),
  promo_rollup as (
    select
      code, max(status) as status, count(*) as uses,
      sum(discount_amount) as discount_given,
      sum(total) filter (where order_status <> 'cancelled') as revenue
    from promo_redemptions_valid
    group by code
  ),
  promo_performance as (
    select coalesce(jsonb_agg(jsonb_build_object('code', code, 'status', status, 'uses', uses, 'discountGiven', round(discount_given, 2), 'revenue', round(coalesce(revenue, 0), 2)) order by coalesce(revenue, 0) desc, uses desc), '[]'::jsonb) as data
    from promo_rollup
  ),
  promo_summary as (
    select
      count(*) as usage_total,
      round(coalesce(sum(discount_amount), 0), 2) as discount_total,
      round(coalesce(sum(total) filter (where order_status <> 'cancelled'), 0), 2) as revenue_total
    from promo_redemptions_valid
  ),
  active_promo_count as (
    select count(*) as cnt from public.promo_codes where status = 'active'
  ),
  reviews_summary as (
    select
      count(*) filter (where status = 'approved' and hidden = false) as approved,
      count(*) filter (where status = 'pending') as pending,
      count(*) filter (where status = 'rejected') as rejected,
      count(*) as total
    from public.reviews
  ),
  contact_summary as (
    select
      count(*) filter (where status = 'new') as new_count,
      count(*) filter (where status = 'in_progress') as in_progress,
      count(*) filter (where status = 'replied') as replied,
      count(*) filter (where status = 'archived') as archived,
      count(*) as total
    from public.contact_messages
  ),
  geo_base as (
    select coalesce(nullif(btrim(o.governorate), ''), 'Unspecified') as governorate, o.id, o.customer_id, o.status, o.total
    from orders_all o
  ),
  geo_agg as (
    select
      governorate,
      count(*) as orders,
      count(*) filter (where status <> 'cancelled') as valid_orders,
      round(coalesce(sum(total) filter (where status <> 'cancelled'), 0), 2) as revenue,
      count(distinct customer_id) as customers,
      count(distinct customer_id) filter (where customer_id in (select customer_id from repeat_customers)) as repeat_customers
    from geo_base
    group by governorate
  ),
  geography as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'governorate', governorate, 'orders', orders, 'validOrders', valid_orders,
      'revenue', revenue, 'customers', customers, 'repeatCustomers', repeat_customers
    ) order by revenue desc, orders desc), '[]'::jsonb) as data
    from geo_agg
  )
  select jsonb_build_object(
    'meta', jsonb_build_object('version', 1, 'calculatedAt', now(), 'asOf', v_as_of, 'timezone', 'Africa/Cairo'),
    'ordersTotal', sales_summary.orders_total,
    'validOrders', sales_summary.valid_orders,
    'salesTotal', sales_summary.sales_total,
    'paidTotal', cash_summary.paid_total,
    'refundedTotal', cash_summary.refunded_total,
    'statusCounts', status_counts.data,
    'paymentStatusCounts', payment_status_counts.data,
    'trend', jsonb_build_object('week', week_trend.data, 'month', month_trend.data, 'year', year_trend.data),
    'windows30d', jsonb_build_object(
      'salesCur', windows30d.sales_cur, 'salesPrev', windows30d.sales_prev,
      'ordersCur', windows30d.orders_cur, 'ordersPrev', windows30d.orders_prev,
      'netCur', net_windows30d.net_cur, 'netPrev', net_windows30d.net_prev,
      'newCustomersCur', customers_summary.new_cur, 'newCustomersPrev', customers_summary.new_prev
    ),
    'customers', jsonb_build_object(
      'total', customers_summary.total, 'registered', customers_summary.registered, 'guest', customers_summary.guest,
      'repeatCustomers', avg_orders.repeat_count,
      'avgOrdersPerCustomer', case when avg_orders.ordering_customers > 0 then round((avg_orders.orders_with_customer::numeric / avg_orders.ordering_customers), 1) else 0 end,
      'top', top_customers.data
    ),
    'products', jsonb_build_object('topBySold', top_by_sold.data, 'topByRevenue', top_by_revenue.data, 'categories', categories.data, 'tracked', products_tracked.cnt),
    'marketing', jsonb_build_object(
      'promoUsageTotal', promo_summary.usage_total, 'promoDiscountTotal', promo_summary.discount_total,
      'promoRevenue', promo_summary.revenue_total, 'activePromoCount', active_promo_count.cnt,
      'promoPerformance', promo_performance.data,
      'reviews', jsonb_build_object('approved', reviews_summary.approved, 'pending', reviews_summary.pending, 'rejected', reviews_summary.rejected, 'total', reviews_summary.total),
      'contact', jsonb_build_object('new', contact_summary.new_count, 'inProgress', contact_summary.in_progress, 'replied', contact_summary.replied, 'archived', contact_summary.archived, 'total', contact_summary.total)
    ),
    'geography', geography.data
  )
  into v_result
  from sales_summary, cash_summary, status_counts, payment_status_counts,
       week_trend, month_trend, year_trend, windows30d, net_windows30d, customers_summary,
       avg_orders, top_customers, top_by_sold, top_by_revenue, categories, products_tracked,
       promo_summary, active_promo_count, promo_performance, reviews_summary, contact_summary, geography;

  return v_result;
end;
$$;


-- =====================================================================
-- SECTION 4 — get_admin_accounting_report_v1
-- =====================================================================
-- Replaces the capped client-side scan in getAdminAccounting() for every
-- KPI-level total. Purchases/expenses/orders LIST tables and the merged
-- "recent transactions" timeline are a separate, explicit pagination concern
-- (Section 4 of the Phase 2 task) and are NOT embedded here — only supplier
-- balances (bounded by supplier count) and the 6-month trend are included, to
-- keep this payload small and match the plan's "small typed DTOs" principle.

create or replace function public.get_admin_accounting_report_v1(p_as_of timestamptz default now())
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_as_of       timestamptz := coalesce(p_as_of, now());
  v_today_cairo date        := (v_as_of at time zone 'Africa/Cairo')::date;
  v_result      jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  with month_names(idx, label) as (
    values (1,'Jan'),(2,'Feb'),(3,'Mar'),(4,'Apr'),(5,'May'),(6,'Jun'),
           (7,'Jul'),(8,'Aug'),(9,'Sep'),(10,'Oct'),(11,'Nov'),(12,'Dec')
  ),
  orders_all as (
    select o.id, o.status, o.subtotal, o.discount_total, o.delivery_fee, o.total, o.cogs_total, o.placed_at
    from public.orders o
  ),
  revenue as (
    select
      round(coalesce(sum(total) filter (where status <> 'cancelled'), 0), 2) as sales_gross,
      round(coalesce(sum(subtotal) filter (where status <> 'cancelled'), 0), 2) as product_subtotal,
      round(coalesce(sum(discount_total) filter (where status <> 'cancelled'), 0), 2) as discounts_total,
      round(coalesce(sum(delivery_fee) filter (where status <> 'cancelled'), 0), 2) as delivery_fees_total,
      round(coalesce(sum(subtotal - discount_total) filter (where status = 'delivered'), 0), 2) as delivered_net_sales,
      round(coalesce(sum(coalesce(cogs_total, 0)) filter (where status = 'delivered'), 0), 2) as cogs_total,
      count(*) filter (where status = 'delivered' and cogs_total is null) as delivered_missing_cogs,
      count(*) as order_count,
      count(*) filter (where status = 'delivered') as delivered_count,
      count(*) filter (where status = 'cancelled') as cancelled_count
    from orders_all
  ),
  per_order_cash as (
    select
      o.id, o.total, o.status,
      coalesce(p.paid, 0) as paid,
      coalesce(r.refunded, 0) as refunded
    from orders_all o
    left join (select order_id, sum(amount) as paid from public.order_payments group by order_id) p on p.order_id = o.id
    left join (select order_id, sum(amount) as refunded from public.order_refunds group by order_id) r on r.order_id = o.id
  ),
  cash as (
    select
      round(coalesce((select sum(amount) from public.order_payments), 0), 2) as paid_total,
      round(coalesce((select sum(amount) from public.order_refunds), 0), 2) as refunded_total,
      round(coalesce(sum(greatest(total - (paid - refunded), 0)) filter (where status <> 'cancelled'), 0), 2) as receivable
    from per_order_cash
  ),
  method_breakdown as (
    select coalesce(jsonb_agg(jsonb_build_object('key', method, 'amount', round(amount, 2), 'count', cnt)
      order by case method when 'cash' then 1 when 'bank_transfer' then 2 when 'mobile_wallet' then 3 else 4 end), '[]'::jsonb) as data
    from (select method, sum(amount) as amount, count(*) as cnt from public.order_payments group by method) m
  ),
  expenses_agg as (
    select round(coalesce(sum(amount), 0), 2) as operating_expenses from public.expenses
  ),
  purchases_agg as (
    select
      round(coalesce(sum(total_amount) filter (where status <> 'cancelled'), 0), 2) as total_purchases,
      round(coalesce(sum(paid_amount) filter (where status <> 'cancelled'), 0), 2) as paid_to_suppliers,
      round(coalesce(sum(greatest(total_amount - paid_amount, 0)) filter (where status <> 'cancelled'), 0), 2) as supplier_payable
    from public.purchases
  ),
  supplier_balances as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'supplierId', supplier_id, 'name', name, 'purchaseCount', purchase_count,
      'purchaseTotal', round(purchase_total, 2), 'paid', round(paid, 2), 'payable', round(payable, 2)
    ) order by payable desc, purchase_total desc), '[]'::jsonb) as data
    from (
      select
        pu.supplier_id, max(s.name) as name, count(*) as purchase_count,
        sum(pu.total_amount) as purchase_total, sum(pu.paid_amount) as paid,
        sum(greatest(pu.total_amount - pu.paid_amount, 0)) as payable
      from public.purchases pu
      left join public.suppliers s on s.id = pu.supplier_id
      where pu.status <> 'cancelled'
      group by pu.supplier_id
    ) sb
  ),
  returns_agg as (
    select count(*) as returns_count, round(coalesce(sum(restocked_kg), 0), 2) as restocked_kg
    from public.order_returns
  ),
  month_buckets as (
    select (date_trunc('month', v_today_cairo::timestamp) - ((5 - g) || ' months')::interval)::date as month_start_day
    from generate_series(0, 5) as g
  ),
  monthly as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'label', mn.label || ' ' || to_char(mb.month_start_day, 'YY'),
      'revenue', round(coalesce(rev.v, 0), 2),
      'collections', round(coalesce(pay.v, 0) - coalesce(ref.v, 0), 2),
      'expenses', round(coalesce(exp.v, 0), 2),
      'grossProfit', round(coalesce(gp.v, 0), 2)
    ) order by mb.month_start_day), '[]'::jsonb) as data
    from month_buckets mb
    join month_names mn on mn.idx = extract(month from mb.month_start_day)::int
    left join lateral (
      select sum(total) as v from orders_all
      where status <> 'cancelled'
        and placed_at >= (mb.month_start_day::timestamp at time zone 'Africa/Cairo')
        and placed_at <  ((mb.month_start_day + interval '1 month')::date::timestamp at time zone 'Africa/Cairo')
    ) rev on true
    left join lateral (
      select sum(amount) as v from public.order_payments
      where paid_at >= (mb.month_start_day::timestamp at time zone 'Africa/Cairo')
        and paid_at <  ((mb.month_start_day + interval '1 month')::date::timestamp at time zone 'Africa/Cairo')
    ) pay on true
    left join lateral (
      select sum(amount) as v from public.order_refunds
      where refunded_at >= (mb.month_start_day::timestamp at time zone 'Africa/Cairo')
        and refunded_at <  ((mb.month_start_day + interval '1 month')::date::timestamp at time zone 'Africa/Cairo')
    ) ref on true
    left join lateral (
      select sum(amount) as v from public.expenses
      where expense_date >= mb.month_start_day
        and expense_date <  (mb.month_start_day + interval '1 month')::date
    ) exp on true
    left join lateral (
      select sum(subtotal - discount_total - coalesce(cogs_total, 0)) as v
      from orders_all
      where status = 'delivered'
        and placed_at >= (mb.month_start_day::timestamp at time zone 'Africa/Cairo')
        and placed_at <  ((mb.month_start_day + interval '1 month')::date::timestamp at time zone 'Africa/Cairo')
    ) gp on true
  )
  select jsonb_build_object(
    'meta', jsonb_build_object('version', 1, 'calculatedAt', now(), 'asOf', v_as_of, 'timezone', 'Africa/Cairo'),
    'salesGross', revenue.sales_gross,
    'productSubtotal', revenue.product_subtotal,
    'discountsTotal', revenue.discounts_total,
    'deliveryFeesTotal', revenue.delivery_fees_total,
    'deliveredNetSales', revenue.delivered_net_sales,
    'cogsTotal', revenue.cogs_total,
    'deliveredMissingCogs', revenue.delivered_missing_cogs,
    'orderCount', revenue.order_count,
    'deliveredCount', revenue.delivered_count,
    'cancelledCount', revenue.cancelled_count,
    'paidTotal', cash.paid_total,
    'refundedTotal', cash.refunded_total,
    'receivable', cash.receivable,
    'methodBreakdown', method_breakdown.data,
    'operatingExpenses', expenses_agg.operating_expenses,
    'totalPurchases', purchases_agg.total_purchases,
    'paidToSuppliers', purchases_agg.paid_to_suppliers,
    'supplierPayable', purchases_agg.supplier_payable,
    'supplierBalances', supplier_balances.data,
    'returnsCount', returns_agg.returns_count,
    'restockedKg', returns_agg.restocked_kg,
    'monthly', monthly.data
  )
  into v_result
  from revenue, cash, method_breakdown, expenses_agg, purchases_agg, supplier_balances, returns_agg, monthly;

  return v_result;
end;
$$;


-- =====================================================================
-- SECTION 5 — Grants
-- =====================================================================
-- Read-only aggregate reports: revoked from PUBLIC and anon; granted only to
-- authenticated (the explicit is_admin() check inside each function is the
-- clear-error gate; RLS on every underlying table remains the authoritative
-- backstop since these run SECURITY INVOKER).

revoke all on function public.get_admin_dashboard_report_v1(timestamptz) from public, anon;
revoke all on function public.get_admin_analytics_report_v1(timestamptz) from public, anon;
revoke all on function public.get_admin_accounting_report_v1(timestamptz) from public, anon;

grant execute on function public.get_admin_dashboard_report_v1(timestamptz) to authenticated;
grant execute on function public.get_admin_analytics_report_v1(timestamptz) to authenticated;
grant execute on function public.get_admin_accounting_report_v1(timestamptz) to authenticated;

"use client";

// Admin Analytics — real Supabase data layer (Phase 16A).
//
// Aggregates the Admin Analytics module entirely from real tables. Every source
// is admin-only via RLS (`is_admin()`) and already granted SELECT to the
// `authenticated` role by earlier migrations — no new migration is needed:
//   orders / order_items                    (20260625120000 + 20260627110000)
//   order_payments / order_refunds          (20260703120000)
//   customers                               (20260703130000)
//   products / categories                   (20260625203528)
//   promo_codes / promo_redemptions         (20260701104031)
//   reviews / contact_messages              (20260703140000)
//
// Formula rules (per the Phase 16A spec):
//   - Sales            = Σ orders.total, EXCLUDING cancelled orders.
//   - Valid orders     = order count EXCLUDING cancelled.
//   - Net Collected    = Σ order_payments.amount − Σ order_refunds.amount.
//   - Refunds          = Σ order_refunds.amount (reduces cash only, never sales).
//   - AOV              = Sales ÷ valid order count.
//   - Product revenue  = Σ order_items.line_total, EXCLUDING cancelled orders.
//   - Returns/refunds never rewrite historical sales.
//   - No COGS / profit is computed here (that belongs to Accounting).
//   - There is NO web-traffic / session / view / conversion source in the DB, so
//     none of those are faked — the UI shows an honest "not connected" state.
//   - When there is no data, numbers are honest zeros / empty states, never mock.

import { supabase } from "@/lib/supabase/client";
import type { OrderStatus, PaymentStatus } from "@/lib/types/order";
import {
  DAY,
  MONTH_SHORT,
  WEEKDAY_SHORT,
  firstOrderStatus,
  money,
  trendPct,
  ts,
} from "@/lib/admin/admin-metrics";

const ORDERS_SCAN_LIMIT = 5000;
const ITEMS_SCAN_LIMIT = 12000;
const LEDGER_SCAN_LIMIT = 8000;
const CUSTOMERS_SCAN_LIMIT = 5000;
const REDEMPTIONS_SCAN_LIMIT = 5000;

// ── Public types ───────────────────────────────────────────────────────────────

export type AnalyticsTrend = number | null;

export type AnalyticsTrendPoint = { label: string; revenue: number; orders: number };

export type AnalyticsTrend3 = {
  week: AnalyticsTrendPoint[];
  month: AnalyticsTrendPoint[];
  year: AnalyticsTrendPoint[];
};

export type AnalyticsStatusBreakdown = {
  status: OrderStatus;
  count: number;
  share: number; // % of all orders
};

export type AnalyticsPaymentSplit = {
  status: PaymentStatus;
  count: number;
  share: number; // % of all orders
};

export type AnalyticsTopProduct = {
  key: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
};

export type AnalyticsCategory = {
  key: string;
  name: string;
  unitsSold: number;
  revenue: number;
  share: number; // % of category revenue
};

export type AnalyticsTopCustomer = {
  id: string;
  name: string;
  type: "guest" | "registered";
  orders: number;
  spend: number;
  lastOrder: string | null;
};

export type AnalyticsPromoRow = {
  code: string;
  status: string;
  uses: number;
  discountGiven: number;
  revenue: number;
};

export type AnalyticsGeographyRow = {
  governorate: string;
  orders: number;
  revenue: number;
  customers: number;
  averageOrderValue: number;
  repeatRate: number; // % of that area's customers with 2+ orders overall
};

export type AdminAnalyticsData = {
  // ── Sales ──
  ordersTotal: number;
  validOrders: number;
  salesTotal: number;
  paidTotal: number;
  refundedTotal: number;
  netCollected: number;
  averageOrderValue: number;
  statusBreakdown: AnalyticsStatusBreakdown[];
  paymentSplit: AnalyticsPaymentSplit[];
  deliveredRate: number;
  cancelledRate: number;
  returnedRate: number;

  // trends (real, bucketed by placed_at / paid_at / refunded_at)
  trend: AnalyticsTrend3;

  // period-over-period (last 30d vs prior 30d)
  salesTrend30d: AnalyticsTrend;
  ordersTrend30d: AnalyticsTrend;
  aovTrend30d: AnalyticsTrend;
  netCollectedTrend30d: AnalyticsTrend;
  newCustomersTrend30d: AnalyticsTrend;

  // ── Customers ──
  totalCustomers: number;
  registeredCount: number;
  guestCount: number;
  repeatCustomers: number;
  newCustomers30d: number;
  avgOrdersPerCustomer: number;
  topCustomers: AnalyticsTopCustomer[];

  // ── Products ──
  topBySold: AnalyticsTopProduct[];
  topByRevenue: AnalyticsTopProduct[];
  categories: AnalyticsCategory[];
  productsTracked: number;

  // ── Marketing ──
  promoUsageTotal: number;
  promoDiscountTotal: number;
  activePromoCount: number;
  promoRevenue: number;
  promoPerformance: AnalyticsPromoRow[];
  reviewsApproved: number;
  reviewsPending: number;
  reviewsRejected: number;
  reviewsTotal: number;
  contactNew: number;
  contactInProgress: number;
  contactReplied: number;
  contactArchived: number;
  contactTotal: number;

  // ── Geography ──
  geography: AnalyticsGeographyRow[];

  // ── Honesty flags ──
  hasAnyData: boolean;
  // There is no analytics/tracking backend for behavioural web metrics.
  trafficTrackingConnected: false;
};

export class AdminAnalyticsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAnalyticsError";
  }
}

function devWarn(scope: string, message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[admin-analytics:${scope}] ${message}`);
  }
}

function readError(scope: string, message: string) {
  devWarn(scope, message);
  return new AdminAnalyticsError("Could not load analytics data. Please try again.");
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ── Row shapes ───────────────────────────────────────────────────────────────

type OrderRow = {
  id: string;
  code: string;
  customer_id: string | null;
  customer_name: string | null;
  status: OrderStatus;
  total: number | string;
  payment_status: PaymentStatus;
  governorate: string | null;
  placed_at: string;
};

type ItemRow = {
  kind: string;
  product_slug: string | null;
  name_en: string;
  quantity: number;
  line_total: number | string;
  orders: { status: string } | { status: string }[] | null;
};

type LedgerRow = { amount: number | string; at: string };

type CustomerRow = { id: string; type: string; joined_at: string; created_at: string };

type ProductRow = { slug: string; name_en: string; category_slug: string | null };

type CategoryRow = { slug: string; name_en: string };

type PromoRow = { id: string; code: string; status: string };

type RedemptionRow = {
  promo_code_id: string;
  order_id: string;
  code_snapshot: string;
  discount_amount: number | string;
  redeemed_at: string;
};

type ReviewRow = { status: string; hidden: boolean };

type ContactRow = { status: string };

function prettyLabel(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

// ── Trend series (week / month / year), revenue + order count ───────────────────

function buildTrend(
  sales: Array<{ at: number; value: number }>,
  orderEvents: Array<{ at: number }>,
  now: number,
): AnalyticsTrend3 {
  const sumRange = (start: number, end: number) =>
    sales.reduce((s, e) => (e.at >= start && e.at < end ? s + e.value : s), 0);
  const countRange = (start: number, end: number) =>
    orderEvents.reduce((s, e) => (e.at >= start && e.at < end ? s + 1 : s), 0);

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayStart = startOfToday.getTime();

  const week: AnalyticsTrendPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = todayStart - i * DAY;
    const d = new Date(dayStart);
    week.push({
      label: WEEKDAY_SHORT[d.getDay()],
      revenue: Math.round(sumRange(dayStart, dayStart + DAY)),
      orders: countRange(dayStart, dayStart + DAY),
    });
  }

  const month: AnalyticsTrendPoint[] = [];
  const monthStart = todayStart - 29 * DAY;
  for (let k = 0; k < 6; k++) {
    const bStart = monthStart + k * 5 * DAY;
    const bEnd = bStart + 5 * DAY;
    const d = new Date(bStart);
    month.push({
      label: `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`,
      revenue: Math.round(sumRange(bStart, bEnd)),
      orders: countRange(bStart, bEnd),
    });
  }

  const year: AnalyticsTrendPoint[] = [];
  const base = new Date(now);
  for (let i = 11; i >= 0; i--) {
    const mStart = new Date(base.getFullYear(), base.getMonth() - i, 1).getTime();
    const mEnd = new Date(base.getFullYear(), base.getMonth() - i + 1, 1).getTime();
    const d = new Date(mStart);
    year.push({
      label: MONTH_SHORT[d.getMonth()],
      revenue: Math.round(sumRange(mStart, mEnd)),
      orders: countRange(mStart, mEnd),
    });
  }

  return { week, month, year };
}

// ── Main aggregate ──────────────────────────────────────────────────────────────

export async function getAdminAnalytics(): Promise<AdminAnalyticsData> {
  const now = Date.now();

  const [
    ordersResult,
    itemsResult,
    paymentsResult,
    refundsResult,
    customersResult,
    productsResult,
    categoriesResult,
    promoResult,
    redemptionsResult,
    reviewsResult,
    contactResult,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, code, customer_id, customer_name, status, total, payment_status, governorate, placed_at")
      .order("placed_at", { ascending: false })
      .limit(ORDERS_SCAN_LIMIT),
    supabase
      .from("order_items")
      .select("kind, product_slug, name_en, quantity, line_total, orders!inner(status)")
      .limit(ITEMS_SCAN_LIMIT),
    supabase.from("order_payments").select("amount, paid_at").limit(LEDGER_SCAN_LIMIT),
    supabase.from("order_refunds").select("amount, refunded_at").limit(LEDGER_SCAN_LIMIT),
    supabase.from("customers").select("id, type, joined_at, created_at").limit(CUSTOMERS_SCAN_LIMIT),
    supabase.from("products").select("slug, name_en, category_slug").limit(2000),
    supabase.from("categories").select("slug, name_en").limit(500),
    supabase.from("promo_codes").select("id, code, status").limit(2000),
    supabase
      .from("promo_redemptions")
      .select("promo_code_id, order_id, code_snapshot, discount_amount, redeemed_at")
      .limit(REDEMPTIONS_SCAN_LIMIT),
    supabase.from("reviews").select("status, hidden").limit(5000),
    supabase.from("contact_messages").select("status").limit(5000),
  ]);

  if (ordersResult.error) throw readError("orders", ordersResult.error.message);
  if (itemsResult.error) throw readError("order-items", itemsResult.error.message);
  if (paymentsResult.error) throw readError("payments", paymentsResult.error.message);
  if (refundsResult.error) throw readError("refunds", refundsResult.error.message);
  if (customersResult.error) throw readError("customers", customersResult.error.message);
  if (productsResult.error) throw readError("products", productsResult.error.message);
  if (categoriesResult.error) throw readError("categories", categoriesResult.error.message);
  if (promoResult.error) throw readError("promo-codes", promoResult.error.message);
  if (redemptionsResult.error) throw readError("promo-redemptions", redemptionsResult.error.message);
  if (reviewsResult.error) throw readError("reviews", reviewsResult.error.message);
  if (contactResult.error) throw readError("contact", contactResult.error.message);

  const orders = (ordersResult.data ?? []) as unknown as OrderRow[];
  const items = (itemsResult.data ?? []) as unknown as ItemRow[];
  const payments = ((paymentsResult.data ?? []) as { amount: number | string; paid_at: string }[]).map(
    (r): LedgerRow => ({ amount: r.amount, at: r.paid_at }),
  );
  const refunds = ((refundsResult.data ?? []) as { amount: number | string; refunded_at: string }[]).map(
    (r): LedgerRow => ({ amount: r.amount, at: r.refunded_at }),
  );
  const customers = (customersResult.data ?? []) as unknown as CustomerRow[];
  const productRows = (productsResult.data ?? []) as unknown as ProductRow[];
  const categoryRows = (categoriesResult.data ?? []) as unknown as CategoryRow[];
  const promoRows = (promoResult.data ?? []) as unknown as PromoRow[];
  const redemptionRows = (redemptionsResult.data ?? []) as unknown as RedemptionRow[];
  const reviewRows = (reviewsResult.data ?? []) as unknown as ReviewRow[];
  const contactRows = (contactResult.data ?? []) as unknown as ContactRow[];

  // ── Lookup maps ──────────────────────────────────────────────────────────────
  const productBySlug = new Map(productRows.map((p) => [p.slug, p]));
  const categoryName = new Map(categoryRows.map((c) => [c.slug, c.name_en]));
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const orderTotalById = new Map(orders.map((o) => [o.id, { total: money(o.total), cancelled: o.status === "cancelled" }]));

  // ── Order-derived sales aggregates ─────────────────────────────────────────────
  const statusCounts: Record<OrderStatus, number> = {
    pending: 0, preparing: 0, shipped: 0, delivered: 0, cancelled: 0, returned: 0,
  };
  const paymentCounts: Record<string, number> = {};
  const salesEvents: Array<{ at: number; value: number }> = [];
  const orderEvents: Array<{ at: number }> = [];

  let salesTotal = 0;
  let validOrders = 0;

  // Per-customer aggregation
  type CustAgg = { orders: number; spend: number; lastOrder: string | null; lastOrderAt: number };
  const custAgg = new Map<string, CustAgg>();
  // Most-recent denormalized customer name per customer_id (orders are sorted
  // newest-first, so the first name seen wins). Avoids an O(n²) lookup later.
  const nameByCustomer = new Map<string, string>();

  // Per-governorate aggregation
  type GeoAgg = { orders: number; revenue: number; customerIds: Set<string> };
  const geoAgg = new Map<string, GeoAgg>();

  for (const o of orders) {
    const status = o.status;
    const total = money(o.total);
    const at = ts(o.placed_at);
    const isCancelled = status === "cancelled";

    if (statusCounts[status] !== undefined) statusCounts[status] += 1;
    paymentCounts[o.payment_status] = (paymentCounts[o.payment_status] ?? 0) + 1;
    orderEvents.push({ at });

    if (!isCancelled) {
      salesTotal += total;
      validOrders += 1;
      salesEvents.push({ at, value: total });
    }

    // Customer aggregation (orders count = all statuses; spend = excl cancelled)
    if (o.customer_id) {
      if (!nameByCustomer.has(o.customer_id) && o.customer_name) {
        nameByCustomer.set(o.customer_id, o.customer_name);
      }
      const agg = custAgg.get(o.customer_id) ?? { orders: 0, spend: 0, lastOrder: null, lastOrderAt: 0 };
      agg.orders += 1;
      if (!isCancelled) agg.spend += total;
      if (at >= agg.lastOrderAt) {
        agg.lastOrderAt = at;
        agg.lastOrder = o.placed_at;
      }
      custAgg.set(o.customer_id, agg);
    }

    // Geography aggregation
    const gov = (o.governorate ?? "").trim() || "Unspecified";
    const geo = geoAgg.get(gov) ?? { orders: 0, revenue: 0, customerIds: new Set<string>() };
    geo.orders += 1;
    if (!isCancelled) geo.revenue += total;
    if (o.customer_id) geo.customerIds.add(o.customer_id);
    geoAgg.set(gov, geo);
  }

  const ordersTotal = orders.length;
  const cancelledCount = statusCounts.cancelled;
  const averageOrderValue = validOrders > 0 ? round2(salesTotal / validOrders) : 0;

  const rate = (count: number) => (ordersTotal > 0 ? round2((count / ordersTotal) * 100) : 0);
  const deliveredRate = rate(statusCounts.delivered);
  const cancelledRate = rate(cancelledCount);
  const returnedRate = rate(statusCounts.returned);

  const STATUS_ORDER: OrderStatus[] = [
    "pending", "preparing", "shipped", "delivered", "cancelled", "returned",
  ];
  const statusBreakdown: AnalyticsStatusBreakdown[] = STATUS_ORDER
    .filter((s) => statusCounts[s] > 0)
    .map((s) => ({ status: s, count: statusCounts[s], share: rate(statusCounts[s]) }));

  const PAYMENT_ORDER: PaymentStatus[] = [
    "paid", "partially_paid", "unpaid", "refunded", "failed",
  ];
  const paymentSplit: AnalyticsPaymentSplit[] = PAYMENT_ORDER
    .filter((s) => (paymentCounts[s] ?? 0) > 0)
    .map((s) => ({ status: s, count: paymentCounts[s], share: rate(paymentCounts[s]) }));

  // ── Cash / collections ─────────────────────────────────────────────────────────
  const paidTotal = payments.reduce((s, p) => s + money(p.amount), 0);
  const refundedTotal = refunds.reduce((s, r) => s + money(r.amount), 0);
  const netCollected = round2(paidTotal - refundedTotal);
  const paidEvents = payments.map((p) => ({ at: ts(p.at), value: money(p.amount) }));
  const refundEvents = refunds.map((r) => ({ at: ts(r.at), value: money(r.amount) }));

  // ── Trend series + period-over-period ───────────────────────────────────────────
  const trend = buildTrend(salesEvents, orderEvents, now);

  const sumWindow = (events: Array<{ at: number; value: number }>, start: number, end: number) =>
    events.reduce((s, e) => (e.at >= start && e.at < end ? s + e.value : s), 0);
  const countWindow = (events: Array<{ at: number }>, start: number, end: number) =>
    events.reduce((s, e) => (e.at >= start && e.at < end ? s + 1 : s), 0);

  const cur0 = now - 30 * DAY;
  const prev0 = now - 60 * DAY;

  const salesCur = sumWindow(salesEvents, cur0, now + 1);
  const salesPrev = sumWindow(salesEvents, prev0, cur0);
  const ordersCur = countWindow(orderEvents, cur0, now + 1);
  const ordersPrev = countWindow(orderEvents, prev0, cur0);
  const aovCur = ordersCur > 0 ? salesCur / ordersCur : 0;
  const aovPrev = ordersPrev > 0 ? salesPrev / ordersPrev : 0;
  const netCur =
    sumWindow(paidEvents, cur0, now + 1) - sumWindow(refundEvents, cur0, now + 1);
  const netPrev = sumWindow(paidEvents, prev0, cur0) - sumWindow(refundEvents, prev0, cur0);

  // ── Customers ────────────────────────────────────────────────────────────────
  const totalCustomers = customers.length;
  let registeredCount = 0;
  let guestCount = 0;
  const customerJoinEvents: Array<{ at: number }> = [];
  for (const c of customers) {
    if (c.type === "registered") registeredCount += 1;
    else guestCount += 1;
    customerJoinEvents.push({ at: ts(c.joined_at || c.created_at) });
  }
  const newCustomers30d = countWindow(customerJoinEvents, cur0, now + 1);
  const newCustomersPrev = countWindow(customerJoinEvents, prev0, cur0);

  const repeatCustomers = [...custAgg.values()].filter((a) => a.orders >= 2).length;
  const orderingCustomers = custAgg.size;
  const ordersWithCustomer = [...custAgg.values()].reduce((s, a) => s + a.orders, 0);
  const avgOrdersPerCustomer =
    orderingCustomers > 0 ? Math.round((ordersWithCustomer / orderingCustomers) * 10) / 10 : 0;

  const topCustomers: AnalyticsTopCustomer[] = [...custAgg.entries()]
    .map(([id, agg]) => {
      const cust = customerById.get(id);
      return {
        id,
        name: nameByCustomer.get(id) || "Customer",
        type: (cust?.type === "registered" ? "registered" : "guest") as "guest" | "registered",
        orders: agg.orders,
        spend: round2(agg.spend),
        lastOrder: agg.lastOrder,
      };
    })
    .sort((a, b) => b.spend - a.spend || b.orders - a.orders)
    .slice(0, 8);

  // ── Products (from order_items, excluding cancelled orders) ─────────────────────
  type ProdAgg = { key: string; name: string; category: string; unitsSold: number; revenue: number };
  const prodAgg = new Map<string, ProdAgg>();
  const catAgg = new Map<string, { name: string; unitsSold: number; revenue: number }>();

  for (const it of items) {
    if (firstOrderStatus(it.orders) === "cancelled") continue;
    const qty = Math.max(0, Number(it.quantity) || 0);
    const rev = money(it.line_total);

    // Product bucket
    const key = it.product_slug ?? `custom:${it.name_en}`;
    const product = it.product_slug ? productBySlug.get(it.product_slug) : undefined;
    const displayName = product?.name_en ?? it.name_en;

    // Category resolution
    let catName: string;
    if (it.kind === "custom_espresso") catName = "Make Your Espresso";
    else if (it.kind === "custom_flavor") catName = "Make Your Flavor";
    else if (product?.category_slug) {
      catName = categoryName.get(product.category_slug) ?? prettyLabel(product.category_slug);
    } else catName = "Other";

    const existing = prodAgg.get(key);
    if (existing) {
      existing.unitsSold += qty;
      existing.revenue += rev;
    } else {
      prodAgg.set(key, { key, name: displayName, category: catName, unitsSold: qty, revenue: rev });
    }

    const cat = catAgg.get(catName) ?? { name: catName, unitsSold: 0, revenue: 0 };
    cat.unitsSold += qty;
    cat.revenue += rev;
    catAgg.set(catName, cat);
  }

  const allProducts = [...prodAgg.values()];
  const topBySold: AnalyticsTopProduct[] = [...allProducts]
    .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
    .slice(0, 8)
    .map((p) => ({ key: p.key, name: p.name, category: p.category, unitsSold: p.unitsSold, revenue: Math.round(p.revenue) }));
  const topByRevenue: AnalyticsTopProduct[] = [...allProducts]
    .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold)
    .slice(0, 8)
    .map((p) => ({ key: p.key, name: p.name, category: p.category, unitsSold: p.unitsSold, revenue: Math.round(p.revenue) }));

  const totalCategoryRevenue = [...catAgg.values()].reduce((s, c) => s + c.revenue, 0);
  const categories: AnalyticsCategory[] = [...catAgg.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .map((c) => ({
      key: c.name,
      name: c.name,
      unitsSold: c.unitsSold,
      revenue: Math.round(c.revenue),
      share: totalCategoryRevenue > 0 ? round2((c.revenue / totalCategoryRevenue) * 100) : 0,
    }));

  // ── Marketing (promo codes + redemptions, reviews, contact) ─────────────────────
  const promoCodeById = new Map(promoRows.map((p) => [p.id, p]));
  const activePromoCount = promoRows.filter((p) => p.status === "active").length;

  type PromoAgg = { code: string; status: string; uses: number; discountGiven: number; revenue: number };
  const promoAgg = new Map<string, PromoAgg>();
  let promoUsageTotal = 0;
  let promoDiscountTotal = 0;
  let promoRevenue = 0;

  for (const r of redemptionRows) {
    promoUsageTotal += 1;
    const discount = money(r.discount_amount);
    promoDiscountTotal += discount;
    const orderInfo = orderTotalById.get(r.order_id);
    const orderRevenue = orderInfo && !orderInfo.cancelled ? orderInfo.total : 0;
    promoRevenue += orderRevenue;

    const code = promoCodeById.get(r.promo_code_id)?.code ?? r.code_snapshot ?? "Unknown";
    const status = promoCodeById.get(r.promo_code_id)?.status ?? "unknown";
    const agg = promoAgg.get(code) ?? { code, status, uses: 0, discountGiven: 0, revenue: 0 };
    agg.uses += 1;
    agg.discountGiven += discount;
    agg.revenue += orderRevenue;
    promoAgg.set(code, agg);
  }

  const promoPerformance: AnalyticsPromoRow[] = [...promoAgg.values()]
    .sort((a, b) => b.revenue - a.revenue || b.uses - a.uses)
    .map((p) => ({
      code: p.code,
      status: p.status,
      uses: p.uses,
      discountGiven: round2(p.discountGiven),
      revenue: Math.round(p.revenue),
    }));

  const reviewsApproved = reviewRows.filter((r) => r.status === "approved" && !r.hidden).length;
  const reviewsPending = reviewRows.filter((r) => r.status === "pending").length;
  const reviewsRejected = reviewRows.filter((r) => r.status === "rejected").length;

  const contactNew = contactRows.filter((c) => c.status === "new").length;
  const contactInProgress = contactRows.filter((c) => c.status === "in_progress").length;
  const contactReplied = contactRows.filter((c) => c.status === "replied").length;
  const contactArchived = contactRows.filter((c) => c.status === "archived").length;

  // ── Geography ────────────────────────────────────────────────────────────────
  const repeatCustomerIds = new Set(
    [...custAgg.entries()].filter(([, a]) => a.orders >= 2).map(([id]) => id),
  );
  const geography: AnalyticsGeographyRow[] = [...geoAgg.entries()]
    .map(([governorate, agg]) => {
      const validOrdersInGov = orders.filter(
        (o) => ((o.governorate ?? "").trim() || "Unspecified") === governorate && o.status !== "cancelled",
      ).length;
      const custCount = agg.customerIds.size;
      const repeatInGov = [...agg.customerIds].filter((id) => repeatCustomerIds.has(id)).length;
      return {
        governorate,
        orders: agg.orders,
        revenue: Math.round(agg.revenue),
        customers: custCount,
        averageOrderValue: validOrdersInGov > 0 ? round2(agg.revenue / validOrdersInGov) : 0,
        repeatRate: custCount > 0 ? round2((repeatInGov / custCount) * 100) : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);

  const hasAnyData =
    orders.length > 0 ||
    customers.length > 0 ||
    reviewRows.length > 0 ||
    contactRows.length > 0 ||
    redemptionRows.length > 0;

  return {
    ordersTotal,
    validOrders,
    salesTotal: round2(salesTotal),
    paidTotal: round2(paidTotal),
    refundedTotal: round2(refundedTotal),
    netCollected,
    averageOrderValue,
    statusBreakdown,
    paymentSplit,
    deliveredRate,
    cancelledRate,
    returnedRate,
    trend,
    salesTrend30d: trendPct(salesCur, salesPrev),
    ordersTrend30d: trendPct(ordersCur, ordersPrev),
    aovTrend30d: trendPct(aovCur, aovPrev),
    netCollectedTrend30d: trendPct(netCur, netPrev),
    newCustomersTrend30d: trendPct(newCustomers30d, newCustomersPrev),
    totalCustomers,
    registeredCount,
    guestCount,
    repeatCustomers,
    newCustomers30d,
    avgOrdersPerCustomer,
    topCustomers,
    topBySold,
    topByRevenue,
    categories,
    productsTracked: allProducts.length,
    promoUsageTotal,
    promoDiscountTotal: round2(promoDiscountTotal),
    activePromoCount,
    promoRevenue: Math.round(promoRevenue),
    promoPerformance,
    reviewsApproved,
    reviewsPending,
    reviewsRejected,
    reviewsTotal: reviewRows.length,
    contactNew,
    contactInProgress,
    contactReplied,
    contactArchived,
    contactTotal: contactRows.length,
    geography,
    hasAnyData,
    trafficTrackingConnected: false,
  };
}

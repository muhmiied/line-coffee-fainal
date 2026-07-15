"use client";

// Admin Analytics — real Supabase data layer (Phase 16A; Phase 2 reporting
// rewrite).
//
// PHASE 2 CHANGE: every metric below used to be computed in the browser from
// a client-side scan of up to 5,000 orders / 12,000 order_items / 8,000
// payments / 8,000 refunds / 5,000 customers / 5,000 promo_redemptions /
// 2,000 products+promo_codes / 5,000 reviews+contact rows. All of that now
// runs as one SQL aggregation over the COMPLETE table inside
// `get_admin_analytics_report_v1` (admin-only, `is_admin()`-gated; see
// migration `20260713140000`). This file calls that RPC and reshapes its
// jsonb into the exact same `AdminAnalyticsData` shape the Analytics page
// already consumes — the percentage/share/rate ARITHMETIC below is
// byte-identical to the pre-Phase-2 version, only fed by complete numbers
// instead of a capped client scan.
//
// FORMULA BUG FIXED (see the migration header for the full note): the old
// `PAYMENT_ORDER` enumeration used to build `paymentSplit` omitted "pending"
// — the default payment_status every order is created with — so the
// breakdown silently dropped the vast majority of orders. `paymentSplit` is
// now built from whatever payment_status values actually occur (the RPC's
// `paymentStatusCounts` is already data-driven), so this cannot recur.

import { supabase } from "@/lib/supabase/client";
import type { OrderStatus, PaymentStatus } from "@/lib/types/order";
import { round2, trendPct } from "@/lib/admin/admin-metrics";

// ── Public types (unchanged from Phase 16A) ─────────────────────────────────

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
  if (message.includes("Admin access required")) {
    return new AdminAnalyticsError("Admin permission is required.");
  }
  return new AdminAnalyticsError("Could not load analytics data. Please try again.");
}

// ── RPC response shape (get_admin_analytics_report_v1) ──────────────────────

type Window30d = {
  salesCur: number; salesPrev: number;
  ordersCur: number; ordersPrev: number;
  netCur: number; netPrev: number;
  newCustomersCur: number; newCustomersPrev: number;
};

type AnalyticsReportV1 = {
  ordersTotal: number;
  validOrders: number;
  salesTotal: number;
  paidTotal: number;
  refundedTotal: number;
  statusCounts: Partial<Record<OrderStatus, number>>;
  paymentStatusCounts: Record<string, number>;
  trend: AnalyticsTrend3;
  windows30d: Window30d;
  customers: {
    total: number; registered: number; guest: number;
    repeatCustomers: number; avgOrdersPerCustomer: number;
    top: AnalyticsTopCustomer[];
  };
  products: {
    topBySold: AnalyticsTopProduct[];
    topByRevenue: AnalyticsTopProduct[];
    categories: Array<{ key: string; name: string; unitsSold: number; revenue: number }>;
    tracked: number;
  };
  marketing: {
    promoUsageTotal: number;
    promoDiscountTotal: number;
    promoRevenue: number;
    activePromoCount: number;
    promoPerformance: AnalyticsPromoRow[];
    reviews: { approved: number; pending: number; rejected: number; total: number };
    contact: { new: number; inProgress: number; replied: number; archived: number; total: number };
  };
  geography: Array<{ governorate: string; orders: number; validOrders: number; revenue: number; customers: number; repeatCustomers: number }>;
};

const STATUS_ORDER: OrderStatus[] = [
  "pending", "preparing", "shipped", "delivered", "cancelled", "returned",
];

// Data-driven display order for whichever payment statuses actually occur —
// "pending" listed first since it is the default state of a freshly-placed
// order, matching Decision 12. Any unexpected future value still renders
// (sorted alphabetically after the known ones) rather than being dropped.
const PAYMENT_DISPLAY_ORDER: Record<string, number> = {
  pending: 0, unpaid: 1, partially_paid: 2, paid: 3, refunded: 4, failed: 5, pending_review: 6,
};

// ── Main aggregate ──────────────────────────────────────────────────────────

export async function getAdminAnalytics(): Promise<AdminAnalyticsData> {
  const { data, error } = await supabase.rpc("get_admin_analytics_report_v1");
  if (error) throw readError("report", error.message);
  const r = data as AnalyticsReportV1 | null;
  if (!r) throw readError("report", "Empty report response.");

  const ordersTotal = r.ordersTotal;
  const rate = (count: number) => (ordersTotal > 0 ? round2((count / ordersTotal) * 100) : 0);

  const statusCounts: Partial<Record<OrderStatus, number>> = r.statusCounts;
  const statusBreakdown: AnalyticsStatusBreakdown[] = STATUS_ORDER
    .filter((s) => (statusCounts[s] ?? 0) > 0)
    .map((s) => ({ status: s, count: statusCounts[s] ?? 0, share: rate(statusCounts[s] ?? 0) }));

  const paymentSplit: AnalyticsPaymentSplit[] = Object.entries(r.paymentStatusCounts)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => (PAYMENT_DISPLAY_ORDER[a] ?? 99) - (PAYMENT_DISPLAY_ORDER[b] ?? 99) || a.localeCompare(b))
    .map(([status, count]) => ({ status: status as PaymentStatus, count, share: rate(count) }));

  const averageOrderValue = r.validOrders > 0 ? round2(r.salesTotal / r.validOrders) : 0;
  const netCollected = round2(r.paidTotal - r.refundedTotal);

  const w = r.windows30d;
  const aovCur = w.ordersCur > 0 ? w.salesCur / w.ordersCur : 0;
  const aovPrev = w.ordersPrev > 0 ? w.salesPrev / w.ordersPrev : 0;

  const totalCategoryRevenue = r.products.categories.reduce((s, c) => s + c.revenue, 0);
  const categories: AnalyticsCategory[] = r.products.categories
    .map((c) => ({
      key: c.key,
      name: c.name,
      unitsSold: c.unitsSold,
      revenue: c.revenue,
      share: totalCategoryRevenue > 0 ? round2((c.revenue / totalCategoryRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const hasAnyData =
    r.ordersTotal > 0 ||
    r.customers.total > 0 ||
    r.marketing.reviews.total > 0 ||
    r.marketing.contact.total > 0 ||
    r.marketing.promoUsageTotal > 0;

  return {
    ordersTotal: r.ordersTotal,
    validOrders: r.validOrders,
    salesTotal: r.salesTotal,
    paidTotal: r.paidTotal,
    refundedTotal: r.refundedTotal,
    netCollected,
    averageOrderValue,
    statusBreakdown,
    paymentSplit,
    deliveredRate: rate(statusCounts.delivered ?? 0),
    cancelledRate: rate(statusCounts.cancelled ?? 0),
    returnedRate: rate(statusCounts.returned ?? 0),
    trend: r.trend,
    salesTrend30d: trendPct(w.salesCur, w.salesPrev),
    ordersTrend30d: trendPct(w.ordersCur, w.ordersPrev),
    aovTrend30d: trendPct(aovCur, aovPrev),
    netCollectedTrend30d: trendPct(w.netCur, w.netPrev),
    newCustomersTrend30d: trendPct(w.newCustomersCur, w.newCustomersPrev),
    totalCustomers: r.customers.total,
    registeredCount: r.customers.registered,
    guestCount: r.customers.guest,
    repeatCustomers: r.customers.repeatCustomers,
    newCustomers30d: w.newCustomersCur,
    avgOrdersPerCustomer: r.customers.avgOrdersPerCustomer,
    topCustomers: r.customers.top,
    topBySold: r.products.topBySold,
    topByRevenue: r.products.topByRevenue,
    categories,
    productsTracked: r.products.tracked,
    promoUsageTotal: r.marketing.promoUsageTotal,
    promoDiscountTotal: r.marketing.promoDiscountTotal,
    activePromoCount: r.marketing.activePromoCount,
    promoRevenue: r.marketing.promoRevenue,
    promoPerformance: r.marketing.promoPerformance,
    reviewsApproved: r.marketing.reviews.approved,
    reviewsPending: r.marketing.reviews.pending,
    reviewsRejected: r.marketing.reviews.rejected,
    reviewsTotal: r.marketing.reviews.total,
    contactNew: r.marketing.contact.new,
    contactInProgress: r.marketing.contact.inProgress,
    contactReplied: r.marketing.contact.replied,
    contactArchived: r.marketing.contact.archived,
    contactTotal: r.marketing.contact.total,
    geography: r.geography.map((g) => ({
      governorate: g.governorate,
      orders: g.orders,
      revenue: g.revenue,
      customers: g.customers,
      averageOrderValue: g.validOrders > 0 ? round2(g.revenue / g.validOrders) : 0,
      repeatRate: g.customers > 0 ? round2((g.repeatCustomers / g.customers) * 100) : 0,
    })),
    hasAnyData,
    trafficTrackingConnected: false,
  };
}

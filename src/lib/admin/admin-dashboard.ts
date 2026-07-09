"use client";

// Admin Dashboard — real Supabase data layer (Phase 14A).
//
// Aggregates the Admin main dashboard entirely from real tables. Every source
// is admin-only via RLS (`is_admin()`) and already granted SELECT to the
// `authenticated` role by earlier migrations — no new migration is needed:
//   orders / order_items / order_status_events (20260627110000)
//   order_payments / order_refunds            (20260703120000)
//   customers / customer_addresses            (20260703130000)
//   inventory_stock                           (20260627100000)
//   products / categories                     (20260625203528)
//   reviews / contact_messages                (20260703140000)
//
// Formula rules (per Phase 14A spec):
//   - Cancelled orders are NOT counted as revenue (Sales excludes cancelled).
//   - Paid amount = sum(order_payments.amount); refunded = sum(order_refunds.amount).
//   - Net collected = paid − refunded (a cash figure, never the original subtotal).
//   - Returns/refunds never rewrite historical order subtotals.
//   - Best sellers come from order_items (excluding cancelled orders).
//   - No COGS/profit is computed here (that is the Accounting phase, out of scope).
//   - When there is no data, numbers are honest zeros / empty states — never mock.

import { supabase } from "@/lib/supabase/client";
import { getAdminOrders } from "@/lib/admin/admin-orders";
import type { OrderStatus, PaymentStatus } from "@/lib/types/order";
import {
  MONTH_SHORT,
  WEEKDAY_SHORT,
  firstOrderStatus,
  money,
  trendPct,
  ts,
} from "@/lib/admin/admin-metrics";

const ORDERS_SCAN_LIMIT = 5000;
const ITEMS_SCAN_LIMIT = 8000;
const LEDGER_SCAN_LIMIT = 8000;
const CUSTOMERS_SCAN_LIMIT = 5000;
const OVERDUE_PREP_HOURS = 48;
const DEFAULT_PRODUCT_IMAGE = "/assets/products/classic-pouch.png";

export type DashboardPeriod = "today" | "week" | "month" | "all";

export type DashboardKpiValue = {
  formatted: string;
  trend: number | null;
  trendLabel: string;
};

export type DashboardKpi = {
  label: string;
  unit: string;
  values: Record<DashboardPeriod, DashboardKpiValue>;
  sparkline?: number[];
  breakdown?: Array<{ label: string; count: number; color: string }>;
  customerSplit?: { newCount: number; totalCount: number };
};

export type DashboardChartPoint = { label: string; value: number };
export type DashboardSalesTrend = Record<"week" | "month" | "year", DashboardChartPoint[]>;

export type DashboardLatestOrder = {
  id: string;
  code: string;
  customer: string;
  total: number;
  status: OrderStatus;
  placedAt: string;
};

export type DashboardBestSeller = {
  rank: number;
  slug: string | null;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  image: string;
};

export type DashboardAlert = {
  type: "low-stock" | "late-orders" | "messages" | "reviews";
  label: string;
  count: number;
  color: string;
  bg: string;
  detail: string;
  href: string;
};

export type DashboardLowStockItem = { name: string; remaining: string };

export type DashboardInventorySummary = {
  onHandKg: number;
  reservedKg: number;
  lowStockCount: number;
  productsTracked: number;
};

export type DashboardPreparing = {
  total: number;
  overdue: number;
  overdueCodes: string[];
};

export type DashboardFulfillment = {
  delivered: number;
  cancelled: number;
  returned: number;
};

export type DashboardLatestReview = {
  author: string;
  initials: string;
  rating: number;
  product: string;
  text: string;
  date: string;
  totalReviews: number;
  avgRating: number;
} | null;

export type DashboardHeroStats = {
  newOrders: number;
  lowStock: number;
  pendingReviews: number;
};

export type AdminDashboardData = {
  kpis: DashboardKpi[];
  salesTrend: DashboardSalesTrend;
  latestOrders: DashboardLatestOrder[];
  bestSellers: DashboardBestSeller[];
  alerts: DashboardAlert[];
  lowStockItems: DashboardLowStockItem[];
  inventory: DashboardInventorySummary;
  preparing: DashboardPreparing;
  fulfillment: DashboardFulfillment;
  latestReview: DashboardLatestReview;
  heroStats: DashboardHeroStats;
  statusCounts: Record<OrderStatus, number>;
  paymentStatusCounts: Record<string, number>;
  totalPaid: number;
  totalRefunded: number;
};

export class AdminDashboardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminDashboardError";
  }
}

function devWarn(scope: string, message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[admin-dashboard:${scope}] ${message}`);
  }
}

function readError(scope: string, message: string) {
  devWarn(scope, message);
  return new AdminDashboardError("Could not load dashboard data. Please try again.");
}

function fmtInt(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

// ── Row shapes ───────────────────────────────────────────────────────────────

type OrderRow = {
  id: string;
  code: string;
  customer_name: string | null;
  status: OrderStatus;
  total: number | string;
  payment_status: PaymentStatus;
  placed_at: string;
};

type ItemRow = {
  product_slug: string | null;
  name_en: string;
  quantity: number;
  line_total: number | string;
  orders: { status: string } | { status: string }[] | null;
};

type LedgerRow = { amount: number | string; at: string };

type CustomerRow = { id: string; joined_at: string; created_at: string };

type StockRow = {
  product_id: string;
  available_kg: number | string;
  reserved_kg: number | string;
  low_stock_threshold_kg: number | string;
};

type ProductRow = {
  id: string;
  slug: string;
  name_en: string;
  image_url: string | null;
  category_slug: string | null;
};

type CategoryRow = { slug: string; name_en: string };

type ReviewRow = {
  customer_name: string;
  product_name: string;
  rating: number;
  comment_en: string;
  status: string;
  hidden: boolean;
  published_at: string | null;
  created_at: string;
};

const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#fbbf24",
  preparing: "#60a5fa",
  shipped: "#a78bfa",
  delivered: "#4ade80",
  cancelled: "#ef4444",
  returned: "#9ca3af",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

// ── Period KPI builder ──────────────────────────────────────────────────────

type WindowDef = { start: number; prevStart: number; prevEnd: number; trendLabel: string };

function buildWindows(now: number) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayStart = startOfToday.getTime();
  const DAY = 86_400_000;
  return {
    today: { start: todayStart, prevStart: todayStart - DAY, prevEnd: todayStart, trendLabel: "vs yesterday" },
    week: { start: now - 7 * DAY, prevStart: now - 14 * DAY, prevEnd: now - 7 * DAY, trendLabel: "vs last week" },
    month: { start: now - 30 * DAY, prevStart: now - 60 * DAY, prevEnd: now - 30 * DAY, trendLabel: "vs last month" },
  } satisfies Record<"today" | "week" | "month", WindowDef>;
}

/**
 * Builds a period-aware KPI (today/week/month/all) from a list of timestamped
 * numeric events (an order total, a payment amount, or a count of 1 per row).
 */
function buildPeriodKpi(
  events: Array<{ at: number; value: number }>,
  now: number,
  formatValue: (v: number) => string,
  allTrendLabel: string,
): DashboardKpi["values"] {
  const windows = buildWindows(now);
  const sumWindow = (start: number, end: number) =>
    events.reduce((sum, e) => (e.at >= start && e.at < end ? sum + e.value : sum), 0);

  const build = (w: WindowDef): DashboardKpiValue => {
    const current = sumWindow(w.start, now + 1);
    const previous = sumWindow(w.prevStart, w.prevEnd);
    return { formatted: formatValue(current), trend: trendPct(current, previous), trendLabel: w.trendLabel };
  };

  const allTotal = events.reduce((sum, e) => sum + e.value, 0);
  return {
    today: build(windows.today),
    week: build(windows.week),
    month: build(windows.month),
    all: { formatted: formatValue(allTotal), trend: null, trendLabel: allTrendLabel },
  };
}

// ── Sales trend (chart) ─────────────────────────────────────────────────────

function buildSalesTrend(
  sales: Array<{ at: number; value: number }>,
  now: number,
): DashboardSalesTrend {
  const DAY = 86_400_000;
  const sumRange = (start: number, end: number) =>
    sales.reduce((s, e) => (e.at >= start && e.at < end ? s + e.value : s), 0);

  // Week: 7 daily buckets, oldest → newest.
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayStart = startOfToday.getTime();
  const week: DashboardChartPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = todayStart - i * DAY;
    const d = new Date(dayStart);
    week.push({ label: WEEKDAY_SHORT[d.getDay()], value: Math.round(sumRange(dayStart, dayStart + DAY)) });
  }

  // Month: last 30 days in 6 five-day buckets, labelled by the bucket start date.
  const month: DashboardChartPoint[] = [];
  const monthStart = todayStart - 29 * DAY;
  for (let k = 0; k < 6; k++) {
    const bStart = monthStart + k * 5 * DAY;
    const bEnd = bStart + 5 * DAY;
    const d = new Date(bStart);
    month.push({
      label: `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`,
      value: Math.round(sumRange(bStart, bEnd)),
    });
  }

  // Year: last 12 calendar months.
  const year: DashboardChartPoint[] = [];
  const base = new Date(now);
  for (let i = 11; i >= 0; i--) {
    const mStart = new Date(base.getFullYear(), base.getMonth() - i, 1).getTime();
    const mEnd = new Date(base.getFullYear(), base.getMonth() - i + 1, 1).getTime();
    const d = new Date(mStart);
    year.push({ label: MONTH_SHORT[d.getMonth()], value: Math.round(sumRange(mStart, mEnd)) });
  }

  return { week, month, year };
}

// ── Main aggregate ──────────────────────────────────────────────────────────

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const now = Date.now();

  const [
    ordersResult,
    itemsResult,
    paymentsResult,
    refundsResult,
    customersResult,
    stockResult,
    productsResult,
    categoriesResult,
    reviewsResult,
    contactResult,
    latestOrders,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, code, customer_name, status, total, payment_status, placed_at")
      .order("placed_at", { ascending: false })
      .limit(ORDERS_SCAN_LIMIT),
    supabase
      .from("order_items")
      .select("product_slug, name_en, quantity, line_total, orders!inner(status)")
      .limit(ITEMS_SCAN_LIMIT),
    supabase.from("order_payments").select("amount, paid_at").limit(LEDGER_SCAN_LIMIT),
    supabase.from("order_refunds").select("amount, refunded_at").limit(LEDGER_SCAN_LIMIT),
    supabase.from("customers").select("id, joined_at, created_at").limit(CUSTOMERS_SCAN_LIMIT),
    supabase
      .from("inventory_stock")
      .select("product_id, available_kg, reserved_kg, low_stock_threshold_kg")
      .limit(CUSTOMERS_SCAN_LIMIT),
    supabase.from("products").select("id, slug, name_en, image_url, category_slug").limit(2000),
    supabase.from("categories").select("slug, name_en").limit(500),
    supabase
      .from("reviews")
      .select("customer_name, product_name, rating, comment_en, status, hidden, published_at, created_at")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from("contact_messages").select("status").limit(2000),
    getAdminOrders(),
  ]);

  if (ordersResult.error) throw readError("orders", ordersResult.error.message);
  if (itemsResult.error) throw readError("order-items", itemsResult.error.message);
  if (paymentsResult.error) throw readError("payments", paymentsResult.error.message);
  if (refundsResult.error) throw readError("refunds", refundsResult.error.message);
  if (customersResult.error) throw readError("customers", customersResult.error.message);
  if (stockResult.error) throw readError("inventory", stockResult.error.message);
  if (productsResult.error) throw readError("products", productsResult.error.message);
  if (categoriesResult.error) throw readError("categories", categoriesResult.error.message);
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
  const stockRows = (stockResult.data ?? []) as unknown as StockRow[];
  const productRows = (productsResult.data ?? []) as unknown as ProductRow[];
  const categoryRows = (categoriesResult.data ?? []) as unknown as CategoryRow[];
  const reviewRows = (reviewsResult.data ?? []) as unknown as ReviewRow[];
  const contactRows = (contactResult.data ?? []) as unknown as { status: string }[];

  // ── Lookup maps ────────────────────────────────────────────────────────────
  const productById = new Map(productRows.map((p) => [p.id, p]));
  const productBySlug = new Map(productRows.map((p) => [p.slug, p]));
  const categoryName = new Map(categoryRows.map((c) => [c.slug, c.name_en]));
  const prettyCategory = (slug: string | null | undefined) => {
    if (!slug) return "—";
    return (
      categoryName.get(slug) ??
      slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
    );
  };

  // ── Order-derived aggregates ────────────────────────────────────────────────
  const statusCounts: Record<OrderStatus, number> = {
    pending: 0, preparing: 0, shipped: 0, delivered: 0, cancelled: 0, returned: 0,
  };
  const paymentStatusCounts: Record<string, number> = {};
  const salesEvents: Array<{ at: number; value: number }> = [];
  const orderCountEvents: Array<{ at: number; value: number }> = [];
  const overdueCodes: string[] = [];
  const overdueCutoff = now - OVERDUE_PREP_HOURS * 3_600_000;

  for (const o of orders) {
    if (statusCounts[o.status] !== undefined) statusCounts[o.status] += 1;
    paymentStatusCounts[o.payment_status] = (paymentStatusCounts[o.payment_status] ?? 0) + 1;
    const at = ts(o.placed_at);
    orderCountEvents.push({ at, value: 1 });
    if (o.status !== "cancelled") salesEvents.push({ at, value: money(o.total) });
    if (o.status === "preparing" && at > 0 && at < overdueCutoff) overdueCodes.push(o.code);
  }

  // ── Payment / refund events ──────────────────────────────────────────────────
  const paidEvents = payments.map((p) => ({ at: ts(p.at), value: money(p.amount) }));
  const refundEvents = refunds.map((r) => ({ at: ts(r.at), value: money(r.amount) }));
  const totalPaid = paidEvents.reduce((s, e) => s + e.value, 0);
  const totalRefunded = refundEvents.reduce((s, e) => s + e.value, 0);
  // Net-collected events: payments positive, refunds negative, bucketed by their
  // own timestamps so each period reflects real cash movement.
  const netCollectedEvents = [
    ...paidEvents,
    ...refundEvents.map((e) => ({ at: e.at, value: -e.value })),
  ];

  // ── Customer events ──────────────────────────────────────────────────────────
  const customerEvents = customers.map((c) => ({ at: ts(c.joined_at || c.created_at), value: 1 }));
  const totalCustomers = customers.length;
  const DAY = 86_400_000;
  const newCustomers30 = customers.filter((c) => ts(c.joined_at || c.created_at) >= now - 30 * DAY).length;

  // ── KPI cards ────────────────────────────────────────────────────────────────
  const salesKpi: DashboardKpi = {
    label: "Sales",
    unit: "EGP",
    values: buildPeriodKpi(salesEvents, now, fmtInt, "all time"),
    sparkline: (() => {
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const todayStart = startOfToday.getTime();
      const arr: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const dStart = todayStart - i * DAY;
        arr.push(salesEvents.reduce((s, e) => (e.at >= dStart && e.at < dStart + DAY ? s + e.value : s), 0));
      }
      return arr.some((v) => v > 0) ? arr : undefined;
    })(),
  };

  const ordersKpi: DashboardKpi = {
    label: "Orders",
    unit: "orders",
    values: buildPeriodKpi(orderCountEvents, now, fmtInt, "all time"),
    breakdown: STATUS_ORDER.filter((s) => statusCounts[s] > 0).map((s) => ({
      label: STATUS_LABELS[s],
      count: statusCounts[s],
      color: STATUS_COLORS[s],
    })),
  };

  const customersKpi: DashboardKpi = {
    label: "Customers",
    unit: "users",
    values: (() => {
      const v = buildPeriodKpi(customerEvents, now, fmtInt, "all time");
      // Non-"all" periods count new signups; trend labels reflect that.
      v.today.trendLabel = "new today";
      v.week.trendLabel = "new this week";
      v.month.trendLabel = "new this month";
      v.all.trendLabel = "all time";
      return v;
    })(),
    customerSplit:
      totalCustomers > 0 ? { newCount: newCustomers30, totalCount: totalCustomers } : undefined,
  };

  const netCollectedKpi: DashboardKpi = {
    label: "Net Collected",
    unit: "EGP",
    values: buildPeriodKpi(netCollectedEvents, now, fmtInt, "paid − refunded"),
  };

  const kpis = [salesKpi, ordersKpi, customersKpi, netCollectedKpi];

  // ── Sales trend chart ────────────────────────────────────────────────────────
  const salesTrend = buildSalesTrend(salesEvents, now);

  // ── Latest orders (reuse the real admin-orders read) ─────────────────────────
  const latestOrderRows: DashboardLatestOrder[] = latestOrders.slice(0, 6).map((o) => ({
    id: o.id,
    code: o.code,
    customer: o.customerName || "Guest",
    total: o.total,
    status: o.status,
    placedAt: o.placedAt,
  }));

  // ── Best sellers from order_items (exclude cancelled) ────────────────────────
  type BSAgg = { slug: string | null; name: string; unitsSold: number; revenue: number };
  const bsMap = new Map<string, BSAgg>();
  for (const it of items) {
    if (firstOrderStatus(it.orders) === "cancelled") continue;
    const key = it.product_slug ?? `custom:${it.name_en}`;
    const existing = bsMap.get(key);
    const qty = Math.max(0, Number(it.quantity) || 0);
    const rev = money(it.line_total);
    if (existing) {
      existing.unitsSold += qty;
      existing.revenue += rev;
    } else {
      bsMap.set(key, { slug: it.product_slug, name: it.name_en, unitsSold: qty, revenue: rev });
    }
  }
  const bestSellers: DashboardBestSeller[] = [...bsMap.values()]
    .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
    .slice(0, 5)
    .map((b, i) => {
      const product = b.slug ? productBySlug.get(b.slug) : undefined;
      return {
        rank: i + 1,
        slug: b.slug,
        name: product?.name_en ?? b.name,
        category: product ? prettyCategory(product.category_slug) : "Custom",
        unitsSold: b.unitsSold,
        revenue: Math.round(b.revenue),
        image: product?.image_url ?? DEFAULT_PRODUCT_IMAGE,
      };
    });

  // ── Inventory (finished-product coffee stock, kg model) ──────────────────────
  let onHandKg = 0;
  let reservedKg = 0;
  const lowStock: Array<{ name: string; availableKg: number }> = [];
  for (const s of stockRows) {
    const available = money(s.available_kg);
    const reserved = money(s.reserved_kg);
    const threshold = money(s.low_stock_threshold_kg);
    onHandKg += available;
    reservedKg += reserved;
    if (available <= threshold) {
      lowStock.push({ name: productById.get(s.product_id)?.name_en ?? "Product", availableKg: available });
    }
  }
  lowStock.sort((a, b) => a.availableKg - b.availableKg);
  const inventory: DashboardInventorySummary = {
    onHandKg: Math.round(onHandKg * 10) / 10,
    reservedKg: Math.round(reservedKg * 10) / 10,
    lowStockCount: lowStock.length,
    productsTracked: stockRows.length,
  };
  const lowStockItems: DashboardLowStockItem[] = lowStock.slice(0, 5).map((s) => ({
    name: s.name,
    remaining: `${Math.round(s.availableKg * 10) / 10} kg`,
  }));

  // ── Reviews ──────────────────────────────────────────────────────────────────
  const approved = reviewRows.filter((r) => r.status === "approved" && !r.hidden);
  const pendingReviews = reviewRows.filter((r) => r.status === "pending").length;
  const avgRating =
    approved.length > 0
      ? Math.round((approved.reduce((s, r) => s + (Number(r.rating) || 0), 0) / approved.length) * 10) / 10
      : 0;
  const latestApproved = approved
    .slice()
    .sort((a, b) => ts(b.published_at ?? b.created_at) - ts(a.published_at ?? a.created_at))[0];
  const latestReview: DashboardLatestReview = latestApproved
    ? {
        author: latestApproved.customer_name,
        initials: latestApproved.customer_name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        rating: Number(latestApproved.rating) || 5,
        product: latestApproved.product_name,
        text: latestApproved.comment_en,
        date: (latestApproved.published_at ?? latestApproved.created_at).slice(0, 10),
        totalReviews: approved.length,
        avgRating,
      }
    : null;

  // ── Contact messages ─────────────────────────────────────────────────────────
  const newMessages = contactRows.filter((m) => m.status === "new").length;

  // ── Preparing / overdue ──────────────────────────────────────────────────────
  const preparing: DashboardPreparing = {
    total: statusCounts.preparing,
    overdue: overdueCodes.length,
    overdueCodes: overdueCodes.slice(0, 4),
  };

  // ── Fulfillment (replaces the untracked "Visitors" card) ─────────────────────
  const fulfillment: DashboardFulfillment = {
    delivered: statusCounts.delivered,
    cancelled: statusCounts.cancelled,
    returned: statusCounts.returned,
  };

  // ── Alerts center ────────────────────────────────────────────────────────────
  const lowStockDetail =
    lowStock.length > 0
      ? lowStock.slice(0, 3).map((s) => s.name).join(" · ")
      : "All tracked stock above threshold";
  const alerts: DashboardAlert[] = [
    {
      type: "low-stock",
      label: "Low stock items",
      count: inventory.lowStockCount,
      color: "#ef4444",
      bg: "rgba(239,68,68,0.10)",
      detail: lowStockDetail,
      href: "/admin/inventory",
    },
    {
      type: "late-orders",
      label: "Orders overdue in prep",
      count: preparing.overdue,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.10)",
      detail:
        preparing.overdueCodes.length > 0
          ? `${preparing.overdueCodes.join(" · ")} — over ${OVERDUE_PREP_HOURS}h in Preparing`
          : "No orders overdue in preparation",
      href: "/admin/orders",
    },
    {
      type: "messages",
      label: "Unanswered messages",
      count: newMessages,
      color: "#60a5fa",
      bg: "rgba(96,165,250,0.10)",
      detail:
        newMessages > 0
          ? `${newMessages} new contact submission${newMessages === 1 ? "" : "s"} awaiting reply`
          : "No new contact submissions",
      href: "/admin/cms",
    },
    {
      type: "reviews",
      label: "Reviews awaiting approval",
      count: pendingReviews,
      color: "#a78bfa",
      bg: "rgba(167,139,250,0.10)",
      detail:
        pendingReviews > 0
          ? `${pendingReviews} customer review${pendingReviews === 1 ? "" : "s"} pending moderation`
          : "No reviews pending moderation",
      href: "/admin/cms",
    },
  ];

  // ── Hero stats ───────────────────────────────────────────────────────────────
  const heroStats: DashboardHeroStats = {
    newOrders: statusCounts.pending,
    lowStock: inventory.lowStockCount,
    pendingReviews,
  };

  return {
    kpis,
    salesTrend,
    latestOrders: latestOrderRows,
    bestSellers,
    alerts,
    lowStockItems,
    inventory,
    preparing,
    fulfillment,
    latestReview,
    heroStats,
    statusCounts,
    paymentStatusCounts,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalRefunded: Math.round(totalRefunded * 100) / 100,
  };
}

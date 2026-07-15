"use client";

// Admin Dashboard — real Supabase data layer (Phase 14A; Phase 2 reporting
// rewrite).
//
// PHASE 2 CHANGE: every KPI/aggregate below used to be computed in the
// browser from a client-side scan of up to 5,000 orders / 8,000 order_items /
// 8,000 payments / 8,000 refunds / 5,000 customers / 2,000 products+stock
// rows / 2,000 reviews+contact rows. Once any table grew past its cap, totals
// silently omitted rows with no warning. All of that now runs as a single SQL
// aggregation over the COMPLETE table inside `get_admin_dashboard_report_v1`
// (admin-only, `is_admin()`-gated; see migration `20260713140000`). This file
// now only calls that RPC and reshapes its jsonb into the exact same
// `AdminDashboardData` shape the dashboard components already consume — no
// component change was needed. `getAdminOrders()` (latest 6 order cards)
// stays a separate, already-paginated read, unchanged.
//
// Trend-percentage / label / color / sparkline-gate logic below is BYTE-
// IDENTICAL to the pre-Phase-2 client-side version — only the raw numbers it
// is fed now come from the database instead of a capped client scan.

import { supabase } from "@/lib/supabase/client";
import { getAdminOrders } from "@/lib/admin/admin-orders";
import type { OrderStatus } from "@/lib/types/order";
import { trendPct } from "@/lib/admin/admin-metrics";

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
  if (message.includes("Admin access required")) {
    return new AdminDashboardError("Admin permission is required.");
  }
  return new AdminDashboardError("Could not load dashboard data. Please try again.");
}

function fmtInt(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

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

const EMPTY_STATUS_COUNTS: Record<OrderStatus, number> = {
  pending: 0, preparing: 0, shipped: 0, delivered: 0, cancelled: 0, returned: 0,
};

// ── RPC response shape (get_admin_dashboard_report_v1) ──────────────────────

type RawWindow = {
  today: number; prevToday: number;
  week: number; prevWeek: number;
  month: number; prevMonth: number;
  all: number;
};

type DashboardReportV1 = {
  sales: RawWindow;
  orders: RawWindow;
  customers: { values: RawWindow; totalCount: number; newCount30d: number };
  netCollected: RawWindow;
  statusCounts: Partial<Record<OrderStatus, number>>;
  paymentStatusCounts: Record<string, number>;
  salesTrend: DashboardSalesTrend;
  bestSellers: Array<{ slug: string | null; name: string; category: string; image: string | null; unitsSold: number; revenue: number }>;
  inventory: DashboardInventorySummary;
  lowStockItems: Array<{ name: string; availableKg: number }>;
  preparing: DashboardPreparing;
  fulfillment: DashboardFulfillment;
  reviews: { approved: number; pending: number; avgRating: number };
  latestReview: { author: string; rating: number; product: string; text: string; date: string } | null;
  contactNewCount: number;
  totalPaid: number;
  totalRefunded: number;
};

// ── Period KPI builder ──────────────────────────────────────────────────────
// Byte-identical formula to the pre-Phase-2 buildPeriodKpi(): only its inputs
// (the summed window totals) now come from SQL instead of a client-side
// reduce over raw rows.

function buildKpiValues(
  raw: RawWindow,
  formatValue: (v: number) => string,
  allTrendLabel: string,
): DashboardKpi["values"] {
  return {
    today: { formatted: formatValue(raw.today), trend: trendPct(raw.today, raw.prevToday), trendLabel: "vs yesterday" },
    week: { formatted: formatValue(raw.week), trend: trendPct(raw.week, raw.prevWeek), trendLabel: "vs last week" },
    month: { formatted: formatValue(raw.month), trend: trendPct(raw.month, raw.prevMonth), trendLabel: "vs last month" },
    all: { formatted: formatValue(raw.all), trend: null, trendLabel: allTrendLabel },
  };
}

// ── Main aggregate ──────────────────────────────────────────────────────────

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const [reportResult, latestOrders] = await Promise.all([
    supabase.rpc("get_admin_dashboard_report_v1"),
    getAdminOrders(),
  ]);

  if (reportResult.error) throw readError("report", reportResult.error.message);
  const dash = reportResult.data as DashboardReportV1 | null;
  if (!dash) throw readError("report", "Empty report response.");

  // ── KPI cards ────────────────────────────────────────────────────────────
  const salesKpi: DashboardKpi = {
    label: "Sales",
    unit: "EGP",
    values: buildKpiValues(dash.sales, fmtInt, "all time"),
    sparkline: (() => {
      const weekValues = dash.salesTrend.week.map((w) => w.value);
      return weekValues.some((v) => v > 0) ? weekValues : undefined;
    })(),
  };

  const statusCounts: Record<OrderStatus, number> = { ...EMPTY_STATUS_COUNTS, ...dash.statusCounts };

  const ordersKpi: DashboardKpi = {
    label: "Orders",
    unit: "orders",
    values: buildKpiValues(dash.orders, fmtInt, "all time"),
    breakdown: STATUS_ORDER.filter((s) => statusCounts[s] > 0).map((s) => ({
      label: STATUS_LABELS[s],
      count: statusCounts[s],
      color: STATUS_COLORS[s],
    })),
  };

  const customerValues = buildKpiValues(dash.customers.values, fmtInt, "all time");
  customerValues.today.trendLabel = "new today";
  customerValues.week.trendLabel = "new this week";
  customerValues.month.trendLabel = "new this month";
  customerValues.all.trendLabel = "all time";
  const customersKpi: DashboardKpi = {
    label: "Customers",
    unit: "users",
    values: customerValues,
    customerSplit:
      dash.customers.totalCount > 0
        ? { newCount: dash.customers.newCount30d, totalCount: dash.customers.totalCount }
        : undefined,
  };

  const netCollectedKpi: DashboardKpi = {
    label: "Net Collected",
    unit: "EGP",
    values: buildKpiValues(dash.netCollected, fmtInt, "paid − refunded"),
  };

  const kpis = [salesKpi, ordersKpi, customersKpi, netCollectedKpi];

  // ── Latest orders (reuse the real, paginated admin-orders read) ──────────
  const latestOrderRows: DashboardLatestOrder[] = latestOrders.slice(0, 6).map((o) => ({
    id: o.id,
    code: o.code,
    customer: o.customerName || "Guest",
    total: o.total,
    status: o.status,
    placedAt: o.placedAt,
  }));

  // ── Best sellers ─────────────────────────────────────────────────────────
  const bestSellers: DashboardBestSeller[] = dash.bestSellers.map((b, i) => ({
    rank: i + 1,
    slug: b.slug,
    name: b.name,
    category: b.category,
    unitsSold: b.unitsSold,
    revenue: Math.round(b.revenue),
    image: b.image ?? DEFAULT_PRODUCT_IMAGE,
  }));

  // ── Inventory ────────────────────────────────────────────────────────────
  const lowStockItems: DashboardLowStockItem[] = dash.lowStockItems.map((s) => ({
    name: s.name,
    remaining: `${Math.round(s.availableKg * 10) / 10} kg`,
  }));

  // ── Reviews ──────────────────────────────────────────────────────────────
  const latestReview: DashboardLatestReview = dash.latestReview
    ? {
        author: dash.latestReview.author,
        initials: dash.latestReview.author
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        rating: Number(dash.latestReview.rating) || 5,
        product: dash.latestReview.product,
        text: dash.latestReview.text,
        date: dash.latestReview.date.slice(0, 10),
        totalReviews: dash.reviews.approved,
        avgRating: dash.reviews.avgRating,
      }
    : null;

  // ── Alerts center ────────────────────────────────────────────────────────
  const lowStockDetail =
    dash.lowStockItems.length > 0
      ? dash.lowStockItems.slice(0, 3).map((s) => s.name).join(" · ")
      : "All tracked stock above threshold";
  const overdueDetail =
    dash.preparing.overdueCodes.length > 0
      ? `${dash.preparing.overdueCodes.join(" · ")} — over 48h in Preparing`
      : "No orders overdue in preparation";
  const alerts: DashboardAlert[] = [
    {
      type: "low-stock",
      label: "Low stock items",
      count: dash.inventory.lowStockCount,
      color: "#ef4444",
      bg: "rgba(239,68,68,0.10)",
      detail: lowStockDetail,
      href: "/admin/inventory",
    },
    {
      type: "late-orders",
      label: "Orders overdue in prep",
      count: dash.preparing.overdue,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.10)",
      detail: overdueDetail,
      href: "/admin/orders",
    },
    {
      type: "messages",
      label: "Unanswered messages",
      count: dash.contactNewCount,
      color: "#60a5fa",
      bg: "rgba(96,165,250,0.10)",
      detail:
        dash.contactNewCount > 0
          ? `${dash.contactNewCount} new contact submission${dash.contactNewCount === 1 ? "" : "s"} awaiting reply`
          : "No new contact submissions",
      href: "/admin/cms",
    },
    {
      type: "reviews",
      label: "Reviews awaiting approval",
      count: dash.reviews.pending,
      color: "#a78bfa",
      bg: "rgba(167,139,250,0.10)",
      detail:
        dash.reviews.pending > 0
          ? `${dash.reviews.pending} customer review${dash.reviews.pending === 1 ? "" : "s"} pending moderation`
          : "No reviews pending moderation",
      href: "/admin/cms",
    },
  ];

  // ── Hero stats ───────────────────────────────────────────────────────────
  const heroStats: DashboardHeroStats = {
    newOrders: statusCounts.pending,
    lowStock: dash.inventory.lowStockCount,
    pendingReviews: dash.reviews.pending,
  };

  return {
    kpis,
    salesTrend: dash.salesTrend,
    latestOrders: latestOrderRows,
    bestSellers,
    alerts,
    lowStockItems,
    inventory: dash.inventory,
    preparing: dash.preparing,
    fulfillment: dash.fulfillment,
    latestReview,
    heroStats,
    statusCounts,
    paymentStatusCounts: dash.paymentStatusCounts,
    totalPaid: dash.totalPaid,
    totalRefunded: dash.totalRefunded,
  };
}

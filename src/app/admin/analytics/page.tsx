"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Coffee,
  CreditCard,
  Loader2,
  MapPin,
  Megaphone,
  MessageSquare,
  Package,
  Percent,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  getAdminAnalytics,
  AdminAnalyticsError,
  type AdminAnalyticsData,
  type AnalyticsTopProduct,
  type AnalyticsTrend,
  type AnalyticsTrendPoint,
} from "@/lib/admin/admin-analytics";
import type { OrderStatus, PaymentStatus } from "@/lib/types/order";
import { MixedNumeric } from "@/components/shared/MixedNumeric";

type ActiveTab = "overview" | "sales" | "products" | "customers" | "marketing" | "geography";
type Tone = "gold" | "green" | "blue" | "amber" | "red" | "violet";
type TrendPeriod = "week" | "month" | "year";

const TAB_OPTIONS: { key: ActiveTab; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "sales", label: "Sales", icon: ShoppingBag },
  { key: "products", label: "Products", icon: Package },
  { key: "customers", label: "Customers", icon: Users },
  { key: "marketing", label: "Marketing", icon: Megaphone },
  { key: "geography", label: "Geography", icon: MapPin },
];

const TONE_STYLE: Record<Tone, { text: string; bg: string; border: string; bar: string }> = {
  gold: {
    text: "var(--admin-hazelnut)",
    bg: "var(--admin-border)",
    border: "var(--admin-border-strong)",
    bar: "linear-gradient(90deg, var(--admin-border-strong), rgba(214,163,115,0.45))",
  },
  green: {
    text: "#8fcf9a",
    bg: "rgba(74,222,128,0.10)",
    border: "rgba(74,222,128,0.22)",
    bar: "linear-gradient(90deg, rgba(74,222,128,0.9), rgba(74,222,128,0.28))",
  },
  blue: {
    text: "#8fb0d9",
    bg: "rgba(96,165,250,0.10)",
    border: "rgba(96,165,250,0.22)",
    bar: "linear-gradient(90deg, rgba(96,165,250,0.9), rgba(96,165,250,0.28))",
  },
  amber: {
    text: "#e3b673",
    bg: "rgba(251,191,36,0.10)",
    border: "rgba(251,191,36,0.24)",
    bar: "linear-gradient(90deg, rgba(251,191,36,0.9), rgba(251,191,36,0.28))",
  },
  red: {
    text: "#e39a8c",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.24)",
    bar: "linear-gradient(90deg, rgba(239,68,68,0.9), rgba(239,68,68,0.28))",
  },
  violet: {
    text: "#c084fc",
    bg: "rgba(192,132,252,0.10)",
    border: "rgba(192,132,252,0.22)",
    bar: "linear-gradient(90deg, rgba(192,132,252,0.9), rgba(192,132,252,0.28))",
  },
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

const STATUS_TONE: Record<OrderStatus, Tone> = {
  pending: "amber",
  preparing: "blue",
  shipped: "violet",
  delivered: "green",
  cancelled: "red",
  returned: "gold",
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  refunded: "Refunded",
  failed: "Failed",
  pending: "Pending",
};

const PAYMENT_TONE: Record<PaymentStatus, Tone> = {
  unpaid: "amber",
  partially_paid: "blue",
  paid: "green",
  refunded: "violet",
  failed: "red",
  pending: "amber",
};

const numberFormatter = new Intl.NumberFormat("en-US");

function fmt(value: number) {
  return numberFormatter.format(Math.round(value));
}

function money(value: number) {
  return `${fmt(value)} EGP`;
}

function pct(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

// ── Shared visual primitives (unchanged design language) ─────────────────────

function TrendBadge({ value }: { value: AnalyticsTrend }) {
  if (value === null || !Number.isFinite(value)) return null;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const abs = Math.abs(value);
  const formatted = Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(1);

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        color: up ? "#8fcf9a" : "#e39a8c",
        background: up ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)",
        border: `1px solid ${up ? "rgba(74,222,128,0.18)" : "rgba(239,68,68,0.18)"}`,
      }}
    >
      <Icon size={11} />
      <MixedNumeric text={`${up ? "+" : "-"}${formatted}%`} />
    </span>
  );
}

function Surface({
  title,
  caption,
  icon: Icon,
  right,
  children,
}: {
  title: string;
  caption?: string;
  icon?: LucideIcon;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="admin-surface overflow-hidden">
      <div
        className="flex items-start justify-between gap-4 px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--admin-border)" }}
      >
        <div className="flex items-start gap-2.5 min-w-0">
          {Icon && (
            <span
              className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
              style={{
                color: "var(--admin-hazelnut)",
                background: "var(--admin-border)",
                border: "1px solid var(--admin-border-strong)",
              }}
            >
              <Icon size={14} />
            </span>
          )}
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--admin-muted)", opacity: 0.55 }}
            >
              {title}
            </p>
            {caption && (
              <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--admin-muted)", opacity: 0.55 }}>
                {caption}
              </p>
            )}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  caption,
  tone,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  caption: string;
  tone: Tone;
  trend?: AnalyticsTrend;
  icon?: LucideIcon;
}) {
  const style = TONE_STYLE[tone];

  return (
    <article className="admin-kpi-card py-4">
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[10.5px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--admin-muted)", opacity: 0.45 }}
          >
            {label}
          </p>
          <p className="mt-2 text-[22px] font-bold leading-tight" style={{ color: style.text }}>
            <MixedNumeric text={value} />
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: "var(--admin-muted)", opacity: 0.52 }}>
            <MixedNumeric text={caption} />
          </p>
        </div>
        {Icon && (
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ color: style.text, background: style.bg, border: `1px solid ${style.border}` }}
          >
            <Icon size={15} />
          </span>
        )}
      </div>
      {trend !== undefined && trend !== null && (
        <div className="relative mt-3">
          <TrendBadge value={trend} />
        </div>
      )}
    </article>
  );
}

function ProgressBar({
  value,
  max,
  tone = "gold",
  height = 6,
}: {
  value: number;
  max: number;
  tone?: Tone;
  height?: number;
}) {
  const width = max > 0 ? Math.max(4, Math.min(100, Math.round((value / max) * 100))) : 0;

  return (
    <div className="overflow-hidden rounded-full" style={{ height, background: "rgba(255,255,255,0.06)" }}>
      <div className="h-full rounded-full" style={{ width: `${width}%`, background: TONE_STYLE[tone].bar }} />
    </div>
  );
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--admin-muted)", opacity: 0.65 }}>
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function SignalPill({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const style = TONE_STYLE[tone];

  return (
    <div className="rounded-lg px-3 py-2" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: style.text, opacity: 0.85 }}>
        {label}
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: "var(--admin-white-coffee)" }}>
        {value}
      </p>
    </div>
  );
}

function MetricCell({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 lg:block lg:text-right">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider lg:hidden" style={{ color: "var(--admin-muted)", opacity: 0.45 }}>
        {label}
      </span>
      <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: warning ? "#e3b673" : "var(--admin-white-coffee)" }}>
        <MixedNumeric text={value} />
      </span>
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="px-5 py-8 text-center text-[12.5px] admin-muted">
      {children}
    </p>
  );
}

// ── Trend chart (real revenue + orders series) ───────────────────────────────

function TrendChart({ data }: { data: AdminAnalyticsData }) {
  const [period, setPeriod] = useState<TrendPeriod>("week");
  const points: AnalyticsTrendPoint[] = data.trend[period];
  const maxRevenue = Math.max(1, ...points.map((p) => p.revenue));
  const maxOrders = Math.max(1, ...points.map((p) => p.orders));

  return (
    <Surface
      title="Sales Trend"
      caption="Real revenue and order count over time (cancelled excluded from revenue)."
      icon={Activity}
      right={
        <div className="flex gap-1">
          {(["week", "month", "year"] as TrendPeriod[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className="rounded-md px-2 py-1 text-[10.5px] font-semibold capitalize transition-colors"
              style={{
                color: period === key ? "var(--admin-hazelnut)" : "var(--admin-muted)",
                background: period === key ? "var(--admin-border)" : "transparent",
                border: `1px solid ${period === key ? "var(--admin-border-strong)" : "transparent"}`,
              }}
            >
              {key}
            </button>
          ))}
        </div>
      }
    >
      <div className="px-5 py-5">
        <div className="flex h-56 items-end gap-2 sm:gap-3">
          {points.map((point, i) => {
            const revenueHeight = Math.max(4, Math.round((point.revenue / maxRevenue) * 100));
            const ordersHeight = Math.max(4, Math.round((point.orders / maxOrders) * 100));

            return (
              <div key={`${point.label}-${i}`} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end gap-1">
                  <div
                    className="flex-1 rounded-t-md"
                    title={`${money(point.revenue)} revenue`}
                    style={{
                      height: `${revenueHeight}%`,
                      background: "linear-gradient(to top, var(--admin-border-strong), rgba(214,163,115,0.18))",
                      border: "1px solid var(--admin-border-strong)",
                    }}
                  />
                  <div
                    className="flex-1 rounded-t-md"
                    title={`${point.orders} orders`}
                    style={{
                      height: `${ordersHeight}%`,
                      background: "linear-gradient(to top, rgba(96,165,250,0.46), rgba(96,165,250,0.14))",
                      border: "1px solid rgba(96,165,250,0.12)",
                    }}
                  />
                </div>
                <p className="text-center text-[10px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{point.label}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <LegendDot label="Revenue" color="var(--admin-border-strong)" />
          <LegendDot label="Orders" color="rgba(96,165,250,0.55)" />
        </div>
      </div>
    </Surface>
  );
}

// ── Panels ───────────────────────────────────────────────────────────────────

function CategoryRevenuePanel({ data }: { data: AdminAnalyticsData }) {
  if (data.categories.length === 0) {
    return (
      <Surface title="Revenue by Category" caption="Category mix from real order items." icon={Coffee}>
        <EmptyNote>No product sales recorded yet.</EmptyNote>
      </Surface>
    );
  }
  const maxRevenue = Math.max(1, ...data.categories.map((c) => c.revenue));

  return (
    <Surface title="Revenue by Category" caption="Category mix from real order items (cancelled excluded)." icon={Coffee}>
      <div className="space-y-4 px-5 py-5">
        {data.categories.map((item) => (
          <div key={item.key}>
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <p className="text-[13px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{item.name}</p>
              <div className="text-right">
                <p className="text-[12.5px] font-semibold" style={{ color: "var(--admin-hazelnut)" }}><MixedNumeric text={money(item.revenue)} /></p>
                <p className="text-[10.5px]" style={{ color: "var(--admin-muted)", opacity: 0.5 }}><MixedNumeric text={`${item.share}%`} /> share</p>
              </div>
            </div>
            <ProgressBar value={item.revenue} max={maxRevenue} tone="gold" />
            <p className="mt-1 text-[10.5px]" style={{ color: "var(--admin-muted)", opacity: 0.45 }}>
              {fmt(item.unitsSold)} units sold
            </p>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function FulfillmentPanel({ data }: { data: AdminAnalyticsData }) {
  const rows: Array<{ label: string; value: number; tone: Tone }> = [
    { label: "Delivered", value: data.deliveredRate, tone: "green" },
    { label: "Cancelled", value: data.cancelledRate, tone: "red" },
    { label: "Returned", value: data.returnedRate, tone: "amber" },
  ];

  return (
    <Surface title="Fulfillment Performance" caption="Share of all orders by outcome (real order statuses)." icon={Truck}>
      <div className="space-y-4 px-5 py-5">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{row.label}</p>
              <p className="text-[12.5px] font-semibold" style={{ color: TONE_STYLE[row.tone].text }}>{pct(row.value)}</p>
            </div>
            <ProgressBar value={row.value} max={100} tone={row.tone} />
          </div>
        ))}
        <p className="pt-1 text-[11px]" style={{ color: "var(--admin-muted)", opacity: 0.5 }}>
          {fmt(data.ordersTotal)} total orders · {fmt(data.validOrders)} valid (non-cancelled)
        </p>
      </div>
    </Surface>
  );
}

function StatusBreakdownPanel({ data }: { data: AdminAnalyticsData }) {
  if (data.statusBreakdown.length === 0) {
    return (
      <Surface title="Orders by Status" caption="Live distribution of order lifecycle." icon={ShoppingBag}>
        <EmptyNote>No orders yet.</EmptyNote>
      </Surface>
    );
  }
  const maxCount = Math.max(1, ...data.statusBreakdown.map((s) => s.count));

  return (
    <Surface title="Orders by Status" caption="Live distribution of the order lifecycle." icon={ShoppingBag}>
      <div className="space-y-4 px-5 py-5">
        {data.statusBreakdown.map((s) => (
          <div key={s.status}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{STATUS_LABEL[s.status]}</p>
              <p className="text-[12px] font-semibold" style={{ color: TONE_STYLE[STATUS_TONE[s.status]].text }}>
                {fmt(s.count)} · {pct(s.share)}
              </p>
            </div>
            <ProgressBar value={s.count} max={maxCount} tone={STATUS_TONE[s.status]} />
          </div>
        ))}
      </div>
    </Surface>
  );
}

function PaymentSplitPanel({ data }: { data: AdminAnalyticsData }) {
  if (data.paymentSplit.length === 0) {
    return (
      <Surface title="Payment Status Split" caption="Orders grouped by payment status." icon={CreditCard}>
        <EmptyNote>No orders yet.</EmptyNote>
      </Surface>
    );
  }
  const maxCount = Math.max(1, ...data.paymentSplit.map((s) => s.count));

  return (
    <Surface title="Payment Status Split" caption="Orders grouped by real payment status." icon={CreditCard}>
      <div className="space-y-4 px-5 py-5">
        {data.paymentSplit.map((s) => (
          <div key={s.status}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{PAYMENT_LABEL[s.status]}</p>
              <p className="text-[12px] font-semibold" style={{ color: TONE_STYLE[PAYMENT_TONE[s.status]].text }}>
                {fmt(s.count)} · {pct(s.share)}
              </p>
            </div>
            <ProgressBar value={s.count} max={maxCount} tone={PAYMENT_TONE[s.status]} />
          </div>
        ))}
      </div>
    </Surface>
  );
}

function ProductRankingPanel({
  title,
  caption,
  products,
  metric,
  formatter,
  icon,
}: {
  title: string;
  caption: string;
  products: AnalyticsTopProduct[];
  metric: (product: AnalyticsTopProduct) => number;
  formatter: (value: number) => string;
  icon: LucideIcon;
}) {
  if (products.length === 0) {
    return (
      <Surface title={title} caption={caption} icon={icon}>
        <EmptyNote>No product sales recorded yet.</EmptyNote>
      </Surface>
    );
  }
  const maxValue = Math.max(1, ...products.map(metric));

  return (
    <Surface title={title} caption={caption} icon={icon}>
      <div className="divide-y" style={{ borderColor: "var(--admin-border)" }}>
        {products.slice(0, 5).map((product, index) => (
          <div key={product.key} className="px-5 py-3.5">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="mt-0.5 w-5 flex-shrink-0 text-right text-[11px] font-bold" style={{ color: "var(--admin-hazelnut)", opacity: 0.55 }}>
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{product.name}</p>
                  <p className="truncate text-[10.5px]" style={{ color: "var(--admin-hazelnut)", opacity: 0.6 }}>{product.category}</p>
                </div>
              </div>
              <span className="flex-shrink-0 text-[12px] font-semibold tabular-nums" style={{ color: "var(--admin-hazelnut)" }}>
                {formatter(metric(product))}
              </span>
            </div>
            <ProgressBar value={metric(product)} max={maxValue} tone={index === 0 ? "gold" : "blue"} />
          </div>
        ))}
      </div>
    </Surface>
  );
}

function ProductTable({ data }: { data: AdminAnalyticsData }) {
  const totalRevenue = Math.max(1, data.topByRevenue.reduce((s, p) => s + p.revenue, 0));

  return (
    <Surface
      title="Product Performance"
      caption="Units sold, revenue, and revenue share from real order items (cancelled excluded)."
      icon={Package}
    >
      <div
        className="hidden gap-4 px-5 py-3 text-[10.5px] font-semibold uppercase tracking-wider lg:grid"
        style={{
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          color: "var(--admin-muted)",
          opacity: 0.55,
          borderBottom: "1px solid var(--admin-border)",
        }}
      >
        <span>Product</span>
        <span className="text-right">Units</span>
        <span className="text-right">Revenue</span>
        <span className="text-right">Share</span>
      </div>

      {data.topByRevenue.length === 0 ? (
        <EmptyNote>No product sales recorded yet.</EmptyNote>
      ) : (
        <div>
          {data.topByRevenue.map((product, index) => {
            const share = Math.round((product.revenue / totalRevenue) * 1000) / 10;
            return (
              <article
                key={product.key}
                className="grid gap-3 px-5 py-4 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:items-center"
                style={index < data.topByRevenue.length - 1 ? { borderBottom: "1px solid var(--admin-border)" } : undefined}
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{product.name}</p>
                  <p className="mt-0.5 text-[10.5px]" style={{ color: "var(--admin-hazelnut)", opacity: 0.65 }}>{product.category}</p>
                </div>
                <MetricCell label="Units" value={fmt(product.unitsSold)} />
                <MetricCell label="Revenue" value={money(product.revenue)} />
                <MetricCell label="Share" value={pct(share)} />
              </article>
            );
          })}
        </div>
      )}
      <p className="px-5 pb-4 pt-1 text-[11px]" style={{ color: "var(--admin-muted)", opacity: 0.45 }}>
        Product view, cart, and conversion tracking is not connected yet — only real sales are shown.
      </p>
    </Surface>
  );
}

function CustomerTypePanel({ data }: { data: AdminAnalyticsData }) {
  const total = Math.max(1, data.totalCustomers);
  const rows: Array<{ label: string; value: number; tone: Tone }> = [
    { label: "Registered", value: data.registeredCount, tone: "green" },
    { label: "Guest", value: data.guestCount, tone: "blue" },
  ];

  return (
    <Surface title="Customer Base" caption="Registered vs guest split and repeat behaviour (real customers)." icon={Users}>
      <div className="space-y-4 px-5 py-5">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{row.label}</p>
              <p className="text-[12.5px] font-semibold" style={{ color: TONE_STYLE[row.tone].text }}>
                {fmt(row.value)} · {pct(Math.round((row.value / total) * 1000) / 10)}
              </p>
            </div>
            <ProgressBar value={row.value} max={total} tone={row.tone} />
          </div>
        ))}
        <div className="grid gap-2 pt-1 sm:grid-cols-2">
          <SignalPill label="Repeat customers" value={`${fmt(data.repeatCustomers)} with 2+ orders`} tone="gold" />
          <SignalPill label="Order frequency" value={`${data.avgOrdersPerCustomer} orders / buyer`} tone="blue" />
        </div>
      </div>
    </Surface>
  );
}

function TopCustomersPanel({ data }: { data: AdminAnalyticsData }) {
  if (data.topCustomers.length === 0) {
    return (
      <Surface title="Top Customers" caption="Highest-spending customers (cancelled orders excluded)." icon={Receipt}>
        <EmptyNote>No customer orders recorded yet.</EmptyNote>
      </Surface>
    );
  }

  return (
    <Surface title="Top Customers" caption="Highest-spending customers by real order revenue (cancelled excluded)." icon={Receipt}>
      <div>
        {data.topCustomers.map((customer, index) => (
          <div
            key={customer.id}
            className="flex items-center justify-between gap-4 px-5 py-4"
            style={index < data.topCustomers.length - 1 ? { borderBottom: "1px solid var(--admin-border)" } : undefined}
          >
            <div className="min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{customer.name}</p>
              <p className="mt-1 text-[11px]" style={{ color: "var(--admin-muted)", opacity: 0.5 }}>
                {customer.type === "registered" ? "Registered" : "Guest"} · {customer.orders} orders
                {customer.lastOrder ? ` · last ${customer.lastOrder.slice(0, 10)}` : ""}
              </p>
            </div>
            <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: "var(--admin-hazelnut)" }}>
              {money(customer.spend)}
            </span>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function PromoTable({ data }: { data: AdminAnalyticsData }) {
  const maxRevenue = Math.max(1, ...data.promoPerformance.map((p) => p.revenue));

  return (
    <Surface
      title="Promo Code Performance"
      caption="Redemptions, discount given, and attributed order revenue (real promo_redemptions)."
      icon={Megaphone}
    >
      <div
        className="hidden gap-4 px-5 py-3 text-[10.5px] font-semibold uppercase tracking-wider lg:grid"
        style={{
          gridTemplateColumns: "1.4fr 0.9fr 0.9fr 1.1fr 0.9fr",
          color: "var(--admin-muted)",
          opacity: 0.55,
          borderBottom: "1px solid var(--admin-border)",
        }}
      >
        <span>Code</span>
        <span>Status</span>
        <span className="text-right">Uses</span>
        <span className="text-right">Discount</span>
        <span className="text-right">Revenue</span>
      </div>
      {data.promoPerformance.length === 0 ? (
        <EmptyNote>No promo codes have been redeemed yet.</EmptyNote>
      ) : (
        <div>
          {data.promoPerformance.map((campaign, index) => (
            <article
              key={campaign.code}
              className="grid gap-3 px-5 py-4 lg:grid-cols-[1.4fr_0.9fr_0.9fr_1.1fr_0.9fr] lg:items-center"
              style={index < data.promoPerformance.length - 1 ? { borderBottom: "1px solid var(--admin-border)" } : undefined}
            >
              <p className="truncate text-[13px] font-semibold font-mono" style={{ color: "var(--admin-white-coffee)" }}>{campaign.code}</p>
              <MetricCell label="Status" value={campaign.status} />
              <MetricCell label="Uses" value={fmt(campaign.uses)} />
              <MetricCell label="Discount" value={money(campaign.discountGiven)} />
              <div className="lg:text-right">
                <div className="mb-1 flex items-center justify-between gap-3 lg:block">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider lg:hidden" style={{ color: "var(--admin-muted)", opacity: 0.45 }}>
                    Revenue
                  </span>
                  <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: "var(--admin-white-coffee)" }}>
                    {money(campaign.revenue)}
                  </span>
                </div>
                <ProgressBar value={campaign.revenue} max={maxRevenue} tone="green" height={4} />
              </div>
            </article>
          ))}
        </div>
      )}
    </Surface>
  );
}

function GeographyPanel({ data }: { data: AdminAnalyticsData }) {
  if (data.geography.length === 0) {
    return (
      <Surface title="Orders by Governorate" caption="Regional order volume and revenue (from order address)." icon={MapPin}>
        <EmptyNote>No orders with a delivery location yet.</EmptyNote>
      </Surface>
    );
  }
  const maxRevenue = Math.max(1, ...data.geography.map((a) => a.revenue));

  return (
    <Surface title="Orders by Governorate" caption="Regional order volume and revenue from the real order address." icon={MapPin}>
      <div className="space-y-4 px-5 py-5">
        {data.geography.map((area) => (
          <div key={area.governorate}>
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <p className="text-[13px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{area.governorate}</p>
              <div className="text-right">
                <p className="text-[12.5px] font-semibold" style={{ color: "var(--admin-hazelnut)" }}>{money(area.revenue)}</p>
                <p className="text-[10.5px]" style={{ color: "var(--admin-muted)", opacity: 0.5 }}>{area.orders} orders</p>
              </div>
            </div>
            <ProgressBar value={area.revenue} max={maxRevenue} tone="gold" />
          </div>
        ))}
      </div>
    </Surface>
  );
}

function GeographyTable({ data }: { data: AdminAnalyticsData }) {
  return (
    <Surface title="Geography Detail" caption="Customers, average order value, and repeat rate by area." icon={Truck}>
      <div
        className="hidden gap-4 px-5 py-3 text-[10.5px] font-semibold uppercase tracking-wider md:grid"
        style={{
          gridTemplateColumns: "1.4fr 0.8fr 1fr 1fr 0.9fr 0.9fr",
          color: "var(--admin-muted)",
          opacity: 0.55,
          borderBottom: "1px solid var(--admin-border)",
        }}
      >
        <span>Governorate</span>
        <span className="text-right">Orders</span>
        <span className="text-right">Revenue</span>
        <span className="text-right">AOV</span>
        <span className="text-right">Customers</span>
        <span className="text-right">Repeat</span>
      </div>
      {data.geography.length === 0 ? (
        <EmptyNote>No orders with a delivery location yet.</EmptyNote>
      ) : (
        <div>
          {data.geography.map((area, index) => (
            <article
              key={area.governorate}
              className="grid gap-3 px-5 py-4 md:grid-cols-[1.4fr_0.8fr_1fr_1fr_0.9fr_0.9fr] md:items-center"
              style={index < data.geography.length - 1 ? { borderBottom: "1px solid var(--admin-border)" } : undefined}
            >
              <p className="text-[13px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{area.governorate}</p>
              <MetricCell label="Orders" value={fmt(area.orders)} />
              <MetricCell label="Revenue" value={money(area.revenue)} />
              <MetricCell label="AOV" value={money(area.averageOrderValue)} />
              <MetricCell label="Customers" value={fmt(area.customers)} />
              <MetricCell label="Repeat" value={pct(area.repeatRate)} />
            </article>
          ))}
        </div>
      )}
    </Surface>
  );
}

function ContentPanel({ data }: { data: AdminAnalyticsData }) {
  return (
    <Surface title="Content & Engagement" caption="Real review moderation and contact inbox counts." icon={MessageSquare}>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <SignalPill label="Approved reviews" value={`${fmt(data.reviewsApproved)} live`} tone="green" />
        <SignalPill label="Pending reviews" value={`${fmt(data.reviewsPending)} awaiting moderation`} tone="amber" />
        <SignalPill label="New messages" value={`${fmt(data.contactNew)} unanswered`} tone="blue" />
        <SignalPill label="Replied messages" value={`${fmt(data.contactReplied)} handled`} tone="gold" />
      </div>
      <p className="px-5 pb-4 text-[11px]" style={{ color: "var(--admin-muted)", opacity: 0.45 }}>
        {fmt(data.reviewsTotal)} reviews · {fmt(data.contactTotal)} contact messages recorded.
      </p>
    </Surface>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: AdminAnalyticsData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Sales" value={money(data.salesTotal)} caption="Order value, cancelled excluded" tone="green" trend={data.salesTrend30d} icon={Receipt} />
        <KpiCard label="Orders" value={fmt(data.validOrders)} caption={`${fmt(data.ordersTotal)} total incl. cancelled`} tone="gold" trend={data.ordersTrend30d} icon={ShoppingBag} />
        <KpiCard label="Average Order Value" value={money(data.averageOrderValue)} caption="Sales ÷ valid orders" tone="blue" trend={data.aovTrend30d} icon={Percent} />
        <KpiCard label="Net Collected" value={money(data.netCollected)} caption="Payments − refunds" tone="violet" trend={data.netCollectedTrend30d} icon={Target} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <TrendChart data={data} />
        <FulfillmentPanel data={data} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <CategoryRevenuePanel data={data} />
        <ProductRankingPanel
          title="Most Sold"
          caption="Top products by units sold (cancelled excluded)."
          products={data.topBySold}
          metric={(p) => p.unitsSold}
          formatter={(v) => `${fmt(v)} sold`}
          icon={Package}
        />
      </div>
    </div>
  );
}

function SalesTab({ data }: { data: AdminAnalyticsData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Sales" value={money(data.salesTotal)} caption="Order value, cancelled excluded" tone="green" trend={data.salesTrend30d} icon={Receipt} />
        <KpiCard label="Net Collected" value={money(data.netCollected)} caption="Payments − refunds" tone="gold" trend={data.netCollectedTrend30d} icon={Target} />
        <KpiCard label="Refunds" value={money(data.refundedTotal)} caption="Reduces cash only, not sales" tone="red" icon={RefreshCw} />
        <KpiCard label="Average Order Value" value={money(data.averageOrderValue)} caption="Sales ÷ valid orders" tone="blue" trend={data.aovTrend30d} icon={Percent} />
      </div>
      <TrendChart data={data} />
      <div className="grid gap-4 xl:grid-cols-2">
        <StatusBreakdownPanel data={data} />
        <PaymentSplitPanel data={data} />
      </div>
    </div>
  );
}

function ProductsTab({ data }: { data: AdminAnalyticsData }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ProductRankingPanel
          title="Most Sold"
          caption="Top products by units sold (cancelled excluded)."
          products={data.topBySold}
          metric={(p) => p.unitsSold}
          formatter={(v) => `${fmt(v)} sold`}
          icon={Package}
        />
        <ProductRankingPanel
          title="Top by Revenue"
          caption="Top products by real revenue (cancelled excluded)."
          products={data.topByRevenue}
          metric={(p) => p.revenue}
          formatter={money}
          icon={Receipt}
        />
      </div>
      <CategoryRevenuePanel data={data} />
      <ProductTable data={data} />
    </div>
  );
}

function CustomersTab({ data }: { data: AdminAnalyticsData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Customers" value={fmt(data.totalCustomers)} caption="All customer records" tone="gold" icon={Users} />
        <KpiCard label="Registered" value={fmt(data.registeredCount)} caption={`${fmt(data.guestCount)} guests`} tone="green" icon={UserCheck} />
        <KpiCard label="Repeat Customers" value={fmt(data.repeatCustomers)} caption="With 2+ orders" tone="violet" icon={Activity} />
        <KpiCard label="New (30 days)" value={fmt(data.newCustomers30d)} caption="Recent signups" tone="blue" trend={data.newCustomersTrend30d} icon={Target} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <CustomerTypePanel data={data} />
        <TopCustomersPanel data={data} />
      </div>
    </div>
  );
}

function MarketingTab({ data }: { data: AdminAnalyticsData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Promo Uses" value={fmt(data.promoUsageTotal)} caption="Total redemptions" tone="gold" icon={Megaphone} />
        <KpiCard label="Discount Given" value={money(data.promoDiscountTotal)} caption="Total incentive cost" tone="amber" icon={Percent} />
        <KpiCard label="Promo Revenue" value={money(data.promoRevenue)} caption="Order value from promo orders" tone="green" icon={Receipt} />
        <KpiCard label="Active Codes" value={fmt(data.activePromoCount)} caption="Currently active promo codes" tone="blue" icon={Target} />
      </div>
      <PromoTable data={data} />
      <ContentPanel data={data} />
    </div>
  );
}

function GeographyTab({ data }: { data: AdminAnalyticsData }) {
  const top = data.geography[0] ?? null;
  const highestAov = data.geography.reduce<AdminAnalyticsData["geography"][number] | null>(
    (winner, area) => (winner === null || area.averageOrderValue > winner.averageOrderValue ? area : winner),
    null,
  );
  const withLocation = data.geography
    .filter((a) => a.governorate !== "Unspecified")
    .reduce((sum, a) => sum + a.orders, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Top Governorate" value={top ? top.governorate : "—"} caption={top ? `${money(top.revenue)} revenue` : "No data"} tone="gold" icon={MapPin} />
        <KpiCard label="Highest AOV" value={highestAov ? highestAov.governorate : "—"} caption={highestAov ? `${money(highestAov.averageOrderValue)} per order` : "No data"} tone="blue" icon={Receipt} />
        <KpiCard label="Areas Covered" value={fmt(data.geography.length)} caption="Governorates with orders" tone="green" icon={Star} />
        <KpiCard label="Located Orders" value={fmt(withLocation)} caption="Orders with a known governorate" tone="violet" icon={Truck} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <GeographyPanel data={data} />
        <GeographyTable data={data} />
      </div>
    </div>
  );
}

function renderTab(activeTab: ActiveTab, data: AdminAnalyticsData) {
  if (activeTab === "overview") return <OverviewTab data={data} />;
  if (activeTab === "sales") return <SalesTab data={data} />;
  if (activeTab === "products") return <ProductsTab data={data} />;
  if (activeTab === "customers") return <CustomersTab data={data} />;
  if (activeTab === "marketing") return <MarketingTab data={data} />;
  return <GeographyTab data={data} />;
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAdminAnalytics());
    } catch (err) {
      setError(
        err instanceof AdminAnalyticsError
          ? err.message
          : "Could not load analytics data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
  useEffect(() => { void load(); }, [load]);

  const body = useMemo(() => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-24" style={{ color: "var(--admin-muted)" }}>
          <Loader2 size={28} className="animate-spin" style={{ color: "var(--admin-hazelnut)" }} />
          <p className="text-[13px]">Loading real analytics…</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="admin-surface flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <AlertTriangle size={28} style={{ color: "#e39a8c" }} />
          <p className="text-[13.5px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>{error}</p>
          <button type="button" onClick={() => void load()} className="admin-btn admin-btn-primary inline-flex items-center gap-2 !px-4 !py-2 !text-[12.5px]">
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      );
    }
    if (!data || !data.hasAnyData) {
      return (
        <div className="admin-surface flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <BarChart3 size={28} style={{ color: "var(--admin-hazelnut)", opacity: 0.7 }} />
          <p className="text-[13.5px] font-semibold" style={{ color: "var(--admin-white-coffee)" }}>No analytics data yet</p>
          <p className="text-[12.5px]" style={{ color: "var(--admin-muted)", opacity: 0.6 }}>
            Once real orders, customers, and promotions exist, they will appear here.
          </p>
        </div>
      );
    }
    return renderTab(activeTab, data);
  }, [loading, error, data, activeTab, load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="admin-page-title">
              Analytics
            </h1>
            <span className="admin-badge admin-badge-gold">
              Business Performance Center
            </span>
          </div>
          <p className="admin-page-subtitle">
            Real data from orders, customers, products, promotions, reviews, and delivery locations.
          </p>
        </div>

        {data && !loading && !error && (
          <button type="button" onClick={() => void load()} className="admin-btn inline-flex items-center gap-2 self-start !px-3 !py-2 !text-[12px]">
            <RefreshCw size={13} /> Refresh
          </button>
        )}
      </div>

      <div
        className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12px] leading-relaxed"
        style={{
          color: "var(--admin-muted)",
          background: "rgba(96,165,250,0.08)",
          borderColor: "rgba(96,165,250,0.20)",
        }}
      >
        <Activity size={14} className="mt-0.5 flex-shrink-0" style={{ color: "#8fb0d9" }} />
        <span>
          These figures come from real Supabase records. Web-traffic analytics (visits, sessions, page views,
          conversion rate, devices, and channels) are <strong>not connected yet</strong> — no tracking source
          exists, so they are intentionally left out rather than estimated.
        </span>
      </div>

      <div className="admin-tabs overflow-x-auto admin-scrollbar flex-nowrap" role="tablist" aria-label="Analytics sections" style={{ background: "rgb(5 3 2 / 0.35)", borderRadius: "0.7rem", padding: "0.25rem" }}>
        {TAB_OPTIONS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active ? "true" : "false"}
              onClick={() => setActiveTab(tab.key)}
              className={`admin-tab min-w-fit !px-3 !py-2 !text-[12px]${active ? " admin-tab-active" : ""}`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {body}
    </div>
  );
}

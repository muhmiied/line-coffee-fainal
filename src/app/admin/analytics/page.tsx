"use client";

import { useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Coffee,
  Eye,
  MapPin,
  Megaphone,
  Package,
  Percent,
  Receipt,
  ShoppingBag,
  Target,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  ANALYTICS_META,
  BUSINESS_INSIGHTS,
  CUSTOMER_KPIS,
  CUSTOMER_SEGMENTS,
  GEOGRAPHY_ANALYTICS,
  MARKETING_PERFORMANCE,
  MARKETING_SUMMARY,
  MOST_RETURNED_PRODUCTS,
  MOST_SOLD_PRODUCTS,
  MOST_VIEWED_PRODUCTS,
  OVERVIEW_KPIS,
  PRODUCT_ANALYTICS,
  REVENUE_BY_CATEGORY,
  RISK_ALERTS,
  SALES_TREND,
  SLOW_PRODUCTS,
  TOP_CUSTOMERS,
  type AlertSeverity,
  type AnalyticsKpi,
  type AnalyticsTone,
  type ProductPerformance,
} from "@/lib/mock-data/admin/analytics-mock";

type ActiveTab = "overview" | "sales" | "products" | "customers" | "marketing" | "geography";

const TAB_OPTIONS: { key: ActiveTab; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "sales", label: "Sales", icon: ShoppingBag },
  { key: "products", label: "Products", icon: Package },
  { key: "customers", label: "Customers", icon: Users },
  { key: "marketing", label: "Marketing", icon: Megaphone },
  { key: "geography", label: "Geography", icon: MapPin },
];

const TONE_STYLE: Record<AnalyticsTone, { text: string; bg: string; border: string; bar: string }> = {
  gold: {
    text: "var(--gold)",
    bg: "rgba(182,136,94,0.12)",
    border: "rgba(182,136,94,0.24)",
    bar: "linear-gradient(90deg, rgba(182,136,94,0.95), rgba(214,163,115,0.45))",
  },
  green: {
    text: "#4ade80",
    bg: "rgba(74,222,128,0.10)",
    border: "rgba(74,222,128,0.22)",
    bar: "linear-gradient(90deg, rgba(74,222,128,0.9), rgba(74,222,128,0.28))",
  },
  blue: {
    text: "#60a5fa",
    bg: "rgba(96,165,250,0.10)",
    border: "rgba(96,165,250,0.22)",
    bar: "linear-gradient(90deg, rgba(96,165,250,0.9), rgba(96,165,250,0.28))",
  },
  amber: {
    text: "#fbbf24",
    bg: "rgba(251,191,36,0.10)",
    border: "rgba(251,191,36,0.24)",
    bar: "linear-gradient(90deg, rgba(251,191,36,0.9), rgba(251,191,36,0.28))",
  },
  red: {
    text: "#ef4444",
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

const SEVERITY_STYLE: Record<AlertSeverity, { text: string; bg: string; border: string }> = {
  High: { text: "#ef4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.25)" },
  Medium: { text: "#fbbf24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.25)" },
  Low: { text: "#60a5fa", bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.25)" },
};

const MARKETING_STATUS_STYLE = {
  Strong: TONE_STYLE.green,
  Watch: TONE_STYLE.amber,
  Weak: TONE_STYLE.red,
};

const PRODUCT_DEMAND_STYLE = {
  High: TONE_STYLE.green,
  Medium: TONE_STYLE.amber,
  Low: TONE_STYLE.red,
};

function fmt(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function fmtTrend(value: number) {
  const abs = Math.abs(value);
  const formatted = Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(1);
  return `${value >= 0 ? "+" : "-"}${formatted}%`;
}

function money(value: number) {
  return `${fmt(value)} EGP`;
}

function formatKpiValue(kpi: AnalyticsKpi) {
  if (kpi.format === "money") return money(kpi.value);
  if (kpi.format === "percent") return `${kpi.value}%`;
  return fmt(kpi.value);
}

function percent(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function TrendBadge({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        color: up ? "#4ade80" : "#ef4444",
        background: up ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)",
        border: `1px solid ${up ? "rgba(74,222,128,0.18)" : "rgba(239,68,68,0.18)"}`,
      }}
    >
      <Icon size={11} />
      {fmtTrend(value)}
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
        style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}
      >
        <div className="flex items-start gap-2.5 min-w-0">
          {Icon && (
            <span
              className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
              style={{
                color: "var(--gold)",
                background: "rgba(182,136,94,0.10)",
                border: "1px solid rgba(182,136,94,0.16)",
              }}
            >
              <Icon size={14} />
            </span>
          )}
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--cream-dim)", opacity: 0.55 }}
            >
              {title}
            </p>
            {caption && (
              <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
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

function KpiCard({ kpi, icon: Icon }: { kpi: AnalyticsKpi; icon?: LucideIcon }) {
  const tone = TONE_STYLE[kpi.tone];

  return (
    <article className="admin-kpi-card py-4">
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[10.5px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--cream-dim)", opacity: 0.45 }}
          >
            {kpi.label}
          </p>
          <p className="mt-2 text-[22px] font-bold leading-tight" style={{ color: tone.text }}>
            {formatKpiValue(kpi)}
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.52 }}>
            {kpi.caption}
          </p>
        </div>
        {Icon && (
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ color: tone.text, background: tone.bg, border: `1px solid ${tone.border}` }}
          >
            <Icon size={15} />
          </span>
        )}
      </div>
      <div className="relative mt-3">
        <TrendBadge value={kpi.trend} />
      </div>
    </article>
  );
}

function KpiGrid({ kpis, icons }: { kpis: AnalyticsKpi[]; icons: LucideIcon[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi, index) => (
        <KpiCard key={kpi.label} kpi={kpi} icon={icons[index]} />
      ))}
    </div>
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
  tone?: AnalyticsTone;
  height?: number;
}) {
  const width = max > 0 ? Math.max(4, Math.min(100, Math.round((value / max) * 100))) : 0;

  return (
    <div className="overflow-hidden rounded-full" style={{ height, background: "rgba(255,255,255,0.06)" }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: TONE_STYLE[tone].bar,
        }}
      />
    </div>
  );
}

function SalesTrendChart() {
  const maxRevenue = Math.max(...SALES_TREND.map((point) => point.revenue));
  const maxOrders = Math.max(...SALES_TREND.map((point) => point.orders));

  return (
    <Surface
      title="Sales Trend"
      caption="Weekly revenue, order count, and average order value."
      icon={Activity}
      right={<span className="text-[11px] font-semibold" style={{ color: "var(--gold)" }}>{ANALYTICS_META.period}</span>}
    >
      <div className="px-5 py-5">
        <div className="flex h-56 items-end gap-3 sm:gap-4">
          {SALES_TREND.map((point) => {
            const revenueHeight = Math.max(12, Math.round((point.revenue / maxRevenue) * 100));
            const ordersHeight = Math.max(12, Math.round((point.orders / maxOrders) * 100));

            return (
              <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end gap-1.5">
                  <div
                    className="flex-1 rounded-t-md"
                    title={`${money(point.revenue)} revenue`}
                    style={{
                      height: `${revenueHeight}%`,
                      background: "linear-gradient(to top, rgba(182,136,94,0.62), rgba(214,163,115,0.18))",
                      border: "1px solid rgba(182,136,94,0.16)",
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
                <div className="text-center">
                  <p className="text-[11px] font-semibold" style={{ color: "var(--cream)" }}>{point.label}</p>
                  <p className="text-[10px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>
                    {money(point.averageOrderValue)} AOV
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <LegendDot label="Revenue" color="rgba(182,136,94,0.72)" />
          <LegendDot label="Orders" color="rgba(96,165,250,0.55)" />
        </div>
      </div>
    </Surface>
  );
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.65 }}>
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function CategoryRevenuePanel() {
  const maxRevenue = Math.max(...REVENUE_BY_CATEGORY.map((item) => item.revenue));

  return (
    <Surface title="Revenue by Category" caption="Category mix shows where the business is currently earning." icon={Coffee}>
      <div className="space-y-4 px-5 py-5">
        {REVENUE_BY_CATEGORY.map((item) => (
          <div key={item.category.en}>
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>{item.category.en}</p>
                <p className="text-[11px]" dir="rtl" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
                  {item.category.ar}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[12.5px] font-semibold" style={{ color: "var(--gold)" }}>{money(item.revenue)}</p>
                <div className="mt-1"><TrendBadge value={item.trend} /></div>
              </div>
            </div>
            <ProgressBar value={item.revenue} max={maxRevenue} tone={item.trend >= 0 ? "gold" : "red"} />
            <div className="mt-1 flex items-center justify-between text-[10.5px]" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
              <span>{item.orders} orders</span>
              <span>{item.percent}% share</span>
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function RiskAlertsPanel({ compact = false }: { compact?: boolean }) {
  return (
    <Surface title="Risk Alerts" caption="Signals that need a business decision, not just monitoring." icon={AlertTriangle}>
      <div className={compact ? "grid gap-3 p-4 lg:grid-cols-2" : "space-y-3 p-4"}>
        {RISK_ALERTS.map((alert) => {
          const severity = SEVERITY_STYLE[alert.severity];

          return (
            <article
              key={alert.id}
              className="rounded-xl p-4"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(182,136,94,0.10)",
              }}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>{alert.title}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>
                    {alert.detail}
                  </p>
                </div>
                <span
                  className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                  style={{ color: severity.text, background: severity.bg, border: `1px solid ${severity.border}` }}
                >
                  {alert.severity}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <SignalPill label="Metric" value={alert.metric} tone={alert.severity === "High" ? "red" : "amber"} />
                <SignalPill label="Next action" value={alert.action} tone="gold" />
              </div>
            </article>
          );
        })}
      </div>
    </Surface>
  );
}

function SignalPill({ label, value, tone }: { label: string; value: string; tone: AnalyticsTone }) {
  const style = TONE_STYLE[tone];

  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{ background: style.bg, border: `1px solid ${style.border}` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: style.text, opacity: 0.85 }}>
        {label}
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: "var(--cream)" }}>
        {value}
      </p>
    </div>
  );
}

function InsightsPanel() {
  return (
    <Surface title="Business Insights" caption="Short explanations behind the numbers." icon={Target}>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {BUSINESS_INSIGHTS.map((insight) => {
          const tone = TONE_STYLE[insight.tone];

          return (
            <article
              key={insight.title}
              className="rounded-xl p-4"
              style={{ background: tone.bg, border: `1px solid ${tone.border}` }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: tone.text }}>
                {insight.metric}
              </p>
              <h3 className="mt-2 text-[14px] font-semibold" style={{ color: "var(--cream)" }}>
                {insight.title}
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.68 }}>
                {insight.detail}
              </p>
            </article>
          );
        })}
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
  products: ProductPerformance[];
  metric: (product: ProductPerformance) => number;
  formatter: (value: number) => string;
  icon: LucideIcon;
}) {
  const maxValue = Math.max(...products.map(metric));

  return (
    <Surface title={title} caption={caption} icon={icon}>
      <div className="divide-y" style={{ borderColor: "rgba(182,136,94,0.06)" }}>
        {products.slice(0, 5).map((product, index) => (
          <div key={product.id} className="px-5 py-3.5">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="mt-0.5 w-5 flex-shrink-0 text-right text-[11px] font-bold" style={{ color: "var(--gold)", opacity: 0.55 }}>
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold" style={{ color: "var(--cream)" }}>{product.name.en}</p>
                  <p className="truncate text-[11px]" dir="rtl" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
                    {product.name.ar}
                  </p>
                </div>
              </div>
              <span className="flex-shrink-0 text-[12px] font-semibold tabular-nums" style={{ color: "var(--gold)" }}>
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

function ProductTable() {
  return (
    <Surface title="Product Performance Matrix" caption="Views, carts, orders, revenue, stock, returns, and action signal." icon={Package}>
      <div
        className="hidden gap-4 px-5 py-3 text-[10.5px] font-semibold uppercase tracking-wider lg:grid"
        style={{
          gridTemplateColumns: "1.6fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 1.2fr",
          color: "var(--cream-dim)",
          opacity: 0.55,
          borderBottom: "1px solid rgba(182,136,94,0.08)",
        }}
      >
        <span>Product</span>
        <span className="text-right">Views</span>
        <span className="text-right">Orders</span>
        <span className="text-right">Revenue</span>
        <span className="text-right">Stock</span>
        <span className="text-right">Returns</span>
        <span>Signal</span>
      </div>

      <div>
        {PRODUCT_ANALYTICS.map((product, index) => {
          const demand = PRODUCT_DEMAND_STYLE[product.demand];

          return (
            <article
              key={product.id}
              className="grid gap-3 px-5 py-4 lg:grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1.2fr] lg:items-center"
              style={index < PRODUCT_ANALYTICS.length - 1 ? { borderBottom: "1px solid rgba(182,136,94,0.06)" } : undefined}
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold" style={{ color: "var(--cream)" }}>{product.name.en}</p>
                <p className="truncate text-[11px]" dir="rtl" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
                  {product.name.ar}
                </p>
                <p className="mt-1 text-[10.5px]" style={{ color: "var(--gold)", opacity: 0.65 }}>
                  {product.category.en}
                </p>
              </div>
              <MetricCell label="Views" value={fmt(product.views)} />
              <MetricCell label="Orders" value={fmt(product.orders)} />
              <MetricCell label="Revenue" value={money(product.revenue)} />
              <MetricCell label="Stock" value={fmt(product.stock)} warning={product.stock < 10} />
              <MetricCell label="Returns" value={percent(product.returnRate)} warning={product.returnRate >= 7} />
              <div>
                <span
                  className="inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                  style={{ color: demand.text, background: demand.bg, border: `1px solid ${demand.border}` }}
                >
                  {product.demand} demand
                </span>
                <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.58 }}>
                  {product.signal}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </Surface>
  );
}

function MetricCell({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 lg:block lg:text-right">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider lg:hidden" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
        {label}
      </span>
      <span
        className="text-[12.5px] font-semibold tabular-nums"
        style={{ color: warning ? "#fbbf24" : "var(--cream)" }}
      >
        {value}
      </span>
    </div>
  );
}

function CustomerSegmentsPanel() {
  const maxRevenue = Math.max(...CUSTOMER_SEGMENTS.map((segment) => segment.revenue));

  return (
    <Surface title="Customer Segments" caption="Revenue and movement by customer type." icon={Users}>
      <div className="space-y-4 px-5 py-5">
        {CUSTOMER_SEGMENTS.map((segment) => (
          <div key={segment.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>{segment.label}</p>
                <p className="text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.48 }}>{segment.count} customers</p>
              </div>
              <div className="text-right">
                <p className="text-[12.5px] font-semibold" style={{ color: "var(--gold)" }}>{money(segment.revenue)}</p>
                <TrendBadge value={segment.trend} />
              </div>
            </div>
            <ProgressBar value={segment.revenue} max={maxRevenue} tone={segment.trend >= 0 ? "green" : "red"} />
          </div>
        ))}
      </div>
    </Surface>
  );
}

function TopCustomersPanel() {
  return (
    <Surface title="Top Customers" caption="High-value customers by recorded mock order revenue." icon={Receipt}>
      <div>
        {TOP_CUSTOMERS.map((customer, index) => (
          <div
            key={customer.id}
            className="flex items-center justify-between gap-4 px-5 py-4"
            style={index < TOP_CUSTOMERS.length - 1 ? { borderBottom: "1px solid rgba(182,136,94,0.06)" } : undefined}
          >
            <div className="min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>{customer.name}</p>
              <p className="mt-1 text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>
                {customer.segment} - {customer.orders} orders - last order {customer.lastOrder}
              </p>
            </div>
            <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: "var(--gold)" }}>
              {money(customer.revenue)}
            </span>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function MarketingTable() {
  const maxPaidRevenue = Math.max(...MARKETING_PERFORMANCE.map((campaign) => campaign.paidRevenue));

  return (
    <Surface title="Marketing Performance" caption="Original order value, discount cost, paid revenue, usage, and conversion." icon={Megaphone}>
      <div
        className="hidden gap-4 px-5 py-3 text-[10.5px] font-semibold uppercase tracking-wider lg:grid"
        style={{
          gridTemplateColumns: "1.3fr 0.8fr 0.8fr 0.9fr 0.9fr 0.9fr 0.8fr",
          color: "var(--cream-dim)",
          opacity: 0.55,
          borderBottom: "1px solid rgba(182,136,94,0.08)",
        }}
      >
        <span>Campaign</span>
        <span>Type</span>
        <span className="text-right">Usage</span>
        <span className="text-right">Original</span>
        <span className="text-right">Discount</span>
        <span className="text-right">Paid</span>
        <span>Status</span>
      </div>
      <div>
        {MARKETING_PERFORMANCE.map((campaign, index) => {
          const tone = MARKETING_STATUS_STYLE[campaign.status];

          return (
            <article
              key={campaign.id}
              className="grid gap-3 px-5 py-4 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.9fr_0.9fr_0.9fr_0.8fr] lg:items-center"
              style={index < MARKETING_PERFORMANCE.length - 1 ? { borderBottom: "1px solid rgba(182,136,94,0.06)" } : undefined}
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold" style={{ color: "var(--cream)" }}>{campaign.name}</p>
                <p className="mt-1 text-[10.5px] font-mono" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>{campaign.id}</p>
              </div>
              <MetricCell label="Type" value={campaign.type} />
              <MetricCell label="Usage" value={fmt(campaign.usageCount)} />
              <MetricCell label="Original" value={money(campaign.originalRevenue)} />
              <MetricCell label="Discount" value={money(campaign.discountGiven)} warning={campaign.status === "Weak"} />
              <div className="lg:text-right">
                <div className="mb-1 flex items-center justify-between gap-3 lg:block">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider lg:hidden" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
                    Paid
                  </span>
                  <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: "var(--cream)" }}>
                    {money(campaign.paidRevenue)}
                  </span>
                </div>
                <ProgressBar value={campaign.paidRevenue} max={maxPaidRevenue} tone={campaign.status === "Weak" ? "red" : "green"} height={4} />
              </div>
              <div>
                <span
                  className="inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                  style={{ color: tone.text, background: tone.bg, border: `1px solid ${tone.border}` }}
                >
                  {campaign.status}
                </span>
                <p className="mt-1 text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.48 }}>
                  {percent(campaign.conversionRate)} conversion
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </Surface>
  );
}

function GeographyPanel() {
  const maxRevenue = Math.max(...GEOGRAPHY_ANALYTICS.map((area) => area.revenue));

  return (
    <Surface title="Orders by Governorate" caption="Regional order volume, revenue, repeat behavior, and delivery friction." icon={MapPin}>
      <div className="space-y-4 px-5 py-5">
        {GEOGRAPHY_ANALYTICS.map((area) => (
          <div key={area.governorate.en}>
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>{area.governorate.en}</p>
                <p className="text-[11px]" dir="rtl" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
                  {area.governorate.ar}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[12.5px] font-semibold" style={{ color: "var(--gold)" }}>{money(area.revenue)}</p>
                <p className="text-[10.5px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>{area.orders} orders</p>
              </div>
            </div>
            <ProgressBar value={area.revenue} max={maxRevenue} tone={area.deliveryIssues > 5 ? "amber" : "gold"} />
          </div>
        ))}
      </div>
    </Surface>
  );
}

function GeographyTable() {
  return (
    <Surface title="Geography Detail" caption="Customers, average order value, repeat rate, and delivery issues by area." icon={Truck}>
      <div
        className="hidden gap-4 px-5 py-3 text-[10.5px] font-semibold uppercase tracking-wider md:grid"
        style={{
          gridTemplateColumns: "1.4fr 0.8fr 0.9fr 0.9fr 0.8fr 0.9fr",
          color: "var(--cream-dim)",
          opacity: 0.55,
          borderBottom: "1px solid rgba(182,136,94,0.08)",
        }}
      >
        <span>Governorate</span>
        <span className="text-right">Orders</span>
        <span className="text-right">Revenue</span>
        <span className="text-right">AOV</span>
        <span className="text-right">Repeat</span>
        <span className="text-right">Issues</span>
      </div>
      <div>
        {GEOGRAPHY_ANALYTICS.map((area, index) => (
          <article
            key={area.governorate.en}
            className="grid gap-3 px-5 py-4 md:grid-cols-[1.4fr_0.8fr_0.9fr_0.9fr_0.8fr_0.9fr] md:items-center"
            style={index < GEOGRAPHY_ANALYTICS.length - 1 ? { borderBottom: "1px solid rgba(182,136,94,0.06)" } : undefined}
          >
            <div className="min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>{area.governorate.en}</p>
              <p className="text-[11px]" dir="rtl" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
                {area.governorate.ar}
              </p>
              <p className="mt-1 text-[10.5px]" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
                {area.customers} customers
              </p>
            </div>
            <MetricCell label="Orders" value={fmt(area.orders)} />
            <MetricCell label="Revenue" value={money(area.revenue)} />
            <MetricCell label="AOV" value={money(area.averageOrderValue)} />
            <MetricCell label="Repeat" value={percent(area.repeatRate)} />
            <MetricCell label="Issues" value={fmt(area.deliveryIssues)} warning={area.deliveryIssues > 5} />
          </article>
        ))}
      </div>
    </Surface>
  );
}

function GeographyKpis() {
  const topArea = GEOGRAPHY_ANALYTICS.reduce(
    (winner, area) => area.revenue > winner.revenue ? area : winner,
    GEOGRAPHY_ANALYTICS[0]
  );
  const highestAov = GEOGRAPHY_ANALYTICS.reduce(
    (winner, area) => area.averageOrderValue > winner.averageOrderValue ? area : winner,
    GEOGRAPHY_ANALYTICS[0]
  );
  const totalIssues = GEOGRAPHY_ANALYTICS.reduce((sum, area) => sum + area.deliveryIssues, 0);

  const kpis: AnalyticsKpi[] = [
    {
      label: "Top Governorate",
      value: topArea.revenue,
      format: "money",
      trend: 9.8,
      caption: `${topArea.governorate.en} leads by revenue`,
      tone: "gold",
    },
    {
      label: "Highest AOV",
      value: highestAov.averageOrderValue,
      format: "money",
      trend: 6.4,
      caption: `${highestAov.governorate.en} has larger orders`,
      tone: "blue",
    },
    {
      label: "Delivery Issues",
      value: totalIssues,
      format: "number",
      trend: -2.2,
      caption: "Mock delivery issue count",
      tone: "amber",
    },
    {
      label: "Covered Areas",
      value: GEOGRAPHY_ANALYTICS.length,
      format: "number",
      trend: 0,
      caption: "Governorates in current mock view",
      tone: "green",
    },
  ];

  return <KpiGrid kpis={kpis} icons={[MapPin, Receipt, Truck, Target]} />;
}

function OverviewTab() {
  return (
    <div className="space-y-4">
      <KpiGrid kpis={OVERVIEW_KPIS} icons={[Receipt, ShoppingBag, Percent, Users]} />
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <SalesTrendChart />
        <RiskAlertsPanel />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <CategoryRevenuePanel />
        <InsightsPanel />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ProductRankingPanel
          title="Most Sold"
          caption="Product movement by units sold."
          products={MOST_SOLD_PRODUCTS}
          metric={(product) => product.sold}
          formatter={(value) => `${fmt(value)} sold`}
          icon={Package}
        />
        <ProductRankingPanel
          title="Most Viewed"
          caption="Demand signal before purchase."
          products={MOST_VIEWED_PRODUCTS}
          metric={(product) => product.views}
          formatter={(value) => `${fmt(value)} views`}
          icon={Eye}
        />
        <ProductRankingPanel
          title="Most Returned"
          caption="Products with the highest return rate."
          products={MOST_RETURNED_PRODUCTS}
          metric={(product) => product.returnRate}
          formatter={percent}
          icon={AlertTriangle}
        />
      </div>
    </div>
  );
}

function SalesTab() {
  return (
    <div className="space-y-4">
      <KpiGrid kpis={OVERVIEW_KPIS.slice(0, 3)} icons={[Receipt, ShoppingBag, Percent]} />
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <SalesTrendChart />
        <CategoryRevenuePanel />
      </div>
      <InsightsPanel />
    </div>
  );
}

function ProductsTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <ProductRankingPanel
          title="Most Sold"
          caption="Finished products and builder ingredients by sold units."
          products={MOST_SOLD_PRODUCTS}
          metric={(product) => product.sold}
          formatter={(value) => `${fmt(value)} sold`}
          icon={Package}
        />
        <ProductRankingPanel
          title="Most Added to Cart"
          caption="Products that shoppers considered before checkout."
          products={[...PRODUCT_ANALYTICS].sort((a, b) => b.addedToCart - a.addedToCart)}
          metric={(product) => product.addedToCart}
          formatter={(value) => `${fmt(value)} carts`}
          icon={ShoppingBag}
        />
        <ProductRankingPanel
          title="Slow Products"
          caption="Items with weak demand or low order conversion."
          products={SLOW_PRODUCTS}
          metric={(product) => product.views}
          formatter={(value) => `${fmt(value)} views`}
          icon={TrendingDown}
        />
      </div>
      <RiskAlertsPanel compact />
      <ProductTable />
    </div>
  );
}

function CustomersTab() {
  return (
    <div className="space-y-4">
      <KpiGrid kpis={CUSTOMER_KPIS} icons={[Users, Activity, Target, Receipt]} />
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <CustomerSegmentsPanel />
        <TopCustomersPanel />
      </div>
      <InsightsPanel />
    </div>
  );
}

function MarketingTab() {
  return (
    <div className="space-y-4">
      <KpiGrid kpis={MARKETING_SUMMARY} icons={[Megaphone, Percent, Target, TrendingUp]} />
      <MarketingTable />
      <Surface title="Campaign Efficiency Notes" caption="Marketing analytics reads from mock performance numbers only." icon={Activity}>
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <SignalPill label="Best offer" value="Free Shipping 500+ has the strongest conversion at 18.9%." tone="green" />
          <SignalPill label="Best promo code" value="WELCOME50 generated 18,000 EGP paid revenue from 30 uses." tone="blue" />
          <SignalPill label="Watch list" value="WINBACK20 has weak usage and needs a stronger inactive customer segment." tone="amber" />
        </div>
      </Surface>
    </div>
  );
}

function GeographyTab() {
  return (
    <div className="space-y-4">
      <GeographyKpis />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <GeographyPanel />
        <GeographyTable />
      </div>
      <Surface title="Regional Read" caption="Mock geography insights for order routing and campaign focus." icon={MapPin}>
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <SignalPill label="Volume leader" value="Cairo brings the most orders and revenue." tone="gold" />
          <SignalPill label="Repeat leader" value="Giza has the strongest repeat customer rate." tone="green" />
          <SignalPill label="AOV leader" value="Alexandria has fewer orders but the highest average order value." tone="blue" />
        </div>
      </Surface>
    </div>
  );
}

function renderTab(activeTab: ActiveTab) {
  if (activeTab === "overview") return <OverviewTab />;
  if (activeTab === "sales") return <SalesTab />;
  if (activeTab === "products") return <ProductsTab />;
  if (activeTab === "customers") return <CustomersTab />;
  if (activeTab === "marketing") return <MarketingTab />;
  return <GeographyTab />;
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
              Analytics
            </h1>
            <span
              className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
              style={{
                color: "var(--gold)",
                background: "rgba(182,136,94,0.12)",
                border: "1px solid rgba(182,136,94,0.22)",
              }}
            >
              Business Performance Center
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.62 }}>
            {ANALYTICS_META.period} - updated {ANALYTICS_META.updatedAt} - {ANALYTICS_META.mode}
          </p>
        </div>

        <div
          className="rounded-xl px-3 py-2 text-[11.5px] leading-relaxed"
          style={{
            color: "var(--cream-dim)",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(182,136,94,0.10)",
          }}
        >
          Reads mock signals from orders, products, customers, marketing, inventory, and geography.
        </div>
      </div>

      <div
        className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12px] leading-relaxed"
        style={{
          color: "var(--cream-dim)",
          background: "rgba(251,191,36,0.10)",
          borderColor: "rgba(251,191,36,0.24)",
        }}
      >
        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: "#fbbf24" }} />
        <span>
          Analytics shown here are based on sample data. After backend integration, these will reflect real orders,
          customers, and marketing events.
        </span>
      </div>

      <div
        className="flex gap-2 overflow-x-auto rounded-xl p-1 admin-scrollbar"
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(182,136,94,0.10)",
        }}
        role="tablist"
        aria-label="Analytics sections"
      >
        {TAB_OPTIONS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.key)}
              className="flex min-w-fit items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all"
              style={{
                color: active ? "var(--gold)" : "var(--cream-dim)",
                background: active ? "rgba(182,136,94,0.13)" : "transparent",
                border: active ? "1px solid rgba(182,136,94,0.22)" : "1px solid transparent",
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {renderTab(activeTab)}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Calculator,
  CreditCard,
  Landmark,
  Loader2,
  Package,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  getAdminAccounting,
  type AccountingActivityDirection,
  type AccountingOrderRow,
  type AccountingTransaction,
  type AdminAccountingData,
  AdminAccountingError,
} from "@/lib/admin/admin-accounting";
import type { OrderStatus } from "@/lib/types/order";

type ActiveTab = "overview" | "revenue" | "purchases" | "expenses" | "suppliers" | "activity";
type ActivityFilter = "All" | "in" | "out" | "neutral";
type Tone = "gold" | "green" | "blue" | "amber" | "red" | "cream";

const TABS: Array<{ key: ActiveTab; label: string; icon: LucideIcon }> = [
  { key: "overview", label: "Overview", icon: Landmark },
  { key: "revenue", label: "Revenue", icon: Receipt },
  { key: "purchases", label: "Purchases", icon: Package },
  { key: "expenses", label: "Expenses", icon: Calculator },
  { key: "suppliers", label: "Suppliers", icon: CreditCard },
  { key: "activity", label: "Activity", icon: Activity },
];

const TONE_STYLE: Record<Tone, { color: string; bg: string; border: string }> = {
  gold: { color: "var(--gold)", bg: "rgba(182,136,94,0.12)", border: "rgba(182,136,94,0.24)" },
  green: { color: "#4ade80", bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.24)" },
  blue: { color: "#60a5fa", bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.24)" },
  amber: { color: "#fbbf24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.24)" },
  red: { color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.24)" },
  cream: { color: "var(--cream)", bg: "rgba(245,230,216,0.07)", border: "rgba(245,230,216,0.14)" },
};

const STATUS_TONE: Record<OrderStatus, Tone> = {
  pending: "amber",
  preparing: "blue",
  shipped: "blue",
  delivered: "green",
  cancelled: "red",
  returned: "cream",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

const ACTIVITY_TONE: Record<AccountingActivityDirection, Tone> = {
  in: "green",
  out: "red",
  neutral: "blue",
};

const KIND_LABEL: Record<AccountingTransaction["kind"], string> = {
  payment: "Payment",
  refund: "Refund",
  expense: "Expense",
  purchase: "Purchase",
  "supplier-payment": "Supplier Pay",
  return: "Return",
};

const moneyFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function fmt(value: number) {
  return moneyFormatter.format(Math.round(value));
}

function money(value: number) {
  return `${fmt(value)} EGP`;
}

function signedMoney(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${money(Math.abs(value))}`;
}

function pct(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function shortDate(value: string) {
  if (!value) return "—";
  return value.slice(0, 10);
}

// ── Primitives (shared visual language) ────────────────────────────────────────

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  const style = TONE_STYLE[tone];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
      style={{ color: style.color, background: style.bg, borderColor: style.border }}
    >
      {label}
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
        className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
        style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}
      >
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span
              className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
              style={{
                color: "var(--gold)",
                background: "rgba(182,136,94,0.10)",
                border: "1px solid rgba(182,136,94,0.16)",
              }}
            >
              <Icon size={15} />
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
              <p className="mt-1 max-w-3xl text-[12px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.58 }}>
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
  icon: Icon,
}: {
  label: string;
  value: string;
  caption?: string;
  tone: Tone;
  icon?: LucideIcon;
}) {
  const style = TONE_STYLE[tone];
  return (
    <article className="admin-kpi-card py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.46 }}>
            {label}
          </p>
          <p className="mt-1 text-[20px] font-bold leading-tight" style={{ color: style.color }}>
            {value}
          </p>
        </div>
        {Icon && (
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
          >
            <Icon size={15} />
          </span>
        )}
      </div>
      {caption && (
        <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.52 }}>
          {caption}
        </p>
      )}
    </article>
  );
}

function Note({ children, tone = "gold" }: { children: ReactNode; tone?: Tone }) {
  const style = TONE_STYLE[tone];
  return (
    <div
      className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12px] leading-relaxed"
      style={{ color: "var(--cream-dim)", background: style.bg, borderColor: style.border }}
    >
      <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: style.color }} />
      <span>{children}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ color: "var(--cream-dim)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(182,136,94,0.12)" }}
      >
        <Icon size={17} />
      </span>
      <p className="text-[12.5px]" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>
        {message}
      </p>
    </div>
  );
}

const TREND_SERIES: Array<{ key: "revenue" | "collections" | "grossProfit" | "expenses"; label: string; tone: Tone }> = [
  { key: "revenue", label: "Revenue", tone: "gold" },
  { key: "collections", label: "Collections", tone: "green" },
  { key: "grossProfit", label: "Gross Profit", tone: "blue" },
  { key: "expenses", label: "Expenses", tone: "red" },
];

function MonthlyTrendChart({ points }: { points: AdminAccountingData["monthly"] }) {
  const max = Math.max(
    1,
    ...points.flatMap((p) => [p.revenue, p.collections, p.grossProfit, p.expenses].map((v) => Math.max(0, v))),
  );

  return (
    <div className="px-5 py-5">
      <div className="flex flex-wrap gap-3 pb-4">
        {TREND_SERIES.map((series) => (
          <span key={series.key} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: "var(--cream-dim)" }}>
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: TONE_STYLE[series.tone].color }} />
            {series.label}
          </span>
        ))}
      </div>
      <div className="flex items-end gap-3 overflow-x-auto" style={{ height: 168 }}>
        {points.map((point) => (
          <div key={point.label} className="flex min-w-[54px] flex-1 flex-col items-center gap-2">
            <div className="flex h-[132px] w-full items-end justify-center gap-1">
              {TREND_SERIES.map((series) => {
                const value = point[series.key];
                const height = `${(Math.max(0, value) / max) * 100}%`;
                return (
                  <div
                    key={series.key}
                    className="w-2 rounded-t-sm"
                    style={{ height, background: TONE_STYLE[series.tone].color, opacity: 0.9 }}
                    title={`${series.label} · ${point.label}: ${money(value)}`}
                  />
                );
              })}
            </div>
            <span className="text-[10.5px]" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountingPage() {
  const [data, setData] = useState<AdminAccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("All");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAdminAccounting());
    } catch (err) {
      setError(
        err instanceof AdminAccountingError
          ? err.message
          : "Could not load accounting data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial + refresh data fetch
  useEffect(() => { void load(); }, [load]);

  const filteredActivity = useMemo(
    () => (data?.transactions ?? []).filter((t) => activityFilter === "All" || t.direction === activityFilter),
    [data, activityFilter],
  );

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
              Accounting
            </h1>
            <StatusPill label="Live data" tone="green" />
          </div>
          <p className="mt-1 text-[13px]" style={{ color: "var(--cream-dim)", opacity: 0.62 }}>
            Real revenue, collections, COGS, expenses, and supplier balances from live orders and ledgers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors hover:bg-white/[0.04]"
          style={{ color: "var(--gold)", background: "rgba(182,136,94,0.12)", border: "1px solid rgba(182,136,94,0.24)" }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div
          className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}
        >
          <span className="flex items-center gap-2 text-[12.5px]" style={{ color: "#f87171" }}>
            <AlertTriangle size={14} /> {error}
          </span>
          <button type="button" onClick={() => void load()} className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "var(--gold)" }}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center gap-2 py-16" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>
          <Loader2 size={16} className="animate-spin" /> Loading real accounting data…
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="Sales (Gross)" value={money(data.salesGross)} caption="Non-cancelled orders, incl. delivery." tone="green" icon={TrendingUp} />
            <KpiCard label="Net Collected" value={money(data.netCollected)} caption="Payments minus refunds." tone="gold" icon={Wallet} />
            <KpiCard
              label="Gross Profit"
              value={money(data.grossProfit)}
              caption={`Delivered basis · margin ${pct(data.grossMargin)}.`}
              tone={data.grossProfit >= 0 ? "blue" : "red"}
              icon={Calculator}
            />
            <KpiCard
              label="Net Profit"
              value={money(data.netProfit)}
              caption="Gross profit minus operating expenses."
              tone={data.netProfit >= 0 ? "green" : "red"}
              icon={data.netProfit >= 0 ? ArrowUpRight : ArrowDownRight}
            />
            <KpiCard
              label="Supplier Payable"
              value={money(data.supplierPayable)}
              caption="Unpaid purchase balances."
              tone={data.supplierPayable > 0 ? "amber" : "green"}
              icon={CreditCard}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Note tone="green">Sales exclude cancelled orders; returns never rewrite historical sales.</Note>
            <Note tone={data.deliveredMissingCogs > 0 ? "amber" : "blue"}>
              {data.deliveredMissingCogs > 0
                ? `COGS uses stored delivered-order snapshots only. ${data.deliveredMissingCogs} delivered order(s) have no COGS snapshot and count as 0.`
                : "COGS uses stored delivered-order snapshots only — never recomputed from current stock."}
            </Note>
            <Note tone="blue">Purchases are inventory / cost basis, not P&amp;L expenses. Net profit excludes them.</Note>
          </div>

          {!data.hasAnyData && (
            <Surface title="No financial data yet" icon={Landmark}>
              <EmptyState icon={Receipt} message="No orders, payments, expenses, or purchases exist yet. Numbers will populate as real activity is recorded." />
            </Surface>
          )}

          <div
            className="overflow-x-auto rounded-xl p-1.5"
            style={{
              background: "linear-gradient(180deg, rgba(182,136,94,0.10), rgba(255,255,255,0.025))",
              border: "1px solid rgba(182,136,94,0.14)",
            }}
          >
            <div className="flex min-w-max gap-1.5">
              {TABS.map(({ key, label, icon: Icon }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    aria-pressed={active ? "true" : "false"}
                    className="inline-flex min-h-10 flex-shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-all hover:-translate-y-0.5"
                    style={{
                      color: active ? "var(--gold)" : "var(--cream-dim)",
                      background: active
                        ? "linear-gradient(180deg, rgba(182,136,94,0.24), rgba(182,136,94,0.10))"
                        : "rgba(10,7,5,0.34)",
                      border: active ? "1px solid rgba(214,163,115,0.42)" : "1px solid rgba(182,136,94,0.08)",
                      boxShadow: active ? "0 10px 26px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06)" : "none",
                    }}
                  >
                    <Icon size={14} className="flex-shrink-0" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === "overview" && <OverviewTab data={data} />}
          {activeTab === "revenue" && <RevenueTab data={data} />}
          {activeTab === "purchases" && <PurchasesTab data={data} />}
          {activeTab === "expenses" && <ExpensesTab data={data} />}
          {activeTab === "suppliers" && <SuppliersTab data={data} />}
          {activeTab === "activity" && (
            <ActivityTab
              data={data}
              filter={activityFilter}
              onFilter={setActivityFilter}
              rows={filteredActivity}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: AdminAccountingData }) {
  const plRows: Array<{ label: string; value: number; tone: Tone; sign: string; strong?: boolean }> = [
    { label: "Delivered Net Sales", value: data.deliveredNetSales, tone: "green", sign: "+" },
    { label: "Cost of Goods Sold (COGS)", value: data.cogsTotal, tone: "amber", sign: "-" },
    { label: "Gross Profit", value: data.grossProfit, tone: data.grossProfit >= 0 ? "blue" : "red", sign: "", strong: true },
    { label: "Operating Expenses", value: data.operatingExpenses, tone: "red", sign: "-" },
    { label: "Net Profit", value: data.netProfit, tone: data.netProfit >= 0 ? "green" : "red", sign: "", strong: true },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
      <Surface
        title="Profit & Loss"
        caption="Delivered basis: revenue and COGS share the same delivered-order set. Expenses are period-wide operating costs."
        icon={Calculator}
      >
        <div className="space-y-3 px-5 py-5">
          {plRows.map((row) => {
            const style = TONE_STYLE[row.tone];
            return (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-3"
                style={{
                  background: row.strong ? "rgba(182,136,94,0.08)" : "rgba(255,255,255,0.025)",
                  border: `1px solid ${row.strong ? "rgba(182,136,94,0.20)" : "rgba(182,136,94,0.08)"}`,
                }}
              >
                <span className={`text-[13px] ${row.strong ? "font-bold" : "font-medium"}`} style={{ color: "var(--cream)" }}>
                  {row.label}
                </span>
                <span className={`text-[14px] ${row.strong ? "font-bold" : "font-semibold"}`} style={{ color: style.color }}>
                  {row.sign}
                  {money(row.value)}
                </span>
              </div>
            );
          })}
        </div>
      </Surface>

      <Surface title="Cash & Collections" caption="Real payment and refund ledgers. Profit and cash are tracked separately." icon={Wallet}>
        <div className="grid grid-cols-2 gap-3 px-5 py-5">
          <KpiCard label="Collected" value={money(data.paidTotal)} caption="Sum of order payments." tone="green" icon={Banknote} />
          <KpiCard label="Refunded" value={money(data.refundedTotal)} caption="Reduces cash only." tone={data.refundedTotal > 0 ? "red" : "green"} icon={TrendingDown} />
          <KpiCard label="Net Collected" value={money(data.netCollected)} caption="Payments − refunds." tone="gold" icon={Wallet} />
          <KpiCard label="Receivable" value={money(data.receivable)} caption="Order totals not yet collected." tone={data.receivable > 0 ? "amber" : "green"} icon={CreditCard} />
        </div>
        <div className="px-5 pb-5">
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>
            Collected by method
          </p>
          {data.methodBreakdown.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
              No payments recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {data.methodBreakdown.map((method) => (
                <div
                  key={method.key}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(182,136,94,0.08)" }}
                >
                  <span className="text-[12.5px]" style={{ color: "var(--cream)" }}>
                    {method.label}
                    <span className="ml-2 text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
                      {method.count} payment{method.count === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="text-[13px] font-semibold" style={{ color: "var(--gold)" }}>
                    {money(method.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Surface>
    </div>
  );
}

// ── Revenue ──────────────────────────────────────────────────────────────────

function RevenueTab({ data }: { data: AdminAccountingData }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Sales (Gross)" value={money(data.salesGross)} tone="green" icon={Receipt} />
        <KpiCard label="Net Product Sales" value={money(data.netProductSales)} tone="gold" icon={Banknote} />
        <KpiCard label="Discounts" value={money(data.discountsTotal)} tone="amber" icon={TrendingDown} />
        <KpiCard label="Delivery Fees" value={money(data.deliveryFeesTotal)} tone="blue" icon={Truck} />
        <KpiCard label="Delivered COGS" value={money(data.cogsTotal)} tone="amber" icon={Calculator} />
        <KpiCard label="Gross Margin" value={pct(data.grossMargin)} tone="blue" icon={TrendingUp} />
      </div>

      <Surface title="Monthly Trends" caption={`Last ${data.monthly.length} months: revenue, collections, gross profit, and expenses.`} icon={TrendingUp}>
        <MonthlyTrendChart points={data.monthly} />
      </Surface>

      <Surface
        title="Recent Orders"
        caption="Product revenue = subtotal − discount. COGS/margin shown for delivered orders only. Cancelled orders stay out of totals."
        icon={Receipt}
      >
        {data.orders.length === 0 ? (
          <EmptyState icon={Receipt} message="No orders recorded yet." />
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <div
                className="grid min-w-[1080px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  gridTemplateColumns: "1fr 1.3fr 0.9fr 0.9fr 0.9fr 0.9fr 1fr 0.9fr 0.9fr",
                  color: "var(--cream-dim)",
                  background: "rgba(182,136,94,0.05)",
                  borderBottom: "1px solid rgba(182,136,94,0.08)",
                }}
              >
                <span>Order</span>
                <span>Customer</span>
                <span>Status</span>
                <span className="text-right">Subtotal</span>
                <span className="text-right">Discount</span>
                <span className="text-right">Total</span>
                <span className="text-right">Net Paid</span>
                <span className="text-right">Est. COGS</span>
                <span className="text-right">Margin</span>
              </div>
              {data.orders.map((entry) => (
                <OrderRowDesktop key={entry.id} entry={entry} />
              ))}
            </div>
            <div className="space-y-3 px-4 py-4 xl:hidden">
              {data.orders.map((entry) => (
                <OrderRowMobile key={entry.id} entry={entry} />
              ))}
            </div>
          </>
        )}
      </Surface>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Note tone="amber">COGS comes only from the stored delivered-order snapshot (`orders.cogs_total`); it is never recomputed from current stock costs.</Note>
        <Note tone="red">Refunds reduce cash collected only. Cancelled orders never count as revenue.</Note>
      </div>
    </div>
  );
}

function OrderRowDesktop({ entry }: { entry: AccountingOrderRow }) {
  return (
    <div
      className="grid min-w-[1080px] items-center gap-4 px-5 py-3.5 text-[12.5px]"
      style={{
        gridTemplateColumns: "1fr 1.3fr 0.9fr 0.9fr 0.9fr 0.9fr 1fr 0.9fr 0.9fr",
        color: "var(--cream)",
        borderBottom: "1px solid rgba(182,136,94,0.06)",
      }}
    >
      <span className="font-mono text-[11.5px]" style={{ color: "var(--cream-dim)", opacity: 0.58 }}>
        {entry.code}
      </span>
      <span className="truncate">{entry.customer}</span>
      <StatusPill label={STATUS_LABEL[entry.status]} tone={STATUS_TONE[entry.status]} />
      <span className="text-right">{money(entry.subtotal)}</span>
      <span className="text-right" style={{ color: entry.discount > 0 ? "#fbbf24" : "var(--cream-dim)" }}>
        {money(entry.discount)}
      </span>
      <span className="text-right font-semibold" style={{ color: "#4ade80" }}>
        {money(entry.total)}
      </span>
      <span className="text-right" style={{ color: "var(--gold)" }}>
        {money(entry.netPaid)}
      </span>
      <span className="text-right" style={{ color: entry.cogs === null ? "var(--cream-dim)" : "#fbbf24" }}>
        {entry.cogs === null ? "—" : money(entry.cogs)}
      </span>
      <span className="text-right">{pct(entry.margin)}</span>
    </div>
  );
}

function OrderRowMobile({ entry }: { entry: AccountingOrderRow }) {
  return (
    <article className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(182,136,94,0.08)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11.5px]" style={{ color: "var(--gold)" }}>
            {entry.code}
          </p>
          <p className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>
            {entry.customer}
          </p>
        </div>
        <StatusPill label={STATUS_LABEL[entry.status]} tone={STATUS_TONE[entry.status]} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
        <span style={{ color: "var(--cream-dim)" }}>Total</span>
        <span className="text-right font-semibold" style={{ color: "#4ade80" }}>{money(entry.total)}</span>
        <span style={{ color: "var(--cream-dim)" }}>Net paid</span>
        <span className="text-right font-semibold" style={{ color: "var(--gold)" }}>{money(entry.netPaid)}</span>
        <span style={{ color: "var(--cream-dim)" }}>Est. COGS</span>
        <span className="text-right" style={{ color: entry.cogs === null ? "var(--cream-dim)" : "#fbbf24" }}>
          {entry.cogs === null ? "—" : money(entry.cogs)}
        </span>
      </div>
    </article>
  );
}

// ── Purchases ────────────────────────────────────────────────────────────────

function PurchasesTab({ data }: { data: AdminAccountingData }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Total Purchases" value={money(data.totalPurchases)} caption="Non-cancelled purchases." tone="blue" icon={Package} />
        <KpiCard label="Paid to Suppliers" value={money(data.paidToSuppliers)} caption="Amount already settled." tone="green" icon={Banknote} />
        <KpiCard label="Supplier Payable" value={money(data.supplierPayable)} caption="Unpaid purchase balances." tone={data.supplierPayable > 0 ? "amber" : "green"} icon={CreditCard} />
      </div>

      <Surface title="Inventory Purchases" caption="Goods entering stock. These affect cost basis and payables — not P&amp;L operating expenses." icon={Package}>
        {data.purchases.length === 0 ? (
          <EmptyState icon={Package} message="No purchases recorded yet. Record purchases from the Purchasing / Inventory workflow." />
        ) : (
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[880px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
              style={{
                gridTemplateColumns: "1fr 1.4fr 1.2fr 0.9fr 1fr 1fr 1fr",
                color: "var(--cream-dim)",
                background: "rgba(182,136,94,0.05)",
                borderBottom: "1px solid rgba(182,136,94,0.08)",
              }}
            >
              <span>Date</span>
              <span>Supplier</span>
              <span>Reference</span>
              <span>Status</span>
              <span className="text-right">Total</span>
              <span className="text-right">Paid</span>
              <span className="text-right">Unpaid</span>
            </div>
            {data.purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="grid min-w-[880px] items-center gap-4 px-5 py-3.5 text-[12.5px]"
                style={{
                  gridTemplateColumns: "1fr 1.4fr 1.2fr 0.9fr 1fr 1fr 1fr",
                  color: "var(--cream)",
                  borderBottom: "1px solid rgba(182,136,94,0.06)",
                }}
              >
                <span style={{ color: "var(--cream-dim)", opacity: 0.58 }}>{shortDate(purchase.date)}</span>
                <span className="truncate">{purchase.supplierName}</span>
                <span className="truncate" style={{ color: "var(--cream-dim)", opacity: 0.62 }}>{purchase.reference || "—"}</span>
                <StatusPill
                  label={purchase.paymentStatus}
                  tone={purchase.unpaid > 0 ? (purchase.paid > 0 ? "amber" : "red") : "green"}
                />
                <span className="text-right font-semibold">{money(purchase.total)}</span>
                <span className="text-right" style={{ color: "#fbbf24" }}>{money(purchase.paid)}</span>
                <span className="text-right" style={{ color: purchase.unpaid > 0 ? "#f87171" : "#4ade80" }}>{money(purchase.unpaid)}</span>
              </div>
            ))}
          </div>
        )}
      </Surface>

      <Note tone="blue">Purchases increase inventory / cost basis. COGS is only recognized later, at delivery, from the FIFO lot snapshot — not when the purchase is made.</Note>
    </div>
  );
}

// ── Expenses ─────────────────────────────────────────────────────────────────

function ExpensesTab({ data }: { data: AdminAccountingData }) {
  const avg = data.expenses.length > 0 ? data.operatingExpenses / data.expenses.length : 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Operating Expenses" value={money(data.operatingExpenses)} caption="Real expenses table only." tone="red" icon={TrendingDown} />
        <KpiCard label="Expense Count" value={String(data.expenses.length)} tone="blue" icon={Receipt} />
        <KpiCard label="Avg per Expense" value={money(avg)} tone="gold" icon={Calculator} />
      </div>

      {data.monthly.some((m) => m.expenses > 0) && (
        <Surface title="Monthly Expenses" caption={`Operating expenses over the last ${data.monthly.length} months.`} icon={TrendingDown}>
          <div className="px-5 py-5">
            <div className="flex items-end gap-3 overflow-x-auto" style={{ height: 140 }}>
              {data.monthly.map((point) => {
                const max = Math.max(1, ...data.monthly.map((m) => m.expenses));
                return (
                  <div key={point.label} className="flex min-w-[54px] flex-1 flex-col items-center gap-2">
                    <div className="flex h-[104px] w-full items-end justify-center">
                      <div
                        className="w-6 rounded-t-sm"
                        style={{ height: `${(point.expenses / max) * 100}%`, background: TONE_STYLE.red.color, opacity: 0.85 }}
                        title={`${point.label}: ${money(point.expenses)}`}
                      />
                    </div>
                    <span className="text-[10.5px]" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>{point.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Surface>
      )}

      <Surface title="Operating Expenses" caption="Non-COGS costs that reduce net profit. Stock, beans, and packaging belong in Purchases, not here." icon={Calculator}>
        {data.expenses.length === 0 ? (
          <EmptyState icon={Calculator} message="No operating expenses recorded yet." />
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(182,136,94,0.06)" }}>
            {data.expenses.map((expense) => (
              <div key={expense.id} className="grid grid-cols-1 gap-3 px-5 py-3.5 md:grid-cols-[1fr_1.6fr_0.8fr_0.8fr] md:items-center">
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>{expense.category}</p>
                  <p className="text-[11.5px]" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>{shortDate(expense.date)}</p>
                </div>
                <p className="text-[12.5px]" style={{ color: "var(--cream-dim)", opacity: 0.72 }}>{expense.notes || "—"}</p>
                <p className="text-[12.5px]" style={{ color: "var(--cream-dim)", opacity: 0.58 }}>{expense.method || "—"}</p>
                <p className="text-left text-[13px] font-semibold md:text-right" style={{ color: "#f87171" }}>-{money(expense.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}

// ── Suppliers ────────────────────────────────────────────────────────────────

function SuppliersTab({ data }: { data: AdminAccountingData }) {
  const openSuppliers = data.supplierBalances.filter((s) => s.payable > 0).length;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Supplier Payable" value={money(data.supplierPayable)} tone="amber" icon={CreditCard} />
        <KpiCard label="Total Purchases" value={money(data.totalPurchases)} tone="blue" icon={Package} />
        <KpiCard label="Suppliers With Balance" value={String(openSuppliers)} tone="gold" icon={Landmark} />
      </div>

      <Surface title="Supplier Balances" caption="Payable = unpaid purchase balances (purchase total − amount paid), from real purchases." icon={CreditCard}>
        {data.supplierBalances.length === 0 ? (
          <EmptyState icon={CreditCard} message="No supplier purchases recorded yet." />
        ) : (
          <div className="grid grid-cols-1 gap-3 px-5 py-5 lg:grid-cols-3">
            {data.supplierBalances.map((supplier) => (
              <article
                key={supplier.supplierId}
                className="rounded-lg p-4"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(182,136,94,0.08)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold" style={{ color: "var(--cream)" }}>{supplier.name}</p>
                    <p className="mt-1 text-[11.5px]" style={{ color: "var(--cream-dim)", opacity: 0.56 }}>
                      {supplier.purchaseCount} purchase{supplier.purchaseCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <StatusPill label={supplier.payable > 0 ? "Open" : "Clear"} tone={supplier.payable > 0 ? "amber" : "green"} />
                </div>
                <div className="mt-4 space-y-2 text-[12px]">
                  <div className="flex justify-between gap-3">
                    <span style={{ color: "var(--cream-dim)", opacity: 0.58 }}>Purchase total</span>
                    <span style={{ color: "var(--cream)" }}>{money(supplier.purchaseTotal)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span style={{ color: "var(--cream-dim)", opacity: 0.58 }}>Paid</span>
                    <span style={{ color: "#4ade80" }}>{money(supplier.paid)}</span>
                  </div>
                  <div className="flex justify-between gap-3 pt-2" style={{ borderTop: "1px solid rgba(182,136,94,0.08)" }}>
                    <span className="font-semibold" style={{ color: "var(--cream)" }}>Payable</span>
                    <span className="font-bold" style={{ color: supplier.payable > 0 ? "#fbbf24" : "#4ade80" }}>{money(supplier.payable)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}

// ── Activity ─────────────────────────────────────────────────────────────────

function ActivityTab({
  data,
  filter,
  onFilter,
  rows,
}: {
  data: AdminAccountingData;
  filter: ActivityFilter;
  onFilter: (value: ActivityFilter) => void;
  rows: AccountingTransaction[];
}) {
  const cashOut = data.refundedTotal + data.operatingExpenses + data.paidToSuppliers;
  const filters: Array<{ key: ActivityFilter; label: string }> = [
    { key: "All", label: "All" },
    { key: "in", label: "Inflow" },
    { key: "out", label: "Outflow" },
    { key: "neutral", label: "Neutral" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <KpiCard label="Collected (In)" value={money(data.paidTotal)} tone="green" icon={ArrowUpRight} />
        <KpiCard label="Cash Out" value={money(cashOut)} caption="Refunds + expenses + supplier payments." tone="red" icon={ArrowDownRight} />
        <KpiCard label="Net Collected" value={money(data.netCollected)} tone="gold" icon={Wallet} />
        <KpiCard label="Returns Logged" value={String(data.returnsCount)} caption={`${fmt(data.restockedKg)} kg restocked.`} tone="blue" icon={Activity} />
      </div>

      <Surface
        title="Recent Transactions"
        caption="Payments, refunds, expenses, purchases, supplier payments, and returns — most recent first. Not a formal journal."
        icon={Activity}
        right={
          <div className="flex flex-wrap gap-2">
            {filters.map((option) => {
              const active = filter === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onFilter(option.key)}
                  aria-pressed={active ? "true" : "false"}
                  className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold"
                  style={{
                    color: active ? "var(--gold)" : "var(--cream-dim)",
                    background: active ? "rgba(182,136,94,0.14)" : "rgba(255,255,255,0.025)",
                    border: active ? "1px solid rgba(182,136,94,0.28)" : "1px solid rgba(182,136,94,0.08)",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        }
      >
        {rows.length === 0 ? (
          <EmptyState icon={Activity} message="No transactions match this filter yet." />
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(182,136,94,0.06)" }}>
            {rows.map((entry) => {
              const tone = ACTIVITY_TONE[entry.direction];
              const style = TONE_STYLE[tone];
              return (
                <div key={entry.id} className="grid grid-cols-1 gap-3 px-5 py-3.5 md:grid-cols-[0.9fr_1fr_2fr_1fr] md:items-center">
                  <div>
                    <p className="font-mono text-[11.5px]" style={{ color: "var(--cream-dim)", opacity: 0.58 }}>{shortDate(entry.date)}</p>
                    <p className="mt-1"><StatusPill label={KIND_LABEL[entry.kind]} tone={tone} /></p>
                  </div>
                  <p className="text-[12.5px] font-semibold" style={{ color: "var(--cream)" }}>{entry.label}</p>
                  <p className="text-[11.5px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.62 }}>{entry.detail}</p>
                  <p className="text-left text-[13px] font-bold md:text-right" style={{ color: style.color }}>
                    {entry.direction === "neutral" ? money(entry.amount) : signedMoney(entry.direction === "in" ? entry.amount : -entry.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Surface>
    </div>
  );
}

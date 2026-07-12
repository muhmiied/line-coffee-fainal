"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  type DashboardKpi,
  type DashboardPeriod,
} from "@/lib/admin/admin-dashboard";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";
import { MixedNumeric } from "@/components/shared/MixedNumeric";

const PERIODS: { key: DashboardPeriod; label: string }[] = [
  { key: "today", label: "1D" },
  { key: "week",  label: "1W" },
  { key: "month", label: "1M" },
  { key: "all",   label: "∞"  },
];

// ── Sub-components ────────────────────────────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const W = 100, H = 22;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * H}`)
    .join(" ");
  const last = data[data.length - 1];
  const lastX = W;
  const lastY = H - (last / max) * H;
  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ opacity: 0.65 }}
    >
      <polyline
        points={pts}
        fill="none"
        stroke="var(--admin-hazelnut)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.2" fill="var(--admin-hazelnut)" />
    </svg>
  );
}


function OrdersStatusList({
  items,
}: {
  items: Array<{ label: string; count: number; color: string }>;
}) {
  const { t } = useAdminLanguage();

  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
      {items.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1.5 text-[11px] admin-muted"
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: item.color }}
          />
          <bdi dir="ltr" className="font-bold tabular-nums" style={{ color: item.color }}>{item.count}</bdi>
          <span className="admin-faint">{t(item.label)}</span>
        </span>
      ))}
    </div>
  );
}

function CustomerSplitBar({
  newCount,
  totalCount,
}: {
  newCount: number;
  totalCount: number;
}) {
  const { t } = useAdminLanguage();
  const newPct = totalCount > 0 ? Math.round((newCount / totalCount) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="admin-progress-track flex h-[5px]">
        <div
          className="h-full"
          style={{ width: `${newPct}%`, background: "linear-gradient(90deg, #6fb87e, #8fcf9a)" }}
        />
        <div
          className="h-full"
          style={{ width: `${100 - newPct}%`, background: "var(--admin-hazelnut)", opacity: 0.4 }}
        />
      </div>
      <div className="flex justify-between text-[10px] admin-muted">
        <span>
          <bdi dir="ltr" style={{ color: "#8fcf9a" }}>{newCount}</bdi> {t("new")}
        </span>
        <span>
          <bdi dir="ltr" style={{ color: "var(--admin-hazelnut)" }}>{totalCount - newCount}</bdi> {t("returning")}
        </span>
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────

export default function KPICard({ stat }: { stat: DashboardKpi }) {
  const { language, t } = useAdminLanguage();
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const current  = stat.values[period];
  const hasTrend = current.trend !== null;
  const isUp     = (current.trend ?? 0) >= 0;
  const trendColor = hasTrend ? (isUp ? "#8fcf9a" : "#e39a8c") : undefined;

  const hasExtra = !!(stat.sparkline || stat.breakdown || stat.customerSplit);

  return (
    <div className="admin-kpi-card flex flex-col gap-2.5 min-h-[150px]">

      {/* Header: label + period toggle */}
      <div className="flex items-center justify-between gap-2">
        <p className="admin-label">
          {t(stat.label)}
        </p>
        <div className="flex items-center gap-0.5 p-[3px] rounded-lg flex-shrink-0 admin-surface !shadow-none !border-0" style={{ background: "rgb(5 3 2 / 0.35)" }}>
          {PERIODS.map(({ key, label }) => {
            const active = period === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className="text-[10px] font-bold w-6 h-5 rounded-md flex items-center justify-center transition-all duration-150"
                style={
                  active
                    ? {
                        color: "var(--admin-button-text)",
                        background: "var(--admin-button)",
                        boxShadow: "0 2px 6px rgb(5 3 2 / 0.4)",
                      }
                    : { color: "var(--admin-faint)" }
                }
              >
                {language === "ar" ? t(label) : label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Value */}
      <div
        dir="ltr"
        className="inline-flex items-baseline gap-1.5"
      >
        <bdi
          dir="ltr"
          className="admin-value !text-[28px] leading-none"
        >
          <MixedNumeric text={current.formatted} />
        </bdi>
        <span className="text-[12px] admin-muted">
          {t(stat.unit)}
        </span>
      </div>

      {/* Trend */}
      <div className="flex items-center gap-1.5">
        {hasTrend && (
          <>
            {isUp
              ? <TrendingUp  size={11} style={{ color: trendColor }} />
              : <TrendingDown size={11} style={{ color: trendColor }} />
            }
            <bdi dir="ltr" className="text-[11px] font-semibold" style={{ color: trendColor }}>
              <MixedNumeric text={`${isUp ? "+" : ""}${current.trend?.toFixed(1)}%`} />
            </bdi>
          </>
        )}
        <span className="text-[11px] admin-faint">
          {t(current.trendLabel)}
        </span>
      </div>

      {/* Enrichment layer */}
      {hasExtra && (
        <div
          className="pt-2 mt-auto"
          style={{ borderTop: "1px solid var(--admin-border)" }}
        >
          {stat.sparkline && <Sparkline data={stat.sparkline} />}

          {stat.breakdown && (
            <OrdersStatusList items={stat.breakdown} />
          )}

          {stat.customerSplit && (
            <CustomerSplitBar
              newCount={stat.customerSplit.newCount}
              totalCount={stat.customerSplit.totalCount}
            />
          )}
        </div>
      )}
    </div>
  );
}

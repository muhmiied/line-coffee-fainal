"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  type KPIToggleStat,
  type KPIPeriod,
} from "@/lib/mock-data/admin/dashboard-mock";

const PERIODS: { key: KPIPeriod; label: string }[] = [
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
        stroke="var(--gold)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.2" fill="var(--gold)" />
    </svg>
  );
}


function OrdersStatusList({
  items,
}: {
  items: Array<{ label: string; count: number; color: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
      {items.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1.5 text-[11px]"
          style={{ color: "var(--cream-dim)" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: item.color }}
          />
          <span className="font-bold tabular-nums" style={{ color: item.color }}>{item.count}</span>
          <span style={{ opacity: 0.65 }}>{item.label}</span>
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
  const newPct = Math.round((newCount / totalCount) * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex rounded-full overflow-hidden h-[4px]">
        <div
          style={{ width: `${newPct}%`, background: "#4ade80" }}
        />
        <div
          style={{ width: `${100 - newPct}%`, background: "var(--gold)", opacity: 0.45 }}
        />
      </div>
      <div className="flex justify-between text-[10px]" style={{ color: "var(--cream-dim)" }}>
        <span>
          <span style={{ color: "#4ade80" }}>{newCount}</span> new
        </span>
        <span>
          <span style={{ color: "var(--gold)" }}>{totalCount - newCount}</span> returning
        </span>
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────

export default function KPICard({ stat }: { stat: KPIToggleStat }) {
  const [period, setPeriod] = useState<KPIPeriod>("today");
  const current  = stat.values[period];
  const hasTrend = current.trend !== null;
  const isUp     = (current.trend ?? 0) >= 0;
  const trendColor = hasTrend ? (isUp ? "#4ade80" : "#ef4444") : undefined;

  const hasExtra = !!(stat.sparkline || stat.breakdown || stat.customerSplit);

  return (
    <div className="admin-kpi-card flex flex-col gap-2.5 min-h-[145px]">

      {/* Header: label + period toggle */}
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "var(--cream-dim)" }}
        >
          {stat.label}
        </p>
        <div
          className="flex items-center gap-px p-[3px] rounded-md flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className="text-[10px] font-semibold w-6 h-5 rounded flex items-center justify-center transition-all duration-100"
              style={{
                color:      period === key ? "var(--gold)" : "var(--cream-dim)",
                background: period === key ? "rgba(182,136,94,0.18)" : "transparent",
                opacity:    period === key ? 1 : 0.55,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Value */}
      <div>
        <span
          className="text-[26px] font-bold leading-none tabular-nums"
          style={{ color: "var(--cream)" }}
        >
          {current.formatted}
        </span>
        <span
          className="ml-1.5 text-[12px]"
          style={{ color: "var(--cream-dim)" }}
        >
          {stat.unit}
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
            <span className="text-[11px] font-semibold" style={{ color: trendColor }}>
              {isUp ? "+" : ""}{current.trend?.toFixed(1)}%
            </span>
          </>
        )}
        <span
          className="text-[11px]"
          style={{ color: "var(--cream-dim)", opacity: 0.55 }}
        >
          {current.trendLabel}
        </span>
      </div>

      {/* Enrichment layer */}
      {hasExtra && (
        <div
          className="pt-2 mt-auto"
          style={{ borderTop: "1px solid rgba(182,136,94,0.07)" }}
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

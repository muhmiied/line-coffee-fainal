"use client";

import {
  TRAFFIC_DATA,
  TOP_PAGES,
  ACQUISITION_DATA,
  DEVICE_SPLIT,
  WEEKLY_SESSIONS,
  WEEKLY_LABELS,
  TOP_PRODUCTS_TRAFFIC,
} from "@/lib/mock-data/admin/analytics-mock";
import { TrendingUp, TrendingDown } from "lucide-react";

const SESSION_MAX = Math.max(...WEEKLY_SESSIONS);

function Trend({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className="flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: up ? "#4ade80" : "#ef4444" }}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? "+" : ""}{value}%
    </span>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
          Analytics
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>
          Last 30 days · updated daily
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Page Views",      metric: TRAFFIC_DATA.pageviews    },
          { label: "Sessions",        metric: TRAFFIC_DATA.sessions     },
          { label: "Bounce Rate",     metric: { ...TRAFFIC_DATA.bounceRate,    value: `${TRAFFIC_DATA.bounceRate.value}%` } },
          { label: "Avg. Duration",   metric: TRAFFIC_DATA.avgDuration  },
        ].map(({ label, metric }) => (
          <div key={label} className="admin-kpi-card py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
              {label}
            </p>
            <p className="text-[22px] font-bold" style={{ color: "var(--cream)" }}>
              {typeof metric.value === "number" ? metric.value.toLocaleString() : metric.value}
            </p>
            <div className="mt-1">
              <Trend value={metric.trend} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Weekly sessions sparkline */}
        <div className="admin-surface overflow-hidden">
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
              Sessions — This Week
            </p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-end gap-2 h-20">
              {WEEKLY_SESSIONS.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-sm"
                    style={{
                      height:     `${Math.round((v / SESSION_MAX) * 100)}%`,
                      background: "linear-gradient(to top, rgba(182,136,94,0.5), rgba(182,136,94,0.15))",
                    }}
                    title={`${v} sessions`}
                  />
                  <span className="text-[9px]" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>{WEEKLY_LABELS[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Acquisition channels */}
        <div className="admin-surface overflow-hidden">
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
              Acquisition Channels
            </p>
          </div>
          <div className="px-5 py-4 space-y-3">
            {ACQUISITION_DATA.map((ch) => (
              <div key={ch.channel}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px]" style={{ color: "var(--cream-dim)" }}>{ch.channel}</span>
                  <span className="text-[12px] font-semibold" style={{ color: ch.color }}>{ch.pct}%</span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${ch.pct}%`, background: ch.color, opacity: 0.7 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device split */}
        <div className="admin-surface overflow-hidden">
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
              Device Split
            </p>
          </div>
          <div className="px-5 py-4 space-y-4">
            {Object.entries(DEVICE_SPLIT).map(([device, { pct, color }]) => (
              <div key={device}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] capitalize" style={{ color: "var(--cream-dim)" }}>{device}</span>
                  <span className="text-[13px] font-bold" style={{ color }}>{pct}%</span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 5, background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, opacity: 0.65 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top pages */}
        <div className="admin-surface overflow-hidden">
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
              Top Pages
            </p>
          </div>
          <div>
            {TOP_PAGES.map((pg, i) => (
              <div
                key={pg.path}
                className="flex items-center gap-4 px-5 py-3 text-[12.5px]"
                style={i < TOP_PAGES.length - 1 ? { borderBottom: "1px solid rgba(182,136,94,0.05)" } : undefined}
              >
                <span className="text-[11px] font-bold tabular-nums w-5 text-right flex-shrink-0" style={{ color: "var(--gold)", opacity: 0.5 }}>
                  {i + 1}
                </span>
                <span className="flex-1 font-mono truncate" style={{ color: "var(--cream)", fontSize: 12 }}>{pg.path}</span>
                <span className="font-semibold tabular-nums" style={{ color: "var(--cream)" }}>{pg.views.toLocaleString()}</span>
                <span className="text-[11px] w-10 text-right" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>{pg.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="admin-surface overflow-hidden">
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
              Top Products by Traffic
            </p>
          </div>
          <div>
            {TOP_PRODUCTS_TRAFFIC.map((p, i) => (
              <div
                key={p.name}
                className="flex items-center gap-4 px-5 py-3.5"
                style={i < TOP_PRODUCTS_TRAFFIC.length - 1 ? { borderBottom: "1px solid rgba(182,136,94,0.05)" } : undefined}
              >
                <span className="text-[11px] font-bold tabular-nums w-5 flex-shrink-0 text-right" style={{ color: "var(--gold)", opacity: 0.5 }}>
                  {i + 1}
                </span>
                <span className="flex-1 text-[13px]" style={{ color: "var(--cream)" }}>{p.name}</span>
                <div className="text-right">
                  <p className="text-[12.5px] font-semibold" style={{ color: "var(--cream)" }}>{p.views} views</p>
                  <p className="text-[11px]" style={{ color: "var(--gold)", opacity: 0.7 }}>{p.addToCart} add-to-cart</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

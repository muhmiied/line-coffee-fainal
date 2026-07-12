"use client";

import { useEffect, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { DashboardSalesTrend } from "@/lib/admin/admin-dashboard";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";

type Period = "week" | "month" | "year";

interface TooltipPayload {
  value: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  const { t, currency } = useAdminLanguage();
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg text-sm"
      style={{
        background: "var(--admin-surface-2)",
        border: "1px solid var(--admin-border-strong)",
        boxShadow: "var(--admin-shadow), var(--admin-inset)",
      }}
    >
      <p className="text-[11px] mb-0.5 admin-muted">
        {label ? t(label) : label}
      </p>
      <p dir="ltr" className="text-[14px] font-semibold tabular-nums" style={{ color: "var(--admin-hazelnut)" }}>
        {payload[0].value.toLocaleString("en-EG")} {currency}
      </p>
    </div>
  );
}

const PERIOD_LABELS: Record<Period, string> = {
  week:  "Week",
  month: "Month",
  year:  "Year",
};

export default function SalesChart({ data: trend }: { data: DashboardSalesTrend }) {
  const { t } = useAdminLanguage();
  const [period, setPeriod] = useState<Period>("week");
  const [chartWidth, setChartWidth] = useState(0);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const data = trend[period];

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return;

    const setMeasuredWidth = () => {
      const measuredWidth = Math.floor(node.getBoundingClientRect().width);
      if (measuredWidth > 0) setChartWidth(measuredWidth);
    };

    setMeasuredWidth();

    const resizeObserver = new ResizeObserver((entries) => {
      const entryWidth = Math.floor(entries[0]?.contentRect.width ?? 0);
      if (entryWidth > 0) setChartWidth(entryWidth);
    });

    resizeObserver.observe(node);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="admin-surface p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-2">
        <p className="admin-card-title font-serif">
          {t("Sales Overview")}
        </p>

        {/* Period toggle */}
        <div className="admin-tabs !gap-0.5 !p-0.5 rounded-lg" style={{ background: "rgb(5 3 2 / 0.35)" }}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => {
            const active = p === period;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`admin-tab !px-3 !py-1 !text-[11.5px] !font-medium${active ? " admin-tab-active" : ""}`}
              >
                {t(PERIOD_LABELS[p])}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="min-w-0" style={{ width: "100%", height: 220, minHeight: 190 }}>
        {chartWidth > 0 ? (
          <AreaChart
            width={chartWidth}
            height={220}
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          >
            <defs>
              <linearGradient id="adminSalesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#c69974" stopOpacity={0.34} />
                <stop offset="95%" stopColor="#c69974" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(227,210,184,0.06)"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(214,187,159,0.72)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              dy={6}
              tickFormatter={(value: string) => t(value)}
            />

            <YAxis
              tick={{ fill: "rgba(214,187,159,0.5)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
              width={36}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: "rgba(198,153,116,0.28)",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke="#c69974"
              strokeWidth={2}
              fill="url(#adminSalesGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#e3d2b8", stroke: "#191309", strokeWidth: 2 }}
            />
          </AreaChart>
        ) : (
          <div
            aria-hidden="true"
            className="h-full rounded-lg"
            style={{ background: "rgba(255,255,255,0.018)" }}
          />
        )}
      </div>
    </div>
  );
}

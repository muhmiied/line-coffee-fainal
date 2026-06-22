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
import { SALES_DATA } from "@/lib/mock-data/admin/dashboard-mock";

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
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg text-sm"
      style={{
        background: "#1a1209",
        border: "1px solid rgba(182,136,94,0.20)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.40)",
      }}
    >
      <p className="text-[11px] mb-0.5" style={{ color: "var(--cream-dim)" }}>
        {label}
      </p>
      <p className="text-[14px] font-semibold tabular-nums" style={{ color: "var(--gold)" }}>
        {payload[0].value.toLocaleString("en-EG")} EGP
      </p>
    </div>
  );
}

const PERIOD_LABELS: Record<Period, string> = {
  week:  "Week",
  month: "Month",
  year:  "Year",
};

export default function SalesChart() {
  const [period, setPeriod] = useState<Period>("week");
  const [chartWidth, setChartWidth] = useState(0);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const data = SALES_DATA[period];

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
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}
        >
          Sales Overview
        </p>

        {/* Period toggle */}
        <div
          className="flex p-0.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1 rounded-md text-[11.5px] font-medium transition-all duration-150"
              style={{
                color:      p === period ? "var(--gold)" : "var(--cream-dim)",
                background: p === period ? "rgba(182,136,94,0.12)" : "transparent",
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
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
                <stop offset="5%"  stopColor="#b6885e" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#b6885e" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              tick={{ fill: "var(--cream-dim)", fontSize: 11, opacity: 0.7 }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />

            <YAxis
              tick={{ fill: "var(--cream-dim)", fontSize: 10, opacity: 0.5 }}
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
                stroke: "rgba(182,136,94,0.20)",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke="#b6885e"
              strokeWidth={2}
              fill="url(#adminSalesGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#d6a373", stroke: "#1a1209", strokeWidth: 2 }}
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

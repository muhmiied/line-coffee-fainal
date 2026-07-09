"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import {
  getAdminDashboard,
  type AdminDashboardData,
} from "@/lib/admin/admin-dashboard";
import WelcomeHero       from "@/components/admin/dashboard/WelcomeHero";
import KPICard           from "@/components/admin/dashboard/KPICard";
import LatestOrders      from "@/components/admin/dashboard/LatestOrders";

// Recharts is heavy (~100kb+). It lives only in SalesChart, so code-split it out
// of the dashboard bundle and load it on the client once the chart is rendered.
const SalesChart = dynamic(() => import("@/components/admin/dashboard/SalesChart"), {
  ssr: false,
  loading: () => (
    <div
      className="flex min-h-[290px] items-center justify-center rounded-2xl"
      style={{ border: "1px solid var(--gold-border)", color: "var(--cream-dim)", opacity: 0.5 }}
    >
      <Loader2 size={16} className="animate-spin" />
    </div>
  ),
});
import AlertsCenter      from "@/components/admin/dashboard/AlertsCenter";
import QuickActions      from "@/components/admin/dashboard/QuickActions";
import BestSellersMonth  from "@/components/admin/dashboard/BestSellersMonth";
import LatestReviewCard  from "@/components/admin/dashboard/LatestReviewCard";
import InventoryCard          from "@/components/admin/dashboard/InventoryCard";
import LowStockCard           from "@/components/admin/dashboard/LowStockCard";
import PreparingOrdersCard    from "@/components/admin/dashboard/PreparingOrdersCard";
import FulfillmentCard        from "@/components/admin/dashboard/FulfillmentCard";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAdminDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial + refresh data fetch
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 md:space-y-5">

      {/* Welcome hero */}
      <WelcomeHero stats={data?.heroStats ?? null} />

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
          <span className="flex items-center gap-2 text-[12.5px]" style={{ color: "#f87171" }}>
            <AlertTriangle size={14} /> {error}
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 text-[12px] font-medium"
            style={{ color: "var(--gold)" }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center gap-2 py-16"
          style={{ color: "var(--cream-dim)", opacity: 0.6 }}>
          <Loader2 size={16} className="animate-spin" /> Loading real dashboard data…
        </div>
      )}

      {data && (
        <>
          {/* 4 interactive KPI toggle cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.kpis.map((stat) => (
              <KPICard key={stat.label} stat={stat} />
            ))}
          </div>

          {/* 5 static special cards — 5-col grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <InventoryCard summary={data.inventory} />
            <div className="col-span-2">
              <LowStockCard items={data.lowStockItems} />
            </div>
            <PreparingOrdersCard data={data.preparing} />
            <FulfillmentCard data={data.fulfillment} />
          </div>

          {/* Sales chart (2/3) + Quick actions (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 min-h-[290px]">
              <SalesChart data={data.salesTrend} />
            </div>
            <div className="min-h-[290px]">
              <QuickActions />
            </div>
          </div>

          {/* Latest orders (1/2) + Alerts center (1/2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LatestOrders orders={data.latestOrders} />
            <AlertsCenter alerts={data.alerts} />
          </div>

          {/* Best sellers (2/3) + Latest review (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <BestSellersMonth products={data.bestSellers} />
            </div>
            <LatestReviewCard review={data.latestReview} />
          </div>
        </>
      )}
    </div>
  );
}

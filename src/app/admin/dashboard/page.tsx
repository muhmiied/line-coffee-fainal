import { KPI_TOGGLE_STATS } from "@/lib/mock-data/admin/dashboard-mock";
import WelcomeHero       from "@/components/admin/dashboard/WelcomeHero";
import KPICard           from "@/components/admin/dashboard/KPICard";
import SalesChart        from "@/components/admin/dashboard/SalesChart";
import LatestOrders      from "@/components/admin/dashboard/LatestOrders";
import AlertsCenter      from "@/components/admin/dashboard/AlertsCenter";
import QuickActions      from "@/components/admin/dashboard/QuickActions";
import BestSellersMonth  from "@/components/admin/dashboard/BestSellersMonth";
import LatestReviewCard  from "@/components/admin/dashboard/LatestReviewCard";
import InventoryCard          from "@/components/admin/dashboard/InventoryCard";
import LowStockCard           from "@/components/admin/dashboard/LowStockCard";
import PreparingOrdersCard    from "@/components/admin/dashboard/PreparingOrdersCard";
import VisitorsCard           from "@/components/admin/dashboard/VisitorsCard";

export default function AdminDashboardPage() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-4 md:space-y-5">

      {/* Welcome hero */}
      <WelcomeHero />

      {/* 4 interactive KPI toggle cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPI_TOGGLE_STATS.map((stat) => (
          <KPICard key={stat.label} stat={stat} />
        ))}
      </div>

      {/* 5 static special cards — 5-col grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <InventoryCard />
        <div className="col-span-2">
          <LowStockCard />
        </div>
        <PreparingOrdersCard />
        <VisitorsCard />
      </div>

      {/* Sales chart (2/3) + Quick actions (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-h-[290px]">
          <SalesChart />
        </div>
        <div className="min-h-[290px]">
          <QuickActions />
        </div>
      </div>

      {/* Latest orders (1/2) + Alerts center (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LatestOrders />
        <AlertsCenter />
      </div>

      {/* Best sellers (2/3) + Latest review (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <BestSellersMonth />
        </div>
        <LatestReviewCard />
      </div>

    </div>
  );
}

import Link from "next/link";
import { Clock, ArrowRight, AlertTriangle } from "lucide-react";
import { PREPARING_ORDERS_DATA } from "@/lib/mock-data/admin/dashboard-mock";

export default function PreparingOrdersCard() {
  const { total, overdue, overdueIds } = PREPARING_ORDERS_DATA;

  return (
    <div className="admin-kpi-card flex flex-col gap-2.5 min-h-[130px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--cream-dim)" }}>
          Preparing Orders
        </p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(96,165,250,0.10)" }}>
          <Clock size={14} style={{ color: "#60a5fa" }} />
        </div>
      </div>

      {/* Value */}
      <div className="flex items-end gap-3 flex-1">
        <div>
          <span className="text-[26px] font-bold leading-none tabular-nums" style={{ color: "var(--cream)" }}>
            {total}
          </span>
          <span className="ml-1.5 text-[12px]" style={{ color: "var(--cream-dim)" }}>orders</span>
        </div>
        {overdue > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-semibold mb-0.5" style={{ color: "#f59e0b" }}>
            <AlertTriangle size={10} />
            {overdue} overdue
          </span>
        )}
      </div>

      {/* Overdue IDs + link */}
      <div style={{ borderTop: "1px solid rgba(182,136,94,0.07)", paddingTop: 8 }}>
        <p className="text-[11px] leading-relaxed font-mono" style={{ color: "#f59e0b", opacity: 0.75 }}>
          {overdueIds.join(" · ")}
        </p>
        <Link
          href="/admin/orders"
          className="flex items-center gap-1 text-[11px] font-medium mt-1.5 hover:opacity-80 transition-opacity w-fit"
          style={{ color: "var(--gold)" }}
        >
          View orders <ArrowRight size={10} />
        </Link>
      </div>
    </div>
  );
}

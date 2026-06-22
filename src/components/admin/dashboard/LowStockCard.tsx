import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { LOW_STOCK_ITEMS } from "@/lib/mock-data/admin/dashboard-mock";

export default function LowStockCard() {
  return (
    <div className="admin-kpi-card flex flex-col gap-3 min-h-[130px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(239,68,68,0.12)" }}
          >
            <AlertTriangle size={14} style={{ color: "#ef4444" }} />
          </div>
          <p
            className="text-[11px] font-medium uppercase tracking-wider"
            style={{ color: "var(--cream-dim)" }}
          >
            Low Stock
          </p>
        </div>
        <Link
          href="/admin/inventory"
          className="text-[11px] font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--gold)" }}
        >
          Manage →
        </Link>
      </div>

      {/* Item list */}
      <div className="flex flex-col gap-2 flex-1">
        {LOW_STOCK_ITEMS.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between py-1.5 px-2.5 rounded-lg"
            style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.10)" }}
          >
            <p
              className="text-[12px] font-medium truncate"
              style={{ color: "var(--cream)" }}
            >
              {item.name}
            </p>
            <span
              className="text-[10.5px] font-bold ml-2 flex-shrink-0 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
            >
              {item.remaining}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

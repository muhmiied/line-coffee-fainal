import Link from "next/link";
import { Boxes, ArrowRight } from "lucide-react";
import { INVENTORY_SUMMARY } from "@/lib/mock-data/admin/inventory-mock";

export default function InventoryCard() {
  const { totalValue, finishedUnits: units, beanKg, lowStockCount } = INVENTORY_SUMMARY;

  return (
    <div className="admin-kpi-card flex flex-col gap-2.5 min-h-[130px]">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--cream-dim)" }}>
          Inventory Value
        </p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(182,136,94,0.10)" }}>
          <Boxes size={14} style={{ color: "var(--gold)" }} />
        </div>
      </div>

      <div className="flex-1">
        <span className="text-[26px] font-bold leading-none tabular-nums" style={{ color: "var(--cream)" }}>
          {Math.round(totalValue).toLocaleString()}
        </span>
        <span className="ml-1.5 text-[12px]" style={{ color: "var(--cream-dim)" }}>EGP</span>
      </div>

      <div style={{ borderTop: "1px solid rgba(182,136,94,0.07)", paddingTop: 8 }}>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>
          <span style={{ color: "var(--cream)" }}>{units}</span> finished units &middot;{" "}
          <span style={{ color: "var(--cream)" }}>{beanKg} kg</span> beans &middot;{" "}
          <span style={{ color: lowStockCount > 0 ? "#fbbf24" : "#4ade80" }}>{lowStockCount} low stock</span>
        </p>
        <Link
          href="/admin/inventory"
          className="flex items-center gap-1 text-[11px] font-medium mt-1.5 hover:opacity-80 transition-opacity w-fit"
          style={{ color: "var(--gold)" }}
        >
          Manage <ArrowRight size={10} />
        </Link>
      </div>
    </div>
  );
}

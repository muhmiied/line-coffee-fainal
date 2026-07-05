import Link from "next/link";
import { AlertTriangle, CheckCircle } from "lucide-react";
import type { DashboardLowStockItem } from "@/lib/admin/admin-dashboard";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";

export default function LowStockCard({ items }: { items: DashboardLowStockItem[] }) {
  const { dir, t } = useAdminLanguage();

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
            {t("Low Stock")}
          </p>
        </div>
        <Link
          href="/admin/inventory"
          className="text-[11px] font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--gold)" }}
        >
          {t("Manage")} <span aria-hidden="true">{dir === "rtl" ? "←" : "→"}</span>
        </Link>
      </div>

      {/* Item list / empty state */}
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
          <CheckCircle size={20} style={{ color: "#4ade80", opacity: 0.7 }} />
          <p className="text-[11.5px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>
            {t("All tracked stock above threshold")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 flex-1">
          {items.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between py-1.5 px-2.5 rounded-lg"
              style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.10)" }}
            >
              <p
                className="text-[12px] font-medium truncate"
                style={{ color: "var(--cream)" }}
              >
                <span data-admin-no-translate>{item.name}</span>
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
      )}
    </div>
  );
}

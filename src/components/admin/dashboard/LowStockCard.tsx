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
          <span className="admin-icon-chip admin-icon-chip-alert !w-7 !h-7 !rounded-lg">
            <AlertTriangle size={14} />
          </span>
          <p className="admin-label">
            {t("Low Stock")}
          </p>
        </div>
        <Link href="/admin/inventory" className="admin-link text-[11px]">
          {t("Manage")} <span aria-hidden="true">{dir === "rtl" ? "←" : "→"}</span>
        </Link>
      </div>

      {/* Item list / empty state */}
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
          <CheckCircle size={20} style={{ color: "#8fcf9a", opacity: 0.85 }} />
          <p className="text-[11.5px] admin-muted">
            {t("All tracked stock above threshold")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 flex-1">
          {items.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between py-1.5 px-2.5 rounded-lg"
              style={{ background: "rgba(227,154,140,0.06)", border: "1px solid rgba(227,154,140,0.20)" }}
            >
              <p className="text-[12px] font-medium truncate admin-text">
                <span data-admin-no-translate>{item.name}</span>
              </p>
              <span
                className="admin-badge !text-[10.5px] ml-2 flex-shrink-0"
                style={{ background: "rgba(227,154,140,0.16)", color: "#e39a8c" }}
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

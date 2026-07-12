import Link from "next/link";
import { Clock, ArrowRight, AlertTriangle } from "lucide-react";
import type { DashboardPreparing } from "@/lib/admin/admin-dashboard";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";

export default function PreparingOrdersCard({ data }: { data: DashboardPreparing }) {
  const { dir, t } = useAdminLanguage();
  const { total, overdue, overdueCodes } = data;

  return (
    <div className="admin-kpi-card flex flex-col gap-2.5 min-h-[130px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <p className="admin-label">
          {t("Preparing Orders")}
        </p>
        <span className="admin-icon-chip !w-7 !h-7 !rounded-lg" style={{ color: "#8fb0d9", background: "linear-gradient(150deg, rgb(143 176 217 / 0.22), rgb(66 32 12 / 0.30))" }}>
          <Clock size={14} />
        </span>
      </div>

      {/* Value */}
      <div className="flex items-end gap-3 flex-1">
        <div dir="ltr" className="inline-flex items-baseline gap-1.5">
          <bdi dir="ltr" className="admin-value !text-[28px] leading-none">
            {total}
          </bdi>
          <span className="text-[12px] admin-muted">{t("orders")}</span>
        </div>
        {overdue > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-semibold mb-0.5" style={{ color: "#e3b673" }}>
            <AlertTriangle size={10} />
            <bdi dir="ltr">{overdue}</bdi> {t("overdue")}
          </span>
        )}
      </div>

      {/* Overdue IDs + link */}
      <div style={{ borderTop: "1px solid var(--admin-border)", paddingTop: 8 }}>
        <p className="text-[11px] leading-relaxed font-mono" style={{ color: overdueCodes.length > 0 ? "#e3b673" : "var(--admin-muted)" }}>
          {overdueCodes.length > 0 ? overdueCodes.join(" · ") : t("None overdue")}
        </p>
        <Link href="/admin/orders" className="admin-link flex items-center gap-1 text-[11px] mt-1.5 w-fit">
          {t("View orders")} <ArrowRight size={10} className={dir === "rtl" ? "rotate-180" : undefined} />
        </Link>
      </div>
    </div>
  );
}

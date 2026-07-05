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
        <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--cream-dim)" }}>
          {t("Preparing Orders")}
        </p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(96,165,250,0.10)" }}>
          <Clock size={14} style={{ color: "#60a5fa" }} />
        </div>
      </div>

      {/* Value */}
      <div className="flex items-end gap-3 flex-1">
        <div dir="ltr" className="inline-flex items-baseline gap-1.5">
          <bdi dir="ltr" className="text-[26px] font-bold leading-none tabular-nums" style={{ color: "var(--cream)" }}>
            {total}
          </bdi>
          <span className="text-[12px]" style={{ color: "var(--cream-dim)" }}>{t("orders")}</span>
        </div>
        {overdue > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-semibold mb-0.5" style={{ color: "#f59e0b" }}>
            <AlertTriangle size={10} />
            <bdi dir="ltr">{overdue}</bdi> {t("overdue")}
          </span>
        )}
      </div>

      {/* Overdue IDs + link */}
      <div style={{ borderTop: "1px solid rgba(182,136,94,0.07)", paddingTop: 8 }}>
        <p className="text-[11px] leading-relaxed font-mono" style={{ color: overdueCodes.length > 0 ? "#f59e0b" : "var(--cream-dim)", opacity: 0.75 }}>
          {overdueCodes.length > 0 ? overdueCodes.join(" · ") : t("None overdue")}
        </p>
        <Link
          href="/admin/orders"
          className="flex items-center gap-1 text-[11px] font-medium mt-1.5 hover:opacity-80 transition-opacity w-fit"
          style={{ color: "var(--gold)" }}
        >
          {t("View orders")} <ArrowRight size={10} className={dir === "rtl" ? "rotate-180" : undefined} />
        </Link>
      </div>
    </div>
  );
}

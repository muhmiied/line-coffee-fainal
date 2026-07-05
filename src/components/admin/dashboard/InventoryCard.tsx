import Link from "next/link";
import { Boxes, ArrowRight } from "lucide-react";
import type { DashboardInventorySummary } from "@/lib/admin/admin-dashboard";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";

export default function InventoryCard({ summary }: { summary: DashboardInventorySummary }) {
  const { language, dir, t } = useAdminLanguage();
  const { onHandKg, reservedKg, lowStockCount, productsTracked } = summary;

  return (
    <div className="admin-kpi-card flex flex-col gap-2.5 min-h-[130px]">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--cream-dim)" }}>
          {t("Stock On Hand")}
        </p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(182,136,94,0.10)" }}>
          <Boxes size={14} style={{ color: "var(--gold)" }} />
        </div>
      </div>

      <div className="flex-1">
        <span dir="ltr" className="inline-flex items-baseline gap-1.5">
          <bdi dir="ltr" className="text-[26px] font-bold leading-none tabular-nums" style={{ color: "var(--cream)" }}>
            {onHandKg.toLocaleString("en-EG")}
          </bdi>
          <span className="text-[12px]" style={{ color: "var(--cream-dim)" }}>{t("kg available")}</span>
        </span>
      </div>

      <div style={{ borderTop: "1px solid rgba(182,136,94,0.07)", paddingTop: 8 }}>
        {language === "ar" ? (
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>
            <bdi dir="ltr" style={{ color: "var(--cream)" }}>{productsTracked}</bdi> منتج ·{" "}
            <bdi dir="ltr" style={{ color: "var(--cream)" }}>{reservedKg}</bdi> كجم محجوز ·{" "}
            <bdi dir="ltr" style={{ color: lowStockCount > 0 ? "#fbbf24" : "#4ade80" }}>{lowStockCount}</bdi> مخزون منخفض
          </p>
        ) : (
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>
            <span style={{ color: "var(--cream)" }}>{productsTracked}</span> products &middot;{" "}
            <span style={{ color: "var(--cream)" }}>{reservedKg} kg</span> reserved &middot;{" "}
            <span style={{ color: lowStockCount > 0 ? "#fbbf24" : "#4ade80" }}>{lowStockCount} low stock</span>
          </p>
        )}
        <Link
          href="/admin/inventory"
          className="flex items-center gap-1 text-[11px] font-medium mt-1.5 hover:opacity-80 transition-opacity w-fit"
          style={{ color: "var(--gold)" }}
        >
          {t("Manage")} <ArrowRight size={10} className={dir === "rtl" ? "rotate-180" : undefined} />
        </Link>
      </div>
    </div>
  );
}

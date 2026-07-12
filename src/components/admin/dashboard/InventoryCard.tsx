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
        <p className="admin-label">
          {t("Stock On Hand")}
        </p>
        <span className="admin-icon-chip !w-7 !h-7 !rounded-lg">
          <Boxes size={14} />
        </span>
      </div>

      <div className="flex-1">
        <span dir="ltr" className="inline-flex items-baseline gap-1.5">
          <bdi dir="ltr" className="admin-value !text-[28px] leading-none">
            {onHandKg.toLocaleString("en-EG")}
          </bdi>
          <span className="text-[12px] admin-muted">{t("kg available")}</span>
        </span>
      </div>

      <div style={{ borderTop: "1px solid var(--admin-border)", paddingTop: 8 }}>
        {language === "ar" ? (
          <p className="text-[11px] leading-relaxed admin-muted">
            <bdi dir="ltr" style={{ color: "var(--admin-white-coffee)" }}>{productsTracked}</bdi> منتج ·{" "}
            <bdi dir="ltr" style={{ color: "var(--admin-white-coffee)" }}>{reservedKg}</bdi> كجم محجوز ·{" "}
            <bdi dir="ltr" style={{ color: lowStockCount > 0 ? "#e3b673" : "#8fcf9a" }}>{lowStockCount}</bdi> مخزون منخفض
          </p>
        ) : (
          <p className="text-[11px] leading-relaxed admin-muted">
            <span style={{ color: "var(--admin-white-coffee)" }}>{productsTracked}</span> products &middot;{" "}
            <span style={{ color: "var(--admin-white-coffee)" }}>{reservedKg} kg</span> reserved &middot;{" "}
            <span style={{ color: lowStockCount > 0 ? "#e3b673" : "#8fcf9a" }}>{lowStockCount} low stock</span>
          </p>
        )}
        <Link href="/admin/inventory" className="admin-link flex items-center gap-1 text-[11px] mt-1.5 w-fit">
          {t("Manage")} <ArrowRight size={10} className={dir === "rtl" ? "rotate-180" : undefined} />
        </Link>
      </div>
    </div>
  );
}

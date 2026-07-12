import { PackageCheck } from "lucide-react";
import type { DashboardFulfillment } from "@/lib/admin/admin-dashboard";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";

// Replaces the old mock "Visitors Today" card. There is no visitor/session
// tracking in the system (analytics is a separate, out-of-scope phase), so this
// card shows a real fulfillment breakdown derived from order statuses instead of
// a fabricated visitor count.
export default function FulfillmentCard({ data }: { data: DashboardFulfillment }) {
  const { t } = useAdminLanguage();
  const { delivered, cancelled, returned } = data;
  const lost = cancelled + returned;
  const total = delivered + lost;
  const deliveredPct = total > 0 ? Math.round((delivered / total) * 100) : 0;

  return (
    <div className="admin-kpi-card flex flex-col gap-3 min-h-[130px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <p className="admin-label">
          {t("Fulfillment")}
        </p>
        <span className="admin-icon-chip admin-icon-chip-success !w-7 !h-7 !rounded-lg">
          <PackageCheck size={15} />
        </span>
      </div>

      {/* Delivered total */}
      <div className="flex-1">
        <span dir="ltr" className="inline-flex items-baseline gap-1.5">
          <bdi dir="ltr" className="admin-value !text-[28px] leading-none">
            {delivered}
          </bdi>
          <span className="text-[12px] admin-muted">
            {t("delivered")}
          </span>
        </span>
      </div>

      {/* Split: delivered vs cancelled+returned */}
      <div className="flex flex-col gap-1.5">
        <div className="admin-progress-track flex h-[5px]">
          <div className="h-full" style={{ width: `${deliveredPct}%`, background: "linear-gradient(90deg, #6fb87e, #8fcf9a)" }} />
          <div className="h-full" style={{ width: `${100 - deliveredPct}%`, background: "#e39a8c", opacity: 0.7 }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] admin-muted">
            <bdi dir="ltr" className="font-semibold" style={{ color: "#8fcf9a" }}>{delivered}</bdi> {t("delivered")}
          </span>
          <span className="text-[11px] admin-muted">
            <bdi dir="ltr" className="font-semibold" style={{ color: "#e39a8c" }}>{lost}</bdi> {t("cancelled/returned")}
          </span>
        </div>
      </div>
    </div>
  );
}

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
        <p
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "var(--cream-dim)" }}
        >
          {t("Fulfillment")}
        </p>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(74,222,128,0.10)" }}
        >
          <PackageCheck size={15} style={{ color: "#4ade80" }} />
        </div>
      </div>

      {/* Delivered total */}
      <div className="flex-1">
        <span dir="ltr" className="inline-flex items-baseline gap-1.5">
          <bdi
            dir="ltr"
            className="text-[26px] font-bold leading-none tabular-nums"
            style={{ color: "var(--cream)" }}
          >
            {delivered}
          </bdi>
          <span className="text-[12px]" style={{ color: "var(--cream-dim)" }}>
            {t("delivered")}
          </span>
        </span>
      </div>

      {/* Split: delivered vs cancelled+returned */}
      <div className="flex flex-col gap-1.5">
        <div className="flex rounded-full overflow-hidden h-[5px]" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div style={{ width: `${deliveredPct}%`, background: "#4ade80" }} />
          <div style={{ width: `${100 - deliveredPct}%`, background: "#ef4444", opacity: 0.7 }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: "var(--cream-dim)" }}>
            <bdi dir="ltr" className="font-semibold" style={{ color: "#4ade80" }}>{delivered}</bdi> {t("delivered")}
          </span>
          <span className="text-[11px]" style={{ color: "var(--cream-dim)" }}>
            <bdi dir="ltr" className="font-semibold" style={{ color: "#ef4444" }}>{lost}</bdi> {t("cancelled/returned")}
          </span>
        </div>
      </div>
    </div>
  );
}

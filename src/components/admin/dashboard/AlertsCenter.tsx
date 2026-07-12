import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { DashboardAlert } from "@/lib/admin/admin-dashboard";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";

export default function AlertsCenter({ alerts }: { alerts: DashboardAlert[] }) {
  const { dir, t } = useAdminLanguage();
  const totalAlerts = alerts.reduce((sum, a) => sum + a.count, 0);

  return (
    <div className="admin-surface flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--admin-border)" }}
      >
        <div className="flex items-center gap-2">
          <p className="admin-card-title font-serif">
            {t("Alerts Center")}
          </p>
          {totalAlerts > 0 && (
            <span className="admin-badge admin-badge-danger !text-[10px]">
              {totalAlerts}
            </span>
          )}
        </div>
        <Link href="/admin/orders" className="admin-link flex items-center gap-1 text-[12px]">
          {t("Manage")}
          <ArrowRight size={12} className={dir === "rtl" ? "rotate-180" : undefined} />
        </Link>
      </div>

      {/* Alert rows */}
      {alerts.length === 0 ? (
        <div className="admin-empty-state m-4">
          <p className="text-[12.5px] admin-muted">{t("No active alerts")}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col divide-y" style={{ borderColor: "var(--admin-border)" }}>
          {alerts.map((alert) => (
            <Link
              key={alert.type}
              href={alert.href}
              className="flex items-start gap-3.5 px-5 py-4 transition-colors hover:bg-[rgb(227_210_184_/_0.035)] group"
            >
              {/* Color bar */}
              <div
                className="w-[3px] h-full rounded-full flex-shrink-0 mt-0.5 self-stretch"
                style={{ background: alert.color, minHeight: 36, boxShadow: `0 0 8px ${alert.color}55` }}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[12.5px] font-semibold admin-text">
                    {t(alert.label)}
                  </span>
                  <span
                    className="admin-badge !text-[11px]"
                    style={{ background: alert.bg, color: alert.color }}
                  >
                    {alert.count}
                  </span>
                </div>
                <p className="text-[11.5px] leading-relaxed truncate admin-muted">
                  {t(alert.detail)}
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight
                size={14}
                className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity admin-faint"
                transform={dir === "rtl" ? "rotate(180)" : undefined}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

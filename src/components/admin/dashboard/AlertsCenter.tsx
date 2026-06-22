import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { ALERTS_DATA } from "@/lib/mock-data/admin/dashboard-mock";

export default function AlertsCenter() {
  const totalAlerts = ALERTS_DATA.reduce((sum, a) => sum + a.count, 0);

  return (
    <div className="admin-surface flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}
      >
        <div className="flex items-center gap-2">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}
          >
            Alerts Center
          </p>
          {totalAlerts > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
            >
              {totalAlerts}
            </span>
          )}
        </div>
        <Link
          href="/admin/orders"
          className="flex items-center gap-1 text-[12px] font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--gold)" }}
        >
          Manage
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* Alert rows */}
      <div className="flex-1 flex flex-col divide-y" style={{ borderColor: "rgba(182,136,94,0.06)" }}>
        {ALERTS_DATA.map((alert) => (
          <Link
            key={alert.type}
            href={alert.href}
            className="flex items-start gap-3.5 px-5 py-4 transition-colors hover:bg-white/[0.02] group"
          >
            {/* Color bar */}
            <div
              className="w-[3px] h-full rounded-full flex-shrink-0 mt-0.5 self-stretch"
              style={{ background: alert.color, minHeight: 36 }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[12.5px] font-medium"
                  style={{ color: "var(--cream)" }}
                >
                  {alert.label}
                </span>
                <span
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 tabular-nums"
                  style={{ background: alert.bg, color: alert.color }}
                >
                  {alert.count}
                </span>
              </div>
              <p
                className="text-[11.5px] leading-relaxed truncate"
                style={{ color: "var(--cream-dim)", opacity: 0.6 }}
              >
                {alert.detail}
              </p>
            </div>

            {/* Arrow */}
            <ChevronRight
              size={14}
              className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity"
              style={{ color: "var(--cream-dim)" }}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

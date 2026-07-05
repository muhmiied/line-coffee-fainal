import Link from "next/link";
import { ArrowRight, ChevronRight, Package } from "lucide-react";
import type { OrderStatus } from "@/lib/types/order";
import type { DashboardLatestOrder } from "@/lib/admin/admin-dashboard";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";
import type { AdminLanguage } from "@/lib/admin/admin-i18n";

const STATUS_STYLE: Record<OrderStatus, { bg: string; color: string; label: string }> = {
  pending:   { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24", label: "Pending" },
  preparing: { bg: "rgba(96,165,250,0.12)",  color: "#60a5fa", label: "Preparing" },
  shipped:   { bg: "rgba(167,139,250,0.12)", color: "#a78bfa", label: "Shipped" },
  delivered: { bg: "rgba(74,222,128,0.12)",  color: "#4ade80", label: "Delivered" },
  cancelled: { bg: "rgba(239,68,68,0.12)",   color: "#ef4444", label: "Cancelled" },
  returned:  { bg: "rgba(156,163,175,0.12)", color: "#9ca3af", label: "Returned" },
};

function relativeTime(iso: string, language: AdminLanguage): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60_000);
  if (mins < 1) return language === "ar" ? "الآن" : "just now";
  if (mins < 60) return language === "ar" ? `منذ ${mins} د` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return language === "ar" ? `منذ ${hrs} س` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return language === "ar" ? `منذ ${days} ي` : `${days}d ago`;
  return new Date(iso).toLocaleDateString(language === "ar" ? "ar-EG" : "en-EG", {
    month: "short",
    day: "numeric",
  });
}

export default function LatestOrders({ orders }: { orders: DashboardLatestOrder[] }) {
  const { language, dir, t, currency } = useAdminLanguage();

  return (
    <div className="admin-surface flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
          {t("Latest Orders")}
        </p>
        <Link
          href="/admin/orders"
          className="flex items-center gap-1 text-[12px] font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--gold)" }}
        >
          {t("View all")} <ArrowRight size={12} className={dir === "rtl" ? "rotate-180" : undefined} />
        </Link>
      </div>

      {/* Table / empty state */}
      {orders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-12">
          <Package size={26} style={{ color: "var(--cream-dim)", opacity: 0.25 }} />
          <p className="text-[12.5px]" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
            {t("No orders yet")}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(182,136,94,0.06)" }}>
                {["Order", "Customer", "Total", "Status", "Time", ""].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-2.5 text-left font-medium uppercase tracking-wider text-[10px]"
                    style={{ color: "var(--cream-dim)", opacity: 0.55 }}
                  >
                    {t(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => {
                const s = STATUS_STYLE[order.status];
                const isLast = i === orders.length - 1;
                return (
                  <tr
                    key={order.id}
                    className="transition-colors hover:bg-white/[0.03] group"
                    style={!isLast ? { borderBottom: "1px solid rgba(182,136,94,0.05)" } : undefined}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-[11.5px]" style={{ color: "var(--gold)" }}>
                        #{order.code}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--cream)" }} data-admin-no-translate>
                      {order.customer}
                    </td>
                    <td dir="ltr" className="px-4 py-3 tabular-nums" style={{ color: "var(--cream)" }}>
                      {order.total.toLocaleString("en-EG")} {currency}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ background: s.bg, color: s.color }}
                      >
                        {t(s.label)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>
                      {relativeTime(order.placedAt, language)}
                    </td>
                    <td className="pr-4 py-3 w-8">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="flex items-center justify-center w-6 h-6 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                        style={{ color: "var(--gold)" }}
                        title={language === "ar" ? `عرض الطلب رقم ${order.code}` : `View order #${order.code}`}
                      >
                        <ChevronRight size={13} className={dir === "rtl" ? "rotate-180" : undefined} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {orders.length > 0 && (
        <div className="px-5 py-3 text-center" style={{ borderTop: "1px solid rgba(182,136,94,0.06)" }}>
          <p className="text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
            {language === "ar"
              ? <>عرض أحدث <bdi dir="ltr">{orders.length}</bdi> طلب · مرّر المؤشر على الصف لعرض التفاصيل</>
              : <>Showing the {orders.length} most recent order{orders.length === 1 ? "" : "s"} · hover a row to view details</>}
          </p>
        </div>
      )}
    </div>
  );
}

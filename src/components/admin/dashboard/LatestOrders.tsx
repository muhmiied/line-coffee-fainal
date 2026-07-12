import Link from "next/link";
import { ArrowRight, ChevronRight, Package } from "lucide-react";
import type { OrderStatus } from "@/lib/types/order";
import type { DashboardLatestOrder } from "@/lib/admin/admin-dashboard";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";
import type { AdminLanguage } from "@/lib/admin/admin-i18n";
import { ORDER_STATUS_STYLE } from "@/components/admin/orders/OrderStatusBadge";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
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
        style={{ borderBottom: "1px solid var(--admin-border)" }}
      >
        <p className="admin-card-title font-serif">
          {t("Latest Orders")}
        </p>
        <Link href="/admin/orders" className="admin-link flex items-center gap-1 text-[12px]">
          {t("View all")} <ArrowRight size={12} className={dir === "rtl" ? "rotate-180" : undefined} />
        </Link>
      </div>

      {/* Table / empty state */}
      {orders.length === 0 ? (
        <div className="admin-empty-state m-4">
          <span className="admin-empty-icon"><Package size={22} /></span>
          <p className="text-[12.5px] admin-muted">
            {t("No orders yet")}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                {["Order", "Customer", "Total", "Status", "Time", ""].map((h, i) => (
                  <th key={i}>
                    {t(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const s = ORDER_STATUS_STYLE[order.status];
                return (
                  <tr key={order.id} className="group">
                    <td>
                      <span className="font-mono font-semibold text-[11.5px]" style={{ color: "var(--admin-hazelnut)" }}>
                        #{order.code}
                      </span>
                    </td>
                    <td className="admin-td-strong" data-admin-no-translate>
                      {order.customer}
                    </td>
                    <td dir="ltr" className="admin-table-numeric admin-td-strong">
                      {order.total.toLocaleString("en-EG")} {currency}
                    </td>
                    <td>
                      <span
                        className="admin-badge"
                        style={{ background: s.background, color: s.color, borderColor: s.border }}
                      >
                        {t(STATUS_LABEL[order.status])}
                      </span>
                    </td>
                    <td className="whitespace-nowrap admin-muted">
                      {relativeTime(order.placedAt, language)}
                    </td>
                    <td className="pr-4 w-8">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="flex items-center justify-center w-6 h-6 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[rgb(227_210_184_/_0.08)]"
                        style={{ color: "var(--admin-hazelnut)" }}
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
        <div className="px-5 py-3 text-center" style={{ borderTop: "1px solid var(--admin-border)" }}>
          <p className="text-[11px] admin-faint">
            {language === "ar"
              ? <>عرض أحدث <bdi dir="ltr">{orders.length}</bdi> طلب · مرّر المؤشر على الصف لعرض التفاصيل</>
              : <>Showing the {orders.length} most recent order{orders.length === 1 ? "" : "s"} · hover a row to view details</>}
          </p>
        </div>
      )}
    </div>
  );
}

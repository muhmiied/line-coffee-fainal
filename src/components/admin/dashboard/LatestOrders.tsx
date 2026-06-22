import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { LATEST_ORDERS, type OrderStatus } from "@/lib/mock-data/admin/dashboard-mock";

const STATUS_STYLE: Record<OrderStatus, { bg: string; color: string }> = {
  New:       { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
  Preparing: { bg: "rgba(96,165,250,0.12)",  color: "#60a5fa" },
  Shipped:   { bg: "rgba(167,139,250,0.12)", color: "#a78bfa" },
  Delivered: { bg: "rgba(74,222,128,0.12)",  color: "#4ade80" },
  Cancelled: { bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
  Returned:  { bg: "rgba(156,163,175,0.12)", color: "#9ca3af" },
};

export default function LatestOrders() {
  return (
    <div className="admin-surface flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
          Latest Orders
        </p>
        <Link
          href="/admin/orders"
          className="flex items-center gap-1 text-[12px] font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--gold)" }}
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {/* Table */}
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
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LATEST_ORDERS.map((order, i) => {
              const s      = STATUS_STYLE[order.status];
              const isLast = i === LATEST_ORDERS.length - 1;
              return (
                <tr
                  key={order.id}
                  className="transition-colors hover:bg-white/[0.03] group"
                  style={!isLast ? { borderBottom: "1px solid rgba(182,136,94,0.05)" } : undefined}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium text-[11.5px]" style={{ color: "var(--gold)" }}>
                      #{order.id}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--cream)" }}>
                    {order.customer}
                  </td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "var(--cream)" }}>
                    {order.total.toLocaleString("en-EG")} EGP
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>
                    {order.time}
                  </td>
                  <td className="pr-4 py-3 w-8">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="flex items-center justify-center w-6 h-6 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                      style={{ color: "var(--gold)" }}
                      title={`View order #${order.id}`}
                    >
                      <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 text-center" style={{ borderTop: "1px solid rgba(182,136,94,0.06)" }}>
        <p className="text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
          Showing {LATEST_ORDERS.length} of today&apos;s orders · hover a row to view details
        </p>
      </div>
    </div>
  );
}

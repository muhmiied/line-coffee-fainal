"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Package,
  Search,
  Truck,
} from "lucide-react";
import OrderDrawer from "@/components/admin/orders/OrderDrawer";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import {
  ADMIN_ORDER_STATUS_LABELS,
  ADMIN_PAYMENT_METHOD_LABELS,
  ADMIN_PAYMENT_STATUS_LABELS,
  getAdminOrders,
  type AdminOrderDetail,
  type AdminOrderStatus,
  type AdminOrderSummary,
} from "@/lib/admin/admin-orders";

type StatusFilter = AdminOrderStatus | "all";

const STATUS_FILTERS: StatusFilter[] = [
  "all",
  "pending",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-EG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paymentTone(status: string) {
  if (status === "paid") return "#4ade80";
  if (status === "failed") return "#f87171";
  if (status === "refunded") return "#c4b5a7";
  return "#fbbf24";
}

function KpiCard({
  label,
  value,
  active,
  color,
  Icon,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  color: string;
  Icon: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border p-3 text-left transition-all"
      style={{
        borderColor: active ? color : "rgba(182,136,94,0.12)",
        background: `${color}0D`,
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#D6B79A]/45">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <span className="text-2xl font-extrabold" style={{ color }}>
        {value}
      </span>
    </button>
  );
}

function OrderRow({
  order,
  onOpen,
}: {
  order: AdminOrderSummary;
  onOpen: (id: string) => void;
}) {
  const paymentColor = paymentTone(order.paymentStatus);
  return (
    <>
      <div className="hidden grid-cols-[110px_1.35fr_1fr_60px_105px_120px_100px_105px_90px] items-center gap-3 border-b border-[#B6885E]/[0.06] px-4 py-3 text-xs last:border-b-0 lg:grid">
        <span className="font-mono font-bold text-[#D6A373]">{order.code}</span>
        <div className="min-w-0">
          <p className="truncate font-medium text-[#F5E6D8]/85">{order.customerName}</p>
          <p className="truncate text-[10px] text-[#D6B79A]/38">{order.customerEmail || "Guest checkout"}</p>
        </div>
        <span className="truncate font-mono text-[11px] text-[#D6B79A]/55">
          {order.customerPhone || "—"}
        </span>
        <span className="text-[#D6B79A]/60">{order.itemCount}</span>
        <span className="font-semibold text-[#F5E6D8]/82">
          {order.total.toLocaleString()} EGP
        </span>
        <div>
          <p className="truncate text-[11px] font-semibold" style={{ color: paymentColor }}>
            {ADMIN_PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
          </p>
          <p className="text-[10px] text-[#D6B79A]/40">
            {ADMIN_PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
        <span className="text-[10.5px] text-[#D6B79A]/42">{formatDate(order.placedAt)}</span>
        <button
          type="button"
          onClick={() => onOpen(order.id)}
          className="flex items-center justify-center gap-1 rounded-lg border border-[#B6885E]/18 bg-[#D6A373]/8 px-2 py-1.5 font-semibold text-[#D6A373]"
        >
          Manage <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onOpen(order.id)}
        className="w-full border-b border-[#B6885E]/[0.06] px-4 py-3 text-left last:border-b-0 lg:hidden"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm font-bold text-[#D6A373]">{order.code}</p>
            <p className="mt-1 text-sm font-medium text-[#F5E6D8]/85">{order.customerName}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-[#D6B79A]/48">
          <span>{order.itemCount} items · {formatDate(order.placedAt)}</span>
          <span className="font-semibold text-[#F5E6D8]/80">
            {order.total.toLocaleString()} EGP
          </span>
        </div>
      </button>
    </>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAdminOrders()
      .then((nextOrders) => {
        if (cancelled) return;
        setOrders(nextOrders);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Could not load orders.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const searchFiltered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) =>
      [
        order.code,
        order.customerName,
        order.customerEmail,
        order.customerPhone,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [orders, search]);

  const filtered = useMemo(
    () =>
      searchFiltered.filter(
        (order) => activeStatus === "all" || order.status === activeStatus,
      ),
    [activeStatus, searchFiltered],
  );

  const counts = useMemo(() => {
    const next: Record<StatusFilter, number> = {
      all: searchFiltered.length,
      pending: 0,
      preparing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    };
    searchFiltered.forEach((order) => {
      next[order.status] += 1;
    });
    return next;
  }, [searchFiltered]);

  function handleOrderUpdated(order: AdminOrderDetail) {
    setOrders((current) =>
      current.map((item) =>
        item.id === order.id
          ? {
              ...item,
              status: order.status,
              paymentStatus: order.paymentStatus,
              paymentMethod: order.paymentMethod,
              itemCount: order.itemCount,
            }
          : item,
      ),
    );
  }

  const kpis = [
    { filter: "all" as const, label: "Total Orders", Icon: Package, color: "#D6A373" },
    { filter: "pending" as const, label: "Pending", Icon: Clock, color: "#fbbf24" },
    { filter: "preparing" as const, label: "Preparing", Icon: Package, color: "#60a5fa" },
    { filter: "shipped" as const, label: "Shipped", Icon: Truck, color: "#a78bfa" },
    { filter: "delivered" as const, label: "Delivered", Icon: CheckCircle2, color: "#4ade80" },
    { filter: "cancelled" as const, label: "Cancelled", Icon: AlertTriangle, color: "#f87171" },
  ];

  return (
    <>
      <div className="space-y-5">
        <header>
          <h1 className="font-serif text-xl font-bold text-[#F5E6D8]">Orders</h1>
          <p className="mt-1 text-sm text-[#D6B79A]/52">
            {orders.length} real Supabase orders
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map(({ filter, label, Icon, color }) => (
            <KpiCard
              key={filter}
              label={label}
              value={counts[filter]}
              Icon={Icon}
              color={color}
              active={activeStatus === filter}
              onClick={() => setActiveStatus(filter)}
            />
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#D6B79A]/35" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by order code, customer, email, or phone…"
            className="w-full rounded-xl border border-[#B6885E]/12 bg-white/[0.025] py-2.5 pl-9 pr-4 text-sm text-[#F5E6D8] outline-none placeholder:text-[#D6B79A]/28 focus:border-[#D6A373]/30"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveStatus(status)}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                color: activeStatus === status ? "#D6A373" : "rgba(214,183,154,.55)",
                borderColor:
                  activeStatus === status
                    ? "rgba(214,163,115,.3)"
                    : "rgba(182,136,94,.1)",
                background:
                  activeStatus === status ? "rgba(214,163,115,.08)" : "transparent",
              }}
            >
              {status === "all" ? "All" : ADMIN_ORDER_STATUS_LABELS[status]}{" "}
              <span className="ml-1 opacity-60">{counts[status]}</span>
            </button>
          ))}
        </div>

        <section className="overflow-hidden rounded-xl border border-[#B6885E]/10">
          <div className="hidden grid-cols-[110px_1.35fr_1fr_60px_105px_120px_100px_105px_90px] gap-3 border-b border-[#B6885E]/10 bg-[#D6A373]/[0.025] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#D6B79A]/42 lg:grid">
            <span>Order</span><span>Customer</span><span>Phone</span><span>Items</span>
            <span>Total</span><span>Payment</span><span>Status</span><span>Date</span><span>Action</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#D6B79A]/50">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
            </div>
          ) : loadError ? (
            <div className="px-5 py-12 text-center text-sm text-red-300">{loadError}</div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[#D6B79A]/40">
              No real orders match these filters.
            </div>
          ) : (
            filtered.map((order) => (
              <OrderRow key={order.id} order={order} onOpen={setOpenOrderId} />
            ))
          )}
        </section>
      </div>

      <OrderDrawer
        key={openOrderId ?? "closed"}
        orderId={openOrderId}
        isOpen={openOrderId !== null}
        onClose={() => setOpenOrderId(null)}
        onOrderUpdated={handleOrderUpdated}
      />
    </>
  );
}

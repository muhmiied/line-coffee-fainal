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
  if (status === "paid") return "#8fcf9a";
  if (status === "failed") return "#e39a8c";
  if (status === "refunded") return "#c4b5a7";
  return "#e3b673";
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
      className="admin-card text-left !p-3"
      style={{
        borderColor: active ? `${color}80` : undefined,
        boxShadow: active
          ? `var(--admin-inset), var(--admin-shadow), 0 0 0 1px ${color}40, 0 0 18px ${color}25`
          : undefined,
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="admin-label !text-[9px]">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <span className="text-2xl font-extrabold tabular-nums" style={{ color }}>
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
      <div className="hidden grid-cols-[110px_1.35fr_1fr_60px_105px_120px_100px_105px_90px] items-center gap-3 px-4 py-3 text-xs transition-colors hover:bg-[rgb(227_210_184_/_0.035)] lg:grid" style={{ borderBottom: "1px solid var(--admin-border)" }}>
        <span className="font-mono font-bold" style={{ color: "var(--admin-hazelnut)" }}>{order.code}</span>
        <div className="min-w-0">
          <p className="truncate font-medium admin-text">{order.customerName}</p>
          <p className="truncate text-[10px] admin-faint">{order.customerEmail || "Guest checkout"}</p>
        </div>
        <span className="truncate font-mono text-[11px] admin-faint">
          {order.customerPhone || "—"}
        </span>
        <span className="admin-muted">{order.itemCount}</span>
        <span className="font-semibold admin-text">
          {order.total.toLocaleString()} EGP
        </span>
        <div>
          <p className="truncate text-[11px] font-semibold" style={{ color: paymentColor }}>
            {ADMIN_PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
          </p>
          <p className="text-[10px] admin-faint">
            {ADMIN_PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
        <span className="text-[10.5px] admin-faint">{formatDate(order.placedAt)}</span>
        <button
          type="button"
          onClick={() => onOpen(order.id)}
          className="admin-btn admin-btn-sm flex items-center justify-center gap-1"
          style={{ color: "var(--admin-hazelnut)" }}
        >
          Manage <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onOpen(order.id)}
        className="w-full px-4 py-3 text-left transition-colors hover:bg-[rgb(227_210_184_/_0.035)] lg:hidden"
        style={{ borderBottom: "1px solid var(--admin-border)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm font-bold" style={{ color: "var(--admin-hazelnut)" }}>{order.code}</p>
            <p className="mt-1 text-sm font-medium admin-text">{order.customerName}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs admin-faint">
          <span>{order.itemCount} items · {formatDate(order.placedAt)}</span>
          <span className="font-semibold admin-text">
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
    { filter: "all" as const, label: "Total Orders", Icon: Package, color: "var(--admin-hazelnut)" },
    { filter: "pending" as const, label: "Pending", Icon: Clock, color: "#e3b673" },
    { filter: "preparing" as const, label: "Preparing", Icon: Package, color: "#8fb0d9" },
    { filter: "shipped" as const, label: "Shipped", Icon: Truck, color: "#b79bd9" },
    { filter: "delivered" as const, label: "Delivered", Icon: CheckCircle2, color: "#8fcf9a" },
    { filter: "cancelled" as const, label: "Cancelled", Icon: AlertTriangle, color: "#e39a8c" },
  ];

  return (
    <>
      <div className="space-y-5">
        <header>
          <h1 className="admin-page-title">Orders</h1>
          <p className="admin-page-subtitle">
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
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-faint" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by order code, customer, email, or phone…"
            className="admin-input w-full !py-2.5 !pl-9 !pr-4 !rounded-xl !text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveStatus(status)}
              className={`admin-chip${activeStatus === status ? " admin-chip-active" : ""}`}
            >
              {status === "all" ? "All" : ADMIN_ORDER_STATUS_LABELS[status]}{" "}
              <span className="ml-1 opacity-60">{counts[status]}</span>
            </button>
          ))}
        </div>

        <section className="admin-table-wrap">
          <div className="hidden grid-cols-[110px_1.35fr_1fr_60px_105px_120px_100px_105px_90px] gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider admin-faint lg:grid" style={{ borderBottom: "1px solid var(--admin-border)", background: "rgb(227 210 184 / 0.035)" }}>
            <span>Order</span><span>Customer</span><span>Phone</span><span>Items</span>
            <span>Total</span><span>Payment</span><span>Status</span><span>Date</span><span>Action</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm admin-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
            </div>
          ) : loadError ? (
            <div className="px-5 py-12 text-center text-sm" style={{ color: "#e39a8c" }}>{loadError}</div>
          ) : filtered.length === 0 ? (
            <div className="admin-empty-state !border-0 !rounded-none">
              <span className="admin-empty-icon"><Package size={22} /></span>
              <p className="text-sm admin-muted">No real orders match these filters.</p>
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

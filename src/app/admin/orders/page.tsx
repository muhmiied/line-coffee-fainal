"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
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
  getAdminOrdersPage,
  type AdminOrderStatus,
  type AdminOrderSummary,
} from "@/lib/admin/admin-orders";

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 300;

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
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<AdminOrderStatus, number>>({
    pending: 0, preparing: 0, shipped: 0, delivered: 0, cancelled: 0, returned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  // Debounce the search box so every keystroke doesn't fire a request. Page
  // resets to 1 here too (inside the timer callback, not a synchronous effect
  // body) — otherwise a narrower search could land on a page beyond its own
  // new result count.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function selectStatus(status: StatusFilter) {
    setActiveStatus(status);
    setPage(1);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminOrdersPage({
        search: debouncedSearch || undefined,
        status: activeStatus === "all" ? null : activeStatus,
        page,
        pageSize: PAGE_SIZE,
      });
      setOrders(result.rows);
      setTotalCount(result.totalCount);
      setStatusCounts(result.statusCounts);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, activeStatus, page]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch driven by filter/page state
  useEffect(() => { void load(); }, [load]);

  const searchMatchedTotal = useMemo(
    () => Object.values(statusCounts).reduce((sum, n) => sum + n, 0),
    [statusCounts],
  );
  const counts: Record<StatusFilter, number> = { all: searchMatchedTotal, ...statusCounts };
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function handleOrderUpdated() {
    // A status/payment change can shift which page/filter this order now
    // belongs to (e.g. it may no longer match the active status chip), so
    // re-run the same paginated query rather than patching stale local state.
    void load();
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
            {totalCount} real Supabase order{totalCount === 1 ? "" : "s"}
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
              onClick={() => selectStatus(filter)}
            />
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-faint" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by order code, customer, email, or phone…"
            className="admin-input w-full !py-2.5 !pl-9 !pr-4 !rounded-xl !text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => selectStatus(status)}
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
          ) : orders.length === 0 ? (
            <div className="admin-empty-state !border-0 !rounded-none">
              <span className="admin-empty-icon"><Package size={22} /></span>
              <p className="text-sm admin-muted">No real orders match these filters.</p>
            </div>
          ) : (
            orders.map((order) => (
              <OrderRow key={order.id} order={order} onOpen={setOpenOrderId} />
            ))
          )}
        </section>

        {!loading && !loadError && totalCount > 0 && (
          <div className="flex items-center justify-between gap-3 px-1 text-xs">
            <span className="admin-faint">
              Page {page} of {totalPages} · {totalCount} matching order{totalCount === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="admin-btn admin-btn-sm flex items-center gap-1"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-sm flex items-center gap-1"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
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

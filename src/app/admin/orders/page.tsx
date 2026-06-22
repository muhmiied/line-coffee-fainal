"use client";

import { useState, useMemo } from "react";
import {
  Search, Download,
  Package, Bell, Clock, Truck, CheckCircle2, AlertTriangle,
  ChevronRight,
} from "lucide-react";
import {
  ADMIN_ORDERS, type AdminOrder, type OrderStatus,
} from "@/lib/mock-data/admin/orders-mock";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import OrderDrawer      from "@/components/admin/orders/OrderDrawer";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_TABS: (OrderStatus | "All")[] = [
  "All", "New", "Preparing", "Shipped", "Delivered", "Cancelled", "Returned",
];

const PAYMENT_COLOR: Record<string, string> = {
  "Paid":    "#4ade80",
  "Pending": "#fbbf24",
  "Refunded":"#9ca3af",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  "cash":     "Cash",
  "instapay": "InstaPay",
  "e-wallet": "E-Wallet",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Table column layout ───────────────────────────────────────────────────────

const TABLE_COLS = "90px 1.5fr 1.1fr 55px 100px 105px 95px 100px 130px";

function TableHeader() {
  return (
    <div
      className="hidden lg:grid gap-3 px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider"
      style={{
        gridTemplateColumns: TABLE_COLS,
        background: "rgba(182,136,94,0.04)",
        borderBottom: "1px solid rgba(182,136,94,0.08)",
        color: "var(--cream-dim)",
      }}
    >
      <span>Order #</span>
      <span>Customer</span>
      <span>Phone</span>
      <span>Items</span>
      <span>Total</span>
      <span>Payment</span>
      <span>Status</span>
      <span>Date</span>
      <span>Actions</span>
    </div>
  );
}

function TableRow({ order, isLast, onOpen }: { order: AdminOrder; isLast: boolean; onOpen: (id: string) => void }) {
  return (
    <div style={!isLast ? { borderBottom: "1px solid rgba(182,136,94,0.06)" } : undefined}>
      {/* Desktop row */}
      <div
        className="hidden lg:grid items-center gap-3 px-4 py-3 hover:bg-white/[0.015] transition-colors"
        style={{ gridTemplateColumns: TABLE_COLS }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 800, fontFamily: "monospace", color: "var(--gold)" }}>
          {order.id}
        </span>

        <div className="min-w-0">
          <p style={{ fontSize: 12.5, fontWeight: 500, color: "var(--cream)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {order.customer.name}
          </p>
          <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.44, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {order.customer.email}
          </p>
        </div>

        <div style={{ fontSize: 11.5, fontFamily: "monospace", color: "var(--cream-dim)", opacity: 0.6 }}>
          {order.customer.phone}
        </div>

        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cream-dim)", opacity: 0.7 }}>
          {order.items.reduce((s, i) => s + i.qty, 0)}
        </span>

        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cream)" }}>
          {order.total.toLocaleString()}
          <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 2, color: "var(--cream-dim)", opacity: 0.45 }}>EGP</span>
        </span>

        <div>
          <span style={{
            fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 99,
            background: `${PAYMENT_COLOR[order.paymentStatus]}15`,
            color: PAYMENT_COLOR[order.paymentStatus],
            display: "inline-block",
          }}>
            {PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}
          </span>
          <p style={{ fontSize: 10, color: PAYMENT_COLOR[order.paymentStatus], opacity: 0.55, marginTop: 2 }}>
            {order.paymentStatus}
          </p>
        </div>

        <OrderStatusBadge status={order.status} />

        <span style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.44 }}>
          {fmtDate(order.date)}
        </span>

        <button
          type="button"
          onClick={() => onOpen(order.id)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "5px 10px", borderRadius: 7, fontSize: 11.5, fontWeight: 600,
            background: "rgba(182,136,94,0.10)", color: "var(--gold)",
            border: "1px solid rgba(182,136,94,0.2)",
          }}
        >
          Manage <ChevronRight size={11} />
        </button>
      </div>

      {/* Mobile card */}
      <div
        className="lg:hidden px-4 py-3 hover:bg-white/[0.015] transition-colors cursor-pointer"
        onClick={() => onOpen(order.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(order.id); }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "monospace", color: "var(--gold)" }}>{order.id}</span>
          <OrderStatusBadge status={order.status} />
        </div>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--cream)" }}>{order.customer.name}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.45 }}>
            {order.items.reduce((s, i) => s + i.qty, 0)} items · {fmtDate(order.date)}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--cream)" }}>{order.total.toLocaleString()} EGP</span>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, Icon, color, bg, border, active, onClick,
}: {
  label: string; value: number;
  Icon: React.ElementType;
  color: string; bg: string; border: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: bg, borderRadius: 12, padding: "12px 14px", textAlign: "left",
        border: `1px solid ${active ? color : border}`,
        boxShadow: active ? `0 0 0 1px ${color}30` : "none",
        transform: active ? "scale(1.01)" : "scale(1)",
        transition: "all 0.15s",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--cream-dim)", opacity: 0.44 }}>
          {label}
        </span>
        <Icon size={13} style={{ color, opacity: 0.65 }} />
      </div>
      <span style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [activeStatus,    setActiveStatus]    = useState<OrderStatus | "All">("All");
  const [search,          setSearch]          = useState("");
  const [openOrderId,     setOpenOrderId]     = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, OrderStatus>>({});

  // Apply status overrides
  const allOrders = useMemo(
    () => ADMIN_ORDERS.map((o) => statusOverrides[o.id] ? { ...o, status: statusOverrides[o.id] as OrderStatus } : o),
    [statusOverrides],
  );

  // Search-filtered (ignores status tab — used for KPIs and tab counts)
  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allOrders;
    return allOrders.filter((o) =>
      o.id.toLowerCase().includes(q) ||
      o.customer.name.toLowerCase().includes(q) ||
      o.customer.email.toLowerCase().includes(q) ||
      o.customer.phone.includes(q),
    );
  }, [allOrders, search]);

  // KPI counts
  const kpis = useMemo(() => ({
    total:     searchFiltered.length,
    new:       searchFiltered.filter((o) => o.status === "New").length,
    preparing: searchFiltered.filter((o) => o.status === "Preparing").length,
    shipped:   searchFiltered.filter((o) => o.status === "Shipped").length,
    delivered: searchFiltered.filter((o) => o.status === "Delivered").length,
    issues:    searchFiltered.filter((o) => o.status === "Cancelled" || o.status === "Returned").length,
  }), [searchFiltered]);

  // Table rows (search + status tab)
  const filtered = useMemo(
    () => searchFiltered.filter((o) => activeStatus === "All" || o.status === activeStatus),
    [searchFiltered, activeStatus],
  );

  // Tab counts
  const tabCounts = useMemo(() => {
    const m: Record<string, number> = { All: searchFiltered.length };
    for (const o of searchFiltered) m[o.status] = (m[o.status] ?? 0) + 1;
    return m;
  }, [searchFiltered]);

  const openOrder = useMemo(
    () => (openOrderId ? allOrders.find((o) => o.id === openOrderId) ?? null : null),
    [openOrderId, allOrders],
  );

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    setStatusOverrides((prev) => ({ ...prev, [orderId]: status }));
  };

  const todayRevenue = allOrders
    .filter((o) => o.date.startsWith("2026-06-20") && o.status !== "Cancelled" && o.status !== "Returned")
    .reduce((s, o) => s + o.total, 0);

  // ── KPI config ────────────────────────────────────────────────────────────────

  const KPI_ITEMS = [
    { label: "Total Orders", value: kpis.total,     Icon: Package,      color: "var(--gold)", bg: "rgba(182,136,94,0.08)", border: "rgba(182,136,94,0.18)", filter: "All"       as OrderStatus | "All" },
    { label: "New",          value: kpis.new,       Icon: Bell,         color: "#fbbf24",     bg: "rgba(251,191,36,0.07)", border: "rgba(251,191,36,0.18)", filter: "New"       as OrderStatus | "All" },
    { label: "Preparing",    value: kpis.preparing, Icon: Clock,        color: "#60a5fa",     bg: "rgba(96,165,250,0.07)", border: "rgba(96,165,250,0.18)", filter: "Preparing" as OrderStatus | "All" },
    { label: "Shipped",      value: kpis.shipped,   Icon: Truck,        color: "#a78bfa",     bg: "rgba(167,139,250,0.07)",border: "rgba(167,139,250,0.18)",filter: "Shipped"   as OrderStatus | "All" },
    { label: "Delivered",    value: kpis.delivered, Icon: CheckCircle2, color: "#4ade80",     bg: "rgba(74,222,128,0.07)", border: "rgba(74,222,128,0.18)", filter: "Delivered" as OrderStatus | "All" },
    { label: "Issues",       value: kpis.issues,    Icon: AlertTriangle,color: "#f87171",     bg: "rgba(239,68,68,0.07)",  border: "rgba(239,68,68,0.18)",  filter: "Cancelled" as OrderStatus | "All" },
  ] as const;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-5">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>Orders</h1>
            <p style={{ fontSize: 13, color: "var(--cream-dim)", opacity: 0.56, marginTop: 3 }}>
              {ADMIN_ORDERS.length} total &middot; Today&apos;s revenue:{" "}
              <span style={{ color: "var(--gold)" }}>{todayRevenue.toLocaleString()} EGP</span>
            </p>
          </div>
          <button
            type="button"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 500,
              color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.15)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <Download size={13} /> Export
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {KPI_ITEMS.map(({ label, value, Icon, color, bg, border, filter }) => (
            <KpiCard
              key={label}
              label={label} value={value} Icon={Icon}
              color={color} bg={bg} border={border}
              active={activeStatus === filter}
              onClick={() => setActiveStatus(filter)}
            />
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--cream-dim)", opacity: 0.38, pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search by order #, name, email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
              borderRadius: 10, fontSize: 13, outline: "none",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(182,136,94,0.12)",
              color: "var(--cream)",
            }}
          />
        </div>

        {/* Status tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {STATUS_TABS.map((s) => {
            const active = activeStatus === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setActiveStatus(s)}
                style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                  display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                  background: active ? "rgba(182,136,94,0.14)" : "rgba(255,255,255,0.03)",
                  color:      active ? "var(--gold)"            : "var(--cream-dim)",
                  border:     active ? "1px solid rgba(182,136,94,0.28)" : "1px solid rgba(182,136,94,0.08)",
                }}
              >
                {s}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, minWidth: 18, textAlign: "center",
                  background: active ? "rgba(182,136,94,0.22)" : "rgba(255,255,255,0.07)",
                  color:      active ? "var(--gold)"            : "var(--cream-dim)",
                }}>
                  {tabCounts[s] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(182,136,94,0.10)" }}>
          <TableHeader />
          {filtered.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--cream-dim)", opacity: 0.35 }}>
              <p style={{ fontSize: 13 }}>No orders match your filters</p>
            </div>
          ) : (
            filtered.map((order, i) => (
              <TableRow key={order.id} order={order} isLast={i === filtered.length - 1} onOpen={setOpenOrderId} />
            ))
          )}
        </div>

      </div>

      {/* Drawer */}
      <OrderDrawer
        order={openOrder}
        isOpen={openOrderId !== null}
        onClose={() => setOpenOrderId(null)}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}

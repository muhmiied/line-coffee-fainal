"use client";

import { useState, useEffect } from "react";
import { X, MessageCircle, CheckCircle2 } from "lucide-react";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import {
  type AdminOrder, type OrderStatus,
  buildTimeline, generateWhatsAppMessage,
} from "@/lib/mock-data/admin/orders-mock";

// ── Palettes ───────────────────────────────────────────────────────────────────

const STATUS_PALETTE: Record<OrderStatus, { color: string; bg: string; border: string }> = {
  New:       { color: "#fbbf24", bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.28)" },
  Preparing: { color: "#60a5fa", bg: "rgba(96,165,250,0.10)",  border: "rgba(96,165,250,0.28)" },
  Shipped:   { color: "#a78bfa", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.28)" },
  Delivered: { color: "#4ade80", bg: "rgba(74,222,128,0.10)",  border: "rgba(74,222,128,0.28)" },
  Cancelled: { color: "#f87171", bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.28)" },
  Returned:  { color: "#9ca3af", bg: "rgba(156,163,175,0.10)", border: "rgba(156,163,175,0.22)" },
};

const PAYMENT_LABEL: Record<string, string> = {
  "cash":     "Cash on Delivery",
  "instapay": "InstaPay",
  "e-wallet": "E-Wallet",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gold)", opacity: 0.55, marginBottom: 10 }}>
      {children}
    </p>
  );
}

function Hr() {
  return <div style={{ height: 1, background: "rgba(182,136,94,0.08)", margin: "16px 0" }} />;
}

function ItemAvatar({ name }: { name: string }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 7, flexShrink: 0,
      background: "rgba(182,136,94,0.12)", border: "1px solid rgba(182,136,94,0.15)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, fontWeight: 700, color: "var(--gold)",
    }}>
      {name[0]}
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

type ReturnCondition = "sealed" | "opened" | "damaged" | "not-received";
type ReturnItem = {
  returnedQty:   number;
  returnToStock: boolean;
  condition:     ReturnCondition;
};

type DrawerTab = "info" | "manage" | "whatsapp";

const TABS: Array<{ key: DrawerTab; label: string }> = [
  { key: "info",     label: "Info" },
  { key: "manage",   label: "Manage" },
  { key: "whatsapp", label: "WhatsApp" },
];

const FLOW = ["New", "Preparing", "Shipped", "Delivered"] as const;
type FlowStep = typeof FLOW[number];

interface OrderDrawerProps {
  order:          AdminOrder | null;
  isOpen:         boolean;
  onClose:        () => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function OrderDrawer({ order, isOpen, onClose, onStatusChange }: OrderDrawerProps) {
  const [tab,             setTab]             = useState<DrawerTab>("info");
  const [adminNotes,      setAdminNotes]      = useState("");
  const [notesSaved,      setNotesSaved]      = useState(false);
  const [editableMsg,     setEditableMsg]     = useState("");
  const [notifFeed,       setNotifFeed]       = useState<OrderStatus | null>(null);
  const [returnPanelOpen, setReturnPanelOpen] = useState(false);
  const [returnItems,     setReturnItems]     = useState<ReturnItem[]>([]);
  const [returnSummary,   setReturnSummary]   = useState<{ restoredCount: number; notRestoredCount: number } | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (order) setAdminNotes(order.adminNotes ?? ""); }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset message when order or status changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (order) setEditableMsg(generateWhatsAppMessage(order, order.status)); }, [order?.id, order?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (isOpen) { setTab("info"); setReturnPanelOpen(false); } }, [isOpen]);

  if (!order) {
    return (
      <>
        <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 100, opacity: 0, pointerEvents: "none" }} />
        <div style={{ position: "fixed", right: 0, top: 0, height: "100dvh", zIndex: 101, transform: "translateX(100%)", width: "clamp(340px,55vw,680px)" }} />
      </>
    );
  }

  // Status flow logic
  const flowIdx    = FLOW.indexOf(order.status as FlowStep);
  const isInFlow   = flowIdx >= 0;
  const nextStatus: OrderStatus | null = isInFlow && flowIdx < FLOW.length - 1 ? FLOW[flowIdx + 1] : null;
  const isTerminal = order.status === "Cancelled" || order.status === "Returned";
  const canCancel  = !["Cancelled", "Returned", "Delivered"].includes(order.status);
  const canReturn  = order.status === "Delivered";

  const waUrl    = `https://wa.me/${order.customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(editableMsg)}`;
  const timeline = buildTimeline(order, order.status);

  const handleStatusChange = (newStatus: OrderStatus) => {
    onStatusChange(order.id, newStatus);
    setNotifFeed(newStatus);
    setTimeout(() => setNotifFeed(null), 3000);
  };

  const openReturnPanel = () => {
    const initial: ReturnItem[] = order.items.map(() => ({
      returnedQty: 1,
      returnToStock: true,
      condition: "sealed" as ReturnCondition,
    }));
    setReturnItems(initial);
    setReturnPanelOpen(true);
  };

  const confirmReturn = () => {
    const restoredCount    = returnItems.filter(ri => ri.returnToStock && ri.condition === "sealed").reduce((s, ri) => s + ri.returnedQty, 0);
    const notRestoredCount = returnItems.filter(ri => !ri.returnToStock || ri.condition !== "sealed").reduce((s, ri) => s + ri.returnedQty, 0);
    setReturnSummary({ restoredCount, notRestoredCount });
    setReturnPanelOpen(false);
    onStatusChange(order.id, "Returned");
    setNotifFeed("Returned");
    setEditableMsg(generateWhatsAppMessage(order, "Returned"));
    setTimeout(() => setNotifFeed(null), 4000);
  };

  const saveNotes = () => {
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2200);
  };

  const fmtDt = (iso: string) =>
    new Date(iso).toLocaleString("en-EG", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // Compact address
  const addr = order.address;
  const addrLine = [
    addr.street,
    addr.building && `Bld. ${addr.building}`,
    addr.floor    && `Fl. ${addr.floor}`,
    addr.apt      && `Apt ${addr.apt}`,
  ].filter(Boolean).join(", ");
  const cityLine     = `${addr.city} · ${addr.governorate}`;
  const deliveryLine = `${order.deliveryMethod === "express" ? "Express" : "Standard"} · ${order.deliveryFee === 0 ? "Free" : `${order.deliveryFee} EGP`}`;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.45)", backdropFilter: "blur(1px)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Order ${order.id}`}
        style={{
          position: "fixed", right: 0, top: 0, height: "100dvh",
          width: "clamp(340px,55vw,680px)", zIndex: 101,
          background: "var(--coffee-deep)",
          borderLeft: "1px solid rgba(182,136,94,0.14)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.32s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* ── Sticky header ── */}
        <div style={{ flexShrink: 0, padding: "14px 18px 0", borderBottom: "1px solid rgba(182,136,94,0.09)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 17, fontWeight: 800, fontFamily: "monospace", color: "var(--gold)" }}>
                  {order.id}
                </span>
                <OrderStatusBadge status={order.status} />
              </div>
              <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.35, marginTop: 4 }}>
                {fmtDt(order.date)} · {order.deliveryMethod === "express" ? "Express" : "Standard"}
              </p>
            </div>
            <button type="button" onClick={onClose} style={{ color: "var(--cream-dim)", opacity: 0.38, lineHeight: 0, flexShrink: 0, padding: 2, marginTop: 2 }}>
              <X size={15} />
            </button>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex" }}>
            {TABS.map(({ key, label }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  style={{
                    padding: "8px 14px", fontSize: 12.5,
                    fontWeight: active ? 700 : 500,
                    color: active ? "var(--gold)" : "var(--cream-dim)",
                    opacity: active ? 1 : 0.42,
                    borderBottom: active ? "2px solid var(--gold)" : "2px solid transparent",
                    transition: "all 0.15s", background: "transparent",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 18px 32px" }}>

          {/* ══ INFO TAB ══ */}
          {tab === "info" && (
            <>
              {/* Customer */}
              <SectionTitle>Customer</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {(
                  [
                    ["Name",  order.customer.name],
                    ["Phone", order.customer.phone],
                    ["Email", order.customer.email],
                    ["Type",  order.customer.type === "registered"
                      ? `Registered · ${order.customer.previousOrders} orders`
                      : "Guest"],
                    ...(order.customer.since
                      ? [["Since", new Date(order.customer.since).toLocaleDateString("en-EG", { month: "long", year: "numeric" })]]
                      : []),
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.44, flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 12, color: "var(--cream)", textAlign: "right" }}>{value}</span>
                  </div>
                ))}
              </div>

              <Hr />

              {/* Compact delivery */}
              <SectionTitle>Delivery</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <p style={{ fontSize: 13, color: "var(--cream)", lineHeight: 1.5 }}>{addrLine}</p>
                <p style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.55 }}>{cityLine}</p>
                {addr.landmark && <p style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.38 }}>{addr.landmark}</p>}
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", marginTop: 3 }}>{deliveryLine}</p>
              </div>

              <Hr />

              {/* Items */}
              <SectionTitle>Order Items</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
                    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(182,136,94,0.09)",
                  }}>
                    <ItemAvatar name={item.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--cream)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
                      <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.46, marginTop: 2 }}>
                        {item.detail} · qty {item.qty} × {item.unitPrice.toLocaleString()} EGP
                      </p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", whiteSpace: "nowrap" }}>
                      {(item.unitPrice * item.qty).toLocaleString()} EGP
                    </span>
                  </div>
                ))}
              </div>

              {/* Custom Espresso */}
              {order.orderType === "make-your-espresso" && order.espressoData && (
                <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.15)" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#60a5fa", opacity: 0.65, marginBottom: 8 }}>
                    Espresso Blend
                  </p>
                  <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                    <div><p style={{ fontSize: 10, color: "var(--cream-dim)", opacity: 0.4 }}>Blend</p><p style={{ fontSize: 13, fontWeight: 600, color: "var(--cream)" }}>{order.espressoData.blendName}</p></div>
                    <div><p style={{ fontSize: 10, color: "var(--cream-dim)", opacity: 0.4 }}>Weight</p><p style={{ fontSize: 13, fontWeight: 600, color: "var(--cream)" }}>{order.espressoData.totalWeight}g</p></div>
                    <div><p style={{ fontSize: 10, color: "var(--cream-dim)", opacity: 0.4 }}>A / R</p><p style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}>{order.espressoData.arabicaPct}% / {order.espressoData.robustaPct}%</p></div>
                  </div>
                  {order.espressoData.beans.map((b, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                      <span style={{
                        fontSize: 8.5, fontWeight: 700, padding: "1px 5px", borderRadius: 99, flexShrink: 0,
                        background: b.beanType === "arabica" ? "rgba(182,136,94,0.18)" : "rgba(156,163,175,0.18)",
                        color: b.beanType === "arabica" ? "var(--gold)" : "#9ca3af",
                      }}>{b.beanType === "arabica" ? "A" : "R"}</span>
                      <span style={{ fontSize: 12, color: "var(--cream)", flex: 1 }}>{b.origin}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cream-dim)", minWidth: 30, textAlign: "right" }}>{b.pct}%</span>
                      <div style={{ width: 48, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden", flexShrink: 0 }}>
                        <div style={{ height: "100%", width: `${b.pct}%`, background: b.beanType === "arabica" ? "var(--gold)" : "#9ca3af", borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Flavor */}
              {order.orderType === "make-your-flavor" && order.flavorData && (
                <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.15)" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#a78bfa", opacity: 0.65, marginBottom: 8 }}>
                    Flavor Mix
                  </p>
                  <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                    <div><p style={{ fontSize: 10, color: "var(--cream-dim)", opacity: 0.4 }}>Base</p><p style={{ fontSize: 13, fontWeight: 600, color: "var(--cream)" }}>{order.flavorData.baseName}</p></div>
                    <div><p style={{ fontSize: 10, color: "var(--cream-dim)", opacity: 0.4 }}>Weight</p><p style={{ fontSize: 13, fontWeight: 600, color: "var(--cream)" }}>{order.flavorData.totalWeight}g</p></div>
                    <div><p style={{ fontSize: 10, color: "var(--cream-dim)", opacity: 0.4 }}>Flavors</p><p style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa" }}>{order.flavorData.flavors.length}</p></div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {order.flavorData.flavors.map((f) => (
                      <span key={f} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99, background: "rgba(167,139,250,0.14)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>{f}</span>
                    ))}
                  </div>
                </div>
              )}

              <Hr />

              {/* Financial */}
              <SectionTitle>Financial Summary</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.44 }}>Subtotal</span>
                  <span style={{ fontSize: 12, color: "var(--cream)" }}>{order.subtotal.toLocaleString()} EGP</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.44 }}>Delivery</span>
                  <span style={{ fontSize: 12, color: "var(--cream)" }}>{order.deliveryFee === 0 ? "Free" : `${order.deliveryFee} EGP`}</span>
                </div>
                {order.discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.44 }}>
                      Discount{order.promoCode ? ` (${order.promoCode})` : ""}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--gold)" }}>−{order.discount} EGP</span>
                  </div>
                )}
                <div style={{ borderTop: "1px solid rgba(182,136,94,0.1)", paddingTop: 8, marginTop: 3, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--cream)" }}>Total</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "var(--gold)" }}>{order.total.toLocaleString()} EGP</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.44 }}>Payment</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.68 }}>
                      {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                      background: order.paymentStatus === "Paid"    ? "rgba(74,222,128,0.14)"
                               : order.paymentStatus === "Refunded" ? "rgba(156,163,175,0.14)"
                               :                                       "rgba(251,191,36,0.14)",
                      color:      order.paymentStatus === "Paid"    ? "#4ade80"
                               : order.paymentStatus === "Refunded" ? "#9ca3af"
                               :                                       "#fbbf24",
                    }}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              <Hr />

              {/* Notes */}
              <SectionTitle>Notes</SectionTitle>
              {order.notes && (
                <div style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 10, background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.14)" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", opacity: 0.6, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Customer</p>
                  <p style={{ fontSize: 12.5, color: "var(--cream)", lineHeight: 1.55 }}>{order.notes}</p>
                </div>
              )}
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Admin notes (internal)…"
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 12.5, resize: "vertical",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(182,136,94,0.14)",
                  color: "var(--cream)", outline: "none",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                {notesSaved && <span style={{ fontSize: 11.5, color: "#4ade80" }}>✓ Saved</span>}
                <button
                  type="button"
                  onClick={saveNotes}
                  style={{ padding: "5px 14px", borderRadius: 7, fontSize: 12, fontWeight: 500, background: "rgba(182,136,94,0.10)", color: "var(--gold)", border: "1px solid rgba(182,136,94,0.2)" }}
                >
                  Save
                </button>
              </div>
            </>
          )}

          {/* ══ MANAGE TAB ══ */}
          {tab === "manage" && (
            <>
              {/* Flow bar */}
              <SectionTitle>Order Progress</SectionTitle>
              <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 20 }}>
                {FLOW.map((step, i) => {
                  const isPast    = isInFlow && flowIdx > i;
                  const isCurrent = isInFlow && flowIdx === i;
                  const dotColor  = isPast ? "#4ade80" : isCurrent ? "var(--gold)" : "rgba(255,255,255,0.10)";
                  return (
                    <div key={step} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                      {i > 0 && (
                        <div style={{
                          position: "absolute", left: 0, right: "50%", top: 9, height: 1,
                          background: isPast || isCurrent
                            ? (isPast ? "rgba(74,222,128,0.35)" : "rgba(182,136,94,0.3)")
                            : "rgba(255,255,255,0.07)",
                        }} />
                      )}
                      {i < FLOW.length - 1 && (
                        <div style={{
                          position: "absolute", left: "50%", right: 0, top: 9, height: 1,
                          background: isPast ? "rgba(74,222,128,0.35)" : "rgba(255,255,255,0.07)",
                        }} />
                      )}
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%", zIndex: 1, background: dotColor,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: isCurrent ? `0 0 0 3px ${dotColor}44` : "none",
                      }}>
                        {isPast
                          ? <CheckCircle2 size={9} color="#0b0806" />
                          : <span style={{ fontSize: 7, fontWeight: 800, color: isCurrent ? "#0b0806" : "rgba(255,255,255,0.28)" }}>{i + 1}</span>
                        }
                      </div>
                      <span style={{
                        fontSize: 8.5, fontWeight: 600, textTransform: "uppercase",
                        letterSpacing: "0.04em", marginTop: 5, textAlign: "center",
                        color: isPast ? "#4ade80" : isCurrent ? "var(--gold)" : "rgba(255,255,255,0.2)",
                      }}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Terminal banner */}
              {isTerminal && (
                <div style={{
                  padding: "10px 14px", borderRadius: 9, marginBottom: 14,
                  background: STATUS_PALETTE[order.status].bg,
                  border: `1px solid ${STATUS_PALETTE[order.status].border}`,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: STATUS_PALETTE[order.status].color }}>
                    Order {order.status}
                  </p>
                </div>
              )}

              {/* Primary: next step */}
              {nextStatus && (
                <button
                  type="button"
                  onClick={() => handleStatusChange(nextStatus)}
                  style={{
                    width: "100%", padding: "12px 0", borderRadius: 10, marginBottom: 10,
                    fontSize: 13.5, fontWeight: 700,
                    background: STATUS_PALETTE[nextStatus].bg,
                    color: STATUS_PALETTE[nextStatus].color,
                    border: `1px solid ${STATUS_PALETTE[nextStatus].border}`,
                  }}
                >
                  Move to: {nextStatus} →
                </button>
              )}

              {/* Destructive actions */}
              {(canCancel || canReturn) && (
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {canCancel && (
                    <button type="button" onClick={() => handleStatusChange("Cancelled")} style={{
                      flex: 1, padding: "8px 0", borderRadius: 9, fontSize: 12, fontWeight: 600,
                      background: "rgba(239,68,68,0.08)", color: "#f87171",
                      border: "1px solid rgba(239,68,68,0.22)",
                    }}>
                      Cancel Order
                    </button>
                  )}
                  {canReturn && (
                    <button type="button" onClick={openReturnPanel} style={{
                      flex: 1, padding: "8px 0", borderRadius: 9, fontSize: 12, fontWeight: 600,
                      background: "rgba(156,163,175,0.08)", color: "#9ca3af",
                      border: "1px solid rgba(156,163,175,0.18)",
                    }}>
                      Mark Returned…
                    </button>
                  )}
                </div>
              )}

              {/* Return panel (replaces normal flow when open) */}
              {returnPanelOpen && (
                <div style={{
                  borderRadius: 12, marginBottom: 14, overflow: "hidden",
                  border: "1px solid rgba(156,163,175,0.22)", background: "rgba(156,163,175,0.04)",
                }}>
                  {/* Panel header */}
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(156,163,175,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af" }}>Return Handling</p>
                    <button type="button" onClick={() => setReturnPanelOpen(false)} style={{ color: "var(--cream-dim)", opacity: 0.5, lineHeight: 0 }}>
                      <X size={13} />
                    </button>
                  </div>

                  {/* Per-item form */}
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {order.items.map((item, idx) => {
                      const ri = returnItems[idx];
                      if (!ri) return null;
                      const canRestock = ri.condition === "sealed";
                      return (
                        <div key={idx} style={{ padding: "10px 12px", borderRadius: 9, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(182,136,94,0.08)" }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--cream)", marginBottom: 2 }}>{item.name}</p>
                          {item.detail && <p style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.45, marginBottom: 8 }}>{item.detail}</p>}

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                            <div>
                              <p style={{ fontSize: 9.5, color: "var(--cream-dim)", opacity: 0.45, marginBottom: 3 }}>ORDERED</p>
                              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--cream)" }}>{item.qty}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: 9.5, color: "var(--cream-dim)", opacity: 0.45, marginBottom: 3 }}>RETURNING</p>
                              <input
                                type="number" min={0} max={item.qty} value={ri.returnedQty}
                                onChange={e => {
                                  const val = Math.min(item.qty, Math.max(0, parseInt(e.target.value) || 0));
                                  setReturnItems(prev => prev.map((r, i) => i === idx ? { ...r, returnedQty: val } : r));
                                }}
                                style={{ width: "100%", padding: "4px 8px", borderRadius: 6, fontSize: 13, fontWeight: 700, color: "var(--cream)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(182,136,94,0.14)", outline: "none" }}
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: 6 }}>
                            <p style={{ fontSize: 9.5, color: "var(--cream-dim)", opacity: 0.45, marginBottom: 3 }}>CONDITION</p>
                            <select
                              value={ri.condition}
                              style={{ width: "100%", padding: "5px 8px", borderRadius: 6, fontSize: 12, color: "var(--cream)", background: "#1b140f", border: "1px solid rgba(182,136,94,0.14)", outline: "none", colorScheme: "dark" }}
                              onChange={e => {
                                const cond = e.target.value as ReturnCondition;
                                const restock = cond === "sealed";
                                setReturnItems(prev => prev.map((r, i) => i === idx ? { ...r, condition: cond, returnToStock: restock } : r));
                              }}
                            >
                              <option value="sealed">Sealed / Resellable</option>
                              <option value="opened">Opened (no restock)</option>
                              <option value="damaged">Damaged (no restock)</option>
                              <option value="not-received">Not Received Back</option>
                            </select>
                          </div>

                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: canRestock ? "pointer" : "default", opacity: canRestock ? 1 : 0.35 }}>
                            <input
                              type="checkbox" checked={ri.returnToStock && canRestock}
                              disabled={!canRestock}
                              onChange={e => setReturnItems(prev => prev.map((r, i) => i === idx ? { ...r, returnToStock: e.target.checked } : r))}
                            />
                            <span style={{ fontSize: 11.5, color: canRestock && ri.returnToStock ? "#4ade80" : "var(--cream-dim)" }}>
                              {canRestock ? "Return to stock" : "Cannot restock (condition)"}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>

                  {/* Inventory movement preview */}
                  <div style={{ margin: "0 14px 10px", padding: "8px 12px", borderRadius: 8, background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.12)" }}>
                    <p style={{ fontSize: 9.5, fontWeight: 700, color: "#4ade80", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Inventory Movement Preview</p>
                    {(() => {
                      const toRestock    = returnItems.filter((ri, idx) => ri.returnToStock && ri.condition === "sealed" && ri.returnedQty > 0 && order.items[idx]);
                      const noRestock    = returnItems.filter((ri, idx) => (!ri.returnToStock || ri.condition !== "sealed") && ri.returnedQty > 0 && order.items[idx]);
                      return (
                        <>
                          {toRestock.length > 0
                            ? toRestock.map((ri, i) => (
                                <p key={i} style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.65 }}>
                                  ↑ +{ri.returnedQty} · {order.items[returnItems.indexOf(ri)]?.name ?? "Item"} — customer-return movement
                                </p>
                              ))
                            : <p style={{ fontSize: 11, color: "var(--cream-dim)", opacity: 0.38 }}>No items will be restocked.</p>
                          }
                          {noRestock.map((ri, i) => (
                            <p key={`no-${i}`} style={{ fontSize: 11, color: "#f87171", opacity: 0.55 }}>
                              ✗ {ri.returnedQty} · {order.items[returnItems.indexOf(ri)]?.name ?? "Item"} — {ri.condition}, no movement
                            </p>
                          ))}
                        </>
                      );
                    })()}
                    <p style={{ fontSize: 10, color: "var(--cream-dim)", opacity: 0.3, marginTop: 6 }}>
                      When backend is connected, these movements will be created automatically.
                    </p>
                  </div>

                  {/* Confirm / Cancel */}
                  <div style={{ padding: "0 14px 14px", display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => setReturnPanelOpen(false)} style={{
                      flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: "rgba(255,255,255,0.03)", color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.09)",
                    }}>
                      Cancel
                    </button>
                    <button type="button" onClick={confirmReturn} style={{
                      flex: 2, padding: "8px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                      background: "rgba(156,163,175,0.14)", color: "#9ca3af", border: "1px solid rgba(156,163,175,0.28)",
                    }}>
                      Confirm Return
                    </button>
                  </div>
                </div>
              )}

              {/* Notification feedback */}
              {notifFeed && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10, marginBottom: 14,
                  background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.18)",
                }}>
                  <p style={{ fontSize: 10.5, fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                    Updated → {notifFeed}
                  </p>
                  {notifFeed === "Returned" && returnSummary ? (
                    <>
                      {returnSummary.restoredCount > 0 && (
                        <p style={{ fontSize: 11.5, color: "#4ade80", opacity: 0.8 }}>✓ {returnSummary.restoredCount} unit(s) returned to stock</p>
                      )}
                      {returnSummary.notRestoredCount > 0 && (
                        <p style={{ fontSize: 11.5, color: "#f87171", opacity: 0.7 }}>✗ {returnSummary.notRestoredCount} unit(s) not restocked (condition)</p>
                      )}
                      {["✓ Customer order page updated", "✓ WhatsApp message updated"].map((l) => (
                        <p key={l} style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.58 }}>{l}</p>
                      ))}
                    </>
                  ) : (
                    ["✓ Customer notification created", "✓ Customer order page updated", "✓ WhatsApp message generated"].map((l) => (
                      <p key={l} style={{ fontSize: 11.5, color: "var(--cream-dim)", opacity: 0.58 }}>{l}</p>
                    ))
                  )}
                </div>
              )}

              <Hr />

              {/* Timeline */}
              <SectionTitle>Status Timeline</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {timeline.map((step, i) => {
                  const isLast   = i === timeline.length - 1;
                  const dotColor = step.terminal ? "#f87171" : step.done ? "#4ade80" : "rgba(255,255,255,0.12)";
                  return (
                    <div key={step.key} style={{ display: "flex", gap: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 18, flexShrink: 0 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%", background: dotColor, marginTop: 2,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: step.current && !step.terminal ? `0 0 0 3px ${dotColor}33` : "none",
                        }}>
                          {step.done && !step.terminal && <CheckCircle2 size={9} color="#0b0806" />}
                        </div>
                        {!isLast && (
                          <div style={{ width: 1, flex: 1, minHeight: 14, margin: "2px 0", background: step.done ? "rgba(74,222,128,0.18)" : "rgba(255,255,255,0.05)" }} />
                        )}
                      </div>
                      <div style={{ paddingBottom: isLast ? 0 : 12 }}>
                        <p style={{
                          fontSize: 12.5, fontWeight: step.current ? 700 : 500,
                          color: step.done ? "var(--cream)" : "var(--cream-dim)",
                          opacity: step.done ? 1 : 0.35,
                        }}>
                          {step.label}
                        </p>
                        {step.time && (
                          <p style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.32, marginTop: 1 }}>
                            {fmtDt(step.time)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ══ WHATSAPP TAB ══ */}
          {tab === "whatsapp" && (
            <>
              <SectionTitle>WhatsApp Notification</SectionTitle>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: "var(--cream-dim)", opacity: 0.45 }}>Message for:</span>
                <OrderStatusBadge status={order.status} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--cream-dim)", opacity: 0.38, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Message (editable)
                </p>
                <textarea
                  value={editableMsg}
                  onChange={(e) => setEditableMsg(e.target.value)}
                  rows={5}
                  dir="rtl"
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 13.5,
                    lineHeight: 1.65, resize: "vertical", textAlign: "right",
                    background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.15)",
                    color: "var(--cream)", outline: "none",
                  }}
                />
                <p style={{ fontSize: 10.5, color: "var(--cream-dim)", opacity: 0.28, marginTop: 4 }}>
                  To: {order.customer.phone}
                </p>
              </div>

              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px 0", borderRadius: 10, fontSize: 13.5, fontWeight: 700,
                  background: "rgba(74,222,128,0.14)", color: "#4ade80",
                  border: "1px solid rgba(74,222,128,0.3)", textDecoration: "none",
                }}
              >
                <MessageCircle size={15} />
                Send WhatsApp
              </a>
            </>
          )}

        </div>
      </div>
    </>
  );
}

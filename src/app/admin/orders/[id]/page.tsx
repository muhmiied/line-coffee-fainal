"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Phone, Mail, Package, Truck, ChevronDown, Check,
} from "lucide-react";
import { ADMIN_ORDERS, type OrderStatus } from "@/lib/mock-data/admin/orders-mock";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";

const STATUS_FLOW: OrderStatus[] = ["New", "Preparing", "Shipped", "Delivered"];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  New:       "Preparing",
  Preparing: "Shipped",
  Shipped:   "Delivered",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-EG", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getTimeline(status: OrderStatus, baseDate: string) {
  const base = new Date(baseDate).getTime();
  const steps = [
    { label: "Order Placed",    offset: 0 },
    { label: "Confirmed",       offset: 15 * 60000 },
    { label: "Being Prepared",  offset: 2 * 3600000 },
    { label: "Shipped",         offset: 6 * 3600000 },
    { label: "Delivered",       offset: 30 * 3600000 },
  ];
  const flowIndex = STATUS_FLOW.indexOf(status);
  // Cancelled / Returned are special
  const completedCount =
    status === "Cancelled" ? 1 :
    status === "Returned"  ? 5 :
    flowIndex + 1;

  return steps.map((step, i) => ({
    label: step.label,
    time: new Date(base + step.offset).toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" }),
    done: i < completedCount,
  }));
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const order = ADMIN_ORDERS.find((o) => o.id === id);

  const [status, setStatus]         = useState<OrderStatus>(order?.status ?? "New");
  const [dropOpen, setDropOpen]     = useState(false);
  const [justSaved, setJustSaved]   = useState(false);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-lg font-semibold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
          Order not found
        </p>
        <Link href="/admin/orders" className="text-sm" style={{ color: "var(--gold)" }}>
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const handleStatusChange = (s: OrderStatus) => {
    setStatus(s);
    setDropOpen(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const timeline = getTimeline(status, order.date);
  const nextStatus = NEXT_STATUS[status];

  return (
    <div className="space-y-5">

      {/* Breadcrumb + title */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--cream-dim)" }}
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}
            >
              {order.id}
            </h1>
            <OrderStatusBadge status={status} size="md" />
            <span className="text-[12px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>
              {formatDateTime(order.date)}
            </span>
          </div>
        </div>

        {/* Status controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {nextStatus && (
            <button
              type="button"
              onClick={() => handleStatusChange(nextStatus)}
              className="px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-colors"
              style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}
            >
              Mark as {nextStatus}
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropOpen((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors hover:bg-white/5"
              style={{ color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.15)" }}
            >
              Change status <ChevronDown size={13} className={dropOpen ? "rotate-180" : ""} />
            </button>
            {dropOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-44 rounded-xl overflow-hidden z-20"
                style={{ background: "#1a1209", border: "1px solid rgba(182,136,94,0.15)", boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}
              >
                {(["New","Preparing","Shipped","Delivered","Cancelled","Returned"] as OrderStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(s)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-[12.5px] hover:bg-white/5 transition-colors text-left"
                    style={{ color: s === status ? "var(--gold)" : "var(--cream-dim)" }}
                  >
                    {s}
                    {s === status && <Check size={12} style={{ color: "var(--gold)" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {justSaved && (
            <span className="text-[12px] flex items-center gap-1" style={{ color: "#4ade80" }}>
              <Check size={12} /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left — items + totals */}
        <div className="lg:col-span-2 space-y-5">

          {/* Items table */}
          <div className="admin-surface overflow-hidden">
            <div
              className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider"
              style={{ borderBottom: "1px solid rgba(182,136,94,0.08)", color: "var(--cream-dim)" }}
            >
              Order Items
            </div>
            <div>
              {order.items.map((item, i) => (
                <div
                  key={i}
                  className="grid items-center gap-4 px-5 py-4"
                  style={{
                    gridTemplateColumns: "2fr 1fr 1fr 1fr",
                    borderBottom: i < order.items.length - 1 ? "1px solid rgba(182,136,94,0.06)" : undefined,
                  }}
                >
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: "var(--cream)" }}>{item.name}</p>
                    <p className="text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>{item.detail}</p>
                  </div>
                  <span className="text-[12.5px]" style={{ color: "var(--cream-dim)" }}>
                    {item.unitPrice.toLocaleString()} EGP
                  </span>
                  <span className="text-[12.5px]" style={{ color: "var(--cream-dim)" }}>
                    ×{item.qty}
                  </span>
                  <span className="text-[13px] font-semibold text-right" style={{ color: "var(--cream)" }}>
                    {(item.unitPrice * item.qty).toLocaleString()} EGP
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div
              className="px-5 py-4 space-y-2"
              style={{ borderTop: "1px solid rgba(182,136,94,0.08)", background: "rgba(182,136,94,0.03)" }}
            >
              <div className="flex justify-between text-[12.5px]" style={{ color: "var(--cream-dim)" }}>
                <span>Subtotal</span>
                <span>{order.subtotal.toLocaleString()} EGP</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-[12.5px]" style={{ color: "var(--cream-dim)" }}>
                  <span>Delivery ({order.deliveryMethod === "express" ? "Express" : "Standard"})</span>
                  <span>{order.deliveryFee} EGP</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-[12.5px]" style={{ color: "#4ade80" }}>
                  <span>Discount {order.promoCode && `(${order.promoCode})`}</span>
                  <span>−{order.discount.toLocaleString()} EGP</span>
                </div>
              )}
              {order.deliveryFee === 0 && (
                <div className="flex justify-between text-[12.5px]" style={{ color: "#4ade80" }}>
                  <span>Delivery</span>
                  <span>Free</span>
                </div>
              )}
              <div
                className="flex justify-between font-bold pt-2"
                style={{ borderTop: "1px solid rgba(182,136,94,0.1)", color: "var(--cream)" }}
              >
                <span>Total</span>
                <span style={{ color: "var(--gold)" }}>{order.total.toLocaleString()} EGP</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div
              className="admin-surface px-5 py-4"
              style={{ borderLeft: "3px solid rgba(182,136,94,0.3)" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>
                Notes
              </p>
              <p className="text-[13px]" style={{ color: "var(--cream-dim)" }}>{order.notes}</p>
            </div>
          )}
        </div>

        {/* Right — customer + address + timeline */}
        <div className="space-y-4">

          {/* Customer */}
          <div className="admin-surface px-5 py-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>
              Customer
            </p>
            <div>
              <p className="text-[14px] font-semibold" style={{ color: "var(--cream)" }}>
                {order.customer.name}
              </p>
            </div>
            <div className="space-y-2">
              <a
                href={`mailto:${order.customer.email}`}
                className="flex items-center gap-2 text-[12.5px] hover:opacity-75 transition-opacity"
                style={{ color: "var(--cream-dim)" }}
              >
                <Mail size={13} style={{ color: "var(--gold)", opacity: 0.7 }} />
                {order.customer.email}
              </a>
              <a
                href={`tel:${order.customer.phone}`}
                className="flex items-center gap-2 text-[12.5px] hover:opacity-75 transition-opacity"
                style={{ color: "var(--cream-dim)" }}
              >
                <Phone size={13} style={{ color: "var(--gold)", opacity: 0.7 }} />
                {order.customer.phone}
              </a>
            </div>
          </div>

          {/* Delivery address */}
          <div className="admin-surface px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>
                Delivery Address
              </p>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: order.deliveryMethod === "express" ? "rgba(167,139,250,0.12)" : "rgba(182,136,94,0.1)",
                  color: order.deliveryMethod === "express" ? "#a78bfa" : "var(--gold)",
                }}
              >
                {order.deliveryMethod === "express" ? "Express" : "Standard"}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={13} className="mt-0.5 flex-shrink-0" style={{ color: "var(--gold)", opacity: 0.7 }} />
              <div className="text-[12.5px] space-y-0.5" style={{ color: "var(--cream-dim)" }}>
                <p>{order.address.governorate}, {order.address.city}</p>
                <p>{order.address.street}, Building {order.address.building}</p>
                {(order.address.floor || order.address.apt) && (
                  <p>
                    {order.address.floor && `Floor ${order.address.floor}`}
                    {order.address.floor && order.address.apt && " · "}
                    {order.address.apt && `Apt ${order.address.apt}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px solid rgba(182,136,94,0.06)" }}>
              <Truck size={12} style={{ color: "var(--cream-dim)", opacity: 0.4 }} />
              <span className="text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>
                {order.deliveryFee === 0 ? "Free delivery" : `Delivery fee: ${order.deliveryFee} EGP`}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="admin-surface px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Package size={13} style={{ color: "var(--gold)", opacity: 0.7 }} />
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.5 }}>
                Order Timeline
              </p>
            </div>
            <div className="relative pl-5">
              {timeline.map((step, i) => (
                <div key={i} className="relative pb-4 last:pb-0">
                  {/* Vertical line */}
                  {i < timeline.length - 1 && (
                    <div
                      className="absolute left-[-13px] top-[14px] w-px"
                      style={{
                        height: "calc(100% - 6px)",
                        background: step.done ? "rgba(182,136,94,0.35)" : "rgba(255,255,255,0.08)",
                      }}
                    />
                  )}
                  {/* Dot */}
                  <div
                    className="absolute left-[-18px] top-[2px] w-[10px] h-[10px] rounded-full border-2 flex items-center justify-center"
                    style={{
                      background:   step.done ? "var(--gold)"             : "transparent",
                      borderColor:  step.done ? "var(--gold)"             : "rgba(255,255,255,0.15)",
                    }}
                  />
                  <div>
                    <p
                      className="text-[12.5px] font-medium leading-tight"
                      style={{ color: step.done ? "var(--cream)" : "var(--cream-dim)", opacity: step.done ? 1 : 0.4 }}
                    >
                      {step.label}
                    </p>
                    {step.done && (
                      <p className="text-[10.5px] mt-0.5" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>
                        {step.time}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {(status === "Cancelled" || status === "Returned") && (
                <div className="relative pb-0 mt-1">
                  <div
                    className="absolute left-[-18px] top-[2px] w-[10px] h-[10px] rounded-full"
                    style={{ background: "#ef4444" }}
                  />
                  <p className="text-[12.5px] font-medium" style={{ color: "#ef4444" }}>
                    {status}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

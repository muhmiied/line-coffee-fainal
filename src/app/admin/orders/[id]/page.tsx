"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import OrderDetails from "@/components/admin/orders/OrderDetails";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import {
  ADMIN_ORDER_STATUS_LABELS,
  ALLOWED_ADMIN_ORDER_TRANSITIONS,
  getAdminOrderById,
  updateAdminOrderDeliveryFee,
  updateAdminOrderStatus,
  type AdminOrderDetail,
  type AdminOrderStatus,
} from "@/lib/admin/admin-orders";

const DELIVERY_OVERRIDABLE: AdminOrderStatus[] = ["pending", "preparing", "shipped"];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [updatingTo, setUpdatingTo] = useState<AdminOrderStatus | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [feeInput, setFeeInput] = useState<string | null>(null);
  const [feeNote, setFeeNote] = useState("");
  const [overridingFee, setOverridingFee] = useState(false);
  const [feeMessage, setFeeMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    void getAdminOrderById(orderId)
      .then((nextOrder) => {
        if (cancelled) return;
        setOrder(nextOrder);
        setLoadError(nextOrder ? null : "Order not found.");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Could not load order.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function changeStatus(nextStatus: AdminOrderStatus) {
    if (!order || updatingTo) return;
    setUpdatingTo(nextStatus);
    setActionMessage(null);
    try {
      await updateAdminOrderStatus(order.id, nextStatus, statusNote);
      const refreshed = await getAdminOrderById(order.id);
      if (!refreshed) throw new Error("Order not found after update.");
      setOrder(refreshed);
      setStatusNote("");
      setActionMessage(
        `Order moved to ${ADMIN_ORDER_STATUS_LABELS[refreshed.status]}.`,
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : "Could not update order status.",
      );
    } finally {
      setUpdatingTo(null);
    }
  }

  async function overrideDeliveryFee() {
    if (!order || overridingFee) return;
    const raw = feeInput ?? String(order.deliveryFee);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100000) {
      setFeeMessage("Enter a delivery fee between 0 and 100000 EGP.");
      return;
    }
    setOverridingFee(true);
    setFeeMessage(null);
    try {
      await updateAdminOrderDeliveryFee(order.id, parsed, feeNote.trim() || undefined);
      const refreshed = await getAdminOrderById(order.id);
      if (!refreshed) throw new Error("Order not found after update.");
      setOrder(refreshed);
      setFeeInput(null);
      setFeeNote("");
      setFeeMessage(
        `Delivery fee set to ${refreshed.deliveryFee.toLocaleString()} EGP · total ${refreshed.total.toLocaleString()} EGP.`,
      );
    } catch (error) {
      setFeeMessage(
        error instanceof Error ? error.message : "Could not update the delivery fee.",
      );
    } finally {
      setOverridingFee(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#D6B79A]/55">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading real order…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="font-serif text-lg font-semibold text-[#F5E6D8]">
          {loadError ?? "Order not found."}
        </p>
        <Link href="/admin/orders" className="text-sm font-semibold text-[#D6A373]">
          Back to Orders
        </Link>
      </div>
    );
  }

  const transitions = ALLOWED_ADMIN_ORDER_TRANSITIONS[order.status];

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="rounded-lg p-2 text-[#D6B79A]/50 hover:bg-white/5 hover:text-[#F5E6D8]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-bold text-[#D6A373]">{order.code}</h1>
              <OrderStatusBadge status={order.status} size="md" />
            </div>
            <p className="mt-1 text-xs text-[#D6B79A]/42">
              {new Date(order.placedAt).toLocaleString("en-EG")} · {order.channel}
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-[#B6885E]/14 bg-[#D6A373]/[0.045] p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label
              htmlFor="status-note"
              className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A373]/65"
            >
              Optional timeline note
            </label>
            <textarea
              id="status-note"
              value={statusNote}
              onChange={(event) => setStatusNote(event.target.value)}
              maxLength={1000}
              rows={2}
              className="mt-2 w-full resize-none rounded-lg border border-[#B6885E]/15 bg-[#0B0806]/65 px-3 py-2 text-sm text-[#F5E6D8] outline-none placeholder:text-[#D6B79A]/25 focus:border-[#D6A373]/35"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {transitions.map((status) => (
              <button
                key={status}
                type="button"
                disabled={updatingTo !== null}
                onClick={() => void changeStatus(status)}
                className="rounded-lg border border-[#D6A373]/25 bg-[#D6A373]/10 px-3 py-2 text-xs font-semibold text-[#D6A373] hover:bg-[#D6A373]/16 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {updatingTo === status
                  ? "Saving…"
                  : `Move to ${ADMIN_ORDER_STATUS_LABELS[status]}`}
              </button>
            ))}
            {transitions.length === 0 && (
              <p className="self-center text-xs text-[#D6B79A]/45">
                This order is in a terminal status.
              </p>
            )}
          </div>
        </div>
        {actionMessage && (
          <p className="mt-3 text-xs text-[#D6B79A]/65" role="status">
            {actionMessage}
          </p>
        )}
      </section>

      {DELIVERY_OVERRIDABLE.includes(order.status) && (
        <section className="rounded-xl border border-[#B6885E]/14 bg-white/[0.018] p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label
                htmlFor="delivery-fee"
                className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A373]/65"
              >
                Delivery fee (EGP)
              </label>
              <input
                id="delivery-fee"
                type="number"
                min={0}
                max={100000}
                step="0.01"
                inputMode="decimal"
                value={feeInput ?? String(order.deliveryFee)}
                onChange={(event) => setFeeInput(event.target.value)}
                className="mt-2 w-32 rounded-lg border border-[#B6885E]/15 bg-[#0B0806]/65 px-3 py-2 text-sm text-[#F5E6D8] outline-none focus:border-[#D6A373]/35"
              />
            </div>
            <div className="min-w-[12rem] flex-1">
              <label
                htmlFor="delivery-fee-note"
                className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A373]/65"
              >
                Override reason (optional)
              </label>
              <input
                id="delivery-fee-note"
                type="text"
                maxLength={500}
                value={feeNote}
                onChange={(event) => setFeeNote(event.target.value)}
                placeholder="e.g. Aswan courier fee agreed with customer"
                className="mt-2 w-full rounded-lg border border-[#B6885E]/15 bg-[#0B0806]/65 px-3 py-2 text-sm text-[#F5E6D8] outline-none placeholder:text-[#D6B79A]/25 focus:border-[#D6A373]/35"
              />
            </div>
            <button
              type="button"
              disabled={overridingFee}
              onClick={() => void overrideDeliveryFee()}
              className="rounded-lg border border-[#D6A373]/25 bg-[#D6A373]/10 px-3 py-2 text-xs font-semibold text-[#D6A373] hover:bg-[#D6A373]/16 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {overridingFee ? "Saving…" : "Override delivery fee"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[#D6B79A]/42">
            Recomputes the order total and logs the change to the admin note. Allowed before delivery only.
          </p>
          {feeMessage && (
            <p className="mt-2 text-xs text-[#D6B79A]/65" role="status">
              {feeMessage}
            </p>
          )}
        </section>
      )}

      <OrderDetails order={order} />
    </div>
  );
}

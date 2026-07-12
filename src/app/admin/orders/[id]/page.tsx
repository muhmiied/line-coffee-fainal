"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import OrderDetails from "@/components/admin/orders/OrderDetails";
import OrderFinancePanel from "@/components/admin/orders/OrderFinancePanel";
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

  async function reloadOrder() {
    if (!order) return;
    const refreshed = await getAdminOrderById(order.id);
    if (refreshed) setOrder(refreshed);
  }

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
      <div className="flex items-center justify-center gap-2 py-24 text-sm admin-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading real order…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="font-serif text-lg font-semibold" style={{ color: "var(--admin-heading)" }}>
          {loadError ?? "Order not found."}
        </p>
        <Link href="/admin/orders" className="admin-link text-sm">
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
          <button type="button" onClick={() => router.back()} aria-label="Back" className="admin-btn admin-btn-sm !p-2">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-bold" style={{ color: "var(--admin-hazelnut)" }}>{order.code}</h1>
              <OrderStatusBadge status={order.status} size="md" />
            </div>
            <p className="mt-1 text-xs admin-faint">
              {new Date(order.placedAt).toLocaleString("en-EG")} · {order.channel}
            </p>
          </div>
        </div>
      </header>

      <section className="admin-surface p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label htmlFor="status-note" className="admin-label !text-[10px]" style={{ color: "var(--admin-hazelnut)" }}>
              Optional timeline note
            </label>
            <textarea
              id="status-note"
              value={statusNote}
              onChange={(event) => setStatusNote(event.target.value)}
              maxLength={1000}
              rows={2}
              className="admin-textarea mt-2 !resize-none !text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {transitions.map((status) => (
              <button
                key={status}
                type="button"
                disabled={updatingTo !== null}
                onClick={() => void changeStatus(status)}
                className="admin-btn admin-btn-primary !px-3 !py-2 !text-xs"
              >
                {updatingTo === status
                  ? "Saving…"
                  : `Move to ${ADMIN_ORDER_STATUS_LABELS[status]}`}
              </button>
            ))}
            {transitions.length === 0 && (
              <p className="self-center text-xs admin-faint">
                This order is in a terminal status.
              </p>
            )}
          </div>
        </div>
        {actionMessage && (
          <p className="mt-3 text-xs admin-faint" role="status">
            {actionMessage}
          </p>
        )}
      </section>

      {DELIVERY_OVERRIDABLE.includes(order.status) && (
        <section className="admin-surface p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="delivery-fee" className="admin-label !text-[10px]" style={{ color: "var(--admin-hazelnut)" }}>
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
                className="admin-input mt-2 !w-32 !text-sm"
              />
            </div>
            <div className="min-w-[12rem] flex-1">
              <label htmlFor="delivery-fee-note" className="admin-label !text-[10px]" style={{ color: "var(--admin-hazelnut)" }}>
                Override reason (optional)
              </label>
              <input
                id="delivery-fee-note"
                type="text"
                maxLength={500}
                value={feeNote}
                onChange={(event) => setFeeNote(event.target.value)}
                placeholder="e.g. Aswan courier fee agreed with customer"
                className="admin-input mt-2 w-full !text-sm"
              />
            </div>
            <button
              type="button"
              disabled={overridingFee}
              onClick={() => void overrideDeliveryFee()}
              className="admin-btn admin-btn-primary !px-3 !py-2 !text-xs"
            >
              {overridingFee ? "Saving…" : "Override delivery fee"}
            </button>
          </div>
          <p className="mt-2 text-[11px] admin-faint">
            Recomputes the order total and logs the change to the admin note. Allowed before delivery only.
          </p>
          {feeMessage && (
            <p className="mt-2 text-xs admin-faint" role="status">
              {feeMessage}
            </p>
          )}
        </section>
      )}

      <OrderDetails order={order} />

      <OrderFinancePanel order={order} onOrderChanged={reloadOrder} />
    </div>
  );
}

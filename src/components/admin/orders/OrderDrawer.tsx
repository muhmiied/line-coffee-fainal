"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import OrderDetails from "@/components/admin/orders/OrderDetails";
import OrderFinancePanel from "@/components/admin/orders/OrderFinancePanel";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import {
  ADMIN_ORDER_STATUS_LABELS,
  ALLOWED_ADMIN_ORDER_TRANSITIONS,
  getAdminOrderById,
  updateAdminOrderStatus,
  type AdminOrderDetail,
  type AdminOrderStatus,
} from "@/lib/admin/admin-orders";

type OrderDrawerProps = {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: (order: AdminOrderDetail) => void;
};

export default function OrderDrawer({
  orderId,
  isOpen,
  onClose,
  onOrderUpdated,
}: OrderDrawerProps) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [updatingTo, setUpdatingTo] = useState<AdminOrderStatus | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !orderId) return;
    let cancelled = false;

    void getAdminOrderById(orderId)
      .then((nextOrder) => {
        if (cancelled) return;
        setOrder(nextOrder);
        setLoadError(nextOrder ? null : "Order not found.");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Could not load the order.");
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, orderId]);

  const activeOrder = order?.id === orderId ? order : null;

  async function reloadOrder() {
    if (!activeOrder) return;
    const refreshed = await getAdminOrderById(activeOrder.id);
    if (refreshed) {
      setOrder(refreshed);
      onOrderUpdated(refreshed);
    }
  }

  async function changeStatus(nextStatus: AdminOrderStatus) {
    if (!activeOrder || updatingTo) return;
    setUpdatingTo(nextStatus);
    setActionMessage(null);
    try {
      await updateAdminOrderStatus(activeOrder.id, nextStatus, statusNote);
      const refreshed = await getAdminOrderById(activeOrder.id);
      if (!refreshed) throw new Error("Order not found after update.");
      setOrder(refreshed);
      setStatusNote("");
      setActionMessage(
        `Order moved to ${ADMIN_ORDER_STATUS_LABELS[refreshed.status]}.`,
      );
      onOrderUpdated(refreshed);
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : "Could not update order status.",
      );
    } finally {
      setUpdatingTo(null);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close order drawer"
        onClick={onClose}
        className="admin-modal-overlay fixed inset-0 z-[100] transition-opacity"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={activeOrder ? `Order ${activeOrder.code}` : "Order details"}
        className="admin-drawer-surface fixed right-0 top-0 z-[101] flex h-dvh w-full max-w-2xl flex-col transition-transform duration-300"
        style={{ transform: isOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        <header className="admin-drawer-header flex shrink-0 items-start justify-between gap-4 px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-lg font-bold" style={{ color: "var(--admin-hazelnut)" }}>
                {activeOrder?.code ?? "Order details"}
              </h2>
              {activeOrder && <OrderStatusBadge status={activeOrder.status} />}
            </div>
            {activeOrder && (
              <p className="mt-1 text-xs admin-faint">
                {new Date(activeOrder.placedAt).toLocaleString("en-EG")}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="admin-btn admin-btn-sm !p-2">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="admin-scrollbar flex-1 overflow-y-auto p-5">
          {!activeOrder && !loadError && (
            <div className="flex items-center justify-center gap-2 py-20 text-sm admin-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading real order…
            </div>
          )}

          {loadError && !activeOrder && (
            <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(227,154,140,0.08)", border: "1px solid rgba(227,154,140,0.24)", color: "#eeb4a8" }}>
              {loadError}
            </div>
          )}

          {activeOrder && (
            <div className="space-y-4">
              <section className="admin-surface p-4">
                <h3 className="admin-label !text-[10px]" style={{ color: "var(--admin-hazelnut)" }}>
                  Status action
                </h3>
                <textarea
                  value={statusNote}
                  onChange={(event) => setStatusNote(event.target.value)}
                  maxLength={1000}
                  rows={2}
                  placeholder="Optional timeline note"
                  className="admin-textarea mt-3 !resize-none !text-sm"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {ALLOWED_ADMIN_ORDER_TRANSITIONS[activeOrder.status].map((status) => (
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
                  {ALLOWED_ADMIN_ORDER_TRANSITIONS[activeOrder.status].length === 0 && (
                    <p className="text-xs admin-faint">
                      This order is in a terminal status.
                    </p>
                  )}
                </div>
                {actionMessage && (
                  <p className="mt-3 text-xs admin-faint" role="status">
                    {actionMessage}
                  </p>
                )}
              </section>

              <OrderDetails order={activeOrder} />

              <OrderFinancePanel order={activeOrder} onOrderChanged={reloadOrder} />

              <Link
                href={`/admin/orders/${activeOrder.id}`}
                className="admin-btn inline-flex !px-4 !py-2 !text-xs"
              >
                Open full order page
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

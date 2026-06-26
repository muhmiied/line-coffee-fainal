"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import OrderDetails from "@/components/admin/orders/OrderDetails";
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
        className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-[1px] transition-opacity"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={activeOrder ? `Order ${activeOrder.code}` : "Order details"}
        className="fixed right-0 top-0 z-[101] flex h-dvh w-full max-w-2xl flex-col border-l border-[#B6885E]/14 bg-[#0F0B08] shadow-2xl transition-transform duration-300"
        style={{ transform: isOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#B6885E]/10 px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-lg font-bold text-[#D6A373]">
                {activeOrder?.code ?? "Order details"}
              </h2>
              {activeOrder && <OrderStatusBadge status={activeOrder.status} />}
            </div>
            {activeOrder && (
              <p className="mt-1 text-xs text-[#D6B79A]/42">
                {new Date(activeOrder.placedAt).toLocaleString("en-EG")}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-[#D6B79A]/50 hover:bg-white/5 hover:text-[#F5E6D8]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="admin-scrollbar flex-1 overflow-y-auto p-5">
          {!activeOrder && !loadError && (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-[#D6B79A]/55">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading real order…
            </div>
          )}

          {loadError && !activeOrder && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/8 p-4 text-sm text-red-200">
              {loadError}
            </div>
          )}

          {activeOrder && (
            <div className="space-y-4">
              <section className="rounded-xl border border-[#B6885E]/14 bg-[#D6A373]/[0.045] p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A373]/65">
                  Status action
                </h3>
                <textarea
                  value={statusNote}
                  onChange={(event) => setStatusNote(event.target.value)}
                  maxLength={1000}
                  rows={2}
                  placeholder="Optional timeline note"
                  className="mt-3 w-full resize-none rounded-lg border border-[#B6885E]/15 bg-[#0B0806]/65 px-3 py-2 text-sm text-[#F5E6D8] outline-none placeholder:text-[#D6B79A]/25 focus:border-[#D6A373]/35"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {ALLOWED_ADMIN_ORDER_TRANSITIONS[activeOrder.status].map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={updatingTo !== null}
                      onClick={() => void changeStatus(status)}
                      className="rounded-lg border border-[#D6A373]/25 bg-[#D6A373]/10 px-3 py-2 text-xs font-semibold text-[#D6A373] transition-colors hover:bg-[#D6A373]/16 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {updatingTo === status
                        ? "Saving…"
                        : `Move to ${ADMIN_ORDER_STATUS_LABELS[status]}`}
                    </button>
                  ))}
                  {ALLOWED_ADMIN_ORDER_TRANSITIONS[activeOrder.status].length === 0 && (
                    <p className="text-xs text-[#D6B79A]/45">
                      This order is in a terminal status.
                    </p>
                  )}
                </div>
                {actionMessage && (
                  <p className="mt-3 text-xs text-[#D6B79A]/65" role="status">
                    {actionMessage}
                  </p>
                )}
              </section>

              <OrderDetails order={activeOrder} />

              <Link
                href={`/admin/orders/${activeOrder.id}`}
                className="inline-flex rounded-lg border border-[#B6885E]/18 px-4 py-2 text-xs font-semibold text-[#D6B79A]/70 hover:border-[#D6A373]/30 hover:text-[#D6A373]"
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { AccountShell } from "@/components/layout/account/AccountShell";
import {
  getCustomerOrders,
  type CustomerOrderSummary,
} from "@/lib/account/customer-account";
import { formatDate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils/cn";

const STATUS_LABEL: Record<string, { en: string; ar: string }> = {
  pending:   { en: "Received",  ar: "تم الاستلام"  },
  preparing: { en: "Preparing", ar: "قيد التجهيز"  },
  shipped:   { en: "Shipped",   ar: "تم الشحن"      },
  delivered: { en: "Delivered", ar: "تم التوصيل"   },
  cancelled: { en: "Cancelled", ar: "ملغي"           },
  returned:  { en: "Returned",  ar: "مُرجَّع"         },
};

const STATUS_COLOR: Record<string, string> = {
  pending:   "text-amber-400   bg-amber-400/10   border-amber-400/25",
  preparing: "text-orange-400  bg-orange-400/10  border-orange-400/25",
  shipped:   "text-sky-400     bg-sky-400/10     border-sky-400/25",
  delivered: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
  cancelled: "text-red-400     bg-red-400/10     border-red-400/25",
  returned:  "text-purple-400  bg-purple-400/10  border-purple-400/25",
};

export default function OrdersPage() {
  const { t, dir, language } = useLanguage();
  const isRtl = dir === "rtl";

  const [orders, setOrders]   = useState<CustomerOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    getCustomerOrders()
      .then(setOrders)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <AccountShell title={{ en: "My Orders", ar: "طلباتي" }}>
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="account-skeleton h-16 rounded-xl"
            />
          ))}
        </div>
      ) : loadError ? (
        <div className="account-card rounded-xl border-red-900/30 px-6 py-16 text-center">
          <p className="mb-4 text-sm text-red-400">
            {t({
              en: "We couldn't load your orders. Please try again.",
              ar: "تعذر تحميل طلباتك. يرجى المحاولة مرة أخرى.",
            })}
          </p>
          <button
            type="button"
            onClick={load}
            className="premium-button-outline pub-btn-3d inline-block px-8 py-2.5 text-sm"
          >
            {t({ en: "Retry", ar: "إعادة المحاولة" })}
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="account-card rounded-xl px-6 py-16 text-center">
          <p className="mb-4 text-sm text-[#B79B85]/80">
            {t({ en: "No orders yet.", ar: "لا توجد طلبات بعد." })}
          </p>
          <Link
            href="/products"
            className="premium-button pub-btn-3d inline-block px-8 py-2.5 text-sm"
          >
            {t({ en: "Start shopping", ar: "تسوق الآن" })}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusCls =
              STATUS_COLOR[order.status] ?? STATUS_COLOR.pending;
            const statusLabel =
              STATUS_LABEL[order.status] ?? STATUS_LABEL.pending;
            return (
              <Link
                key={order.id}
                href={`/account/orders/${order.code}`}
                className="account-card account-card-interactive group flex items-center gap-4 rounded-xl px-5 py-4"
              >
                {/* Order info */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-[#F5E6D8]">
                      {order.code}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        statusCls,
                      )}
                    >
                      {t(statusLabel)}
                    </span>
                  </div>
                  <p className="text-xs text-[#B79B85]/75">
                    {formatDate(order.placedAt, language)} ·{" "}
                    {order.itemCount}{" "}
                    {t({
                      en: order.itemCount === 1 ? "item" : "items",
                      ar: "منتجات",
                    })}
                  </p>
                </div>

                {/* Total */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-[#D6A373]">
                    {order.total} {t({ en: "EGP", ar: "ج.م" })}
                  </p>
                </div>

                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 text-[#B79B85]/60 transition-transform group-hover:text-[#B6885E]",
                    isRtl ? "rotate-180" : "",
                  )}
                />
              </Link>
            );
          })}
        </div>
      )}
    </AccountShell>
  );
}

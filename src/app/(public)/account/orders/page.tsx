"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { AccountShell } from "@/components/layout/account/AccountShell";
import { MOCK_ORDERS, STATUS_LABEL, STATUS_COLOR } from "@/lib/mock-data/account-data";
import { formatDate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils/cn";

export default function OrdersPage() {
  const { t, dir, language } = useLanguage();
  const isRtl = dir === "rtl";
  const Arrow = isRtl ? ChevronRight : ChevronRight;

  return (
    <AccountShell title={{ en: "My Orders", ar: "طلباتي" }}>
      {MOCK_ORDERS.length === 0 ? (
        <div className="rounded-xl border border-[#B6885E]/10 bg-[#120D09] px-6 py-16 text-center">
          <p className="mb-4 text-sm text-[#B79B85]/60">
            {t({ en: "No orders yet.", ar: "لا توجد طلبات بعد." })}
          </p>
          <Link href="/products" className="premium-button inline-block px-8 py-2.5 text-sm">
            {t({ en: "Start shopping", ar: "تسوق الآن" })}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {MOCK_ORDERS.map((order) => {
            const statusCls = STATUS_COLOR[order.status];
            return (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="group flex items-center gap-4 rounded-xl border border-[#B6885E]/10 bg-[#120D09] px-5 py-4 transition-all hover:border-[#B6885E]/25 hover:bg-[#15100B]"
              >
                {/* Order info */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-[#F5E6D8]">{order.id}</span>
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", statusCls)}>
                      {t(STATUS_LABEL[order.status])}
                    </span>
                  </div>
                  <p className="text-xs text-[#B79B85]/55">
                    {formatDate(order.date, language)} · {order.items.length}{" "}
                    {t({ en: order.items.length === 1 ? "item" : "items", ar: "منتجات" })}
                  </p>
                </div>

                {/* Total */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-[#D6A373]">{order.total} {t({ en: "EGP", ar: "ج.م" })}</p>
                </div>

                <Arrow className={cn("h-4 w-4 shrink-0 text-[#B79B85]/40 transition-transform group-hover:text-[#B6885E]", isRtl ? "rotate-180" : "")} />
              </Link>
            );
          })}
        </div>
      )}
    </AccountShell>
  );
}

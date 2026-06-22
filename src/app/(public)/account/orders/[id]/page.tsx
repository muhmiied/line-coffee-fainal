"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { AccountShell } from "@/components/layout/account/AccountShell";
import { MOCK_ORDERS, STATUS_LABEL, STATUS_COLOR } from "@/lib/mock-data/account-data";
import { formatDate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils/cn";

const TRACKING_STEPS = [
  { key: "processing", label: { en: "Order Received",   ar: "تم استلام الطلب" } },
  { key: "roasting",   label: { en: "Roasting",         ar: "جارٍ التحميص" } },
  { key: "shipped",    label: { en: "Out for Delivery",  ar: "في الطريق إليك" } },
  { key: "delivered",  label: { en: "Delivered",         ar: "تم التوصيل" } },
] as const;

const STEP_ORDER = ["processing", "roasting", "shipped", "delivered"] as const;

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, dir, language } = useLanguage();
  const isRtl = dir === "rtl";
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  const order = MOCK_ORDERS.find((o) => o.id === id);

  if (!order) {
    return (
      <AccountShell title={{ en: "Order not found", ar: "الطلب غير موجود" }}>
        <div className="rounded-xl border border-[#B6885E]/10 bg-[#120D09] px-6 py-16 text-center">
          <p className="mb-4 text-sm text-[#B79B85]/60">
            {t({ en: "We could not find this order.", ar: "لم نتمكن من العثور على هذا الطلب." })}
          </p>
          <Link href="/account/orders" className="premium-button inline-block px-8 py-2.5 text-sm">
            {t({ en: "Back to orders", ar: "العودة للطلبات" })}
          </Link>
        </div>
      </AccountShell>
    );
  }

  const currentStep = order.status === "cancelled" ? -1 : STEP_ORDER.indexOf(order.status);
  const statusCls = STATUS_COLOR[order.status];

  return (
    <AccountShell title={{ en: `Order ${order.id}`, ar: `طلب ${order.id}` }}>
      {/* Back */}
      <Link
        href="/account/orders"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#B79B85]/60 transition-colors hover:text-[#B6885E]"
      >
        <BackArrow className="h-3.5 w-3.5" />
        {t({ en: "All orders", ar: "جميع الطلبات" })}
      </Link>

      <div className="space-y-4">
        {/* Header card */}
        <div className="rounded-xl border border-[#B6885E]/12 bg-[#120D09] px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-lg font-bold text-[#F5E6D8]">{order.id}</p>
              <p className="mt-0.5 text-xs text-[#B79B85]/55">{formatDate(order.date, language)}</p>
            </div>
            <span className={cn("rounded-full border px-3 py-1 text-sm font-medium", statusCls)}>
              {t(STATUS_LABEL[order.status])}
            </span>
          </div>
        </div>

        {/* Tracking steps — only for non-cancelled */}
        {order.status !== "cancelled" && (
          <div className="rounded-xl border border-[#B6885E]/12 bg-[#120D09] px-5 py-5">
            <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-[#B6885E]/70">
              {t({ en: "Order Status", ar: "حالة الطلب" })}
            </p>
            <div className="relative flex items-start justify-between">
              {/* Progress bar */}
              <div className="absolute top-3.5 h-px w-full bg-[#B6885E]/12" />
              <div
                className="absolute top-3.5 h-px bg-[#B6885E]/50 transition-all"
                style={{ width: `${(currentStep / (STEP_ORDER.length - 1)) * 100}%` }}
              />

              {TRACKING_STEPS.map((step, i) => {
                const done    = i <= currentStep;
                const current = i === currentStep;
                return (
                  <div key={step.key} className="relative z-10 flex flex-1 flex-col items-center gap-2">
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all",
                        done
                          ? "border-[#B6885E] bg-[#B6885E]"
                          : "border-[#B6885E]/20 bg-[#120D09]",
                        current && "ring-2 ring-[#B6885E]/25 ring-offset-1 ring-offset-[#120D09]",
                      )}
                    >
                      {done && (
                        <svg className="h-3.5 w-3.5 text-[#0B0806]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <p className={cn("text-center text-xs leading-tight", done ? "text-[#D6B79A]" : "text-[#B79B85]/40")}>
                      {t(step.label)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="rounded-xl border border-[#B6885E]/12 bg-[#120D09] px-5 py-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#B6885E]/70">
            {t({ en: "Items", ar: "المنتجات" })}
          </p>
          <div className="divide-y divide-[#B6885E]/08">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#F5E6D8]">{t(item.name)}</p>
                  <p className="text-xs text-[#B79B85]/55">{t(item.detail)} × {item.qty}</p>
                </div>
                <p className="shrink-0 text-sm text-[#D6A373]">
                  {item.price * item.qty} {t({ en: "EGP", ar: "ج.م" })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-[#B6885E]/12 bg-[#120D09] px-5 py-5">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[#B79B85]/70">
              <span>{t({ en: "Subtotal", ar: "المجموع الفرعي" })}</span>
              <span>{order.subtotal} {t({ en: "EGP", ar: "ج.م" })}</span>
            </div>
            <div className="flex justify-between text-[#B79B85]/70">
              <span>{t({ en: "Delivery", ar: "التوصيل" })}</span>
              <span>
                {order.delivery === 0
                  ? t({ en: "Free", ar: "مجاني" })
                  : `${order.delivery} ${t({ en: "EGP", ar: "ج.م" })}`}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#B6885E]/10 pt-2 font-semibold text-[#F5E6D8]">
              <span>{t({ en: "Total", ar: "الإجمالي" })}</span>
              <span className="text-[#D6A373]">{order.total} {t({ en: "EGP", ar: "ج.م" })}</span>
            </div>
          </div>
        </div>

        {/* Delivery address */}
        <div className="rounded-xl border border-[#B6885E]/12 bg-[#120D09] px-5 py-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#B6885E]/70">
            {t({ en: "Delivery Address", ar: "عنوان التوصيل" })}
          </p>
          <p className="text-sm text-[#B79B85]/70">{t(order.address)}</p>
        </div>
      </div>
    </AccountShell>
  );
}

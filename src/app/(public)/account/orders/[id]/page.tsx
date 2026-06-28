"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { AccountShell } from "@/components/layout/account/AccountShell";
import {
  getCustomerOrderDetail,
  type CustomerOrderDetail,
} from "@/lib/account/customer-account";
import { formatDate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils/cn";

// ─── Status labels / colors ───────────────────────────────────────────────────

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

const PAYMENT_LABEL: Record<string, { en: string; ar: string }> = {
  cash_on_delivery: { en: "Cash on Delivery", ar: "الدفع عند الاستلام" },
  instapay:         { en: "InstaPay",          ar: "إنستاباي"          },
  wallet:           { en: "E-Wallet",          ar: "محفظة إلكترونية"  },
};

// ─── Tracking stepper (real status flow) ─────────────────────────────────────

const TRACKING_STEPS = [
  { key: "pending",   label: { en: "Order Received",  ar: "تم استلام الطلب" } },
  { key: "preparing", label: { en: "Preparing",        ar: "قيد التجهيز"     } },
  { key: "shipped",   label: { en: "Out for Delivery", ar: "في الطريق إليك"  } },
  { key: "delivered", label: { en: "Delivered",        ar: "تم التوصيل"      } },
] as const;

const FLOW_ORDER: readonly string[] = ["pending", "preparing", "shipped", "delivered"];

// ─── Address formatter ────────────────────────────────────────────────────────

function formatAddress(snapshot: Record<string, unknown> | null): string {
  if (!snapshot) return "";
  const parts: string[] = [];
  if (snapshot.recipient_name) parts.push(String(snapshot.recipient_name));
  if (snapshot.street)         parts.push(String(snapshot.street));
  if (snapshot.building)       parts.push(`Bldg. ${snapshot.building}`);
  if (snapshot.floor)          parts.push(`Fl. ${snapshot.floor}`);
  if (snapshot.apartment)      parts.push(`Apt. ${snapshot.apartment}`);
  if (snapshot.area)           parts.push(String(snapshot.area));
  if (snapshot.governorate)    parts.push(String(snapshot.governorate));
  return parts.filter(Boolean).join(", ");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, dir, language } = useLanguage();
  const isRtl    = dir === "rtl";
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  const [order, setOrder]   = useState<CustomerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // `id` here is the order code from the URL (e.g. "LC-000001")
    getCustomerOrderDetail(id)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AccountShell title={{ en: "Order", ar: "الطلب" }}>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-[#120D09]" />
          ))}
        </div>
      </AccountShell>
    );
  }

  if (!order) {
    return (
      <AccountShell title={{ en: "Order not found", ar: "الطلب غير موجود" }}>
        <div className="rounded-xl border border-[#B6885E]/10 bg-[#120D09] px-6 py-16 text-center">
          <p className="mb-4 text-sm text-[#B79B85]/60">
            {t({
              en: "We could not find this order.",
              ar: "لم نتمكن من العثور على هذا الطلب.",
            })}
          </p>
          <Link
            href="/account/orders"
            className="premium-button inline-block px-8 py-2.5 text-sm"
          >
            {t({ en: "Back to orders", ar: "العودة للطلبات" })}
          </Link>
        </div>
      </AccountShell>
    );
  }

  const isTerminal  = order.status === "cancelled" || order.status === "returned";
  const currentStep = isTerminal ? -1 : FLOW_ORDER.indexOf(order.status);
  const statusCls   = STATUS_COLOR[order.status] ?? STATUS_COLOR.pending;
  const paymentLbl  = PAYMENT_LABEL[order.paymentMethod] ?? {
    en: order.paymentMethod,
    ar: order.paymentMethod,
  };
  const addressText = formatAddress(order.addressSnapshot);

  return (
    <AccountShell title={{ en: `Order ${order.code}`, ar: `طلب ${order.code}` }}>
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
              <p className="font-mono text-lg font-bold text-[#F5E6D8]">
                {order.code}
              </p>
              <p className="mt-0.5 text-xs text-[#B79B85]/55">
                {formatDate(order.placedAt, language)}
              </p>
            </div>
            <span className={cn("rounded-full border px-3 py-1 text-sm font-medium", statusCls)}>
              {t(STATUS_LABEL[order.status] ?? STATUS_LABEL.pending)}
            </span>
          </div>
        </div>

        {/* Tracking steps — not shown for terminal statuses */}
        {!isTerminal && (
          <div className="rounded-xl border border-[#B6885E]/12 bg-[#120D09] px-5 py-5">
            <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-[#B6885E]/70">
              {t({ en: "Order Status", ar: "حالة الطلب" })}
            </p>
            <div className="relative flex items-start justify-between">
              {/* Track line */}
              <div className="absolute top-3.5 h-px w-full bg-[#B6885E]/12" />
              <div
                className="absolute top-3.5 h-px bg-[#B6885E]/50 transition-all"
                style={{
                  width: `${Math.max(0, (currentStep / (FLOW_ORDER.length - 1)) * 100)}%`,
                }}
              />
              {TRACKING_STEPS.map((step, i) => {
                const done    = i <= currentStep;
                const current = i === currentStep;
                return (
                  <div
                    key={step.key}
                    className="relative z-10 flex flex-1 flex-col items-center gap-2"
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all",
                        done
                          ? "border-[#B6885E] bg-[#B6885E]"
                          : "border-[#B6885E]/20 bg-[#120D09]",
                        current &&
                          "ring-2 ring-[#B6885E]/25 ring-offset-1 ring-offset-[#120D09]",
                      )}
                    >
                      {done && (
                        <svg
                          className="h-3.5 w-3.5 text-[#0B0806]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-center text-xs leading-tight",
                        done ? "text-[#D6B79A]" : "text-[#B79B85]/40",
                      )}
                    >
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
            {order.items.length === 0 ? (
              <p className="py-3 text-sm text-[#B79B85]/40">
                {t({ en: "No items.", ar: "لا توجد منتجات." })}
              </p>
            ) : (
              order.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#F5E6D8]">
                      {language === "ar" ? item.nameAr : item.nameEn}
                    </p>
                    <p className="text-xs text-[#B79B85]/55">
                      {language === "ar"
                        ? (item.detailAr ?? item.detailEn ?? "")
                        : (item.detailEn ?? "")}
                      {" × "}
                      {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-[#D6A373]">
                    {item.lineTotal} {t({ en: "EGP", ar: "ج.م" })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Financial summary */}
        <div className="rounded-xl border border-[#B6885E]/12 bg-[#120D09] px-5 py-5">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[#B79B85]/70">
              <span>{t({ en: "Subtotal", ar: "المجموع الفرعي" })}</span>
              <span>
                {order.subtotal} {t({ en: "EGP", ar: "ج.م" })}
              </span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-400/80">
                <span>{t({ en: "Discount", ar: "الخصم" })}</span>
                <span>
                  -{order.discountTotal} {t({ en: "EGP", ar: "ج.م" })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[#B79B85]/70">
              <span>{t({ en: "Delivery", ar: "التوصيل" })}</span>
              <span>
                {order.deliveryFee === 0
                  ? t({ en: "Free", ar: "مجاني" })
                  : `${order.deliveryFee} ${t({ en: "EGP", ar: "ج.م" })}`}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#B6885E]/10 pt-2 font-semibold text-[#F5E6D8]">
              <span>{t({ en: "Total", ar: "الإجمالي" })}</span>
              <span className="text-[#D6A373]">
                {order.total} {t({ en: "EGP", ar: "ج.م" })}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 text-xs text-[#B79B85]/55">
              <span>{t({ en: "Payment", ar: "الدفع" })}</span>
              <span>{t(paymentLbl)}</span>
            </div>
          </div>
        </div>

        {/* Delivery address */}
        {addressText && (
          <div className="rounded-xl border border-[#B6885E]/12 bg-[#120D09] px-5 py-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#B6885E]/70">
              {t({ en: "Delivery Address", ar: "عنوان التوصيل" })}
            </p>
            <p className="text-sm text-[#B79B85]/70">{addressText}</p>
          </div>
        )}

        {/* Order timeline */}
        {order.timeline.length > 0 && (
          <div className="rounded-xl border border-[#B6885E]/12 bg-[#120D09] px-5 py-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#B6885E]/70">
              {t({ en: "Order History", ar: "سجل الطلب" })}
            </p>
            <div className="space-y-3">
              {order.timeline.map((ev, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#B6885E]/60" />
                  <div>
                    <p className="text-sm text-[#D6B79A]">
                      {t(
                        STATUS_LABEL[ev.status] ?? {
                          en: ev.status,
                          ar: ev.status,
                        },
                      )}
                    </p>
                    {ev.note && (
                      <p className="text-xs text-[#B79B85]/55">{ev.note}</p>
                    )}
                    <p className="text-xs text-[#B79B85]/40">
                      {formatDate(ev.changedAt, language)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AccountShell>
  );
}

"use client";

import Link from "next/link";
import { Suspense, useCallback, useMemo, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle } from "lucide-react";
import {
  checkoutResultStorageKey,
  isCheckoutOrderResult,
  type CheckoutOrderResult,
} from "@/lib/checkout";
import { useLanguage } from "@/lib/context/language";
import { cn } from "@/lib/utils/cn";

const RECEIPT_LOADING = "__receipt_loading__";
const subscribeToNothing = () => () => {};
const getLoadingSnapshot = () => RECEIPT_LOADING;

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const fallbackCode = searchParams.get("order");
  const { t, dir } = useLanguage();
  const getStoredResult = useCallback(() => {
    if (!orderId) return null;
    try {
      return window.sessionStorage.getItem(checkoutResultStorageKey(orderId));
    } catch {
      return null;
    }
  }, [orderId]);
  const rawResult = useSyncExternalStore(
    subscribeToNothing,
    getStoredResult,
    getLoadingSnapshot,
  );
  const result = useMemo<CheckoutOrderResult | null>(() => {
    if (!rawResult || !orderId) return null;
    try {
      const parsed: unknown = JSON.parse(rawResult);
      return isCheckoutOrderResult(parsed) && parsed.order_id === orderId ? parsed : null;
    } catch {
      return null;
    }
  }, [orderId, rawResult]);

  if (rawResult === RECEIPT_LOADING) {
    return <div className="min-h-screen bg-[#0B0806]" />;
  }

  const orderCode = result?.code ?? fallbackCode;
  const paymentMethod = result
    ? {
        cash_on_delivery: t({ en: "Cash on Delivery", ar: "الدفع عند الاستلام" }),
        instapay: t({ en: "InstaPay", ar: "إنستا باي" }),
        wallet: t({ en: "Wallet", ar: "المحفظة الإلكترونية" }),
      }[result.payment_method]
    : null;
  const paymentStatus = result
    ? result.payment_status === "pending_review"
      ? t({ en: "Pending review", ar: "في انتظار المراجعة" })
      : t({ en: "Pending", ar: "قيد الانتظار" })
    : null;

  return (
    <div className="arabic-body min-h-screen bg-[#0B0806] text-[#F5E6D8]">
      <section className="products-hero relative overflow-hidden pb-10 pt-28 lg:pt-36">
        <div className="absolute inset-0 bg-[#0B0806]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#B6885E]/22 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#B6885E]">
            {t({ en: "Order Received", ar: "تم استلام الطلب" })}
          </p>
          <h1 className="font-serif text-3xl font-bold text-[#F5E6D8] sm:text-4xl">
            {t({ en: "Thank You!", ar: "شكراً لك!" })}
          </h1>
        </div>
      </section>

      <section className="cinematic-section section-bg-warm pb-20 pt-12">
        <div className="relative z-10 mx-auto max-w-2xl px-4">
          <div className="rounded-2xl border border-[#B6885E]/18 bg-[#120D09]/72 p-8 shadow-[0_16px_48px_rgba(0,0,0,0.32)] md:p-10">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#D6A373]/30 bg-[#D6A373]/10 text-[#D6A373]">
                <CheckCircle className="h-9 w-9" />
              </div>
            </div>

            <div className="mb-8 text-center">
              <p className="mb-2 text-sm text-[#D6B79A]/60">
                {orderCode
                  ? t({ en: "Your order number", ar: "رقم طلبك" })
                  : t({ en: "Your order was received", ar: "تم استلام طلبك" })}
              </p>
              {orderCode && (
                <p className="font-serif text-3xl font-bold tracking-wide text-[#D6A373]" dir="ltr">
                  {orderCode}
                </p>
              )}
              <p className="mt-3 text-sm leading-relaxed text-[#D6B79A]/60">
                {t({
                  en: "Our team will contact you shortly to confirm your delivery details.",
                  ar: "سيتواصل فريقنا معك قريباً لتأكيد تفاصيل التوصيل.",
                })}
              </p>
            </div>

            <div className="mb-8 h-px bg-gradient-to-r from-transparent via-[#B6885E]/25 to-transparent" />

            {result ? (
              <div className="mb-8 rounded-xl border border-[#B6885E]/14 bg-[#0B0806]/40 p-5">
                <h2 className="mb-4 font-serif text-lg font-bold text-[#F5E6D8]">
                  {t({ en: "Order Summary", ar: "ملخص الطلب" })}
                </h2>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-[#D6B79A]/60">{t({ en: "Items", ar: "عدد القطع" })}</dt>
                    <dd className="arabic-number font-semibold text-[#F5E6D8]">{result.item_count}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-[#D6B79A]/60">{t({ en: "Payment method", ar: "طريقة الدفع" })}</dt>
                    <dd className="font-semibold text-[#F5E6D8]">{paymentMethod}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-[#D6B79A]/60">{t({ en: "Payment status", ar: "حالة الدفع" })}</dt>
                    <dd className="font-semibold text-[#D6A373]">{paymentStatus}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-[#B6885E]/12 pt-3">
                    <dt className="font-semibold text-[#F5E6D8]">{t({ en: "Total", ar: "الإجمالي" })}</dt>
                    <dd className="arabic-number font-serif text-xl font-bold text-[#D6A373]">
                      {result.total} {t({ en: "EGP", ar: "ج.م" })}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="mb-8 rounded-xl border border-[#B6885E]/14 bg-[#0B0806]/40 p-5 text-center">
                <p className="text-sm leading-6 text-[#D6B79A]/55">
                  {t({
                    en: "The receipt details are available in the browser session that placed the order.",
                    ar: "تفاصيل الإيصال متاحة في جلسة المتصفح التي تم تقديم الطلب منها.",
                  })}
                </p>
                {orderId && (
                  <p className="mt-2 break-all text-xs text-[#D6B79A]/40" dir="ltr">
                    {orderId}
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/products"
                className="premium-button flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold"
              >
                {t({ en: "Continue Shopping", ar: "مواصلة التسوق" })}
                <ArrowRight className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
              </Link>
              <Link
                href="/"
                className="premium-button-outline flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold"
              >
                {t({ en: "Back to Home", ar: "العودة للرئيسية" })}
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#B6885E]/12 bg-[#120D09]/50 p-5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D6A373]/70">
              {t({ en: "Line Coffee Promise", ar: "وعد لاين كوفي" })}
            </p>
            <p className="mt-2 text-sm text-[#D6B79A]/60">
              {t({
                en: "Roasted within 72 hours of your order. Your coffee arrives at its most expressive.",
                ar: "محمصة خلال 72 ساعة من طلبك. تصل قهوتك في أعلى مستويات نضارتها.",
              })}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0806]" />}>
      <OrderSuccessContent />
    </Suspense>
  );
}

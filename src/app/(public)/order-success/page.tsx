"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle, ShoppingBag } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { useCart } from "@/lib/context/cart";
import type { CartItem } from "@/lib/context/cart";
import { cn } from "@/lib/utils/cn";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") ?? "LC-000001";
  const { t, dir } = useLanguage();
  const { clearCart } = useCart();
  const [snapshot, setSnapshot] = useState<CartItem[] | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("line-order-snapshot");
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSnapshot(JSON.parse(raw) as CartItem[]);
        window.sessionStorage.removeItem("line-order-snapshot");
      }
    } catch {
      // sessionStorage unavailable
    }
    clearCart();
    setReady(true);
  // clearCart is stable (useCallback), safe dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snapshotTotal = snapshot
    ? snapshot.reduce((s, i) => s + i.pricePerUnit * i.qty, 0)
    : 0;

  if (!ready) {
    return <div className="min-h-screen bg-[#0B0806]" />;
  }

  return (
    <div className="arabic-body min-h-screen bg-[#0B0806] text-[#F5E6D8]">

      {/* ── Hero bar ── */}
      <section className="products-hero relative overflow-hidden pb-10 pt-28 lg:pt-36">
        <div className="absolute inset-0 bg-[#0B0806]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#B6885E]/22 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#B6885E]">
            {t({ en: "Order Confirmed", ar: "تم تأكيد الطلب" })}
          </p>
          <h1 className="font-serif text-3xl font-bold text-[#F5E6D8] sm:text-4xl">
            {t({ en: "Thank You!", ar: "شكراً لك!" })}
          </h1>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="cinematic-section section-bg-warm pb-20 pt-12">
        <div className="relative z-10 mx-auto max-w-2xl px-4">

          {/* Success card */}
          <div className="rounded-2xl border border-[#B6885E]/18 bg-[#120D09]/72 p-8 shadow-[0_16px_48px_rgba(0,0,0,0.32)] md:p-10">

            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <CheckCircle className="h-9 w-9" />
              </div>
            </div>

            {/* Order number */}
            <div className="mb-8 text-center">
              <p className="mb-2 text-sm text-[#D6B79A]/60">
                {t({ en: "Your order number", ar: "رقم طلبك" })}
              </p>
              <p className="font-serif text-3xl font-bold tracking-wide text-[#D6A373]" dir="ltr">
                {orderNumber}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#D6B79A]/60">
                {t({
                  en: "Our team will contact you shortly to confirm your delivery details.",
                  ar: "سيتواصل فريقنا معك قريباً لتأكيد تفاصيل التوصيل.",
                })}
              </p>
            </div>

            {/* Gold divider */}
            <div className="mb-8 h-px bg-gradient-to-r from-transparent via-[#B6885E]/25 to-transparent" />

            {/* Order snapshot */}
            {snapshot && snapshot.length > 0 ? (
              <div className="mb-8">
                <h2 className="mb-4 font-serif text-lg font-bold text-[#F5E6D8]">
                  {t({ en: "Your Order", ar: "طلبك" })}
                </h2>
                <div className="space-y-3">
                  {snapshot.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-xl border border-[#B6885E]/14 bg-[#0B0806]/40 p-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D6A373]/18 bg-[#D6A373]/8 text-[#D6A373]">
                        <ShoppingBag className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#F5E6D8]/88">
                          {t(item.name)}
                        </p>
                        <p className="truncate text-[10px] text-[#D6B79A]/48">
                          {t(item.detail)}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="arabic-number text-sm font-bold text-[#D6A373]">
                          {item.pricePerUnit * item.qty}{" "}
                          {t({ en: "EGP", ar: "ج.م" })}
                        </p>
                        <p className="arabic-number text-[10px] text-[#D6B79A]/45">
                          ×{item.qty}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-[#B6885E]/14 bg-[#0B0806]/40 px-4 py-3">
                  <span className="text-sm font-semibold text-[#D6B79A]/65">
                    {t({ en: "Total paid", ar: "الإجمالي المدفوع" })}
                  </span>
                  <span className="arabic-number font-serif text-lg font-bold text-[#D6A373]">
                    {snapshotTotal} {t({ en: "EGP", ar: "ج.م" })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mb-8 rounded-xl border border-[#B6885E]/14 bg-[#0B0806]/40 p-5 text-center">
                <p className="text-sm text-[#D6B79A]/55">
                  {t({
                    en: "Your order has been received and is being processed.",
                    ar: "تم استلام طلبك وجارٍ معالجته.",
                  })}
                </p>
              </div>
            )}

            {/* CTAs */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/products"
                className="premium-button flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold"
              >
                {t({ en: "Continue Shopping", ar: "مواصلة التسوق" })}
                <ArrowRight
                  className={cn("h-4 w-4", dir === "rtl" && "rotate-180")}
                />
              </Link>
              <Link
                href="/"
                className="premium-button-outline flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold"
              >
                {t({ en: "Back to Home", ar: "العودة للرئيسية" })}
              </Link>
            </div>
          </div>

          {/* Freshness note */}
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

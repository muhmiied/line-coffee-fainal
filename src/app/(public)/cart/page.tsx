"use client";

import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { useCart } from "@/lib/context/cart";
import { cn } from "@/lib/utils/cn";

export default function CartPage() {
  const { t, dir } = useLanguage();
  const { items, total, removeItem, updateQty, clearCart } = useCart();

  const deliveryFee = total >= 500 ? 0 : 50;
  const grandTotal = total + deliveryFee;

  return (
    <div className="arabic-body min-h-screen bg-[#0B0806] text-[#F5E6D8]">

      {/* ── Hero bar ── */}
      <section className="products-hero relative overflow-hidden pb-10 pt-28 lg:pt-36">
        <div className="absolute inset-0 bg-[#0B0806]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#B6885E]/22 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#B6885E]">
            {t({ en: "Shopping", ar: "التسوق" })}
          </p>
          <h1 className="font-serif text-3xl font-bold text-[#F5E6D8] sm:text-4xl">
            {t({ en: "Your Cart", ar: "سلتك" })}
          </h1>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="cinematic-section section-bg-warm pb-20 pt-12">
        <div className="relative z-10 mx-auto max-w-7xl px-4">

          {items.length === 0 ? (
            /* Empty state */
            <div className="mx-auto max-w-md py-20 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#D6A373]/25 bg-[radial-gradient(circle_at_35%_20%,rgba(214,163,115,0.28),rgba(11,8,6,0.70))] text-[#D6A373]">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h2 className="mb-3 font-serif text-2xl font-bold text-[#F5E6D8]">
                {t({ en: "Your cart is empty", ar: "سلتك فارغة" })}
              </h2>
              <p className="mb-8 text-sm leading-relaxed text-[#D6B79A]/60">
                {t({
                  en: "Choose a blend and your coffee ritual starts here.",
                  ar: "اختر خلطة وسيبدأ طقس قهوتك من هنا.",
                })}
              </p>
              <Link
                href="/products"
                className="premium-button inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold"
              >
                {t({ en: "Browse Coffee", ar: "تصفح القهوة" })}
                <ArrowRight
                  className={cn("h-4 w-4", dir === "rtl" && "rotate-180")}
                />
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">

              {/* ── Items list ── */}
              <div className="lg:col-span-2">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-serif text-lg font-bold text-[#F5E6D8]">
                    {t({ en: "Items", ar: "المنتجات" })}
                    <span className="arabic-number ml-2 text-sm font-normal text-[#D6B79A]/55">
                      ({items.length})
                    </span>
                  </h2>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#D6B79A]/45 transition-colors hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t({ en: "Clear all", ar: "مسح الكل" })}
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 rounded-2xl border border-[#B6885E]/14 bg-[#120D09]/68 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.22)]"
                    >
                      {/* Icon placeholder */}
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#D6A373]/18 bg-[#D6A373]/8 text-[#D6A373]">
                        <ShoppingBag className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#F5E6D8]/90">
                          {t(item.name)}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-[#D6B79A]/50">
                          {t(item.detail)}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          {/* Qty controls */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, -1)}
                              aria-label={t({ en: "Decrease quantity", ar: "تقليل الكمية" })}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B6885E]/22 bg-[#0B0806]/50 text-[#D6B79A] transition-all hover:border-[#D6A373]/40 hover:text-[#F5E6D8]"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="arabic-number w-7 text-center text-sm font-semibold text-[#F5E6D8]">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, 1)}
                              aria-label={t({ en: "Increase quantity", ar: "زيادة الكمية" })}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B6885E]/22 bg-[#0B0806]/50 text-[#D6B79A] transition-all hover:border-[#D6A373]/40 hover:text-[#F5E6D8]"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="arabic-number text-sm font-bold text-[#D6A373]">
                              {item.pricePerUnit * item.qty}{" "}
                              {t({ en: "EGP", ar: "ج.م" })}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              aria-label={t({ en: "Remove item", ar: "حذف المنتج" })}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B6885E]/14 text-[#D6B79A]/45 transition-all hover:border-red-500/30 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-[#D6A373]/70 transition-colors hover:text-[#D6A373]"
                  >
                    {dir === "rtl" ? (
                      <ArrowRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                    )}
                    {t({ en: "Continue shopping", ar: "مواصلة التسوق" })}
                  </Link>
                </div>
              </div>

              {/* ── Order Summary ── */}
              <div>
                <div className="sticky top-[7.5rem] rounded-2xl border border-[#B6885E]/18 bg-[#120D09]/72 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.32)]">
                  <h2 className="mb-6 font-serif text-lg font-bold text-[#F5E6D8]">
                    {t({ en: "Order Summary", ar: "ملخص الطلب" })}
                  </h2>

                  <div className="space-y-3 border-b border-[#B6885E]/12 pb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#D6B79A]/65">
                        {t({ en: "Subtotal", ar: "المجموع الجزئي" })}
                      </span>
                      <span className="arabic-number font-semibold text-[#F5E6D8]">
                        {total} {t({ en: "EGP", ar: "ج.م" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#D6B79A]/65">
                        {t({ en: "Delivery", ar: "التوصيل" })}
                      </span>
                      <span
                        className={cn(
                          "arabic-number font-semibold",
                          deliveryFee === 0
                            ? "text-emerald-400"
                            : "text-[#F5E6D8]",
                        )}
                      >
                        {deliveryFee === 0
                          ? t({ en: "Free", ar: "مجاني" })
                          : `${deliveryFee} ${t({ en: "EGP", ar: "ج.م" })}`}
                      </span>
                    </div>
                    {deliveryFee > 0 && (
                      <p className="text-[10px] text-[#D6B79A]/38">
                        {t({
                          en: "Free delivery on orders 500 EGP+",
                          ar: "توصيل مجاني للطلبات فوق 500 ج.م",
                        })}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#F5E6D8]">
                      {t({ en: "Total", ar: "الإجمالي" })}
                    </span>
                    <span className="arabic-number font-serif text-xl font-bold text-[#D6A373]">
                      {grandTotal} {t({ en: "EGP", ar: "ج.م" })}
                    </span>
                  </div>

                  <Link
                    href="/checkout"
                    className="premium-button mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold"
                  >
                    {t({ en: "Proceed to Checkout", ar: "إتمام الطلب" })}
                    <ArrowRight
                      className={cn("h-4 w-4", dir === "rtl" && "rotate-180")}
                    />
                  </Link>

                  <p className="mt-4 text-center text-[10px] text-[#D6B79A]/38">
                    {t({
                      en: "Secure order · Cash on delivery",
                      ar: "طلب آمن · الدفع عند الاستلام",
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import { ArrowRight, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { CartItem } from "@/lib/context/cart";
import type { PromoValidationResult } from "@/lib/types/marketing";
import { PromoSection } from "./PromoSection";
import type { DeliveryZonePreview, FormData, TranslateFn } from "./types";

type OrderSummaryProps = {
  t: TranslateFn;
  dir: string;
  items: CartItem[];
  total: number;
  promoDiscount: number;
  deliveryZone: DeliveryZonePreview;
  deliveryFee: number;
  grandTotal: number;
  submitting: boolean;
  storeClosed: boolean;
  submitError: string | null;
  paymentMethod: FormData["paymentMethod"];
  promoCode: string;
  onPromoCodeChange: (rawValue: string) => void;
  onApplyPromo: () => void;
  validatingPromo: boolean;
  promoResult: PromoValidationResult | null;
  promoMatchesSubtotal: boolean;
};

export function OrderSummary({
  t,
  dir,
  items,
  total,
  promoDiscount,
  deliveryZone,
  deliveryFee,
  grandTotal,
  submitting,
  storeClosed,
  submitError,
  paymentMethod,
  promoCode,
  onPromoCodeChange,
  onApplyPromo,
  validatingPromo,
  promoResult,
  promoMatchesSubtotal,
}: OrderSummaryProps) {
  return (
    <div className="sticky top-[7.5rem] rounded-2xl border border-[#B6885E]/18 bg-[#120D09]/72 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.32)]">
      <h2 className="mb-5 font-serif text-lg font-bold text-[#F5E6D8]">
        {t({ en: "Order Summary", ar: "ملخص الطلب" })}
      </h2>

      <div className="mb-4 max-h-48 space-y-2.5 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#D6A373]/18 bg-[#D6A373]/8 text-[#D6A373]">
              <ShoppingBag className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#F5E6D8]/85">{t(item.name)}</p>
              <p className="truncate text-[10px] text-[#D6B79A]/80">{t(item.detail)}</p>
            </div>
            <span className="arabic-number shrink-0 text-xs font-bold text-[#D6A373]">
              {item.pricePerUnit * item.qty}
            </span>
          </div>
        ))}
      </div>

      <PromoSection
        t={t}
        promoCode={promoCode}
        onPromoCodeChange={onPromoCodeChange}
        onApply={onApplyPromo}
        validatingPromo={validatingPromo}
        promoResult={promoResult}
        promoMatchesSubtotal={promoMatchesSubtotal}
      />

      <div className="space-y-2.5 border-t border-[#B6885E]/12 pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-[#D6B79A]/72">{t({ en: "Subtotal", ar: "المجموع الجزئي" })}</span>
          <span className="arabic-number font-semibold text-[#F5E6D8]">
            {total} {t({ en: "EGP", ar: "ج.م" })}
          </span>
        </div>
        {promoDiscount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[#D6B79A]/72">
              {t({ en: "Product discount", ar: "خصم المنتجات" })}
            </span>
            <span className="arabic-number font-semibold text-emerald-400">
              -{promoDiscount} {t({ en: "EGP", ar: "ج.م" })}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-[#D6B79A]/72">{t({ en: "Delivery", ar: "التوصيل" })}</span>
          {deliveryZone === null ? (
            <span className="text-[#D6B79A]/80">
              {t({ en: "Select address", ar: "اختر العنوان" })}
            </span>
          ) : deliveryZone.zone === "governorate_courier" ? (
            <span className="font-semibold text-emerald-400">
              {t({ en: "Paid to courier", ar: "يُدفع للمندوب" })}
            </span>
          ) : (
            <span className="arabic-number font-semibold text-[#F5E6D8]">
              {`${deliveryFee} ${t({ en: "EGP", ar: "ج.م" })}`}
            </span>
          )}
        </div>
        {deliveryZone?.zone === "governorate_courier" && (
          <p className="text-[10px] leading-4 text-[#D6B79A]/78">
            {t({
              en: "Outside Cairo & Giza — the courier collects the delivery fee on arrival.",
              ar: "خارج القاهرة والجيزة — يحصّل المندوب رسوم التوصيل عند الوصول.",
            })}
          </p>
        )}
        <div className="flex items-center justify-between border-t border-[#B6885E]/12 pt-3">
          <span className="font-bold text-[#F5E6D8]">{t({ en: "Total", ar: "الإجمالي" })}</span>
          <span className="arabic-number font-serif text-xl font-bold text-[#D6A373]">
            {grandTotal} {t({ en: "EGP", ar: "ج.م" })}
          </span>
        </div>
      </div>

      {submitError && (
        <div
          role="alert"
          aria-live="polite"
          className="mt-5 rounded-xl border border-red-400/25 bg-red-400/8 px-4 py-3 text-sm leading-6 text-red-200"
        >
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || storeClosed}
        className={cn(
          "premium-button mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold",
          (submitting || storeClosed) && "opacity-60",
        )}
      >
        {storeClosed
          ? t({ en: "Store closed", ar: "المتجر مغلق" })
          : submitting
          ? t({ en: "Placing order…", ar: "جاري تقديم الطلب…" })
          : t({ en: "Place Order", ar: "تأكيد الطلب" })}
        {!submitting && !storeClosed && (
          <ArrowRight className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
        )}
      </button>

      <p className="mt-3 text-center text-[10px] text-[#D6B79A]/75">
        {paymentMethod === "cash"
          ? t({ en: "Pay when delivered", ar: "الدفع عند الاستلام" })
          : paymentMethod === "instapay"
          ? t({ en: "InstaPay details sent after confirmation", ar: "تفاصيل إنستا باي بعد التأكيد" })
          : t({ en: "Wallet details sent after confirmation", ar: "تفاصيل المحفظة بعد التأكيد" })}
      </p>
    </div>
  );
}

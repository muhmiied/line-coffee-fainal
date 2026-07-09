"use client";

import { Tag } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PromoValidationResult } from "@/lib/types/marketing";
import { inputClass } from "./CheckoutPrimitives";
import type { TranslateFn } from "./types";

type PromoSectionProps = {
  t: TranslateFn;
  promoCode: string;
  onPromoCodeChange: (rawValue: string) => void;
  onApply: () => void;
  validatingPromo: boolean;
  promoResult: PromoValidationResult | null;
  promoMatchesSubtotal: boolean;
};

export function PromoSection({
  t,
  promoCode,
  onPromoCodeChange,
  onApply,
  validatingPromo,
  promoResult,
  promoMatchesSubtotal,
}: PromoSectionProps) {
  function getPromoFeedback(result: PromoValidationResult) {
    if (result.status === "valid" && promoMatchesSubtotal) {
      return t({
        en: `${result.code} applied — ${result.discountTotal} EGP off the product subtotal.`,
        ar: `تم تطبيق ${result.code} — خصم ${result.discountTotal} ج.م من قيمة المنتجات.`,
      });
    }
    if (result.status === "valid") {
      return t({
        en: "Your cart changed. Apply the promo code again to refresh the discount.",
        ar: "تغيرت السلة. أعد تطبيق كود الخصم لتحديث قيمة الخصم.",
      });
    }

    const messages: Record<
      PromoValidationResult["status"],
      { en: string; ar: string }
    > = {
      valid: { en: "", ar: "" },
      invalid: {
        en: "This promo code is invalid.",
        ar: "كود الخصم غير صالح.",
      },
      not_started: {
        en: "This promo code is not active yet.",
        ar: "كود الخصم غير متاح للاستخدام بعد.",
      },
      expired: {
        en: "This promo code has expired.",
        ar: "انتهت صلاحية كود الخصم.",
      },
      inactive: {
        en: "This promo code is inactive.",
        ar: "كود الخصم غير نشط.",
      },
      usage_limit_reached: {
        en: "This promo code has reached its usage limit.",
        ar: "وصل كود الخصم إلى الحد الأقصى للاستخدام.",
      },
      minimum_not_met: {
        en: result.minimumSubtotal
          ? `Product subtotal must be at least ${result.minimumSubtotal} EGP for this code.`
          : "The product subtotal does not meet this code's minimum.",
        ar: result.minimumSubtotal
          ? `يجب ألا تقل قيمة المنتجات عن ${result.minimumSubtotal} ج.م لاستخدام هذا الكود.`
          : "قيمة المنتجات لا تحقق الحد الأدنى المطلوب لهذا الكود.",
      },
      customer_limit_reached: {
        en: "You have reached the usage limit for this promo code.",
        ar: "لقد وصلت إلى الحد المسموح لاستخدام كود الخصم.",
      },
    };
    return t(messages[result.status]);
  }

  return (
    <div className="mb-4 border-t border-[#B6885E]/12 pt-4">
      <label
        htmlFor="promo-code"
        className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#D6B79A]/60"
      >
        <Tag className="h-3.5 w-3.5" />
        {t({ en: "Promo code", ar: "كود الخصم" })}
      </label>
      <div className="flex gap-2">
        <input
          id="promo-code"
          value={promoCode}
          onChange={(event) => onPromoCodeChange(event.target.value)}
          maxLength={32}
          autoComplete="off"
          placeholder={t({ en: "Enter code", ar: "أدخل الكود" })}
          className={cn(inputClass, "uppercase")}
        />
        <button
          type="button"
          onClick={onApply}
          disabled={validatingPromo || !promoCode.trim()}
          className="shrink-0 rounded-xl border border-[#D6A373]/25 px-4 text-xs font-semibold text-[#D6A373] transition hover:bg-[#D6A373]/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {validatingPromo
            ? t({ en: "Checking…", ar: "جارٍ التحقق…" })
            : t({ en: "Apply", ar: "تطبيق" })}
        </button>
      </div>
      {promoResult && (
        <p
          role="status"
          className={cn(
            "mt-2 text-[11px]",
            promoResult.status === "valid" && promoMatchesSubtotal
              ? "text-emerald-400"
              : "text-red-300",
          )}
        >
          {getPromoFeedback(promoResult)}
        </p>
      )}
      <p className="mt-2 text-[10px] leading-4 text-[#D6B79A]/42">
        {t({
          en: "Discount applies to product subtotal only. Delivery fee is calculated separately and is not discounted.",
          ar: "يُطبق الخصم على قيمة المنتجات فقط. تُحسب رسوم التوصيل بشكل منفصل ولا يشملها الخصم.",
        })}
      </p>
    </div>
  );
}

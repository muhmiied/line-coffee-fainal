"use client";

import { Banknote, Wallet, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { FieldLabel, inputClass } from "./CheckoutPrimitives";
import type { FormData, TranslateFn } from "./types";

const PAYMENT_OPTIONS = [
  {
    key:     "cash"     as const,
    labelEn: "Cash on Delivery",           labelAr: "كاش",
    descEn:  "Pay when delivered",         descAr:  "ادفع عند الاستلام",
    Icon:    Banknote,
  },
  {
    key:     "instapay" as const,
    labelEn: "InstaPay",                   labelAr: "إنستا باي",
    descEn:  "Bank transfer via InstaPay", descAr:  "تحويل بنكي عبر إنستا باي",
    Icon:    Zap,
  },
  {
    key:     "e-wallet" as const,
    labelEn: "E-Wallet",                   labelAr: "محفظة إلكترونية",
    descEn:  "Vodafone Cash & others",     descAr:  "فودافون كاش وغيره",
    Icon:    Wallet,
  },
];

type PaymentSectionProps = {
  t: TranslateFn;
  dir: string;
  form: FormData;
  update: (field: keyof FormData, value: string) => void;
};

export function PaymentSection({ t, dir, form, update }: PaymentSectionProps) {
  return (
    <div className="rounded-2xl border border-[#B6885E]/14 bg-[#120D09]/68 p-6">
      <h2 className="mb-6 font-serif text-lg font-bold text-[#F5E6D8]">
        {t({ en: "Payment Method", ar: "طريقة الدفع" })}
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {PAYMENT_OPTIONS.map(({ key, labelEn, labelAr, descEn, descAr, Icon }) => {
          const active = form.paymentMethod === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => update("paymentMethod", key)}
              aria-pressed={active ? "true" : "false"}
              className={cn(
                "rounded-xl border p-4 text-start transition-all",
                active
                  ? "border-[#D6A373]/40 bg-[#D6A373]/8 ring-1 ring-[#D6A373]/22"
                  : "border-[#B6885E]/18 hover:border-[#B6885E]/35",
              )}
            >
              <Icon className={cn("mb-2.5 h-4 w-4", active ? "text-[#D6A373]" : "text-[#B6885E]/70")} />
              <p className="text-sm font-semibold text-[#F5E6D8]">
                {t({ en: labelEn, ar: labelAr })}
              </p>
              <p className="mt-0.5 text-[11px] text-[#D6B79A]/68">
                {t({ en: descEn, ar: descAr })}
              </p>
            </button>
          );
        })}
      </div>

      {form.paymentMethod === "instapay" && (
        <div className="mt-4">
          <FieldLabel label={t({
            en: "InstaPay reference (optional)",
            ar: "رقم مرجع إنستا باي (اختياري)",
          })} />
          <input
            type="text"
            value={form.paymentReference}
            onChange={(e) => update("paymentReference", e.target.value)}
            placeholder={t({
              en: "Transfer reference or sender name",
              ar: "رقم التحويل أو اسم المرسل",
            })}
            dir={dir}
            className={inputClass}
          />
        </div>
      )}

      {form.paymentMethod === "e-wallet" && (
        <div className="mt-4">
          <FieldLabel label={t({
            en: "Wallet phone (optional)",
            ar: "رقم المحفظة (اختياري)",
          })} />
          <input
            type="tel"
            value={form.paymentPhone}
            onChange={(e) => update("paymentPhone", e.target.value)}
            placeholder="+20 1XX XXX XXXX"
            dir="ltr"
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
}

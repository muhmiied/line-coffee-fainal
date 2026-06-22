"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/context/language";
import { AccountShell } from "@/components/layout/account/AccountShell";
import { cn } from "@/lib/utils/cn";

function ToggleRow({
  id,
  label,
  description,
  value,
  onChange,
}: {
  id:          string;
  label:       string;
  description: string;
  value:       boolean;
  onChange:    (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-[#F5E6D8]">{label}</label>
        <p className="mt-0.5 text-xs text-[#B79B85]/60">{description}</p>
      </div>
      {/* Visually styled toggle backed by a real checkbox */}
      <label htmlFor={id} className="relative cursor-pointer">
        <input
          id={id}
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          className={cn(
            "block h-6 w-10 rounded-full border transition-colors",
            value ? "border-[#B6885E]/50 bg-[#B6885E]/30" : "border-[#B6885E]/15 bg-[#1B140F]",
          )}
        />
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-[#B6885E] shadow-sm transition-transform",
            value ? "start-[1.25rem]" : "start-0.5",
          )}
        />
      </label>
    </div>
  );
}

export default function SettingsPage() {
  const { t, language } = useLanguage();

  const [orderNotifs,    setOrderNotifs]    = useState(true);
  const [promoNotifs,    setPromoNotifs]    = useState(false);
  const [roastNotifs,    setRoastNotifs]    = useState(true);

  const divider = <div className="h-px bg-[#B6885E]/08" />;

  return (
    <AccountShell title={{ en: "Settings", ar: "الإعدادات" }}>
      <div className="max-w-xl space-y-6">

        {/* Language */}
        <div className="rounded-xl border border-[#B6885E]/12 bg-[#120D09] px-5 py-1">
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-medium text-[#F5E6D8]">
                {t({ en: "Language", ar: "اللغة" })}
              </p>
              <p className="mt-0.5 text-xs text-[#B79B85]/60">
                {t({ en: "Currently: English", ar: "الحالية: العربية" })}
              </p>
            </div>
            <div className="flex gap-2">
              {(["en", "ar"] as const).map((code) => (
                <button
                  key={code}
                  onClick={() => {
                    document.documentElement.dataset.language = code;
                    document.documentElement.dir  = code === "ar" ? "rtl" : "ltr";
                    document.documentElement.lang = code;
                    localStorage.setItem("lang", code);
                    window.location.reload();
                  }}
                  className={cn(
                    "rounded-lg border px-4 py-1.5 text-sm transition-all",
                    language === code
                      ? "border-[#B6885E]/40 bg-[#B6885E]/12 text-[#D6A373]"
                      : "border-[#B6885E]/12 text-[#B79B85]/60 hover:border-[#B6885E]/25 hover:text-[#D6B79A]",
                  )}
                >
                  {code === "en" ? "English" : "العربية"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-[#B6885E]/12 bg-[#120D09] px-5 py-1">
          <p className="py-4 text-xs font-semibold uppercase tracking-wider text-[#B6885E]/70">
            {t({ en: "Notifications", ar: "الإشعارات" })}
          </p>
          {divider}
          <ToggleRow
            id="notif-orders"
            label={t({ en: "Order updates", ar: "تحديثات الطلبات" })}
            description={t({ en: "Roasting, shipping, and delivery status", ar: "حالة التحميص والشحن والتوصيل" })}
            value={orderNotifs}
            onChange={setOrderNotifs}
          />
          {divider}
          <ToggleRow
            id="notif-roast"
            label={t({ en: "Roast notifications", ar: "إشعارات التحميص" })}
            description={t({ en: "Alerts when a new roast batch is ready", ar: "تنبيه عند تجهيز دفعة تحميص جديدة" })}
            value={roastNotifs}
            onChange={setRoastNotifs}
          />
          {divider}
          <ToggleRow
            id="notif-promo"
            label={t({ en: "Promotions & offers", ar: "العروض والخصومات" })}
            description={t({ en: "Occasional offers — we don't spam", ar: "عروض عرضية، لن نزعجك" })}
            value={promoNotifs}
            onChange={setPromoNotifs}
          />
        </div>

        {/* Account danger zone */}
        <div className="rounded-xl border border-red-500/10 bg-[#120D09] px-5 py-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-400/60">
            {t({ en: "Account", ar: "الحساب" })}
          </p>
          <Link
            href="/auth/login"
            className="block text-sm text-[#B79B85]/60 transition-colors hover:text-red-400/70"
          >
            {t({ en: "Sign out of all devices", ar: "تسجيل الخروج من جميع الأجهزة" })}
          </Link>
        </div>
      </div>
    </AccountShell>
  );
}

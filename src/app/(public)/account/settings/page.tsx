"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/context/language";
import { useAuth } from "@/lib/hooks/useAuth";
import { AccountShell } from "@/components/layout/account/AccountShell";
import { cn } from "@/lib/utils/cn";

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { signOutEverywhere } = useAuth();
  const router = useRouter();

  const [isSigningOutEverywhere, setIsSigningOutEverywhere] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOutEverywhere = async () => {
    setIsSigningOutEverywhere(true);
    setSignOutError(null);
    try {
      await signOutEverywhere();
      router.replace("/auth/login");
    } catch {
      setSignOutError(
        t({
          en: "Couldn't sign out of all devices. Please check your connection and try again.",
          ar: "تعذّر تسجيل الخروج من جميع الأجهزة. تحقق من اتصالك وحاول مرة أخرى.",
        }),
      );
      setIsSigningOutEverywhere(false);
    }
  };

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
              <p className="mt-0.5 text-xs text-[#B79B85]/80">
                {t({ en: "Currently: English", ar: "الحالية: العربية" })}
              </p>
            </div>
            <div className="flex gap-2">
              {(["en", "ar"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  className={cn(
                    "rounded-lg border px-4 py-1.5 text-sm transition-all",
                    language === code
                      ? "border-[#B6885E]/40 bg-[#B6885E]/12 text-[#D6A373]"
                      : "border-[#B6885E]/12 text-[#B79B85]/80 hover:border-[#B6885E]/25 hover:text-[#D6B79A]",
                  )}
                >
                  {code === "en" ? "English" : "العربية"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Account danger zone */}
        <div className="rounded-xl border border-red-500/10 bg-[#120D09] px-5 py-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-400/60">
            {t({ en: "Account", ar: "الحساب" })}
          </p>
          <button
            type="button"
            onClick={handleSignOutEverywhere}
            disabled={isSigningOutEverywhere}
            className="text-sm text-[#B79B85]/80 transition-colors hover:text-red-400/70 disabled:opacity-60"
          >
            {isSigningOutEverywhere
              ? t({ en: "Signing out of all devices…", ar: "جارٍ تسجيل الخروج من جميع الأجهزة…" })
              : t({ en: "Sign out of all devices", ar: "تسجيل الخروج من جميع الأجهزة" })}
          </button>
          <p className="mt-1.5 text-xs text-[#B79B85]/55">
            {t({
              en: "Ends every signed-in session for your account, including this one.",
              ar: "ينهي كل جلسات الدخول النشطة لحسابك، بما فيها هذه الجلسة.",
            })}
          </p>
          {signOutError && (
            <p role="alert" className="mt-2 text-xs text-red-400">
              {signOutError}
            </p>
          )}
        </div>
      </div>
    </AccountShell>
  );
}

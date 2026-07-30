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
        <div className="account-card rounded-xl px-5 py-1">
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
                    "taste-filter-chip !min-h-0 !rounded-lg !px-4 !py-1.5 text-sm",
                    language === code && "is-active",
                  )}
                >
                  {code === "en" ? "English" : "العربية"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Account danger zone */}
        <div className="account-card rounded-xl border-red-500/20 px-5 py-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-400/60">
            {t({ en: "Account", ar: "الحساب" })}
          </p>
          <button
            type="button"
            onClick={handleSignOutEverywhere}
            disabled={isSigningOutEverywhere}
            className="account-secondary-button rounded-full px-4 py-2 text-sm transition-colors hover:text-red-300 disabled:opacity-60"
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

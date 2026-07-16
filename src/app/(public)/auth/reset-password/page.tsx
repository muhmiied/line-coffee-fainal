"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { AuthCard } from "@/components/layout/auth/AuthCard";
import { supabase } from "@/lib/supabase/client";

// Phases of the recovery flow. The recovery email link returns the user here
// with recovery tokens in the URL; the browser client (detectSessionInUrl)
// exchanges them for a short-lived session and fires PASSWORD_RECOVERY. Only
// then can we call updateUser({ password }).
type Phase = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";

  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = !confirm || password === confirm;
  const valid = password.length >= 8 && password === confirm;

  useEffect(() => {
    let active = true;

    // The recovery event can arrive either before or after this listener
    // attaches, so we both subscribe AND poll getSession once.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) setPhase("ready");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        setPhase("ready");
      } else {
        // Give detectSessionInUrl a moment to process the recovery hash/code
        // before deciding the link is unusable.
        setTimeout(() => {
          if (active) setPhase((prev) => (prev === "checking" ? "invalid" : prev));
        }, 1500);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t({
              en: "Could not update your password. Please request a new link.",
              ar: "تعذر تحديث كلمة المرور. يرجى طلب رابط جديد.",
            }),
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-[#B6885E]/22 bg-[#120D09]/70 px-4 py-3 text-sm text-[#F5E6D8] placeholder-[#D6B79A]/38 outline-none transition-all focus:border-[#D6A373]/50 focus:ring-2 focus:ring-[#D6A373]/18";

  if (phase === "checking") {
    return (
      <AuthCard
        title={{ en: "Set new password", ar: "تعيين كلمة مرور جديدة" }}
        subtitle={{
          en: "Verifying your reset link…",
          ar: "جارٍ التحقق من رابط إعادة التعيين…",
        }}
      >
        <div className="space-y-3 py-2">
          <div className="h-11 animate-pulse rounded-lg bg-[#B6885E]/10" />
          <div className="h-11 animate-pulse rounded-lg bg-[#B6885E]/10" />
          <div className="h-11 animate-pulse rounded-lg bg-[#B6885E]/8" />
        </div>
      </AuthCard>
    );
  }

  if (phase === "invalid") {
    return (
      <AuthCard
        title={{ en: "Invalid or expired link", ar: "رابط غير صالح أو منتهي" }}
        subtitle={{
          en: "This reset link is missing or has expired.",
          ar: "رابط إعادة التعيين مفقود أو منتهي الصلاحية.",
        }}
      >
        <div className="py-2 text-center">
          <Link href="/auth/forgot-password" className="premium-button inline-block px-8 py-3 text-sm">
            {t({ en: "Request new link", ar: "طلب رابط جديد" })}
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        title={{ en: "Password updated", ar: "تم تحديث كلمة المرور" }}
        subtitle={{
          en: "Your password has been reset successfully.",
          ar: "تم إعادة تعيين كلمة مرورك بنجاح.",
        }}
      >
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#B6885E]/15">
            <svg className="h-6 w-6 text-[#B6885E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <Link href="/auth/login" className="premium-button inline-block px-8 py-3 text-sm">
            {t({ en: "Sign in", ar: "تسجيل الدخول" })}
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={{ en: "Set new password", ar: "تعيين كلمة مرور جديدة" }}
      subtitle={{
        en: "Choose a strong password for your account.",
        ar: "اختر كلمة مرور قوية لحسابك.",
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* New password */}
        <div>
          <label htmlFor="reset-password" className="mb-1.5 block text-xs font-medium text-[#D6B79A]/80">
            {t({ en: "New password", ar: "كلمة المرور الجديدة" })}
          </label>
          <div className="relative">
            <input
              id="reset-password"
              name="password"
              type={showPass ? "text" : "password"}
              autoComplete="new-password"
              required
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${inputClass} ${isRtl ? "pl-10" : "pr-10"}`}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className={`absolute top-1/2 -translate-y-1/2 text-[#B79B85]/70 hover:text-[#B6885E] ${isRtl ? "left-3" : "right-3"}`}
              aria-label={showPass ? t({ en: "Hide password", ar: "إخفاء كلمة المرور" }) : t({ en: "Show password", ar: "إظهار كلمة المرور" })}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password && password.length < 8 && (
            <p className="mt-1.5 text-xs text-[#B6885E]/70">
              {t({ en: "At least 8 characters", ar: "8 أحرف على الأقل" })}
            </p>
          )}
        </div>

        {/* Confirm */}
        <div>
          <label htmlFor="reset-confirm" className="mb-1.5 block text-xs font-medium text-[#D6B79A]/80">
            {t({ en: "Confirm new password", ar: "تأكيد كلمة المرور" })}
          </label>
          <div className="relative">
            <input
              id="reset-confirm"
              name="password-confirmation"
              type={showConf ? "text" : "password"}
              autoComplete="new-password"
              required
              dir="ltr"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={`${inputClass} ${isRtl ? "pl-10" : "pr-10"} ${!passwordsMatch ? "border-red-500/40" : ""}`}
            />
            <button
              type="button"
              onClick={() => setShowConf((v) => !v)}
              className={`absolute top-1/2 -translate-y-1/2 text-[#B79B85]/70 hover:text-[#B6885E] ${isRtl ? "left-3" : "right-3"}`}
              aria-label={showConf ? t({ en: "Hide confirm password", ar: "إخفاء تأكيد كلمة المرور" }) : t({ en: "Show confirm password", ar: "إظهار تأكيد كلمة المرور" })}
            >
              {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {!passwordsMatch && (
            <p className="mt-1.5 text-xs text-red-400/80">
              {t({ en: "Passwords do not match", ar: "كلمتا المرور غير متطابقتين" })}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !valid}
          className="premium-button mt-2 w-full py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? t({ en: "Updating…", ar: "جارٍ التحديث…" })
            : t({ en: "Update password", ar: "تحديث كلمة المرور" })}
        </button>

        {error ? (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </form>
    </AuthCard>
  );
}

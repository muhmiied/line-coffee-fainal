"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { AuthCard } from "@/components/layout/auth/AuthCard";

function ResetPasswordForm() {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  const passwordsMatch = !confirm || password === confirm;
  const valid = password.length >= 8 && password === confirm;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setDone(true); }, 1000);
  };

  const inputClass =
    "w-full rounded-lg border border-[#B6885E]/15 bg-[#1B140F] px-4 py-3 text-sm text-[#F5E6D8] placeholder-[#B79B85]/40 transition-colors focus:border-[#B6885E]/40 focus:outline-none";

  if (!token) {
    return (
      <AuthCard
        title={{ en: "Invalid link", ar: "رابط غير صالح" }}
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
          <label className="mb-1.5 block text-xs font-medium text-[#D6B79A]/80">
            {t({ en: "New password", ar: "كلمة المرور الجديدة" })}
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
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
              className={`absolute top-1/2 -translate-y-1/2 text-[#B79B85]/50 hover:text-[#B6885E] ${isRtl ? "left-3" : "right-3"}`}
              aria-label="Toggle visibility"
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
          <label className="mb-1.5 block text-xs font-medium text-[#D6B79A]/80">
            {t({ en: "Confirm new password", ar: "تأكيد كلمة المرور" })}
          </label>
          <div className="relative">
            <input
              type={showConf ? "text" : "password"}
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
              className={`absolute top-1/2 -translate-y-1/2 text-[#B79B85]/50 hover:text-[#B6885E] ${isRtl ? "left-3" : "right-3"}`}
              aria-label="Toggle visibility"
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
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

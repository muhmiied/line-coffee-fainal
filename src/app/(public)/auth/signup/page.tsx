"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { useAuth } from "@/lib/hooks/useAuth";
import { AuthCard } from "@/components/layout/auth/AuthCard";

export default function SignupPage() {
  const { t, dir } = useLanguage();
  const { signIn } = useAuth();
  const isRtl = dir === "rtl";

  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [done, setDone]             = useState(false);

  const passwordsMatch = !confirm || password === confirm;
  const valid = name && email && password.length >= 8 && password === confirm;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setTimeout(() => {
      signIn(name, email);
      setLoading(false);
      setDone(true);
    }, 1200);
  };

  const inputClass =
    "w-full rounded-lg border border-[#B6885E]/15 bg-[#1B140F] px-4 py-3 text-sm text-[#F5E6D8] placeholder-[#B79B85]/40 transition-colors focus:border-[#B6885E]/40 focus:outline-none";

  if (done) {
    return (
      <AuthCard
        title={{ en: "Account created", ar: "تم إنشاء الحساب" }}
        subtitle={{ en: "Welcome to Line Coffee.", ar: "أهلاً بك في لاين كوفي." }}
      >
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#B6885E]/15">
            <svg className="h-6 w-6 text-[#B6885E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="mb-5 text-sm text-[#B79B85]/70">
            {t({ en: "Your account is ready. You are now signed in.", ar: "حسابك جاهز. تم تسجيل دخولك تلقائياً." })}
          </p>
          <Link href="/" className="premium-button inline-block px-8 py-3 text-sm">
            {t({ en: "Go to Home", ar: "الصفحة الرئيسية" })}
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={{ en: "Create account", ar: "إنشاء حساب" }}
      subtitle={{ en: "Join Line Coffee for a better experience.", ar: "انضم إلى لاين كوفي لتجربة أفضل." }}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#D6B79A]/80">
            {t({ en: "Full name", ar: "الاسم الكامل" })}
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t({ en: "Your name", ar: "اسمك" })}
            className={inputClass}
          />
        </div>

        {/* Email */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#D6B79A]/80">
            {t({ en: "Email address", ar: "البريد الإلكتروني" })}
          </label>
          <input
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        {/* Password */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#D6B79A]/80">
            {t({ en: "Password", ar: "كلمة المرور" })}
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
              aria-label="Toggle password visibility"
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

        {/* Confirm password */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#D6B79A]/80">
            {t({ en: "Confirm password", ar: "تأكيد كلمة المرور" })}
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              required
              dir="ltr"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={`${inputClass} ${isRtl ? "pl-10" : "pr-10"} ${!passwordsMatch ? "border-red-500/40" : ""}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className={`absolute top-1/2 -translate-y-1/2 text-[#B79B85]/50 hover:text-[#B6885E] ${isRtl ? "left-3" : "right-3"}`}
              aria-label="Toggle confirm password visibility"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {!passwordsMatch && (
            <p className="mt-1.5 text-xs text-red-400/80">
              {t({ en: "Passwords do not match", ar: "كلمتا المرور غير متطابقتين" })}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !valid}
          className="premium-button mt-2 w-full py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? t({ en: "Creating account…", ar: "جارٍ الإنشاء…" })
            : t({ en: "Create account", ar: "إنشاء الحساب" })}
        </button>
      </form>

      {/* Sign in link */}
      <p className="mt-6 text-center text-sm text-[#B79B85]/60">
        {t({ en: "Already have an account?", ar: "لديك حساب بالفعل؟" })}{" "}
        <Link
          href="/auth/login"
          className="font-medium text-[#B6885E] transition-colors hover:text-[#D6A373]"
        >
          {t({ en: "Sign in", ar: "تسجيل الدخول" })}
        </Link>
      </p>
    </AuthCard>
  );
}

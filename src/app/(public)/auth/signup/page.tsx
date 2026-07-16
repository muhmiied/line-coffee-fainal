"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { useAuth } from "@/lib/hooks/useAuth";
import { resolvePostLoginDestination } from "@/lib/auth/admin";
import { AuthCard } from "@/components/layout/auth/AuthCard";

export default function SignupPage() {
  const { t, dir } = useLanguage();
  const { signUp } = useAuth();
  const router = useRouter();
  const isRtl = dir === "rtl";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = !confirm || password === confirm;
  const valid = name && email && password.length >= 8 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    setError(null);
    setLoading(true);

    try {
      const data = await signUp(name, email, password);
      setLoading(false);

      if (data.session) {
        const destination = await resolvePostLoginDestination("/");
        router.replace(destination);
        return;
      }

      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t({
              en: "Could not create the account. Please try again.",
              ar: "تعذر إنشاء الحساب. حاول مرة أخرى.",
            }),
      );
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-[#B6885E]/22 bg-[#120D09]/70 px-4 py-3 text-sm text-[#F5E6D8] placeholder-[#D6B79A]/38 outline-none transition-all focus:border-[#D6A373]/50 focus:ring-2 focus:ring-[#D6A373]/18";

  if (done) {
    return (
      <AuthCard
        title={{ en: "Check your email", ar: "تحقق من بريدك" }}
        subtitle={{
          en: "Your account request is ready. Confirm your email if Supabase email confirmation is enabled.",
          ar: "طلب الحساب جاهز. أكد بريدك الإلكتروني إذا كان تأكيد البريد مفعلا.",
        }}
      >
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#B6885E]/15">
            <svg className="h-6 w-6 text-[#B6885E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <Link href="/auth/login" className="premium-button inline-block px-8 py-3 text-sm">
            {t({ en: "Go to sign in", ar: "اذهب لتسجيل الدخول" })}
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
        <div>
          <label htmlFor="signup-name" className="mb-1.5 block text-xs font-medium text-[#D6B79A]/80">
            {t({ en: "Full name", ar: "الاسم الكامل" })}
          </label>
          <input
            id="signup-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t({ en: "Your name", ar: "اسمك" })}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="signup-email" className="mb-1.5 block text-xs font-medium text-[#D6B79A]/80">
            {t({ en: "Email address", ar: "البريد الإلكتروني" })}
          </label>
          <input
            id="signup-email"
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="signup-password" className="mb-1.5 block text-xs font-medium text-[#D6B79A]/80">
            {t({ en: "Password", ar: "كلمة المرور" })}
          </label>
          <div className="relative">
            <input
              id="signup-password"
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

        <div>
          <label htmlFor="signup-confirm" className="mb-1.5 block text-xs font-medium text-[#D6B79A]/80">
            {t({ en: "Confirm password", ar: "تأكيد كلمة المرور" })}
          </label>
          <div className="relative">
            <input
              id="signup-confirm"
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
              className={`absolute top-1/2 -translate-y-1/2 text-[#B79B85]/70 hover:text-[#B6885E] ${isRtl ? "left-3" : "right-3"}`}
              aria-label={showConfirm ? t({ en: "Hide confirm password", ar: "إخفاء تأكيد كلمة المرور" }) : t({ en: "Show confirm password", ar: "إظهار تأكيد كلمة المرور" })}
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

        <button
          type="submit"
          disabled={loading || !valid}
          className="premium-button mt-2 w-full py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? t({ en: "Creating account...", ar: "جار إنشاء الحساب..." })
            : t({ en: "Create account", ar: "إنشاء حساب" })}
        </button>

        {error ? (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </form>

      <p className="mt-6 text-center text-sm text-[#B79B85]/80">
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

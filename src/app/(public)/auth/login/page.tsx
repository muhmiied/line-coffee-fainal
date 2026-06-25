"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { useAuth } from "@/lib/hooks/useAuth";
import { resolvePostLoginDestination } from "@/lib/auth/admin";
import { AuthCard } from "@/components/layout/auth/AuthCard";

export default function LoginPage() {
  const { t, dir } = useLanguage();
  const { signIn } = useAuth();
  const router = useRouter();
  const isRtl = dir === "rtl";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      const fallback = next && next.startsWith("/") && !next.startsWith("/admin") ? next : "/";
      const destination = await resolvePostLoginDestination(fallback);
      router.replace(destination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t({
              en: "Could not sign in. Check your email and password.",
              ar: "تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.",
            }),
      );
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-[#B6885E]/15 bg-[#1B140F] px-4 py-3 text-sm text-[#F5E6D8] placeholder-[#B79B85]/40 transition-colors focus:border-[#B6885E]/40 focus:outline-none";

  return (
    <AuthCard
      title={{ en: "Sign in", ar: "تسجيل الدخول" }}
      subtitle={{ en: "Welcome back to Line Coffee.", ar: "أهلا بك مجددا في لاين كوفي." }}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#B79B85]/70">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-[#B6885E]/30 bg-[#1B140F] accent-[#B6885E]"
            />
            {t({ en: "Remember me", ar: "تذكرني" })}
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-[#B6885E]/80 transition-colors hover:text-[#D6A373]"
          >
            {t({ en: "Forgot password?", ar: "نسيت كلمة المرور؟" })}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="premium-button mt-2 w-full py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? t({ en: "Signing in...", ar: "جار تسجيل الدخول..." })
            : t({ en: "Sign in", ar: "دخول" })}
        </button>

        {error ? (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#B6885E]/12" />
        <span className="text-xs text-[#B79B85]/40">{t({ en: "or", ar: "أو" })}</span>
        <div className="h-px flex-1 bg-[#B6885E]/12" />
      </div>

      <p className="text-center text-sm text-[#B79B85]/60">
        {t({ en: "Don't have an account?", ar: "ليس لديك حساب؟" })}{" "}
        <Link
          href="/auth/signup"
          className="font-medium text-[#B6885E] transition-colors hover:text-[#D6A373]"
        >
          {t({ en: "Create one", ar: "أنشئ حسابا" })}
        </Link>
      </p>
    </AuthCard>
  );
}

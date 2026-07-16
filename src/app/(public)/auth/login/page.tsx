"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { useAuth } from "@/lib/hooks/useAuth";
import { resolvePostLoginDestination } from "@/lib/auth/admin";
import { safePostLoginPath } from "@/lib/auth/safe-redirect";
import { AuthCard } from "@/components/layout/auth/AuthCard";

// Resolve where a (possibly already-authenticated) visitor should land. A
// `next` back to the admin area is collapsed to the admin dashboard, which
// resolvePostLoginDestination gates on real admin_users membership.
function resolveNextParam() {
  if (typeof window === "undefined") return "/";
  return safePostLoginPath(new URLSearchParams(window.location.search).get("next"));
}

export default function LoginPage() {
  const { t, dir } = useLanguage();
  const { signIn, isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  const isRtl = dir === "rtl";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in (e.g. bounced here by the admin edge gate after the
  // presence cookie expired while the session was still alive) — forward to the
  // right destination instead of stranding them on the login form.
  useEffect(() => {
    if (isLoading || !isLoggedIn) return;
    let active = true;
    void resolvePostLoginDestination(resolveNextParam()).then((destination) => {
      if (active) router.replace(destination);
    });
    return () => {
      active = false;
    };
  }, [isLoading, isLoggedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      const destination = await resolvePostLoginDestination(resolveNextParam());
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
    "w-full rounded-xl border border-[#B6885E]/22 bg-[#120D09]/70 px-4 py-3 text-sm text-[#F5E6D8] placeholder-[#D6B79A]/38 outline-none transition-all focus:border-[#D6A373]/50 focus:ring-2 focus:ring-[#D6A373]/18";

  return (
    <AuthCard
      title={{ en: "Sign in", ar: "تسجيل الدخول" }}
      subtitle={{ en: "Welcome back to Line Coffee.", ar: "أهلا بك مجددا في لاين كوفي." }}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium text-[#D6B79A]/80">
            {t({ en: "Email address", ar: "البريد الإلكتروني" })}
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-[#D6B79A]/80">
            {t({ en: "Password", ar: "كلمة المرور" })}
          </label>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
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
        </div>

        <div className="flex items-center justify-end">
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
        <span className="text-xs text-[#B79B85]/60">{t({ en: "or", ar: "أو" })}</span>
        <div className="h-px flex-1 bg-[#B6885E]/12" />
      </div>

      <p className="text-center text-sm text-[#B79B85]/80">
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { AuthCard } from "@/components/layout/auth/AuthCard";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  const [email, setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setError(null);
    setLoading(true);
    try {
      // Sends the Supabase recovery email. The link returns the user to
      // /auth/reset-password with a recovery session in the URL, which the
      // browser client picks up (detectSessionInUrl) so they can set a new
      // password there. Supabase does not reveal whether the email exists.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmed,
        { redirectTo: `${window.location.origin}/auth/reset-password` },
      );
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t({
              en: "Could not send the reset link. Please try again.",
              ar: "تعذر إرسال رابط إعادة التعيين. حاول مرة أخرى.",
            }),
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthCard
        title={{ en: "Check your email", ar: "تحقق من بريدك" }}
        subtitle={{
          en: "We sent a reset link to your inbox.",
          ar: "أرسلنا رابط إعادة التعيين إلى بريدك الإلكتروني.",
        }}
      >
        <div className="py-2 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#B6885E]/12 ring-1 ring-[#B6885E]/20">
            <Mail className="h-7 w-7 text-[#B6885E]" />
          </div>
          <p className="mb-1 text-sm text-[#F5E6D8]/80">{email}</p>
          <p className="mb-6 text-xs text-[#B79B85]/75">
            {t({
              en: "Didn't receive it? Check your spam folder.",
              ar: "لم تستلمه؟ تحقق من مجلد البريد غير الهام.",
            })}
          </p>
          <button
            onClick={() => { setSent(false); setEmail(""); }}
            className="premium-button-outline mx-auto block px-8 py-2.5 text-sm"
          >
            {t({ en: "Try another email", ar: "جرّب بريداً آخر" })}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-[#B79B85]/80">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-[#B6885E]/80 transition-colors hover:text-[#D6A373]"
          >
            <BackArrow className="h-3.5 w-3.5" />
            {t({ en: "Back to sign in", ar: "العودة لتسجيل الدخول" })}
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={{ en: "Forgot password?", ar: "نسيت كلمة المرور؟" }}
      subtitle={{
        en: "Enter your email and we will send you a reset link.",
        ar: "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.",
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-medium text-[#D6B79A]/80">
            {t({ en: "Email address", ar: "البريد الإلكتروني" })}
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-[#B6885E]/22 bg-[#120D09]/70 px-4 py-3 text-sm text-[#F5E6D8] placeholder-[#D6B79A]/38 outline-none transition-all focus:border-[#D6A373]/50 focus:ring-2 focus:ring-[#D6A373]/18"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="premium-button mt-2 w-full py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? t({ en: "Sending…", ar: "جارٍ الإرسال…" })
            : t({ en: "Send reset link", ar: "إرسال رابط الاسترداد" })}
        </button>

        {error ? (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </form>

      <p className="mt-6 text-center text-sm">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-[#B6885E]/80 transition-colors hover:text-[#D6A373]"
        >
          <BackArrow className="h-3.5 w-3.5" />
          {t({ en: "Back to sign in", ar: "العودة لتسجيل الدخول" })}
        </Link>
      </p>
    </AuthCard>
  );
}

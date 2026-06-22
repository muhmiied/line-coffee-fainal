"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { AuthCard } from "@/components/layout/auth/AuthCard";

export default function ForgotPasswordPage() {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  const [email, setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1000);
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
          <p className="mb-6 text-xs text-[#B79B85]/55">
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

        <p className="mt-6 text-center text-sm text-[#B79B85]/60">
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
            className="w-full rounded-lg border border-[#B6885E]/15 bg-[#1B140F] px-4 py-3 text-sm text-[#F5E6D8] placeholder-[#B79B85]/40 transition-colors focus:border-[#B6885E]/40 focus:outline-none"
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

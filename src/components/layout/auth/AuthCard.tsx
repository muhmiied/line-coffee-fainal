"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/lib/context/language";

interface AuthCardProps {
  title: { en: string; ar: string };
  subtitle: { en: string; ar: string };
  children: React.ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  const { dir, t } = useLanguage();

  return (
    <div
      className="arabic-body relative flex min-h-screen flex-col items-center justify-center bg-[#0B0806] px-4 py-16 text-[#F5E6D8]"
      dir={dir}
    >
      {/* Background */}
      <Image
        src="/assets/hero/dark-roast.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-[0.14]"
        aria-hidden="true"
      />
      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0806]/75 via-[#0B0806]/60 to-[#0B0806]/80" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_72%_55%_at_50%_38%,rgba(182,136,94,0.13),transparent_65%)]" />
      {/* Subtle horizontal light sweep */}
      <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-[#D6A373]/14 to-transparent" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <Link href="/">
            <span className="relative block h-16 w-48">
              <Image
                src="/brand/logo-white.svg"
                alt="Line Coffee"
                fill
                sizes="12rem"
                className="object-contain"
              />
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl border border-[#D6A373]/18 bg-[#110C09]/92 px-6 py-8 shadow-[0_0_80px_rgba(0,0,0,0.72),0_0_1px_rgba(214,163,115,0.22)] backdrop-blur-xl sm:px-8 sm:py-10">
          {/* Inset gold glow — top */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FFDCC2]/30 to-transparent" />
          {/* Radial warmth */}
          <div className="pointer-events-none absolute -top-6 left-1/2 h-24 w-48 -translate-x-1/2 rounded-full bg-[#B6885E]/08 blur-2xl" />

          {/* Gold accent bar */}
          <div className="relative mb-7 flex items-center gap-2">
            <div className="h-px w-8 bg-gradient-to-r from-[#D6A373]/60 to-transparent" />
            <div className="h-1 w-1 rounded-full bg-[#B6885E]/50" />
          </div>

          <h1 className="mb-1.5 font-serif text-2xl font-bold text-[#F5E6D8] sm:text-3xl">
            {t(title)}
          </h1>
          <p className="mb-7 text-sm leading-relaxed text-[#B79B85]/65">
            {t(subtitle)}
          </p>

          {children}
        </div>

        {/* Back to home */}
        <p className="mt-6 text-center text-xs text-[#B79B85]/35">
          <Link href="/" className="transition-colors hover:text-[#B6885E]/70">
            {t({ en: "← Back to Line Coffee", ar: "لاين كوفي ←" })}
          </Link>
        </p>
      </div>
    </div>
  );
}

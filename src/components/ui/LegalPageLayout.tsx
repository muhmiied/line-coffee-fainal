"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import type { LocalizedValue } from "@/lib/context/language";
import { cn } from "@/lib/utils/cn";

export type LegalSection = {
  title: LocalizedValue;
  paragraphs: LocalizedValue[];
};

type Props = {
  heroTitle: LocalizedValue;
  heroSubtitle: LocalizedValue;
  lastUpdated: string;
  sections: LegalSection[];
};

export function LegalPageLayout({
  heroTitle,
  heroSubtitle,
  lastUpdated,
  sections,
}: Props) {
  const { t, dir } = useLanguage();

  return (
    <div className="arabic-body min-h-screen bg-[#0B0806] text-[#F5E6D8]">

      {/* ── Hero ── */}
      <section className="products-hero relative overflow-hidden pb-14 pt-28 text-center lg:pt-36">
        <Image
          src="/assets/hero/dark-roast.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover brightness-[0.28] saturate-[0.80]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[#0B0806]/55" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,8,6,0.15)_0%,rgba(11,8,6,0.82)_70%,#0B0806_100%)]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_50%_at_50%_25%,rgba(182,136,94,0.07),transparent_60%)]"
        />
        <div className="relative z-10 mx-auto max-w-2xl px-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.26em] text-[#B6885E]">
            {t({ en: "Line Coffee", ar: "لاين كوفي" })}
          </p>
          <h1 className="font-serif text-3xl font-bold text-[#F5E6D8] sm:text-4xl">
            {t(heroTitle)}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#D6B79A]/65">
            {t(heroSubtitle)}
          </p>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="cinematic-section section-bg-warm py-14 md:py-20">
        <div className="relative z-10 mx-auto max-w-3xl px-4">
          <p className="mb-10 text-xs text-[#D6B79A]/40" dir="ltr">
            {`Last updated: ${lastUpdated}`}
          </p>

          <div className="space-y-14">
            {sections.map((section, i) => (
              <div key={i}>
                <h2 className="mb-4 font-serif text-xl font-bold text-[#F5E6D8] sm:text-2xl">
                  {t(section.title)}
                </h2>
                <div className="mb-5 h-px w-10 bg-gradient-to-r from-[#D6A373] to-transparent" />
                <div className="space-y-4">
                  {section.paragraphs.map((para, j) => (
                    <p
                      key={j}
                      className="text-sm leading-[1.9] text-[#D6B79A]/68"
                    >
                      {t(para)}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="mt-16 border-t border-[#B6885E]/14 pt-10 text-center">
            <p className="mb-5 text-sm text-[#D6B79A]/55">
              {t({
                en: "Questions about our policies? We're happy to help.",
                ar: "أسئلة حول سياساتنا؟ يسعدنا المساعدة.",
              })}
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#D6A373] transition-colors hover:text-[#F5E6D8]"
            >
              {t({ en: "Contact us", ar: "تواصل معنا" })}
              <ArrowRight
                className={cn("h-4 w-4", dir === "rtl" && "rotate-180")}
              />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

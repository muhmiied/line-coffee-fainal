"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { cn } from "@/lib/utils/cn";

// ─── Static mock content ──────────────────────────────────────────────────────

const INTRO = {
  badge:   { en: "Since 2015",          ar: "منذ 2015" },
  heading: { en: "We Are Line Coffee",  ar: "نحن لاين كوفي" },
  body: {
    en: "From a single roaster in Cairo, we have spent over a decade building something rare — a specialty coffee brand that refuses to choose between craft and culture. Every bean we source, every blend we dial in, carries the same obsession: the perfect cup, made with intention.",
    ar: "من محمصة واحدة في القاهرة، أمضينا أكثر من عقد في بناء شيء نادر — علامة قهوة متخصصة ترفض الاختيار بين الحرفة والثقافة. كل حبة نختارها وكل خلطة نضبطها تحمل الهوس ذاته: الكوب المثالي، بنية واضحة.",
  },
  cta: { en: "Explore Our Products", ar: "استكشف منتجاتنا" },
};

const PHILOSOPHY = {
  eyebrow: { en: "Roasting Philosophy", ar: "فلسفة التحميص" },
  heading: { en: "Slow Roast. Full Attention.", ar: "تحميص بطيء. انتباه كامل." },
  body: {
    en: "We don't rush the roast. Every profile is built around the bean — not a trend, not a shortcut. Our roasting window is 72 hours or less from sale. Freshness isn't a feature. It's a commitment.",
    ar: "لا نتعجل التحميص. كل بروفايل مبني حول الحبة نفسها — لا حول صيحة ولا اختصار. نافذة تحميصنا 72 ساعة أو أقل من البيع. الطازجية ليست ميزة. إنها التزام.",
  },
  pillars: [
    {
      label: { en: "Single-origin sourcing", ar: "مناشئ مفردة" },
      value: { en: "Arabica only, traceable farms", ar: "أرابيكا فقط، مزارع محددة" },
    },
    {
      label: { en: "Roast window", ar: "نافذة التحميص" },
      value: { en: "72 h from roast to sale", ar: "72 ساعة من التحميص للبيع" },
    },
    {
      label: { en: "Blend control", ar: "ضبط الخلطة" },
      value: { en: "In-house ratio testing", ar: "اختبار نسب داخلي" },
    },
  ],
};

const JOURNEY = [
  {
    year: "2015",
    title: { en: "Founded in Cairo", ar: "التأسيس في القاهرة" },
    body: {
      en: "A small roastery with one obsession: make specialty coffee accessible without stripping its soul.",
      ar: "محمصة صغيرة بهوس واحد: القهوة المتخصصة في متناول الجميع دون إفراغها من روحها.",
    },
  },
  {
    year: "2018",
    title: { en: "First Blend Lineup", ar: "أول تشكيلة خلطات" },
    body: {
      en: "Eight house blends built from the ground up — each named, each intentional, each still in the catalog today.",
      ar: "ثماني خلطات منزلية مبنية من الصفر — كل واحدة بمسمى ونية وحضور في الكتالوج حتى اليوم.",
    },
  },
  {
    year: { en: "Today", ar: "اليوم" },
    title: { en: "Line Coffee", ar: "لاين كوفي" },
    body: {
      en: "Custom builders, premium sourcing, and a vision for what Egyptian specialty coffee can look and feel like.",
      ar: "أدوات تخصيص، توريد فاخر، ورؤية لما يمكن أن تبدو عليه وتشعر به القهوة المتخصصة المصرية.",
    },
  },
];

const QUOTE = {
  text: {
    en: "Coffee is not a commodity. It is a ritual, a relationship, and a reason to slow down.",
    ar: "القهوة ليست سلعة. إنها طقس، علاقة، وسبب للتأني.",
  },
};

const CTA_SECTION = {
  heading: { en: "Start Exploring", ar: "ابدأ الاستكشاف" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const { dir, t } = useLanguage();
  const isRtl = dir === "rtl";

  return (
    <div className="arabic-body min-h-screen bg-[#0B0806] text-[#F5E6D8]">

      {/* ── 1. Editorial Intro ────────────────────────────────────── */}
      {/*
        Column order is set explicitly via lg:order-* so both LTR and RTL
        produce intentional layouts:
          LTR → Image left  / Text right
          RTL → Image right / Text left
        (CSS flex order values are direction-sensitive — order-1 is at the
        main-axis start, which is left in LTR and right in RTL.)
      */}
      <section className="products-hero relative overflow-hidden pb-16 pt-28 sm:pb-20 lg:pb-24 lg:pt-32">
        <Image
          src="/assets/hero/dark-roast.png"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center brightness-[0.50] saturate-[0.88]"
        />
        <div className="absolute inset-0 bg-[#0B0806]/50" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,8,6,0.22)_0%,rgba(11,8,6,0.78)_65%,#0B0806_100%)]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_20%,rgba(182,136,94,0.08),transparent_62%)]"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16 xl:gap-24">

            {/* Image — order-1: left in LTR, right in RTL */}
            <div className="w-full shrink-0 lg:order-1 lg:w-[44%]">
              <div className="relative mx-auto max-w-sm lg:max-w-none">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-4 rounded-3xl bg-[#D6A373]/5 blur-3xl"
                />
                <div className="premium-image-card group relative aspect-[3/4] overflow-hidden rounded-2xl border border-[#D6A373]/14 bg-[#120D09]">
                  <Image
                    src="/assets/story/roastery.png"
                    alt={t({ en: "Line Coffee roastery", ar: "محمصة لاين كوفي" })}
                    fill
                    priority
                    sizes="(max-width: 1024px) 80vw, 44vw"
                    className="object-cover object-center brightness-[0.82] contrast-[1.1] saturate-[1.06] transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0806]/70 via-[#0B0806]/10 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FFDCC2]/7 via-transparent to-[#522500]/20 mix-blend-soft-light" />
                </div>
              </div>
            </div>

            {/* Text — order-2: right in LTR, left in RTL */}
            <div className="flex-1 lg:order-2">
              <span className="mb-6 inline-block rounded-full border border-[#D6A373]/30 bg-[#D6A373]/8 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#D6A373]">
                {t(INTRO.badge)}
              </span>

              <h1 className="mb-6 font-serif text-4xl font-bold leading-tight text-[#F5E6D8] drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)] sm:text-5xl lg:text-6xl">
                {t(INTRO.heading)}
              </h1>

              <p className="mb-10 max-w-lg text-[1.05rem] leading-[1.9] text-[#D6B79A]/72">
                {t(INTRO.body)}
              </p>

              <Link
                href="/products"
                className="premium-button inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
              >
                {t(INTRO.cta)}
                <ArrowRight className={cn("h-4 w-4 shrink-0", isRtl && "rotate-180")} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Philosophy — reversed ──────────────────────────────── */}
      {/*
        DOM order: Text first, Image second.
          LTR → order-1 Text left  / order-2 Image right
          RTL → order-1 Text right / order-2 Image left
        The editorial alternation (vs section 1) works in both directions.
      */}
      <section className="cinematic-section section-bg-warm relative overflow-hidden py-20 md:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_72%_52%,rgba(182,136,94,0.07),transparent_65%)]"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16 xl:gap-20">

            {/* Text — order-1: left in LTR, right in RTL */}
            <div className="flex-1 lg:order-1">
              <div className="luxury-panel rounded-2xl p-7 sm:p-9">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-[#D6A373]">
                  {t(PHILOSOPHY.eyebrow)}
                </p>

                <h2 className="mb-5 font-serif text-3xl font-bold text-[#F5E6D8] sm:text-4xl">
                  {t(PHILOSOPHY.heading)}
                </h2>

                <p className="mb-8 text-[1rem] leading-[1.9] text-[#D6B79A]/70">
                  {t(PHILOSOPHY.body)}
                </p>

                <div className="space-y-5 border-t border-[#B6885E]/14 pt-6">
                  {PHILOSOPHY.pillars.map((pillar) => (
                    <div key={pillar.label.en} className="flex items-start gap-3.5">
                      <div className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#D6A373]" />
                      <div>
                        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#D6A373]/70">
                          {t(pillar.label)}
                        </p>
                        <p className="text-sm leading-6 text-[#D6B79A]/66">
                          {t(pillar.value)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Image — order-2: right in LTR, left in RTL */}
            <div className="w-full shrink-0 lg:order-2 lg:w-[44%]">
              <div className="relative mx-auto max-w-sm lg:max-w-none">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-3 rounded-2xl bg-[#B6885E]/5 blur-2xl"
                />
                <div className="premium-image-card group relative aspect-[4/5] overflow-hidden rounded-2xl border border-[#B6885E]/14 bg-[#120D09]">
                  <Image
                    src="/assets/hero/dark-roast.png"
                    alt={t({ en: "Coffee beans close-up", ar: "تفاصيل حبوب القهوة" })}
                    fill
                    sizes="(max-width: 1024px) 80vw, 44vw"
                    className="object-cover object-center brightness-[0.78] contrast-[1.12] saturate-[1.08] transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0806]/62 via-[#0B0806]/10 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#522500]/18 via-transparent to-transparent mix-blend-soft-light" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Journey Timeline ───────────────────────────────────── */}
      <section className="cinematic-section section-bg-black relative overflow-hidden py-20 md:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_50%,rgba(182,136,94,0.06),transparent_65%)]"
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <p className="premium-section-kicker mx-auto mb-8">
            {t({ en: "Our Story", ar: "قصتنا" })}
          </p>

          <h2 className="mb-16 font-serif text-3xl font-bold text-[#F5E6D8] sm:text-4xl">
            {t({ en: "A Decade of Craft", ar: "عقد من الحرفة" })}
          </h2>

          <div className="relative mx-auto max-w-md">
            {/* Vertical track line */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-5 w-px bg-gradient-to-b from-[#D6A373]/40 via-[#D6A373]/24 to-transparent"
            />

            <div className="space-y-12">
              {JOURNEY.map((item) => {
                const yearLabel = typeof item.year === "string" ? item.year : t(item.year as { en: string; ar: string });
                return (
                  <div key={item.title.en} className="relative flex gap-6 text-start">
                    {/* Dot */}
                    <div className="relative z-10 mt-1.5 shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D6A373]/30 bg-[#D6A373]/10">
                        <div className="h-2.5 w-2.5 rounded-full bg-[#D6A373]" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="pb-2">
                      <p className="arabic-number mb-1 font-serif text-xl font-bold text-[#D6A373]">
                        {yearLabel}
                      </p>
                      <h3 className="mb-2 font-serif text-lg font-bold text-[#F5E6D8]">
                        {t(item.title)}
                      </h3>
                      <p className="text-sm leading-7 text-[#D6B79A]/60">
                        {t(item.body)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Quote + CTA (merged) ───────────────────────────────── */}
      <section className="cinematic-section relative overflow-hidden py-28 md:py-36">
        <Image
          src="/assets/story/roastery.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="object-cover object-center brightness-[0.38] saturate-[0.88]"
        />
        <div className="absolute inset-0 bg-[#0B0806]/72" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_55%_at_50%_50%,rgba(182,136,94,0.14),transparent_65%)]"
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          {/* Quote */}
          <span
            aria-hidden="true"
            className="mb-4 block select-none font-serif text-7xl leading-none text-[#D6A373]/28"
          >
            &ldquo;
          </span>

          <p className="font-serif text-2xl font-bold leading-[1.55] text-[#F5E6D8] sm:text-3xl md:text-[2.25rem]">
            {t(QUOTE.text)}
          </p>

          <span
            aria-hidden="true"
            className="mt-2 block select-none font-serif text-7xl leading-none text-[#D6A373]/28"
          >
            &rdquo;
          </span>

          {/* Divider */}
          <div className="mx-auto my-14 h-px w-24 bg-[#D6A373]/24" />

          {/* CTA */}
          <h2 className="mb-10 font-serif text-3xl font-bold text-[#F5E6D8] sm:text-4xl">
            {t(CTA_SECTION.heading)}
          </h2>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href="/products"
              className="premium-button inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              {t({ en: "Explore Products", ar: "استكشف المنتجات" })}
              <ArrowRight className={cn("h-4 w-4 shrink-0", isRtl && "rotate-180")} />
            </Link>

            <Link
              href="/make-your-espresso"
              className="studio-espresso-btn inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              {t({ en: "Make Your Espresso", ar: "اصنع إسبريسو خاصتك" })}
              <ArrowRight className={cn("h-4 w-4 shrink-0", isRtl && "rotate-180")} />
            </Link>

            <Link
              href="/make-your-flavor"
              className="studio-flavor-btn inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              {t({ en: "Make Your Flavor", ar: "اصنع نكهتك" })}
              <ArrowRight className={cn("h-4 w-4 shrink-0", isRtl && "rotate-180")} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { heroSlides, heroStats } from "@/lib/mock-data/visual-content";
import { cn } from "@/lib/utils/cn";

// ─── Count-up hook ────────────────────────────────────────────────────────────

const statTargets = heroStats.map((stat) => {
  const match = stat.value.match(/^(\d+)(.*)$/);
  return match ? { num: parseInt(match[1], 10), suffix: match[2] } : { num: 0, suffix: stat.value };
});

const heroStatDetails = [
  {
    title: { en: "Origins", ar: "مصادر" },
    description: {
      en: "Curated beans from selected coffee sources.",
      ar: "حبوب مختارة من مصادر قهوة موثوقة.",
    },
  },
  {
    title: { en: "Fresh Roast", ar: "تحميص طازج" },
    description: {
      en: "Packed close to roasting for warmer aroma.",
      ar: "تعبئة قريبة من التحميص لرائحة أدفأ.",
    },
  },
  {
    title: { en: "Arabica", ar: "أرابيكا" },
    description: {
      en: "Smooth body with a clean, balanced finish.",
      ar: "قوام ناعم ونهاية نظيفة ومتوازنة.",
    },
  },
];

function useCountUp() {
  const [values, setValues] = useState(statTargets.map(() => "0"));

  useEffect(() => {
    const totalFrames = 36;
    const frameDuration = 1200 / totalFrames;
    let frame = 0;

    const id = setInterval(() => {
      frame++;
      const p = frame / totalFrames;
      const eased = 1 - (1 - p) * (1 - p);
      setValues(statTargets.map(({ num, suffix }) => `${Math.round(num * eased)}${suffix}`));
      if (frame >= totalFrames) {
        clearInterval(id);
        setValues(statTargets.map(({ num, suffix }) => `${num}${suffix}`));
      }
    }, frameDuration);

    return () => clearInterval(id);
  }, []);

  return values;
}

function NumericText({ value }: { value: string }) {
  const match = value.match(/^(\d+)(.*)$/);

  if (!match) {
    return <span className="arabic-number">{value}</span>;
  }

  const [, number, symbol] = match;

  return (
    <>
      <span className="arabic-number">{number}</span>
      {symbol ? <span className="numeric-symbol">{symbol}</span> : null}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HeroSection() {
  const { dir, t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const displayValues = useCountUp();

  const slide = heroSlides[currentSlide] ?? heroSlides[0];

  const goTo = (index: number) =>
    setCurrentSlide((index + heroSlides.length) % heroSlides.length);
  const goPrev = () => goTo(currentSlide - 1);
  const goNext = () => goTo(currentSlide + 1);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide((i) => (i + 1) % heroSlides.length);
    }, 5600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <section
        className="arabic-body -mt-[6.4rem] relative flex min-h-[100svh] items-center overflow-hidden bg-[#0B0806] pb-6 pt-[calc(6.4rem+3rem)] sm:-mt-[7.2rem] sm:pb-8 sm:pt-[calc(7.2rem+3.25rem)] md:-mt-[8.9rem] md:min-h-screen md:max-h-[900px] md:pb-10 md:pt-[calc(8.9rem+3.75rem)]"
      >
      {/* Decorative coffee-leaf watermark */}
      <div className="pointer-events-none absolute bottom-28 left-6 z-20 hidden opacity-[0.15] sm:bottom-32 sm:block">
        <svg
          viewBox="0 0 64 64"
          fill="#B6885E"
          className="h-16 w-16 -rotate-12 md:h-20 md:w-20"
          aria-hidden="true"
        >
          <path d="M31 6C18 10 10 23 15 35c5 13 19 22 31 18s18-18 12-30C53 11 42 4 31 6Zm2 8c8-2 17 4 20 12 3 9-1 19-10 22-8 3-18-3-21-12-3-8 2-19 11-22Z" />
        </svg>
      </div>

      {/* ── Background slides ─────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        {heroSlides.map((s, index) => (
          <div
            key={s.id}
            className={cn(
              "hero-slide-frame absolute inset-0 transition-[opacity,transform] duration-[1600ms]",
              index === currentSlide
                ? "scale-100 opacity-100"
                : "scale-[1.045] opacity-0",
            )}
          >
            <Image
              src={s.image}
              alt=""
              fill
              priority={index === 0}
              sizes="100vw"
              className="hero-slide-image object-cover object-center"
            />
          </div>
        ))}
        <HeroOverlay />
      </div>

      {/* ── Copy ──────────────────────────────────────────────────────── */}
      <div className="relative z-20 w-full px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-20">
        <div
          key={`${currentSlide}-${dir}`}
          className={cn(
            "hero-copy-stack hero-copy-animate w-full max-w-[min(96rem,calc(100vw-2.5rem))] -translate-y-6 sm:-translate-y-8 md:-translate-y-12",
            dir === "rtl" ? "ml-auto text-right" : "mr-auto text-left",
          )}
        >
          <div className="hero-title-layer">
            <h1 className="arabic-display max-w-[11.5em] pb-2 font-serif text-[2.85rem] font-extrabold leading-[1.01] text-[#F5E6D8] [text-shadow:0_2px_24px_rgba(0,0,0,0.85)] sm:text-[3.85rem] md:text-[4.55rem] lg:text-[4.95rem] xl:text-[5.15rem]">
              {t(slide.title)}
            </h1>
          </div>

          <div className="hero-subtitle-layer mt-5 max-w-[38rem] md:mt-6">
            <p className="text-base leading-7 text-[#D6B79A]/95 md:text-[1.05rem] md:leading-8">
              {t(slide.subtitle)}
            </p>
          </div>

          <div className="hero-actions-layer mt-8 flex flex-col gap-3.5 sm:flex-row">
            <Link
              href={slide.primaryHref}
              className="premium-button group inline-flex min-w-[9.5rem] items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold tracking-wide"
            >
              {t(slide.primaryAction)}
              <ArrowRight
                className={cn(
                  "h-4 w-4 transition-transform group-hover:translate-x-1",
                  dir === "rtl" && "rotate-180 group-hover:-translate-x-1",
                )}
              />
            </Link>

            <Link
              href={slide.secondaryHref}
              className="premium-button-outline group inline-flex min-w-[9.5rem] items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold tracking-wide"
            >
              {t(slide.secondaryAction)}
            </Link>
          </div>

          {/* ── Stats ─────────────────────────────────────────────────── */}
          <div
            className="hero-stats-layer mt-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-7 md:mt-11 lg:gap-10"
            dir={dir}
          >
            {heroStats.map((stat, i) => {
              const detail = heroStatDetails[i];

              return (
                <div
                  key={stat.value}
                  className={cn(
                    "hero-stat-item flex min-w-0 items-start gap-4 sm:gap-5",
                    i === 0 && "sm:justify-self-start",
                    i === 1 && "sm:justify-self-center",
                    i === 2 && "sm:justify-self-end",
                  )}
                >
                  <p
                    dir="ltr"
                    className="shrink-0 text-[1.85rem] font-bold leading-none text-[#D6A373] sm:text-[2.05rem] md:text-[2.25rem]"
                  >
                    <NumericText value={displayValues[i]} />
                  </p>
                  <span className="h-14 w-px shrink-0 bg-[#B6885E]/24" aria-hidden="true" />
                  <div className="hero-stat-label min-w-0 max-w-[15rem] text-start">
                    <p className="font-serif text-[0.95rem] font-bold leading-none text-[#D6B79A] sm:text-[1rem] md:text-[1.08rem]">
                      {t(detail?.title ?? stat.label)}
                    </p>
                    <p className="mt-2 text-[0.68rem] font-medium leading-[1.55] tracking-[0.03em] text-[#B79B85]/66 sm:text-[0.72rem]">
                      {detail ? t(detail.description) : t(stat.label)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Prev / Next arrows ───────────────────────────────────────── */}
      {/* dir="ltr" prevents RTL flex reversal from swapping button physical positions */}
      <div dir="ltr" className="pointer-events-none absolute inset-y-0 left-3 right-3 z-20 hidden items-center justify-between sm:flex md:left-4 md:right-4">
        <button
          type="button"
          onClick={dir === "rtl" ? goNext : goPrev}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#B6885E]/25 bg-[#18120D]/55 text-white backdrop-blur-md transition-all hover:border-[#D6A373]/45 hover:bg-[#B6885E]/12"
          aria-label={dir === "rtl"
            ? t({ en: "Next slide", ar: "الشريحة التالية" })
            : t({ en: "Previous slide", ar: "الشريحة السابقة" })}
        >
          <ArrowRight className="h-5 w-5 rotate-180" />
        </button>
        <button
          type="button"
          onClick={dir === "rtl" ? goPrev : goNext}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#B6885E]/25 bg-[#18120D]/55 text-white backdrop-blur-md transition-all hover:border-[#D6A373]/45 hover:bg-[#B6885E]/12"
          aria-label={dir === "rtl"
            ? t({ en: "Previous slide", ar: "الشريحة السابقة" })
            : t({ en: "Next slide", ar: "الشريحة التالية" })}
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>

      {/* ── Dot indicators ───────────────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-6 z-20 flex items-center justify-center gap-2 sm:bottom-8">
        {heroSlides.map((s, index) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(index)}
            aria-current={currentSlide === index ? "true" : undefined}
            className="hero-dot"
            aria-label={t({
              en: `Go to slide ${index + 1}`,
              ar: `الانتقال إلى الشريحة ${index + 1}`,
            })}
          />
        ))}
      </div>

      {/* ── Scroll cue ───────────────────────────────────────────────── */}
      <HeroScrollCue />

      {/* ── Bottom fade ──────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-[#0B0806] via-[#0B0806]/55 to-transparent" />
      </section>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroOverlay() {
  return (
    <>
      <div className="absolute inset-0 bg-black/44" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_28%,rgba(0,0,0,0.32)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#0B0806] via-[#0B0806]/40 to-transparent" />
      <div className="hero-side-gradient absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_65%,rgba(182,136,94,0.14)_0%,transparent_70%)]" />
      <div className="absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#D6A373]/10 opacity-50 blur-[1px]" />
    </>
  );
}

function HeroScrollCue() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 80) setHidden(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-14 z-20 flex justify-center transition-opacity duration-700 sm:bottom-16",
        hidden ? "opacity-0" : "opacity-100",
      )}
    >
      <ChevronDown className="h-5 w-5 animate-bounce text-[#D6A373]/50" />
    </div>
  );
}

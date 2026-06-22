"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Quote, Star } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { assets, visualTestimonials } from "@/lib/mock-data/visual-content";
import type { VisualTestimonial } from "@/types/homepage";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/utils/cn";

type TestimonialsSectionProps = {
  testimonials?: VisualTestimonial[];
};

export function TestimonialsSection({
  testimonials = visualTestimonials,
}: TestimonialsSectionProps) {
  const { dir, t } = useLanguage();

  return (
    <>
      <section
        className="arabic-body cinematic-section section-bg-black relative overflow-hidden py-20 md:py-28"
      >
      <Image
        src={assets.hero.darkRoast}
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-[0.08]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[#0B0806]/72" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(182,136,94,0.07)_0%,transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4">

        {/* Decorative large quote mark above heading */}
        <div className="mb-2 flex justify-center">
          <Quote className="h-10 w-10 text-[#B6885E]/20 md:h-12 md:w-12" aria-hidden />
        </div>

        <div className="mb-10 flex flex-col items-center gap-6 text-center md:mb-14">
          <SectionHeading
            eyebrow={{ en: "Customer Notes", ar: "آراء العملاء" }}
            title={{ en: "Loved in Everyday Rituals", ar: "قهوة تُحَب في الطقوس اليومية" }}
            align="flush"
          />

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/products"
              className="premium-button group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-semibold tracking-wide"
            >
              {t({ en: "Browse Menu", ar: "تصفح القائمة" })}
              <ArrowRight
                className={cn(
                  "h-4 w-4 transition-transform group-hover:translate-x-1",
                  dir === "rtl" && "rotate-180 group-hover:-translate-x-1",
                )}
              />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border border-[#B6885E]/25 bg-[#F5E6D8]/5 px-7 py-3 text-sm font-semibold text-[#F5E6D8] transition-all duration-300 hover:border-[#D6A373]/45 hover:bg-[#D6A373]/10"
            >
              {t({ en: "Leave a Review", ar: "اترك تقييمك" })}
            </Link>
          </div>
        </div>

        <div className="stagger-children grid gap-5 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <TestimonialCard
              key={testimonial.name.en}
              testimonial={testimonial}
              t={t}
            />
          ))}
        </div>
      </div>
      </section>
    </>
  );
}

// ─── Testimonial Card ─────────────────────────────────────────────────────────

function TestimonialCard({
  testimonial,
  t,
}: {
  testimonial: VisualTestimonial;
  t: (v: { en: string; ar: string }) => string;
}) {
  const initials = t(testimonial.name)
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <article
      data-reveal
      className="reveal-on-scroll group relative flex min-h-[300px] flex-col overflow-hidden rounded-2xl border border-[#B6885E]/16 bg-[#120D09]/76 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.38)] backdrop-blur-md transition-all duration-500 hover:-translate-y-1.5 hover:border-[#D6A373]/32 hover:bg-[#160F0A]/84 hover:shadow-[0_32px_80px_rgba(0,0,0,0.52),0_0_28px_rgba(182,136,94,0.09)] md:min-h-[320px]"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#D6A373]/8 blur-3xl transition-opacity duration-500 group-hover:opacity-80" />

      {/* Stars + quote icon */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div
          className="flex items-center gap-0.5"
          aria-label={`${testimonial.rating} out of 5 stars`}
        >
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <Star key={i} className="h-[15px] w-[15px] fill-[#D6A373] text-[#D6A373]" />
          ))}
        </div>
        <Quote className="h-6 w-6 shrink-0 text-[#D6A373]/30" />
      </div>

      <p className="line-clamp-5 flex-1 text-[0.95rem] leading-[1.85] text-[#F5E6D8]/76">
        {t(testimonial.quote)}
      </p>

      {/* Author */}
      <div className="mt-6 flex items-center gap-3.5 border-t border-[#B6885E]/12 pt-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D6A373]/26 bg-[radial-gradient(circle_at_30%_20%,rgba(214,163,115,0.26),rgba(82,37,0,0.28)_55%,rgba(11,8,6,0.8))] text-sm font-bold text-[#F5E6D8] shadow-inner">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold leading-snug text-[#F5E6D8]">
            {t(testimonial.name)}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-[0.14em] text-[#D6A373]/65">
            {t(testimonial.meta)}
          </p>
        </div>
      </div>
    </article>
  );
}

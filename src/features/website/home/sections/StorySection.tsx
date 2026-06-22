"use client";

import Image from "next/image";
import { Award, Coffee, Heart } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { assets, heroStats, storyCopy } from "@/lib/mock-data/visual-content";
import type { HeroStat, StoryCopy } from "@/types/homepage";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/utils/cn";

const storyValueIcons = [Coffee, Award, Heart] as const;

type StorySectionProps = {
  copy?: StoryCopy;
  stats?: HeroStat[];
};

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

export function StorySection({
  copy = storyCopy,
  stats = heroStats,
}: StorySectionProps) {
  const { dir, t } = useLanguage();

  return (
    <>
      <section
        className="arabic-body cinematic-section section-bg-warm relative overflow-hidden pb-24 pt-20 md:pb-36 md:pt-28"
      >
      {/* Atmospheric background image */}
      <div className="absolute inset-0">
        <Image
          src={assets.story.roastery}
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.08]"
        />
        <div className="absolute inset-0 bg-[#0F0A07]/82" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_20%_50%,rgba(182,136,94,0.09)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_80%_50%,rgba(182,136,94,0.06)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-20 xl:gap-24">

          {/* ── Copy column ─────────────────────────────────────────── */}
          <div
            className={cn("reveal-on-scroll", dir === "rtl" && "text-right")}
            data-reveal
          >
            <SectionHeading
              eyebrow={copy.eyebrow}
              title={copy.title}
              align="start"
            />

            <p className="mb-10 max-w-xl text-[1.05rem] leading-[1.9] text-[#D6B79A]/72">
              {t(copy.body)}
            </p>

            <div className="stagger-children space-y-4">
              {copy.values.map((value, index) => {
                const Icon = storyValueIcons[index] ?? Coffee;

                return (
                  <div key={value.title.en} className="premium-info-card reveal-on-scroll flex gap-4" data-reveal>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#B6885E]/28 bg-[#B6885E]/10">
                      <Icon className="h-4 w-4 text-[#B6885E]" />
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold text-[#F5E6D8]">
                        {t(value.title)}
                      </h3>
                      <p className="text-sm leading-relaxed text-[#B79B85]/68">
                        {t(value.description)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Image column ────────────────────────────────────────── */}
          <div
            className="reveal-on-scroll reveal-from-right relative mx-auto w-full max-w-xl lg:max-w-none"
            data-reveal
          >
            <div className="absolute -inset-4 rounded-2xl bg-[#FFDCC2]/8 blur-3xl" />
            <div className="absolute -inset-1 rounded-2xl border border-[#FFDCC2]/10" />

            <div className="premium-image-card group relative aspect-[3/4] overflow-hidden rounded-2xl border border-[#FFDCC2]/14 bg-[#120D09] shadow-2xl">
              <Image
                src={assets.story.roastery}
                alt={t({ en: "Line Coffee craft visual", ar: "مشهد صناعة القهوة في لاين كوفي" })}
                fill
                sizes="(min-width: 1024px) 44vw, 92vw"
                className="object-cover object-center brightness-[0.8] contrast-[1.12] saturate-[1.08] transition-transform duration-700 group-hover:scale-[1.035]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0806]/80 via-[#0F0A07]/16 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_34%,rgba(11,8,6,0.58)_100%)]" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFDCC2]/10 via-transparent to-[#522500]/30 mix-blend-soft-light" />
            </div>

            {/* stats panel — flows on mobile, absolute bottom-left on lg+ */}
            <div
              className={cn(
                "luxury-panel mt-6 rounded-2xl p-5 shadow-2xl lg:absolute lg:mt-0 lg:-bottom-6",
                dir === "rtl"
                  ? "lg:-right-4"
                  : "lg:-left-4",
              )}
            >
              <div className="flex items-center gap-5">
                {stats.map((stat, index) => (
                  <div key={stat.value} className="flex items-center gap-5">
                    <div className="text-center">
                      <p dir="ltr" className="text-2xl font-bold text-[#D6A373]">
                        <NumericText value={stat.value} />
                      </p>
                      <p className="mt-1 text-[11px] text-[#B79B85]/65">
                        {t(stat.label)}
                      </p>
                    </div>
                    {index < stats.length - 1 && (
                      <div className="h-10 w-px bg-[#B6885E]/20" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      </section>
    </>
  );
}

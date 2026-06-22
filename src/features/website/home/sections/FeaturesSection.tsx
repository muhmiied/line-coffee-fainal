"use client";

import Image from "next/image";
import { Coffee, Headphones, ShieldCheck, Truck } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { assets, visualFeatures } from "@/lib/mock-data/visual-content";
import type { FeatureIconKey, VisualFeature } from "@/types/homepage";
import { SectionHeading } from "@/components/ui/SectionHeading";

const iconMap: Record<FeatureIconKey, typeof Coffee> = {
  support: Headphones,
  delivery: Truck,
  coffee: Coffee,
  quality: ShieldCheck,
};

type FeaturesSectionProps = {
  features?: VisualFeature[];
};

export function FeaturesSection({ features = visualFeatures }: FeaturesSectionProps) {
  const { t } = useLanguage();

  return (
    <>
      <section
        className="arabic-body cinematic-section section-bg-black relative overflow-hidden pb-16 pt-14 md:pb-24 md:pt-20"
      >
      <Image
        src={assets.story.roastery}
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-[0.07]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[#0B0806]/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(182,136,94,0.05)_0%,transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <SectionHeading
          eyebrow={{ en: "Why Line Coffee", ar: "لماذا لاين كوفي" }}
          title={{ en: "Built Around Your Ritual", ar: "مبني حول طقوسك اليومية" }}
          align="center"
        />

        <div className="stagger-children grid grid-cols-2 gap-5 md:gap-7 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon];

            return (
              <div
                key={feature.icon}
                data-reveal
                className="premium-info-card reveal-on-scroll group flex flex-col items-center py-7 text-center"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#B6885E]/22 bg-[#B6885E]/[0.09] transition-all duration-300 group-hover:scale-110 group-hover:border-[#D6A373]/36 group-hover:bg-[#B6885E]/14 md:h-16 md:w-16">
                  <Icon
                    className="h-5 w-5 text-[#B6885E] md:h-6 md:w-6"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="mb-2 text-sm font-semibold leading-snug text-[#F5E6D8] transition-colors duration-300 group-hover:text-[#D6A373] md:text-[0.95rem]">
                  {t(feature.label)}
                </h3>
                <p className="text-xs leading-relaxed text-[#B79B85]/68 md:text-[0.8rem]">
                  {t(feature.description)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      </section>
    </>
  );
}

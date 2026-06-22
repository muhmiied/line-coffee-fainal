"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { assets, visualCategories } from "@/lib/mock-data/visual-content";
import type { VisualCategory } from "@/types/homepage";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/utils/cn";

type CategoriesSectionProps = {
  categories?: VisualCategory[];
};

const CATEGORY_MARQUEE_REPETITIONS = 4;

export function CategoriesSection({
  categories = visualCategories,
}: CategoriesSectionProps) {
  const { dir, t } = useLanguage();

  return (
    <>
      <section
        className="arabic-body cinematic-section home-after-hero section-bg-warm relative overflow-hidden pb-20 pt-12 md:pb-28 md:pt-16"
      >
      <Image
        src={assets.hero.darkRoast}
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-[0.08]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[#0F0A07]/68" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(182,136,94,0.07)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(182,136,94,0.05)_0%,transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="mb-8 md:mb-10">
          <SectionHeading
            eyebrow={{ en: "Our Menu", ar: "قائمتنا" }}
            title={{ en: "Shop by Category", ar: "تسوق حسب الفئة" }}
            align="flush"
          />
        </div>

        <div className="category-marquee reveal-on-scroll" data-reveal>
          <div className="category-marquee-track">
            <div className="marquee-loop category-marquee-loop">
              {Array.from({ length: CATEGORY_MARQUEE_REPETITIONS }).map((_, copy) =>
                categories.map((category) => (
                  <CategoryCard
                    key={`live-${copy}-${category.slug}`}
                    category={category}
                    isDuplicate={copy > 0}
                    dir={dir}
                    t={t}
                  />
                )),
              )}
            </div>
            <div className="marquee-loop category-marquee-loop" aria-hidden="true">
              {Array.from({ length: CATEGORY_MARQUEE_REPETITIONS }).map((_, copy) =>
                categories.map((category) => (
                  <CategoryCard
                    key={`dupe-${copy}-${category.slug}`}
                    category={category}
                    isDuplicate={true}
                    dir={dir}
                    t={t}
                  />
                )),
              )}
            </div>
          </div>
        </div>
      </div>
      </section>
    </>
  );
}

// ─── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  isDuplicate,
  dir,
  t,
}: {
  category: VisualCategory;
  isDuplicate: boolean;
  dir: "ltr" | "rtl";
  t: (v: { en: string; ar: string }) => string;
}) {
  return (
    <Link
      href={`/products?category=${category.slug}`}
      tabIndex={isDuplicate ? -1 : undefined}
      aria-hidden={isDuplicate ? "true" : undefined}
      className={cn(
        "premium-image-card group relative block aspect-[3/4] w-[11rem] shrink-0 overflow-hidden rounded-2xl sm:w-[13rem] md:w-[14.5rem] lg:w-[15.5rem]",
        category.tone === "highlight" && "ring-1 ring-[#B6885E]/50",
      )}
    >
      <Image
        src={category.image}
        alt={t(category.name)}
        fill
        sizes="(max-width: 640px) 12rem, (max-width: 1024px) 14rem, 16rem"
        className="object-cover brightness-[0.78] contrast-[1.1] saturate-[1.06] transition-all duration-700 group-hover:scale-110 group-hover:brightness-[0.88]"
      />

      <div className="absolute inset-0 bg-black/28 transition-colors duration-500 group-hover:bg-black/12" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#B6885E]/12 to-transparent" />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-[#0B0806]/94 via-[#0B0806]/28 to-transparent",
          category.tone === "highlight" && "from-[#1B0D05]/96 via-[#B6885E]/18",
        )}
      />
      <div className="absolute inset-0 rounded-2xl ring-0 ring-[#B6885E]/40 transition-all duration-300 group-hover:ring-1" />

      <div className="absolute inset-0 flex flex-col justify-end p-4 pb-5">
        <h3 className="mb-2 text-center text-sm font-semibold leading-snug text-[#F5E6D8] md:text-[0.95rem]">
          {t(category.name)}
        </h3>
        <div className="flex items-center justify-center gap-1 text-xs text-[#D6A373]/80 transition-all duration-300 group-hover:gap-2">
          <span>{t(category.action)}</span>
          <ArrowRight
            className={cn(
              "h-3.5 w-3.5 transition-transform group-hover:translate-x-1",
              dir === "rtl" && "rotate-180 group-hover:-translate-x-1",
            )}
          />
        </div>
      </div>
    </Link>
  );
}

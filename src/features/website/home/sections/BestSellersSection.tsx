"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { assets } from "@/lib/mock-data/visual-content";
import {
  getPublicProductsBySlugs,
  type PublicCatalogProduct,
} from "@/lib/catalog/public-catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/utils/cn";

const BEST_SELLER_SLUGS = [
  "turkish-silk",
  "high-mood",
  "heavy-crema",
  "black-label",
  "classic-line",
  "original-cappuccino",
];

type BestSellersSectionProps = {
  products?: PublicCatalogProduct[];
};

const BEST_SELLERS_MARQUEE_REPETITIONS = 4;

export function BestSellersSection({
  products: suppliedProducts,
}: BestSellersSectionProps) {
  const { dir, t } = useLanguage();
  const [loadedProducts, setLoadedProducts] = useState<PublicCatalogProduct[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const products = suppliedProducts ?? loadedProducts;
  const effectiveLoadState = suppliedProducts ? "ready" : loadState;

  useEffect(() => {
    if (suppliedProducts) return;

    let isMounted = true;

    getPublicProductsBySlugs(BEST_SELLER_SLUGS)
      .then((nextProducts) => {
        if (!isMounted) return;
        setLoadedProducts(nextProducts);
        setLoadState("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadedProducts([]);
        setLoadState("error");
      });

    return () => {
      isMounted = false;
    };
  }, [suppliedProducts]);

  return (
    <>
      <section className="arabic-body cinematic-section section-bg-rich relative overflow-hidden py-20 md:py-28">
      {/* Roastery image bleeds warmth from story section above */}
      <Image
        src={assets.story.roastery}
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-[0.16]"
      />
      <div className="absolute inset-0 bg-[#0B0806]/72" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_50%,rgba(182,136,94,0.13)_0%,transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="mb-6 flex flex-col items-center gap-5 text-center">
          <SectionHeading
            eyebrow={{ en: "Top Picks", ar: "اختيارات مميزة" }}
            title={{ en: "Best Sellers", ar: "الأكثر مبيعًا" }}
            align="flush"
          />
          <Link
            href="/products"
            className={cn(
              "group inline-flex items-center justify-center gap-2 text-sm font-medium text-[#FFDCC2]/45 transition-colors hover:text-[#FFDCC2]/80",
            )}
          >
            {t({ en: "View All Best Sellers", ar: "عرض كل الأكثر مبيعًا" })}
            <ArrowRight
              className={cn(
                "h-4 w-4 transition-transform group-hover:translate-x-1",
                dir === "rtl" && "rotate-180 group-hover:-translate-x-1",
              )}
            />
          </Link>
        </div>

        {effectiveLoadState === "error" ? (
          <div className="py-10 text-center text-sm text-[#D6B79A]/55">
            {t({ en: "Best sellers could not be loaded right now.", ar: "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø£ÙƒØ«Ø± Ù…Ø¨ÙŠØ¹Ù‹Ø§ Ø§Ù„Ø¢Ù†." })}
          </div>
        ) : effectiveLoadState === "loading" ? (
          <div className="py-10 text-center text-sm text-[#D6B79A]/55">
            {t({ en: "Loading best sellers.", ar: "Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø£ÙƒØ«Ø± Ù…Ø¨ÙŠØ¹Ù‹Ø§." })}
          </div>
        ) : products.length > 0 ? (
          <div className="best-sellers-marquee reveal-on-scroll" data-reveal>
            <div className="best-sellers-marquee-track">
              {[0, 1].map((loop) => (
                <div
                  key={loop}
                  className="marquee-loop best-sellers-marquee-loop"
                  aria-hidden={loop === 1 ? "true" : undefined}
                >
                  {Array.from({ length: BEST_SELLERS_MARQUEE_REPETITIONS }).map((_, copy) =>
                    products.map((product, index) => {
                      const isVisualDuplicate = loop === 1 || copy > 0;

                      return (
                        <div
                          key={`${loop}-${copy}-${product.slug}`}
                          aria-hidden={isVisualDuplicate ? "true" : undefined}
                          className="w-[13.5rem] shrink-0 min-[380px]:w-[14.25rem] sm:w-[15.5rem] lg:w-[16.5rem]"
                        >
                          <ProductCard
                            product={product}
                            index={index}
                            isDuplicate={isVisualDuplicate}
                            reveal={false}
                            showBlend={false}
                          />
                        </div>
                      );
                    }),
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      </section>
    </>
  );
}

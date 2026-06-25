"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import type { PublicCatalogProduct } from "@/lib/catalog/public-catalog";
import { cn } from "@/lib/utils/cn";

type PriceChip = {
  label: string;
  price: number;
};

function getPriceChips(product: PublicCatalogProduct): PriceChip[] {
  return product.sizes.map((size) => ({ label: size.label, price: size.salePrice }));
}

export function CatalogProductCard({
  product,
  className,
}: {
  product: PublicCatalogProduct;
  className?: string;
}) {
  const { language, dir, t } = useLanguage();
  const currency = language === "ar" ? "ج.م" : "EGP";
  const primaryName = t(product.name);
  const primaryDescription = t(product.note);

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-[#B6885E]/16",
        "bg-gradient-to-b from-[#1B140F] via-[#15100B] to-[#0B0806]",
        "shadow-[0_14px_40px_rgba(0,0,0,0.32)] transition-all duration-500",
        "hover:-translate-y-1 hover:border-[#D6A373]/34 hover:shadow-[0_24px_70px_rgba(0,0,0,0.46)]",
        className,
      )}
    >
      <Link href={`/products/${product.slug}`} className="flex h-full flex-col">
        <div className="relative h-36 overflow-hidden bg-[#120D09] sm:h-44 lg:h-48">
          <Image
            src={product.image}
            alt={primaryName}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 340px"
            className="object-cover object-center brightness-[0.82] contrast-[1.08] saturate-[1.05] transition-all duration-700 ease-out group-hover:scale-[1.06] group-hover:brightness-[0.92]"
          />
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#080302] via-[#080302]/38 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(214,163,115,0.12),transparent_42%)]" />
          </div>
        </div>

        <div className="flex flex-1 flex-col p-3.5 sm:p-4">
          <div className="space-y-1.5">
            <h3 className="font-serif text-base font-bold leading-tight text-[#F5E6D8] sm:text-lg">
              {primaryName}
            </h3>
            <p className="line-clamp-2 min-h-[2.75rem] text-xs leading-[1.7] text-[#D6B79A]/68">
              {primaryDescription}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-1.5">
            {getPriceChips(product).map((chip) => (
              <div
                key={chip.label}
                className="rounded-lg border border-[#B6885E]/20 bg-[#D6A373]/[0.055] px-1 py-2 text-center"
              >
                <p className="text-[10px] font-semibold leading-none text-[#F5E6D8]/88">
                  {chip.label}
                </p>
                <p className="arabic-number mt-1 text-[10px] font-bold leading-tight text-[#D6A373] sm:text-[11px]">
                  {chip.price} <span className="numeric-symbol">{currency}</span>
                </p>
              </div>
            ))}
          </div>

          <div
            className="premium-button mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold"
            dir={dir}
          >
            <ShoppingBag className="h-4 w-4" />
            {t({ en: "View Details", ar: "عرض التفاصيل" })}
            <ArrowRight className={cn("h-3.5 w-3.5", dir === "rtl" && "rotate-180")} />
          </div>
        </div>
      </Link>
    </article>
  );
}

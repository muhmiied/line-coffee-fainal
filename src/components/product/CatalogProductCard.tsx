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

const PRODUCT_IMAGE_STORAGE_MARKER = "/storage/v1/object/public/product-images/";

function isUploadedProductImage(url: string) {
  return url.includes(PRODUCT_IMAGE_STORAGE_MARKER);
}

function getPriceChips(product: PublicCatalogProduct): PriceChip[] {
  return product.sizes.map((size) => ({ label: size.label, price: size.salePrice }));
}

type BadgeEntry = { en: string; ar: string; variant: "new" | "best-seller" | "featured" | "unavailable" };

function getBadgeStack(product: PublicCatalogProduct): BadgeEntry[] {
  const badges: BadgeEntry[] = [];
  if (product.isNew) badges.push({ en: "New", ar: "جديد", variant: "new" });
  if (product.bestSeller) badges.push({ en: "Best Seller", ar: "الأكثر مبيعًا", variant: "best-seller" });
  if (product.featured) badges.push({ en: "Featured", ar: "مميز", variant: "featured" });
  if (!product.isAvailable) badges.push({ en: "Out of Stock", ar: "غير متوفر", variant: "unavailable" });
  return badges;
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
  const badgeStack = getBadgeStack(product);

  return (
    <article className={cn("pub-card group flex h-full flex-col rounded-xl", className)}>
      <Link href={`/products/${product.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-[8/5] overflow-hidden bg-[#120D09]">
          <Image
            src={product.image}
            alt={primaryName}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 340px"
            className={cn(
              "object-center contrast-[1.08] saturate-[1.05] transition-all duration-700 ease-out",
              product.isAvailable ? "brightness-[0.82] group-hover:brightness-[0.92]" : "brightness-[0.44] saturate-[0.7]",
              isUploadedProductImage(product.image)
                ? "object-contain p-3 group-hover:scale-[1.05]"
                : "object-cover group-hover:scale-[1.06]",
            )}
          />
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#080302] via-[#080302]/38 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(214,163,115,0.12),transparent_42%)]" />
            {/* Illuminated seam where the image meets the info panel below */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D6A373]/40 to-transparent" />
          </div>

          {badgeStack.length > 0 ? (
            <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1">
              {badgeStack.map((b) => (
                <span
                  key={b.variant}
                  data-variant={b.variant}
                  className="line-product-badge rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur-sm"
                >
                  {t(b)}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-3.5 sm:p-4">
          <div className="space-y-1.5">
            <h3 className="font-serif text-base font-bold leading-tight text-[#F5E6D8] sm:text-lg">
              {primaryName}
            </h3>
            <p className="line-clamp-2 min-h-[2.75rem] text-xs leading-[1.7] text-[#D6B79A]/85">
              {primaryDescription}
            </p>
          </div>

          <div className="mt-3.5 grid grid-cols-3 gap-1.5 border-t border-[#B6885E]/14 pt-3.5">
            {getPriceChips(product).map((chip) => (
              <div
                key={chip.label}
                className="line-price-chip rounded-lg border px-1 py-2 text-center transition-colors duration-200 group-hover:border-[#D6A373]/32"
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
            className="premium-button pub-btn-3d mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold"
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

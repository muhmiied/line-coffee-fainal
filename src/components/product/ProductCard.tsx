"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { Check, Heart, ShoppingBag } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { useCart } from "@/lib/context/cart";
import { useWishlist } from "@/lib/hooks/useWishlist";
import type { VisualProduct } from "@/types/homepage";
import type { PublicCatalogProduct } from "@/lib/catalog/public-catalog";
import { cn } from "@/lib/utils/cn";
import { MixedNumeric } from "@/components/shared/MixedNumeric";

// ─── Type helpers ─────────────────────────────────────────────────────────────

type NormalizedSize = { label: string; price: string | number };

// Listing cards for these categories intentionally omit the blend/ratio list —
// it makes the small card too crowded. The full composition still shows on the
// product detail page. Other categories have no blend data, so this is a no-op
// for them and leaves them visually unchanged.
const BLEND_HIDDEN_CATEGORIES = new Set(["turkish-blends", "espresso-blends"]);
const PRODUCT_IMAGE_STORAGE_MARKER = "/storage/v1/object/public/product-images/";

function isUploadedProductImage(url: string) {
  return url.includes(PRODUCT_IMAGE_STORAGE_MARKER);
}

function isCatalogProduct(p: VisualProduct | PublicCatalogProduct): p is PublicCatalogProduct {
  return "pricingModel" in p;
}

function getPriceChips(p: VisualProduct | PublicCatalogProduct): NormalizedSize[] {
  if (!isCatalogProduct(p)) {
    return p.sizes.map((s) => ({ label: s.label, price: s.price }));
  }
  return p.sizes.map((s) => ({ label: s.label, price: s.salePrice }));
}

// ─── Placeholder ──────────────────────────────────────────────────────────────

function CinematicPlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a0800] to-[#3e1900]">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FFDCC2]/[4%] ring-1 ring-[#FFDCC2]/[7%]">
        <ShoppingBag className="h-8 w-8 text-[#FFDCC2]/[18%]" />
      </div>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-28 w-56 -translate-x-1/2 rounded-full bg-[#522500]/28 blur-2xl" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type ProductCardProps = {
  product: VisualProduct | PublicCatalogProduct;
  index?: number;
  isDuplicate?: boolean;
  reveal?: boolean;
  href?: string | null;
  showBlend?: boolean;
};

export function ProductCard({
  product,
  index = 0,
  isDuplicate = false,
  reveal = true,
  href,
  showBlend = true,
}: ProductCardProps) {
  const { language, t } = useLanguage();
  const { addItem } = useCart();
  const { toggle: toggleWishlist, isWishlisted } = useWishlist();
  const wishlisted = isWishlisted(product.slug);
  const [justAdded, setJustAdded] = useState(false);
  const currencyLabel = language === "ar" ? "ج.م" : "EGP";
  const productHref = href === undefined ? `/products/${product.slug}` : href;

  const priceChips = getPriceChips(product);
  const isAvailable = !isCatalogProduct(product) || product.isAvailable;
  const description = t(product.note);
  const blend =
    isCatalogProduct(product) && !BLEND_HIDDEN_CATEGORIES.has(product.category)
      ? product.blend
      : undefined;

  const handleWishlist = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggleWishlist(product.slug);
  };

  const handleQuickAdd = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (justAdded || !isAvailable) return;
    const chip = priceChips[0];
    if (!chip) return;
    addItem({
      kind: "product",
      name: product.name,
      detail: { en: chip.label, ar: chip.label },
      pricePerUnit: Number(chip.price),
      qty: 1,
      slug: product.slug,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  type BadgeEntry = { en: string; ar: string; variant: "new" | "best-seller" | "featured" | "visual" };
  const badgeStack: BadgeEntry[] = [];
  if (!isCatalogProduct(product)) {
    if (product.badge) badgeStack.push({ ...product.badge, variant: "visual" });
  } else {
    if (product.isNew) badgeStack.push({ en: "New", ar: "جديد", variant: "new" });
    if (product.bestSeller) badgeStack.push({ en: "Best Seller", ar: "الأكثر مبيعًا", variant: "best-seller" });
    if (product.featured) badgeStack.push({ en: "Featured", ar: "مميز", variant: "featured" });
  }

  const card = (
    <div
      className={cn(
        "luxury-card relative overflow-hidden rounded-xl",
        "border border-[#B6885E]/[16%]",
        "bg-gradient-to-b from-[#1B140F] via-[#15100B] to-[#0B0806]",
        "shadow-[0_12px_34px_rgba(0,0,0,0.30)]",
        "group-hover:border-[#D6A373]/[34%]",
      )}
    >
      {/* Image zone */}
      <div className="relative h-40 overflow-hidden bg-[#120D09] min-[380px]:h-44 sm:h-48 lg:aspect-[8/5] lg:h-auto">
        {product.image ? (
          <Image
            src={product.image}
            alt={t(product.name)}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 320px"
            loading="lazy"
            className={cn(
              "object-center brightness-[0.82] contrast-[1.08] saturate-[1.05] transition-all duration-700 ease-out group-hover:brightness-[0.92]",
              isUploadedProductImage(product.image)
                ? "object-contain p-2 group-hover:scale-[1.05] sm:p-3"
                : "object-cover group-hover:scale-[1.08]",
            )}
          />
        ) : (
          <CinematicPlaceholder />
        )}

        {/* Cinematic overlays */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-[#0a0300]/90 via-[#0a0300]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#522500]/22 to-transparent mix-blend-multiply" />
          <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(circle_at_50%_12%,rgba(214,163,115,0.14),transparent_34%)]" />
        </div>

        {/* Badge stack */}
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

        {/* Wishlist */}
        <button
          type="button"
          aria-label={
            wishlisted
              ? t({ en: "Remove from wishlist", ar: "أزل من المفضلة" })
              : t({ en: "Add to wishlist", ar: "أضف إلى المفضلة" })
          }
          aria-pressed={wishlisted ? "true" : "false"}
          onClick={handleWishlist}
          tabIndex={isDuplicate ? -1 : undefined}
          className={cn(
            "absolute right-3 top-3 z-10",
            "flex h-8 w-8 items-center justify-center rounded-full",
            "border border-[#B6885E]/20 bg-[#120D09]/82 text-[#D6B79A]/75 backdrop-blur-md shadow-[0_12px_28px_rgba(0,0,0,0.35)]",
            "opacity-100 transition-all duration-300 sm:scale-[0.84] sm:opacity-0 sm:group-hover:scale-100 sm:group-hover:opacity-100",
            "hover:border-[#D6A373]/45 hover:bg-[#B6885E]/15",
          )}
        >
          <Heart
            className={cn(
              "h-3.5 w-3.5 transition-colors",
              wishlisted && "fill-[#D6A373] text-[#D6A373]",
            )}
          />
        </button>

        {/* Quick Add */}
        <div className="absolute inset-x-0 bottom-0 z-10 translate-y-0 p-2.5 opacity-100 transition-all duration-300 ease-out sm:translate-y-3 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={handleQuickAdd}
            tabIndex={isDuplicate ? -1 : undefined}
            disabled={!isAvailable}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[11px] font-semibold transition-all duration-300 sm:gap-2 sm:text-sm",
              !isAvailable
                ? "cursor-not-allowed border border-[#B6885E]/20 bg-[#120D09]/88 text-[#D6B79A]/52"
                : justAdded
                ? "border border-[#D6A373]/40 bg-[#D6A373]/14 text-[#D6A373]"
                : "premium-button",
            )}
          >
            {!isAvailable ? (
              <><ShoppingBag className="h-4 w-4" />{t({ en: "Out of Stock", ar: "غير متوفر" })}</>
            ) : justAdded ? (
              <><Check className="h-4 w-4" />{t({ en: "Added!", ar: "تمت الإضافة!" })}</>
            ) : (
              <><ShoppingBag className="h-4 w-4" />{t({ en: "Quick Add", ar: "إضافة سريعة" })}</>
            )}
          </button>
        </div>
      </div>

      {/* Info zone */}
      <div className="space-y-2.5 px-2.5 pb-3 pt-3 sm:px-3.5 sm:pb-4 sm:pt-3.5">
        <div className="space-y-1.5">
          <h3 className="line-clamp-1 font-serif text-[14px] font-semibold leading-snug text-[#F5E6D8]/90 transition-colors duration-300 group-hover:text-[#F5E6D8] sm:text-[15px]">
            {t(product.name)}
          </h3>
          {description ? (
            <p className="line-clamp-2 min-h-[2rem] text-[11px] leading-4 text-[#D6B79A]/78 sm:text-xs">
              {description}
            </p>
          ) : null}

          {/* Blend composition */}
          {showBlend && blend && blend.length > 0 ? (
            <div className="border-t border-[#B6885E]/12 pt-2">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#D6A373]/75">
                {t({ en: "Blend", ar: "التوليفة" })}
              </p>
              <div className="space-y-0.5">
                {blend.map((b) => (
                  <div key={b.origin.en} className="flex items-center justify-between gap-1">
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="truncate text-[9px] text-[#D6B79A]/70 sm:text-[10px]">
                        {t(b.origin)}
                      </span>
                      <span
                        className={
                          b.beanType === "arabica"
                            ? "shrink-0 text-[8px] leading-none text-[#D6A373]/80"
                            : "shrink-0 text-[8px] leading-none text-[#F5E6D8]/35"
                        }
                      >
                        {b.beanType === "arabica"
                          ? t({ en: "Arabica", ar: "أرابيكا" })
                          : t({ en: "Robusta", ar: "روبوستا" })}
                      </span>
                    </div>
                    <span className="shrink-0 text-[9px] font-semibold text-[#D6A373]/85 sm:text-[10px]">
                      <MixedNumeric text={`${b.pct}%`} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Price grid */}
        <div
          className={cn(
            "grid gap-1",
            priceChips.length === 1 && "grid-cols-1",
            priceChips.length === 2 && "grid-cols-2",
            priceChips.length >= 3 && "grid-cols-3",
          )}
        >
          {priceChips.map((chip) => (
            <div
              key={chip.label}
              className="line-price-chip rounded-lg border border-[#B6885E]/22 bg-[#D6A373]/[0.055] px-1 py-2 text-center text-[#F5E6D8] transition-all duration-200 group-hover:border-[#D6A373]/36 sm:px-1.5 sm:py-2.5"
            >
              <p className="text-[10px] font-semibold leading-none tracking-[0.02em] sm:text-[11px]">
                {chip.label}
              </p>
              <p className="mt-1 text-[9px] font-bold leading-tight text-[#D6A373] min-[380px]:text-[10px] sm:text-[11px]">
                {chip.price}{" "}
                <span className="numeric-symbol">{currencyLabel}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "group",
        reveal && "reveal-on-scroll",
        reveal && `reveal-delay-${Math.min(index, 10)}`,
      )}
      data-reveal={reveal ? "" : undefined}
    >
      {productHref ? (
        <Link
          href={productHref}
          tabIndex={isDuplicate ? -1 : undefined}
          className="block"
          aria-hidden={isDuplicate ? "true" : undefined}
        >
          {card}
        </Link>
      ) : (
        card
      )}
    </div>
  );
}

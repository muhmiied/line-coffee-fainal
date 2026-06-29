"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { AccountShell } from "@/components/layout/account/AccountShell";
import { useWishlist } from "@/lib/hooks/useWishlist";
import {
  getPublicProductsBySlugs,
  type PublicCatalogProduct,
} from "@/lib/catalog/public-catalog";
import { useCart } from "@/lib/context/cart";

export default function WishlistPage() {
  const { t } = useLanguage();
  const { addItem } = useCart();

  // Owner-scoped wishlist (auth user or guest) — shared with the header + cards.
  const { ids: wishlistIds, remove } = useWishlist();
  const [products, setProducts] = useState<PublicCatalogProduct[]>([]);
  const [catalogState, setCatalogState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const wishlistKey = wishlistIds.join("|");
  const visibleProducts = products.filter((product) => wishlistIds.includes(product.slug));

  useEffect(() => {
    let isMounted = true;

    if (wishlistIds.length === 0) return;

    getPublicProductsBySlugs(wishlistIds)
      .then((nextProducts) => {
        if (!isMounted) return;
        setProducts(nextProducts);
        setCatalogState("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        setProducts([]);
        setCatalogState("error");
      });

    return () => {
      isMounted = false;
    };
  }, [wishlistIds, wishlistKey]);

  const handleAddToCart = (slug: string) => {
    const product = visibleProducts.find((p) => p.slug === slug);
    if (!product) return;
    const firstSize = product.sizes[0];
    addItem({
      kind:         "product",
      name:         product.name,
      detail:       firstSize ? { en: firstSize.label, ar: firstSize.label } : { en: "", ar: "" },
      pricePerUnit: firstSize?.salePrice ?? 0,
      qty:          1,
      slug:         product.slug,
    });
  };

  return (
    <AccountShell title={{ en: "Wishlist", ar: "المحفوظات" }}>
      {wishlistIds.length === 0 ? (
        <div className="rounded-xl border border-[#B6885E]/10 bg-[#120D09] px-6 py-16 text-center">
          <Heart className="mx-auto mb-4 h-10 w-10 text-[#B6885E]/25" />
          <p className="mb-1 text-sm font-medium text-[#F5E6D8]/70">
            {t({ en: "Your wishlist is empty", ar: "Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø­ÙÙˆØ¸Ø§Øª ÙØ§Ø±ØºØ©" })}
          </p>
          <p className="mb-6 text-xs text-[#B79B85]/50">
            {t({ en: "Tap the heart icon on any product to save it here.", ar: "Ø§Ø¶ØºØ· Ø£ÙŠÙ‚ÙˆÙ†Ø© Ø§Ù„Ù‚Ù„Ø¨ Ø¹Ù„Ù‰ Ø£ÙŠ Ù…Ù†ØªØ¬ Ù„Ø­ÙØ¸Ù‡ Ù‡Ù†Ø§." })}
          </p>
          <Link href="/products" className="premium-button inline-block px-8 py-2.5 text-sm">
            {t({ en: "Browse products", ar: "ØªØµÙØ­ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª" })}
          </Link>
        </div>
      ) : catalogState === "idle" || catalogState === "loading" ? (
        <div className="rounded-xl border border-[#B6885E]/10 bg-[#120D09] px-6 py-16 text-center">
          <Heart className="mx-auto mb-4 h-10 w-10 text-[#B6885E]/25" />
          <p className="mb-1 text-sm font-medium text-[#F5E6D8]/70">
            {t({ en: "Loading saved products", ar: "Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„Ù…Ø­ÙÙˆØ¸Ø©" })}
          </p>
        </div>
      ) : catalogState === "error" ? (
        <div className="rounded-xl border border-[#B6885E]/10 bg-[#120D09] px-6 py-16 text-center">
          <Heart className="mx-auto mb-4 h-10 w-10 text-[#B6885E]/25" />
          <p className="mb-1 text-sm font-medium text-[#F5E6D8]/70">
            {t({ en: "Saved products could not be loaded", ar: "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„Ù…Ø­ÙÙˆØ¸Ø©" })}
          </p>
          <p className="text-xs text-[#B79B85]/50">
            {t({ en: "Please try again in a moment.", ar: "ÙŠØ±Ø¬Ù‰ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ù…Ø±Ø© Ø£Ø®Ø±Ù‰ Ø¨Ø¹Ø¯ Ù‚Ù„ÙŠÙ„." })}
          </p>
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="rounded-xl border border-[#B6885E]/10 bg-[#120D09] px-6 py-16 text-center">
          <Heart className="mx-auto mb-4 h-10 w-10 text-[#B6885E]/25" />
          <p className="mb-1 text-sm font-medium text-[#F5E6D8]/70">
            {t({ en: "Your wishlist is empty", ar: "قائمة المحفوظات فارغة" })}
          </p>
          <p className="mb-6 text-xs text-[#B79B85]/50">
            {t({ en: "Tap the heart icon on any product to save it here.", ar: "اضغط أيقونة القلب على أي منتج لحفظه هنا." })}
          </p>
          <Link href="/products" className="premium-button inline-block px-8 py-2.5 text-sm">
            {t({ en: "Browse products", ar: "تصفح المنتجات" })}
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleProducts.map((product) => {
            const firstPrice = product.sizes[0];
            return (
              <div
                key={product.slug}
                className="group relative rounded-xl border border-[#B6885E]/10 bg-[#120D09] p-4 transition-all hover:border-[#B6885E]/22"
              >
                {/* Remove */}
                <button
                  type="button"
                  onClick={() => remove(product.slug)}
                  className="absolute end-3 top-3 rounded-full p-1.5 text-[#B79B85]/40 transition-colors hover:text-red-400/70"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="flex items-start gap-3">
                  {/* Image */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#1B140F]">
                    {product.image && (
                      <Image
                        src={product.image}
                        alt={product.name.en}
                        fill
                        sizes="4rem"
                        className="object-cover"
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 pe-6">
                    <Link
                      href={`/products/${product.slug}`}
                      className="block text-sm font-medium text-[#F5E6D8] hover:text-[#D6A373]"
                    >
                      {t(product.name)}
                    </Link>
                    {firstPrice && (
                      <p className="mt-0.5 text-xs text-[#B6885E]">
                        {firstPrice.salePrice} {t({ en: "EGP", ar: "ج.م" })} / {firstPrice.label}
                      </p>
                    )}
                  </div>
                </div>

                {/* Add to cart */}
                <button
                  type="button"
                  onClick={() => handleAddToCart(product.slug)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#B6885E]/20 py-2 text-xs text-[#B79B85]/70 transition-all hover:border-[#B6885E]/40 hover:text-[#D6A373]"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  {t({ en: "Add to cart", ar: "أضف للسلة" })}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </AccountShell>
  );
}

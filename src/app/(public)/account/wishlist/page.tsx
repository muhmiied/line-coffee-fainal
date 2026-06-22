"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { AccountShell } from "@/components/layout/account/AccountShell";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { catalogProducts } from "@/lib/mock-data/product-catalog";
import { useCart } from "@/lib/context/cart";

export default function WishlistPage() {
  const { t } = useLanguage();
  const { addItem } = useCart();

  const [wishlistIds, setWishlistIds] = useLocalStorage<string[]>("line-wishlist-v1", []);

  const products = catalogProducts.filter((p) => wishlistIds.includes(p.slug));

  const remove = (slug: string) =>
    setWishlistIds((prev) => prev.filter((id) => id !== slug));

  const handleAddToCart = (slug: string) => {
    const product = products.find((p) => p.slug === slug);
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
      {products.length === 0 ? (
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
          {products.map((product) => {
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

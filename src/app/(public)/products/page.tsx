"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ChevronRight, Search, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { ProductCard } from "@/components/product/ProductCard";
import {
  getPublicCategories,
  getPublicProducts,
  type PublicCatalogCategory,
  type PublicCatalogProduct,
} from "@/lib/catalog/public-catalog";
import { EspressoBlendStudio } from "@/features/website/make-your-espresso/EspressoBlendStudio";
import { FlavorMixStudio } from "@/features/website/make-your-flavor/FlavorMixStudio";

type CatalogLoadState = "loading" | "ready" | "error";
type StudioCategory = "make-your-espresso" | "make-your-flavor";
type ActiveCategory = string | StudioCategory;

const STUDIO_CATEGORY_IDS: StudioCategory[] = ["make-your-espresso", "make-your-flavor"];

type SidebarItem =
  | { kind: "cat"; slug: string; name: { en: string; ar: string } }
  | { kind: "studio"; id: StudioCategory; label: { en: string; ar: string }; disabled?: boolean };

function isStudioCategory(value: string): value is StudioCategory {
  return STUDIO_CATEGORY_IDS.includes(value as StudioCategory);
}

function buildSidebarItems(categories: PublicCatalogCategory[]): SidebarItem[] {
  const items: SidebarItem[] = [];

  for (const cat of categories) {
    items.push({ kind: "cat", slug: cat.slug, name: cat.name });

    if (cat.slug === "espresso-blends") {
      items.push({
        kind: "studio",
        id: "make-your-espresso",
        label: { en: "Make Your Espresso", ar: "Ø§ØµÙ†Ø¹ Ø¥Ø³Ø¨Ø±ÙŠØ³Ùˆ Ø®Ø§ØµØªÙƒ" },
      });
    }

    if (cat.slug === "flavor-coffee") {
      items.push({
        kind: "studio",
        id: "make-your-flavor",
        label: { en: "Make Your Flavor", ar: "Ø§ØµÙ†Ø¹ Ù†ÙƒÙ‡ØªÙƒ" },
      });
    }
  }

  return items;
}

function ProductsHero() {
  const { t } = useLanguage();
  return (
    <div className="products-hero relative flex h-[45vh] min-h-[320px] items-center justify-center">
      <Image
        src="/assets/story/roastery.png"
        alt="Line Coffee Products"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center brightness-[0.58] contrast-[1.14] saturate-[1.08]"
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B0806]/70 via-transparent to-[#120D09]/50 mix-blend-multiply" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.75)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#0B0806] via-[#0B0806]/60 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0B0806]/80 via-[#0B0806]/30 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_65%,_rgba(182,136,94,0.08)_0%,_transparent_70%)]" />

      <div className="relative z-10 px-4 text-center text-white">
        <h1 className="mb-4 font-serif text-4xl font-bold md:text-5xl lg:text-6xl">
          {t({ en: "Our Products", ar: "Ù…Ù†ØªØ¬Ø§ØªÙ†Ø§" })}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-white/90 md:text-xl">
          {t({
            en: "Discover our carefully curated selection of premium coffee.",
            ar: "Ø§ÙƒØªØ´Ù Ù…Ø¬Ù…ÙˆØ¹ØªÙ†Ø§ Ø§Ù„Ù…Ù†ØªÙ‚Ø§Ø© Ù…Ù† Ø§Ù„Ù‚Ù‡ÙˆØ© Ø§Ù„ÙØ§Ø®Ø±Ø©.",
          })}
        </p>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<PublicCatalogCategory[]>([]);
  const [products, setProducts] = useState<PublicCatalogProduct[]>([]);
  const [catalogState, setCatalogState] = useState<CatalogLoadState>("loading");
  const [selectedCategory, setSelectedCategory] = useState<ActiveCategory>("");
  const [search, setSearch] = useState("");

  const rawCat = searchParams.get("category") ?? searchParams.get("cat");
  const sidebarItems = useMemo(() => buildSidebarItems(categories), [categories]);
  const validCategories = useMemo(
    () => new Set<ActiveCategory>([...categories.map((category) => category.slug), ...STUDIO_CATEGORY_IDS]),
    [categories],
  );

  useEffect(() => {
    let isMounted = true;

    Promise.all([getPublicCategories(), getPublicProducts()])
      .then(([nextCategories, nextProducts]) => {
        if (!isMounted) return;
        setCategories(nextCategories);
        setProducts(nextProducts);
        setCatalogState("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        setCategories([]);
        setProducts([]);
        setCatalogState("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const fallbackCategory = categories[0]?.slug ?? "";
  const activeCategory =
    (rawCat && validCategories.has(rawCat) ? rawCat : "") ||
    (selectedCategory && validCategories.has(selectedCategory) ? selectedCategory : "") ||
    fallbackCategory;

  const selectCategory = (cat: ActiveCategory) => {
    setSelectedCategory(cat);
    router.replace(`/products?category=${cat}`, { scroll: false });
  };

  const filtered = useMemo(() => {
    if (!activeCategory || isStudioCategory(activeCategory)) return [];

    let list = products.filter((p) => p.category === activeCategory);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.en.toLowerCase().includes(q) ||
          p.name.ar.includes(q),
      );
    }
    return list;
  }, [activeCategory, products, search]);

  const isStudio = activeCategory ? isStudioCategory(activeCategory) : false;

  return (
    <div className="min-h-screen bg-[#0B0806]">
      <ProductsHero />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="shrink-0 lg:w-64">
            <div className="luxury-panel sticky top-28 rounded-2xl p-4">
              <h2 className="mb-4 px-2 font-serif text-lg font-semibold text-[#F5E6D8]/90">
                {t({ en: "Categories", ar: "Ø§Ù„ØªØµÙ†ÙŠÙØ§Øª" })}
              </h2>
              <nav className="space-y-1">
                {sidebarItems.map((item) => {
                  if (item.kind === "cat") {
                    const isActive = activeCategory === item.slug;
                    return (
                      <button
                        key={item.slug}
                        type="button"
                        onClick={() => {
                          selectCategory(item.slug);
                          setSearch("");
                        }}
                        className={
                          isActive
                            ? "products-cat-active w-full rounded-xl border border-transparent px-4 py-3 text-left text-sm font-semibold"
                            : "w-full rounded-xl border border-transparent px-4 py-3 text-left text-sm text-[#D6B79A]/75 transition-all duration-200 hover:border-[#B6885E]/20 hover:bg-[#B6885E]/8 hover:text-[#F5E6D8]/80"
                        }
                      >
                        {t(item.name)}
                      </button>
                    );
                  }

                  const isActive = activeCategory === item.id;
                  if (item.disabled) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled
                        className="w-full cursor-not-allowed rounded-xl border border-[#D6A373]/10 bg-[#D6A373]/5 px-4 py-3 text-left text-sm font-semibold text-[#D6A373]/35"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span>{t(item.label)}</span>
                          <span className="text-[10px] uppercase tracking-[0.14em] text-[#D6B79A]/30">
                            {t({ en: "Soon", ar: "Ù‚Ø±ÙŠØ¨Ø§Ù‹" })}
                          </span>
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectCategory(item.id)}
                      className={`${item.id === "make-your-espresso" ? "studio-espresso-btn" : "studio-flavor-btn"} mt-1 flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold${isActive ? " ring-2 ring-white/20 brightness-110" : ""}`}
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                        {t(item.label)}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            {catalogState === "loading" ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                <p className="font-serif text-lg text-[#F5E6D8]/50">
                  {t({ en: "Loading products", ar: "Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª" })}
                </p>
                <p className="text-sm text-[#D6B79A]/40">
                  {t({ en: "Reading the live catalog.", ar: "Ù†Ù‚Ø±Ø£ Ø§Ù„ÙƒØ§ØªØ§Ù„ÙˆØ¬ Ø§Ù„Ø­ÙŠ." })}
                </p>
              </div>
            ) : catalogState === "error" ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                <p className="font-serif text-lg text-[#F5E6D8]/50">
                  {t({ en: "Products could not be loaded", ar: "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª" })}
                </p>
                <p className="text-sm text-[#D6B79A]/40">
                  {t({ en: "Please try again in a moment.", ar: "ÙŠØ±Ø¬Ù‰ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ù…Ø±Ø© Ø£Ø®Ø±Ù‰ Ø¨Ø¹Ø¯ Ù‚Ù„ÙŠÙ„." })}
                </p>
              </div>
            ) : isStudio ? (
              activeCategory === "make-your-espresso" ? (
                <EspressoBlendStudio embedded />
              ) : (
                <FlavorMixStudio embedded />
              )
            ) : (
              <>
                <div className="relative mb-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D6B79A]/45" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t({ en: "Search products...", ar: "ابحث عن منتج..." })}
                    className="line-input line-input-search w-full"
                  />
                </div>

                <p className="mb-5 text-sm text-[#D6B79A]/55">
                  {filtered.length}{" "}
                  {t({ en: "products", ar: "Ù…Ù†ØªØ¬" })}
                </p>

                {filtered.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-3">
                    {filtered.map((product, i) => (
                      <ProductCard
                        key={product.slug}
                        product={product}
                        index={i}
                        reveal={false}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                    <p className="font-serif text-lg text-[#F5E6D8]/50">
                      {t({ en: "No products found", ar: "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù†ØªØ¬Ø§Øª" })}
                    </p>
                    <p className="text-sm text-[#D6B79A]/40">
                      {t({ en: "Try a different search or category", ar: "Ø¬Ø±Ø¨ Ø¨Ø­Ø«Ø§Ù‹ Ø£Ùˆ ØªØµÙ†ÙŠÙØ§Ù‹ Ù…Ø®ØªÙ„ÙØ§Ù‹" })}
                    </p>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

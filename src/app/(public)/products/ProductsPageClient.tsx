"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ChevronRight, Eye, Loader2, Search, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { ProductCard } from "@/components/product/ProductCard";
import {
  getPublicProductsByCategorySlugPage,
  searchPublicProductsByCategorySlug,
  type PublicCatalogCategory,
  type PublicCatalogProduct,
} from "@/lib/catalog/public-catalog";
// The builders are heavy (bean/flavor catalogs + pricing engines + rich UI) and
// only render when a studio category is selected, so load them on demand instead
// of shipping them in the products page's initial JS bundle.
function StudioFallback() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-[320px] items-center justify-center text-sm text-[#D6B79A]/65">
      {t({ en: "Loading studio…", ar: "جارٍ تحميل الاستوديو…" })}
    </div>
  );
}
const EspressoBlendStudio = dynamic(
  () =>
    import("@/features/website/make-your-espresso/EspressoBlendStudio").then(
      (m) => m.EspressoBlendStudio,
    ),
  { ssr: false, loading: StudioFallback },
);
const FlavorMixStudio = dynamic(
  () =>
    import("@/features/website/make-your-flavor/FlavorMixStudio").then(
      (m) => m.FlavorMixStudio,
    ),
  { ssr: false, loading: StudioFallback },
);

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;
// A stable empty-array reference so `current?.products ?? EMPTY_PRODUCTS`
// doesn't create a new array identity on every render when there is no
// cached category data yet (which would otherwise invalidate memo hooks
// downstream on every render).
const EMPTY_PRODUCTS: PublicCatalogProduct[] = [];

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
        label: { en: "Make Your Espresso", ar: "اصنع إسبريسو خاصتك" },
      });
    }

    if (cat.slug === "flavor-coffee") {
      items.push({
        kind: "studio",
        id: "make-your-flavor",
        label: { en: "Make Your Flavor", ar: "اصنع نكهتك" },
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
        <h1 className="pub-display mb-4 font-serif text-4xl font-bold md:text-5xl lg:text-6xl">
          {t({ en: "Our Products", ar: "منتجاتنا" })}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-white/90 md:text-xl">
          {t({
            en: "Discover our carefully curated selection of premium coffee.",
            ar: "اكتشف مجموعتنا المنتقاة من القهوة الفاخرة.",
          })}
        </p>
      </div>
    </div>
  );
}

type CategoryState = {
  products: PublicCatalogProduct[];
  totalCount: number;
  /** Search query these products were loaded for; "" means unsearched. */
  loadedForQuery: string;
};

export type ProductsPageClientProps = {
  categories: PublicCatalogCategory[];
  initialCategorySlug: string;
  initialProducts: PublicCatalogProduct[];
  initialTotalCount: number;
};

export default function ProductsPageClient({
  categories,
  initialCategorySlug,
  initialProducts,
  initialTotalCount,
}: ProductsPageClientProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<ActiveCategory>(initialCategorySlug);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryData, setCategoryData] = useState<Record<string, CategoryState>>(
    initialCategorySlug
      ? {
          [initialCategorySlug]: {
            products: initialProducts,
            totalCount: initialTotalCount,
            loadedForQuery: "",
          },
        }
      : {},
  );
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const rawCat = searchParams.get("category") ?? searchParams.get("cat");
  const previewProductSlug = searchParams.get("previewProduct");
  const previewImageUrl = searchParams.get("previewImage");
  const sidebarItems = useMemo(() => buildSidebarItems(categories), [categories]);
  const validCategories = useMemo(
    () => new Set<ActiveCategory>([...categories.map((category) => category.slug), ...STUDIO_CATEGORY_IDS]),
    [categories],
  );

  // Debounce the search box so every keystroke doesn't fire a request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fallbackCategory = categories[0]?.slug ?? "";
  const activeCategory =
    (rawCat && validCategories.has(rawCat) ? rawCat : "") ||
    (selectedCategory && validCategories.has(selectedCategory) ? selectedCategory : "") ||
    fallbackCategory;
  const isStudio = activeCategory ? isStudioCategory(activeCategory) : false;

  // Fetch the active category's products whenever the category or the
  // (debounced) search query changes and we don't already have a matching
  // page cached — database-backed search, real pagination, no full-catalog
  // download.
  useEffect(() => {
    if (!activeCategory || isStudioCategory(activeCategory)) return;
    const cached = categoryData[activeCategory];
    if (cached && cached.loadedForQuery === debouncedSearch) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch driven by category/search state
    setLoadingCategory(true);
    setLoadError(false);
    const range = { from: 0, to: PAGE_SIZE - 1 };
    const fetcher = debouncedSearch
      ? searchPublicProductsByCategorySlug(activeCategory, debouncedSearch, range)
      : getPublicProductsByCategorySlugPage(activeCategory, range);

    fetcher
      .then(({ products, totalCount }) => {
        if (cancelled) return;
        setCategoryData((prev) => ({
          ...prev,
          [activeCategory]: { products, totalCount, loadedForQuery: debouncedSearch },
        }));
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingCategory(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- categoryData is read, not a trigger; re-running on its own change would refetch every render
  }, [activeCategory, debouncedSearch]);

  const selectCategory = (cat: ActiveCategory) => {
    setSelectedCategory(cat);
    setSearchInput("");
    router.replace(`/products?category=${cat}`, { scroll: false });
  };

  const current = categoryData[activeCategory];
  const products = current?.products ?? EMPTY_PRODUCTS;
  const totalCount = current?.totalCount ?? 0;
  const hasMore = products.length < totalCount;

  function handleLoadMore() {
    if (!activeCategory || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const range = { from: products.length, to: products.length + PAGE_SIZE - 1 };
    const fetcher = debouncedSearch
      ? searchPublicProductsByCategorySlug(activeCategory, debouncedSearch, range)
      : getPublicProductsByCategorySlugPage(activeCategory, range);

    fetcher
      .then(({ products: more }) => {
        setCategoryData((prev) => {
          const existing = prev[activeCategory];
          if (!existing) return prev;
          return {
            ...prev,
            [activeCategory]: { ...existing, products: [...existing.products, ...more] },
          };
        });
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoadingMore(false));
  }

  const previewOverride = useMemo(() => {
    if (!previewProductSlug || !previewImageUrl) return null;
    const previewProduct = products.find((product) => product.slug === previewProductSlug);
    if (!previewProduct) return null;
    const categoryImage = categories.find(
      (category) => category.slug === previewProduct.category,
    )?.image;
    const imageIsAllowed =
      previewProduct.image === previewImageUrl ||
      previewProduct.gallery.includes(previewImageUrl) ||
      categoryImage === previewImageUrl;
    return imageIsAllowed
      ? { slug: previewProduct.slug, image: previewImageUrl }
      : null;
  }, [categories, previewImageUrl, previewProductSlug, products]);

  const displayedProducts = useMemo(() => {
    if (!previewOverride) return products;
    return products.map((product) =>
      product.slug === previewOverride.slug
        ? { ...product, image: previewOverride.image }
        : product,
    );
  }, [previewOverride, products]);

  return (
    <div className="min-h-screen bg-[#0B0806]">
      <ProductsHero />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="shrink-0 lg:w-64">
            <div className="luxury-panel sticky top-28 rounded-2xl p-4">
              <h2 className="mb-4 px-2 font-serif text-lg font-semibold text-[#F5E6D8]/90">
                {t({ en: "Categories", ar: "التصنيفات" })}
              </h2>
              <nav className="space-y-1">
                {sidebarItems.map((item) => {
                  if (item.kind === "cat") {
                    const isActive = activeCategory === item.slug;
                    return (
                      <button
                        key={item.slug}
                        type="button"
                        onClick={() => selectCategory(item.slug)}
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
                            {t({ en: "Soon", ar: "قريباً" })}
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

          <div className="min-w-0 flex-1">
            {isStudio ? (
              activeCategory === "make-your-espresso" ? (
                <EspressoBlendStudio embedded />
              ) : (
                <FlavorMixStudio embedded />
              )
            ) : (
              <>
                <div className="relative mb-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D6B79A]/65" />
                  <input
                    type="search"
                    aria-label={t({ en: "Search products", ar: "ابحث عن منتج" })}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={t({ en: "Search products...", ar: "ابحث عن منتج..." })}
                    className="line-input line-input-search w-full"
                  />
                </div>

                <p className="mb-5 text-sm text-[#D6BB9F]/75">
                  {hasMore
                    ? `${products.length} / ${totalCount} ${t({ en: "products", ar: "منتج" })}`
                    : `${totalCount} ${t({ en: "products", ar: "منتج" })}`}
                </p>

                {previewOverride && (
                  <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#D6A373]/25 bg-[#D6A373]/8 px-4 py-3 text-xs text-[#D6B79A]/80">
                    <Eye className="h-4 w-4 shrink-0 text-[#D6A373]" />
                    {t({
                      en: "Image preview — this change is not published yet.",
                      ar: "معاينة الصورة — لم يتم نشر هذا التغيير بعد.",
                    })}
                  </div>
                )}

                {loadError ? (
                  <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                    <p className="font-serif text-lg text-[#F5E6D8]/70">
                      {t({ en: "Products could not be loaded", ar: "تعذر تحميل المنتجات" })}
                    </p>
                    <p className="text-sm text-[#D6BB9F]/82">
                      {t({ en: "Please try again in a moment.", ar: "يرجى المحاولة مرة أخرى بعد قليل." })}
                    </p>
                  </div>
                ) : displayedProducts.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-3">
                      {displayedProducts.map((product, i) => (
                        <ProductCard
                          key={product.slug}
                          product={product}
                          index={i}
                          reveal={false}
                        />
                      ))}
                    </div>
                    {hasMore && (
                      <div className="mt-8 flex justify-center">
                        <button
                          type="button"
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="premium-button-outline inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold disabled:opacity-60"
                        >
                          {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                          {t({ en: "Load More", ar: "عرض المزيد" })}
                        </button>
                      </div>
                    )}
                  </>
                ) : loadingCategory ? (
                  <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                    <p className="font-serif text-lg text-[#F5E6D8]/70">
                      {t({ en: "Loading products", ar: "جاري تحميل المنتجات" })}
                    </p>
                  </div>
                ) : (
                  <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                    <p className="font-serif text-lg text-[#F5E6D8]/70">
                      {t({ en: "No products found", ar: "لا توجد منتجات" })}
                    </p>
                    <p className="text-sm text-[#D6BB9F]/82">
                      {t({ en: "Try a different search or category", ar: "جرّب بحثاً أو تصنيفاً مختلفاً" })}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

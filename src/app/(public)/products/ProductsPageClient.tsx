"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ChevronRight, Eye, Loader2, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/context/language";
import { ProductCard } from "@/components/product/ProductCard";
import {
  getProductTasteFilterOptions,
  matchesProductTasteFilter,
  organizeFlavorCategoryProducts,
  type ProductTasteFilterKey,
} from "@/lib/catalog/product-taste-filters";
import {
  getPublicProductsByCategorySlugPage,
  searchPublicProductsByCategorySlug,
  type PublicCatalogCategory,
  type PublicCatalogProduct,
} from "@/lib/catalog/public-catalog";
import { cn } from "@/lib/utils/cn";
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

// Taste-family filters run over one complete category at a time. The current
// catalog's largest category has 30 products; this bounded page keeps those
// filters complete while preserving the existing pagination fallback.
const PAGE_SIZE = 120;
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
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#120A06] via-[#120A06]/62 to-transparent" />
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

function categoryRequestKey(
  categorySlug: string,
  query: string,
  range: { from: number; to: number },
) {
  return `${categorySlug}\u0000${query}\u0000${range.from}:${range.to}`;
}

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
  const { dir, t } = useLanguage();
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<ActiveCategory>(initialCategorySlug);
  const [searchInput, setSearchInput] = useState("");
  const [tasteFilter, setTasteFilter] = useState<ProductTasteFilterKey>("all");
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
  const categoryRequests = useRef(new Map<string, Promise<CategoryState>>());

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
    (selectedCategory && validCategories.has(selectedCategory) ? selectedCategory : "") ||
    fallbackCategory;
  const isStudio = activeCategory ? isStudioCategory(activeCategory) : false;

  useEffect(() => {
    const categoryFromUrl =
      (rawCat && validCategories.has(rawCat) ? rawCat : "") || fallbackCategory;
    if (!categoryFromUrl) return;

    // Native History API updates are integrated with useSearchParams by the
    // App Router. This keeps browser history or an external URL edit in sync
    // without turning an in-page category tab into a new server navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizes browser history with local UI state
    setSelectedCategory((current) =>
      current === categoryFromUrl ? current : categoryFromUrl,
    );
  }, [fallbackCategory, rawCat, validCategories]);

  useEffect(() => {
    // Keep browser back/forward or direct URL category changes from carrying a
    // taste family that only exists in the previous category.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset is driven by URL-derived category state
    setTasteFilter("all");
  }, [activeCategory]);

  const loadCategoryPage = useCallback(
    (
      categorySlug: string,
      query: string,
      range: { from: number; to: number },
    ) => {
      const key = categoryRequestKey(categorySlug, query, range);
      const existing = categoryRequests.current.get(key);
      if (existing) return existing;

      const request = (
        query
          ? searchPublicProductsByCategorySlug(categorySlug, query, range, categories)
          : getPublicProductsByCategorySlugPage(categorySlug, range, categories)
      )
        .then(({ products, totalCount }) => ({
          products,
          totalCount,
          loadedForQuery: query,
        }))
        .catch((error: unknown) => {
          // Failed reads stay retryable; successful public catalog pages remain
          // cached for this mounted products experience.
          categoryRequests.current.delete(key);
          throw error;
        });

      categoryRequests.current.set(key, request);
      return request;
    },
    [categories],
  );

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
    loadCategoryPage(activeCategory, debouncedSearch, { from: 0, to: PAGE_SIZE - 1 })
      .then((next) => {
        if (cancelled) return;
        setCategoryData((prev) => ({
          ...prev,
          [activeCategory]: next,
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
  }, [activeCategory, debouncedSearch, loadCategoryPage]);

  const prefetchCategory = useCallback(
    (categorySlug: string) => {
      if (
        categorySlug === activeCategory ||
        isStudioCategory(categorySlug) ||
        categoryData[categorySlug]?.loadedForQuery === ""
      ) {
        return;
      }

      void loadCategoryPage(categorySlug, "", { from: 0, to: PAGE_SIZE - 1 })
        .then((next) => {
          setCategoryData((prev) => {
            if (prev[categorySlug]?.loadedForQuery === "") return prev;
            return { ...prev, [categorySlug]: next };
          });
        })
        .catch(() => {
          // Prefetch is opportunistic. A real click retries with visible error
          // handling through the active-category effect above.
        });
    },
    [activeCategory, categoryData, loadCategoryPage],
  );

  const selectCategory = (cat: ActiveCategory) => {
    const cached = categoryData[cat];
    setLoadingCategory(
      !isStudioCategory(cat) && !(cached && cached.loadedForQuery === ""),
    );
    setLoadError(false);
    setSelectedCategory(cat);
    setSearchInput("");
    setDebouncedSearch("");
    setTasteFilter("all");
    window.history.replaceState(null, "", `/products?category=${encodeURIComponent(cat)}`);
  };

  const current = categoryData[activeCategory];
  const products = current?.products ?? EMPTY_PRODUCTS;
  const totalCount = current?.totalCount ?? 0;
  const hasMore = products.length < totalCount;

  function handleLoadMore() {
    if (!activeCategory || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const range = { from: products.length, to: products.length + PAGE_SIZE - 1 };
    loadCategoryPage(activeCategory, debouncedSearch, range)
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

  const tasteFilterOptions = useMemo(
    () => getProductTasteFilterOptions(activeCategory, displayedProducts),
    [activeCategory, displayedProducts],
  );

  const filteredDisplayedProducts = useMemo(
    () => {
      const filtered = displayedProducts.filter((product) =>
        matchesProductTasteFilter(activeCategory, product, tasteFilter),
      );

      return organizeFlavorCategoryProducts(activeCategory, filtered, tasteFilter);
    },
    [activeCategory, displayedProducts, tasteFilter],
  );

  return (
    <div className="pub-page-surface min-h-screen">
      <ProductsHero />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="shrink-0 lg:w-64">
            <div className="products-category-panel pub-card-static rounded-2xl p-3 sm:p-4">
              <h2 className="mb-3 px-2 font-serif text-lg font-semibold text-[#F5E6D8]/90 lg:mb-4">
                {t({ en: "Categories", ar: "التصنيفات" })}
              </h2>
              <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
                {sidebarItems.map((item) => {
                  if (item.kind === "cat") {
                    const isActive = activeCategory === item.slug;
                    return (
                      <button
                        key={item.slug}
                        type="button"
                        onClick={() => selectCategory(item.slug)}
                        onPointerEnter={() => prefetchCategory(item.slug)}
                        onFocus={() => prefetchCategory(item.slug)}
                        aria-pressed={isActive ? "true" : "false"}
                        className={
                          isActive
                            ? "products-cat-active w-max shrink-0 rounded-xl border border-transparent px-4 py-3 text-left text-sm font-semibold lg:w-full"
                            : "w-max shrink-0 rounded-xl border border-transparent px-4 py-3 text-left text-sm text-[#D6B79A]/75 transition-all duration-200 hover:border-[#B6885E]/20 hover:bg-[#B6885E]/8 hover:text-[#F5E6D8]/80 lg:w-full"
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
                        className="w-max shrink-0 cursor-not-allowed rounded-xl border border-[#D6A373]/10 bg-[#D6A373]/5 px-4 py-3 text-left text-sm font-semibold text-[#D6A373]/35 lg:w-full"
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
                      className={`${item.id === "make-your-espresso" ? "studio-espresso-btn" : "studio-flavor-btn"} flex w-max shrink-0 items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold lg:mt-1 lg:w-full${isActive ? " ring-2 ring-white/20 brightness-110" : ""}`}
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
                <div className="pub-card-static mb-5 rounded-2xl p-3 sm:p-4">
                  <div className="relative">
                    <Search
                      className={cn(
                        "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#D6B79A]/65",
                        dir === "rtl" ? "right-4" : "left-4",
                      )}
                    />
                    <input
                      type="search"
                      aria-label={t({ en: "Search products", ar: "ابحث عن منتج" })}
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder={t({ en: "Search products...", ar: "ابحث عن منتج..." })}
                      className="line-input line-input-search w-full"
                    />
                  </div>

                  <div className="mt-3 border-t border-[#D6A373]/14 pt-3">
                    <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold text-[#D6B79A]/78">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-[#D6A373]" />
                      <span>{t({ en: "Explore the collection", ar: "استكشف المجموعة" })}</span>
                    </div>
                    <div
                      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
                      role="group"
                      aria-label={t({ en: "Product taste filters", ar: "فلاتر مذاق المنتجات" })}
                    >
                      {tasteFilterOptions.map((option) => {
                        const active = tasteFilter === option.key;
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setTasteFilter(option.key)}
                            aria-pressed={active}
                            className={cn("taste-filter-chip", active && "is-active")}
                          >
                            <span>{t(option.label)}</span>
                            <span className="taste-filter-count">{option.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <p className="mb-5 text-sm text-[#D6BB9F]/75">
                  {tasteFilter !== "all"
                    ? `${filteredDisplayedProducts.length} ${t({ en: "products", ar: "منتج" })}`
                    : hasMore
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
                ) : filteredDisplayedProducts.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-3">
                      {filteredDisplayedProducts.map((product, i) => (
                        <ProductCard
                          key={product.slug}
                          product={product}
                          index={i}
                          reveal={false}
                          glass
                        />
                      ))}
                    </div>
                    {hasMore && (
                      <div className="mt-8 flex justify-center">
                        <button
                          type="button"
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="premium-button-outline pub-btn-3d inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold disabled:opacity-60"
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
                    {(searchInput || tasteFilter !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput("");
                          setTasteFilter("all");
                        }}
                        className="premium-button-outline pub-btn-3d mt-3 px-6 py-2 text-xs font-semibold"
                      >
                        {t({ en: "Clear filters", ar: "مسح الفلاتر" })}
                      </button>
                    )}
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

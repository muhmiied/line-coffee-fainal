"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronRight, Filter, Search, SlidersHorizontal } from "lucide-react";
import { CatalogProductCard } from "@/components/product/CatalogProductCard";
import { useLanguage, type LocalizedValue } from "@/lib/context/language";
import {
  getPublicCategories,
  getPublicProducts,
  getPublicProductsByCategorySlug,
  type PublicCatalogCategory,
  type PublicCatalogProduct,
} from "@/lib/catalog/public-catalog";
import { cn } from "@/lib/utils/cn";

type CatalogLoadState = "loading" | "ready" | "error";
type PriceFilter = "all" | "under-400" | "400-700" | "700-plus";
type SortValue = "featured" | "price-asc" | "price-desc" | "name";
type KnownCategorySlug =
  | "turkish-blends"
  | "espresso-blends"
  | "easy-coffee"
  | "coffee-mix"
  | "cappuccino"
  | "hot-chocolate"
  | "flavor-coffee";

type CategoryExperience = {
  eyebrow: LocalizedValue;
  title: LocalizedValue;
  intro: LocalizedValue;
  story: LocalizedValue;
};

const categoryExperiences: Record<KnownCategorySlug, CategoryExperience> = {
  "turkish-blends": {
    eyebrow: { en: "Slow Rituals", ar: "طقوس هادئة" },
    title: { en: "Turkish coffee with a deeper house signature.", ar: "قهوة تركي بطابع لاين الأعمق." },
    intro: {
      en: "Dark, aromatic blends shaped for a grounded cup with warmth, body, and a lingering finish.",
      ar: "خلطات داكنة وعطرية مصممة لكوب متزن بدفء واضح وقوام حاضر ونهاية ممتدة.",
    },
    story: {
      en: "This category is built around classic Turkish depth, polished with selected origins and a premium roast profile for daily rituals.",
      ar: "هذا التصنيف مبني حول عمق القهوة التركي الكلاسيكي، مع تنقية في المناشئ والتحميص ليليق بطقوس يومية فاخرة.",
    },
  },
  "espresso-blends": {
    eyebrow: { en: "Crema First", ar: "الكريما أولاً" },
    title: { en: "Espresso blends tuned for body and crema.", ar: "خلطات إسبريسو مضبوطة للقوام والكريما." },
    intro: {
      en: "Balanced pulls with creamy texture, refined aroma, and enough strength for milk drinks or straight shots.",
      ar: "استخلاص متوازن بقوام كريمي ورائحة مصقولة وقوة مناسبة للمشروبات اللبنية أو الشوت الصافي.",
    },
    story: {
      en: "Each blend leans on a different espresso promise: denser crema, deeper aroma, stronger focus, or a more premium finish.",
      ar: "كل خلطة تحمل وعداً مختلفاً للإسبريسو: كريما أكثف، رائحة أعمق، تركيز أقوى، أو نهاية أفخم.",
    },
  },
  "easy-coffee": {
    eyebrow: { en: "Daily Ease", ar: "سهولة يومية" },
    title: { en: "Fast coffee without losing the premium mood.", ar: "قهوة سريعة من غير ما تفقد الإحساس الفاخر." },
    intro: {
      en: "Comfortable blends for a quick cup, made for busy mornings and low-effort coffee moments.",
      ar: "خلطات مريحة لكوب سريع، مناسبة للصباح المزدحم ولحظات القهوة الخفيفة.",
    },
    story: {
      en: "Easy Coffee keeps the Line Coffee character present in a more practical everyday format.",
      ar: "إيزي كوفي يحافظ على شخصية لاين كوفي في صيغة يومية أسهل وأكثر عملية.",
    },
  },
  "coffee-mix": {
    eyebrow: { en: "Instant Comfort", ar: "راحة فورية" },
    title: { en: "Coffee mix flavors for a warmer everyday cup.", ar: "نكهات كوفي ميكس لكوب يومي أدفأ." },
    intro: {
      en: "A wide flavored range that turns instant preparation into a small personal ritual.",
      ar: "مجموعة نكهات واسعة تحول التحضير السريع إلى طقس صغير بطابعك الشخصي.",
    },
    story: {
      en: "From classic profiles to dessert and fruit directions, this range is designed for easy discovery and repeat favorites.",
      ar: "من النكهات الكلاسيكية إلى الحلوى والفواكه، هذا التصنيف مصمم للاكتشاف السهل والاختيارات المتكررة.",
    },
  },
  cappuccino: {
    eyebrow: { en: "Creamy Cup", ar: "كوب كريمي" },
    title: { en: "Cappuccino mixes with a soft cafe finish.", ar: "خلطات كابتشينو بنهاية كافيه ناعمة." },
    intro: {
      en: "Cream-led profiles made for a cozy, smooth cup with familiar flavors and a polished finish.",
      ar: "بروفايلات كريمية لكوب دافئ وناعم بنكهات مألوفة ونهاية مصقولة.",
    },
    story: {
      en: "This category is for the customer who wants the cafe feeling at home: creamy, fragrant, and easy to prepare.",
      ar: "هذا التصنيف لمن يريد إحساس الكافيه في البيت: كريمي، عطري، وسهل التحضير.",
    },
  },
  "hot-chocolate": {
    eyebrow: { en: "Velvet Cocoa", ar: "كاكاو مخملي" },
    title: { en: "Hot chocolate mixes for rich, cozy cups.", ar: "خلطات هوت شوكليت لأكواب غنية ودافئة." },
    intro: {
      en: "Cocoa-led comfort with fruit, dessert, and nut directions for colder evenings and soft breaks.",
      ar: "دفء الكاكاو مع اتجاهات فواكه وحلوى ومكسرات لأمسيات أهدأ واستراحات ناعمة.",
    },
    story: {
      en: "A chocolate-first range that keeps the mood indulgent while staying easy to prepare.",
      ar: "مجموعة بطابع شوكولاتة واضح، فاخرة في الإحساس وسهلة في التحضير.",
    },
  },
  "flavor-coffee": {
    eyebrow: { en: "Flavor Library", ar: "مكتبة النكهات" },
    title: { en: "Flavored coffee with a playful premium range.", ar: "قهوة بالنكهات بروح مرحة وفاخرة." },
    intro: {
      en: "Standalone flavored coffees for customers who know exactly which note they want in the cup.",
      ar: "قهوة بنكهات جاهزة لمن يعرف بالضبط النغمة التي يريدها في الكوب.",
    },
    story: {
      en: "This is the ready-made side of the flavor experience: direct, easy, and full of familiar favorites.",
      ar: "هذا هو الجانب الجاهز من تجربة النكهات: مباشر، سهل، ومليء بالاختيارات المحبوبة.",
    },
  },
};

const priceFilters: Array<{ value: PriceFilter; label: LocalizedValue }> = [
  { value: "all", label: { en: "All Prices", ar: "كل الأسعار" } },
  { value: "under-400", label: { en: "Under 400", ar: "أقل من 400" } },
  { value: "400-700", label: { en: "400 - 700", ar: "400 - 700" } },
  { value: "700-plus", label: { en: "700+", ar: "700+" } },
];

const sortOptions: Array<{ value: SortValue; label: LocalizedValue }> = [
  { value: "featured", label: { en: "Featured", ar: "الأبرز" } },
  { value: "price-asc", label: { en: "Price: Low to High", ar: "السعر: من الأقل" } },
  { value: "price-desc", label: { en: "Price: High to Low", ar: "السعر: من الأعلى" } },
  { value: "name", label: { en: "Name", ar: "الاسم" } },
];

function getSlugParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isKnownCategorySlug(value: string): value is KnownCategorySlug {
  return value in categoryExperiences;
}

function getCategoryExperience(category: PublicCatalogCategory): CategoryExperience {
  if (isKnownCategorySlug(category.slug)) return categoryExperiences[category.slug];

  return {
    eyebrow: { en: "Line Coffee", ar: "Ù„Ø§ÙŠÙ† ÙƒÙˆÙÙŠ" },
    title: category.name,
    intro: category.description ?? category.name,
    story: category.description ?? category.name,
  };
}

function matchesPrice(product: PublicCatalogProduct, filter: PriceFilter) {
  if (filter === "all") return true;
  if (filter === "under-400") return product.salePricePerKg < 400;
  if (filter === "400-700") return product.salePricePerKg >= 400 && product.salePricePerKg <= 700;
  return product.salePricePerKg > 700;
}

function sortProducts(products: PublicCatalogProduct[], sort: SortValue, localize: (value: LocalizedValue) => string, language: "en" | "ar") {
  const locale = language;
  return [...products].sort((a, b) => {
    if (sort === "price-asc") return a.salePricePerKg - b.salePricePerKg;
    if (sort === "price-desc") return b.salePricePerKg - a.salePricePerKg;
    if (sort === "name") return localize(a.name).localeCompare(localize(b.name), locale);
    const blendWeight = Number(Boolean(b.blend)) - Number(Boolean(a.blend));
    if (blendWeight !== 0) return blendWeight;
    return b.salePricePerKg - a.salePricePerKg;
  });
}

function Breadcrumb({ category }: { category?: PublicCatalogCategory }) {
  const { dir, t } = useLanguage();
  const itemClass = "text-[#D6B79A]/64 transition-colors hover:text-[#F5E6D8]";
  const separator = <ChevronRight className={cn("h-3.5 w-3.5 text-[#D6A373]/44", dir === "rtl" && "rotate-180")} />;

  return (
    <nav aria-label={t({ en: "Breadcrumb", ar: "مسار الصفحة" })} className="flex flex-wrap items-center gap-2 text-xs font-semibold" dir={dir}>
      <Link href="/" className={itemClass}>{t({ en: "Home", ar: "الرئيسية" })}</Link>
      {separator}
      <Link href="/products" className={itemClass}>{t({ en: "Products", ar: "المنتجات" })}</Link>
      {category ? (
        <>
          {separator}
          <span className="text-[#D6A373]">{t(category.name)}</span>
        </>
      ) : null}
    </nav>
  );
}

function CategoryNotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#0B0806] px-4 py-16 text-center text-[#F5E6D8]">
      <div className="mx-auto max-w-xl rounded-2xl border border-[#B6885E]/18 bg-[#120D09]/70 p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D6A373]">
          {t({ en: "Category Missing", ar: "التصنيف غير موجود" })}
        </p>
        <h1 className="mt-3 font-serif text-3xl font-bold">
          {t({ en: "We could not find this coffee category.", ar: "لم نتمكن من العثور على هذا التصنيف." })}
        </h1>
        <Link href="/products" className="premium-button mt-6 inline-flex rounded-full px-6 py-3 text-sm font-semibold">
          {t({ en: "Back to Products", ar: "العودة للمنتجات" })}
        </Link>
      </div>
    </div>
  );
}

function CategoryLoadPanel({ state }: { state: "loading" | "error" }) {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#0B0806] px-4 py-16 text-center text-[#F5E6D8]">
      <div className="mx-auto max-w-xl rounded-2xl border border-[#B6885E]/18 bg-[#120D09]/70 p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D6A373]">
          {state === "loading"
            ? t({ en: "Loading Catalog", ar: "Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙƒØ§ØªØ§Ù„ÙˆØ¬" })
            : t({ en: "Catalog Unavailable", ar: "Ø§Ù„ÙƒØ§ØªØ§Ù„ÙˆØ¬ ØºÙŠØ± Ù…ØªØ§Ø­" })}
        </p>
        <h1 className="mt-3 font-serif text-3xl font-bold">
          {state === "loading"
            ? t({ en: "Reading this category.", ar: "Ù†Ù‚Ø±Ø£ Ù‡Ø°Ø§ Ø§Ù„ØªØµÙ†ÙŠÙ." })
            : t({ en: "We could not load this category right now.", ar: "Ù„Ù… Ù†ØªÙ…ÙƒÙ† Ù…Ù† ØªØ­Ù…ÙŠÙ„ Ù‡Ø°Ø§ Ø§Ù„ØªØµÙ†ÙŠÙ Ø§Ù„Ø¢Ù†." })}
        </h1>
        {state === "error" ? (
          <Link href="/products" className="premium-button mt-6 inline-flex rounded-full px-6 py-3 text-sm font-semibold">
            {t({ en: "Back to Products", ar: "Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„Ù„Ù…Ù†ØªØ¬Ø§Øª" })}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function ProductCategoryPage() {
  const { slug } = useParams<{ slug?: string | string[] }>();
  const { language, dir, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [sortValue, setSortValue] = useState<SortValue>("featured");
  const [catalogState, setCatalogState] = useState<CatalogLoadState>("loading");
  const [categories, setCategories] = useState<PublicCatalogCategory[]>([]);
  const [productsInCategory, setProductsInCategory] = useState<PublicCatalogProduct[]>([]);
  const [allProducts, setAllProducts] = useState<PublicCatalogProduct[]>([]);
  const categorySlug = getSlugParam(slug);

  useEffect(() => {
    let isMounted = true;

    if (!categorySlug) return;

    Promise.all([
      getPublicCategories(),
      getPublicProductsByCategorySlug(categorySlug),
      getPublicProducts(),
    ])
      .then(([nextCategories, nextProductsInCategory, nextAllProducts]) => {
        if (!isMounted) return;
        setCategories(nextCategories);
        setProductsInCategory(nextProductsInCategory);
        setAllProducts(nextAllProducts);
        setCatalogState("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        setCategories([]);
        setProductsInCategory([]);
        setAllProducts([]);
        setCatalogState("error");
      });

    return () => {
      isMounted = false;
    };
  }, [categorySlug]);

  if (!categorySlug) {
    return <CategoryNotFound />;
  }

  if (catalogState === "loading") {
    return <CategoryLoadPanel state="loading" />;
  }

  if (catalogState === "error") {
    return <CategoryLoadPanel state="error" />;
  }

  const category = categories.find((item) => item.slug === categorySlug);

  if (!category) {
    return <CategoryNotFound />;
  }

  const experience = getCategoryExperience(category);

  const query = search.trim().toLowerCase();
  const filteredProducts = sortProducts(
    productsInCategory.filter((product) => {
      const matchesSearch =
        query.length === 0 ||
        product.name.en.toLowerCase().includes(query) ||
        product.name.ar.includes(search.trim()) ||
        product.note.en.toLowerCase().includes(query) ||
        product.note.ar.includes(search.trim());

      return matchesSearch && matchesPrice(product, priceFilter);
    }),
    sortValue,
    t,
    language,
  );

  const relatedCategories = categories.filter((item) => item.slug !== categorySlug).slice(0, 5);

  return (
    <div className="arabic-body min-h-screen overflow-x-hidden bg-[#0B0806] text-[#F5E6D8]">
      <section className="products-hero relative flex min-h-[25rem] items-end overflow-hidden border-b border-[#B6885E]/14 pb-10 pt-28 sm:min-h-[30rem] sm:pb-12">
        {category ? (
          <Image
            src={category.image}
            alt={t(category.name)}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center brightness-[0.58] contrast-[1.12] saturate-[1.05]"
          />
        ) : null}
        <div className="absolute inset-0 bg-[#0B0806]/58" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,8,6,0.22)_0%,rgba(11,8,6,0.72)_62%,#0B0806_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(214,163,115,0.16),transparent_38%)]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4">
          <Breadcrumb category={category} />
          <div className="mt-8 max-w-3xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#D6A373]">
              {t(experience.eyebrow)}
            </p>
            <h1 className="font-serif text-4xl font-bold leading-tight text-[#F5E6D8] drop-shadow-[0_12px_34px_rgba(0,0,0,0.52)] sm:text-5xl lg:text-6xl">
              {t(category?.name ?? experience.title)}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#F5E6D8]/84 sm:text-base">
              {t(experience.title)}
            </p>
            <div className="mt-6 inline-flex rounded-full border border-[#D6A373]/22 bg-[#120D09]/62 px-4 py-2 text-xs font-semibold text-[#D6A373] backdrop-blur-md">
              <span className="arabic-number">{productsInCategory.length}</span>
              <span className="ms-1">{t({ en: "products", ar: "منتج" })}</span>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
          <div className="rounded-2xl border border-[#B6885E]/16 bg-[#120D09]/62 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.26)]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D6A373]">
              {t({ en: "Category Story", ar: "قصة التصنيف" })}
            </p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-[#F5E6D8]">
              {t(experience.intro)}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#D6B79A]/74">
              {t(experience.story)}
            </p>
          </div>

          <div className="luxury-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 text-[#D6A373]">
              <SlidersHorizontal className="h-4 w-4" />
              <h2 className="font-serif text-lg font-bold text-[#F5E6D8]">
                {t({ en: "Browse Controls", ar: "أدوات التصفح" })}
              </h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#D6B79A]/62">
              {t({
                en: "Search within this category, filter by price, or reorder the collection.",
                ar: "ابحث داخل هذا التصنيف، صف حسب السعر، أو غير ترتيب المجموعة.",
              })}
            </p>
          </div>
        </section>

        <section className="sticky top-24 z-20 my-7 rounded-2xl border border-[#B6885E]/16 bg-[#120D09]/88 p-3 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl md:top-32">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
            <div className="relative">
              <Search className={cn("pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#D6B79A]/45", dir === "rtl" ? "right-3" : "left-3")} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t({ en: "Search this category...", ar: "ابحث داخل التصنيف..." })}
                className={cn("line-input w-full", dir === "rtl" ? "pr-10" : "pl-10")}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:max-w-[24rem]">
              {priceFilters.map((filterOption) => (
                <button
                  key={filterOption.value}
                  type="button"
                  onClick={() => setPriceFilter(filterOption.value)}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all",
                    priceFilter === filterOption.value
                      ? "border-[#D6A373]/60 bg-[#D6A373] text-[#0B0806]"
                      : "border-[#B6885E]/18 bg-[#0B0806]/45 text-[#D6B79A]/72 hover:border-[#D6A373]/34 hover:text-[#F5E6D8]",
                  )}
                >
                  {t(filterOption.label)}
                </button>
              ))}
            </div>

            <label className="relative flex items-center gap-2 rounded-xl border border-[#B6885E]/16 bg-[#0B0806]/42 px-3 py-2 text-sm text-[#D6B79A]/70">
              <Filter className="h-4 w-4 text-[#D6A373]" />
              <select
                value={sortValue}
                onChange={(event) => setSortValue(event.target.value as SortValue)}
                className="min-w-44 bg-transparent text-[#F5E6D8] outline-none"
                aria-label={t({ en: "Sort products", ar: "ترتيب المنتجات" })}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#120D09] text-[#F5E6D8]">
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-sm text-[#D6B79A]/58">
            <span className="arabic-number">{filteredProducts.length}</span>{" "}
            {t({ en: "matching products", ar: "منتجات مطابقة" })}
          </p>
          {(search || priceFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPriceFilter("all");
              }}
              className="text-xs font-semibold text-[#D6A373] transition-colors hover:text-[#F5E6D8]"
            >
              {t({ en: "Reset", ar: "إعادة ضبط" })}
            </button>
          )}
        </div>

        {filteredProducts.length > 0 ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <CatalogProductCard key={product.slug} product={product} />
            ))}
          </section>
        ) : (
          <section className="flex min-h-[18rem] flex-col items-center justify-center rounded-2xl border border-dashed border-[#B6885E]/22 bg-[#120D09]/44 px-6 text-center">
            <p className="font-serif text-2xl font-bold text-[#F5E6D8]/72">
              {t({ en: "No products found", ar: "لا توجد منتجات مطابقة" })}
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#D6B79A]/58">
              {t({ en: "Try clearing the search or selecting a different price range.", ar: "جرب مسح البحث أو اختيار نطاق سعر مختلف." })}
            </p>
          </section>
        )}

        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D6A373]">
                {t({ en: "Keep Exploring", ar: "استكشف المزيد" })}
              </p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-[#F5E6D8]">
                {t({ en: "Related Categories", ar: "تصنيفات قريبة" })}
              </h2>
            </div>
            <Link href="/products" className="hidden text-sm font-semibold text-[#D6A373] hover:text-[#F5E6D8] sm:inline">
              {t({ en: "All products", ar: "كل المنتجات" })}
            </Link>
          </div>

          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {relatedCategories.map((item) => (
              <Link
                key={item.slug}
                href={`/products/category/${item.slug}`}
                className="group relative h-36 w-64 shrink-0 overflow-hidden rounded-2xl border border-[#B6885E]/16 bg-[#120D09]"
              >
                <Image
                  src={item.image}
                  alt={t(item.name)}
                  fill
                  sizes="260px"
                  className="object-cover brightness-[0.62] transition-transform duration-700 group-hover:scale-[1.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080302]/92 via-[#080302]/26 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="font-serif text-lg font-bold text-[#F5E6D8]">
                    {t(item.name)}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#D6A373]">
                    {allProducts.filter((product) => product.category === item.slug).length} {t({ en: "products", ar: "منتج" })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useLanguage, type LocalizedValue } from "@/lib/context/language";
import { useCart } from "@/lib/context/cart";
import { useWishlist } from "@/lib/hooks/useWishlist";
import {
  getPublicCatalogProductBySlug,
  getPublicCategories,
  type PublicCatalogCategory,
  type PublicCatalogProduct,
} from "@/lib/catalog/public-catalog";
import { cn } from "@/lib/utils/cn";

type CatalogLoadState = "loading" | "ready" | "error";
type WeightLabel = "250g" | "500g" | "1kg";

type PriceOption = {
  label: WeightLabel;
  price: number;
};

type ProductMetric = {
  label: LocalizedValue;
  value: number;
};


function getSlugParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getPriceOptions(product: PublicCatalogProduct): PriceOption[] {
  return product.sizes.map((size) => ({ label: size.label, price: size.salePrice }));
}

function getRobustaShare(product: PublicCatalogProduct) {
  return product.blend
    ?.filter((component) => component.beanType === "robusta")
    .reduce((sum, component) => sum + component.pct, 0) ?? 0;
}

function clampMetric(value: number) {
  return Math.round(Math.max(0, Math.min(5, value)) * 10) / 10;
}

function getProductMetrics(product: PublicCatalogProduct): ProductMetric[] {
  const robusta = getRobustaShare(product);
  const premiumLift = product.salePricePerKg >= 900 ? 0.4 : product.salePricePerKg >= 700 ? 0.2 : 0;
  const strengthLift = robusta > 10 ? 0.4 : robusta > 0 ? 0.2 : 0;

  if (product.category === "espresso-blends") {
    return [
      { label: { en: "Crema", ar: "الكريما" }, value: clampMetric(4.1 + strengthLift) },
      { label: { en: "Body", ar: "القوام" }, value: clampMetric(4 + premiumLift) },
      { label: { en: "Aroma", ar: "الرائحة" }, value: clampMetric(3.8 + premiumLift) },
      { label: { en: "Chocolate", ar: "الشوكولاتة" }, value: clampMetric(3.5 + premiumLift / 2) },
      { label: { en: "Strength", ar: "القوة" }, value: clampMetric(3.6 + strengthLift + premiumLift / 2) },
    ];
  }

  if (product.category === "turkish-blends") {
    return [
      { label: { en: "Aroma", ar: "الرائحة" }, value: clampMetric(4.2 + premiumLift) },
      { label: { en: "Body", ar: "القوام" }, value: clampMetric(3.9 + premiumLift) },
      { label: { en: "Roast Depth", ar: "عمق التحميص" }, value: clampMetric(4.4 + strengthLift) },
      { label: { en: "Chocolate", ar: "الشوكولاتة" }, value: clampMetric(3.5 + premiumLift / 2) },
      { label: { en: "Strength", ar: "القوة" }, value: clampMetric(3.8 + strengthLift) },
    ];
  }

  if (product.category === "hot-chocolate") {
    return [
      { label: { en: "Chocolate", ar: "الشوكولاتة" }, value: 4.6 },
      { label: { en: "Creaminess", ar: "الكريمية" }, value: 4.2 },
      { label: { en: "Sweetness", ar: "الحلاوة" }, value: 4 },
      { label: { en: "Intensity", ar: "قوة النكهة" }, value: 3.4 },
    ];
  }

  if (product.category === "cappuccino") {
    return [
      { label: { en: "Creaminess", ar: "الكريمية" }, value: 4.5 },
      { label: { en: "Sweetness", ar: "الحلاوة" }, value: 3.8 },
      { label: { en: "Aroma", ar: "الرائحة" }, value: 3.4 },
      { label: { en: "Comfort", ar: "الراحة" }, value: 4.2 },
    ];
  }

  if (product.category === "coffee-mix" || product.category === "flavor-coffee") {
    return [
      { label: { en: "Flavor", ar: "النكهة" }, value: 4.2 },
      { label: { en: "Sweetness", ar: "الحلاوة" }, value: 3.7 },
      { label: { en: "Aroma", ar: "الرائحة" }, value: 3.6 },
      { label: { en: "Ease", ar: "سهولة التحضير" }, value: 4.8 },
    ];
  }

  return [
    { label: { en: "Aroma", ar: "الرائحة" }, value: 3.8 },
    { label: { en: "Body", ar: "القوام" }, value: 3.6 },
    { label: { en: "Ease", ar: "سهولة التحضير" }, value: 4.4 },
  ];
}

function getGalleryImages(product: PublicCatalogProduct, category?: PublicCatalogCategory) {
  return Array.from(new Set([
    product.image,
    ...product.gallery,
    category?.image,
    "/assets/story/roastery.png",
    "/assets/hero/dark-roast.png",
  ].filter(Boolean))) as string[];
}


function ProductNotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#0B0806] px-4 py-16 text-center text-[#F5E6D8]">
      <div className="mx-auto max-w-xl rounded-2xl border border-[#B6885E]/18 bg-[#120D09]/70 p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D6A373]">
          {t({ en: "Product Missing", ar: "المنتج غير موجود" })}
        </p>
        <h1 className="mt-3 font-serif text-3xl font-bold">
          {t({ en: "We could not find this product.", ar: "لم نتمكن من العثور على هذا المنتج." })}
        </h1>
        <Link href="/products" className="premium-button mt-6 inline-flex rounded-full px-6 py-3 text-sm font-semibold">
          {t({ en: "Back to Products", ar: "العودة للمنتجات" })}
        </Link>
      </div>
    </div>
  );
}

function ProductLoadPanel({ state }: { state: "loading" | "error" }) {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#0B0806] px-4 py-16 text-center text-[#F5E6D8]">
      <div className="mx-auto max-w-xl rounded-2xl border border-[#B6885E]/18 bg-[#120D09]/70 p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D6A373]">
          {state === "loading"
            ? t({ en: "Loading Product", ar: "جاري تحميل المنتج" })
            : t({ en: "Product Unavailable", ar: "المنتج غير متاح" })}
        </p>
        <h1 className="mt-3 font-serif text-3xl font-bold">
          {state === "loading"
            ? t({ en: "Reading the live product.", ar: "نقرأ المنتج الحي." })
            : t({ en: "We could not load this product right now.", ar: "لم نتمكن من تحميل هذا المنتج الآن." })}
        </h1>
        {state === "error" ? (
          <Link href="/products" className="premium-button mt-6 inline-flex rounded-full px-6 py-3 text-sm font-semibold">
            {t({ en: "Back to Products", ar: "العودة للمنتجات" })}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Breadcrumb({ product, category }: { product: PublicCatalogProduct; category?: PublicCatalogCategory }) {
  const { dir, t } = useLanguage();
  const separator = <ChevronRight className={cn("h-3.5 w-3.5 text-[#D6A373]/44", dir === "rtl" && "rotate-180")} />;

  return (
    <nav aria-label={t({ en: "Breadcrumb", ar: "مسار الصفحة" })} className="flex flex-wrap items-center gap-2 text-xs font-semibold" dir={dir}>
      <Link href="/" className="text-[#D6B79A]/64 transition-colors hover:text-[#F5E6D8]">
        {t({ en: "Home", ar: "الرئيسية" })}
      </Link>
      {separator}
      <Link href="/products" className="text-[#D6B79A]/64 transition-colors hover:text-[#F5E6D8]">
        {t({ en: "Products", ar: "المنتجات" })}
      </Link>
      {category ? (
        <>
          {separator}
          <Link href={`/products?category=${category.slug}`} className="text-[#D6B79A]/64 transition-colors hover:text-[#F5E6D8]">
            {t(category.name)}
          </Link>
        </>
      ) : null}
      {separator}
      <span className="text-[#D6A373]">{t(product.name)}</span>
    </nav>
  );
}

function ProductGallery({
  images,
  productName,
  activeIndex,
  onActiveIndexChange,
}: {
  images: string[];
  productName: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}) {
  const activeImage = images[activeIndex] ?? images[0] ?? "/assets/products/classic-pouch.png";

  return (
    <section className="luxury-panel overflow-hidden rounded-2xl">
      <div className="relative aspect-[4/5] min-h-[22rem] overflow-hidden bg-[#120D09]">
        <Image
          src={activeImage}
          alt={productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 48vw"
          className="object-cover object-center brightness-[0.86] contrast-[1.08] saturate-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#080302]/82 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(214,163,115,0.14),transparent_38%)]" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 p-3">
        {images.slice(0, 4).map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={() => onActiveIndexChange(index)}
            aria-label={`${productName} gallery image ${index + 1}`}
            className={cn(
              "relative aspect-square overflow-hidden rounded-xl border bg-[#120D09] transition-all",
              activeIndex === index
                ? "border-[#D6A373]/70 shadow-[0_0_24px_rgba(182,136,94,0.18)]"
                : "border-[#B6885E]/16 opacity-70 hover:border-[#D6A373]/38 hover:opacity-100",
            )}
          >
            <Image src={image} alt="" fill sizes="96px" className="object-cover" />
          </button>
        ))}
      </div>
    </section>
  );
}

function MetricBar({ metric }: { metric: ProductMetric }) {
  const { t } = useLanguage();
  const width = `${Math.max(0, Math.min(100, (metric.value / 5) * 100))}%`;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-medium text-[#D6B79A]/64">
        <span className="truncate">{t(metric.label)}</span>
        <span className="arabic-number shrink-0 font-bold text-[#D6A373]">{metric.value}/5</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#B6885E]/12">
        <div className="h-full rounded-full bg-[#D6A373] transition-all duration-500 ease-out" style={{ width }} />
      </div>
    </div>
  );
}

function WeightSelector({
  options,
  selected,
  onChange,
}: {
  options: PriceOption[];
  selected: WeightLabel;
  onChange: (label: WeightLabel) => void;
}) {
  const { language } = useLanguage();
  const currency = language === "ar" ? "ج.م" : "EGP";

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange(option.label)}
          className={cn(
            "rounded-xl border px-2 py-3 text-center transition-all",
            selected === option.label
              ? "border-[#D6A373]/62 bg-[#D6A373] text-[#0B0806] shadow-[0_10px_28px_rgba(182,136,94,0.22)]"
              : "border-[#B6885E]/16 bg-[#120D09]/70 text-[#D6B79A]/78 hover:border-[#D6A373]/38 hover:text-[#F5E6D8]",
          )}
        >
          <span className="block text-sm font-bold">{option.label}</span>
          <span className="arabic-number mt-1 block text-[11px] font-semibold">
            {option.price} <span className="numeric-symbol">{currency}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function QuantitySelector({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label={t({ en: "Decrease quantity", ar: "تقليل الكمية" })}
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={quantity <= 1}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#B6885E]/22 bg-[#120D09]/70 text-[#D6B79A] transition-all hover:border-[#D6A373]/40 hover:text-[#F5E6D8] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="arabic-number w-10 text-center text-lg font-bold text-[#F5E6D8]">
        {quantity}
      </span>
      <button
        type="button"
        aria-label={t({ en: "Increase quantity", ar: "زيادة الكمية" })}
        onClick={() => onChange(quantity + 1)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#B6885E]/22 bg-[#120D09]/70 text-[#D6B79A] transition-all hover:border-[#D6A373]/40 hover:text-[#F5E6D8]"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug?: string | string[] }>();
  const { language, t } = useLanguage();
  const { addItem, openCart } = useCart();
  const { toggle: toggleWishlist, isWishlisted } = useWishlist();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedWeight, setSelectedWeight] = useState<WeightLabel>("250g");
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [catalogState, setCatalogState] = useState<CatalogLoadState>("loading");
  const [product, setProduct] = useState<PublicCatalogProduct | null>(null);
  const [categories, setCategories] = useState<PublicCatalogCategory[]>([]);
  const productSlug = getSlugParam(slug);

  useEffect(() => {
    let isMounted = true;

    if (!productSlug) return;

    Promise.all([getPublicCatalogProductBySlug(productSlug), getPublicCategories()])
      .then(([nextProduct, nextCategories]) => {
        if (!isMounted) return;
        setProduct(nextProduct);
        setCategories(nextCategories);
        setActiveImageIndex(0);
        setSelectedWeight(nextProduct?.sizes[0]?.label ?? "250g");
        setQuantity(1);
        setCatalogState("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        setProduct(null);
        setCategories([]);
        setCatalogState("error");
      });

    return () => {
      isMounted = false;
    };
  }, [productSlug]);

  const wishlisted = product ? isWishlisted(product.slug) : false;

  if (!productSlug) {
    return <ProductNotFound />;
  }

  if (catalogState === "loading") {
    return <ProductLoadPanel state="loading" />;
  }

  if (catalogState === "error") {
    return <ProductLoadPanel state="error" />;
  }

  if (!product) {
    return <ProductNotFound />;
  }

  const category = categories.find((item) => item.slug === product.category);
  const priceOptions = getPriceOptions(product);
  const selectedPrice = priceOptions.find((option) => option.label === selectedWeight) ?? priceOptions[0] ?? { label: "250g", price: 0 };
  const totalPrice = selectedPrice.price * quantity;
  const galleryImages = getGalleryImages(product, category);
  const metrics = getProductMetrics(product);
  const primaryName = t(product.name);
  const primaryDescription = t(product.note);
  const currency = language === "ar" ? "ج.م" : "EGP";

  const handleAddToCart = () => {
    if (justAdded) return;
    addItem({
      kind: "product",
      name: product.name,
      detail: { en: selectedWeight, ar: selectedWeight },
      pricePerUnit: selectedPrice.price,
      qty: quantity,
      slug: product.slug,
    });
    openCart();
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <div className="arabic-body min-h-screen overflow-x-hidden bg-[#0B0806] text-[#F5E6D8]">
      <section className="products-hero relative overflow-hidden border-b border-[#B6885E]/14 pb-10 pt-28">
        <Image
          src={product.image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-[1.06] object-cover object-center opacity-[0.34] blur-[1px]"
        />
        <div className="absolute inset-0 bg-[#0B0806]/72" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,8,6,0.42)_0%,rgba(11,8,6,0.78)_66%,#0B0806_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(214,163,115,0.14),transparent_38%)]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4">
          <Breadcrumb product={product} category={category} />
          <div className="mt-8 max-w-4xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#D6A373]">
              {category ? t(category.name) : t({ en: "Line Coffee", ar: "لاين كوفي" })}
            </p>
            <h1 className="font-serif text-4xl font-bold leading-tight text-[#F5E6D8] drop-shadow-[0_12px_34px_rgba(0,0,0,0.52)] sm:text-5xl lg:text-6xl">
              {primaryName}
            </h1>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 pb-20 sm:py-12 sm:pb-24">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)_21rem] xl:items-start">
          <ProductGallery
            images={galleryImages}
            productName={primaryName}
            activeIndex={activeImageIndex}
            onActiveIndexChange={setActiveImageIndex}
          />

          <section className="luxury-panel rounded-2xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#D6A373]/22 bg-[#D6A373]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A373]">
                {product.category === "espresso-blends"
                  ? t({ en: "Espresso Blend", ar: "خلطة إسبريسو" })
                  : product.category === "turkish-blends"
                    ? t({ en: "Turkish Blend", ar: "خلطة تركي" })
                    : t({ en: "Line Selection", ar: "اختيار لاين" })}
              </span>
              {product.blend ? (
                <span className="rounded-full border border-[#B6885E]/16 bg-[#0B0806]/42 px-3 py-1 text-[11px] text-[#D6B79A]/70">
                  {t({ en: "Blend Composition", ar: "توليفة حبوب" })}
                </span>
              ) : null}
            </div>

            <h2 className="mt-5 font-serif text-3xl font-bold text-[#F5E6D8]">
              {primaryName}
            </h2>

            <p className="mt-4 text-sm leading-7 text-[#D6B79A]/76">
              {primaryDescription}
            </p>

            <div className="mt-6 rounded-2xl border border-[#B6885E]/14 bg-[#0B0806]/38 p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D6A373]">
                  {t({ en: "Taste Profile", ar: "بروفايل الطعم" })}
                </p>
                <Sparkles className="h-4 w-4 text-[#D6A373]/72" />
              </div>
              <div className="space-y-3">
                {metrics.map((metric) => (
                  <MetricBar key={metric.label.en} metric={metric} />
                ))}
              </div>
            </div>

            {product.blend && product.blend.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-[#B6885E]/14 bg-[#0B0806]/38 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#D6A373]">
                  {t({ en: "Blend Composition", ar: "تكوين الخلطة" })}
                </p>
                <div className="space-y-2">
                  {product.blend.map((component) => (
                    <div key={`${component.origin.en}-${component.pct}`} className="grid gap-2 rounded-xl border border-[#B6885E]/12 bg-[#120D09]/58 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_5rem] sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#F5E6D8]/88">
                          {t(component.origin)}
                        </p>
                        <p className="text-[11px] text-[#D6B79A]/50">
                          {component.beanType === "arabica"
                            ? t({ en: "Arabica", ar: "أرابيكا" })
                            : t({ en: "Robusta", ar: "روبوستا" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#B6885E]/12">
                          <div className="h-full rounded-full bg-[#D6A373]" style={{ width: `${component.pct}%` }} />
                        </div>
                        <span className="arabic-number w-10 text-end text-xs font-bold text-[#D6A373]">
                          {component.pct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <aside className="xl:sticky xl:top-[9.25rem]">
            <div className="luxury-panel rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D6A373]">
                {t({ en: "Purchase Summary", ar: "ملخص الاختيار" })}
              </p>

              <div className="mt-4 rounded-2xl border border-[#D6A373]/18 bg-[#D6A373]/8 p-4">
                <p className="text-xs text-[#D6B79A]/64">
                  {selectedWeight} × <span className="arabic-number">{quantity}</span>
                </p>
                <p className="mt-1 font-serif text-4xl font-bold text-[#D6A373]">
                  <span className="arabic-number">{totalPrice}</span>{" "}
                  <span className="text-xl numeric-symbol">{currency}</span>
                </p>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold text-[#D6B79A]/72">
                  {t({ en: "Weight", ar: "الوزن" })}
                </p>
                <WeightSelector options={priceOptions} selected={selectedWeight} onChange={setSelectedWeight} />
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold text-[#D6B79A]/72">
                  {t({ en: "Quantity", ar: "الكمية" })}
                </p>
                <QuantitySelector quantity={quantity} onChange={setQuantity} />
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className={cn(
                  "mt-5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-all",
                  justAdded ? "border border-[#D6A373]/38 bg-[#D6A373]/14 text-[#D6A373]" : "premium-button",
                )}
              >
                {justAdded ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
                {justAdded
                  ? t({ en: "Added to Cart", ar: "تمت الإضافة" })
                  : t({ en: "Add to Cart", ar: "أضف إلى السلة" })}
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product.slug)}
                className={cn(
                  "mt-2 flex w-full items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-all",
                  wishlisted
                    ? "border-[#D6A373]/35 bg-[#D6A373]/08 text-[#D6A373]"
                    : "border-[#B6885E]/16 text-[#D6B79A]/58 hover:border-[#D6A373]/30 hover:text-[#F5E6D8]",
                )}
              >
                <Heart className={cn("h-3.5 w-3.5 transition-colors", wishlisted && "fill-[#D6A373]")} />
                {wishlisted
                  ? t({ en: "Saved", ar: "تم الحفظ" })
                  : t({ en: "Save for Later", ar: "حفظ لاحقاً" })}
              </button>
            </div>
          </aside>
        </section>

      </main>
    </div>
  );
}

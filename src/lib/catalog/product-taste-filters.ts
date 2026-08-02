import type { LocalizedValue } from "@/lib/context/language";
import type { PublicCatalogProduct } from "@/lib/catalog/public-catalog-shared";

export type ProductTasteFilterKey =
  | "all"
  | "original"
  | "fruit"
  | "nuts"
  | "chocolate"
  | "dessert"
  | "signature"
  | "smooth"
  | "bold"
  | "premium"
  | "creamy"
  | "balanced"
  | "classic";

export type ProductTasteFilterOption = {
  key: ProductTasteFilterKey;
  label: LocalizedValue;
  count: number;
};

type TasteFilterProduct = Pick<PublicCatalogProduct, "slug" | "name" | "note">;
type MerchandisingProduct = TasteFilterProduct &
  Partial<Pick<PublicCatalogProduct, "isAvailable" | "bestSeller" | "featured" | "isNew">>;

type FilterDefinition = {
  key: ProductTasteFilterKey;
  label: LocalizedValue;
};

const ALL_FILTER: FilterDefinition = {
  key: "all",
  label: { en: "All", ar: "الكل" },
};

const FLAVOR_FILTERS: FilterDefinition[] = [
  { key: "original", label: { en: "Original", ar: "أوريجينال" } },
  { key: "fruit", label: { en: "Fruits", ar: "فواكه" } },
  { key: "nuts", label: { en: "Nuts", ar: "مكسرات" } },
  { key: "chocolate", label: { en: "Chocolate", ar: "شوكولاتة" } },
  { key: "dessert", label: { en: "Desserts", ar: "حلويات" } },
  { key: "signature", label: { en: "Special", ar: "نكهات خاصة" } },
];

const CATEGORY_FILTERS: Record<string, FilterDefinition[]> = {
  "turkish-blends": [
    { key: "smooth", label: { en: "Smooth", ar: "ناعم" } },
    { key: "bold", label: { en: "Bold", ar: "قوي" } },
    { key: "premium", label: { en: "Premium", ar: "فاخر" } },
  ],
  "espresso-blends": [
    { key: "creamy", label: { en: "Creamy", ar: "كريمي" } },
    { key: "balanced", label: { en: "Balanced", ar: "متوازن" } },
    { key: "bold", label: { en: "Bold", ar: "قوي" } },
    { key: "premium", label: { en: "Premium", ar: "فاخر" } },
  ],
  "easy-coffee": [
    { key: "classic", label: { en: "Classic", ar: "كلاسيك" } },
    { key: "premium", label: { en: "Gold", ar: "جولد" } },
  ],
  "coffee-mix": FLAVOR_FILTERS,
  cappuccino: FLAVOR_FILTERS,
  "hot-chocolate": FLAVOR_FILTERS,
  "flavor-coffee": FLAVOR_FILTERS,
};

const SMART_FLAVOR_CATEGORIES = new Set([
  "coffee-mix",
  "cappuccino",
  "hot-chocolate",
  "flavor-coffee",
]);

const FLAVOR_FAMILY_ORDER: Partial<Record<ProductTasteFilterKey, number>> = {
  original: 0,
  fruit: 1,
  nuts: 2,
  chocolate: 3,
  dessert: 4,
  signature: 5,
};

const FRUIT_TOKENS = [
  "strawberry",
  "banana",
  "mango",
  "peach",
  "blueberry",
  "cherry",
  "apple",
  "grape",
  "watermelon",
  "guava",
  "pineapple",
  "orange",
];

const NUT_TOKENS = ["hazelnut", "almond", "pistachio"];
const CHOCOLATE_TOKENS = ["chocolate", "nutella", "mocha", "oreo"];
const DESSERT_TOKENS = ["lotus", "cinnamon-roll", "vanilla", "caramel", "coconut"];
const SIGNATURE_TOKENS = ["shisha", "hot-cider"];

// Product slugs are built as "<flavor>-<category>" (e.g. "strawberry-hot-chocolate").
// Some category names contain a taste-family word themselves (hot-chocolate contains
// "chocolate"), so matching tokens against the full slug would misclassify every
// product in that category. Stripping the category's own slug suffix first isolates
// just the flavor part before any token check runs.
const CATEGORY_SUFFIX_OVERRIDES: Record<string, string> = {
  "flavor-coffee": "coffee",
};

function stripCategorySuffix(slug: string, categorySlug: string): string {
  const suffix = CATEGORY_SUFFIX_OVERRIDES[categorySlug] ?? categorySlug;
  const marker = `-${suffix}`;
  return slug.endsWith(marker) ? slug.slice(0, -marker.length) : slug;
}

function includesToken(value: string, tokens: string[]) {
  return tokens.some((token) => value.includes(token));
}

function flavorGroup(
  categorySlug: string,
  product: TasteFilterProduct,
): ProductTasteFilterKey {
  const rawSlug = product.slug.toLowerCase();

  if (rawSlug.includes("original") || rawSlug === "french-coffee") return "original";

  const flavorCore = stripCategorySuffix(rawSlug, categorySlug);

  if (includesToken(flavorCore, SIGNATURE_TOKENS)) return "signature";
  if (includesToken(flavorCore, CHOCOLATE_TOKENS)) return "chocolate";
  if (includesToken(flavorCore, NUT_TOKENS)) return "nuts";
  if (includesToken(flavorCore, FRUIT_TOKENS)) return "fruit";
  if (includesToken(flavorCore, DESSERT_TOKENS)) return "dessert";
  return "signature";
}

export function getProductTasteGroup(
  categorySlug: string,
  product: TasteFilterProduct,
): ProductTasteFilterKey {
  const slug = product.slug.toLowerCase();

  if (categorySlug === "turkish-blends") {
    if (slug === "turkish-silk") return "smooth";
    if (slug === "high-mood") return "premium";
    return "bold";
  }

  if (categorySlug === "espresso-blends") {
    if (slug === "heavy-crema") return "creamy";
    if (slug === "aroma-body") return "balanced";
    if (slug === "black-label") return "premium";
    return "bold";
  }

  if (categorySlug === "easy-coffee") {
    return slug === "gold-line" ? "premium" : "classic";
  }

  return flavorGroup(categorySlug, product);
}

export function matchesProductTasteFilter(
  categorySlug: string,
  product: TasteFilterProduct,
  filter: ProductTasteFilterKey,
) {
  return filter === "all" || getProductTasteGroup(categorySlug, product) === filter;
}

export function organizeFlavorCategoryProducts<T extends MerchandisingProduct>(
  categorySlug: string,
  products: T[],
  filter: ProductTasteFilterKey,
): T[] {
  if (!SMART_FLAVOR_CATEGORIES.has(categorySlug)) {
    return products;
  }

  return products
    .map((product, index) => ({ product, index }))
    .sort((a, b) => {
      if (filter === "all") {
        const familyDifference =
          (FLAVOR_FAMILY_ORDER[getProductTasteGroup(categorySlug, a.product)] ?? 99) -
          (FLAVOR_FAMILY_ORDER[getProductTasteGroup(categorySlug, b.product)] ?? 99);
        if (familyDifference !== 0) return familyDifference;
      }

      const availabilityDifference =
        Number(a.product.isAvailable === false) - Number(b.product.isAvailable === false);
      if (availabilityDifference !== 0) return availabilityDifference;

      const bestSellerDifference =
        Number(Boolean(b.product.bestSeller)) - Number(Boolean(a.product.bestSeller));
      if (bestSellerDifference !== 0) return bestSellerDifference;

      const featuredDifference =
        Number(Boolean(b.product.featured)) - Number(Boolean(a.product.featured));
      if (featuredDifference !== 0) return featuredDifference;

      const newDifference =
        Number(Boolean(b.product.isNew)) - Number(Boolean(a.product.isNew));
      if (newDifference !== 0) return newDifference;

      return a.index - b.index;
    })
    .map(({ product }) => product);
}

export function getProductTasteFilterOptions(
  categorySlug: string,
  products: TasteFilterProduct[],
): ProductTasteFilterOption[] {
  const knownDefinitions = CATEGORY_FILTERS[categorySlug];
  const definitions = knownDefinitions ?? FLAVOR_FILTERS;
  const options = [ALL_FILTER, ...definitions];

  return options
    .map((option) => ({
      ...option,
      count:
        option.key === "all"
          ? products.length
          : products.filter((product) =>
              matchesProductTasteFilter(categorySlug, product, option.key),
            ).length,
    }))
    .filter(
      (option) =>
        option.key === "all" ||
        Boolean(knownDefinitions) ||
        option.count > 0,
    );
}

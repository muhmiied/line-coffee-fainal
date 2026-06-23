import { catalogProducts } from "@/lib/mock-data/product-catalog";
import type { CatalogCategorySlug } from "@/lib/mock-data/product-catalog";

export type ProductStatus = "In Stock" | "Low Stock" | "Out of Stock";
export type AdminCategoryStatus = "visible" | "hidden" | "draft" | "archived";
export type AdminCategoryVisibility = "public" | "internal";
export type AdminCategorySource = "manual" | "system" | "accounting-draft" | "imported";

export interface AdminProductMeta {
  status: ProductStatus;
  hidden: boolean;
  featured: boolean;
  bestSeller: boolean;
  stockQty: number;
  lowStockThreshold: number;
  sku: string;
  metaTitle: { en: string; ar: string };
  metaDescription: { en: string; ar: string };
  gallery: string[];
}

export interface AdminProductCategory {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  descriptionEn: string;
  descriptionAr: string;
  status: AdminCategoryStatus;
  visibility: AdminCategoryVisibility;
  sortOrder: number;
  productCount: number;
  featured: boolean;
  showOnWebsite: boolean;
  source: AdminCategorySource;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

// SKU prefixes per category
const SKU_PREFIX: Record<CatalogCategorySlug, string> = {
  "turkish-blends":  "TRK",
  "espresso-blends": "ESP",
  "easy-coffee":     "ECO",
  "coffee-mix":      "MIX",
  "cappuccino":      "CAP",
  "hot-chocolate":   "CHO",
  "flavor-coffee":   "FLV",
};

// Named overrides for products with specific admin states
const OVERRIDES: Record<string, Partial<AdminProductMeta>> = {
  "turkish-silk":            { status: "In Stock",     bestSeller: true,  featured: true,  stockQty: 18, sku: "TRK-001" },
  "strike-coffee":           { status: "In Stock",                                          stockQty: 12, sku: "TRK-002" },
  "cairo-nights":            { status: "Low Stock",                                         stockQty: 4,  sku: "TRK-003" },
  "high-mood":               { status: "In Stock",     bestSeller: true,  featured: true,  stockQty: 9,  sku: "TRK-004" },
  "heavy-crema":             { status: "Low Stock",    bestSeller: true,                   stockQty: 2,  sku: "ESP-001" },
  "aroma-body":              { status: "In Stock",                                          stockQty: 8,  sku: "ESP-002" },
  "headshot":                { status: "In Stock",                                          stockQty: 6,  sku: "ESP-003" },
  "black-label":             { status: "Out of Stock",                    featured: true,  stockQty: 0,  sku: "ESP-004" },
  "classic-line":            { status: "In Stock",     bestSeller: true,                   stockQty: 42, sku: "ECO-001" },
  "gold-line":               { status: "Low Stock",                                         stockQty: 8,  sku: "ECO-002" },
  "original-cappuccino":     { status: "In Stock",     bestSeller: true,  featured: true,  stockQty: 64, sku: "CAP-001" },
  "hazelnut-cappuccino":     { status: "Low Stock",                                         stockQty: 3,  sku: "CAP-002" },
};

const DEFAULT: AdminProductMeta = {
  status: "In Stock",
  hidden: false,
  featured: false,
  bestSeller: false,
  stockQty: 20,
  lowStockThreshold: 5,
  sku: "",
  metaTitle: { en: "", ar: "" },
  metaDescription: { en: "", ar: "" },
  gallery: [],
};

// Counter per prefix for auto-SKU generation
const _counters: Record<string, number> = {};

export function getAdminMeta(slug: string, category: CatalogCategorySlug): AdminProductMeta {
  const override = OVERRIDES[slug];
  if (override?.sku) {
    return { ...DEFAULT, ...override };
  }
  // Auto-generate SKU
  const prefix = SKU_PREFIX[category];
  _counters[prefix] = (_counters[prefix] ?? 0) + 1;
  const autoSku = `${prefix}-${String(_counters[prefix]).padStart(3, "0")}`;
  return { ...DEFAULT, ...override, sku: autoSku };
}

// Merged type used by the page
export type AdminProduct = (typeof catalogProducts)[number] & AdminProductMeta;

export const adminProducts: AdminProduct[] = catalogProducts.map((p) => ({
  ...p,
  ...getAdminMeta(p.slug, p.category),
}));

// Summary counts
export const PRODUCT_ADMIN_SUMMARY = {
  total:      adminProducts.length,
  active:     adminProducts.filter((p) => !p.hidden).length,
  outOfStock: adminProducts.filter((p) => p.status === "Out of Stock").length,
  bestSellers: adminProducts.filter((p) => p.bestSeller).length,
};

type CategorySeed = Omit<AdminProductCategory, "productCount"> & {
  productCount?: number;
};

const CATEGORY_TIMESTAMP = "2026-06-23T09:00:00.000Z";

const CATEGORY_SEEDS: CategorySeed[] = [
  {
    id: "cat-turkish-blends",
    nameEn: "Turkish Blends",
    nameAr: "خلطات تركي",
    slug: "turkish-blends",
    descriptionEn: "Traditional Turkish coffee blends for classic cups and daily rituals.",
    descriptionAr: "خلطات قهوة تركي بطابع كلاسيكي للاستخدام اليومي.",
    status: "visible",
    visibility: "public",
    sortOrder: 10,
    featured: true,
    showOnWebsite: true,
    source: "system",
    createdAt: CATEGORY_TIMESTAMP,
    updatedAt: CATEGORY_TIMESTAMP,
    notes: "Core Line Coffee category.",
  },
  {
    id: "cat-espresso-blends",
    nameEn: "Espresso Blends",
    nameAr: "خلطات إسبريسو",
    slug: "espresso-blends",
    descriptionEn: "Balanced espresso blends built around crema, aroma, and body.",
    descriptionAr: "خلطات إسبريسو متوازنة للكريما والرائحة والقوام.",
    status: "visible",
    visibility: "public",
    sortOrder: 20,
    featured: true,
    showOnWebsite: true,
    source: "system",
    createdAt: CATEGORY_TIMESTAMP,
    updatedAt: CATEGORY_TIMESTAMP,
    notes: "Core Line Coffee category.",
  },
  {
    id: "cat-easy-coffee",
    nameEn: "Easy Coffee",
    nameAr: "قهوة سريعة التحضير",
    slug: "easy-coffee",
    descriptionEn: "Fast, consistent coffee mixes for practical daily preparation.",
    descriptionAr: "اختيارات قهوة سهلة وسريعة للتحضير اليومي.",
    status: "visible",
    visibility: "public",
    sortOrder: 30,
    featured: false,
    showOnWebsite: true,
    source: "system",
    createdAt: CATEGORY_TIMESTAMP,
    updatedAt: CATEGORY_TIMESTAMP,
  },
  {
    id: "cat-flavor-coffee",
    nameEn: "Flavor Coffee",
    nameAr: "قهوة بنكهات",
    slug: "flavor-coffee",
    descriptionEn: "Flavored coffee profiles for customers who want a sweeter cup.",
    descriptionAr: "قهوة بنكهات متنوعة لمحبي الطعم الحلو والمميز.",
    status: "visible",
    visibility: "public",
    sortOrder: 40,
    featured: false,
    showOnWebsite: true,
    source: "system",
    createdAt: CATEGORY_TIMESTAMP,
    updatedAt: CATEGORY_TIMESTAMP,
  },
  {
    id: "cat-coffee-mix",
    nameEn: "Coffee Mix",
    nameAr: "كوفي ميكس",
    slug: "coffee-mix",
    descriptionEn: "Coffee mix products for convenient hot drinks.",
    descriptionAr: "منتجات كوفي ميكس لتحضير مشروبات ساخنة بسهولة.",
    status: "visible",
    visibility: "public",
    sortOrder: 50,
    featured: false,
    showOnWebsite: true,
    source: "system",
    createdAt: CATEGORY_TIMESTAMP,
    updatedAt: CATEGORY_TIMESTAMP,
  },
  {
    id: "cat-cappuccino",
    nameEn: "Cappuccino",
    nameAr: "كابتشينو",
    slug: "cappuccino",
    descriptionEn: "Cappuccino mixes with a creamy, cafe-style profile.",
    descriptionAr: "خلطات كابتشينو كريمية بطابع المقاهي.",
    status: "visible",
    visibility: "public",
    sortOrder: 60,
    featured: false,
    showOnWebsite: true,
    source: "system",
    createdAt: CATEGORY_TIMESTAMP,
    updatedAt: CATEGORY_TIMESTAMP,
  },
  {
    id: "cat-hot-chocolate",
    nameEn: "Hot Chocolate",
    nameAr: "هوت شوكليت",
    slug: "hot-chocolate",
    descriptionEn: "Warm chocolate drinks for non-coffee moments.",
    descriptionAr: "مشروبات شوكولاتة دافئة لاختيارات غير القهوة.",
    status: "visible",
    visibility: "public",
    sortOrder: 70,
    featured: false,
    showOnWebsite: true,
    source: "system",
    createdAt: CATEGORY_TIMESTAMP,
    updatedAt: CATEGORY_TIMESTAMP,
  },
  {
    id: "cat-make-your-espresso",
    nameEn: "Make Your Espresso",
    nameAr: "اصنع إسبريسو خاصتك",
    slug: "make-your-espresso",
    descriptionEn: "Admin category for the custom espresso blend builder experience.",
    descriptionAr: "تصنيف إداري لتجربة تصميم خلطة الإسبريسو الخاصة.",
    status: "visible",
    visibility: "public",
    sortOrder: 80,
    productCount: 0,
    featured: false,
    showOnWebsite: true,
    source: "system",
    createdAt: CATEGORY_TIMESTAMP,
    updatedAt: CATEGORY_TIMESTAMP,
    notes: "Builder category exists in admin even though it is not part of product-catalog category types.",
  },
  {
    id: "cat-make-your-flavor",
    nameEn: "Make Your Flavor",
    nameAr: "اصنع نكهتك",
    slug: "make-your-flavor",
    descriptionEn: "Admin category for the custom flavor mix builder experience.",
    descriptionAr: "تصنيف إداري لتجربة تصميم خليط النكهات الخاصة.",
    status: "visible",
    visibility: "public",
    sortOrder: 90,
    productCount: 0,
    featured: false,
    showOnWebsite: true,
    source: "system",
    createdAt: CATEGORY_TIMESTAMP,
    updatedAt: CATEGORY_TIMESTAMP,
    notes: "Builder category exists in admin even though it is not part of product-catalog category types.",
  },
];

function getCategoryProductCount(slug: string): number {
  return catalogProducts.filter((product) => product.category === slug).length;
}

export const adminProductCategories: AdminProductCategory[] = CATEGORY_SEEDS.map((category) => ({
  ...category,
  productCount: category.productCount ?? getCategoryProductCount(category.slug),
}));

export const PRODUCT_CATEGORY_SUMMARY = {
  total: adminProductCategories.length,
  publicWebsite: adminProductCategories.filter(
    (category) =>
      category.status === "visible" &&
      category.visibility === "public" &&
      category.showOnWebsite
  ).length,
  hiddenOrDraft: adminProductCategories.filter(
    (category) => category.status === "hidden" || category.status === "draft"
  ).length,
  internal: adminProductCategories.filter((category) => category.visibility === "internal").length,
  archived: adminProductCategories.filter((category) => category.status === "archived").length,
  featured: adminProductCategories.filter((category) => category.featured).length,
};

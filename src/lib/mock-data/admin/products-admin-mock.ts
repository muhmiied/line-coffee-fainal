import { catalogProducts } from "@/lib/mock-data/product-catalog";
import type { CatalogCategorySlug } from "@/lib/mock-data/product-catalog";

export type ProductStatus = "In Stock" | "Low Stock" | "Out of Stock";

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

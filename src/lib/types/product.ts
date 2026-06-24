// Line Coffee V3 — Launch-Core Data Contracts
// product.ts — canonical product + variant contract.
//
// Phase 3A, Part A. Type-only. Additive. Not yet imported anywhere.
// Merges the website catalog product (`CatalogProduct`: pricing, blend, notes)
// and the admin product meta (`AdminProductMeta`: status, visibility, sku,
// stock) into one launch shape, with per-size variants pulled out into
// `ProductVariant` so the future `product_variants` table maps cleanly.

import type {
  ID,
  ISODateTime,
  ImageAssetRef,
  LocalizedValue,
  Money,
  PackageSize,
} from "@/lib/types/common";

// Catalog lifecycle for a product.
export type ProductStatus = "active" | "draft" | "archived";

// Public visibility, independent of status (an active product can still be
// temporarily hidden from the website).
export type ProductVisibility = "public" | "hidden";

// How a product is priced.
// - "fixed": per-variant fixed prices (e.g. 250g/500g/1kg packaged goods).
// - "per_kg": priced by weight from a per-kg rate (origin beans).
// - "custom_builder": price computed by Make-Your-Espresso / Make-Your-Flavor.
export type ProductPricingModel = "fixed" | "per_kg" | "custom_builder";

// What kind of product line this is.
export type ProductKind = "standard" | "custom_espresso" | "custom_flavor";

// Derived availability state for a product/variant. Computed from inventory at
// launch; stored here so website/admin can render a badge without a join.
export type StockState = "in_stock" | "low_stock" | "out_of_stock";

// Bean composition of a blend product.
export type BeanType = "arabica" | "robusta" | "mixed";

// One origin/component inside a blend, with its share of the blend.
export interface BlendComponent {
  origin: LocalizedValue;
  beanType?: BeanType;
  // Share of the blend, 0–100.
  percentage: number;
}

// A purchasable size of a product. One product has 1..n variants.
// Supabase mapping: `product_variants` table.
export interface ProductVariant {
  id: ID;
  productId: ID;
  size: PackageSize;
  sku?: string;
  price: Money;
  // Optional original/list price for showing a strike-through discount.
  compareAtPrice?: Money;
  stockState?: StockState;
  sortOrder?: number;
}

// The canonical product. Read by website (catalog/detail/cart), admin Products,
// Espresso/Flavor managers, inventory joins, and order snapshots.
// Supabase mapping: `products` table (+ `product_variants`, + `categories` FK).
export interface Product {
  id: ID;
  slug: string;
  categoryId: ID;
  // Denormalized category slug for fast website routing/filtering without a join.
  categorySlug?: string;
  name: LocalizedValue;
  subtitle?: LocalizedValue;
  description?: LocalizedValue;
  // Short tasting/usage notes shown on cards and detail pages.
  notes?: LocalizedValue;
  kind: ProductKind;
  status: ProductStatus;
  visibility: ProductVisibility;
  showOnWebsite: boolean;
  featured: boolean;
  bestSeller: boolean;
  pricingModel: ProductPricingModel;
  // Per-kg sale price for "per_kg" products (e.g. loose origin beans).
  salePricePerKg?: Money;
  // Internal per-kg purchase cost — admin/accounting only, never shown publicly.
  purchaseCostPerKg?: Money;
  variants: ProductVariant[];
  blend?: BlendComponent[];
  image?: ImageAssetRef;
  gallery?: ImageAssetRef[];
  seoTitle?: LocalizedValue;
  seoDescription?: LocalizedValue;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// Compact product shape for grids, search results, and admin tables.
export interface ProductSummary {
  id: ID;
  slug: string;
  name: LocalizedValue;
  categorySlug?: string;
  status: ProductStatus;
  showOnWebsite: boolean;
  image?: ImageAssetRef;
  // Cheapest variant price, for "from X EGP" display.
  fromPrice?: Money;
  stockState?: StockState;
}

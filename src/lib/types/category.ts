// Line Coffee V3 — Launch-Core Data Contracts
// category.ts — canonical category contract.
//
// Phase 3A, Part A. Type-only. Additive. Not yet imported anywhere.
// Unifies the multiple category shapes that exist today (website
// `CatalogCategory` with { en, ar } names, and the admin product-category mock
// with flat nameEn/nameAr + rich admin fields) into one launch shape.

import type {
  ID,
  ISODateTime,
  ImageAssetRef,
  LocalizedValue,
} from "@/lib/types/common";

// Lifecycle for a category. "visible"/"hidden" are the day-to-day states;
// "draft" is not-yet-ready; "archived" is retired but retained for history.
export type CategoryStatus = "visible" | "hidden" | "draft" | "archived";

// Where the category originated. "catalog" = seeded product catalog,
// "admin" = created in the dashboard, "system" = built-in/reserved.
export type CategorySource = "catalog" | "admin" | "system";

// A product category as used by website navigation, category pages, product
// filters, and the admin Products → Categories tab.
// Supabase mapping: `categories` table.
export interface Category {
  id: ID;
  slug: string;
  name: LocalizedValue;
  description?: LocalizedValue;
  status: CategoryStatus;
  // Whether the category is shown in public website nav/listing. Independent of
  // `status` so a visible-but-not-on-website category is expressible.
  showOnWebsite: boolean;
  sortOrder: number;
  image?: ImageAssetRef;
  source?: CategorySource;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// Lightweight shape for dropdowns / selectors (e.g. assigning a product to a
// category) where only id + label are needed.
export interface CategoryOption {
  id: ID;
  slug: string;
  name: LocalizedValue;
}

// Compact summary for list views and KPI rows.
export interface CategorySummary {
  id: ID;
  slug: string;
  name: LocalizedValue;
  status: CategoryStatus;
  showOnWebsite: boolean;
  productCount: number;
}

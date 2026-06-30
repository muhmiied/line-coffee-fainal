// Line Coffee V3 — Launch-Core Data Contracts
// common.ts — shared primitives for all domain contracts.
//
// Type-only. Additive. These define the canonical vocabulary every other
// contract (category, product, customer, order, ...) builds on, collapsing the
// codebase's bilingual conventions into one (`LocalizedValue`).
// Status (2026-06-29, Phase 3 audit): partially LIVE — `LocalizedValue` and
// `PackageSize` are imported by the public/admin catalog data layers; the rest of
// this vocabulary is still forward-looking. See `src/lib/types/README.md` for the
// live-vs-dormant contract registry.

// Canonical bilingual value used across the whole project: { en, ar }.
// Re-exported (type-only) from the language context so there is a single
// source of truth and language.tsx does not need to change.
// Supabase mapping: usually two columns `*_en` / `*_ar`, or a single jsonb column.
export type { LocalizedValue } from "@/lib/context/language";

// Primary key. App-facing string today; UUID (text) in Supabase later.
export type ID = string;

// Calendar date with no time component, ISO 8601: "YYYY-MM-DD".
// Supabase mapping: `date`.
export type ISODate = string;

// Timestamp with date + time, ISO 8601: "YYYY-MM-DDTHH:mm:ssZ".
// Supabase mapping: `timestamptz`.
export type ISODateTime = string;

// Monetary amount in EGP, carried as a JS number at the app boundary.
// Per master plan §6.7 the DB stores money as `numeric(_, 2)` — 2 decimal places
// (totals, discounts, delivery fees, COGS, refunds, expenses, supplier payments),
// frozen as a snapshot on the order. The UI may render whole EGP, but the stored
// value keeps 2 decimals. (Earlier this type was documented as integer-only; that
// is corrected here to match the locked precision rule.)
// Supabase mapping: `numeric(_, 2)`.
export type Money = number;

// The only currency Line Coffee operates in at launch.
export type CurrencyCode = "EGP";

// Finished-product package sizes. Finished products are tracked as units per
// size (250g / 500g / 1kg) — never as KG. Beans use KG, packaging uses units.
// Supabase mapping: `product_variants.size`.
export type PackageSize = "250g" | "500g" | "1kg";

// Shared publish/visibility lifecycle reused by content-like entities.
// Domain contracts may narrow this (e.g. categories use a slightly different set).
export type PublishStatus = "draft" | "published" | "archived";

// Generic visibility for surfaces that are simply shown or hidden.
export type VisibilityStatus = "visible" | "hidden";

// Sort direction for list/table queries and selectors.
export type SortDirection = "asc" | "desc";

// Reference to an image asset (url + bilingual alt + optional metadata).
// Today the codebase stores bare string paths; this is the shape the future
// Media Studio / `media_assets` table will resolve to.
// Supabase mapping: `media_assets` row referenced by id, or inlined url.
export interface ImageAssetRef {
  id?: ID;
  url: string;
  // Bilingual alt text. Kept loose (LocalizedValue) but optional so existing
  // bare-path images can adopt this shape incrementally.
  alt?: { en: string; ar: string };
  width?: number;
  height?: number;
}

// Helper for fields that are explicitly nullable (Supabase `null`) vs merely
// optional (absent key). Use when the distinction matters for a contract field.
export type Nullable<T> = T | null;

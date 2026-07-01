// Line Coffee V3 — Launch-Core Flavor Builder Contract
// flavor.ts — canonical Make-Your-Flavor base + flavor catalog.
//
// Phase 3E. Type-only. Additive. Not yet imported anywhere.
//
// SUPERSEDED BY THE REAL PHASE 9 SHAPE (2026-07-01): this file's vocabulary
// (`slug`, `basePricePerKg`, `addOnPricePerKg`, category enum
// original/sweets/nuts/fruits/special_order) predates the actual flavor
// catalog and does not match the live `flavor_bases` / `flavor_items` tables
// (migration 20260701120000) or `flavorData.ts` (base_key/flavor_key,
// price_per_kg/add_on_per_kg, categories chocolate/fruits/nuts/desserts/
// coffee-shisha). The real, live-mapped contracts are
// `src/lib/types/builders.ts` (`FlavorBuilderPayload` /
// `FlavorBuilderOrderSnapshot`) and `src/lib/admin/admin-flavor.ts`
// (`AdminFlavorBase` / `AdminFlavorItem`). This file is kept for history but
// should not be used for new Phase 9 work.
//
// Closes the flavor-catalog gap identified in the Supabase Schema + Real Data
// Transition Plan (§B gap, §E tables 7/8): the Make-Your-Flavor builder data
// (`flavorData.ts`) and the admin Flavor Manager use separate, untyped local
// shapes. This contract is the single canonical shape both will read from once
// DB-backed. It does NOT change `flavorData.ts` and implements no UI.
//
// Business rules encoded in the model (per CURRENT_STATE + builder blueprint):
//   - Valid bases include Turkish Coffee, Coffee Mix, Cappuccino, AND Hot
//     Chocolate (Hot Chocolate is a first-class base, not a flavor).
//   - "French Coffee / Original" exists as a standalone Flavor Coffee product;
//     the FlavorCategory "original" exists for catalog completeness but the
//     builder is NOT forced to include Original if the current business rule
//     excludes it. Inclusion is a data/visibility decision (`visible`/`status`),
//     not a type constraint.

import type {
  ID,
  ISODateTime,
  ImageAssetRef,
  LocalizedValue,
  Money,
  PackageSize,
} from "@/lib/types/common";

// Lifecycle for a flavor base. "active" is sellable in the builder; "hidden" is
// withheld from the public builder but retained; "archived" is retired.
// Supabase mapping: `flavor_bases.status`.
export type FlavorBaseStatus = "active" | "hidden" | "archived";

// Lifecycle for a flavor item. Same semantics as FlavorBaseStatus.
// Supabase mapping: `flavor_items.status`.
export type FlavorItemStatus = "active" | "hidden" | "archived";

// A base the customer builds a flavor mix on (Turkish Coffee, Coffee Mix,
// Cappuccino, Hot Chocolate). `visible` is the day-to-day public toggle;
// `status` is the lifecycle. `basePricePerKg` anchors builder pricing.
// Supabase mapping: `flavor_bases` table.
export interface FlavorBase {
  id: ID;
  slug: string;
  name: LocalizedValue;
  description?: LocalizedValue;
  basePricePerKg?: Money;
  visible: boolean;
  status: FlavorBaseStatus;
  sortOrder: number;
  image?: ImageAssetRef;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// Flavor grouping for the builder library tabs. "original" is kept for catalog
// completeness (French Coffee / Original as a standalone product) and is not
// forced into the builder. "special_order" covers made-to-order flavors.
// Supabase mapping: `flavor_items.category`.
export type FlavorCategory =
  | "original"
  | "sweets"
  | "nuts"
  | "fruits"
  | "special_order";

// A single flavor the customer adds to a base. `addOnPricePerKg` is added on top
// of the base price per kg. `visible`/`status` control public availability.
// Supabase mapping: `flavor_items` table.
export interface FlavorItem {
  id: ID;
  slug: string;
  name: LocalizedValue;
  description?: LocalizedValue;
  category: FlavorCategory;
  addOnPricePerKg: Money;
  visible: boolean;
  status: FlavorItemStatus;
  sortOrder: number;
  image?: ImageAssetRef;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// A customer's builder selection at configuration time. References a base and a
// flavor by id, plus optional sweetness label and package size. This is the
// shape an order's custom-flavor snapshot (order.ts FlavorOrderData) derives
// from; it is NOT a stored entity by itself.
export interface FlavorBuilderSelection {
  baseId: ID;
  flavorItemId: ID;
  sweetness?: string;
  size?: PackageSize;
}

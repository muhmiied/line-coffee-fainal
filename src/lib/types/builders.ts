// Line Coffee V3 — Launch-Core Data Contracts
// builders.ts — Phase 8-9 custom builder (Make Your Espresso / Make Your
// Flavor) checkout payload + order-snapshot contracts.
//
// Type-only. Additive.
// Status (2026-07-01, Phase 8-9): LIVE at the data-layer boundary —
// `EspressoBuilderPayload` / `FlavorBuilderPayload` are the shape of
// `CartItem.customData` (src/lib/context/cart.tsx), produced by the two
// builder studios and consumed by the checkout page to build the
// `create_checkout_order` RPC item payload. The server (migration
// 20260701120000) re-validates and re-prices everything here from its own
// `espresso_beans` / `flavor_bases` / `flavor_items` catalog tables — these
// client-side payloads are never trusted for price/cost, only for WHICH beans
// / base / flavors were selected.
//
// `EspressoBuilderOrderSnapshot` / `FlavorBuilderOrderSnapshot` describe the
// cost-free `order_items.custom_data` shape the server actually writes back
// (bean/flavor names + ratios, no price/cost fields) — this is what a future
// admin/account UI would render, distinct from the older speculative
// `EspressoOrderData` / `FlavorOrderData` shapes in `order.ts` (kept for
// compatibility; superseded by the shapes below for the real Phase 8/9
// payload). `EspressoBeanAllocation` mirrors `OrderLotAllocation`
// (inventory.ts) for the separate raw-bean FIFO resource.

import type { ID, Money, PackageSize } from "@/lib/types/common";

// ---------------------------------------------------------------------------
// Make Your Espresso (Phase 8 — real manufacturing)
// ---------------------------------------------------------------------------

// One bean + its ratio share of the blend. `beanKey` matches
// `espresso_beans.bean_key` (== the static `EspressoBean.id` in
// espressoBeans.ts) — the server looks the bean up by this key.
export interface EspressoBlendComponent {
  beanKey: string;
  percent: number;
}

// Client-authored payload carried on `CartItem.customData` and forwarded
// (as `{ kind, size, quantity, beans: [{bean_key, percent}] }`) inside the
// `create_checkout_order` RPC item. Price/cost are never included — the
// server recomputes both from its own bean catalog.
export interface EspressoBuilderPayload {
  kind: "espresso-blend";
  packageSize: PackageSize;
  beans: EspressoBlendComponent[];
}

// What the server actually computed for a line (informational — not returned
// by any RPC yet; documents the authoritative pricing shape for a future
// preview endpoint).
export interface EspressoBuilderPricingResult {
  pricePerKg: Money;
  unitPrice: Money;
  lineTotal: Money;
}

// Cost-free snapshot written to `order_items.custom_data` for a
// `custom_espresso` line. No price/cost fields — safe for any future
// customer-facing read.
export interface EspressoBuilderOrderSnapshot {
  builder: "espresso";
  packageSize: PackageSize;
  totalWeightKg: number;
  beans: Array<{
    beanKey: string;
    nameEn: string;
    nameAr: string;
    percent: number;
    requiredKg: number;
  }>;
}

// Mirrors `OrderLotAllocation` (src/lib/types/inventory.ts) for the separate
// raw-bean FIFO resource. Private (admin-only) — carries a cost basis.
// Supabase mapping: `order_espresso_bean_allocations` table (migration
// 20260701120000).
export interface EspressoBeanAllocation {
  id: ID;
  orderId: ID;
  orderItemId?: ID;
  beanId: ID;
  lotId: ID;
  reservedQtyKg: number;
  deductedQtyKg: number;
  unitCost: Money;
  status: "reserved" | "deducted" | "released";
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Make Your Flavor (Phase 9 — cost-only, no stock movement)
// ---------------------------------------------------------------------------

// Client-authored payload carried on `CartItem.customData` and forwarded
// (as `{ kind, size, quantity, base_key, flavor_keys: [...] }`) inside the
// `create_checkout_order` RPC item.
export interface FlavorBuilderPayload {
  kind: "flavor-mix";
  packageSize: PackageSize;
  baseKey: string;
  flavorKeys: string[];
}

export interface FlavorBuilderPricingResult {
  pricePerKg: Money;
  unitPrice: Money;
  lineTotal: Money;
}

// Cost-free snapshot written to `order_items.custom_data` for a
// `custom_flavor` line. The (optional) private cost basis lives only in
// `order_items.line_cogs` — never in this snapshot.
export interface FlavorBuilderOrderSnapshot {
  builder: "flavor";
  packageSize: PackageSize;
  totalWeightKg: number;
  base: { baseKey: string; nameEn: string; nameAr: string };
  flavors: Array<{
    flavorKey: string;
    nameEn: string;
    nameAr: string;
    addOnPerKg: Money;
  }>;
}

export type BuilderOrderItemSnapshot =
  | EspressoBuilderOrderSnapshot
  | FlavorBuilderOrderSnapshot;

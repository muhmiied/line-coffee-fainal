"use client";

// Line Coffee V3 — Admin Flavor Base/Item data layer (Phase 9)
//
// Backend/data-layer foundation for the cost-only flavor catalog introduced
// by migration 20260701120000_phase8_9_espresso_flavor_builders. NOT wired
// into the existing (mock) Admin Flavor Manager page — deliberately deferred,
// same as admin-espresso.ts.
//
// Access model (admin-only): flavor_bases / flavor_items are admin-read-only
// via RLS. Writes go through SECURITY DEFINER RPCs (upsert_flavor_base /
// upsert_flavor_item).

import { supabase } from "@/lib/supabase/client";

export type FlavorCategory = "chocolate" | "fruits" | "nuts" | "desserts" | "coffee-shisha";

export type AdminFlavorBase = {
  id: string;
  baseKey: string;
  nameEn: string;
  nameAr: string;
  hintEn: string | null;
  hintAr: string | null;
  pricePerKg: number;
  costPerKg: number | null;
  active: boolean;
  sortOrder: number;
};

export type AdminFlavorItem = {
  id: string;
  flavorKey: string;
  nameEn: string;
  nameAr: string;
  hintEn: string | null;
  hintAr: string | null;
  category: FlavorCategory;
  addOnPerKg: number;
  costPerKg: number | null;
  metrics: Record<string, number>;
  active: boolean;
  sortOrder: number;
};

export type FlavorBaseUpsertInput = {
  id?: string;
  baseKey: string;
  nameEn: string;
  nameAr: string;
  hintEn?: string | null;
  hintAr?: string | null;
  pricePerKg: number;
  costPerKg?: number | null;
  active?: boolean;
  sortOrder?: number;
};

export type FlavorItemUpsertInput = {
  id?: string;
  flavorKey: string;
  nameEn: string;
  nameAr: string;
  hintEn?: string | null;
  hintAr?: string | null;
  category: FlavorCategory;
  addOnPerKg: number;
  costPerKg?: number | null;
  metrics?: Record<string, number>;
  active?: boolean;
  sortOrder?: number;
};

type BaseRow = {
  id: string;
  base_key: string;
  name_en: string;
  name_ar: string;
  hint_en: string | null;
  hint_ar: string | null;
  price_per_kg: number | string;
  cost_per_kg: number | string | null;
  active: boolean;
  sort_order: number;
};

type ItemRow = {
  id: string;
  flavor_key: string;
  name_en: string;
  name_ar: string;
  hint_en: string | null;
  hint_ar: string | null;
  category: FlavorCategory;
  add_on_per_kg: number | string;
  cost_per_kg: number | string | null;
  metrics: Record<string, number> | null;
  active: boolean;
  sort_order: number;
};

const BASE_COLUMNS = `
  id, base_key, name_en, name_ar, hint_en, hint_ar, price_per_kg, cost_per_kg, active, sort_order
`;

const ITEM_COLUMNS = `
  id, flavor_key, name_en, name_ar, hint_en, hint_ar, category,
  add_on_per_kg, cost_per_kg, metrics, active, sort_order
`;

export class AdminFlavorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminFlavorError";
  }
}

function money(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readError(message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[admin-flavor] ${message}`);
  }
  return new AdminFlavorError("Could not load the flavor catalog. Please try again.");
}

export async function listFlavorBases(): Promise<AdminFlavorBase[]> {
  const { data, error } = await supabase
    .from("flavor_bases")
    .select(BASE_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) throw readError(error.message);

  return ((data ?? []) as BaseRow[]).map((row) => ({
    id: row.id,
    baseKey: row.base_key,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    hintEn: row.hint_en,
    hintAr: row.hint_ar,
    pricePerKg: money(row.price_per_kg) ?? 0,
    costPerKg: money(row.cost_per_kg),
    active: row.active,
    sortOrder: row.sort_order,
  }));
}

export async function listFlavorItems(): Promise<AdminFlavorItem[]> {
  const { data, error } = await supabase
    .from("flavor_items")
    .select(ITEM_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) throw readError(error.message);

  return ((data ?? []) as ItemRow[]).map((row) => ({
    id: row.id,
    flavorKey: row.flavor_key,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    hintEn: row.hint_en,
    hintAr: row.hint_ar,
    category: row.category,
    addOnPerKg: money(row.add_on_per_kg) ?? 0,
    costPerKg: money(row.cost_per_kg),
    metrics: row.metrics ?? {},
    active: row.active,
    sortOrder: row.sort_order,
  }));
}

export async function upsertFlavorBase(input: FlavorBaseUpsertInput): Promise<void> {
  const { error } = await supabase.rpc("upsert_flavor_base", {
    p_payload: {
      id: input.id ?? null,
      base_key: input.baseKey,
      name_en: input.nameEn,
      name_ar: input.nameAr,
      hint_en: input.hintEn ?? null,
      hint_ar: input.hintAr ?? null,
      price_per_kg: input.pricePerKg,
      cost_per_kg: input.costPerKg ?? null,
      active: input.active ?? true,
      sort_order: input.sortOrder ?? 0,
    },
  });

  if (error) throw new AdminFlavorError(error.message || "Could not save the flavor base.");
}

export async function upsertFlavorItem(input: FlavorItemUpsertInput): Promise<void> {
  const { error } = await supabase.rpc("upsert_flavor_item", {
    p_payload: {
      id: input.id ?? null,
      flavor_key: input.flavorKey,
      name_en: input.nameEn,
      name_ar: input.nameAr,
      hint_en: input.hintEn ?? null,
      hint_ar: input.hintAr ?? null,
      category: input.category,
      add_on_per_kg: input.addOnPerKg,
      cost_per_kg: input.costPerKg ?? null,
      metrics: input.metrics ?? {},
      active: input.active ?? true,
      sort_order: input.sortOrder ?? 0,
    },
  });

  if (error) throw new AdminFlavorError(error.message || "Could not save the flavor item.");
}

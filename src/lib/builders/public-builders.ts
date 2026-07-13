"use client";

import { supabase } from "@/lib/supabase/client";
import type { EspressoBean, EspressoMetrics } from "@/features/website/make-your-espresso/data/espressoBeans";
import type {
  FlavorBase,
  FlavorCategory,
  FlavorItem,
  FlavorMetrics,
} from "@/features/website/make-your-flavor/data/flavorData";

type EspressoRow = {
  bean_key: string;
  name_en: string;
  name_ar: string;
  family: string;
  origin_en: string | null;
  origin_ar: string | null;
  taste_hint_en: string | null;
  taste_hint_ar: string | null;
  metrics: unknown;
  sale_price_per_kg: number | string;
};

type FlavorBaseRow = {
  base_key: string;
  name_en: string;
  name_ar: string;
  hint_en: string | null;
  hint_ar: string | null;
  price_per_kg: number | string;
};

type FlavorItemRow = {
  flavor_key: string;
  name_en: string;
  name_ar: string;
  hint_en: string | null;
  hint_ar: string | null;
  category: string;
  add_on_per_kg: number | string;
  metrics: unknown;
};

const espressoMetricKeys = [
  "body", "crema", "acidity", "chocolate", "sweetness", "strength",
] as const;
const flavorMetricKeys = [
  "sweetness", "creaminess", "chocolate", "fruitiness", "nutty", "intensity",
] as const;
const flavorCategories = new Set<FlavorCategory>([
  "chocolate", "fruits", "nuts", "desserts", "coffee-shisha",
]);

function finiteMoney(value: number | string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function mapMetrics<K extends string>(value: unknown, keys: readonly K[]): Record<K, number> {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(keys.map((key) => {
    const parsed = Number(row[key]);
    return [key, Number.isFinite(parsed) ? Math.min(5, Math.max(0, parsed)) : 3];
  })) as Record<K, number>;
}

export async function listPublicEspressoBeans(): Promise<EspressoBean[]> {
  const { data, error } = await supabase
    .from("public_espresso_beans")
    .select(`
      bean_key, name_en, name_ar, family, origin_en, origin_ar,
      taste_hint_en, taste_hint_ar, metrics, sale_price_per_kg
    `)
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Could not load the espresso catalog.");

  return ((data ?? []) as EspressoRow[]).flatMap((row) => {
    const salePrice = finiteMoney(row.sale_price_per_kg);
    if (!row.bean_key || !row.name_en || !row.name_ar || salePrice === null) return [];
    if (row.family !== "arabica" && row.family !== "robusta") return [];
    return [{
      id: row.bean_key,
      name: { en: row.name_en, ar: row.name_ar },
      family: row.family,
      salePrice,
      origin: { en: row.origin_en ?? "", ar: row.origin_ar ?? row.origin_en ?? "" },
      tasteHint: {
        en: row.taste_hint_en ?? "",
        ar: row.taste_hint_ar ?? row.taste_hint_en ?? "",
      },
      metrics: mapMetrics(row.metrics, espressoMetricKeys) as EspressoMetrics,
    }];
  });
}

export async function listPublicFlavorCatalog(): Promise<{
  bases: FlavorBase[];
  items: FlavorItem[];
}> {
  const [basesResult, itemsResult] = await Promise.all([
    supabase
      .from("public_flavor_bases")
      .select("base_key, name_en, name_ar, hint_en, hint_ar, price_per_kg")
      .order("sort_order", { ascending: true }),
    supabase
      .from("public_flavor_items")
      .select("flavor_key, name_en, name_ar, hint_en, hint_ar, category, add_on_per_kg, metrics")
      .order("sort_order", { ascending: true }),
  ]);

  const error = basesResult.error ?? itemsResult.error;
  if (error) throw new Error("Could not load the flavor catalog.");

  const bases = ((basesResult.data ?? []) as FlavorBaseRow[]).flatMap((row) => {
    const pricePerKg = finiteMoney(row.price_per_kg);
    if (!row.base_key || !row.name_en || !row.name_ar || pricePerKg === null) return [];
    return [{
      id: row.base_key,
      name: { en: row.name_en, ar: row.name_ar },
      pricePerKg,
      hint: { en: row.hint_en ?? "", ar: row.hint_ar ?? row.hint_en ?? "" },
    }];
  });

  const items = ((itemsResult.data ?? []) as FlavorItemRow[]).flatMap((row) => {
    const addOnPerKg = finiteMoney(row.add_on_per_kg);
    if (!row.flavor_key || !row.name_en || !row.name_ar || addOnPerKg === null) return [];
    if (!flavorCategories.has(row.category as FlavorCategory)) return [];
    return [{
      id: row.flavor_key,
      name: { en: row.name_en, ar: row.name_ar },
      hint: { en: row.hint_en ?? "", ar: row.hint_ar ?? row.hint_en ?? "" },
      addOnPerKg,
      category: row.category as FlavorCategory,
      metrics: mapMetrics(row.metrics, flavorMetricKeys) as FlavorMetrics,
    }];
  });

  return { bases, items };
}

"use client";

// Line Coffee V3 — Admin Espresso Bean data layer (Phase 8)
//
// Backend/data-layer foundation for the raw-bean catalog + kg-based FIFO
// inventory introduced by migration 20260701120000_phase8_9_espresso_flavor_
// builders. NOT wired into the existing (mock) Admin Espresso Manager page —
// that UI rebuild is deliberately deferred (see the Phase 8-9 change-log
// entry); this module exists so a future pass can wire real data without
// re-deriving the RPC contracts.
//
// Access model (admin-only): espresso_beans / espresso_bean_stock /
// espresso_bean_lots / espresso_bean_movements are admin-read-only via RLS.
// Writes go through SECURITY DEFINER RPCs (upsert_espresso_bean,
// adjust_espresso_bean_stock) — exactly like admin-purchasing.ts.

import { supabase } from "@/lib/supabase/client";

export type EspressoBeanFamily = "arabica" | "robusta";

export type AdminEspressoBean = {
  id: string;
  beanKey: string;
  nameEn: string;
  nameAr: string;
  family: EspressoBeanFamily;
  originEn: string | null;
  originAr: string | null;
  tasteHintEn: string | null;
  tasteHintAr: string | null;
  metrics: Record<string, number>;
  salePricePerKg: number;
  purchaseCostPerKg: number | null;
  active: boolean;
  sortOrder: number;
  stock: {
    availableKg: number;
    reservedKg: number;
    lowStockThresholdKg: number;
  } | null;
};

export type EspressoBeanUpsertInput = {
  id?: string;
  beanKey: string;
  nameEn: string;
  nameAr: string;
  family: EspressoBeanFamily;
  originEn?: string | null;
  originAr?: string | null;
  tasteHintEn?: string | null;
  tasteHintAr?: string | null;
  metrics?: Record<string, number>;
  salePricePerKg: number;
  purchaseCostPerKg?: number | null;
  active?: boolean;
  sortOrder?: number;
};

type BeanRow = {
  id: string;
  bean_key: string;
  name_en: string;
  name_ar: string;
  family: EspressoBeanFamily;
  origin_en: string | null;
  origin_ar: string | null;
  taste_hint_en: string | null;
  taste_hint_ar: string | null;
  metrics: Record<string, number> | null;
  sale_price_per_kg: number | string;
  purchase_cost_per_kg: number | string | null;
  active: boolean;
  sort_order: number;
};

type StockRow = {
  bean_id: string;
  available_kg: number | string;
  reserved_kg: number | string;
  low_stock_threshold_kg: number | string;
};

const BEAN_COLUMNS = `
  id, bean_key, name_en, name_ar, family, origin_en, origin_ar,
  taste_hint_en, taste_hint_ar, metrics, sale_price_per_kg,
  purchase_cost_per_kg, active, sort_order
`;

export class AdminEspressoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminEspressoError";
  }
}

function money(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readError(message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[admin-espresso] ${message}`);
  }
  return new AdminEspressoError("Could not load espresso beans. Please try again.");
}

/** Lists every bean (active + inactive) with its current stock aggregate. */
export async function listEspressoBeans(): Promise<AdminEspressoBean[]> {
  const [beansResult, stockResult] = await Promise.all([
    supabase.from("espresso_beans").select(BEAN_COLUMNS).order("sort_order", { ascending: true }),
    supabase.from("espresso_bean_stock").select("bean_id, available_kg, reserved_kg, low_stock_threshold_kg"),
  ]);

  if (beansResult.error) throw readError(beansResult.error.message);
  if (stockResult.error) throw readError(stockResult.error.message);

  const stockByBean = new Map<string, StockRow>();
  ((stockResult.data ?? []) as StockRow[]).forEach((row) => stockByBean.set(row.bean_id, row));

  return ((beansResult.data ?? []) as BeanRow[]).map((row) => {
    const stock = stockByBean.get(row.id);
    return {
      id: row.id,
      beanKey: row.bean_key,
      nameEn: row.name_en,
      nameAr: row.name_ar,
      family: row.family,
      originEn: row.origin_en,
      originAr: row.origin_ar,
      tasteHintEn: row.taste_hint_en,
      tasteHintAr: row.taste_hint_ar,
      metrics: row.metrics ?? {},
      salePricePerKg: money(row.sale_price_per_kg) ?? 0,
      purchaseCostPerKg: money(row.purchase_cost_per_kg),
      active: row.active,
      sortOrder: row.sort_order,
      stock: stock
        ? {
            availableKg: money(stock.available_kg) ?? 0,
            reservedKg: money(stock.reserved_kg) ?? 0,
            lowStockThresholdKg: money(stock.low_stock_threshold_kg) ?? 0,
          }
        : null,
    };
  });
}

/** Create or update a bean's catalog row (name/family/price/cost/metrics). */
export async function upsertEspressoBean(input: EspressoBeanUpsertInput): Promise<void> {
  const { data, error } = await supabase.rpc("upsert_espresso_bean", {
    p_payload: {
      id: input.id ?? null,
      bean_key: input.beanKey,
      name_en: input.nameEn,
      name_ar: input.nameAr,
      family: input.family,
      origin_en: input.originEn ?? null,
      origin_ar: input.originAr ?? null,
      taste_hint_en: input.tasteHintEn ?? null,
      taste_hint_ar: input.tasteHintAr ?? null,
      metrics: input.metrics ?? {},
      sale_price_per_kg: input.salePricePerKg,
      purchase_cost_per_kg: input.purchaseCostPerKg ?? null,
      active: input.active ?? true,
      sort_order: input.sortOrder ?? 0,
    },
  });

  if (error) throw new AdminEspressoError(error.message || "Could not save the espresso bean.");
  void data;
}

/**
 * Manually adjusts a bean's kg stock. Positive delta creates a new lot
 * (received = delta, cost = unitCost or the bean's purchase_cost_per_kg);
 * negative delta draws down open lots FIFO. Mirrors adjustPackagingStock.
 */
export async function adjustEspressoBeanStock(
  beanId: string,
  quantityDeltaKg: number,
  unitCost?: number,
  note?: string,
): Promise<{ availableKg: number; reservedKg: number }> {
  const { data, error } = await supabase.rpc("adjust_espresso_bean_stock", {
    p_bean_id: beanId,
    p_quantity_delta_kg: quantityDeltaKg,
    p_unit_cost: unitCost ?? null,
    p_note: note?.trim() || null,
  });

  if (error) throw new AdminEspressoError(error.message || "Could not adjust bean stock.");

  const result = data as { available_kg?: number; reserved_kg?: number } | null;
  return {
    availableKg: money(result?.available_kg) ?? 0,
    reservedKg: money(result?.reserved_kg) ?? 0,
  };
}

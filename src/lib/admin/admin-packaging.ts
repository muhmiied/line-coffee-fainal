"use client";

import { supabase } from "@/lib/supabase/client";
import type {
  PackagingItem,
  PackagingKind,
  PackagingMovement,
  PackagingMovementType,
  PackagingRequirement,
} from "@/lib/types/inventory";

type PackagingItemRow = {
  id: string;
  operational_key: string;
  name: string;
  sku: string | null;
  packaging_kind: PackagingKind;
  capacity_g: number | null;
  unit_type: "count";
  available_quantity: number;
  low_stock_threshold: number;
  active: boolean;
  cost_per_unit: number | string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

type PackagingMovementRow = {
  id: string;
  packaging_item_id: string;
  packaging_lot_id: string | null;
  order_id: string | null;
  movement_type: PackagingMovementType;
  quantity_delta: number;
  unit_cost: number | string | null;
  note: string | null;
  changed_by: string | null;
  created_at: string;
};

type PackagingRequirementRow = {
  id: string;
  order_id: string;
  packaging_item_id: string;
  operational_key: string;
  name_snapshot: string;
  required_quantity: number;
  deducted_quantity: number;
  shortage_quantity: number;
  cost_total: number | string;
  created_at: string;
  updated_at: string | null;
};

export type PackagingItemInput = {
  id?: string;
  operationalKey: string;
  name: string;
  sku?: string;
  packagingKind: PackagingKind;
  capacityG?: number;
  lowStockThreshold: number;
  active: boolean;
  costPerUnit?: number;
  notes?: string;
};

export type PackagingStockAdjustmentResult = {
  packaging_item_id: string;
  available_quantity: number;
  quantity_delta: number;
  cost_total: number;
};

export type PackagingShortageOrder = {
  orderId: string;
  orderCode: string;
  placedAt: string;
  snapshot: {
    has_shortage?: boolean;
    required_units?: number;
    deducted_units?: number;
    shortage_units?: number;
    lines?: unknown[];
  } | null;
};

export class AdminPackagingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminPackagingError";
  }
}

function money(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapItem(row: PackagingItemRow): PackagingItem {
  return {
    id: row.id,
    operationalKey: row.operational_key,
    name: row.name,
    sku: row.sku ?? undefined,
    packagingKind: row.packaging_kind,
    capacityG: row.capacity_g ?? undefined,
    unitType: row.unit_type,
    availableQuantity: row.available_quantity,
    lowStockThreshold: row.low_stock_threshold,
    active: row.active,
    costPerUnit: row.cost_per_unit == null ? undefined : money(row.cost_per_unit),
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export async function listPackagingItems(): Promise<PackagingItem[]> {
  const { data, error } = await supabase
    .from("packaging_items")
    .select("*")
    .order("active", { ascending: false })
    .order("capacity_g", { ascending: true, nullsFirst: false });

  if (error) throw new AdminPackagingError("Could not load packaging inventory.");
  return ((data ?? []) as PackagingItemRow[]).map(mapItem);
}

export async function savePackagingItem(
  input: PackagingItemInput,
): Promise<PackagingItem> {
  const { data, error } = await supabase.rpc("upsert_packaging_item", {
    p_payload: {
      id: input.id ?? null,
      operational_key: input.operationalKey,
      name: input.name,
      sku: input.sku ?? null,
      packaging_kind: input.packagingKind,
      capacity_g: input.capacityG ?? null,
      low_stock_threshold: input.lowStockThreshold,
      active: input.active,
      cost_per_unit: input.costPerUnit ?? null,
      notes: input.notes ?? null,
    },
  });

  if (error) throw new AdminPackagingError("Could not save the packaging item.");
  return mapItem(data as PackagingItemRow);
}

export async function adjustPackagingStock(
  packagingItemId: string,
  quantityDelta: number,
  unitCost?: number,
  note?: string,
): Promise<PackagingStockAdjustmentResult> {
  if (!Number.isInteger(quantityDelta) || quantityDelta === 0) {
    throw new AdminPackagingError("Enter a non-zero whole-unit adjustment.");
  }

  const { data, error } = await supabase.rpc("adjust_packaging_stock", {
    p_packaging_item_id: packagingItemId,
    p_quantity_delta: quantityDelta,
    p_unit_cost: unitCost ?? null,
    p_note: note?.trim() || null,
  });

  if (error) throw new AdminPackagingError("Could not adjust packaging stock.");
  return data as PackagingStockAdjustmentResult;
}

export async function listPackagingMovements(
  packagingItemId?: string,
): Promise<PackagingMovement[]> {
  let query = supabase
    .from("packaging_movements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (packagingItemId) query = query.eq("packaging_item_id", packagingItemId);
  const { data, error } = await query;
  if (error) throw new AdminPackagingError("Could not load packaging movements.");

  return ((data ?? []) as PackagingMovementRow[]).map((row) => ({
    id: row.id,
    packagingItemId: row.packaging_item_id,
    packagingLotId: row.packaging_lot_id ?? undefined,
    orderId: row.order_id ?? undefined,
    movementType: row.movement_type,
    quantityDelta: row.quantity_delta,
    unitCost: row.unit_cost == null ? undefined : money(row.unit_cost),
    note: row.note ?? undefined,
    changedBy: row.changed_by ?? undefined,
    createdAt: row.created_at,
  }));
}

export async function listOrderPackagingRequirements(
  orderId: string,
): Promise<PackagingRequirement[]> {
  const { data, error } = await supabase
    .from("order_packaging_lines")
    .select("*")
    .eq("order_id", orderId)
    .order("operational_key");

  if (error) {
    throw new AdminPackagingError("Could not load this order's packaging.");
  }
  return ((data ?? []) as PackagingRequirementRow[]).map((row) => ({
    id: row.id,
    orderId: row.order_id,
    packagingItemId: row.packaging_item_id,
    operationalKey: row.operational_key,
    name: row.name_snapshot,
    requiredQuantity: row.required_quantity,
    deductedQuantity: row.deducted_quantity,
    shortageQuantity: row.shortage_quantity,
    costTotal: money(row.cost_total),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  }));
}

export async function listPackagingShortageOrders(): Promise<
  PackagingShortageOrder[]
> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, code, placed_at, packaging_snapshot")
    .eq("packaging_shortage", true)
    .order("placed_at", { ascending: false })
    .limit(250);

  if (error) {
    throw new AdminPackagingError("Could not load packaging shortage alerts.");
  }

  return ((data ?? []) as Array<{
    id: string;
    code: string;
    placed_at: string;
    packaging_snapshot: PackagingShortageOrder["snapshot"];
  }>).map((row) => ({
    orderId: row.id,
    orderCode: row.code,
    placedAt: row.placed_at,
    snapshot: row.packaging_snapshot,
  }));
}

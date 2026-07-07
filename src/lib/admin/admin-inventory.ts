"use client";

import { supabase } from "@/lib/supabase/client";

export type InventoryStockStatus = "ok" | "low" | "out";

export type AdminInventoryProduct = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  categoryEn: string | null;
  categoryAr: string | null;
  availableKg: number;
  reservedKg: number;
  onHandKg: number;
  lowStockThresholdKg: number;
  status: InventoryStockStatus;
};

export type InventoryMovementType =
  | "initial_stock"
  | "reserve"
  | "release"
  | "deduct"
  | "adjustment"
  | "purchase_receive";

export type AdminInventoryMovement = {
  id: string;
  productId: string;
  productNameEn: string;
  productNameAr: string;
  orderId: string | null;
  lotId: string | null;
  movementType: InventoryMovementType;
  quantityKg: number;
  direction: "in" | "out" | "transfer";
  reason: string | null;
  createdAt: string;
};

export type AdminInventoryData = {
  products: AdminInventoryProduct[];
  movements: AdminInventoryMovement[];
};

type StockRow = {
  product_id: string;
  available_kg: number | string;
  reserved_kg: number | string;
  low_stock_threshold_kg: number | string;
};

type ProductRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  category_slug: string | null;
};

type CategoryRow = {
  slug: string;
  name_en: string;
  name_ar: string;
};

type MovementRow = {
  id: string;
  product_id: string;
  order_id: string | null;
  lot_id: string | null;
  movement_type: InventoryMovementType;
  quantity_kg: number | string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export class AdminInventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminInventoryError";
  }
}

function numeric(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readError(source: string, message: string): AdminInventoryError {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[admin-inventory:${source}] ${message}`);
  }
  return new AdminInventoryError("Could not load inventory. Please try again.");
}

function stockStatus(availableKg: number, thresholdKg: number): InventoryStockStatus {
  if (availableKg <= 0) return "out";
  if (availableKg <= thresholdKg) return "low";
  return "ok";
}

function movementDirection(row: MovementRow): AdminInventoryMovement["direction"] {
  const explicit = row.metadata?.direction;
  if (explicit === "in" || explicit === "out") return explicit;
  if (row.movement_type === "release" || row.movement_type === "purchase_receive" || row.movement_type === "initial_stock") {
    return "in";
  }
  if (row.movement_type === "deduct") return "out";
  return "transfer";
}

export async function getAdminInventory(): Promise<AdminInventoryData> {
  const [stockResult, productsResult, categoriesResult, movementsResult] = await Promise.all([
    supabase
      .from("inventory_stock")
      .select("product_id, available_kg, reserved_kg, low_stock_threshold_kg")
      .limit(2000),
    supabase
      .from("products")
      .select("id, slug, name_en, name_ar, category_slug")
      .limit(2000),
    supabase.from("categories").select("slug, name_en, name_ar").limit(500),
    supabase
      .from("inventory_movements")
      .select("id, product_id, order_id, lot_id, movement_type, quantity_kg, reason, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (stockResult.error) throw readError("stock", stockResult.error.message);
  if (productsResult.error) throw readError("products", productsResult.error.message);
  if (categoriesResult.error) throw readError("categories", categoriesResult.error.message);
  if (movementsResult.error) throw readError("movements", movementsResult.error.message);

  const productRows = (productsResult.data ?? []) as ProductRow[];
  const productById = new Map(productRows.map((product) => [product.id, product]));
  const categoryBySlug = new Map(
    ((categoriesResult.data ?? []) as CategoryRow[]).map((category) => [category.slug, category]),
  );

  const products = ((stockResult.data ?? []) as StockRow[])
    .map((row): AdminInventoryProduct | null => {
      const product = productById.get(row.product_id);
      if (!product) return null;
      const category = product.category_slug ? categoryBySlug.get(product.category_slug) : null;
      const availableKg = numeric(row.available_kg);
      const reservedKg = numeric(row.reserved_kg);
      const lowStockThresholdKg = numeric(row.low_stock_threshold_kg);
      return {
        id: product.id,
        slug: product.slug,
        nameEn: product.name_en,
        nameAr: product.name_ar,
        categoryEn: category?.name_en ?? null,
        categoryAr: category?.name_ar ?? null,
        availableKg,
        reservedKg,
        onHandKg: availableKg + reservedKg,
        lowStockThresholdKg,
        status: stockStatus(availableKg, lowStockThresholdKg),
      };
    })
    .filter((product): product is AdminInventoryProduct => product !== null)
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn));

  const movements = ((movementsResult.data ?? []) as MovementRow[]).map((row) => {
    const product = productById.get(row.product_id);
    return {
      id: row.id,
      productId: row.product_id,
      productNameEn: product?.name_en ?? "Product",
      productNameAr: product?.name_ar ?? "منتج",
      orderId: row.order_id,
      lotId: row.lot_id,
      movementType: row.movement_type,
      quantityKg: numeric(row.quantity_kg),
      direction: movementDirection(row),
      reason: row.reason,
      createdAt: row.created_at,
    };
  });

  return { products, movements };
}

export async function adjustFinishedProductStock(
  productId: string,
  quantityDeltaKg: number,
  unitCost?: number,
  note?: string,
): Promise<{ availableKg: number; reservedKg: number; onHandKg: number }> {
  const { data, error } = await supabase.rpc("adjust_finished_product_stock", {
    p_product_id: productId,
    p_quantity_delta_kg: quantityDeltaKg,
    p_unit_cost: unitCost ?? null,
    p_note: note?.trim() || null,
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[admin-inventory:adjust] ${error.message}`);
    }
    throw new AdminInventoryError(
      error.message.includes("exceeds available")
        ? "The adjustment exceeds available stock."
        : "Could not update finished-product stock.",
    );
  }

  const result = data as Record<string, unknown> | null;
  return {
    availableKg: numeric(result?.available_kg as number | string | undefined),
    reservedKg: numeric(result?.reserved_kg as number | string | undefined),
    onHandKg: numeric(result?.on_hand_kg as number | string | undefined),
  };
}

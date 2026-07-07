"use client";

import { supabase } from "@/lib/supabase/client";

export type InventoryStockStatus = "ok" | "low" | "out";

export type AdminInventoryProduct = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  imageUrl: string;
  categoryEn: string | null;
  categoryAr: string | null;
  availableKg: number;
  reservedKg: number;
  onHandKg: number;
  lowStockThresholdKg: number;
  status: InventoryStockStatus;
};

/** Real inventory_stock snapshot for a single product (used by the Product drawer). */
export type ProductInventorySnapshot = {
  availableKg: number;
  reservedKg: number;
  onHandKg: number;
  lowStockThresholdKg: number;
  status: InventoryStockStatus;
};

/** Compact low-stock alert used by the admin notification bell. */
export type AdminLowStockAlert = {
  count: number;
  names: string[];
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
  image_url: string | null;
  category_slug: string | null;
};

// Category-scoped fallback imagery, mirroring admin-catalog.ts so inventory cards
// show the same placeholder the public catalog uses when a product has no photo.
const FALLBACK_CATEGORY_IMAGES: Record<string, string> = {
  "turkish-blends": "/assets/categories/turkish.png",
  "espresso-blends": "/assets/categories/espresso.png",
  "easy-coffee": "/assets/products/espresso-pouch.png",
  "coffee-mix": "/assets/products/classic-pouch.png",
  cappuccino: "/assets/products/cappuccino-sachets.png",
  "hot-chocolate": "/assets/products/cappuccino-sachets.png",
  "flavor-coffee": "/assets/products/flavor-pouch.png",
};

const DEFAULT_PRODUCT_IMAGE = "/assets/products/classic-pouch.png";

function resolveProductImage(product: ProductRow): string {
  if (product.image_url) return product.image_url;
  if (product.category_slug && FALLBACK_CATEGORY_IMAGES[product.category_slug]) {
    return FALLBACK_CATEGORY_IMAGES[product.category_slug];
  }
  return DEFAULT_PRODUCT_IMAGE;
}

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
      .select("id, slug, name_en, name_ar, image_url, category_slug")
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
        imageUrl: resolveProductImage(product),
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

/**
 * Reads the real inventory_stock snapshot for a single product. Returns null when
 * the product has no stock row yet (honest "not tracked yet" state). Used by the
 * Product drawer Inventory tab so it shows real stock instead of a hardcoded 0.
 */
export async function getProductInventory(
  productId: string,
): Promise<ProductInventorySnapshot | null> {
  const { data, error } = await supabase
    .from("inventory_stock")
    .select("available_kg, reserved_kg, low_stock_threshold_kg")
    .eq("product_id", productId)
    .maybeSingle();

  if (error) throw readError("product-stock", error.message);
  if (!data) return null;

  const row = data as StockRow;
  const availableKg = numeric(row.available_kg);
  const reservedKg = numeric(row.reserved_kg);
  const lowStockThresholdKg = numeric(row.low_stock_threshold_kg);
  return {
    availableKg,
    reservedKg,
    onHandKg: availableKg + reservedKg,
    lowStockThresholdKg,
    status: stockStatus(availableKg, lowStockThresholdKg),
  };
}

/**
 * Persists a product's low-stock threshold (kg) to inventory_stock. RLS
 * (inventory_stock_admin_all, is_admin()) is the write gate — no service role.
 * Upsert so the threshold saves whether or not a stock row exists yet; on insert
 * the available/reserved columns default to 0 (a real "tracked, no stock" row,
 * never fake stock). Quantity is never written here — stock movements own that.
 */
export async function updateProductLowStockThreshold(
  productId: string,
  thresholdKg: number,
): Promise<void> {
  if (!productId) throw new AdminInventoryError("Missing product for the threshold update.");
  if (!Number.isFinite(thresholdKg) || thresholdKg < 0 || thresholdKg > 100000) {
    throw new AdminInventoryError("Enter a valid low-stock threshold in kg.");
  }
  const rounded = Math.round(thresholdKg * 1000) / 1000;

  const { error } = await supabase
    .from("inventory_stock")
    .upsert(
      { product_id: productId, low_stock_threshold_kg: rounded },
      { onConflict: "product_id" },
    );

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[admin-inventory:threshold] ${error.message}`);
    }
    throw new AdminInventoryError("Could not save the low-stock threshold.");
  }
}

/**
 * Compact low-stock summary for the admin notification bell. Uses the exact same
 * rule as the dashboard (available_kg <= low_stock_threshold_kg → low/out), so
 * every surface agrees. Reads inventory_stock + products only; never fabricated.
 */
export async function getAdminLowStockAlert(): Promise<AdminLowStockAlert> {
  const [stockResult, productsResult] = await Promise.all([
    supabase
      .from("inventory_stock")
      .select("product_id, available_kg, reserved_kg, low_stock_threshold_kg")
      .limit(2000),
    supabase.from("products").select("id, name_en").limit(2000),
  ]);

  if (stockResult.error) throw readError("low-stock", stockResult.error.message);
  if (productsResult.error) throw readError("low-stock-products", productsResult.error.message);

  const nameById = new Map(
    ((productsResult.data ?? []) as { id: string; name_en: string }[]).map((p) => [p.id, p.name_en]),
  );

  const low = ((stockResult.data ?? []) as StockRow[])
    .map((row) => ({
      name: nameById.get(row.product_id) ?? "Product",
      availableKg: numeric(row.available_kg),
      thresholdKg: numeric(row.low_stock_threshold_kg),
    }))
    .filter((row) => row.availableKg <= row.thresholdKg)
    .sort((a, b) => a.availableKg - b.availableKg);

  return { count: low.length, names: low.slice(0, 5).map((row) => row.name) };
}

// Line Coffee V3 - Launch-Core Inventory Contract
// inventory.ts - canonical inventory + supplier + stock movement contract.
//
// Phase 3C-1. Type-only. Additive. Not yet imported anywhere.
//
// This contract replaces display-shaped inventory strings with numeric,
// auditable stock balances. Future stock reservation, deduction, release,
// restock, supplier payable, and order-status side effects should write
// `StockMovement` rows instead of mutating decorative UI-only values.

import type {
  ID,
  ISODate,
  ISODateTime,
  ImageAssetRef,
  LocalizedValue,
  Money,
  PackageSize,
} from "@/lib/types/common";
import type { StockState } from "@/lib/types/product";

// What kind of inventory unit this row represents.
// Finished products are tracked by package size; espresso beans use KG; packaging
// and other materials use operational units defined by the item itself.
export type InventoryItemType =
  | "finished_product"
  | "espresso_bean"
  | "flavor_material"
  | "packaging"
  | "other";

// Operational lifecycle for an inventory item.
export type InventoryItemStatus = "active" | "inactive" | "archived";

// Canonical stock row. Current available quantity is explicit for fast reads,
// but it must always equal quantityOnHand - quantityReserved when persisted.
// Supabase mapping: `inventory_items` table.
export interface InventoryItem {
  id: ID;
  type: InventoryItemType;
  status: InventoryItemStatus;
  name: LocalizedValue;
  sku?: string;
  productId?: ID;
  variantId?: ID;
  productSlug?: string;
  size?: PackageSize;
  supplierId?: ID;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderPoint: number;
  reorderQuantity?: number;
  unitCost: Money;
  stockState?: StockState;
  location?: string;
  lastRestockedAt?: ISODateTime;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// Numeric movement kinds. Sign convention:
// - quantityDelta > 0 increases on-hand stock.
// - quantityDelta < 0 decreases on-hand stock.
// - reservedDelta adjusts reserved stock without pretending it is physical stock.
export type MovementType =
  | "purchase_restock"
  | "order_reserved"
  | "order_reservation_released"
  | "order_deducted"
  | "customer_return_restock"
  | "supplier_return"
  | "manual_adjustment"
  | "damaged"
  | "lost"
  | "opening_balance";

// Business reason for the movement. Kept separate from movementType so reports
// can group by why stock changed even if the mechanical movement differs.
export type MovementReason =
  | "purchase"
  | "order_created"
  | "order_shipped"
  | "order_cancelled"
  | "order_returned"
  | "manual_correction"
  | "damage"
  | "loss"
  | "opening_stock"
  | "supplier_return";

// Immutable inventory ledger row. This is the audit source for reserve, release,
// deduct, restock, returns, losses, and manual corrections.
// Supabase mapping: `stock_movements` table.
export interface StockMovement {
  id: ID;
  inventoryItemId: ID;
  movementType: MovementType;
  reason: MovementReason;
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  reservedDelta?: number;
  reservedBefore?: number;
  reservedAfter?: number;
  unitCost?: Money;
  totalCostImpact?: Money;
  productId?: ID;
  variantId?: ID;
  orderId?: ID;
  orderItemId?: ID;
  supplierId?: ID;
  purchaseId?: ID;
  returnId?: ID;
  note?: string;
  actorId?: ID;
  actorName?: string;
  occurredAt: ISODateTime;
}

// Lifecycle of a received stock lot. "open" still has remaining qty; "closed"
// is fully consumed (FIFO draws it to zero in Phase 5+).
export type InventoryLotStatus = "open" | "closed";

// A received finished-product stock lot — the FIFO foundation (Phase 4). Keyed
// by productId (matching the live `inventory_stock` per-product model rather than
// a generic inventory item). `receivedQtyKg` is frozen at receipt; `remainingQtyKg`
// is what FIFO draws down LATER — in Phase 4 it is created equal to
// `receivedQtyKg` and is never decremented (nothing consumes lots yet). `unitCost`
// is the per-kg cost basis future COGS reads.
// Supabase mapping: `inventory_lots` table (created in migration
// 20260630120000_phase4_purchasing_suppliers_expenses_lots).
export interface InventoryLot {
  id: ID;
  productId: ID;
  purchaseId?: ID;
  purchaseItemId?: ID;
  supplierId?: ID;
  receivedQtyKg: number;
  remainingQtyKg: number;
  // Per-kg cost basis for this lot (private — admin/accounting only).
  unitCost: Money;
  receivedDate: ISODate;
  status: InventoryLotStatus;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// Supplier lifecycle. "blocked" preserves history while preventing new buys.
export type SupplierStatus = "active" | "inactive" | "blocked" | "archived";

// Supplier master record. Purchases later increase inventory value and supplier
// payable; this contract only stores supplier identity and balances.
// Supabase mapping: `suppliers` table.
export interface Supplier {
  id: ID;
  name: string;
  contactName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  status: SupplierStatus;
  categories: string[];
  paymentTerms?: string;
  openingBalance?: Money;
  currentBalance?: Money;
  notes?: string;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// Espresso bean taste-metric axes used by the Make-Your-Espresso builder and
// Espresso Manager (0–5 scale per axis). Phase 3E addition.
export type EspressoBeanMetricKey =
  | "body"
  | "crema"
  | "acidity"
  | "chocolate"
  | "sweetness"
  | "strength";

// A bean's taste profile. Partial so beans can omit axes they don't rate.
export type EspressoBeanMetrics = Partial<Record<EspressoBeanMetricKey, number>>;

// Dedicated KG-based bean stock contract for the espresso workflow. It can link
// to an InventoryItem row, but stays readable for Espresso Manager and builder
// stock planning.
//
// Phase 3E: extended with optional catalog/builder fields (slug, description,
// taste metrics, public visibility, sort order, image) so this one shape can
// serve BOTH the Espresso Manager stock view AND the public Make-Your-Espresso
// builder catalog — unifying the two current bean sources (`espressoBeans.ts`
// catalog + inventory `ESPRESSO_BEANS` stock) into a single future
// `espresso_beans` table. All additions are optional; no existing field changed.
// Supabase mapping: `espresso_beans` table (catalog + stock).
export interface EspressoBeanStock {
  id: ID;
  inventoryItemId?: ID;
  name: LocalizedValue;
  origin?: LocalizedValue;
  beanType: "arabica" | "robusta" | "mixed";
  roastLevel?: "light" | "medium" | "medium_dark" | "dark";
  quantityKg: number;
  reservedKg?: number;
  unitCostPerKg: Money;
  supplierId?: ID;
  status: InventoryItemStatus;
  updatedAt?: ISODateTime;
  // --- Phase 3E catalog/builder fields (optional, additive) ---
  slug?: string;
  description?: LocalizedValue;
  metrics?: EspressoBeanMetrics;
  visible?: boolean;
  sortOrder?: number;
  image?: ImageAssetRef;
}

// Compact stock view for order/admin reads.
export interface InventorySnapshot {
  inventoryItemId: ID;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  stockState?: StockState;
  capturedAt: ISODateTime;
}

// Simple future server-action inputs. These are type-only convenience contracts;
// they do not imply backend implementation in this phase.
export interface StockReservationInput {
  inventoryItemId: ID;
  quantity: number;
  orderId?: ID;
  orderItemId?: ID;
  productId?: ID;
  variantId?: ID;
  actorId?: ID;
  actorName?: string;
  note?: string;
  occurredAt?: ISODateTime;
}

export interface StockDeductionInput {
  inventoryItemId: ID;
  quantity: number;
  orderId?: ID;
  orderItemId?: ID;
  productId?: ID;
  variantId?: ID;
  unitCost?: Money;
  actorId?: ID;
  actorName?: string;
  note?: string;
  occurredAt?: ISODateTime;
}

export interface StockRestockInput {
  inventoryItemId: ID;
  quantity: number;
  supplierId?: ID;
  purchaseId?: ID;
  returnId?: ID;
  orderId?: ID;
  orderItemId?: ID;
  unitCost?: Money;
  isSellableReturn?: boolean;
  actorId?: ID;
  actorName?: string;
  note?: string;
  occurredAt?: ISODateTime;
}

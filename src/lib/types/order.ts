// Line Coffee V3 — Launch-Core Data Contracts
// order.ts — canonical order + order item + order lifecycle contract.
//
// Type-only. Additive.
// Status (2026-06-29, Phase 3 audit): partially LIVE — the lifecycle/payment
// UNION types (OrderStatus, OrderType, OrderChannel, PaymentMethod,
// PaymentStatus) are imported by `src/lib/admin/admin-orders.ts`. The Order /
// OrderItem interfaces and `ORDER_STATUS_EFFECTS` are a documented rule source:
// the live status→stock/revenue rules currently run in the SQL RPCs
// (`update_admin_order_status`) and `ALLOWED_ADMIN_ORDER_TRANSITIONS`, not from
// this map directly. See `src/lib/types/README.md`.
//
// This contract is the launch keystone: one canonical `Order` / `OrderItem` /
// `OrderStatus` vocabulary plus the operating-model effects for stock, revenue,
// COGS, and customer LTV. Live checkout/account modules still use RPC-specific
// boundary shapes; the admin order layer already imports the unions below.

import type {
  ID,
  ISODateTime,
  Money,
  LocalizedValue,
  PackageSize,
} from "@/lib/types/common";
import type { CustomerSnapshot, AddressSnapshot } from "@/lib/types/customer";

// Canonical order lifecycle (lowercase). Maps the legacy enums:
//   admin "New" -> pending, "Preparing" -> preparing, etc.
//   customer "processing"/"roasting" -> pending/preparing.
// Supabase mapping: `orders.status`.
export type OrderStatus =
  | "pending"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

// How the customer pays. "unknown" covers legacy/imported orders with no method.
// Supabase mapping: `orders.payment_method`.
export type PaymentMethod =
  | "cash_on_delivery"
  | "vodafone_cash"
  | "instapay"
  | "bank_transfer"
  | "card"
  | "wallet"
  | "unknown";

// Payment settlement state, independent of fulfilment status.
// Supabase mapping: `orders.payment_status`.
export type PaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "refunded"
  | "failed"
  | "pending";

// Composition of an order: standard catalog items, a custom builder order, or a
// mix of both.
export type OrderType =
  | "standard"
  | "custom_espresso"
  | "custom_flavor"
  | "mixed";

// Where the order originated.
export type OrderChannel = "website" | "admin" | "whatsapp" | "manual";

// The operating-model effects a given status has on the rest of the system.
// This is the single place the lifecycle business rules live, so Inventory,
// Accounting, and Analytics never re-derive them inconsistently.
export interface OrderEffect {
  // Soft hold on stock so it cannot be oversold (no physical deduction yet).
  reservesStock: boolean;
  // Physical removal from inventory because goods left operations.
  deductsStock: boolean;
  // Recognize sale revenue (and gross profit) in accounting.
  recognizesRevenue: boolean;
  // Release a previously-held reservation back to available stock.
  releasesReservation: boolean;
  // Reverse previously-recognized revenue.
  reversesRevenue: boolean;
  // Put goods back into sellable stock (only when returned condition is sellable).
  restocksIfSellable: boolean;
  // Counts toward the customer's lifetime value / order history metrics.
  affectsCustomerLtv: boolean;
  // Affects cost-of-goods-sold recognition in accounting.
  affectsCogs: boolean;
}

// Canonical lifecycle effect map. Encodes the required accounting/operating
// decisions (Locked Decision 6: reserve at Place Order, deduct at Delivered):
//   pending   -> reserve stock only
//   preparing -> still reserved; no deduction, no revenue
//   shipped   -> still reserved; parcel is out for delivery, no deduction yet
//   delivered -> deduct stock + recognize revenue + COGS + gross profit + LTV
//   cancelled -> release reservation
//   returned  -> reverse revenue, restock if sellable (affects COGS + LTV)
// Supabase mapping: this stays in app code as the rule source; SQL functions
// and server actions consult it when transitioning `orders.status`. The
// Phase 1 migration (20260629120000) moves the kg-model deduction from
// `shipped` to `delivered` to match this contract; Phase 5 (20260630130000)
// re-implements reserve/deduct/release at FIFO lot level and snapshots COGS at
// `delivered` (order_items.line_cogs + orders.cogs_total).
export const ORDER_STATUS_EFFECTS: Record<OrderStatus, OrderEffect> = {
  pending: {
    reservesStock: true,
    deductsStock: false,
    recognizesRevenue: false,
    releasesReservation: false,
    reversesRevenue: false,
    restocksIfSellable: false,
    affectsCustomerLtv: false,
    affectsCogs: false,
  },
  preparing: {
    reservesStock: true,
    deductsStock: false,
    recognizesRevenue: false,
    releasesReservation: false,
    reversesRevenue: false,
    restocksIfSellable: false,
    affectsCustomerLtv: false,
    affectsCogs: false,
  },
  shipped: {
    reservesStock: true,
    deductsStock: false,
    recognizesRevenue: false,
    releasesReservation: false,
    reversesRevenue: false,
    restocksIfSellable: false,
    affectsCustomerLtv: false,
    affectsCogs: false,
  },
  delivered: {
    reservesStock: false,
    deductsStock: true,
    recognizesRevenue: true,
    releasesReservation: false,
    reversesRevenue: false,
    restocksIfSellable: false,
    affectsCustomerLtv: true,
    affectsCogs: true,
  },
  cancelled: {
    reservesStock: false,
    deductsStock: false,
    recognizesRevenue: false,
    releasesReservation: true,
    reversesRevenue: false,
    restocksIfSellable: false,
    affectsCustomerLtv: false,
    affectsCogs: false,
  },
  returned: {
    reservesStock: false,
    deductsStock: false,
    recognizesRevenue: false,
    releasesReservation: false,
    reversesRevenue: true,
    restocksIfSellable: true,
    affectsCustomerLtv: true,
    affectsCogs: true,
  },
};

// One entry in the order's audit trail of status transitions.
// Supabase mapping: `order_status_events` table.
export interface OrderStatusEvent {
  id: ID;
  orderId: ID;
  status: OrderStatus;
  note?: string;
  // Admin/system actor who made the change (user id or display name).
  changedBy?: string;
  changedAt: ISODateTime;
}

// What kind of line an order item represents. Builder lines carry `customData`;
// "shipping" and "discount_adjustment" are synthetic lines for totals clarity.
export type OrderItemKind =
  | "product"
  | "custom_espresso"
  | "custom_flavor"
  | "shipping"
  | "discount_adjustment";

// Snapshot of a Make-Your-Espresso build at purchase time.
export interface EspressoOrderData {
  profileName?: LocalizedValue;
  beans?: Array<{ beanId?: ID; name: LocalizedValue; percentage: number }>;
  grind?: string;
  metrics?: Partial<Record<"body" | "acidity" | "crema" | "strength", number>>;
}

// Snapshot of a Make-Your-Flavor build at purchase time.
export interface FlavorOrderData {
  base?: LocalizedValue;
  flavorGroup?: LocalizedValue;
  flavor?: LocalizedValue;
  sweetness?: string;
}

// A single line on an order. Product/variant fields and prices are SNAPSHOTS at
// purchase time so later catalog edits never rewrite order history.
// Supabase mapping: `order_items` table.
export interface OrderItem {
  id: ID;
  orderId: ID;
  kind: OrderItemKind;
  productId?: ID;
  productSlug?: string;
  variantId?: ID;
  variantSize?: PackageSize;
  name: LocalizedValue;
  detail?: LocalizedValue;
  sku?: string;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
  // Cost of goods for this line — internal, used for COGS/profit on delivery.
  lineCogs?: Money;
  // How many units of this line were returned (for partial returns).
  returnedQuantity?: number;
  // Builder snapshot when kind is custom_espresso / custom_flavor.
  customData?: EspressoOrderData | FlavorOrderData;
}

// The canonical order. One shape feeding the website order-success page, Admin
// Orders, Customer Account Orders, Accounting, Analytics, and Inventory effects.
// Supabase mapping: `orders` table (+ `order_items`, + `order_status_events`).
export interface Order {
  id: ID;
  // Human-facing order code, e.g. "LC-XXXXXX".
  code: string;
  // Link to a customer record; null/absent for pure guest orders.
  customerId?: ID | null;
  // Frozen identity + address at purchase time (so edits don't rewrite history).
  customerSnapshot: CustomerSnapshot;
  addressSnapshot: AddressSnapshot;
  status: OrderStatus;
  type: OrderType;
  channel: OrderChannel;
  items: OrderItem[];
  subtotal: Money;
  discountTotal: Money;
  deliveryFee: Money;
  total: Money;
  // PRIVATE order-level COGS snapshot (Phase 5). Set at `delivered` from consumed
  // FIFO lot costs (Σ order item lineCogs). Discounts never reduce it. Admin-only.
  // Supabase mapping: `orders.cogs_total` (migration 20260630130000).
  cogsTotal?: Money | null;
  promoCode?: string;
  promoSnapshot?: {
    code: string;
    discountType: "fixed_amount" | "percentage";
    value: number;
    discountTotal: Money;
  };
  pricingSnapshot?: CheckoutPricingSnapshot;
  packagingShortage?: boolean;
  packagingSnapshot?: {
    hasShortage: boolean;
    requiredUnits: number;
    deductedUnits: number;
    shortageUnits: number;
  };
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  statusHistory: OrderStatusEvent[];
  placedAt: ISODateTime;
  updatedAt?: ISODateTime;
  deliveredAt?: ISODateTime;
  cancelledAt?: ISODateTime;
  returnedAt?: ISODateTime;
  adminNote?: string;
  customerNote?: string;
}

// Compact order shape for tables, lists, and KPI cards.
export interface OrderSummary {
  id: ID;
  code: string;
  customerName: string;
  status: OrderStatus;
  total: Money;
  itemCount: number;
  placedAt: ISODateTime;
  paymentStatus: PaymentStatus;
}

// Money breakdown for an order — used by checkout calculation and backend.
// `estimatedCogs`/`grossProfit` are derived (recognized on delivery).
export interface OrderTotals {
  subtotal: Money;
  discountTotal: Money;
  deliveryFee: Money;
  total: Money;
  estimatedCogs?: Money;
  grossProfit?: Money;
}

// Frozen Phase-7 pricing result. Product subtotal and promo discount are kept
// separate from delivery so a promo can never reduce delivery revenue.
export interface CheckoutPricingSnapshot {
  subtotal: Money;
  discountTotal: Money;
  deliveryFee: Money;
  total: Money;
  currency: "EGP";
}

// Customer-facing bilingual status labels (public account/order tracking).
export const CUSTOMER_STATUS_LABELS: Record<OrderStatus, LocalizedValue> = {
  pending: { en: "Pending", ar: "قيد الانتظار" },
  preparing: { en: "Preparing", ar: "قيد التحضير" },
  shipped: { en: "Shipped", ar: "تم الشحن" },
  delivered: { en: "Delivered", ar: "تم التوصيل" },
  cancelled: { en: "Cancelled", ar: "ملغي" },
  returned: { en: "Returned", ar: "مرتجع" },
};

// Admin dashboard status labels (admin UI is English-only).
export const ADMIN_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

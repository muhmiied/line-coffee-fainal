// Line Coffee V3 — Launch-Core Accounting Contract
// accounting.ts — canonical purchases, operating expenses, supplier payments,
// and the DERIVED revenue / COGS / profit / payable rollups.
//
// Phase 3C-2. Type-only. Additive. Imported by nothing yet.
//
// Design rule (the whole point of this file): accounting is a DERIVATION LAYER,
// never a parallel order set. The current `ACCOUNTING_ORDERS` mock is a separate
// disconnected transaction set (System Audit §I-[3], §C); this contract removes
// the need for it. Revenue and COGS are derived from the canonical `orders` /
// `order_items` (see order.ts), purchases/expenses/payments are first-class
// accounting records, and inventory value comes from stock movements. There is
// deliberately NO `AccountingOrder` type that competes with the canonical
// `Order`.
//
// The money chain this contract encodes (Operating Model §12):
//   Delivered orders            -> Sales revenue (recognized only at "delivered")
//   - Order-item COGS           -> Gross profit
//   - Discounts/promos           (on those orders)
//   (delivery fee = pass-through, not product profit)
//   Gross profit
//   - Operating expenses        -> Net profit
//   Purchases                   -> Inventory value + Supplier payables (NOT OpEx)
//   Supplier payments           -> reduce payables (overpay -> supplier credit)
//
// Revenue-recognition / COGS / payable decisions preserved here mirror
// ORDER_STATUS_EFFECTS in order.ts:
//   - delivered  -> recognizes revenue + COGS (RevenueLine / CogsLine)
//   - cancelled  -> releases reservation, no revenue (no RevenueLine emitted)
//   - returned   -> reverses revenue, may reverse COGS / restock per sellable
//                   rules (ReturnAccountingImpact)

import type {
  ID,
  ISODate,
  ISODateTime,
  Money,
  LocalizedValue,
} from "@/lib/types/common";

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

// An accounting period (e.g. a calendar month) that a rollup is computed for.
// Periods can be "closed" so historical figures stop changing.
// Supabase mapping: `accounting_periods` table.
export interface AccountingPeriod {
  id: ID;
  // Human label, e.g. "June 2026".
  label: string;
  startDate: ISODate;
  endDate: ISODate;
  // When the period was locked; absent while still open.
  closedAt?: ISODateTime;
  status: "open" | "closed";
}

// ---------------------------------------------------------------------------
// Payment method (shared by purchases, supplier payments, and expenses)
// ---------------------------------------------------------------------------

// How money moved for a purchase, supplier payment, or operating expense.
// Kept separate from the customer-facing order `PaymentMethod` (order.ts)
// because the counterparties and channels differ (suppliers/vendors, not COD).
// Supabase mapping: `*.payment_method`.
export type AccountingPaymentMethod =
  | "cash"
  | "vodafone_cash"
  | "instapay"
  | "bank_transfer"
  | "card"
  | "other";

// ---------------------------------------------------------------------------
// Purchases (buying stock — NOT an operating expense)
// ---------------------------------------------------------------------------

// What was bought. Mirrors the inventory item taxonomy so a purchase can later
// increase the matching inventory value via stock movements.
export type PurchaseType =
  | "finished_product"
  | "espresso_bean"
  | "flavor_material"
  | "packaging"
  | "other";

// Lifecycle of a purchase record. Payment progress drives partially_paid/paid.
export type PurchaseStatus =
  | "draft"
  | "recorded"
  | "partially_paid"
  | "paid"
  | "cancelled";

// A purchase from a supplier. Purchases create inventory value and a supplier
// PAYABLE; they are explicitly NOT operating expenses and never reduce gross
// profit. `unpaidAmount` is the live balance owed for this purchase
// (totalAmount - paidAmount) and feeds SupplierPayable derivation.
// Supabase mapping: `purchases` table.
export interface Purchase {
  id: ID;
  supplierId: ID;
  // Frozen supplier name at purchase time so history survives supplier renames.
  supplierNameSnapshot: string;
  purchaseType: PurchaseType;
  // Optional invoice / reference number (made optional per current UX).
  reference?: string;
  description: string;
  // Human-readable quantity, e.g. "12 × 250g" or "25 kg".
  quantityLabel?: string;
  // Numeric quantity when a single clean number applies.
  quantity?: number;
  unitCost?: Money;
  subtotal: Money;
  taxAmount?: Money;
  shippingCost?: Money;
  totalAmount: Money;
  paidAmount: Money;
  // Live balance owed for this purchase: totalAmount - paidAmount.
  unpaidAmount: Money;
  status: PurchaseStatus;
  paymentMethod?: AccountingPaymentMethod;
  purchaseDate: ISODate;
  createdAt: ISODateTime;
  updatedAt?: ISODateTime;
  note?: string;
}

// One line of a purchase: a finished product bought in KG at a per-kg unit cost.
// Phase 4 addition — the canonical `Purchase` above is header-only; real
// purchases carry line items (each line becomes its own inventory lot on
// receive, so distinct cost lots survive for FIFO later). `lineCost` =
// round(quantityKg * unitCost, 2), computed server-side.
// Supabase mapping: `purchase_items` table (migration 20260630120000).
export interface PurchaseItem {
  id: ID;
  purchaseId: ID;
  productId: ID;
  // Frozen product name at purchase time so a later rename doesn't rewrite history.
  productName?: string;
  quantityKg: number;
  // Per-kg cost (private — admin/accounting only).
  unitCost: Money;
  lineCost: Money;
  createdAt?: ISODateTime;
}

// ---------------------------------------------------------------------------
// Supplier payments (reduce payable; overpayment becomes credit/advance)
// ---------------------------------------------------------------------------

// A payment made TO a supplier. Reduces that supplier's payable balance. If
// total payments exceed total purchased, the excess becomes supplier
// credit/advance (see SupplierPayable.creditBalance). May target a specific
// purchase (purchaseId) or be a supplier-level payment.
// Supabase mapping: `supplier_payments` table.
export interface SupplierPayment {
  id: ID;
  supplierId: ID;
  // Optional allocation to a specific purchase; absent = supplier-level payment.
  purchaseId?: ID;
  amount: Money;
  method: AccountingPaymentMethod;
  reference?: string;
  paidAt: ISODateTime;
  note?: string;
}

// ---------------------------------------------------------------------------
// Operating expenses (reduce net profit — separate from purchases)
// ---------------------------------------------------------------------------

// Operating expense categories (OpEx). Distinct from PurchaseType: these are
// running business costs, not inventory buys.
export type OperatingExpenseCategory =
  | "rent"
  | "utilities"
  | "salaries"
  | "marketing"
  | "delivery"
  | "packaging"
  | "maintenance"
  | "software"
  | "taxes_fees"
  | "other";

// A business operating expense. Reduces NET profit (after gross profit), and is
// never mixed with purchases or COGS.
// Supabase mapping: `operating_expenses` table.
export interface OperatingExpense {
  id: ID;
  category: OperatingExpenseCategory;
  vendor?: string;
  description: string;
  amount: Money;
  method: AccountingPaymentMethod;
  expenseDate: ISODate;
  createdAt: ISODateTime;
  note?: string;
}

// ---------------------------------------------------------------------------
// Supplier payable (DERIVED — never hand-stored)
// ---------------------------------------------------------------------------

// A supplier's running balance. DERIVED from purchases and supplier payments,
// not entered manually. Exactly one of payableBalance / creditBalance is
// non-zero at a time: we owe them (payable) or they owe us / we prepaid
// (credit/advance when payments exceeded purchases).
// Supabase mapping: SQL view over `purchases` + `supplier_payments`.
export interface SupplierPayable {
  supplierId: ID;
  supplierName: string;
  totalPurchased: Money;
  totalPaid: Money;
  // Amount still owed to the supplier (>= 0). 0 when fully paid or in credit.
  payableBalance: Money;
  // Overpayment / advance held with the supplier (>= 0). 0 when money is owed.
  creditBalance: Money;
  lastPurchaseAt?: ISODateTime;
  lastPaymentAt?: ISODateTime;
}

// ---------------------------------------------------------------------------
// Revenue & COGS lines (DERIVED from delivered orders / stock movements)
// ---------------------------------------------------------------------------

// One recognized revenue line. DERIVED from a DELIVERED order item only
// (recognizesRevenue in ORDER_STATUS_EFFECTS). `netRevenue` is the line revenue
// after its share of any order-level discount. Delivery fee is pass-through and
// is NOT represented as a RevenueLine (see AccountingRollup.shippingRevenue).
// Supabase mapping: derived from `orders` (delivered) + `order_items`.
export interface RevenueLine {
  orderId: ID;
  orderCode: string;
  orderItemId: ID;
  productId?: ID;
  productSlug?: string;
  // Bilingual line label snapshot for reporting.
  description: LocalizedValue;
  quantity: number;
  // Gross line revenue before discount allocation (unitPrice × quantity).
  revenue: Money;
  // This line's allocated share of order-level discount.
  discountShare?: Money;
  // revenue - discountShare.
  netRevenue: Money;
  // When revenue was recognized (the order's delivered timestamp).
  recognizedAt: ISODateTime;
}

// One cost-of-goods-sold line. DERIVED from a delivered order item, costed from
// the order-item cost snapshot (order.ts OrderItem.lineCogs) and/or the linked
// stock movement. Recognized at the same time as the matching RevenueLine.
// Supabase mapping: derived from `order_items` + `stock_movements`.
export interface CogsLine {
  orderId: ID;
  orderItemId: ID;
  // Optional link to the deduction movement that backs this cost.
  stockMovementId?: ID;
  productId?: ID;
  productSlug?: string;
  quantity: number;
  unitCost: Money;
  // unitCost × quantity.
  cogs: Money;
  recognizedAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Returns (reverse revenue; reverse COGS / restock per sellable rules)
// ---------------------------------------------------------------------------

// The accounting impact of a return. A returned order reverses recognized
// revenue; COGS is reversed and stock value restored ONLY when the returned
// goods are sellable (mirrors ORDER_STATUS_EFFECTS.returned +
// restocksIfSellable). Amounts are positive magnitudes of the reversal.
// Supabase mapping: derived from returned `orders` / `order_items` + return rows.
export interface ReturnAccountingImpact {
  orderId: ID;
  // Absent for a full-order return; present for a specific line.
  orderItemId?: ID;
  returnedQuantity?: number;
  // Revenue removed from recognized sales (>= 0).
  revenueReversal: Money;
  // COGS removed; only when sellable goods re-enter stock.
  cogsReversal?: Money;
  // Inventory value restored to sellable stock.
  restockedValue?: Money;
  // True when returned goods are sellable (sealed) and thus restocked.
  isSellable: boolean;
  processedAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Rollups & profitability (DERIVED reports)
// ---------------------------------------------------------------------------

// The headline P&L rollup for a period. Every figure is DERIVED:
//   grossProfit = netRevenue - cogs
//   grossMarginPct = grossProfit / netRevenue × 100
//   netProfit = grossProfit - operatingExpenses
// shippingRevenue is tracked separately (pass-through, not product profit).
// Supabase mapping: SQL view/function over orders/order_items/purchases/expenses.
export interface AccountingRollup {
  period: AccountingPeriod;
  // Recognized product revenue (delivered), before discounts.
  productRevenue: Money;
  // Delivery fees collected — pass-through, reported but not product profit.
  shippingRevenue?: Money;
  // Total discounts/promos on delivered orders.
  discounts: Money;
  // productRevenue - discounts.
  netRevenue: Money;
  cogs: Money;
  // netRevenue - cogs.
  grossProfit: Money;
  // grossProfit / netRevenue × 100 (0 when netRevenue is 0).
  grossMarginPct: number;
  operatingExpenses: Money;
  // grossProfit - operatingExpenses.
  netProfit: Money;
  // Actual cash collected in the period (payment_status = paid).
  cashCollected: Money;
  // Total still owed to suppliers across all suppliers.
  supplierPayables: Money;
  // Total advance/credit held with suppliers.
  supplierCredits: Money;
  // Total revenue reversed by returns in the period.
  refunds: Money;
}

// Per-product profitability for a period (DERIVED), used by the Accounting and
// Analytics product views.
// Supabase mapping: derived aggregation over `order_items` (delivered).
export interface ProductProfitability {
  productId?: ID;
  productSlug?: string;
  productName: LocalizedValue;
  quantitySold: number;
  revenue: Money;
  cogs: Money;
  // revenue - cogs.
  grossProfit: Money;
  // grossProfit / revenue × 100 (0 when revenue is 0).
  grossMarginPct: number;
}

// ---------------------------------------------------------------------------
// Derivation inputs & function signatures (TYPES ONLY — no implementations)
// ---------------------------------------------------------------------------

// The operational data accounting derives from. External operational arrays are
// typed `unknown[]` on purpose: this contract stays decoupled from the order /
// inventory contracts (the real shapes are `Order`/`OrderItem` from order.ts and
// `StockMovement` from inventory.ts) so accounting never owns or duplicates
// them. Accounting-owned records use their concrete contract types.
export interface AccountingDerivationInputs {
  // Canonical orders (order.ts `Order[]`). Revenue/COGS derive from delivered.
  orders: unknown[];
  // Canonical order items (order.ts `OrderItem[]`) when supplied separately.
  orderItems?: unknown[];
  purchases: Purchase[];
  supplierPayments: SupplierPayment[];
  operatingExpenses: OperatingExpense[];
  // Canonical stock movements (inventory.ts `StockMovement[]`) for COGS/value.
  stockMovements: unknown[];
}

// Future derivation function signatures. TYPES ONLY — no runtime implementation
// is provided in this phase. They document the intended derivation surface so
// later server actions / SQL functions implement against a fixed contract.

// Derive recognized revenue lines from canonical orders (delivered only).
export type DeriveRevenueFn = (orders: unknown[]) => RevenueLine[];

// Derive COGS lines from canonical order items (delivered) / stock movements.
export type DeriveCogsFn = (orderItems: unknown[]) => CogsLine[];

// Derive supplier payables/credits from purchases and supplier payments.
export type DeriveSupplierPayablesFn = (
  purchases: Purchase[],
  supplierPayments: SupplierPayment[],
) => SupplierPayable[];

// Derive the period P&L rollup from all operational + accounting inputs.
export type DeriveAccountingRollupFn = (
  inputs: AccountingDerivationInputs,
  period: AccountingPeriod,
) => AccountingRollup;

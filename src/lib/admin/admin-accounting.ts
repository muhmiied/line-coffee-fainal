"use client";

// Admin Accounting — real Supabase data layer (Phase 15).
//
// Aggregates the Admin Accounting module entirely from real tables. Every source
// is admin-only via RLS (`is_admin()`) and already granted SELECT to the
// `authenticated` role by earlier migrations — no new migration is needed:
//   orders / order_items                         (20260625120000 + 20260627110000)
//   orders.cogs_total / order_items.line_cogs    (20260630130000 / 20260625120000)
//   order_payments / order_refunds / order_returns (20260703120000)
//   expenses / purchases / supplier_payments / suppliers (20260630120000)
//
// Formula rules (per the Phase 15 spec):
//   - Sales (gross)      = Σ orders.total, EXCLUDING cancelled orders.
//   - Net Product Sales  = Σ (subtotal − discount_total), excluding cancelled.
//     (order.total already includes discount + delivery; product/net is separated
//      here so gross profit compares like-for-like against COGS.)
//   - COGS               = Σ orders.cogs_total for DELIVERED orders only. Never
//                          recomputed from current stock costs; missing snapshots
//                          are treated as 0 and surfaced honestly, never faked.
//   - Gross Profit       = (delivered net sales) − (delivered COGS). Delivered
//                          basis, so revenue and COGS share the same order set.
//   - Net Collected      = Σ order_payments.amount − Σ order_refunds.amount.
//   - Receivable         = Σ over non-cancelled orders of max(total − netPaid, 0).
//   - Operating Expenses = Σ expenses.amount (real expenses table only).
//   - Net Profit         = Gross Profit − Operating Expenses. Supplier PURCHASES
//                          are NOT expenses (they are inventory / cost basis) and
//                          never reduce P&L here.
//   - Supplier Payable   = Σ max(purchase.total − purchase.paid, 0), non-cancelled.
//   - Returns/refunds never rewrite historical order subtotals or COGS.
//   - No opening-cash fiction: there is no invented cash-position balance.
//   - When there is no data, numbers are honest zeros / empty states — never mock.

import { supabase } from "@/lib/supabase/client";
import type { OrderStatus } from "@/lib/types/order";

const ORDERS_SCAN_LIMIT = 5000;
const LEDGER_SCAN_LIMIT = 8000;
const PURCHASES_SCAN_LIMIT = 2000;
const EXPENSES_SCAN_LIMIT = 2000;
const SUPPLIER_PAYMENTS_SCAN_LIMIT = 5000;
const SUPPLIERS_SCAN_LIMIT = 2000;
const RETURNS_SCAN_LIMIT = 5000;
const RECENT_ORDERS_DISPLAY = 60;
const RECENT_TRANSACTIONS_LIMIT = 50;
const TREND_MONTHS = 6;

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export type AccountingPaymentMethodKey = "cash" | "bank_transfer" | "mobile_wallet" | "other";

const METHOD_LABELS: Record<AccountingPaymentMethodKey, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  mobile_wallet: "Mobile Wallet",
  other: "Other",
};

export type AccountingMethodBreakdown = {
  key: AccountingPaymentMethodKey;
  label: string;
  amount: number;
  count: number;
};

export type AccountingOrderRow = {
  id: string;
  code: string;
  customer: string;
  status: OrderStatus;
  placedAt: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  netSales: number;
  cogs: number | null;
  grossProfit: number | null;
  margin: number | null;
  netPaid: number;
  outstanding: number;
};

export type AccountingPurchaseRow = {
  id: string;
  date: string;
  supplierName: string;
  reference: string | null;
  status: string;
  paymentStatus: string;
  total: number;
  paid: number;
  unpaid: number;
};

export type AccountingExpenseRow = {
  id: string;
  date: string;
  category: string;
  amount: number;
  method: string | null;
  notes: string | null;
};

export type AccountingSupplierBalance = {
  supplierId: string;
  name: string;
  purchaseCount: number;
  purchaseTotal: number;
  paid: number;
  payable: number;
};

export type AccountingActivityKind =
  | "payment"
  | "refund"
  | "expense"
  | "purchase"
  | "supplier-payment"
  | "return";

export type AccountingActivityDirection = "in" | "out" | "neutral";

export type AccountingTransaction = {
  id: string;
  date: string;
  kind: AccountingActivityKind;
  direction: AccountingActivityDirection;
  label: string;
  detail: string;
  amount: number;
};

export type AccountingMonthlyPoint = {
  label: string;
  revenue: number;
  collections: number;
  expenses: number;
  grossProfit: number;
};

export type AdminAccountingData = {
  // Revenue / sales
  salesGross: number;
  productSubtotal: number;
  discountsTotal: number;
  deliveryFeesTotal: number;
  netProductSales: number;
  // Delivered-basis profit
  deliveredNetSales: number;
  cogsTotal: number;
  grossProfit: number;
  grossMargin: number;
  // Cash / collections
  paidTotal: number;
  refundedTotal: number;
  netCollected: number;
  receivable: number;
  methodBreakdown: AccountingMethodBreakdown[];
  // Expenses / profit
  operatingExpenses: number;
  netProfit: number;
  // Purchases / suppliers
  totalPurchases: number;
  paidToSuppliers: number;
  supplierPayable: number;
  // Returns (operational)
  returnsCount: number;
  restockedKg: number;
  // counts / honesty flags
  orderCount: number;
  deliveredCount: number;
  cancelledCount: number;
  deliveredMissingCogs: number;
  // tables
  orders: AccountingOrderRow[];
  purchases: AccountingPurchaseRow[];
  expenses: AccountingExpenseRow[];
  supplierBalances: AccountingSupplierBalance[];
  transactions: AccountingTransaction[];
  monthly: AccountingMonthlyPoint[];
  hasAnyData: boolean;
};

export class AdminAccountingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAccountingError";
  }
}

function devWarn(scope: string, message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[admin-accounting:${scope}] ${message}`);
  }
}

function readError(scope: string, message: string) {
  devWarn(scope, message);
  return new AdminAccountingError("Could not load accounting data. Please try again.");
}

function money(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeMethod(value: string | null | undefined): AccountingPaymentMethodKey {
  if (value === "cash" || value === "bank_transfer" || value === "mobile_wallet") return value;
  return "other";
}

// ── Row shapes ────────────────────────────────────────────────────────────────

type OrderRow = {
  id: string;
  code: string;
  customer_name: string | null;
  status: OrderStatus;
  subtotal: number | string;
  discount_total: number | string;
  delivery_fee: number | string;
  total: number | string;
  cogs_total: number | string | null;
  placed_at: string;
};

type LedgerRow = { order_id: string; amount: number | string; method: string | null; at: string };

type ExpenseRow = {
  id: string;
  expense_date: string;
  category: string;
  amount: number | string;
  payment_method: string | null;
  notes: string | null;
};

type PurchaseRow = {
  id: string;
  supplier_id: string;
  reference: string | null;
  status: string;
  purchase_date: string;
  total_amount: number | string;
  paid_amount: number | string;
  payment_status: string;
};

type SupplierPaymentRow = {
  id: string;
  supplier_id: string;
  purchase_id: string | null;
  amount: number | string;
  method: string | null;
  paid_at: string;
  notes: string | null;
};

type SupplierRow = { id: string; name: string };

type ReturnRow = {
  id: string;
  order_id: string;
  reason: string | null;
  restocked_kg: number | string;
  created_at: string;
};

// ── Monthly bucket helpers ─────────────────────────────────────────────────────

function buildMonthlyBuckets(now: number, months: number) {
  const base = new Date(now);
  const buckets: AccountingMonthlyPoint[] = [];
  const index = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    index.set(`${d.getFullYear()}-${d.getMonth()}`, buckets.length);
    buckets.push({
      label: `${MONTH_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      revenue: 0,
      collections: 0,
      expenses: 0,
      grossProfit: 0,
    });
  }
  return { buckets, index };
}

function bucketFor(index: Map<string, number>, dateStr: string | null | undefined): number {
  if (!dateStr) return -1;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return -1;
  return index.get(`${d.getFullYear()}-${d.getMonth()}`) ?? -1;
}

// ── Main aggregate ──────────────────────────────────────────────────────────────

export async function getAdminAccounting(): Promise<AdminAccountingData> {
  const now = Date.now();

  const [
    ordersResult,
    paymentsResult,
    refundsResult,
    returnsResult,
    expensesResult,
    purchasesResult,
    supplierPaymentsResult,
    suppliersResult,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, code, customer_name, status, subtotal, discount_total, delivery_fee, total, cogs_total, placed_at",
      )
      .order("placed_at", { ascending: false })
      .limit(ORDERS_SCAN_LIMIT),
    supabase
      .from("order_payments")
      .select("order_id, amount, method, paid_at")
      .limit(LEDGER_SCAN_LIMIT),
    supabase
      .from("order_refunds")
      .select("order_id, amount, method, refunded_at")
      .limit(LEDGER_SCAN_LIMIT),
    supabase
      .from("order_returns")
      .select("id, order_id, reason, restocked_kg, created_at")
      .order("created_at", { ascending: false })
      .limit(RETURNS_SCAN_LIMIT),
    supabase
      .from("expenses")
      .select("id, expense_date, category, amount, payment_method, notes")
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(EXPENSES_SCAN_LIMIT),
    supabase
      .from("purchases")
      .select("id, supplier_id, reference, status, purchase_date, total_amount, paid_amount, payment_status")
      .order("purchase_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(PURCHASES_SCAN_LIMIT),
    supabase
      .from("supplier_payments")
      .select("id, supplier_id, purchase_id, amount, method, paid_at, notes")
      .order("paid_at", { ascending: false })
      .limit(SUPPLIER_PAYMENTS_SCAN_LIMIT),
    supabase.from("suppliers").select("id, name").limit(SUPPLIERS_SCAN_LIMIT),
  ]);

  if (ordersResult.error) throw readError("orders", ordersResult.error.message);
  if (paymentsResult.error) throw readError("payments", paymentsResult.error.message);
  if (refundsResult.error) throw readError("refunds", refundsResult.error.message);
  if (returnsResult.error) throw readError("returns", returnsResult.error.message);
  if (expensesResult.error) throw readError("expenses", expensesResult.error.message);
  if (purchasesResult.error) throw readError("purchases", purchasesResult.error.message);
  if (supplierPaymentsResult.error) {
    throw readError("supplier-payments", supplierPaymentsResult.error.message);
  }
  if (suppliersResult.error) throw readError("suppliers", suppliersResult.error.message);

  const orders = (ordersResult.data ?? []) as unknown as OrderRow[];
  const payments = ((paymentsResult.data ?? []) as { order_id: string; amount: number | string; method: string | null; paid_at: string }[]).map(
    (r): LedgerRow => ({ order_id: r.order_id, amount: r.amount, method: r.method, at: r.paid_at }),
  );
  const refunds = ((refundsResult.data ?? []) as { order_id: string; amount: number | string; method: string | null; refunded_at: string }[]).map(
    (r): LedgerRow => ({ order_id: r.order_id, amount: r.amount, method: r.method, at: r.refunded_at }),
  );
  const returns = (returnsResult.data ?? []) as unknown as ReturnRow[];
  const expenseRows = (expensesResult.data ?? []) as unknown as ExpenseRow[];
  const purchaseRows = (purchasesResult.data ?? []) as unknown as PurchaseRow[];
  const supplierPaymentRows = (supplierPaymentsResult.data ?? []) as unknown as SupplierPaymentRow[];
  const supplierRows = (suppliersResult.data ?? []) as unknown as SupplierRow[];

  const orderCodeById = new Map(orders.map((o) => [o.id, o.code]));
  const supplierNameById = new Map(supplierRows.map((s) => [s.id, s.name]));

  // ── Per-order payment / refund maps (for receivable + per-row net paid) ───────
  const paidByOrder = new Map<string, number>();
  const refundedByOrder = new Map<string, number>();
  for (const p of payments) {
    paidByOrder.set(p.order_id, (paidByOrder.get(p.order_id) ?? 0) + money(p.amount));
  }
  for (const r of refunds) {
    refundedByOrder.set(r.order_id, (refundedByOrder.get(r.order_id) ?? 0) + money(r.amount));
  }

  // ── Order-derived revenue aggregates ───────────────────────────────────────────
  const { buckets, index } = buildMonthlyBuckets(now, TREND_MONTHS);

  let salesGross = 0;
  let productSubtotal = 0;
  let discountsTotal = 0;
  let deliveryFeesTotal = 0;
  let deliveredNetSales = 0;
  let cogsTotal = 0;
  let deliveredCount = 0;
  let cancelledCount = 0;
  let deliveredMissingCogs = 0;
  let receivable = 0;

  const orderRows: AccountingOrderRow[] = [];

  for (const o of orders) {
    const status = o.status;
    const subtotal = money(o.subtotal);
    const discount = money(o.discount_total);
    const deliveryFee = money(o.delivery_fee);
    const total = money(o.total);
    const netSales = round2(subtotal - discount);
    const isCancelled = status === "cancelled";
    const isDelivered = status === "delivered";

    const paid = paidByOrder.get(o.id) ?? 0;
    const refunded = refundedByOrder.get(o.id) ?? 0;
    const netPaid = round2(paid - refunded);
    const outstanding = isCancelled ? 0 : Math.max(0, round2(total - netPaid));

    if (isCancelled) {
      cancelledCount += 1;
    } else {
      salesGross += total;
      productSubtotal += subtotal;
      discountsTotal += discount;
      deliveryFeesTotal += deliveryFee;
      receivable += outstanding;

      const revenueBucket = bucketFor(index, o.placed_at);
      if (revenueBucket >= 0) buckets[revenueBucket].revenue += total;
    }

    let rowCogs: number | null = null;
    let rowGrossProfit: number | null = null;
    let rowMargin: number | null = null;

    if (isDelivered) {
      deliveredCount += 1;
      const hasCogs = o.cogs_total !== null && o.cogs_total !== undefined;
      const cogs = money(o.cogs_total);
      if (!hasCogs) deliveredMissingCogs += 1;
      deliveredNetSales += netSales;
      cogsTotal += cogs;
      rowCogs = cogs;
      rowGrossProfit = round2(netSales - cogs);
      rowMargin = netSales > 0 ? round2((rowGrossProfit / netSales) * 100) : 0;

      const gpBucket = bucketFor(index, o.placed_at);
      if (gpBucket >= 0) buckets[gpBucket].grossProfit += netSales - cogs;
    }

    if (orderRows.length < RECENT_ORDERS_DISPLAY) {
      orderRows.push({
        id: o.id,
        code: o.code,
        customer: o.customer_name || "Guest",
        status,
        placedAt: o.placed_at,
        subtotal,
        discount,
        deliveryFee,
        total,
        netSales,
        cogs: rowCogs,
        grossProfit: rowGrossProfit,
        margin: rowMargin,
        netPaid,
        outstanding,
      });
    }
  }

  const netProductSales = round2(productSubtotal - discountsTotal);
  const grossProfit = round2(deliveredNetSales - cogsTotal);
  const grossMargin = deliveredNetSales > 0 ? round2((grossProfit / deliveredNetSales) * 100) : 0;

  // ── Cash / collections ──────────────────────────────────────────────────────────
  const paidTotal = payments.reduce((sum, p) => sum + money(p.amount), 0);
  const refundedTotal = refunds.reduce((sum, r) => sum + money(r.amount), 0);
  const netCollected = round2(paidTotal - refundedTotal);

  // Payment-method breakdown (from collections; refunds shown separately, not netted per method).
  const methodTotals = new Map<AccountingPaymentMethodKey, { amount: number; count: number }>();
  for (const p of payments) {
    const key = normalizeMethod(p.method);
    const bucket = methodTotals.get(key) ?? { amount: 0, count: 0 };
    bucket.amount += money(p.amount);
    bucket.count += 1;
    methodTotals.set(key, bucket);
  }
  const methodOrder: AccountingPaymentMethodKey[] = ["cash", "bank_transfer", "mobile_wallet", "other"];
  const methodBreakdown: AccountingMethodBreakdown[] = methodOrder
    .filter((key) => methodTotals.has(key))
    .map((key) => ({
      key,
      label: METHOD_LABELS[key],
      amount: round2(methodTotals.get(key)!.amount),
      count: methodTotals.get(key)!.count,
    }));

  // ── Monthly collections + expenses ───────────────────────────────────────────────
  for (const p of payments) {
    const b = bucketFor(index, p.at);
    if (b >= 0) buckets[b].collections += money(p.amount);
  }
  for (const r of refunds) {
    const b = bucketFor(index, r.at);
    if (b >= 0) buckets[b].collections -= money(r.amount);
  }

  // ── Expenses ────────────────────────────────────────────────────────────────────
  let operatingExpenses = 0;
  const expenses: AccountingExpenseRow[] = expenseRows.map((row) => {
    operatingExpenses += money(row.amount);
    const b = bucketFor(index, row.expense_date);
    if (b >= 0) buckets[b].expenses += money(row.amount);
    return {
      id: row.id,
      date: row.expense_date,
      category: row.category,
      amount: money(row.amount),
      method: row.payment_method,
      notes: row.notes,
    };
  });

  const netProfit = round2(grossProfit - operatingExpenses);

  // ── Purchases + supplier payables ─────────────────────────────────────────────────
  let totalPurchases = 0;
  let paidToSuppliers = 0;
  let supplierPayable = 0;
  const supplierAgg = new Map<string, { purchaseCount: number; purchaseTotal: number; paid: number; payable: number }>();

  const purchases: AccountingPurchaseRow[] = purchaseRows.map((row) => {
    const total = money(row.total_amount);
    const paid = money(row.paid_amount);
    const isCancelled = row.status === "cancelled";
    const unpaid = Math.max(0, round2(total - paid));

    if (!isCancelled) {
      totalPurchases += total;
      paidToSuppliers += paid;
      supplierPayable += unpaid;
      const agg = supplierAgg.get(row.supplier_id) ?? { purchaseCount: 0, purchaseTotal: 0, paid: 0, payable: 0 };
      agg.purchaseCount += 1;
      agg.purchaseTotal += total;
      agg.paid += paid;
      agg.payable += unpaid;
      supplierAgg.set(row.supplier_id, agg);
    }

    return {
      id: row.id,
      date: row.purchase_date,
      supplierName: supplierNameById.get(row.supplier_id) ?? "Supplier",
      reference: row.reference,
      status: row.status,
      paymentStatus: row.payment_status,
      total,
      paid,
      unpaid,
    };
  });

  const supplierBalances: AccountingSupplierBalance[] = [...supplierAgg.entries()]
    .map(([supplierId, agg]) => ({
      supplierId,
      name: supplierNameById.get(supplierId) ?? "Supplier",
      purchaseCount: agg.purchaseCount,
      purchaseTotal: round2(agg.purchaseTotal),
      paid: round2(agg.paid),
      payable: round2(agg.payable),
    }))
    .sort((a, b) => b.payable - a.payable || b.purchaseTotal - a.purchaseTotal);

  // ── Returns (operational) ──────────────────────────────────────────────────────────
  const restockedKg = returns.reduce((sum, r) => sum + money(r.restocked_kg), 0);

  // ── Recent transactions timeline ─────────────────────────────────────────────────────
  const transactions: AccountingTransaction[] = [
    ...payments.map((p, i) => ({
      id: `pay-${p.order_id}-${i}`,
      date: p.at,
      kind: "payment" as const,
      direction: "in" as const,
      label: `Payment · ${orderCodeById.get(p.order_id) ?? "Order"}`,
      detail: `Collected via ${METHOD_LABELS[normalizeMethod(p.method)]}.`,
      amount: money(p.amount),
    })),
    ...refunds.map((r, i) => ({
      id: `ref-${r.order_id}-${i}`,
      date: r.at,
      kind: "refund" as const,
      direction: "out" as const,
      label: `Refund · ${orderCodeById.get(r.order_id) ?? "Order"}`,
      detail: `Refunded via ${METHOD_LABELS[normalizeMethod(r.method)]}. Reduces cash collected only.`,
      amount: money(r.amount),
    })),
    ...expenses.map((e) => ({
      id: `exp-${e.id}`,
      date: e.date,
      kind: "expense" as const,
      direction: "out" as const,
      label: `Expense · ${e.category}`,
      detail: e.notes || `Operating expense${e.method ? ` paid via ${e.method}` : ""}.`,
      amount: e.amount,
    })),
    ...purchases.map((pur) => ({
      id: `pur-${pur.id}`,
      date: pur.date,
      kind: "purchase" as const,
      direction: "neutral" as const,
      label: `Purchase · ${pur.supplierName}`,
      detail: `${pur.reference || "No reference"} — inventory / cost basis, not a P&L expense.`,
      amount: pur.total,
    })),
    ...supplierPaymentRows.map((sp) => ({
      id: `sp-${sp.id}`,
      date: sp.paid_at,
      kind: "supplier-payment" as const,
      direction: "out" as const,
      label: `Supplier payment · ${supplierNameById.get(sp.supplier_id) ?? "Supplier"}`,
      detail: sp.notes || `Paid via ${sp.method ?? "supplier settlement"}.`,
      amount: money(sp.amount),
    })),
    ...returns.map((r) => ({
      id: `retn-${r.id}`,
      date: r.created_at,
      kind: "return" as const,
      direction: "neutral" as const,
      label: `Return · ${orderCodeById.get(r.order_id) ?? "Order"}`,
      detail: `${r.reason || "Customer return"}${money(r.restocked_kg) > 0 ? ` — ${round2(money(r.restocked_kg))} kg restocked` : ""}. Does not rewrite sales/COGS.`,
      amount: money(r.restocked_kg),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, RECENT_TRANSACTIONS_LIMIT);

  // ── Round monthly buckets ─────────────────────────────────────────────────────────────
  const monthly = buckets.map((b) => ({
    label: b.label,
    revenue: Math.round(b.revenue),
    collections: Math.round(b.collections),
    expenses: Math.round(b.expenses),
    grossProfit: Math.round(b.grossProfit),
  }));

  const hasAnyData =
    orders.length > 0 ||
    payments.length > 0 ||
    refunds.length > 0 ||
    expenseRows.length > 0 ||
    purchaseRows.length > 0 ||
    supplierRows.length > 0;

  return {
    salesGross: round2(salesGross),
    productSubtotal: round2(productSubtotal),
    discountsTotal: round2(discountsTotal),
    deliveryFeesTotal: round2(deliveryFeesTotal),
    netProductSales,
    deliveredNetSales: round2(deliveredNetSales),
    cogsTotal: round2(cogsTotal),
    grossProfit,
    grossMargin,
    paidTotal: round2(paidTotal),
    refundedTotal: round2(refundedTotal),
    netCollected,
    receivable: round2(receivable),
    methodBreakdown,
    operatingExpenses: round2(operatingExpenses),
    netProfit,
    totalPurchases: round2(totalPurchases),
    paidToSuppliers: round2(paidToSuppliers),
    supplierPayable: round2(supplierPayable),
    returnsCount: returns.length,
    restockedKg: round2(restockedKg),
    orderCount: orders.length,
    deliveredCount,
    cancelledCount,
    deliveredMissingCogs,
    orders: orderRows,
    purchases,
    expenses,
    supplierBalances,
    transactions,
    monthly,
    hasAnyData,
  };
}

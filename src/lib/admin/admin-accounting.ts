"use client";

// Admin Accounting — real Supabase data layer (Phase 15; Phase 2 reporting
// rewrite).
//
// PHASE 2 CHANGE: every KPI-level total below (Sales, Net Product Sales,
// delivered Gross Profit/Margin, Net Collected, Receivable, method breakdown,
// Operating Expenses, Net Profit, Supplier Payable, supplier balances, the
// 6-month trend, returns) used to be computed in the browser from a
// client-side scan of up to 5,000 orders / 8,000 payments / 8,000 refunds /
// 5,000 returns / 2,000 expenses / 2,000 purchases / 5,000 supplier payments.
// All of that now runs as one SQL aggregation over the COMPLETE table inside
// `get_admin_accounting_report_v1` (admin-only, `is_admin()`-gated; see
// migration `20260713140000`).
//
// The Orders/Purchases/Expenses/Suppliers TAB TABLES and the merged
// "Activity" timeline are a presentation concern, not a totals concern — the
// plan explicitly calls these "explicit, server-paginated limits, not
// aggregate scan limits". They still read directly here, but every read is
// now bounded to what is actually displayed (latest 60 orders, latest ~60 of
// each ledger for the timeline) instead of a broad multi-thousand-row scan,
// which removes the accidental O(cap) cost while keeping the exact same
// per-row shape. Full Purchases/Expenses table pagination (beyond the
// existing display cap) is a separate follow-up in this same phase (Section 4
// of the Phase 2 task).
//
// Formula rules (per the Phase 15 spec — unchanged, now verified against the
// RPC by direct SQL parity check before this file was rewritten):
//   - Sales (gross)      = Σ orders.total, EXCLUDING cancelled orders.
//   - Net Product Sales  = Σ (subtotal − discount_total), excluding cancelled.
//   - COGS               = Σ orders.cogs_total for DELIVERED orders only.
//   - Gross Profit       = (delivered net sales) − (delivered COGS).
//   - Net Collected      = Σ order_payments.amount − Σ order_refunds.amount.
//   - Operating Expenses = Σ expenses.amount; Net Profit = Gross Profit − that.
//   - Supplier purchases are NOT expenses. No opening-cash fiction.

import { supabase } from "@/lib/supabase/client";
import type { OrderStatus } from "@/lib/types/order";

const ORDERS_DISPLAY_LIMIT = 60;
const LEDGER_DISPLAY_LIMIT = 60;
const EXPENSES_SCAN_LIMIT = 2000;
const PURCHASES_SCAN_LIMIT = 2000;
const SUPPLIERS_SCAN_LIMIT = 2000;
const RECENT_TRANSACTIONS_LIMIT = 50;

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
  supplierId: string;
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
  if (message.includes("Admin access required")) {
    return new AdminAccountingError("Admin permission is required.");
  }
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

// ── RPC response shape (get_admin_accounting_report_v1) ────────────────────

type AccountingReportV1 = {
  salesGross: number;
  productSubtotal: number;
  discountsTotal: number;
  deliveryFeesTotal: number;
  deliveredNetSales: number;
  cogsTotal: number;
  deliveredMissingCogs: number;
  orderCount: number;
  deliveredCount: number;
  cancelledCount: number;
  paidTotal: number;
  refundedTotal: number;
  receivable: number;
  methodBreakdown: Array<{ key: AccountingPaymentMethodKey; amount: number; count: number }>;
  operatingExpenses: number;
  totalPurchases: number;
  paidToSuppliers: number;
  supplierPayable: number;
  supplierBalances: AccountingSupplierBalance[];
  returnsCount: number;
  restockedKg: number;
  monthly: AccountingMonthlyPoint[];
};

// ── Row shapes for the bounded display reads ────────────────────────────────

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

// ── Main aggregate ──────────────────────────────────────────────────────────

export async function getAdminAccounting(): Promise<AdminAccountingData> {
  const [
    reportResult,
    ordersResult,
    expensesResult,
    purchasesResult,
    supplierPaymentsResult,
    suppliersResult,
    recentReturnsResult,
  ] = await Promise.all([
    supabase.rpc("get_admin_accounting_report_v1"),
    supabase
      .from("orders")
      .select("id, code, customer_name, status, subtotal, discount_total, delivery_fee, total, cogs_total, placed_at")
      .order("placed_at", { ascending: false })
      .limit(ORDERS_DISPLAY_LIMIT),
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
      .limit(LEDGER_DISPLAY_LIMIT),
    supabase.from("suppliers").select("id, name").limit(SUPPLIERS_SCAN_LIMIT),
    supabase
      .from("order_returns")
      .select("id, order_id, reason, restocked_kg, created_at")
      .order("created_at", { ascending: false })
      .limit(LEDGER_DISPLAY_LIMIT),
  ]);

  if (reportResult.error) throw readError("report", reportResult.error.message);
  if (ordersResult.error) throw readError("orders", ordersResult.error.message);
  if (expensesResult.error) throw readError("expenses", expensesResult.error.message);
  if (purchasesResult.error) throw readError("purchases", purchasesResult.error.message);
  if (supplierPaymentsResult.error) throw readError("supplier-payments", supplierPaymentsResult.error.message);
  if (suppliersResult.error) throw readError("suppliers", suppliersResult.error.message);
  if (recentReturnsResult.error) throw readError("returns", recentReturnsResult.error.message);

  const report = reportResult.data as AccountingReportV1 | null;
  if (!report) throw readError("report", "Empty report response.");

  const orders = (ordersResult.data ?? []) as unknown as OrderRow[];
  const expenseRows = (expensesResult.data ?? []) as unknown as ExpenseRow[];
  const purchaseRows = (purchasesResult.data ?? []) as unknown as PurchaseRow[];
  const supplierPaymentRows = (supplierPaymentsResult.data ?? []) as unknown as SupplierPaymentRow[];
  const supplierRows = (suppliersResult.data ?? []) as unknown as SupplierRow[];
  const recentReturns = (recentReturnsResult.data ?? []) as unknown as ReturnRow[];

  const orderCodeById = new Map(orders.map((o) => [o.id, o.code]));
  const supplierNameById = new Map(supplierRows.map((s) => [s.id, s.name]));

  // ── Per-order payment/refund lookup, scoped to only the displayed orders ──
  const orderIds = orders.map((o) => o.id);
  const [displayPaymentsResult, displayRefundsResult] =
    orderIds.length > 0
      ? await Promise.all([
          supabase.from("order_payments").select("order_id, amount").in("order_id", orderIds),
          supabase.from("order_refunds").select("order_id, amount").in("order_id", orderIds),
        ])
      : [{ data: [] as { order_id: string; amount: number | string }[], error: null }, { data: [] as { order_id: string; amount: number | string }[], error: null }];

  if (displayPaymentsResult.error) throw readError("order-payments", displayPaymentsResult.error.message);
  if (displayRefundsResult.error) throw readError("order-refunds", displayRefundsResult.error.message);

  const paidByOrder = new Map<string, number>();
  for (const p of (displayPaymentsResult.data ?? []) as { order_id: string; amount: number | string }[]) {
    paidByOrder.set(p.order_id, (paidByOrder.get(p.order_id) ?? 0) + money(p.amount));
  }
  const refundedByOrder = new Map<string, number>();
  for (const r of (displayRefundsResult.data ?? []) as { order_id: string; amount: number | string }[]) {
    refundedByOrder.set(r.order_id, (refundedByOrder.get(r.order_id) ?? 0) + money(r.amount));
  }

  const orderRows: AccountingOrderRow[] = orders.map((o) => {
    const subtotal = money(o.subtotal);
    const discount = money(o.discount_total);
    const deliveryFee = money(o.delivery_fee);
    const total = money(o.total);
    const netSales = round2(subtotal - discount);
    const isCancelled = o.status === "cancelled";
    const isDelivered = o.status === "delivered";

    const paid = paidByOrder.get(o.id) ?? 0;
    const refunded = refundedByOrder.get(o.id) ?? 0;
    const netPaid = round2(paid - refunded);
    const outstanding = isCancelled ? 0 : Math.max(0, round2(total - netPaid));

    let rowCogs: number | null = null;
    let rowGrossProfit: number | null = null;
    let rowMargin: number | null = null;
    if (isDelivered) {
      rowCogs = money(o.cogs_total);
      rowGrossProfit = round2(netSales - rowCogs);
      rowMargin = netSales > 0 ? round2((rowGrossProfit / netSales) * 100) : 0;
    }

    return {
      id: o.id,
      code: o.code,
      customer: o.customer_name || "Guest",
      status: o.status,
      placedAt: o.placed_at,
      subtotal, discount, deliveryFee, total, netSales,
      cogs: rowCogs, grossProfit: rowGrossProfit, margin: rowMargin,
      netPaid, outstanding,
    };
  });

  // ── Purchases / expenses (still full-cap reads; real pagination is a
  // separate Phase 2 follow-up — see Section 4 of the task) ─────────────────
  const purchases: AccountingPurchaseRow[] = purchaseRows.map((row) => {
    const total = money(row.total_amount);
    const paid = money(row.paid_amount);
    return {
      id: row.id,
      supplierId: row.supplier_id,
      date: row.purchase_date,
      supplierName: supplierNameById.get(row.supplier_id) ?? "Supplier",
      reference: row.reference,
      status: row.status,
      paymentStatus: row.payment_status,
      total, paid,
      unpaid: Math.max(0, round2(total - paid)),
    };
  });

  const expenses: AccountingExpenseRow[] = expenseRows.map((row) => ({
    id: row.id,
    date: row.expense_date,
    category: row.category,
    amount: money(row.amount),
    method: row.payment_method,
    notes: row.notes,
  }));

  // ── Recent transactions timeline (latest ~60 of each real source, merged
  // and sliced to the documented 50-item display limit) ────────────────────
  const [timelinePaymentsResult, timelineRefundsResult] = await Promise.all([
    supabase.from("order_payments").select("order_id, amount, method, paid_at").order("paid_at", { ascending: false }).limit(LEDGER_DISPLAY_LIMIT),
    supabase.from("order_refunds").select("order_id, amount, method, refunded_at").order("refunded_at", { ascending: false }).limit(LEDGER_DISPLAY_LIMIT),
  ]);
  if (timelinePaymentsResult.error) throw readError("timeline-payments", timelinePaymentsResult.error.message);
  if (timelineRefundsResult.error) throw readError("timeline-refunds", timelineRefundsResult.error.message);

  const timelinePayments = ((timelinePaymentsResult.data ?? []) as { order_id: string; amount: number | string; method: string | null; paid_at: string }[]).map(
    (r): LedgerRow => ({ order_id: r.order_id, amount: r.amount, method: r.method, at: r.paid_at }),
  );
  const timelineRefunds = ((timelineRefundsResult.data ?? []) as { order_id: string; amount: number | string; method: string | null; refunded_at: string }[]).map(
    (r): LedgerRow => ({ order_id: r.order_id, amount: r.amount, method: r.method, at: r.refunded_at }),
  );

  const transactions: AccountingTransaction[] = [
    ...timelinePayments.map((p, i) => ({
      id: `pay-${p.order_id}-${i}`,
      date: p.at,
      kind: "payment" as const,
      direction: "in" as const,
      label: `Payment · ${orderCodeById.get(p.order_id) ?? "Order"}`,
      detail: `Collected via ${METHOD_LABELS[normalizeMethod(p.method)]}.`,
      amount: money(p.amount),
    })),
    ...timelineRefunds.map((r, i) => ({
      id: `ref-${r.order_id}-${i}`,
      date: r.at,
      kind: "refund" as const,
      direction: "out" as const,
      label: `Refund · ${orderCodeById.get(r.order_id) ?? "Order"}`,
      detail: `Refunded via ${METHOD_LABELS[normalizeMethod(r.method)]}. Reduces cash collected only.`,
      amount: money(r.amount),
    })),
    ...expenses.slice(0, RECENT_TRANSACTIONS_LIMIT).map((e) => ({
      id: `exp-${e.id}`,
      date: e.date,
      kind: "expense" as const,
      direction: "out" as const,
      label: `Expense · ${e.category}`,
      detail: e.notes || `Operating expense${e.method ? ` paid via ${e.method}` : ""}.`,
      amount: e.amount,
    })),
    ...purchases.slice(0, RECENT_TRANSACTIONS_LIMIT).map((pur) => ({
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
    ...recentReturns.map((r) => ({
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

  const methodBreakdown: AccountingMethodBreakdown[] = report.methodBreakdown.map((m) => ({
    key: m.key,
    label: METHOD_LABELS[m.key] ?? "Other",
    amount: m.amount,
    count: m.count,
  }));

  const grossProfit = round2(report.deliveredNetSales - report.cogsTotal);
  const netProfit = round2(grossProfit - report.operatingExpenses);
  const grossMargin = report.deliveredNetSales > 0 ? round2((grossProfit / report.deliveredNetSales) * 100) : 0;
  const netProductSales = round2(report.productSubtotal - report.discountsTotal);

  const hasAnyData =
    report.orderCount > 0 ||
    orderRows.length > 0 ||
    expenseRows.length > 0 ||
    purchaseRows.length > 0 ||
    supplierRows.length > 0;

  return {
    salesGross: report.salesGross,
    productSubtotal: report.productSubtotal,
    discountsTotal: report.discountsTotal,
    deliveryFeesTotal: report.deliveryFeesTotal,
    netProductSales,
    deliveredNetSales: report.deliveredNetSales,
    cogsTotal: report.cogsTotal,
    grossProfit,
    grossMargin,
    paidTotal: report.paidTotal,
    refundedTotal: report.refundedTotal,
    netCollected: round2(report.paidTotal - report.refundedTotal),
    receivable: report.receivable,
    methodBreakdown,
    operatingExpenses: report.operatingExpenses,
    netProfit,
    totalPurchases: report.totalPurchases,
    paidToSuppliers: report.paidToSuppliers,
    supplierPayable: report.supplierPayable,
    returnsCount: report.returnsCount,
    restockedKg: report.restockedKg,
    orderCount: report.orderCount,
    deliveredCount: report.deliveredCount,
    cancelledCount: report.cancelledCount,
    deliveredMissingCogs: report.deliveredMissingCogs,
    orders: orderRows,
    purchases,
    expenses,
    supplierBalances: report.supplierBalances,
    transactions,
    monthly: report.monthly,
    hasAnyData,
  };
}

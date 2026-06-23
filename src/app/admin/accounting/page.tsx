"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Calculator,
  Check,
  ChevronDown,
  CreditCard,
  FileText,
  Landmark,
  Package,
  PackagePlus,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  ACCOUNTING_BEAN_OPTIONS,
  ACCOUNTING_CASH_ADJUSTMENTS,
  ACCOUNTING_ORDERS,
  ACCOUNTING_OPERATING_EXPENSES,
  ACCOUNTING_PACKAGING_OPTIONS,
  ACCOUNTING_PERIOD,
  ACCOUNTING_PRODUCT_COSTS,
  ACCOUNTING_PURCHASES,
  ACCOUNTING_SUPPLIER_PAYMENTS,
  ACCOUNTING_SUPPLIERS,
  CATEGORY_COST_RATIOS,
  OPENING_CASH_BALANCE,
  type AccountingActivityKind,
  type AccountingOperatingExpense,
  type AccountingOrder,
  type AccountingOrderLineItem,
  type AccountingProductCategory,
  type AccountingPurchase,
  type AccountingPurchaseType,
  type AccountingSupplier,
  type AccountingSupplierCategory,
  type AccountingSupplierPayment,
  type AccountingExpenseCategory,
  type ExpensePaymentMethod,
  type PurchasePaymentMethod,
  type SupplierPaymentMethod,
} from "@/lib/mock-data/admin/accounting-mock";

type ActiveTab = "overview" | "revenue" | "purchases" | "expenses" | "suppliers" | "activity";
type DrawerState = { type: "purchase" | "expense" | "payment" | null } | { type: "supplier"; supplierId: string };
type Tone = "gold" | "green" | "blue" | "amber" | "red" | "cream";
type PurchaseTarget = "Existing Product" | "New Product Draft" | "Stock Only / Not for Sale Yet";
type ProductDraftCategoryMode = "Existing Category" | "Create Draft / Hidden Category";
type ProductDraftVisibility = "Draft" | "Hidden";
type PendingConfirmation =
  | { type: "purchase-overpay"; message: string }
  | { type: "supplier-overpay"; message: string }
  | null;

interface OrderFinancial {
  order: AccountingOrder;
  productRevenue: number;
  cashCollected: number;
  deliveryFees: number;
  refundAmount: number;
  estimatedCogs: number;
  estimatedGrossProfit: number;
  estimatedMargin: number;
  usesFallbackCost: boolean;
  returnedUnits: number;
}

interface SupplierSummary {
  supplierId: string;
  name: string;
  category: string;
  terms: string;
  contact: string;
  purchaseTotal: number;
  paidAtPurchase: number;
  unpaidPurchaseBalance: number;
  supplierPayments: number;
  purchaseCreditAdvance: number;
  supplierCreditAdvance: number;
  payableBalance: number;
  purchaseCount: number;
}

interface ActivityItem {
  id: string;
  date: string;
  kind: AccountingActivityKind;
  label: string;
  detail: string;
  amount: number;
  source: string;
}

interface AccountingFinancials {
  orderFinancials: OrderFinancial[];
  supplierSummaries: SupplierSummary[];
  activity: ActivityItem[];
  productRevenue: number;
  cashCollected: number;
  deliveryFeesCollected: number;
  refunds: number;
  returnedUnits: number;
  estimatedCogs: number;
  estimatedGrossProfit: number;
  estimatedGrossMargin: number;
  operatingExpenses: number;
  netProfit: number;
  inventoryPurchases: number;
  paidPurchases: number;
  unpaidPurchases: number;
  supplierPayments: number;
  supplierPayables: number;
  cashInflows: number;
  cashOutflows: number;
  cashPosition: number;
  neutralAdjustments: number;
}

type PurchaseFormState = {
  supplierId: string;
  date: string;
  reference: string;
  purchaseType: AccountingPurchaseType;
  purchaseTarget: PurchaseTarget;
  productSlug: string;
  draftProductName: string;
  draftCategoryMode: ProductDraftCategoryMode;
  draftExistingCategory: string;
  draftCategoryName: string;
  draftVisibility: ProductDraftVisibility;
  stockItemName: string;
  stockInternalCategory: string;
  qty250g: string;
  cost250g: string;
  qty500g: string;
  cost500g: string;
  qty1kg: string;
  cost1kg: string;
  beanName: string;
  beanKgQuantity: string;
  beanCostPerKg: string;
  packagingItem: string;
  packagingQuantity: string;
  packagingUnitCost: string;
  otherItem: string;
  otherQuantity: string;
  otherUnitCost: string;
  paidAmount: string;
  paymentMethod: PurchasePaymentMethod;
  note: string;
};

type ExpenseFormState = {
  date: string;
  category: AccountingExpenseCategory;
  vendor: string;
  description: string;
  amount: string;
  method: ExpensePaymentMethod;
};

type PaymentFormState = {
  supplierId: string;
  date: string;
  reference: string;
  amount: string;
  method: SupplierPaymentMethod;
  note: string;
};

type SupplierFormState = {
  name: string;
  contact: string;
  category: AccountingSupplierCategory;
  notes: string;
};

const TABS: Array<{ key: ActiveTab; label: string; icon: LucideIcon }> = [
  { key: "overview", label: "Overview", icon: Landmark },
  { key: "revenue", label: "Revenue", icon: Receipt },
  { key: "purchases", label: "Purchases", icon: Package },
  { key: "expenses", label: "Expenses", icon: Calculator },
  { key: "suppliers", label: "Suppliers", icon: CreditCard },
  { key: "activity", label: "Activity", icon: Activity },
];

const TONE_STYLE: Record<Tone, { color: string; bg: string; border: string }> = {
  gold: { color: "var(--gold)", bg: "rgba(182,136,94,0.12)", border: "rgba(182,136,94,0.24)" },
  green: { color: "#4ade80", bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.24)" },
  blue: { color: "#60a5fa", bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.24)" },
  amber: { color: "#fbbf24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.24)" },
  red: { color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.24)" },
  cream: { color: "var(--cream)", bg: "rgba(245,230,216,0.07)", border: "rgba(245,230,216,0.14)" },
};

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  Delivered: TONE_STYLE.green,
  Cancelled: { color: "#8b735b", bg: "rgba(107,87,68,0.16)", border: "rgba(107,87,68,0.32)" },
  Paid: TONE_STYLE.green,
  Unpaid: TONE_STYLE.red,
  "Partially Paid": TONE_STYLE.amber,
  "Advance Credit": TONE_STYLE.blue,
  Inflow: TONE_STYLE.green,
  Outflow: TONE_STYLE.red,
  Neutral: TONE_STYLE.blue,
  Estimated: TONE_STYLE.amber,
};

const PURCHASE_TYPES: AccountingPurchaseType[] = ["Finished Product Units", "Espresso Beans KG", "Packaging Units", "Other"];
const PURCHASE_TARGETS: PurchaseTarget[] = ["Existing Product", "New Product Draft", "Stock Only / Not for Sale Yet"];
const DRAFT_CATEGORY_MODES: ProductDraftCategoryMode[] = ["Existing Category", "Create Draft / Hidden Category"];
const DRAFT_VISIBILITIES: ProductDraftVisibility[] = ["Draft", "Hidden"];
const SUPPLIER_CATEGORIES: AccountingSupplierCategory[] = ["Beans", "Packaging", "Finished Products", "Maintenance", "Other"];
const PRODUCT_CATEGORY_OPTIONS = [
  "Turkish Blends",
  "Espresso Blends",
  "Easy Coffee",
  "Coffee Mix",
  "Cappuccino",
  "Hot Chocolate",
  "Flavor Coffee",
];
const EXPENSE_CATEGORIES: AccountingExpenseCategory[] = [
  "Rent",
  "Utilities",
  "Delivery",
  "Marketing",
  "Payroll",
  "Maintenance",
  "Tools",
  "Packaging Design",
  "Other",
];
const PURCHASE_METHODS: PurchasePaymentMethod[] = ["Bank Transfer", "Cash", "Vodafone Cash", "Supplier Credit"];
const EXPENSE_METHODS: ExpensePaymentMethod[] = ["Bank Transfer", "Cash", "Card", "Vodafone Cash"];
const SUPPLIER_PAYMENT_METHODS: SupplierPaymentMethod[] = ["Cash", "Bank", "Wallet"];

const PRODUCT_OPTIONS = ACCOUNTING_PRODUCT_COSTS.map((product) => ({
  value: product.slug,
  label: product.productName,
  meta: `${Math.round(product.purchaseCostPerKg).toLocaleString("en-US")} EGP / kg cost basis`,
}));

const BEAN_OPTIONS = ACCOUNTING_BEAN_OPTIONS.map((bean) => ({ value: bean, label: bean }));
const PACKAGING_OPTIONS = ACCOUNTING_PACKAGING_OPTIONS.map((item) => ({ value: item, label: item }));

const moneyFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function fmt(value: number) {
  return moneyFormatter.format(Math.round(value));
}

function money(value: number) {
  return `${fmt(value)} EGP`;
}

function signedMoney(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${money(Math.abs(value))}`;
}

function payableOrCredit(value: number) {
  if (value < 0) return `${money(Math.abs(value))} credit`;
  return money(value);
}

function pct(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(1)}%`;
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function getPurchaseUnpaidBalance(purchase: AccountingPurchase) {
  const paid = Math.min(Math.max(purchase.paidAmount, 0), purchase.totalAmount);
  return Math.max(purchase.totalAmount - paid, 0);
}

function getPurchasePaidAgainstTotal(purchase: AccountingPurchase) {
  return Math.min(Math.max(purchase.paidAmount, 0), purchase.totalAmount);
}

function getPurchaseCreditAdvance(purchase: AccountingPurchase) {
  return Math.max(purchase.paidAmount - purchase.totalAmount, 0);
}

function getPurchaseStatus(purchase: AccountingPurchase) {
  const unpaidBalance = getPurchaseUnpaidBalance(purchase);
  if (getPurchaseCreditAdvance(purchase) > 0) return "Advance Credit";
  if (unpaidBalance === 0) return "Paid";
  if (purchase.paidAmount === 0) return "Unpaid";
  return "Partially Paid";
}

function getOrderProductRevenue(order: AccountingOrder) {
  if (order.status !== "Delivered") return 0;
  return Math.max(order.subtotal - order.discountAmount - order.refundAmount, 0);
}

function getOrderCashCollected(order: AccountingOrder) {
  return order.status === "Delivered" ? order.cashCollected : 0;
}

function getReturnedUnits(order: AccountingOrder) {
  if (order.status !== "Delivered") return 0;
  return sum(order.lineItems.map((item) => item.returnedQuantity ?? 0));
}

function getLineCostEstimate(item: AccountingOrderLineItem): { amount: number; usesFallbackCost: boolean } {
  const soldQuantity = Math.max(item.quantity - (item.returnedQuantity ?? 0), 0);
  const catalogCost = item.productSlug
    ? ACCOUNTING_PRODUCT_COSTS.find((product) => product.slug === item.productSlug)
    : undefined;

  if (catalogCost && item.packageWeightKg) {
    return {
      amount: catalogCost.purchaseCostPerKg * item.packageWeightKg * soldQuantity,
      usesFallbackCost: false,
    };
  }

  const ratio = CATEGORY_COST_RATIOS[item.category as AccountingProductCategory] ?? CATEGORY_COST_RATIOS.custom;
  return {
    amount: item.unitSalePrice * soldQuantity * ratio,
    usesFallbackCost: true,
  };
}

function getOrderCostEstimate(order: AccountingOrder) {
  if (order.status !== "Delivered") {
    return { amount: 0, usesFallbackCost: false };
  }

  const lineCosts = order.lineItems.map(getLineCostEstimate);
  return {
    amount: sum(lineCosts.map((line) => line.amount)),
    usesFallbackCost: lineCosts.some((line) => line.usesFallbackCost),
  };
}

function deriveAccountingFinancials(
  purchases: AccountingPurchase[],
  expenses: AccountingOperatingExpense[],
  supplierPayments: AccountingSupplierPayment[],
  suppliers: AccountingSupplier[],
): AccountingFinancials {
  const orderFinancials = ACCOUNTING_ORDERS.map((order) => {
    const productRevenue = getOrderProductRevenue(order);
    const costEstimate = getOrderCostEstimate(order);
    const estimatedGrossProfit = productRevenue - costEstimate.amount;

    return {
      order,
      productRevenue,
      cashCollected: getOrderCashCollected(order),
      deliveryFees: order.status === "Delivered" ? order.deliveryFee : 0,
      refundAmount: order.status === "Delivered" ? order.refundAmount : 0,
      estimatedCogs: costEstimate.amount,
      estimatedGrossProfit,
      estimatedMargin: productRevenue > 0 ? (estimatedGrossProfit / productRevenue) * 100 : 0,
      usesFallbackCost: costEstimate.usesFallbackCost,
      returnedUnits: getReturnedUnits(order),
    };
  });

  const supplierSummaries = suppliers.map((supplier) => {
    const supplierPurchases = purchases.filter((purchase) => purchase.supplierId === supplier.id);
    const supplierPaymentRows = supplierPayments.filter((payment) => payment.supplierId === supplier.id);
    const unpaidPurchaseBalance = sum(supplierPurchases.map(getPurchaseUnpaidBalance));
    const supplierPaymentTotal = sum(supplierPaymentRows.map((payment) => payment.amount));
    const purchaseCreditAdvance = sum(supplierPurchases.map(getPurchaseCreditAdvance));
    const netPayableBalance = unpaidPurchaseBalance - supplierPaymentTotal - purchaseCreditAdvance;

    return {
      supplierId: supplier.id,
      name: supplier.name,
      category: supplier.category,
      terms: supplier.terms,
      contact: supplier.contact,
      purchaseTotal: sum(supplierPurchases.map((purchase) => purchase.totalAmount)),
      paidAtPurchase: sum(supplierPurchases.map(getPurchasePaidAgainstTotal)),
      unpaidPurchaseBalance,
      supplierPayments: supplierPaymentTotal,
      purchaseCreditAdvance,
      supplierCreditAdvance: Math.max(-netPayableBalance, 0),
      payableBalance: Math.max(netPayableBalance, 0),
      purchaseCount: supplierPurchases.length,
    };
  });

  const productRevenue = sum(orderFinancials.map((order) => order.productRevenue));
  const cashCollected = sum(orderFinancials.map((order) => order.cashCollected));
  const deliveryFeesCollected = sum(orderFinancials.map((order) => order.deliveryFees));
  const refunds = sum(orderFinancials.map((order) => order.refundAmount));
  const estimatedCogs = sum(orderFinancials.map((order) => order.estimatedCogs));
  const estimatedGrossProfit = productRevenue - estimatedCogs;
  const operatingExpenses = sum(expenses.map((expense) => expense.amount));
  const inventoryPurchases = sum(purchases.map((purchase) => purchase.totalAmount));
  const paidPurchases = sum(purchases.map((purchase) => Math.max(purchase.paidAmount, 0)));
  const unpaidPurchases = sum(purchases.map(getPurchaseUnpaidBalance));
  const supplierPaymentTotal = sum(supplierPayments.map((payment) => payment.amount));
  const adjustmentInflows = sum(
    ACCOUNTING_CASH_ADJUSTMENTS.filter((adjustment) => adjustment.kind === "Inflow").map((adjustment) => adjustment.amount),
  );
  const adjustmentOutflows = sum(
    ACCOUNTING_CASH_ADJUSTMENTS.filter((adjustment) => adjustment.kind === "Outflow").map((adjustment) => adjustment.amount),
  );
  const cashInflows = cashCollected + adjustmentInflows;
  const cashOutflows = paidPurchases + operatingExpenses + supplierPaymentTotal + refunds + adjustmentOutflows;

  const activity: ActivityItem[] = [
    {
      id: "opening-balance",
      date: ACCOUNTING_PERIOD.asOf,
      kind: "Neutral" as const,
      label: "Opening cash balance",
      detail: "Starting point for the mock cash position.",
      amount: OPENING_CASH_BALANCE,
      source: "Opening balance",
    },
    ...orderFinancials
      .filter((entry) => entry.cashCollected > 0)
      .map((entry) => ({
        id: `${entry.order.id}-cash`,
        date: entry.order.date,
        kind: "Inflow" as const,
        label: `Cash collected from ${entry.order.id}`,
        detail: `${entry.order.customerName} - includes ${money(entry.deliveryFees)} delivery fee where present.`,
        amount: entry.cashCollected,
        source: "Delivered order",
      })),
    ...orderFinancials
      .filter((entry) => entry.refundAmount > 0)
      .map((entry) => ({
        id: `${entry.order.id}-refund`,
        date: entry.order.date,
        kind: "Outflow" as const,
        label: `Refund for ${entry.order.id}`,
        detail: entry.order.returnNote ?? "Customer refund after delivery.",
        amount: entry.refundAmount,
        source: "Refund / return",
      })),
    ...purchases
      .filter((purchase) => purchase.paidAmount > 0)
      .map((purchase) => ({
        id: `${purchase.id}-paid`,
        date: purchase.date,
        kind: "Outflow" as const,
        label: `Paid purchase - ${purchase.item}`,
        detail: `${purchase.reference || "No reference yet"} paid at purchase. ${
          getPurchaseCreditAdvance(purchase) > 0
            ? `${money(getPurchaseCreditAdvance(purchase))} recorded as supplier credit / advance.`
            : "Inventory purchase, not OpEx."
        }`,
        amount: Math.max(purchase.paidAmount, 0),
        source: "Inventory purchase",
      })),
    ...expenses.map((expense) => ({
      id: expense.id,
      date: expense.date,
      kind: "Outflow" as const,
      label: expense.description,
      detail: `${expense.vendor} - operating expense.`,
      amount: expense.amount,
      source: "Operating expense",
    })),
    ...supplierPayments.map((payment) => {
      const supplier = suppliers.find((item) => item.id === payment.supplierId);
      return {
        id: payment.id,
        date: payment.date,
        kind: "Outflow" as const,
        label: `Supplier payment - ${supplier?.name ?? "Supplier"}`,
        detail: `${payment.reference} - ${payment.note}`,
        amount: payment.amount,
        source: "Pay Supplier",
      };
    }),
    ...ACCOUNTING_CASH_ADJUSTMENTS.map((adjustment) => ({
      id: adjustment.id,
      date: adjustment.date,
      kind: adjustment.kind,
      label: adjustment.description,
      detail: "Mock cash adjustment note.",
      amount: adjustment.amount,
      source: "Adjustment",
    })),
  ].sort((a, b) => `${b.date}-${b.id}`.localeCompare(`${a.date}-${a.id}`));

  return {
    orderFinancials,
    supplierSummaries,
    activity,
    productRevenue,
    cashCollected,
    deliveryFeesCollected,
    refunds,
    returnedUnits: sum(orderFinancials.map((order) => order.returnedUnits)),
    estimatedCogs,
    estimatedGrossProfit,
    estimatedGrossMargin: productRevenue > 0 ? (estimatedGrossProfit / productRevenue) * 100 : 0,
    operatingExpenses,
    netProfit: estimatedGrossProfit - operatingExpenses,
    inventoryPurchases,
    paidPurchases,
    unpaidPurchases,
    supplierPayments: supplierPaymentTotal,
    supplierPayables: sum(supplierSummaries.map((supplier) => supplier.payableBalance)),
    cashInflows,
    cashOutflows,
    cashPosition: OPENING_CASH_BALANCE + cashInflows - cashOutflows,
    neutralAdjustments: ACCOUNTING_CASH_ADJUSTMENTS.filter((adjustment) => adjustment.kind === "Neutral").length + 1,
  };
}

function getSupplierStatementRows(
  supplierId: string,
  purchases: AccountingPurchase[],
  supplierPayments: AccountingSupplierPayment[],
) {
  let runningBalance = 0;
  const rows = [
    ...purchases
      .filter((purchase) => purchase.supplierId === supplierId)
      .map((purchase) => ({
        id: purchase.id,
        date: purchase.date,
        label: purchase.reference || "No reference yet",
        detail: purchase.item,
        delta: getPurchaseUnpaidBalance(purchase) - getPurchaseCreditAdvance(purchase),
        meta: `Total ${money(purchase.totalAmount)} - paid ${money(purchase.paidAmount)}${
          getPurchaseCreditAdvance(purchase) > 0 ? ` - credit ${money(getPurchaseCreditAdvance(purchase))}` : ""
        }`,
      })),
    ...supplierPayments
      .filter((payment) => payment.supplierId === supplierId)
      .map((payment) => ({
        id: payment.id,
        date: payment.date,
        label: payment.reference,
        detail: payment.note,
        delta: -payment.amount,
        meta: payment.method,
      })),
  ].sort((a, b) => `${a.date}-${a.id}`.localeCompare(`${b.date}-${b.id}`));

  return rows.map((row) => {
    runningBalance += row.delta;
    return { ...row, runningBalance };
  });
}

function getPurchaseFormTotal(form: PurchaseFormState) {
  if (form.purchaseType === "Finished Product Units") {
    return (
      toNumber(form.qty250g) * toNumber(form.cost250g) +
      toNumber(form.qty500g) * toNumber(form.cost500g) +
      toNumber(form.qty1kg) * toNumber(form.cost1kg)
    );
  }

  if (form.purchaseType === "Espresso Beans KG") {
    return toNumber(form.beanKgQuantity) * toNumber(form.beanCostPerKg);
  }

  if (form.purchaseType === "Packaging Units") {
    return toNumber(form.packagingQuantity) * toNumber(form.packagingUnitCost);
  }

  return toNumber(form.otherQuantity) * toNumber(form.otherUnitCost);
}

function getPurchaseFormItem(form: PurchaseFormState) {
  if (form.purchaseType === "Finished Product Units") {
    if (form.purchaseTarget === "Existing Product") {
      return PRODUCT_OPTIONS.find((product) => product.value === form.productSlug)?.label ?? "";
    }

    if (form.purchaseTarget === "New Product Draft") {
      return `Draft product: ${form.draftProductName.trim()}`;
    }

    return `Stock only: ${form.stockItemName.trim()}`;
  }

  if (form.purchaseType === "Espresso Beans KG") return form.beanName;
  if (form.purchaseType === "Packaging Units") return form.packagingItem;
  return form.otherItem.trim();
}

function getPurchaseFormQuantityLabel(form: PurchaseFormState) {
  if (form.purchaseType === "Finished Product Units") {
    return [
      toNumber(form.qty250g) > 0 ? `250g x ${toNumber(form.qty250g)}` : "",
      toNumber(form.qty500g) > 0 ? `500g x ${toNumber(form.qty500g)}` : "",
      toNumber(form.qty1kg) > 0 ? `1kg x ${toNumber(form.qty1kg)}` : "",
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (form.purchaseType === "Espresso Beans KG") return `${toNumber(form.beanKgQuantity)} kg`;
  if (form.purchaseType === "Packaging Units") return `${toNumber(form.packagingQuantity)} units`;
  return `${toNumber(form.otherQuantity)} units`;
}

function validatePurchaseForm(form: PurchaseFormState) {
  if (!form.supplierId) return "Supplier is required.";
  if (!form.purchaseType) return "Purchase type is required.";

  const paidAmount = toNumber(form.paidAmount);
  const totalAmount = getPurchaseFormTotal(form);

  if (form.purchaseType === "Finished Product Units") {
    if (!form.purchaseTarget) return "Purchase target is required.";

    if (form.purchaseTarget === "Existing Product" && !form.productSlug) {
      return "Product is required.";
    }

    if (form.purchaseTarget === "New Product Draft") {
      if (!form.draftProductName.trim()) return "Product name is required.";
      if (form.draftCategoryMode === "Existing Category" && !form.draftExistingCategory) return "Category is required.";
      if (form.draftCategoryMode === "Create Draft / Hidden Category" && !form.draftCategoryName.trim()) {
        return "Draft / hidden category name is required.";
      }
    }

    if (form.purchaseTarget === "Stock Only / Not for Sale Yet" && !form.stockItemName.trim()) {
      return "Internal stock item name is required.";
    }

    const sizeRows = [
      { label: "250g", quantity: toNumber(form.qty250g), cost: toNumber(form.cost250g), rawQuantity: form.qty250g, rawCost: form.cost250g },
      { label: "500g", quantity: toNumber(form.qty500g), cost: toNumber(form.cost500g), rawQuantity: form.qty500g, rawCost: form.cost500g },
      { label: "1kg", quantity: toNumber(form.qty1kg), cost: toNumber(form.cost1kg), rawQuantity: form.qty1kg, rawCost: form.cost1kg },
    ];
    const invalidNegative = sizeRows.find((row) => toNumber(row.rawQuantity) < 0 || toNumber(row.rawCost) < 0);
    if (invalidNegative) return "Quantities and unit costs cannot be negative.";

    const hasQuantity = sizeRows.some((row) => row.quantity > 0);
    if (!hasQuantity) return "At least one size quantity must be greater than 0.";

    const invalidRow = sizeRows.find((row) => row.quantity > 0 && row.cost <= 0);
    if (invalidRow) return `${invalidRow.label} unit cost is required when quantity is greater than 0.`;
  }

  if (form.purchaseType === "Espresso Beans KG") {
    if (!form.beanName) return "Bean is required.";
    if (toNumber(form.beanKgQuantity) <= 0) return "KG quantity must be greater than 0.";
    if (toNumber(form.beanCostPerKg) <= 0) return "Cost per KG must be greater than 0.";
  }

  if (form.purchaseType === "Packaging Units") {
    if (!form.packagingItem) return "Packaging item is required.";
    if (toNumber(form.packagingQuantity) <= 0) return "Units quantity must be greater than 0.";
    if (toNumber(form.packagingUnitCost) <= 0) return "Cost per unit must be greater than 0.";
  }

  if (form.purchaseType === "Other") {
    if (!form.otherItem.trim()) return "Item name is required.";
    if (toNumber(form.otherQuantity) <= 0) return "Quantity must be greater than 0.";
    if (toNumber(form.otherUnitCost) <= 0) return "Unit cost must be greater than 0.";
  }

  if (totalAmount <= 0) return "Total amount must be greater than 0.";
  if (paidAmount < 0) return "Paid amount cannot be negative.";

  return "";
}

function StatusPill({ label }: { label: string }) {
  const style = STATUS_STYLE[label] ?? TONE_STYLE.cream;

  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
      style={{ color: style.color, background: style.bg, borderColor: style.border }}
    >
      {label}
    </span>
  );
}

function TonePill({ label, tone }: { label: string; tone: Tone }) {
  const style = TONE_STYLE[tone];

  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
      style={{ color: style.color, background: style.bg, borderColor: style.border }}
    >
      {label}
    </span>
  );
}

function Surface({
  title,
  caption,
  icon: Icon,
  right,
  children,
}: {
  title: string;
  caption?: string;
  icon?: LucideIcon;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="admin-surface overflow-hidden">
      <div
        className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
        style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}
      >
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span
              className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
              style={{
                color: "var(--gold)",
                background: "rgba(182,136,94,0.10)",
                border: "1px solid rgba(182,136,94,0.16)",
              }}
            >
              <Icon size={15} />
            </span>
          )}
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--cream-dim)", opacity: 0.55 }}
            >
              {title}
            </p>
            {caption && (
              <p className="mt-1 max-w-3xl text-[12px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.58 }}>
                {caption}
              </p>
            )}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  caption,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  caption?: string;
  tone: Tone;
  icon?: LucideIcon;
}) {
  const style = TONE_STYLE[tone];

  return (
    <article className="admin-kpi-card py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[10.5px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--cream-dim)", opacity: 0.46 }}
          >
            {label}
          </p>
          <p className="mt-1 text-[20px] font-bold leading-tight" style={{ color: style.color }}>
            {value}
          </p>
        </div>
        {Icon && (
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
          >
            <Icon size={15} />
          </span>
        )}
      </div>
      {caption && (
        <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.52 }}>
          {caption}
        </p>
      )}
    </article>
  );
}

function Note({ children, tone = "gold" }: { children: ReactNode; tone?: Tone }) {
  const style = TONE_STYLE[tone];

  return (
    <div
      className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12px] leading-relaxed"
      style={{ color: "var(--cream-dim)", background: style.bg, borderColor: style.border }}
    >
      <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: style.color }} />
      <span>{children}</span>
    </div>
  );
}

function ActionButton({
  children,
  icon: Icon,
  onClick,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors hover:bg-white/[0.04]"
      style={{
        color: "var(--gold)",
        background: "rgba(182,136,94,0.12)",
        border: "1px solid rgba(182,136,94,0.24)",
      }}
    >
      <Icon size={14} />
      <span>{children}</span>
    </button>
  );
}

function IconButton({
  icon: Icon,
  title,
  onClick,
  tone = "gold",
}: {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  tone?: Tone;
}) {
  const style = TONE_STYLE[tone];

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.04]"
      style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
    >
      <Icon size={14} />
    </button>
  );
}

function Drawer({
  open,
  title,
  caption,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  caption?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close drawer overlay"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-[560px] flex-col overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #130d09 0%, #0b0806 100%)",
          borderLeft: "1px solid rgba(182,136,94,0.18)",
          boxShadow: "-24px 0 80px rgba(0,0,0,0.45)",
        }}
      >
        <div
          className="flex items-start justify-between gap-4 px-5 py-4"
          style={{ borderBottom: "1px solid rgba(182,136,94,0.10)" }}
        >
          <div>
            <p className="text-[18px] font-bold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
              {title}
            </p>
            {caption && (
              <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.58 }}>
                {caption}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.05]"
            style={{ color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.12)" }}
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </div>
  );
}

function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center px-4">
      <button type="button" aria-label="Close confirmation" className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div
        className="relative w-full max-w-md rounded-xl p-5 shadow-2xl"
        style={{
          background: "linear-gradient(180deg, #18100b 0%, #0e0906 100%)",
          border: "1px solid rgba(182,136,94,0.24)",
        }}
      >
        <p className="text-[17px] font-bold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
          {title}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.68 }}>
          {message}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold"
            style={{ color: "#120d09", background: "var(--gold)" }}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-white/[0.04]"
            style={{ color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.12)" }}
          >
            Edit amount
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--cream-dim)", opacity: 0.5 }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

type SelectOption<T extends string> = {
  value: T;
  label: string;
  meta?: string;
};

function StyledSelect<T extends string>({
  value,
  options,
  placeholder,
  onChange,
  ariaLabel,
}: {
  value: T | "";
  options: SelectOption<T>[];
  placeholder: string;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13px] outline-none transition-colors hover:bg-white/[0.04]"
        style={inputStyle()}
      >
        <span className="min-w-0">
          <span
            className="block truncate"
            style={{ color: selected ? "var(--cream)" : "rgba(245,230,216,0.42)" }}
          >
            {selected?.label ?? placeholder}
          </span>
          {selected?.meta && (
            <span className="mt-0.5 block truncate text-[10.5px]" style={{ color: "var(--cream-dim)", opacity: 0.52 }}>
              {selected.meta}
            </span>
          )}
        </span>
        <ChevronDown
          size={15}
          className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--gold)" }}
        />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[90] max-h-64 overflow-y-auto rounded-lg py-1 shadow-2xl"
          style={{
            background: "#120c08",
            border: "1px solid rgba(182,136,94,0.30)",
            boxShadow: "0 18px 48px rgba(0,0,0,0.55)",
          }}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-white/[0.05]"
                style={{
                  color: active ? "var(--gold)" : "var(--cream)",
                  background: active ? "rgba(182,136,94,0.14)" : "transparent",
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{option.label}</span>
                  {option.meta && (
                    <span className="mt-0.5 block truncate text-[10.5px]" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
                      {option.meta}
                    </span>
                  )}
                </span>
                {active && <Check size={13} className="flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function inputStyle() {
  return {
    background: "rgba(255,255,255,0.045)",
    border: "1px solid rgba(182,136,94,0.15)",
    color: "var(--cream)",
  };
}

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [drawer, setDrawer] = useState<DrawerState>({ type: null });
  const [suppliers, setSuppliers] = useState<AccountingSupplier[]>(ACCOUNTING_SUPPLIERS);
  const [purchases, setPurchases] = useState<AccountingPurchase[]>(ACCOUNTING_PURCHASES);
  const [expenses, setExpenses] = useState<AccountingOperatingExpense[]>(ACCOUNTING_OPERATING_EXPENSES);
  const [supplierPayments, setSupplierPayments] = useState<AccountingSupplierPayment[]>(ACCOUNTING_SUPPLIER_PAYMENTS);
  const [draftCategories, setDraftCategories] = useState<string[]>([]);
  const [activityFilter, setActivityFilter] = useState<AccountingActivityKind | "All">("All");
  const [purchaseError, setPurchaseError] = useState("");
  const [expenseError, setExpenseError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [supplierError, setSupplierError] = useState("");
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>({
    name: "",
    contact: "",
    category: "Beans",
    notes: "",
  });
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>({
    supplierId: ACCOUNTING_SUPPLIERS[0]?.id ?? "",
    date: ACCOUNTING_PERIOD.asOf,
    reference: "",
    purchaseType: "Finished Product Units",
    purchaseTarget: "Existing Product",
    productSlug: PRODUCT_OPTIONS[0]?.value ?? "",
    draftProductName: "",
    draftCategoryMode: "Existing Category",
    draftExistingCategory: PRODUCT_CATEGORY_OPTIONS[0] ?? "",
    draftCategoryName: "",
    draftVisibility: "Draft",
    stockItemName: "",
    stockInternalCategory: "",
    qty250g: "",
    cost250g: "",
    qty500g: "",
    cost500g: "",
    qty1kg: "",
    cost1kg: "",
    beanName: BEAN_OPTIONS[0]?.value ?? "",
    beanKgQuantity: "",
    beanCostPerKg: "",
    packagingItem: PACKAGING_OPTIONS[0]?.value ?? "",
    packagingQuantity: "",
    packagingUnitCost: "",
    otherItem: "",
    otherQuantity: "",
    otherUnitCost: "",
    paidAmount: "0",
    paymentMethod: "Supplier Credit",
    note: "",
  });
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>({
    date: ACCOUNTING_PERIOD.asOf,
    category: "Other",
    vendor: "",
    description: "",
    amount: "",
    method: "Cash",
  });
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    supplierId: ACCOUNTING_SUPPLIERS[0]?.id ?? "",
    date: ACCOUNTING_PERIOD.asOf,
    reference: "",
    amount: "",
    method: "Bank",
    note: "",
  });

  const categoryOptions = useMemo(() => [...PRODUCT_CATEGORY_OPTIONS, ...draftCategories], [draftCategories]);

  const financials = useMemo(
    () => deriveAccountingFinancials(purchases, expenses, supplierPayments, suppliers),
    [purchases, expenses, supplierPayments, suppliers],
  );

  const selectedSupplier =
    drawer.type === "supplier"
      ? financials.supplierSummaries.find((supplier) => supplier.supplierId === drawer.supplierId)
      : undefined;

  const selectedPaymentSupplier = financials.supplierSummaries.find(
    (supplier) => supplier.supplierId === paymentForm.supplierId,
  );

  const filteredActivity = financials.activity.filter(
    (entry) => activityFilter === "All" || entry.kind === activityFilter,
  );
  const purchaseTotal = getPurchaseFormTotal(purchaseForm);
  const purchaseAdvanceAmount = Math.max(toNumber(purchaseForm.paidAmount) - purchaseTotal, 0);
  const paymentAmount = toNumber(paymentForm.amount);
  const paymentRemainingBalance = (selectedPaymentSupplier?.payableBalance ?? 0) - paymentAmount;
  const paymentExtraCredit = Math.max(-paymentRemainingBalance, 0);

  function closeDrawer() {
    setDrawer({ type: null });
    setPurchaseError("");
    setExpenseError("");
    setPaymentError("");
    setSupplierError("");
    setShowNewSupplierForm(false);
  }

  function openPaymentDrawer(supplierId?: string) {
    setPaymentForm((current) => ({
      ...current,
      supplierId: supplierId ?? current.supplierId,
      reference: "",
      amount: "",
      note: supplierId ? `Payment to ${suppliers.find((supplier) => supplier.id === supplierId)?.name ?? "supplier"}` : "",
    }));
    setPaymentError("");
    setDrawer({ type: "payment" });
  }

  function resetPurchaseForm(nextSupplierId = suppliers[0]?.id ?? "") {
    setPurchaseForm({
      supplierId: nextSupplierId,
      date: ACCOUNTING_PERIOD.asOf,
      reference: "",
      purchaseType: "Finished Product Units",
      purchaseTarget: "Existing Product",
      productSlug: PRODUCT_OPTIONS[0]?.value ?? "",
      draftProductName: "",
      draftCategoryMode: "Existing Category",
      draftExistingCategory: categoryOptions[0] ?? "",
      draftCategoryName: "",
      draftVisibility: "Draft",
      stockItemName: "",
      stockInternalCategory: "",
      qty250g: "",
      cost250g: "",
      qty500g: "",
      cost500g: "",
      qty1kg: "",
      cost1kg: "",
      beanName: BEAN_OPTIONS[0]?.value ?? "",
      beanKgQuantity: "",
      beanCostPerKg: "",
      packagingItem: PACKAGING_OPTIONS[0]?.value ?? "",
      packagingQuantity: "",
      packagingUnitCost: "",
      otherItem: "",
      otherQuantity: "",
      otherUnitCost: "",
      paidAmount: "0",
      paymentMethod: "Supplier Credit",
      note: "",
    });
  }

  function savePurchaseFromForm() {
    const totalAmount = getPurchaseFormTotal(purchaseForm);
    const paidAmount = toNumber(purchaseForm.paidAmount);
    const draftCategory = purchaseForm.draftCategoryName.trim();
    const advanceAmount = Math.max(paidAmount - totalAmount, 0);

    if (
      purchaseForm.purchaseType === "Finished Product Units" &&
      purchaseForm.purchaseTarget === "New Product Draft" &&
      purchaseForm.draftCategoryMode === "Create Draft / Hidden Category" &&
      draftCategory &&
      !draftCategories.includes(draftCategory)
    ) {
      setDraftCategories((current) => [...current, draftCategory]);
    }

    setPurchases((current) => [
      {
        id: makeId("PUR"),
        date: purchaseForm.date,
        supplierId: purchaseForm.supplierId,
        reference: purchaseForm.reference.trim(),
        purchaseType: purchaseForm.purchaseType,
        item: getPurchaseFormItem(purchaseForm),
        quantityLabel: getPurchaseFormQuantityLabel(purchaseForm),
        totalAmount,
        paidAmount,
        paymentMethod: purchaseForm.paymentMethod,
        note:
          purchaseForm.note.trim() ||
          (advanceAmount > 0
            ? "Added locally with supplier credit / advance."
            : "Added locally in Accounting mock."),
      },
      ...current,
    ]);

    resetPurchaseForm();
    setPendingConfirmation(null);
    closeDrawer();
  }

  function handleAddPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const totalAmount = getPurchaseFormTotal(purchaseForm);
    const paidAmount = toNumber(purchaseForm.paidAmount);
    const validationMessage = validatePurchaseForm(purchaseForm);

    if (validationMessage) {
      setPurchaseError(validationMessage);
      return;
    }

    if (paidAmount > totalAmount) {
      setPurchaseError("");
      setPendingConfirmation({
        type: "purchase-overpay",
        message: "Paid amount is greater than this purchase total. Extra amount will be recorded as Supplier Credit / Advance Payment. Continue?",
      });
      return;
    }

    savePurchaseFromForm();
  }

  function handleAddSupplier() {
    if (!supplierForm.name.trim()) {
      setSupplierError("Supplier name is required.");
      return;
    }

    const id = makeId("SUP");
    const nextSupplier: AccountingSupplier = {
      id,
      name: supplierForm.name.trim(),
      category: supplierForm.category,
      contact: supplierForm.contact.trim(),
      terms: supplierForm.notes.trim() || "Added locally from Accounting purchase.",
      notes: supplierForm.notes.trim(),
    };

    setSuppliers((current) => [nextSupplier, ...current]);
    setPurchaseForm((current) => ({ ...current, supplierId: id }));
    setSupplierForm({ name: "", contact: "", category: "Beans", notes: "" });
    setSupplierError("");
    setShowNewSupplierForm(false);
  }

  function handleAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = toNumber(expenseForm.amount);
    if (!expenseForm.category) {
      setExpenseError("Category is required.");
      return;
    }

    if (!expenseForm.vendor.trim()) {
      setExpenseError("Paid To / Payee is required.");
      return;
    }

    if (amount <= 0) {
      setExpenseError("Amount must be greater than 0.");
      return;
    }

    setExpenses((current) => [
      {
        id: makeId("EXP"),
        date: expenseForm.date,
        category: expenseForm.category,
        vendor: expenseForm.vendor.trim(),
        description: expenseForm.description.trim() || expenseForm.category,
        amount,
        method: expenseForm.method,
      },
      ...current,
    ]);

    setExpenseForm({
      date: ACCOUNTING_PERIOD.asOf,
      category: "Other",
      vendor: "",
      description: "",
      amount: "",
      method: "Cash",
    });
    closeDrawer();
  }

  function saveSupplierPaymentFromForm() {
    const amount = toNumber(paymentForm.amount);

    setSupplierPayments((current) => [
      {
        id: makeId("SP"),
        date: paymentForm.date,
        supplierId: paymentForm.supplierId,
        reference: paymentForm.reference.trim() || makeId("PAY"),
        amount,
        method: paymentForm.method,
        note: paymentForm.note.trim() || "Supplier payment recorded locally.",
      },
      ...current,
    ]);

    setPaymentForm({
      supplierId: suppliers[0]?.id ?? "",
      date: ACCOUNTING_PERIOD.asOf,
      reference: "",
      amount: "",
      method: "Bank",
      note: "",
    });
    setPendingConfirmation(null);
    closeDrawer();
  }

  function handleRecordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = toNumber(paymentForm.amount);
    const payableBalance = selectedPaymentSupplier?.payableBalance ?? 0;

    if (!paymentForm.supplierId) {
      setPaymentError("Supplier is required.");
      return;
    }

    if (amount <= 0) {
      setPaymentError("Payment amount must be greater than zero.");
      return;
    }

    if (amount > payableBalance) {
      setPaymentError("");
      setPendingConfirmation({
        type: "supplier-overpay",
        message: "You are paying more than the current supplier balance. The extra amount will be recorded as Supplier Credit / Advance Payment. Continue?",
      });
      return;
    }

    saveSupplierPaymentFromForm();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
              Accounting
            </h1>
            <TonePill label="Mock local" tone="gold" />
          </div>
          <p className="mt-1 text-[13px]" style={{ color: "var(--cream-dim)", opacity: 0.62 }}>
            {ACCOUNTING_PERIOD.label} cash, revenue, purchases, supplier payables, and operating expenses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton icon={PackagePlus} onClick={() => setDrawer({ type: "purchase" })} title="Add purchase">
            Add Purchase
          </ActionButton>
          <ActionButton icon={Plus} onClick={() => setDrawer({ type: "expense" })} title="Add operating expense">
            Add Expense
          </ActionButton>
          <ActionButton icon={CreditCard} onClick={() => openPaymentDrawer()} title="Pay supplier">
            Pay Supplier
          </ActionButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Product Revenue"
          value={money(financials.productRevenue)}
          caption="Delivered orders only, after discounts and refunds."
          tone="green"
          icon={TrendingUp}
        />
        <KpiCard
          label="Cash Position"
          value={money(financials.cashPosition)}
          caption={`Opening cash ${money(OPENING_CASH_BALANCE)} plus inflows minus outflows.`}
          tone="gold"
          icon={Wallet}
        />
        <KpiCard
          label="Estimated Gross Profit"
          value={money(financials.estimatedGrossProfit)}
          caption={`Estimated margin ${pct(financials.estimatedGrossMargin)}.`}
          tone={financials.estimatedGrossProfit >= 0 ? "blue" : "red"}
          icon={Calculator}
        />
        <KpiCard
          label="Net Profit"
          value={money(financials.netProfit)}
          caption="Gross profit minus operating expenses. Purchases excluded."
          tone={financials.netProfit >= 0 ? "green" : "red"}
          icon={financials.netProfit >= 0 ? ArrowUpRight : ArrowDownRight}
        />
        <KpiCard
          label="Supplier Payables"
          value={money(financials.supplierPayables)}
          caption="Unpaid purchase balances minus supplier payments."
          tone={financials.supplierPayables > 0 ? "amber" : "green"}
          icon={CreditCard}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Note tone="green">Delivered orders only are recognized as revenue.</Note>
        <Note tone="amber">COGS and margins are estimated until backend costing is connected.</Note>
        <Note tone="blue">Purchases update Accounting mock only. Future backend will update Inventory after approval.</Note>
      </div>

      <div
        className="overflow-x-auto rounded-xl p-1.5"
        style={{
          background: "linear-gradient(180deg, rgba(182,136,94,0.10), rgba(255,255,255,0.025))",
          border: "1px solid rgba(182,136,94,0.14)",
        }}
      >
        <div className="flex min-w-max gap-1.5">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className="inline-flex min-h-10 flex-shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-all hover:-translate-y-0.5"
              style={{
                color: active ? "var(--gold)" : "var(--cream-dim)",
                background: active
                  ? "linear-gradient(180deg, rgba(182,136,94,0.24), rgba(182,136,94,0.10))"
                  : "rgba(10,7,5,0.34)",
                border: active ? "1px solid rgba(214,163,115,0.42)" : "1px solid rgba(182,136,94,0.08)",
                boxShadow: active ? "0 10px 26px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06)" : "none",
              }}
            >
              <Icon size={14} className="flex-shrink-0" />
              {label}
            </button>
          );
        })}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Surface
            title="Cash Bridge"
            caption="Opening cash plus customer collections, less real cash outflows. Purchases use paid amount only."
            icon={Wallet}
          >
            <div className="space-y-3 px-5 py-5">
              {[
                { label: "Opening Cash Balance", value: OPENING_CASH_BALANCE, tone: "gold" as Tone, sign: "" },
                { label: "Cash Inflows", value: financials.cashInflows, tone: "green" as Tone, sign: "+" },
                { label: "Cash Outflows", value: financials.cashOutflows, tone: "red" as Tone, sign: "-" },
                { label: "Cash Position", value: financials.cashPosition, tone: "blue" as Tone, sign: "" },
              ].map((row) => {
                const style = TONE_STYLE[row.tone];
                return (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-3"
                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(182,136,94,0.08)" }}
                  >
                    <span className="text-[13px] font-medium" style={{ color: "var(--cream)" }}>
                      {row.label}
                    </span>
                    <span className="text-[14px] font-bold" style={{ color: style.color }}>
                      {row.sign}
                      {money(row.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Surface>

          <Surface title="Owner Summary" caption="Profitability and cash are intentionally separated." icon={Landmark}>
            <div className="grid grid-cols-2 gap-3 px-5 py-5">
              <KpiCard
                label="Cash Collected"
                value={money(financials.cashCollected)}
                caption="Includes delivery fees."
                tone="green"
                icon={Banknote}
              />
              <KpiCard
                label="Delivery Fees"
                value={money(financials.deliveryFeesCollected)}
                caption="Tracked separately from product revenue."
                tone="blue"
                icon={Truck}
              />
              <KpiCard
                label="Refund Amount"
                value={money(financials.refunds)}
                caption={`${financials.returnedUnits} returned unit(s).`}
                tone={financials.refunds > 0 ? "red" : "green"}
                icon={TrendingDown}
              />
              <KpiCard
                label="Paid Purchases"
                value={money(financials.paidPurchases)}
                caption="Cash outflow only."
                tone="amber"
                icon={Package}
              />
            </div>
          </Surface>
        </div>
      )}

      {activeTab === "revenue" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <KpiCard label="Recognized Revenue" value={money(financials.productRevenue)} tone="green" icon={Receipt} />
            <KpiCard label="Cash Collected" value={money(financials.cashCollected)} tone="gold" icon={Banknote} />
            <KpiCard label="Delivery Fees Collected" value={money(financials.deliveryFeesCollected)} tone="blue" icon={Truck} />
            <KpiCard label="Refund Amount" value={money(financials.refunds)} tone={financials.refunds > 0 ? "red" : "green"} icon={TrendingDown} />
            <KpiCard label="Estimated COGS" value={money(financials.estimatedCogs)} tone="amber" icon={Calculator} />
            <KpiCard label="Estimated Margin" value={pct(financials.estimatedGrossMargin)} tone="blue" icon={TrendingUp} />
          </div>

          <Surface
            title="Delivered Order Revenue"
            caption="Product revenue is subtotal minus discount minus refund. Cash collected may include delivery fees. Cancelled orders stay out."
            icon={Receipt}
          >
            <div className="hidden overflow-x-auto xl:block">
              <div
                className="grid min-w-[1180px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  gridTemplateColumns: "1fr 1.4fr 0.9fr 0.9fr 0.9fr 0.9fr 1fr 1fr 1fr 0.9fr",
                  color: "var(--cream-dim)",
                  background: "rgba(182,136,94,0.05)",
                  borderBottom: "1px solid rgba(182,136,94,0.08)",
                }}
              >
                <span>Order</span>
                <span>Customer</span>
                <span>Status</span>
                <span className="text-right">Subtotal</span>
                <span className="text-right">Discount</span>
                <span className="text-right">Refund</span>
                <span className="text-right">Product Revenue</span>
                <span className="text-right">Cash Collected</span>
                <span className="text-right">Est. COGS</span>
                <span className="text-right">Est. Margin</span>
              </div>
              {financials.orderFinancials.map((entry) => (
                <div
                  key={entry.order.id}
                  className="grid min-w-[1180px] items-center gap-4 px-5 py-3.5 text-[12.5px]"
                  style={{
                    gridTemplateColumns: "1fr 1.4fr 0.9fr 0.9fr 0.9fr 0.9fr 1fr 1fr 1fr 0.9fr",
                    color: "var(--cream)",
                    borderBottom: "1px solid rgba(182,136,94,0.06)",
                  }}
                >
                  <span className="font-mono text-[11.5px]" style={{ color: "var(--cream-dim)", opacity: 0.58 }}>
                    {entry.order.id}
                  </span>
                  <span>{entry.order.customerName}</span>
                  <StatusPill label={entry.order.status} />
                  <span className="text-right">{money(entry.order.subtotal)}</span>
                  <span className="text-right" style={{ color: "#fbbf24" }}>
                    {money(entry.order.discountAmount)}
                  </span>
                  <span className="text-right" style={{ color: entry.refundAmount > 0 ? "#f87171" : "var(--cream-dim)" }}>
                    {money(entry.refundAmount)}
                  </span>
                  <span className="text-right font-semibold" style={{ color: "#4ade80" }}>
                    {money(entry.productRevenue)}
                  </span>
                  <span className="text-right font-semibold" style={{ color: "var(--gold)" }}>
                    {money(entry.cashCollected)}
                  </span>
                  <span className="text-right" style={{ color: "#fbbf24" }}>
                    {money(entry.estimatedCogs)}
                  </span>
                  <span className="text-right">
                    {entry.order.status === "Delivered" ? pct(entry.estimatedMargin) : "0%"}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3 px-4 py-4 xl:hidden">
              {financials.orderFinancials.map((entry) => (
                <article
                  key={entry.order.id}
                  className="rounded-lg p-3"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(182,136,94,0.08)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11.5px]" style={{ color: "var(--gold)" }}>
                        {entry.order.id}
                      </p>
                      <p className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>
                        {entry.order.customerName}
                      </p>
                    </div>
                    <StatusPill label={entry.order.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                    <span style={{ color: "var(--cream-dim)" }}>Product revenue</span>
                    <span className="text-right font-semibold" style={{ color: "#4ade80" }}>
                      {money(entry.productRevenue)}
                    </span>
                    <span style={{ color: "var(--cream-dim)" }}>Cash collected</span>
                    <span className="text-right font-semibold" style={{ color: "var(--gold)" }}>
                      {money(entry.cashCollected)}
                    </span>
                    <span style={{ color: "var(--cream-dim)" }}>Refund</span>
                    <span className="text-right" style={{ color: entry.refundAmount > 0 ? "#f87171" : "var(--cream-dim)" }}>
                      {money(entry.refundAmount)}
                    </span>
                    <span style={{ color: "var(--cream-dim)" }}>Estimated COGS</span>
                    <span className="text-right" style={{ color: "#fbbf24" }}>
                      {money(entry.estimatedCogs)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </Surface>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Note tone="amber">COGS and margins are estimated. Catalog purchase costs are used when a product slug and package weight exist; otherwise the category fallback ratio is used.</Note>
            <Note tone="red">Refunds and returns reduce product revenue, cash position, and profit metrics. Cancelled orders do not count as revenue.</Note>
          </div>
        </div>
      )}

      {activeTab === "purchases" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Inventory Purchases" value={money(financials.inventoryPurchases)} tone="blue" icon={Package} />
            <KpiCard label="Paid Purchases" value={money(financials.paidPurchases)} tone="amber" icon={Banknote} />
            <KpiCard label="Unpaid Purchases" value={money(financials.unpaidPurchases)} tone="red" icon={CreditCard} />
            <KpiCard label="Supplier Payables" value={money(financials.supplierPayables)} tone="gold" icon={Landmark} />
          </div>

          <Surface
            title="Inventory Purchases"
            caption="Purchases affect cash and supplier payables, but are not operating expenses in this mock version."
            icon={Package}
            right={<ActionButton icon={PackagePlus} onClick={() => setDrawer({ type: "purchase" })} title="Add purchase">Add Purchase</ActionButton>}
          >
            <div className="hidden overflow-x-auto lg:block">
              <div
                className="grid min-w-[940px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  gridTemplateColumns: "1fr 1.4fr 1.7fr 0.9fr 1fr 1fr 1fr 1fr",
                  color: "var(--cream-dim)",
                  background: "rgba(182,136,94,0.05)",
                  borderBottom: "1px solid rgba(182,136,94,0.08)",
                }}
              >
                <span>Date</span>
                <span>Supplier</span>
                <span>Item</span>
                <span>Status</span>
                <span className="text-right">Total</span>
                <span className="text-right">Paid</span>
                <span className="text-right">Unpaid</span>
                <span>Method</span>
              </div>
              {purchases.map((purchase) => {
                const supplier = suppliers.find((item) => item.id === purchase.supplierId);
                const unpaid = getPurchaseUnpaidBalance(purchase);
                return (
                  <div
                    key={purchase.id}
                    className="grid min-w-[940px] items-center gap-4 px-5 py-3.5 text-[12.5px]"
                    style={{
                      gridTemplateColumns: "1fr 1.4fr 1.7fr 0.9fr 1fr 1fr 1fr 1fr",
                      color: "var(--cream)",
                      borderBottom: "1px solid rgba(182,136,94,0.06)",
                    }}
                  >
                    <span style={{ color: "var(--cream-dim)", opacity: 0.58 }}>{purchase.date}</span>
                    <span>{supplier?.name ?? "Supplier"}</span>
                    <div className="min-w-0">
                      <p className="truncate">{purchase.item}</p>
                      <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.52 }}>
                        {purchase.purchaseType} - {purchase.quantityLabel}
                      </p>
                    </div>
                    <StatusPill label={getPurchaseStatus(purchase)} />
                    <span className="text-right font-semibold">{money(purchase.totalAmount)}</span>
                    <span className="text-right" style={{ color: "#fbbf24" }}>
                      {money(purchase.paidAmount)}
                    </span>
                    <span className="text-right" style={{ color: unpaid > 0 ? "#f87171" : "#4ade80" }}>
                      {money(unpaid)}
                    </span>
                    <span style={{ color: "var(--cream-dim)", opacity: 0.62 }}>{purchase.paymentMethod}</span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 px-4 py-4 lg:hidden">
              {purchases.map((purchase) => {
                const supplier = suppliers.find((item) => item.id === purchase.supplierId);
                const unpaid = getPurchaseUnpaidBalance(purchase);
                return (
                  <article
                    key={purchase.id}
                    className="rounded-lg p-3"
                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(182,136,94,0.08)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>
                          {purchase.item}
                        </p>
                        <p className="mt-1 text-[11.5px]" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>
                          {supplier?.name ?? "Supplier"} - {purchase.purchaseType} - {purchase.quantityLabel}
                        </p>
                      </div>
                      <StatusPill label={getPurchaseStatus(purchase)} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
                      <div>
                        <p style={{ color: "var(--cream-dim)", opacity: 0.52 }}>Total</p>
                        <p className="font-semibold" style={{ color: "var(--cream)" }}>
                          {money(purchase.totalAmount)}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: "var(--cream-dim)", opacity: 0.52 }}>Paid</p>
                        <p className="font-semibold" style={{ color: "#fbbf24" }}>
                          {money(purchase.paidAmount)}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: "var(--cream-dim)", opacity: 0.52 }}>Unpaid</p>
                        <p className="font-semibold" style={{ color: unpaid > 0 ? "#f87171" : "#4ade80" }}>
                          {money(unpaid)}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </Surface>

          <Note tone="blue">
            Paid purchase cash outflow uses the full paid amount. If paid amount is above purchase total, the extra becomes supplier credit / advance.
          </Note>
        </div>
      )}

      {activeTab === "expenses" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard label="Operating Expenses" value={money(financials.operatingExpenses)} tone="red" icon={TrendingDown} />
            <KpiCard label="Net Profit Formula" value="GP - OpEx" caption="Purchases are excluded." tone="gold" icon={Calculator} />
            <KpiCard label="Expense Count" value={String(expenses.length)} tone="blue" icon={Receipt} />
          </div>

          <Surface
            title="Operating Expenses"
            caption="These are the only non-COGS expenses that reduce net profit in this mock."
            icon={Calculator}
            right={<ActionButton icon={Plus} onClick={() => setDrawer({ type: "expense" })} title="Add operating expense">Add Expense</ActionButton>}
          >
            <div className="divide-y" style={{ borderColor: "rgba(182,136,94,0.06)" }}>
              {expenses.map((expense) => (
                <div key={expense.id} className="grid grid-cols-1 gap-3 px-5 py-3.5 md:grid-cols-[1fr_1.1fr_1.4fr_0.8fr_0.8fr] md:items-center">
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>
                      {expense.category}
                    </p>
                    <p className="text-[11.5px]" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
                      {expense.date}
                    </p>
                  </div>
                  <p className="text-[12.5px]" style={{ color: "var(--cream-dim)", opacity: 0.72 }}>
                    {expense.vendor}
                  </p>
                  <p className="text-[12.5px]" style={{ color: "var(--cream)" }}>
                    {expense.description}
                  </p>
                  <div className="text-[12.5px]" style={{ color: "var(--cream-dim)", opacity: 0.58 }}>
                    <p>{expense.method}</p>
                  </div>
                  <p className="text-left text-[13px] font-semibold md:text-right" style={{ color: "#f87171" }}>
                    -{money(expense.amount)}
                  </p>
                </div>
              ))}
            </div>
          </Surface>
        </div>
      )}

      {activeTab === "suppliers" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard label="Supplier Payables" value={money(financials.supplierPayables)} tone="amber" icon={CreditCard} />
            <KpiCard label="Supplier Payments" value={money(financials.supplierPayments)} tone="red" icon={Banknote} />
            <KpiCard label="Open Suppliers" value={String(financials.supplierSummaries.filter((supplier) => supplier.payableBalance > 0).length)} tone="blue" icon={Landmark} />
          </div>

          <Surface
            title="Supplier Balances"
            caption="Balance equals unpaid purchase balances minus supplier payments."
            icon={CreditCard}
            right={<ActionButton icon={CreditCard} onClick={() => openPaymentDrawer()} title="Pay supplier">Pay Supplier</ActionButton>}
          >
            <div className="grid grid-cols-1 gap-3 px-5 py-5 lg:grid-cols-3">
              {financials.supplierSummaries.map((supplier) => (
                <article
                  key={supplier.supplierId}
                  className="rounded-lg p-4"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(182,136,94,0.08)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold" style={{ color: "var(--cream)" }}>
                        {supplier.name}
                      </p>
                      <p className="mt-1 text-[11.5px]" style={{ color: "var(--cream-dim)", opacity: 0.56 }}>
                        {supplier.category} - {supplier.purchaseCount} purchase(s)
                      </p>
                    </div>
                    <TonePill label={supplier.payableBalance > 0 ? "Open" : "Clear"} tone={supplier.payableBalance > 0 ? "amber" : "green"} />
                  </div>
                  <div className="mt-4 space-y-2 text-[12px]">
                    <div className="flex justify-between gap-3">
                      <span style={{ color: "var(--cream-dim)", opacity: 0.58 }}>Unpaid purchases</span>
                      <span style={{ color: "var(--cream)" }}>{money(supplier.unpaidPurchaseBalance)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span style={{ color: "var(--cream-dim)", opacity: 0.58 }}>Supplier payments</span>
                      <span style={{ color: "#f87171" }}>-{money(supplier.supplierPayments)}</span>
                    </div>
                    {supplier.purchaseCreditAdvance > 0 && (
                      <div className="flex justify-between gap-3">
                        <span style={{ color: "var(--cream-dim)", opacity: 0.58 }}>Purchase advance</span>
                        <span style={{ color: "#60a5fa" }}>{money(supplier.purchaseCreditAdvance)}</span>
                      </div>
                    )}
                    {supplier.supplierCreditAdvance > 0 && (
                      <div className="flex justify-between gap-3">
                        <span style={{ color: "var(--cream-dim)", opacity: 0.58 }}>Supplier credit</span>
                        <span style={{ color: "#60a5fa" }}>{money(supplier.supplierCreditAdvance)}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-3 pt-2" style={{ borderTop: "1px solid rgba(182,136,94,0.08)" }}>
                      <span className="font-semibold" style={{ color: "var(--cream)" }}>Payable balance</span>
                      <span className="font-bold" style={{ color: supplier.payableBalance > 0 ? "#fbbf24" : "#4ade80" }}>
                        {money(supplier.payableBalance)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <IconButton
                      icon={FileText}
                      title={`Open supplier statement for ${supplier.name}`}
                      onClick={() => setDrawer({ type: "supplier", supplierId: supplier.supplierId })}
                    />
                    <IconButton
                      icon={CreditCard}
                      title={`Pay ${supplier.name}`}
                      tone="blue"
                      onClick={() => openPaymentDrawer(supplier.supplierId)}
                    />
                  </div>
                </article>
              ))}
            </div>
          </Surface>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <KpiCard label="Inflows" value={money(financials.cashInflows)} tone="green" icon={ArrowUpRight} />
            <KpiCard label="Outflows" value={money(financials.cashOutflows)} tone="red" icon={ArrowDownRight} />
            <KpiCard label="Cash Position" value={money(financials.cashPosition)} tone="gold" icon={Wallet} />
            <KpiCard label="Neutral / Adjustments" value={String(financials.neutralAdjustments)} tone="blue" icon={Activity} />
          </div>

          <Surface
            title="Financial Activity"
            caption="Business cash movement timeline only. This is not a formal journal entry system."
            icon={Activity}
            right={
              <div className="flex flex-wrap gap-2">
                {(["All", "Inflow", "Outflow", "Neutral"] as const).map((filter) => {
                  const active = activityFilter === filter;
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActivityFilter(filter)}
                      className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold"
                      style={{
                        color: active ? "var(--gold)" : "var(--cream-dim)",
                        background: active ? "rgba(182,136,94,0.14)" : "rgba(255,255,255,0.025)",
                        border: active ? "1px solid rgba(182,136,94,0.28)" : "1px solid rgba(182,136,94,0.08)",
                      }}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>
            }
          >
            <div className="divide-y" style={{ borderColor: "rgba(182,136,94,0.06)" }}>
              {filteredActivity.map((entry) => {
                const style = STATUS_STYLE[entry.kind];
                return (
                  <div key={entry.id} className="grid grid-cols-1 gap-3 px-5 py-3.5 md:grid-cols-[0.9fr_1fr_2fr_1fr] md:items-center">
                    <div>
                      <p className="font-mono text-[11.5px]" style={{ color: "var(--cream-dim)", opacity: 0.58 }}>
                        {entry.date}
                      </p>
                      <p className="mt-1">
                        <StatusPill label={entry.kind} />
                      </p>
                    </div>
                    <p className="text-[12.5px] font-semibold" style={{ color: "var(--cream)" }}>
                      {entry.source}
                    </p>
                    <div>
                      <p className="text-[12.5px] font-semibold" style={{ color: "var(--cream)" }}>
                        {entry.label}
                      </p>
                      <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: "var(--cream-dim)", opacity: 0.58 }}>
                        {entry.detail}
                      </p>
                    </div>
                    <p className="text-left text-[13px] font-bold md:text-right" style={{ color: style.color }}>
                      {entry.kind === "Neutral" ? money(entry.amount) : signedMoney(entry.kind === "Inflow" ? entry.amount : -entry.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          </Surface>
        </div>
      )}

      <Drawer
        open={drawer.type === "purchase"}
        title="Add Purchase"
        caption="Adds an inventory purchase to Accounting mock only. Paid amount affects cash; unpaid balance affects payables."
        onClose={closeDrawer}
      >
        <form className="space-y-4" onSubmit={handleAddPurchase}>
          {purchaseError && <Note tone="red">{purchaseError}</Note>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Supplier">
              <StyledSelect
                value={purchaseForm.supplierId}
                options={suppliers.map((supplier) => ({
                  value: supplier.id,
                  label: supplier.name,
                  meta: `${supplier.category} - ${supplier.terms}`,
                }))}
                placeholder="Choose supplier"
                ariaLabel="Choose purchase supplier"
                onChange={(value) => setPurchaseForm((current) => ({ ...current, supplierId: value }))}
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={purchaseForm.date}
                onChange={(event) => setPurchaseForm((current) => ({ ...current, date: event.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={inputStyle()}
              />
            </Field>
            <Field label="Reference / Invoice No. (optional)">
              <input
                value={purchaseForm.reference}
                onChange={(event) => setPurchaseForm((current) => ({ ...current, reference: event.target.value }))}
                placeholder="Optional - can be added later"
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={inputStyle()}
              />
            </Field>
            <Field label="Purchase Type">
              <StyledSelect
                value={purchaseForm.purchaseType}
                options={PURCHASE_TYPES.map((type) => ({ value: type, label: type }))}
                placeholder="Choose purchase type"
                ariaLabel="Choose purchase type"
                onChange={(value) => setPurchaseForm((current) => ({ ...current, purchaseType: value }))}
              />
            </Field>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border p-3" style={{ borderColor: "rgba(182,136,94,0.10)", background: "rgba(255,255,255,0.018)" }}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px]" style={{ color: "var(--cream-dim)", opacity: 0.62 }}>
                Suppliers are managed financially here. Future backend can sync them with Inventory/Suppliers.
              </p>
              <button
                type="button"
                title="Add New Supplier"
                onClick={() => setShowNewSupplierForm((current) => !current)}
                className="rounded-lg px-3 py-2 text-[12px] font-semibold"
                style={{ color: "var(--gold)", border: "1px solid rgba(182,136,94,0.20)", background: "rgba(182,136,94,0.10)" }}
              >
                Add New Supplier
              </button>
            </div>
            {showNewSupplierForm && (
              <div className="space-y-3 rounded-lg border p-3" style={{ borderColor: "rgba(182,136,94,0.12)", background: "rgba(0,0,0,0.16)" }}>
                {supplierError && <Note tone="red">{supplierError}</Note>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Supplier Name">
                    <input
                      value={supplierForm.name}
                      onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="e.g. New bean importer"
                      className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                      style={inputStyle()}
                    />
                  </Field>
                  <Field label="Phone / WhatsApp (optional)">
                    <input
                      value={supplierForm.contact}
                      onChange={(event) => setSupplierForm((current) => ({ ...current, contact: event.target.value }))}
                      placeholder="0100 000 0000"
                      className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                      style={inputStyle()}
                    />
                  </Field>
                  <Field label="Supplier Type">
                    <StyledSelect
                      value={supplierForm.category}
                      options={SUPPLIER_CATEGORIES.map((category) => ({ value: category, label: category }))}
                      placeholder="Choose supplier type"
                      ariaLabel="Choose new supplier type"
                      onChange={(value) => setSupplierForm((current) => ({ ...current, category: value }))}
                    />
                  </Field>
                  <Field label="Notes (optional)">
                    <input
                      value={supplierForm.notes}
                      onChange={(event) => setSupplierForm((current) => ({ ...current, notes: event.target.value }))}
                      placeholder="Payment terms or relationship note"
                      className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                      style={inputStyle()}
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={handleAddSupplier}
                  className="rounded-lg px-3 py-2 text-[12px] font-semibold"
                  style={{ color: "#120d09", background: "var(--gold)" }}
                >
                  Save Supplier
                </button>
              </div>
            )}
          </div>

          {purchaseForm.purchaseType === "Finished Product Units" && (
            <div className="space-y-3 rounded-lg border p-3" style={{ borderColor: "rgba(182,136,94,0.10)", background: "rgba(255,255,255,0.018)" }}>
              <Field label="Purchase Target">
                <StyledSelect
                  value={purchaseForm.purchaseTarget}
                  options={PURCHASE_TARGETS.map((target) => ({ value: target, label: target }))}
                  placeholder="Choose purchase target"
                  ariaLabel="Choose purchase target"
                  onChange={(value) => setPurchaseForm((current) => ({ ...current, purchaseTarget: value }))}
                />
              </Field>
              {purchaseForm.purchaseTarget === "Existing Product" && (
                <Field label="Product">
                  <StyledSelect
                    value={purchaseForm.productSlug}
                    options={PRODUCT_OPTIONS}
                    placeholder="Choose product"
                    ariaLabel="Choose finished product"
                    onChange={(value) => setPurchaseForm((current) => ({ ...current, productSlug: value }))}
                  />
                </Field>
              )}
              {purchaseForm.purchaseTarget === "New Product Draft" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Product Name">
                      <input
                        value={purchaseForm.draftProductName}
                        onChange={(event) => setPurchaseForm((current) => ({ ...current, draftProductName: event.target.value }))}
                        placeholder="e.g. Ramadan Blend"
                        className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                        style={inputStyle()}
                      />
                    </Field>
                    <Field label="Category Selection">
                      <StyledSelect
                        value={purchaseForm.draftCategoryMode}
                        options={DRAFT_CATEGORY_MODES.map((mode) => ({ value: mode, label: mode }))}
                        placeholder="Choose category mode"
                        ariaLabel="Choose draft category mode"
                        onChange={(value) => setPurchaseForm((current) => ({ ...current, draftCategoryMode: value }))}
                      />
                    </Field>
                    {purchaseForm.draftCategoryMode === "Existing Category" ? (
                      <Field label="Existing Category">
                        <StyledSelect
                          value={purchaseForm.draftExistingCategory}
                          options={categoryOptions.map((category) => ({ value: category, label: category }))}
                          placeholder="Choose category"
                          ariaLabel="Choose product draft category"
                          onChange={(value) => setPurchaseForm((current) => ({ ...current, draftExistingCategory: value }))}
                        />
                      </Field>
                    ) : (
                      <Field label="New Draft / Hidden Category">
                        <input
                          value={purchaseForm.draftCategoryName}
                          onChange={(event) => setPurchaseForm((current) => ({ ...current, draftCategoryName: event.target.value }))}
                          placeholder="e.g. Seasonal Drafts"
                          className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                          style={inputStyle()}
                        />
                      </Field>
                    )}
                    <Field label="Visibility">
                      <StyledSelect
                        value={purchaseForm.draftVisibility}
                        options={DRAFT_VISIBILITIES.map((visibility) => ({ value: visibility, label: visibility }))}
                        placeholder="Choose visibility"
                        ariaLabel="Choose draft visibility"
                        onChange={(value) => setPurchaseForm((current) => ({ ...current, draftVisibility: value }))}
                      />
                    </Field>
                  </div>
                  <Note tone="blue">Future backend can create a Product Draft in Products from this purchase.</Note>
                  <Note tone="amber">Final category management belongs to Products. This category is mock-local and hidden for now.</Note>
                </div>
              )}
              {purchaseForm.purchaseTarget === "Stock Only / Not for Sale Yet" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Internal Stock Item Name">
                      <input
                        value={purchaseForm.stockItemName}
                        onChange={(event) => setPurchaseForm((current) => ({ ...current, stockItemName: event.target.value }))}
                        placeholder="e.g. Private roast trial"
                        className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                        style={inputStyle()}
                      />
                    </Field>
                    <Field label="Internal Category (optional)">
                      <input
                        value={purchaseForm.stockInternalCategory}
                        onChange={(event) => setPurchaseForm((current) => ({ ...current, stockInternalCategory: event.target.value }))}
                        placeholder="e.g. Test batch"
                        className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                        style={inputStyle()}
                      />
                    </Field>
                  </div>
                  <Note tone="blue">Use this when stock should be recorded but not shown for sale.</Note>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="250g Quantity">
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.qty250g}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, qty250g: event.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={inputStyle()}
                  />
                </Field>
                <Field label="500g Quantity">
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.qty500g}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, qty500g: event.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={inputStyle()}
                  />
                </Field>
                <Field label="1kg Quantity">
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.qty1kg}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, qty1kg: event.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={inputStyle()}
                  />
                </Field>
                <Field label="250g Unit Cost">
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.cost250g}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, cost250g: event.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={inputStyle()}
                  />
                </Field>
                <Field label="500g Unit Cost">
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.cost500g}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, cost500g: event.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={inputStyle()}
                  />
                </Field>
                <Field label="1kg Unit Cost">
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.cost1kg}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, cost1kg: event.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={inputStyle()}
                  />
                </Field>
              </div>
            </div>
          )}

          {purchaseForm.purchaseType === "Espresso Beans KG" && (
            <div className="space-y-3 rounded-lg border p-3" style={{ borderColor: "rgba(182,136,94,0.10)", background: "rgba(255,255,255,0.018)" }}>
              <Field label="Bean">
                <StyledSelect
                  value={purchaseForm.beanName}
                  options={BEAN_OPTIONS}
                  placeholder="Choose bean"
                  ariaLabel="Choose bean"
                  onChange={(value) => setPurchaseForm((current) => ({ ...current, beanName: value }))}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="KG Quantity">
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.beanKgQuantity}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, beanKgQuantity: event.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={inputStyle()}
                  />
                </Field>
                <Field label="Cost Per KG">
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.beanCostPerKg}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, beanCostPerKg: event.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={inputStyle()}
                  />
                </Field>
              </div>
            </div>
          )}

          {purchaseForm.purchaseType === "Packaging Units" && (
            <div className="space-y-3 rounded-lg border p-3" style={{ borderColor: "rgba(182,136,94,0.10)", background: "rgba(255,255,255,0.018)" }}>
              <Note tone="blue">Packaging stock belongs in Purchases, not Expenses.</Note>
              <Field label="Packaging Item">
                <StyledSelect
                  value={purchaseForm.packagingItem}
                  options={PACKAGING_OPTIONS}
                  placeholder="Choose packaging item"
                  ariaLabel="Choose packaging item"
                  onChange={(value) => setPurchaseForm((current) => ({ ...current, packagingItem: value }))}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Units Quantity">
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.packagingQuantity}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, packagingQuantity: event.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={inputStyle()}
                  />
                </Field>
                <Field label="Cost Per Unit">
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.packagingUnitCost}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, packagingUnitCost: event.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={inputStyle()}
                  />
                </Field>
              </div>
            </div>
          )}

          {purchaseForm.purchaseType === "Other" && (
            <div className="space-y-3 rounded-lg border p-3" style={{ borderColor: "rgba(182,136,94,0.10)", background: "rgba(255,255,255,0.018)" }}>
              <Field label="Item Name">
                <input
                  value={purchaseForm.otherItem}
                  onChange={(event) => setPurchaseForm((current) => ({ ...current, otherItem: event.target.value }))}
                  placeholder="e.g. Scale repair kit"
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                  style={inputStyle()}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Quantity">
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.otherQuantity}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, otherQuantity: event.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={inputStyle()}
                  />
                </Field>
                <Field label="Unit Cost">
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.otherUnitCost}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, otherUnitCost: event.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={inputStyle()}
                  />
                </Field>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div
              className="rounded-lg px-3 py-2"
              style={{ background: "rgba(182,136,94,0.10)", border: "1px solid rgba(182,136,94,0.20)" }}
            >
              <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
                Auto-calculated total
              </p>
              <p className="mt-1 text-[15px] font-bold" style={{ color: "var(--gold)" }}>
                {money(purchaseTotal)}
              </p>
            </div>
            <Field label="Paid Amount">
              <input
                type="number"
                min="0"
                value={purchaseForm.paidAmount}
                onChange={(event) => setPurchaseForm((current) => ({ ...current, paidAmount: event.target.value }))}
                placeholder="0"
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={inputStyle()}
              />
            </Field>
            <Field label="Payment Method">
              <StyledSelect
                value={purchaseForm.paymentMethod}
                options={PURCHASE_METHODS.map((method) => ({ value: method, label: method }))}
                placeholder="Choose payment method"
                ariaLabel="Choose purchase payment method"
                onChange={(value) => setPurchaseForm((current) => ({ ...current, paymentMethod: value }))}
              />
            </Field>
          </div>
          <Field label="Note">
            <textarea
              value={purchaseForm.note}
              onChange={(event) => setPurchaseForm((current) => ({ ...current, note: event.target.value }))}
              rows={3}
              className="w-full resize-none rounded-lg px-3 py-2 text-[13px] outline-none"
              style={inputStyle()}
            />
          </Field>
          {purchaseAdvanceAmount > 0 ? (
            <Note tone="amber">
              Paid amount is {money(purchaseAdvanceAmount)} above this purchase total. If confirmed, the extra amount becomes Supplier Credit / Advance Payment.
            </Note>
          ) : (
            <Note tone="blue">
              Paid amount covers this purchase first. Any unpaid balance stays as supplier payable. Extra payment can be confirmed as supplier credit.
            </Note>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="rounded-lg px-4 py-2 text-[13px] font-semibold"
              style={{ color: "#120d09", background: "var(--gold)" }}
            >
              Save Purchase
            </button>
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-white/[0.04]"
              style={{ color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.12)" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={drawer.type === "expense"}
        title="Add Expense"
        caption="Use this for operating expenses only. Stock, beans, products, and packaging belong in Purchases."
        onClose={closeDrawer}
      >
        <form className="space-y-4" onSubmit={handleAddExpense}>
          {expenseError && <Note tone="red">{expenseError}</Note>}
          <Note tone="blue">
            Use this for rent, salaries, ads, utilities, maintenance, delivery fees, and non-stock costs. Use Purchases for products, beans, and packaging stock.
          </Note>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date">
              <input
                type="date"
                value={expenseForm.date}
                onChange={(event) => setExpenseForm((current) => ({ ...current, date: event.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={inputStyle()}
              />
            </Field>
            <Field label="Category">
              <StyledSelect
                value={expenseForm.category}
                options={EXPENSE_CATEGORIES.map((category) => ({ value: category, label: category }))}
                placeholder="Choose category"
                ariaLabel="Choose expense category"
                onChange={(value) => setExpenseForm((current) => ({ ...current, category: value }))}
              />
            </Field>
          </div>
          <Field label="Paid To / Payee">
            <input
              value={expenseForm.vendor}
              onChange={(event) => setExpenseForm((current) => ({ ...current, vendor: event.target.value }))}
              placeholder="Landlord, Electricity company, Facebook Ads, Delivery partner, Maintenance technician, Designer"
              className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
              style={inputStyle()}
            />
          </Field>
          <Field label="Note (optional)">
            <input
              value={expenseForm.description}
              onChange={(event) => setExpenseForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Short reason for the expense"
              className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
              style={inputStyle()}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Amount">
              <input
                type="number"
                min="0"
                value={expenseForm.amount}
                onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="0"
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={inputStyle()}
              />
            </Field>
            <Field label="Method">
              <StyledSelect
                value={expenseForm.method}
                options={EXPENSE_METHODS.map((method) => ({ value: method, label: method }))}
                placeholder="Choose method"
                ariaLabel="Choose expense payment method"
                onChange={(value) => setExpenseForm((current) => ({ ...current, method: value }))}
              />
            </Field>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="rounded-lg px-4 py-2 text-[13px] font-semibold"
              style={{ color: "#120d09", background: "var(--gold)" }}
            >
              Save Expense
            </button>
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-white/[0.04]"
              style={{ color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.12)" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={drawer.type === "payment"}
        title="Pay Supplier"
        caption="Use this when you paid money to a supplier against an existing balance."
        onClose={closeDrawer}
      >
        <form className="space-y-4" onSubmit={handleRecordPayment}>
          {paymentError && <Note tone="red">{paymentError}</Note>}
          <Field label="Supplier">
            <StyledSelect
              value={paymentForm.supplierId}
              options={financials.supplierSummaries.map((supplier) => ({
                value: supplier.supplierId,
                label: supplier.name,
                meta: `Payable ${money(supplier.payableBalance)}${
                  supplier.supplierCreditAdvance > 0 ? ` - credit ${money(supplier.supplierCreditAdvance)}` : ""
                }`,
              }))}
              placeholder="Choose supplier"
              ariaLabel="Choose supplier payment supplier"
              onChange={(value) => setPaymentForm((current) => ({ ...current, supplierId: value }))}
            />
          </Field>
          {selectedPaymentSupplier && (
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Total Purchases" value={money(selectedPaymentSupplier.purchaseTotal)} tone="blue" />
              <KpiCard label="Previous Payments" value={money(selectedPaymentSupplier.supplierPayments)} tone="green" />
              <KpiCard label="Current Payable Balance" value={money(selectedPaymentSupplier.payableBalance)} tone={selectedPaymentSupplier.payableBalance > 0 ? "amber" : "green"} />
              <KpiCard label="Supplier Credit / Advance" value={money(selectedPaymentSupplier.supplierCreditAdvance)} tone={selectedPaymentSupplier.supplierCreditAdvance > 0 ? "blue" : "cream"} />
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date">
              <input
                type="date"
                value={paymentForm.date}
                onChange={(event) => setPaymentForm((current) => ({ ...current, date: event.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={inputStyle()}
              />
            </Field>
            <Field label="Optional Reference">
              <input
                value={paymentForm.reference}
                onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))}
                placeholder="Optional - can be added later"
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={inputStyle()}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Payment Amount">
              <input
                type="number"
                min="0"
                value={paymentForm.amount}
                onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="0"
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={inputStyle()}
              />
            </Field>
            <Field label="Paid From">
              <StyledSelect
                value={paymentForm.method}
                options={SUPPLIER_PAYMENT_METHODS.map((method) => ({ value: method, label: method }))}
                placeholder="Choose paid from"
                ariaLabel="Choose supplier payment method"
                onChange={(value) => setPaymentForm((current) => ({ ...current, method: value }))}
              />
            </Field>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: "rgba(182,136,94,0.12)", background: "rgba(255,255,255,0.018)" }}>
            <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.52 }}>
              Remaining Balance Preview
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 text-[12.5px] sm:grid-cols-3">
              <div>
                <p style={{ color: "var(--cream-dim)", opacity: 0.55 }}>Current Balance</p>
                <p className="mt-1 font-semibold" style={{ color: "var(--cream)" }}>
                  {money(selectedPaymentSupplier?.payableBalance ?? 0)}
                </p>
              </div>
              <div>
                <p style={{ color: "var(--cream-dim)", opacity: 0.55 }}>Payment Now</p>
                <p className="mt-1 font-semibold" style={{ color: "#f87171" }}>
                  -{money(paymentAmount)}
                </p>
              </div>
              <div>
                <p style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
                  {paymentExtraCredit > 0 ? "Supplier Credit / Advance" : "Remaining Balance"}
                </p>
                <p className="mt-1 font-semibold" style={{ color: paymentExtraCredit > 0 ? "#60a5fa" : paymentRemainingBalance <= 0 ? "#4ade80" : "#fbbf24" }}>
                  {paymentExtraCredit > 0 ? money(paymentExtraCredit) : money(Math.max(paymentRemainingBalance, 0))}
                </p>
              </div>
            </div>
          </div>
          <Field label="Note">
            <textarea
              value={paymentForm.note}
              onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))}
              rows={3}
              className="w-full resize-none rounded-lg px-3 py-2 text-[13px] outline-none"
              style={inputStyle()}
            />
          </Field>
          {paymentExtraCredit > 0 ? (
            <Note tone="amber">
              You are paying more than the current supplier balance. The extra {money(paymentExtraCredit)} will be recorded as Supplier Credit / Advance Payment after confirmation.
            </Note>
          ) : (
            <Note tone="blue">This payment reduces the selected supplier balance locally and records the full amount as a cash outflow.</Note>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="rounded-lg px-4 py-2 text-[13px] font-semibold"
              style={{ color: "#120d09", background: "var(--gold)" }}
            >
              Pay Supplier
            </button>
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-white/[0.04]"
              style={{ color: "var(--cream-dim)", border: "1px solid rgba(182,136,94,0.12)" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={drawer.type === "supplier"}
        title={selectedSupplier ? `${selectedSupplier.name} Statement` : "Supplier Statement"}
        caption="Purchases increase local payable balance. Supplier payments reduce it."
        onClose={closeDrawer}
      >
        {selectedSupplier && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <KpiCard label="Unpaid Purchases" value={money(selectedSupplier.unpaidPurchaseBalance)} tone="red" />
              <KpiCard label="Payments" value={money(selectedSupplier.supplierPayments)} tone="green" />
              <KpiCard label="Payable" value={money(selectedSupplier.payableBalance)} tone="gold" />
              <KpiCard label="Credit / Advance" value={money(selectedSupplier.supplierCreditAdvance)} tone={selectedSupplier.supplierCreditAdvance > 0 ? "blue" : "cream"} />
            </div>
            <div className="rounded-lg border" style={{ borderColor: "rgba(182,136,94,0.10)" }}>
              {getSupplierStatementRows(selectedSupplier.supplierId, purchases, supplierPayments).map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 gap-2 px-4 py-3 text-[12.5px] sm:grid-cols-[0.8fr_1.5fr_0.9fr_0.9fr]"
                  style={{ borderBottom: "1px solid rgba(182,136,94,0.06)" }}
                >
                  <span className="font-mono text-[11.5px]" style={{ color: "var(--cream-dim)", opacity: 0.58 }}>
                    {row.date}
                  </span>
                  <div>
                    <p className="font-semibold" style={{ color: "var(--cream)" }}>
                      {row.label}
                    </p>
                    <p className="mt-1" style={{ color: "var(--cream-dim)", opacity: 0.58 }}>
                      {row.detail}
                    </p>
                    <p className="mt-1 text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.48 }}>
                      {row.meta}
                    </p>
                  </div>
                  <span className="font-semibold sm:text-right" style={{ color: row.delta >= 0 ? "#fbbf24" : "#4ade80" }}>
                    {signedMoney(row.delta)}
                  </span>
                  <span className="font-bold sm:text-right" style={{ color: row.runningBalance < 0 ? "#60a5fa" : "var(--gold)" }}>
                    {payableOrCredit(row.runningBalance)}
                  </span>
                </div>
              ))}
            </div>
            <ActionButton icon={CreditCard} onClick={() => openPaymentDrawer(selectedSupplier.supplierId)} title="Pay this supplier">
              Pay Supplier
            </ActionButton>
          </div>
        )}
      </Drawer>
      <ConfirmationDialog
        open={Boolean(pendingConfirmation)}
        title="Confirm Supplier Credit"
        message={pendingConfirmation?.message ?? ""}
        confirmLabel="Continue"
        onCancel={() => setPendingConfirmation(null)}
        onConfirm={() => {
          if (pendingConfirmation?.type === "purchase-overpay") {
            savePurchaseFromForm();
          }
          if (pendingConfirmation?.type === "supplier-overpay") {
            saveSupplierPaymentFromForm();
          }
        }}
      />
    </div>
  );
}

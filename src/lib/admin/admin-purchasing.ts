"use client";

// Line Coffee V3 — Admin Purchasing data layer (Phase 4)
//
// Foundation for stock inputs and cost: suppliers, purchase receipts (header +
// line items), supplier payment state, finished-product inventory lots, and
// operating expenses. Backed by migration
// 20260630120000_phase4_purchasing_suppliers_expenses_lots.
//
// Access model (admin-only): every table here is gated by `is_admin()` RLS. No
// anon / customer can read supplier, cost, purchase, lot, or expense data.
//   * suppliers + expenses: direct admin CRUD through RLS.
//   * purchases / purchase_items / inventory_lots / supplier_payments: READ
//     directly; WRITES go through the SECURITY DEFINER RPCs (server-computed
//     totals + atomic lot/stock effects), exactly like create_admin_product /
//     create_checkout_order.
//
// Phase 4 boundary: receiving a purchase increases the live Phase-1
// `inventory_stock.available_kg` and records a `purchase_receive` movement +
// inventory lots. It does NOT consume lots — there is NO FIFO deduction here
// (that is Phase 5). Phase 1's reserve/deduct lifecycle is untouched.

import { supabase } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types (data-layer read/return shapes — the live contracts the UI consumes)
// ---------------------------------------------------------------------------

export type SupplierStatus = "active" | "inactive";

export type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string | null;
};

export type SupplierInput = {
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  status?: SupplierStatus;
};

export type PurchaseStatus = "draft" | "received" | "cancelled";
export type PurchasePaymentStatus = "unpaid" | "partial" | "paid";

export type PurchaseSummary = {
  id: string;
  supplierId: string;
  supplierName: string;
  reference: string | null;
  status: PurchaseStatus;
  purchaseDate: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: PurchasePaymentStatus;
  receivedAt: string | null;
  itemCount: number;
  createdAt: string;
};

export type PurchaseItem = {
  id: string;
  productId: string;
  productName: string | null;
  quantityKg: number;
  unitCost: number;
  lineCost: number;
};

export type SupplierPayment = {
  id: string;
  supplierId: string;
  purchaseId: string | null;
  amount: number;
  method: string | null;
  notes: string | null;
  paidAt: string;
  createdAt: string;
};

export type PurchaseDetail = PurchaseSummary & {
  notes: string | null;
  items: PurchaseItem[];
  payments: SupplierPayment[];
  updatedAt: string | null;
};

export type InventoryLotStatus = "open" | "closed";

export type InventoryLot = {
  id: string;
  productId: string;
  purchaseId: string | null;
  purchaseItemId: string | null;
  supplierId: string | null;
  receivedQtyKg: number;
  remainingQtyKg: number;
  unitCost: number;
  receivedDate: string;
  status: InventoryLotStatus;
  createdAt: string;
  updatedAt: string | null;
};

export type Expense = {
  id: string;
  expenseDate: string;
  category: string;
  amount: number;
  paymentMethod: string | null;
  notes: string | null;
  attachmentUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type ExpenseInput = {
  expenseDate?: string | null;
  category: string;
  amount: number;
  paymentMethod?: string | null;
  notes?: string | null;
  attachmentUrl?: string | null;
};

export type CreatePurchaseItemInput = {
  productId: string;
  quantityKg: number;
  unitCost: number;
};

export type CreatePurchaseInput = {
  supplierId: string;
  reference?: string | null;
  notes?: string | null;
  purchaseDate?: string | null;
  items: CreatePurchaseItemInput[];
};

export type CreatePurchaseResult = {
  purchaseId: string;
  totalAmount: number;
  itemCount: number;
  status: PurchaseStatus;
};

export type ReceivePurchaseResult = {
  purchaseId: string;
  status: PurchaseStatus;
  lotsCreated: number;
  totalKg: number;
};

export type RecordPurchasePaymentInput = {
  purchaseId: string;
  amount: number;
  method?: string | null;
  notes?: string | null;
  paidAt?: string | null;
};

export type RecordPurchasePaymentResult = {
  purchaseId: string;
  paidAmount: number;
  totalAmount: number;
  paymentStatus: PurchasePaymentStatus;
};

// ---------------------------------------------------------------------------
// Error + boundary helpers
// ---------------------------------------------------------------------------

export class AdminPurchasingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminPurchasingError";
  }
}

function devWarn(scope: string, message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[admin-purchasing:${scope}] ${message}`);
  }
}

function readError(scope: string, message: string) {
  devWarn(scope, message);
  return new AdminPurchasingError("Could not load purchasing data. Please try again.");
}

function writeError(scope: string, message: string) {
  devWarn(scope, message);
  if (message.includes("Admin access required") || message.includes("permission denied")) {
    return new AdminPurchasingError("Admin permission is required.");
  }
  if (message.includes("not found")) {
    return new AdminPurchasingError("That record was not found.");
  }
  if (message.includes("Only a draft purchase can be received")) {
    return new AdminPurchasingError("This purchase has already been received or cancelled.");
  }
  if (message.includes("Only finished products")) {
    return new AdminPurchasingError("Only finished products can be purchased in this phase.");
  }
  return new AdminPurchasingError("Could not save the change. Please try again.");
}

function money(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

// ---------------------------------------------------------------------------
// Row types (raw DB shapes)
// ---------------------------------------------------------------------------

type SupplierRow = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: SupplierStatus;
  created_at: string;
  updated_at: string | null;
};

type PurchaseRow = {
  id: string;
  supplier_id: string;
  reference: string | null;
  notes: string | null;
  status: PurchaseStatus;
  purchase_date: string;
  total_amount: number | string;
  paid_amount: number | string;
  payment_status: PurchasePaymentStatus;
  received_at: string | null;
  created_at: string;
  updated_at: string | null;
  supplier?: { name: string | null } | null;
  purchase_items?: Array<{ id: string }> | null;
};

type PurchaseItemRow = {
  id: string;
  product_id: string;
  product_name: string | null;
  quantity_kg: number | string;
  unit_cost: number | string;
  line_cost: number | string;
};

type SupplierPaymentRow = {
  id: string;
  supplier_id: string;
  purchase_id: string | null;
  amount: number | string;
  method: string | null;
  notes: string | null;
  paid_at: string;
  created_at: string;
};

type InventoryLotRow = {
  id: string;
  product_id: string;
  purchase_id: string | null;
  purchase_item_id: string | null;
  supplier_id: string | null;
  received_qty_kg: number | string;
  remaining_qty_kg: number | string;
  unit_cost: number | string;
  received_date: string;
  status: InventoryLotStatus;
  created_at: string;
  updated_at: string | null;
};

type ExpenseRow = {
  id: string;
  expense_date: string;
  category: string;
  amount: number | string;
  payment_method: string | null;
  notes: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string | null;
};

const SUPPLIER_COLUMNS =
  "id, name, contact_name, phone, email, address, notes, status, created_at, updated_at";
const PURCHASE_COLUMNS =
  "id, supplier_id, reference, notes, status, purchase_date, total_amount, paid_amount, payment_status, received_at, created_at, updated_at";
const PURCHASE_ITEM_COLUMNS =
  "id, product_id, product_name, quantity_kg, unit_cost, line_cost";
const SUPPLIER_PAYMENT_COLUMNS =
  "id, supplier_id, purchase_id, amount, method, notes, paid_at, created_at";
const INVENTORY_LOT_COLUMNS =
  "id, product_id, purchase_id, purchase_item_id, supplier_id, received_qty_kg, remaining_qty_kg, unit_cost, received_date, status, created_at, updated_at";
const EXPENSE_COLUMNS =
  "id, expense_date, category, amount, payment_method, notes, attachment_url, created_at, updated_at";

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPurchaseSummary(row: PurchaseRow): PurchaseSummary {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    supplierName: text(row.supplier?.name) ?? "Unknown supplier",
    reference: row.reference,
    status: row.status,
    purchaseDate: row.purchase_date,
    totalAmount: money(row.total_amount),
    paidAmount: money(row.paid_amount),
    paymentStatus: row.payment_status,
    receivedAt: row.received_at,
    itemCount: (row.purchase_items ?? []).length,
    createdAt: row.created_at,
  };
}

function mapPurchaseItem(row: PurchaseItemRow): PurchaseItem {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    quantityKg: money(row.quantity_kg),
    unitCost: money(row.unit_cost),
    lineCost: money(row.line_cost),
  };
}

function mapSupplierPayment(row: SupplierPaymentRow): SupplierPayment {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    purchaseId: row.purchase_id,
    amount: money(row.amount),
    method: row.method,
    notes: row.notes,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

function mapInventoryLot(row: InventoryLotRow): InventoryLot {
  return {
    id: row.id,
    productId: row.product_id,
    purchaseId: row.purchase_id,
    purchaseItemId: row.purchase_item_id,
    supplierId: row.supplier_id,
    receivedQtyKg: money(row.received_qty_kg),
    remainingQtyKg: money(row.remaining_qty_kg),
    unitCost: money(row.unit_cost),
    receivedDate: row.received_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    expenseDate: row.expense_date,
    category: row.category,
    amount: money(row.amount),
    paymentMethod: row.payment_method,
    notes: row.notes,
    attachmentUrl: row.attachment_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function trimmedOrNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

export async function listSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select(SUPPLIER_COLUMNS)
    .order("name", { ascending: true });

  if (error) throw readError("suppliers", error.message);
  return ((data ?? []) as SupplierRow[]).map(mapSupplier);
}

export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  const name = (input.name ?? "").trim();
  if (!name) throw new AdminPurchasingError("Supplier name is required.");

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name,
      contact_name: trimmedOrNull(input.contactName),
      phone: trimmedOrNull(input.phone),
      email: trimmedOrNull(input.email),
      address: trimmedOrNull(input.address),
      notes: trimmedOrNull(input.notes),
      status: input.status ?? "active",
    })
    .select(SUPPLIER_COLUMNS)
    .single();

  if (error) throw writeError("supplier-create", error.message);
  return mapSupplier(data as SupplierRow);
}

export async function updateSupplier(
  id: string,
  input: SupplierInput,
): Promise<Supplier> {
  if (!id) throw new AdminPurchasingError("Supplier id is required.");
  const name = (input.name ?? "").trim();
  if (!name) throw new AdminPurchasingError("Supplier name is required.");

  const { data, error } = await supabase
    .from("suppliers")
    .update({
      name,
      contact_name: trimmedOrNull(input.contactName),
      phone: trimmedOrNull(input.phone),
      email: trimmedOrNull(input.email),
      address: trimmedOrNull(input.address),
      notes: trimmedOrNull(input.notes),
      ...(input.status ? { status: input.status } : {}),
    })
    .eq("id", id)
    .select(SUPPLIER_COLUMNS)
    .single();

  if (error) throw writeError("supplier-update", error.message);
  return mapSupplier(data as SupplierRow);
}

// ---------------------------------------------------------------------------
// Purchases
// ---------------------------------------------------------------------------

export async function listPurchases(): Promise<PurchaseSummary[]> {
  const { data, error } = await supabase
    .from("purchases")
    .select(`${PURCHASE_COLUMNS}, supplier:suppliers(name), purchase_items(id)`)
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) throw readError("purchases", error.message);
  return ((data ?? []) as unknown as PurchaseRow[]).map(mapPurchaseSummary);
}

export async function getPurchaseDetail(id: string): Promise<PurchaseDetail | null> {
  if (!id) return null;

  const { data, error } = await supabase
    .from("purchases")
    .select(`${PURCHASE_COLUMNS}, supplier:suppliers(name), purchase_items(id)`)
    .eq("id", id)
    .maybeSingle();

  if (error) throw readError("purchase-detail", error.message);
  if (!data) return null;

  const row = data as unknown as PurchaseRow;

  const [itemsResult, paymentsResult] = await Promise.all([
    supabase
      .from("purchase_items")
      .select(PURCHASE_ITEM_COLUMNS)
      .eq("purchase_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("supplier_payments")
      .select(SUPPLIER_PAYMENT_COLUMNS)
      .eq("purchase_id", id)
      .order("paid_at", { ascending: true }),
  ]);

  if (itemsResult.error) throw readError("purchase-items", itemsResult.error.message);
  if (paymentsResult.error) {
    throw readError("purchase-payments", paymentsResult.error.message);
  }

  return {
    ...mapPurchaseSummary(row),
    notes: row.notes,
    updatedAt: row.updated_at,
    items: ((itemsResult.data ?? []) as PurchaseItemRow[]).map(mapPurchaseItem),
    payments: ((paymentsResult.data ?? []) as SupplierPaymentRow[]).map(
      mapSupplierPayment,
    ),
  };
}

export async function createPurchase(
  input: CreatePurchaseInput,
): Promise<CreatePurchaseResult> {
  if (!input.supplierId) throw new AdminPurchasingError("A supplier is required.");
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new AdminPurchasingError("Add at least one purchase item.");
  }
  for (const item of input.items) {
    if (!item.productId) throw new AdminPurchasingError("Each item needs a product.");
    if (!Number.isFinite(item.quantityKg) || item.quantityKg <= 0) {
      throw new AdminPurchasingError("Each item needs a quantity greater than 0.");
    }
    if (!Number.isFinite(item.unitCost) || item.unitCost < 0) {
      throw new AdminPurchasingError("Each item needs a valid unit cost.");
    }
  }

  const { data, error } = await supabase.rpc("create_purchase", {
    p_payload: {
      supplier_id: input.supplierId,
      reference: trimmedOrNull(input.reference),
      notes: trimmedOrNull(input.notes),
      purchase_date: trimmedOrNull(input.purchaseDate),
      items: input.items.map((item) => ({
        product_id: item.productId,
        quantity_kg: item.quantityKg,
        unit_cost: item.unitCost,
      })),
    },
  });

  if (error) throw writeError("purchase-create", error.message);

  const result = data as Partial<{
    purchase_id: string;
    total_amount: number;
    item_count: number;
    status: PurchaseStatus;
  }> | null;
  if (!result || typeof result.purchase_id !== "string") {
    throw new AdminPurchasingError("Creating the purchase returned an invalid response.");
  }
  return {
    purchaseId: result.purchase_id,
    totalAmount: money(result.total_amount),
    itemCount: Number(result.item_count ?? 0),
    status: (result.status as PurchaseStatus) ?? "draft",
  };
}

export async function receivePurchase(
  purchaseId: string,
): Promise<ReceivePurchaseResult> {
  if (!purchaseId) throw new AdminPurchasingError("Purchase id is required.");

  const { data, error } = await supabase.rpc("receive_purchase", {
    p_purchase_id: purchaseId,
  });

  if (error) throw writeError("purchase-receive", error.message);

  const result = data as Partial<{
    purchase_id: string;
    status: PurchaseStatus;
    lots_created: number;
    total_kg: number;
  }> | null;
  if (!result || typeof result.purchase_id !== "string") {
    throw new AdminPurchasingError("Receiving the purchase returned an invalid response.");
  }
  return {
    purchaseId: result.purchase_id,
    status: (result.status as PurchaseStatus) ?? "received",
    lotsCreated: Number(result.lots_created ?? 0),
    totalKg: money(result.total_kg),
  };
}

export async function recordPurchasePayment(
  input: RecordPurchasePaymentInput,
): Promise<RecordPurchasePaymentResult> {
  if (!input.purchaseId) throw new AdminPurchasingError("A purchase is required.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new AdminPurchasingError("Enter a payment amount greater than 0.");
  }

  const { data, error } = await supabase.rpc("record_purchase_payment", {
    p_payload: {
      purchase_id: input.purchaseId,
      amount: Math.round(input.amount * 100) / 100,
      method: trimmedOrNull(input.method),
      notes: trimmedOrNull(input.notes),
      paid_at: trimmedOrNull(input.paidAt),
    },
  });

  if (error) throw writeError("purchase-payment", error.message);

  const result = data as Partial<{
    purchase_id: string;
    paid_amount: number;
    total_amount: number;
    payment_status: PurchasePaymentStatus;
  }> | null;
  if (!result || typeof result.purchase_id !== "string") {
    throw new AdminPurchasingError("Recording the payment returned an invalid response.");
  }
  return {
    purchaseId: result.purchase_id,
    paidAmount: money(result.paid_amount),
    totalAmount: money(result.total_amount),
    paymentStatus: (result.payment_status as PurchasePaymentStatus) ?? "unpaid",
  };
}

// ---------------------------------------------------------------------------
// Inventory lots (read-only foundation — no FIFO consumption in Phase 4)
// ---------------------------------------------------------------------------

export async function listInventoryLots(productId?: string): Promise<InventoryLot[]> {
  let query = supabase
    .from("inventory_lots")
    .select(INVENTORY_LOT_COLUMNS)
    .order("received_date", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(500);

  if (productId) query = query.eq("product_id", productId);

  const { data, error } = await query;
  if (error) throw readError("inventory-lots", error.message);
  return ((data ?? []) as InventoryLotRow[]).map(mapInventoryLot);
}

// ---------------------------------------------------------------------------
// Expenses (never affect stock)
// ---------------------------------------------------------------------------

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select(EXPENSE_COLUMNS)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) throw readError("expenses", error.message);
  return ((data ?? []) as ExpenseRow[]).map(mapExpense);
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const category = (input.category ?? "").trim();
  if (!category) throw new AdminPurchasingError("Expense category is required.");
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new AdminPurchasingError("Enter a valid expense amount.");
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      expense_date: trimmedOrNull(input.expenseDate) ?? undefined,
      category,
      amount: Math.round(input.amount * 100) / 100,
      payment_method: trimmedOrNull(input.paymentMethod),
      notes: trimmedOrNull(input.notes),
      attachment_url: trimmedOrNull(input.attachmentUrl),
    })
    .select(EXPENSE_COLUMNS)
    .single();

  if (error) throw writeError("expense-create", error.message);
  return mapExpense(data as ExpenseRow);
}

"use client";

import { supabase } from "@/lib/supabase/client";
import type {
  OrderChannel,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/types/order";

export type AdminOrderStatus = OrderStatus;

export type AdminOrderSummary = {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  status: AdminOrderStatus;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  itemCount: number;
  placedAt: string;
};

export type AdminOrderItem = {
  id: string;
  kind: string;
  productSlug: string | null;
  variantSize: string | null;
  nameEn: string;
  nameAr: string;
  detailEn: string | null;
  detailAr: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  returnedQuantity: number;
  customData: unknown;
};

export type AdminOrderStatusEvent = {
  id: string;
  status: AdminOrderStatus;
  note: string | null;
  changedBy: string | null;
  changedAt: string;
};

export type AdminOrderDetail = AdminOrderSummary & {
  customerId: string | null;
  customer: {
    name: string;
    email: string;
    phone: string;
    whatsapp: string;
    type: "guest" | "registered";
  };
  address: {
    recipientName: string;
    phone: string;
    whatsapp: string;
    governorate: string;
    city: string;
    area: string;
    street: string;
    building: string;
    floor: string;
    apartment: string;
    landmark: string;
    googleMapsUrl: string;
  };
  type: OrderType;
  channel: OrderChannel;
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  deliveryZone: string | null;
  deliveryNote: string | null;
  deliveryFeeOverridden: boolean;
  promoCode: string | null;
  paymentReference: string | null;
  paymentPhone: string | null;
  customerNote: string | null;
  adminNote: string | null;
  items: AdminOrderItem[];
  events: AdminOrderStatusEvent[];
  updatedAt: string | null;
  // Phase 5 (forward): private order-level COGS snapshot set at delivered from
  // consumed FIFO lot costs (orders.cogs_total). Left undefined until the Phase 5
  // migration (20260630130000) is applied — NOT added to the live ORDER_COLUMNS
  // select, so this read stays valid before the column exists. Wire it into the
  // select + mapDetail once applied (admin-only; never expose to customers).
  cogsTotal?: number | null;
};

export type AdminOrderDeliveryFeeUpdateResult = {
  order_id: string;
  code: string;
  delivery_fee: number;
  total: number;
  delivery_fee_overridden: boolean;
};

export type AdminOrderStatusUpdateResult = {
  order_id: string;
  code: string;
  previous_status: AdminOrderStatus;
  status: AdminOrderStatus;
  no_op: boolean;
};

export type AdminOrderOverview = {
  total: number;
  pending: number;
  shipped: number;
  deliveredUnpaid: number;
};

export const ADMIN_ORDERS_CHANGED_EVENT = "line-admin-orders-changed";

type UnknownRecord = Record<string, unknown>;

type OrderRow = {
  id: string;
  code: string;
  customer_id: string | null;
  customer_snapshot: unknown;
  address_snapshot: unknown;
  customer_name: string;
  customer_whatsapp: string | null;
  status: AdminOrderStatus;
  type: OrderType;
  channel: OrderChannel;
  subtotal: number | string;
  discount_total: number | string;
  delivery_fee: number | string;
  delivery_zone: string | null;
  delivery_note: string | null;
  delivery_fee_overridden: boolean | null;
  total: number | string;
  promo_code: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  payment_phone: string | null;
  placed_at: string;
  updated_at: string | null;
  admin_note: string | null;
  customer_note: string | null;
  order_items?: Array<{ quantity: number }> | null;
};

type OrderItemRow = {
  id: string;
  kind: string;
  product_slug: string | null;
  variant_size: string | null;
  name_en: string;
  name_ar: string;
  detail_en: string | null;
  detail_ar: string | null;
  sku: string | null;
  unit_price: number | string;
  quantity: number;
  line_total: number | string;
  returned_quantity: number | null;
  custom_data: unknown;
};

type StatusEventRow = {
  id: string;
  status: AdminOrderStatus;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
};

const ORDER_COLUMNS = `
  id,
  code,
  customer_id,
  customer_snapshot,
  address_snapshot,
  customer_name,
  customer_whatsapp,
  status,
  type,
  channel,
  subtotal,
  discount_total,
  delivery_fee,
  delivery_zone,
  delivery_note,
  delivery_fee_overridden,
  total,
  promo_code,
  payment_method,
  payment_status,
  payment_reference,
  payment_phone,
  placed_at,
  updated_at,
  admin_note,
  customer_note
`;

const ORDER_ITEM_COLUMNS = `
  id,
  kind,
  product_slug,
  variant_size,
  name_en,
  name_ar,
  detail_en,
  detail_ar,
  sku,
  unit_price,
  quantity,
  line_total,
  returned_quantity,
  custom_data
`;

const STATUS_EVENT_COLUMNS = `
  id,
  status,
  note,
  changed_by,
  changed_at
`;

const VALID_STATUSES = new Set<AdminOrderStatus>([
  "pending",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
]);

export const ADMIN_ORDER_STATUS_LABELS: Record<AdminOrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const ADMIN_PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash_on_delivery: "Cash on Delivery",
  instapay: "InstaPay",
  wallet: "Wallet",
  vodafone_cash: "Vodafone Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  unknown: "Unknown",
};

export const ADMIN_PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  refunded: "Refunded",
  failed: "Failed",
  pending: "Pending",
};

export const OUTSTANDING_PAYMENT_STATUSES: PaymentStatus[] = [
  "unpaid",
  "partially_paid",
  "pending",
  "failed",
];

export const ALLOWED_ADMIN_ORDER_TRANSITIONS: Record<
  AdminOrderStatus,
  AdminOrderStatus[]
> = {
  pending: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export class AdminOrdersError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminOrdersError";
  }
}

function devWarn(scope: string, message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[admin-orders:${scope}] ${message}`);
  }
}

function readError(scope: string, message: string) {
  devWarn(scope, message);
  return new AdminOrdersError("Could not load admin orders. Please try again.");
}

function statusWriteError(message: string) {
  devWarn("status-update", message);
  if (message.includes("Invalid order status transition")) {
    return new AdminOrdersError("That status transition is not allowed.");
  }
  if (message.includes("Inventory reservation")) {
    return new AdminOrdersError(
      "The order inventory reservation is inconsistent. No status change was saved.",
    );
  }
  if (message.includes("Order not found")) {
    return new AdminOrdersError("Order not found.");
  }
  if (message.includes("Admin access required") || message.includes("permission denied")) {
    return new AdminOrdersError("Admin permission is required.");
  }
  return new AdminOrdersError("Could not update the order status. Please try again.");
}

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function money(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapSummary(row: OrderRow, itemCountOverride?: number): AdminOrderSummary {
  const customer = record(row.customer_snapshot);
  const itemCount =
    itemCountOverride ??
    (row.order_items ?? []).reduce(
      (sum, item) => sum + Math.max(0, Number(item.quantity) || 0),
      0,
    );

  return {
    id: row.id,
    code: row.code,
    customerName: row.customer_name || text(customer.name, "Unknown customer"),
    customerPhone:
      text(customer.phone) || text(customer.whatsapp) || row.customer_whatsapp || "",
    customerEmail: text(customer.email),
    status: row.status,
    total: money(row.total),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    itemCount,
    placedAt: row.placed_at,
  };
}

function mapDetail(
  row: OrderRow,
  itemRows: OrderItemRow[],
  eventRows: StatusEventRow[],
): AdminOrderDetail {
  const customer = record(row.customer_snapshot);
  const address = record(row.address_snapshot);
  const items: AdminOrderItem[] = itemRows.map((item) => ({
    id: item.id,
    kind: item.kind,
    productSlug: item.product_slug,
    variantSize: item.variant_size,
    nameEn: item.name_en,
    nameAr: item.name_ar,
    detailEn: item.detail_en,
    detailAr: item.detail_ar,
    sku: item.sku,
    unitPrice: money(item.unit_price),
    quantity: item.quantity,
    lineTotal: money(item.line_total),
    returnedQuantity: Math.max(0, Number(item.returned_quantity) || 0),
    customData: item.custom_data,
  }));

  return {
    ...mapSummary({
      ...row,
      order_items: items.map((item) => ({ quantity: item.quantity })),
    }),
    customerId: row.customer_id,
    customer: {
      name: row.customer_name || text(customer.name, "Unknown customer"),
      email: text(customer.email),
      phone: text(customer.phone),
      whatsapp: text(customer.whatsapp) || row.customer_whatsapp || "",
      type: text(customer.type) === "registered" ? "registered" : "guest",
    },
    address: {
      recipientName: text(address.recipientName),
      phone: text(address.phone),
      whatsapp: text(address.whatsapp),
      governorate: text(address.governorate),
      city: text(address.city),
      area: text(address.area),
      street: text(address.street),
      building: text(address.building),
      floor: text(address.floor),
      apartment: text(address.apartment),
      landmark: text(address.landmark),
      googleMapsUrl: text(address.googleMapsUrl),
    },
    type: row.type,
    channel: row.channel,
    subtotal: money(row.subtotal),
    discountTotal: money(row.discount_total),
    deliveryFee: money(row.delivery_fee),
    deliveryZone: row.delivery_zone,
    deliveryNote: row.delivery_note,
    deliveryFeeOverridden: Boolean(row.delivery_fee_overridden),
    promoCode: row.promo_code,
    paymentReference: row.payment_reference,
    paymentPhone: row.payment_phone,
    customerNote: row.customer_note,
    adminNote: row.admin_note,
    items,
    events: eventRows.map((event) => ({
      id: event.id,
      status: event.status,
      note: event.note,
      changedBy: event.changed_by,
      changedAt: event.changed_at,
    })),
    updatedAt: row.updated_at,
  };
}

async function getOrderDetail(row: OrderRow): Promise<AdminOrderDetail> {
  const [itemsResult, eventsResult] = await Promise.all([
    supabase
      .from("order_items")
      .select(ORDER_ITEM_COLUMNS)
      .eq("order_id", row.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("order_status_events")
      .select(STATUS_EVENT_COLUMNS)
      .eq("order_id", row.id)
      .order("changed_at", { ascending: true }),
  ]);

  if (itemsResult.error) {
    throw readError("order-items", itemsResult.error.message);
  }
  if (eventsResult.error) {
    throw readError("status-events", eventsResult.error.message);
  }

  return mapDetail(
    row,
    (itemsResult.data ?? []) as OrderItemRow[],
    (eventsResult.data ?? []) as StatusEventRow[],
  );
}

export async function getAdminOrders(): Promise<AdminOrderSummary[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(`${ORDER_COLUMNS}, order_items(quantity)`)
    .order("placed_at", { ascending: false })
    .limit(250);

  if (error) throw readError("orders", error.message);
  return ((data ?? []) as unknown as OrderRow[]).map((row) => mapSummary(row));
}

// =====================================================================
// Phase 2 — real server-side pagination for the Admin Orders list
// =====================================================================
// Replaces the 250-row client cap: search/status filtering and the status
// count chips now run in SQL over the COMPLETE `orders` table
// (`list_admin_orders_v1`), and only the current page of rows is returned.

export type AdminOrdersPageParams = {
  search?: string;
  status?: AdminOrderStatus | null;
  page?: number;
  pageSize?: number;
};

export type AdminOrdersPage = {
  rows: AdminOrderSummary[];
  totalCount: number;
  statusCounts: Record<AdminOrderStatus, number>;
  page: number;
  pageSize: number;
};

type OrderPageRow = OrderRow & { item_count: number };

type OrdersRpcResult = {
  rows: OrderPageRow[];
  totalCount: number;
  statusCounts: Partial<Record<AdminOrderStatus, number>>;
  page: number;
  pageSize: number;
};

const EMPTY_ORDER_STATUS_COUNTS: Record<AdminOrderStatus, number> = {
  pending: 0, preparing: 0, shipped: 0, delivered: 0, cancelled: 0, returned: 0,
};

export async function getAdminOrdersPage(
  params: AdminOrdersPageParams = {},
): Promise<AdminOrdersPage> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.floor(params.pageSize ?? 30)));

  const { data, error } = await supabase.rpc("list_admin_orders_v1", {
    p_search: params.search?.trim() || null,
    p_status: params.status ?? null,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error) throw readError("orders-page", error.message);
  const result = data as OrdersRpcResult | null;
  if (!result) throw readError("orders-page", "Empty response.");

  return {
    rows: result.rows.map((row) => mapSummary(row, row.item_count)),
    totalCount: result.totalCount,
    statusCounts: { ...EMPTY_ORDER_STATUS_COUNTS, ...result.statusCounts },
    page: result.page,
    pageSize: result.pageSize,
  };
}

export async function getAdminOrderOverview(): Promise<AdminOrderOverview> {
  const [totalResult, pendingResult, shippedResult, deliveredUnpaidResult] =
    await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "shipped"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered")
        .in("payment_status", OUTSTANDING_PAYMENT_STATUSES),
    ]);

  const failedResult = [
    totalResult,
    pendingResult,
    shippedResult,
    deliveredUnpaidResult,
  ].find((result) => result.error);
  if (failedResult?.error) {
    throw readError("order-overview", failedResult.error.message);
  }

  return {
    total: totalResult.count ?? 0,
    pending: pendingResult.count ?? 0,
    shipped: shippedResult.count ?? 0,
    deliveredUnpaid: deliveredUnpaidResult.count ?? 0,
  };
}

export async function getAdminOrderById(id: string): Promise<AdminOrderDetail | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw readError("order-by-id", error.message);
  return data ? getOrderDetail(data as unknown as OrderRow) : null;
}

export async function getAdminOrderByCode(code: string): Promise<AdminOrderDetail | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("code", code)
    .maybeSingle();

  if (error) throw readError("order-by-code", error.message);
  return data ? getOrderDetail(data as unknown as OrderRow) : null;
}

export async function updateAdminOrderStatus(
  orderId: string,
  nextStatus: AdminOrderStatus,
  note?: string,
): Promise<AdminOrderStatusUpdateResult> {
  if (!orderId) throw new AdminOrdersError("Order id is required.");
  if (!VALID_STATUSES.has(nextStatus)) {
    throw new AdminOrdersError("Unsupported order status.");
  }
  const normalizedNote = note?.trim() || null;
  if (normalizedNote && normalizedNote.length > 1000) {
    throw new AdminOrdersError("Status note cannot exceed 1000 characters.");
  }

  const { data, error } = await supabase.rpc("update_admin_order_status", {
    p_order_id: orderId,
    p_next_status: nextStatus,
    p_note: normalizedNote,
  });

  if (error) throw statusWriteError(error.message);

  const result = data as Partial<AdminOrderStatusUpdateResult> | null;
  if (
    !result ||
    typeof result.order_id !== "string" ||
    typeof result.code !== "string" ||
    !VALID_STATUSES.has(result.status as AdminOrderStatus) ||
    !VALID_STATUSES.has(result.previous_status as AdminOrderStatus) ||
    typeof result.no_op !== "boolean"
  ) {
    throw new AdminOrdersError("The status update returned an invalid response.");
  }

  window.dispatchEvent(new Event(ADMIN_ORDERS_CHANGED_EVENT));
  return result as AdminOrderStatusUpdateResult;
}

function deliveryFeeWriteError(message: string) {
  devWarn("delivery-fee", message);
  if (message.includes("only be changed before")) {
    return new AdminOrdersError(
      "Delivery fee can only be changed before the order is delivered.",
    );
  }
  if (message.includes("out of range") || message.includes("would be negative")) {
    return new AdminOrdersError("Enter a delivery fee between 0 and 100000 EGP.");
  }
  if (message.includes("Order not found")) {
    return new AdminOrdersError("Order not found.");
  }
  if (message.includes("Admin access required") || message.includes("permission denied")) {
    return new AdminOrdersError("Admin permission is required.");
  }
  return new AdminOrdersError("Could not update the delivery fee. Please try again.");
}

/**
 * Admin per-order delivery-fee override (Phase 1.2). Recomputes the order total
 * server-side, flags `delivery_fee_overridden`, and writes an audit line into
 * the order's admin note. Allowed only before the order is delivered.
 */
export async function updateAdminOrderDeliveryFee(
  orderId: string,
  deliveryFee: number,
  note?: string,
): Promise<AdminOrderDeliveryFeeUpdateResult> {
  if (!orderId) throw new AdminOrdersError("Order id is required.");
  if (!Number.isFinite(deliveryFee) || deliveryFee < 0 || deliveryFee > 100000) {
    throw new AdminOrdersError("Enter a delivery fee between 0 and 100000 EGP.");
  }
  const normalizedNote = note?.trim() || null;
  if (normalizedNote && normalizedNote.length > 500) {
    throw new AdminOrdersError("Delivery note cannot exceed 500 characters.");
  }

  const { data, error } = await supabase.rpc("update_admin_order_delivery_fee", {
    p_order_id: orderId,
    p_delivery_fee: Math.round(deliveryFee * 100) / 100,
    p_note: normalizedNote,
  });

  if (error) throw deliveryFeeWriteError(error.message);

  const result = data as Partial<AdminOrderDeliveryFeeUpdateResult> | null;
  if (
    !result ||
    typeof result.order_id !== "string" ||
    typeof result.code !== "string" ||
    typeof result.delivery_fee !== "number" ||
    typeof result.total !== "number"
  ) {
    throw new AdminOrdersError("The delivery fee update returned an invalid response.");
  }

  return result as AdminOrderDeliveryFeeUpdateResult;
}

// =====================================================================
// Phase 10-11 — Payments · Refunds · Returns · safe note editing
// =====================================================================
// All amounts (paid / remaining / refunded) are DERIVED from the real
// order_payments / order_refunds ledgers — never mocked. Writes go through the
// SECURITY DEFINER RPCs added in migration 20260703120000. These tables are
// admin-read-only (RLS is_admin); customers never see payment/refund data.

export type PaymentMovementMethod = "cash" | "bank_transfer" | "mobile_wallet" | "other";

export const ADMIN_PAYMENT_MOVEMENT_METHOD_LABELS: Record<PaymentMovementMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  mobile_wallet: "Mobile Wallet",
  other: "Other",
};

export const RETURN_CONDITION_LABELS: Record<OrderReturnCondition, string> = {
  sellable: "Sellable (restock)",
  damaged: "Damaged",
  other: "Other",
};

export type OrderReturnCondition = "sellable" | "damaged" | "other";

export type OrderPaymentRecord = {
  id: string;
  amount: number;
  method: PaymentMovementMethod;
  reference: string | null;
  notes: string | null;
  paidAt: string;
  createdBy: string | null;
};

export type OrderRefundRecord = {
  id: string;
  amount: number;
  method: PaymentMovementMethod;
  reference: string | null;
  notes: string | null;
  refundedAt: string;
  createdBy: string | null;
};

export type OrderReturnLineRecord = {
  id: string;
  orderItemId: string;
  kind: string;
  quantity: number;
  condition: OrderReturnCondition;
  restocked: boolean;
  restockedKg: number;
  notes: string | null;
};

export type OrderReturnRecord = {
  id: string;
  reason: string | null;
  notes: string | null;
  restockedKg: number;
  createdBy: string | null;
  createdAt: string;
  items: OrderReturnLineRecord[];
};

export type OrderFinancials = {
  total: number;
  paidTotal: number;
  refundedTotal: number;
  netPaid: number;
  remaining: number;
  payments: OrderPaymentRecord[];
  refunds: OrderRefundRecord[];
  returns: OrderReturnRecord[];
};

export type OrderFinanceMutationResult = {
  orderId: string;
  code: string;
  total: number;
  paidTotal: number;
  refundedTotal: number;
  netPaid: number;
  remaining: number;
  paymentStatus: PaymentStatus;
};

export type OrderReturnInput = {
  orderItemId: string;
  quantity: number;
  condition: OrderReturnCondition;
  notes?: string;
};

type PaymentRow = {
  id: string;
  amount: number | string;
  method: string;
  reference: string | null;
  notes: string | null;
  paid_at: string;
  created_by: string | null;
};

type RefundRow = {
  id: string;
  amount: number | string;
  method: string;
  reference: string | null;
  notes: string | null;
  refunded_at: string;
  created_by: string | null;
};

type ReturnItemRow = {
  id: string;
  order_item_id: string;
  kind: string;
  quantity: number;
  condition: string;
  restocked: boolean;
  restocked_kg: number | string;
  notes: string | null;
};

type ReturnRow = {
  id: string;
  reason: string | null;
  notes: string | null;
  restocked_kg: number | string;
  created_by: string | null;
  created_at: string;
  order_return_items: ReturnItemRow[] | null;
};

const PAYMENT_METHOD_SET = new Set<PaymentMovementMethod>([
  "cash",
  "bank_transfer",
  "mobile_wallet",
  "other",
]);

function normalizeMovementMethod(value: string): PaymentMovementMethod {
  return PAYMENT_METHOD_SET.has(value as PaymentMovementMethod)
    ? (value as PaymentMovementMethod)
    : "other";
}

function normalizeReturnCondition(value: string): OrderReturnCondition {
  return value === "sellable" || value === "damaged" ? value : "other";
}

export async function getAdminOrderFinancials(
  orderId: string,
  orderTotal: number,
): Promise<OrderFinancials> {
  const [paymentsResult, refundsResult, returnsResult] = await Promise.all([
    supabase
      .from("order_payments")
      .select("id, amount, method, reference, notes, paid_at, created_by")
      .eq("order_id", orderId)
      .order("paid_at", { ascending: true }),
    supabase
      .from("order_refunds")
      .select("id, amount, method, reference, notes, refunded_at, created_by")
      .eq("order_id", orderId)
      .order("refunded_at", { ascending: true }),
    supabase
      .from("order_returns")
      .select(
        "id, reason, notes, restocked_kg, created_by, created_at, order_return_items(id, order_item_id, kind, quantity, condition, restocked, restocked_kg, notes)",
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
  ]);

  const failed = [paymentsResult, refundsResult, returnsResult].find((r) => r.error);
  if (failed?.error) throw readError("order-financials", failed.error.message);

  const payments: OrderPaymentRecord[] = ((paymentsResult.data ?? []) as PaymentRow[]).map(
    (row) => ({
      id: row.id,
      amount: money(row.amount),
      method: normalizeMovementMethod(row.method),
      reference: row.reference,
      notes: row.notes,
      paidAt: row.paid_at,
      createdBy: row.created_by,
    }),
  );
  const refunds: OrderRefundRecord[] = ((refundsResult.data ?? []) as RefundRow[]).map((row) => ({
    id: row.id,
    amount: money(row.amount),
    method: normalizeMovementMethod(row.method),
    reference: row.reference,
    notes: row.notes,
    refundedAt: row.refunded_at,
    createdBy: row.created_by,
  }));
  const returns: OrderReturnRecord[] = ((returnsResult.data ?? []) as ReturnRow[]).map((row) => ({
    id: row.id,
    reason: row.reason,
    notes: row.notes,
    restockedKg: money(row.restocked_kg),
    createdBy: row.created_by,
    createdAt: row.created_at,
    items: (row.order_return_items ?? []).map((item) => ({
      id: item.id,
      orderItemId: item.order_item_id,
      kind: item.kind,
      quantity: item.quantity,
      condition: normalizeReturnCondition(item.condition),
      restocked: Boolean(item.restocked),
      restockedKg: money(item.restocked_kg),
      notes: item.notes,
    })),
  }));

  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const refundedTotal = refunds.reduce((sum, r) => sum + r.amount, 0);
  const netPaid = Math.round((paidTotal - refundedTotal) * 100) / 100;
  const remaining = Math.max(0, Math.round((orderTotal - netPaid) * 100) / 100);

  return {
    total: orderTotal,
    paidTotal: Math.round(paidTotal * 100) / 100,
    refundedTotal: Math.round(refundedTotal * 100) / 100,
    netPaid,
    remaining,
    payments,
    refunds,
    returns,
  };
}

function financeWriteError(scope: string, message: string) {
  devWarn(scope, message);
  if (message.includes("exceeds the order total")) {
    return new AdminOrdersError("That payment would exceed the order total.");
  }
  if (message.includes("exceeds the refundable amount")) {
    return new AdminOrdersError("That refund exceeds the amount available to refund.");
  }
  if (message.includes("no recorded payment")) {
    return new AdminOrdersError("Record a payment before issuing a refund.");
  }
  if (message.includes("cancelled order")) {
    return new AdminOrdersError("You cannot record a payment on a cancelled order.");
  }
  if (message.includes("only be created for delivered")) {
    return new AdminOrdersError("Returns can only be created for delivered orders.");
  }
  if (message.includes("only") && message.includes("returnable")) {
    return new AdminOrdersError("You cannot return more units than remain on that line.");
  }
  if (message.includes("Cannot safely restock")) {
    return new AdminOrdersError(
      "This sellable return could not be safely restocked from the order's delivered stock. No changes were made.",
    );
  }
  if (message.includes("Admin access required") || message.includes("permission denied")) {
    return new AdminOrdersError("Admin permission is required.");
  }
  if (message.includes("Order not found")) {
    return new AdminOrdersError("Order not found.");
  }
  return new AdminOrdersError("Could not save this change. Please review the values and try again.");
}

function mapFinanceResult(
  data: unknown,
  scope: string,
): OrderFinanceMutationResult {
  const result = data as Record<string, unknown> | null;
  if (
    !result ||
    typeof result.order_id !== "string" ||
    typeof result.code !== "string" ||
    typeof result.payment_status !== "string"
  ) {
    throw new AdminOrdersError(`The ${scope} returned an invalid response.`);
  }
  return {
    orderId: result.order_id,
    code: result.code,
    total: money(result.total as number),
    paidTotal: money(result.paid_total as number),
    refundedTotal: money(result.refunded_total as number),
    netPaid: money(result.net_paid as number),
    remaining: money(result.remaining as number),
    paymentStatus: result.payment_status as PaymentStatus,
  };
}

export async function recordOrderPayment(
  orderId: string,
  amount: number,
  method: PaymentMovementMethod,
  reference?: string,
  notes?: string,
): Promise<OrderFinanceMutationResult> {
  if (!orderId) throw new AdminOrdersError("Order id is required.");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AdminOrdersError("Enter a payment amount greater than zero.");
  }
  if (!PAYMENT_METHOD_SET.has(method)) {
    throw new AdminOrdersError("Choose a valid payment method.");
  }

  const { data, error } = await supabase.rpc("record_order_payment", {
    p_order_id: orderId,
    p_amount: Math.round(amount * 100) / 100,
    p_method: method,
    p_reference: reference?.trim() || null,
    p_notes: notes?.trim() || null,
  });
  if (error) throw financeWriteError("record-payment", error.message);

  const result = mapFinanceResult(data, "payment");
  window.dispatchEvent(new Event(ADMIN_ORDERS_CHANGED_EVENT));
  return result;
}

export async function recordOrderRefund(
  orderId: string,
  amount: number,
  method: PaymentMovementMethod,
  reference?: string,
  notes?: string,
): Promise<OrderFinanceMutationResult> {
  if (!orderId) throw new AdminOrdersError("Order id is required.");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AdminOrdersError("Enter a refund amount greater than zero.");
  }
  if (!PAYMENT_METHOD_SET.has(method)) {
    throw new AdminOrdersError("Choose a valid refund method.");
  }

  const { data, error } = await supabase.rpc("record_order_refund", {
    p_order_id: orderId,
    p_amount: Math.round(amount * 100) / 100,
    p_method: method,
    p_reference: reference?.trim() || null,
    p_notes: notes?.trim() || null,
  });
  if (error) throw financeWriteError("record-refund", error.message);

  const result = mapFinanceResult(data, "refund");
  window.dispatchEvent(new Event(ADMIN_ORDERS_CHANGED_EVENT));
  return result;
}

export type OrderReturnMutationResult = {
  returnId: string;
  orderId: string;
  code: string;
  totalRestockedKg: number;
};

export async function recordOrderReturn(
  orderId: string,
  reason: string | undefined,
  notes: string | undefined,
  items: OrderReturnInput[],
): Promise<OrderReturnMutationResult> {
  if (!orderId) throw new AdminOrdersError("Order id is required.");
  const cleaned = items
    .filter((item) => item.orderItemId && Number.isFinite(item.quantity) && item.quantity > 0)
    .map((item) => ({
      order_item_id: item.orderItemId,
      quantity: Math.floor(item.quantity),
      condition: item.condition,
      notes: item.notes?.trim() || null,
    }));
  if (cleaned.length === 0) {
    throw new AdminOrdersError("Select at least one item and quantity to return.");
  }

  const { data, error } = await supabase.rpc("record_order_return", {
    p_order_id: orderId,
    p_reason: reason?.trim() || null,
    p_notes: notes?.trim() || null,
    p_items: cleaned,
  });
  if (error) throw financeWriteError("record-return", error.message);

  const result = data as Record<string, unknown> | null;
  if (
    !result ||
    typeof result.return_id !== "string" ||
    typeof result.order_id !== "string" ||
    typeof result.code !== "string"
  ) {
    throw new AdminOrdersError("The return returned an invalid response.");
  }
  window.dispatchEvent(new Event(ADMIN_ORDERS_CHANGED_EVENT));
  return {
    returnId: result.return_id,
    orderId: result.order_id,
    code: result.code,
    totalRestockedKg: money(result.total_restocked_kg as number),
  };
}

export async function updateAdminOrderNote(
  orderId: string,
  adminNote: string,
): Promise<string | null> {
  if (!orderId) throw new AdminOrdersError("Order id is required.");
  const normalized = adminNote.trim();
  if (normalized.length > 2000) {
    throw new AdminOrdersError("Admin note cannot exceed 2000 characters.");
  }

  const { data, error } = await supabase.rpc("update_admin_order_note", {
    p_order_id: orderId,
    p_admin_note: normalized || null,
  });
  if (error) throw financeWriteError("order-note", error.message);

  const result = data as { admin_note?: string | null } | null;
  window.dispatchEvent(new Event(ADMIN_ORDERS_CHANGED_EVENT));
  return result?.admin_note ?? null;
}

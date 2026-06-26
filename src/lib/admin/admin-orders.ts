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
  };
  type: OrderType;
  channel: OrderChannel;
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  promoCode: string | null;
  paymentReference: string | null;
  paymentPhone: string | null;
  customerNote: string | null;
  adminNote: string | null;
  items: AdminOrderItem[];
  events: AdminOrderStatusEvent[];
  updatedAt: string | null;
};

export type AdminOrderStatusUpdateResult = {
  order_id: string;
  code: string;
  previous_status: AdminOrderStatus;
  status: AdminOrderStatus;
  no_op: boolean;
};

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
  pending_review: "Pending Review",
};

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

function mapSummary(row: OrderRow): AdminOrderSummary {
  const customer = record(row.customer_snapshot);
  const itemCount = (row.order_items ?? []).reduce(
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
    },
    type: row.type,
    channel: row.channel,
    subtotal: money(row.subtotal),
    discountTotal: money(row.discount_total),
    deliveryFee: money(row.delivery_fee),
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
  return ((data ?? []) as unknown as OrderRow[]).map(mapSummary);
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

  return result as AdminOrderStatusUpdateResult;
}

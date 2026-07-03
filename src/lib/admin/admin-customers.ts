"use client";

// Admin Customers — real Supabase data layer (Phase 12A).
//
// Replaces the fully mock `customers-mock.ts` dataset for the Admin Customers
// module ONLY. Reads the real `customers` / `customer_addresses` / `orders`
// tables (admin-only via RLS `customers_admin_all` / `customer_addresses_admin_all`
// / `orders_admin_all`, migration 20260625120000; table privileges granted in
// 20260703130000_phase12a_admin_customers_read_grants.sql) plus the Phase
// 10-11 `order_payments` / `order_refunds` / `order_status_events` ledgers
// (already granted SELECT to `authenticated` in earlier migrations).
//
// Segment classification (VIP / Repeat / New / Inactive / At Risk / Wholesale
// Potential) is computed here from real numbers (order count, spend, dates,
// tags) — it is a derived business view, not stored data. See
// src/lib/types/customer.ts: "Segments ... are computed elsewhere and are NOT
// stored on the customer."
//
// This module never creates a customer record — customers only ever come
// from a real signup or a real checkout (guest or registered).

import { supabase } from "@/lib/supabase/client";
import type { OrderStatus, OrderType, PaymentStatus } from "@/lib/types/order";

// ── Bounds ───────────────────────────────────────────────────────────────────
// Practical launch-scale caps (mirrors the existing getAdminOrders() precedent
// of a bounded, newest-first fetch rather than unbounded pagination). Revisit
// with a dedicated aggregate view/RPC if real order volume grows well past
// these caps.
const CUSTOMERS_LIST_LIMIT = 1000;
const ORDERS_AGGREGATE_LIMIT = 5000;
const CUSTOMER_ORDERS_LIMIT = 300;
const CUSTOMER_ACTIVITY_LIMIT = 300;

export type AdminCustomerType = "guest" | "registered";
export type AdminCustomerStatus = "active" | "inactive" | "blocked";

export type CustomerSegment =
  | "vip"
  | "repeat"
  | "new"
  | "inactive"
  | "at-risk"
  | "wholesale-potential";

export type CustomerLifecycleStatus = "active" | "inactive" | "new";

export class AdminCustomersError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminCustomersError";
  }
}

function devWarn(scope: string, message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[admin-customers:${scope}] ${message}`);
  }
}

function readError(scope: string, message: string) {
  devWarn(scope, message);
  return new AdminCustomersError("Could not load customer data. Please try again.");
}

function writeError(scope: string, message: string) {
  devWarn(scope, message);
  if (message.includes("Admin access required") || message.includes("permission denied")) {
    return new AdminCustomersError("Admin permission is required.");
  }
  return new AdminCustomersError("Could not save this change. Please try again.");
}

function money(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function text(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value);
  return s.length > 0 ? s : null;
}

function diffDays(now: Date, isoDateLike: string): number {
  const then = new Date(isoDateLike).getTime();
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000));
}

// ── Types ────────────────────────────────────────────────────────────────────

export type AdminCustomerOrderSummary = {
  id: string;
  code: string;
  status: OrderStatus;
  type: OrderType;
  paymentStatus: PaymentStatus;
  total: number;
  itemCount: number;
  placedAt: string;
};

export type AdminCustomerSummary = {
  id: string;
  authUserId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string;
  type: AdminCustomerType;
  status: AdminCustomerStatus;
  marketingOptIn: boolean;
  tags: string[];
  joinedAt: string;
  createdAt: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
  lastOrderStatus: OrderStatus | null;
  lastOrderCode: string | null;
  orderCodes: string[];
  // Precomputed at fetch time so segment classification (called during render)
  // never reads the current time itself (react-hooks/purity).
  daysSinceJoined: number;
  daysSinceLastOrder: number | null;
};

export type AdminCustomerAddress = {
  id: string;
  label: string;
  recipientName: string | null;
  phone: string | null;
  whatsapp: string | null;
  governorate: string;
  city: string;
  area: string | null;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  isDefault: boolean;
};

export type AdminCustomerActivityEvent = {
  id: string;
  kind: "order-status" | "account-created";
  status: OrderStatus | null;
  note: string | null;
  orderId: string | null;
  orderCode: string | null;
  occurredAt: string;
};

export type AdminCustomerDetail = AdminCustomerSummary & {
  addresses: AdminCustomerAddress[];
  orders: AdminCustomerOrderSummary[];
  totalPaid: number;
  totalRefunded: number;
  activity: AdminCustomerActivityEvent[];
  ordersTruncated: boolean;
};

// ── Row shapes ───────────────────────────────────────────────────────────────

type CustomerRow = {
  id: string;
  auth_user_id: string | null;
  type: string;
  status: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string;
  marketing_opt_in: boolean | null;
  tags: string[] | null;
  joined_at: string;
  created_at: string;
};

type OrderAggRow = {
  customer_id: string | null;
  code: string;
  status: string;
  type: string;
  payment_status: string;
  total: number | string;
  placed_at: string;
};

type AddressRow = {
  id: string;
  label: string;
  recipient_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  governorate: string;
  city: string;
  area: string | null;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  is_default: boolean;
};

type StatusEventRow = {
  id: string;
  order_id: string;
  status: string;
  note: string | null;
  changed_at: string;
};

const CUSTOMER_COLUMNS = `
  id,
  auth_user_id,
  type,
  status,
  name,
  email,
  phone,
  whatsapp,
  marketing_opt_in,
  tags,
  joined_at,
  created_at
`;

const CUSTOMER_ORDER_AGG_COLUMNS = `
  customer_id,
  code,
  status,
  type,
  payment_status,
  total,
  placed_at
`;

const ADDRESS_COLUMNS = `
  id,
  label,
  recipient_name,
  phone,
  whatsapp,
  governorate,
  city,
  area,
  street,
  building,
  floor,
  apartment,
  landmark,
  is_default
`;

function normalizeType(value: string): AdminCustomerType {
  return value === "registered" ? "registered" : "guest";
}

function normalizeStatus(value: string): AdminCustomerStatus {
  return value === "inactive" || value === "blocked" ? value : "active";
}

function mapCustomerRow(row: CustomerRow): Omit<
  AdminCustomerSummary,
  | "ordersCount"
  | "totalSpent"
  | "lastOrderDate"
  | "lastOrderStatus"
  | "lastOrderCode"
  | "orderCodes"
  | "daysSinceJoined"
  | "daysSinceLastOrder"
> {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    name: row.name,
    email: text(row.email),
    phone: text(row.phone),
    whatsapp: row.whatsapp,
    type: normalizeType(row.type),
    status: normalizeStatus(row.status),
    marketingOptIn: Boolean(row.marketing_opt_in),
    tags: Array.isArray(row.tags) ? row.tags : [],
    joinedAt: row.joined_at,
    createdAt: row.created_at,
  };
}

// ── List (Admin Customers table) ────────────────────────────────────────────

export async function getAdminCustomers(): Promise<AdminCustomerSummary[]> {
  const [customersResult, ordersResult] = await Promise.all([
    supabase
      .from("customers")
      .select(CUSTOMER_COLUMNS)
      .order("joined_at", { ascending: false })
      .limit(CUSTOMERS_LIST_LIMIT),
    supabase
      .from("orders")
      .select(CUSTOMER_ORDER_AGG_COLUMNS)
      .not("customer_id", "is", null)
      .order("placed_at", { ascending: false })
      .limit(ORDERS_AGGREGATE_LIMIT),
  ]);

  if (customersResult.error) throw readError("customers", customersResult.error.message);
  if (ordersResult.error) throw readError("orders-aggregate", ordersResult.error.message);

  const now = new Date();
  const orderRows = (ordersResult.data ?? []) as unknown as OrderAggRow[];

  type Agg = {
    ordersCount: number;
    totalSpent: number;
    lastOrderDate: string | null;
    lastOrderStatus: OrderStatus | null;
    lastOrderCode: string | null;
    orderCodes: string[];
  };
  const aggByCustomer = new Map<string, Agg>();

  // orderRows are pre-sorted newest-first, so the first row seen for a given
  // customer_id is that customer's most recent order.
  for (const row of orderRows) {
    const customerId = row.customer_id;
    if (!customerId) continue;
    let agg = aggByCustomer.get(customerId);
    if (!agg) {
      agg = {
        ordersCount: 0,
        totalSpent: 0,
        lastOrderDate: row.placed_at,
        lastOrderStatus: row.status as OrderStatus,
        lastOrderCode: row.code,
        orderCodes: [],
      };
      aggByCustomer.set(customerId, agg);
    }
    agg.ordersCount += 1;
    if (row.status !== "cancelled") {
      agg.totalSpent = Math.round((agg.totalSpent + money(row.total)) * 100) / 100;
    }
    agg.orderCodes.push(row.code);
  }

  return ((customersResult.data ?? []) as unknown as CustomerRow[]).map((row) => {
    const base = mapCustomerRow(row);
    const agg = aggByCustomer.get(row.id);
    return {
      ...base,
      ordersCount: agg?.ordersCount ?? 0,
      totalSpent: agg?.totalSpent ?? 0,
      lastOrderDate: agg?.lastOrderDate ?? null,
      lastOrderStatus: agg?.lastOrderStatus ?? null,
      lastOrderCode: agg?.lastOrderCode ?? null,
      orderCodes: agg?.orderCodes ?? [],
      daysSinceJoined: diffDays(now, base.joinedAt),
      daysSinceLastOrder: agg?.lastOrderDate ? diffDays(now, agg.lastOrderDate) : null,
    };
  });
}

// ── Detail (Customer drawer) ────────────────────────────────────────────────

export async function getAdminCustomerDetail(
  customerId: string,
): Promise<AdminCustomerDetail | null> {
  if (!customerId) throw new AdminCustomersError("Customer id is required.");

  const [customerResult, addressesResult, ordersResult] = await Promise.all([
    supabase.from("customers").select(CUSTOMER_COLUMNS).eq("id", customerId).maybeSingle(),
    supabase
      .from("customer_addresses")
      .select(ADDRESS_COLUMNS)
      .eq("customer_id", customerId)
      .order("is_default", { ascending: false }),
    supabase
      .from("orders")
      .select("id, code, status, type, payment_status, total, placed_at, order_items(quantity)")
      .eq("customer_id", customerId)
      .order("placed_at", { ascending: false })
      .limit(CUSTOMER_ORDERS_LIMIT),
  ]);

  if (customerResult.error) throw readError("customer-detail", customerResult.error.message);
  if (!customerResult.data) return null;
  if (addressesResult.error) throw readError("customer-addresses", addressesResult.error.message);
  if (ordersResult.error) throw readError("customer-orders", ordersResult.error.message);

  const now = new Date();
  const customerRow = customerResult.data as unknown as CustomerRow;
  const base = mapCustomerRow(customerRow);

  type OrderIdRow = {
    id: string;
    code: string;
    status: string;
    type: string;
    payment_status: string;
    total: number | string;
    placed_at: string;
    order_items?: Array<{ quantity: number }> | null;
  };
  const orderRows = (ordersResult.data ?? []) as unknown as OrderIdRow[];
  const orders: AdminCustomerOrderSummary[] = orderRows.map((row) => ({
    id: row.id,
    code: row.code,
    status: row.status as OrderStatus,
    type: row.type as OrderType,
    paymentStatus: row.payment_status as PaymentStatus,
    total: money(row.total),
    itemCount: (row.order_items ?? []).reduce(
      (sum, item) => sum + Math.max(0, Number(item.quantity) || 0),
      0,
    ),
    placedAt: row.placed_at,
  }));

  const ordersCount = orders.length;
  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);
  const lastOrder = orders[0] ?? null;

  const orderIds = orders.map((o) => o.id);
  const orderCodeById = new Map(orders.map((o) => [o.id, o.code]));

  const [paymentsResult, refundsResult, eventsResult] =
    orderIds.length > 0
      ? await Promise.all([
          supabase.from("order_payments").select("amount").in("order_id", orderIds),
          supabase.from("order_refunds").select("amount").in("order_id", orderIds),
          supabase
            .from("order_status_events")
            .select("id, order_id, status, note, changed_at")
            .in("order_id", orderIds)
            .order("changed_at", { ascending: false })
            .limit(CUSTOMER_ACTIVITY_LIMIT),
        ])
      : [
          { data: [] as { amount: number | string }[], error: null },
          { data: [] as { amount: number | string }[], error: null },
          { data: [] as StatusEventRow[], error: null },
        ];

  if (paymentsResult.error) throw readError("customer-payments", paymentsResult.error.message);
  if (refundsResult.error) throw readError("customer-refunds", refundsResult.error.message);
  if (eventsResult.error) throw readError("customer-activity", eventsResult.error.message);

  const totalPaid = ((paymentsResult.data ?? []) as { amount: number | string }[]).reduce(
    (sum, p) => sum + money(p.amount),
    0,
  );
  const totalRefunded = ((refundsResult.data ?? []) as { amount: number | string }[]).reduce(
    (sum, r) => sum + money(r.amount),
    0,
  );

  const activity: AdminCustomerActivityEvent[] = [
    ...((eventsResult.data ?? []) as unknown as StatusEventRow[]).map((ev) => ({
      id: ev.id,
      kind: "order-status" as const,
      status: ev.status as OrderStatus,
      note: ev.note,
      orderId: ev.order_id,
      orderCode: orderCodeById.get(ev.order_id) ?? null,
      occurredAt: ev.changed_at,
    })),
    {
      id: `account-created-${customerRow.id}`,
      kind: "account-created" as const,
      status: null,
      note: null,
      orderId: null,
      orderCode: null,
      occurredAt: customerRow.created_at,
    },
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const addresses: AdminCustomerAddress[] = ((addressesResult.data ?? []) as unknown as AddressRow[]).map(
    (row) => ({
      id: row.id,
      label: row.label,
      recipientName: text(row.recipient_name),
      phone: text(row.phone),
      whatsapp: text(row.whatsapp),
      governorate: row.governorate,
      city: row.city,
      area: text(row.area),
      street: row.street,
      building: text(row.building),
      floor: text(row.floor),
      apartment: text(row.apartment),
      landmark: text(row.landmark),
      isDefault: Boolean(row.is_default),
    }),
  );

  return {
    ...base,
    ordersCount,
    totalSpent: Math.round(totalSpent * 100) / 100,
    lastOrderDate: lastOrder?.placedAt ?? null,
    lastOrderStatus: lastOrder?.status ?? null,
    lastOrderCode: lastOrder?.code ?? null,
    orderCodes: orders.map((o) => o.code),
    daysSinceJoined: diffDays(now, base.joinedAt),
    daysSinceLastOrder: lastOrder ? diffDays(now, lastOrder.placedAt) : null,
    addresses,
    orders,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalRefunded: Math.round(totalRefunded * 100) / 100,
    activity,
    ordersTruncated: orderRows.length >= CUSTOMER_ORDERS_LIMIT,
  };
}

// ── Writes ───────────────────────────────────────────────────────────────────

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 40;

/**
 * Persists the customer Tags panel. Writes ONLY the `tags` column — the grant
 * backing this call (20260703130000) is column-scoped to `tags`, and RLS
 * (customers_admin_all) still requires the caller to be an active admin.
 */
export async function updateAdminCustomerTags(
  customerId: string,
  tags: string[],
): Promise<string[]> {
  if (!customerId) throw new AdminCustomersError("Customer id is required.");
  const cleaned = Array.from(
    new Set(
      tags
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length <= MAX_TAG_LENGTH),
    ),
  ).slice(0, MAX_TAGS);

  const { error } = await supabase
    .from("customers")
    .update({ tags: cleaned })
    .eq("id", customerId);

  if (error) throw writeError("update-tags", error.message);
  return cleaned;
}

// ── Segment classification (computed, not stored) ───────────────────────────
// See src/lib/types/customer.ts: segments are derived here from real numbers
// and are never written back to the customers table (except the existing
// "Wholesale Potential" tag, which is an input to this classification).

type SegmentInputs = Pick<
  AdminCustomerSummary,
  "totalSpent" | "ordersCount" | "tags" | "daysSinceJoined" | "daysSinceLastOrder" | "lastOrderDate"
>;

export function getCustomerSegments(c: SegmentInputs): CustomerSegment[] {
  const segments: CustomerSegment[] = [];
  const days = c.daysSinceLastOrder;
  const recentJoin = c.daysSinceJoined <= 30;

  const isVip = c.totalSpent >= 5000 || c.ordersCount >= 8;
  if (isVip) segments.push("vip");
  if (!isVip && c.ordersCount >= 2) segments.push("repeat");
  if (c.ordersCount <= 1 && recentJoin) segments.push("new");
  if (c.lastOrderDate && days !== null && days > 90) segments.push("inactive");
  if (c.ordersCount >= 2 && days !== null && days >= 60 && days <= 90) segments.push("at-risk");
  if (c.tags.includes("Wholesale Potential")) segments.push("wholesale-potential");

  return segments;
}

export function getCustomerSegmentReason(seg: CustomerSegment, c: SegmentInputs): string {
  const days = c.daysSinceLastOrder ?? 0;
  switch (seg) {
    case "vip":
      if (c.totalSpent >= 5000 && c.ordersCount >= 8) {
        return `Total spend is ${c.totalSpent.toLocaleString()} EGP across ${c.ordersCount} orders`;
      }
      if (c.totalSpent >= 5000) return `Total spend is ${c.totalSpent.toLocaleString()} EGP`;
      return `${c.ordersCount} orders placed`;
    case "repeat":
      return `${c.ordersCount} orders placed`;
    case "new":
      return c.ordersCount === 0
        ? "Recently joined — no orders yet"
        : "First-time buyer — joined recently";
    case "inactive":
      return `Last order was ${days} days ago`;
    case "at-risk":
      return `Previously active — no order in ${days} days`;
    case "wholesale-potential":
      return "Tagged for wholesale inquiry";
  }
}

export function getSuggestedPromotion(c: SegmentInputs): string | null {
  const segments = getCustomerSegments(c);
  if (segments.includes("inactive")) return "Win-back campaign candidate";
  if (segments.includes("at-risk")) return "Re-engagement offer";
  if (segments.includes("vip")) return "Loyalty reward eligible";
  if (segments.includes("wholesale-potential")) return "B2B pricing inquiry";
  if (segments.includes("new") && c.ordersCount >= 1) return "First repeat purchase incentive";
  if (segments.includes("repeat")) return "New collection offer";
  if (segments.includes("new") && c.ordersCount === 0) return "Welcome offer — no orders yet";
  return null;
}

export function getCustomerLifecycleStatus(c: SegmentInputs): CustomerLifecycleStatus {
  const days = c.daysSinceLastOrder;
  if (c.lastOrderDate && days !== null && days > 90) return "inactive";
  if (c.ordersCount <= 1 && c.daysSinceJoined <= 30) return "new";
  return "active";
}

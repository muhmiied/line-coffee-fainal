"use client";

import { supabase } from "@/lib/supabase/client";
import { getOrCreateGuestId } from "@/lib/checkout";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CustomerOrderStatus =
  | "pending"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type CustomerOrderSummary = {
  id: string;
  code: string;
  status: CustomerOrderStatus;
  type: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
  placedAt: string;
};

export type CustomerOrderItem = {
  nameEn: string;
  nameAr: string;
  detailEn: string | null;
  detailAr: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CustomerOrderEvent = {
  status: string;
  note: string | null;
  changedAt: string;
};

export type CustomerOrderDetail = CustomerOrderSummary & {
  addressSnapshot: Record<string, unknown> | null;
  customerNote: string | null;
  items: CustomerOrderItem[];
  timeline: CustomerOrderEvent[];
};

export type CustomerNotification = {
  eventId: string;
  orderId: string;
  orderCode: string;
  status: string;
  note: string | null;
  changedAt: string;
};

export type CustomerProfile = {
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
};

// ─── Data access functions ────────────────────────────────────────────────────

export async function getCustomerOrders(): Promise<CustomerOrderSummary[]> {
  const guestId = getOrCreateGuestId();
  const { data, error } = await supabase.rpc("get_customer_orders", {
    p_guest_id: guestId,
  });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    code: String(row.code),
    status: String(row.status) as CustomerOrderStatus,
    type: String(row.type),
    paymentMethod: String(row.payment_method),
    paymentStatus: String(row.payment_status),
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discount_total),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    itemCount: Number(row.item_count),
    placedAt: String(row.placed_at),
  }));
}

export async function getCustomerOrderDetail(
  orderCode: string,
): Promise<CustomerOrderDetail | null> {
  const guestId = getOrCreateGuestId();
  const { data, error } = await supabase.rpc("get_customer_order_detail", {
    p_order_code: orderCode,
    p_guest_id: guestId,
  });
  if (error || !data) return null;
  const rows = data as Record<string, unknown>[];
  if (rows.length === 0) return null;
  const row = rows[0];

  const rawItems = Array.isArray(row.items) ? (row.items as Record<string, unknown>[]) : [];
  const rawTimeline = Array.isArray(row.timeline)
    ? (row.timeline as Record<string, unknown>[])
    : [];

  const items: CustomerOrderItem[] = rawItems.map((item) => ({
    nameEn: String(item.name_en ?? ""),
    nameAr: String(item.name_ar ?? ""),
    detailEn: item.detail_en != null ? String(item.detail_en) : null,
    detailAr: item.detail_ar != null ? String(item.detail_ar) : null,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    lineTotal: Number(item.line_total),
  }));

  const timeline: CustomerOrderEvent[] = rawTimeline.map((ev) => ({
    status: String(ev.status),
    note: ev.note != null ? String(ev.note) : null,
    changedAt: String(ev.changed_at),
  }));

  return {
    id: String(row.id),
    code: String(row.code),
    status: String(row.status) as CustomerOrderStatus,
    type: String(row.type),
    paymentMethod: String(row.payment_method),
    paymentStatus: String(row.payment_status),
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discount_total),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    itemCount: items.length,
    placedAt: String(row.placed_at),
    addressSnapshot:
      row.address_snapshot != null &&
      typeof row.address_snapshot === "object" &&
      !Array.isArray(row.address_snapshot)
        ? (row.address_snapshot as Record<string, unknown>)
        : null,
    customerNote: row.customer_note != null ? String(row.customer_note) : null,
    items,
    timeline,
  };
}

export async function getCustomerNotifications(): Promise<CustomerNotification[]> {
  const guestId = getOrCreateGuestId();
  const { data, error } = await supabase.rpc("get_customer_notifications", {
    p_guest_id: guestId,
  });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    eventId: String(row.event_id),
    orderId: String(row.order_id),
    orderCode: String(row.order_code),
    status: String(row.status),
    note: row.note != null ? String(row.note) : null,
    changedAt: String(row.changed_at),
  }));
}

export async function getCustomerProfile(): Promise<CustomerProfile | null> {
  const guestId = getOrCreateGuestId();
  const { data, error } = await supabase.rpc("get_customer_profile", {
    p_guest_id: guestId,
  });
  if (error || !data) return null;
  const rows = data as Record<string, unknown>[];
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    customerId: String(row.customer_id),
    name: String(row.name ?? ""),
    email: row.email != null ? String(row.email) : null,
    phone: row.phone != null ? String(row.phone) : null,
    whatsapp: row.whatsapp != null ? String(row.whatsapp) : null,
  };
}

export async function updateCustomerProfile(
  name: string,
  phone: string,
  whatsapp: string,
): Promise<boolean> {
  const guestId = getOrCreateGuestId();
  const { data, error } = await supabase.rpc("update_customer_profile", {
    p_guest_id:  guestId,
    p_name:      name,
    p_phone:     phone,
    p_whatsapp:  whatsapp,
  });
  if (error) return false;
  return Boolean(data);
}

// ─── Address types ────────────────────────────────────────────────────────────

export type CustomerAddress = {
  id: string;
  label: string;
  recipientName: string | null;
  phone: string | null;
  governorate: string;
  city: string;
  area: string | null;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  locationUrl: string | null;
  isDefault: boolean;
  createdAt: string;
};

export type CustomerAddressInput = Omit<CustomerAddress, "id" | "createdAt">;

function mapAddressRow(row: Record<string, unknown>): CustomerAddress {
  return {
    id:            String(row.id),
    label:         String(row.label ?? "Address"),
    recipientName: row.recipient_name != null ? String(row.recipient_name) : null,
    phone:         row.phone != null ? String(row.phone) : null,
    governorate:   String(row.governorate ?? ""),
    city:          String(row.city ?? ""),
    area:          row.area != null ? String(row.area) : null,
    street:        String(row.street ?? ""),
    building:      row.building != null ? String(row.building) : null,
    floor:         row.floor != null ? String(row.floor) : null,
    apartment:     row.apartment != null ? String(row.apartment) : null,
    landmark:      row.landmark != null ? String(row.landmark) : null,
    locationUrl:   row.location_url != null ? String(row.location_url) : null,
    isDefault:     Boolean(row.is_default),
    createdAt:     String(row.created_at ?? ""),
  };
}

export async function getCustomerAddresses(): Promise<CustomerAddress[]> {
  const guestId = getOrCreateGuestId();
  const { data, error } = await supabase.rpc("get_customer_addresses", {
    p_guest_id: guestId,
  });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapAddressRow);
}

export async function addCustomerAddress(
  input: CustomerAddressInput,
): Promise<string | null> {
  const guestId = getOrCreateGuestId();
  const { data, error } = await supabase.rpc("add_customer_address", {
    p_guest_id:       guestId,
    p_label:          input.label,
    p_recipient_name: input.recipientName ?? "",
    p_phone:          input.phone ?? "",
    p_governorate:    input.governorate,
    p_city:           input.city,
    p_area:           input.area ?? "",
    p_street:         input.street,
    p_building:       input.building ?? "",
    p_floor:          input.floor ?? "",
    p_apartment:      input.apartment ?? "",
    p_landmark:       input.landmark ?? "",
    p_location_url:   input.locationUrl ?? "",
    p_is_default:     input.isDefault,
  });
  if (error || !data) return null;
  return String(data);
}

export async function updateCustomerAddress(
  addressId: string,
  input: CustomerAddressInput,
): Promise<boolean> {
  const guestId = getOrCreateGuestId();
  const { data, error } = await supabase.rpc("update_customer_address", {
    p_guest_id:       guestId,
    p_address_id:     addressId,
    p_label:          input.label,
    p_recipient_name: input.recipientName ?? "",
    p_phone:          input.phone ?? "",
    p_governorate:    input.governorate,
    p_city:           input.city,
    p_area:           input.area ?? "",
    p_street:         input.street,
    p_building:       input.building ?? "",
    p_floor:          input.floor ?? "",
    p_apartment:      input.apartment ?? "",
    p_landmark:       input.landmark ?? "",
    p_location_url:   input.locationUrl ?? "",
    p_is_default:     input.isDefault,
  });
  if (error) return false;
  return Boolean(data);
}

export async function deleteCustomerAddress(
  addressId: string,
): Promise<boolean> {
  const guestId = getOrCreateGuestId();
  const { data, error } = await supabase.rpc("delete_customer_address", {
    p_guest_id:   guestId,
    p_address_id: addressId,
  });
  if (error) return false;
  return Boolean(data);
}

export async function setDefaultCustomerAddress(
  addressId: string,
): Promise<boolean> {
  const guestId = getOrCreateGuestId();
  const { data, error } = await supabase.rpc("set_default_customer_address", {
    p_guest_id:   guestId,
    p_address_id: addressId,
  });
  if (error) return false;
  return Boolean(data);
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export async function getCustomerWishlist(): Promise<string[]> {
  const guestId = getOrCreateGuestId();
  const { data, error } = await supabase.rpc("get_customer_wishlist", {
    p_guest_id: guestId,
  });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) =>
    String(row.product_slug),
  );
}

export async function addCustomerWishlistItem(slug: string): Promise<void> {
  const guestId = getOrCreateGuestId();
  await supabase.rpc("add_customer_wishlist_item", {
    p_guest_id:    guestId,
    p_product_slug: slug,
  });
}

export async function removeCustomerWishlistItem(slug: string): Promise<void> {
  const guestId = getOrCreateGuestId();
  await supabase.rpc("remove_customer_wishlist_item", {
    p_guest_id:    guestId,
    p_product_slug: slug,
  });
}

// ─── Guest → registered linking (Phase 2) ──────────────────────────────────────

export type GuestLinkResult = {
  linked: boolean;
  mode?: "promote" | "merge" | "wishlist_only" | "noop";
  movedOrders?: number;
  customerId?: string | null;
  reason?: string;
};

/**
 * Link SAME-DEVICE guest data (orders, addresses, wishlist) to the currently
 * authenticated account. Matches only by the device `guest_id` — there is NO
 * automatic merge by phone/email. Best-effort and idempotent: safe to call on
 * every login/signup; re-running finds nothing left to migrate. Requires an
 * authenticated Supabase session (the RPC reads auth.uid()).
 */
export async function linkGuestDataToAccount(): Promise<GuestLinkResult> {
  const guestId = getOrCreateGuestId();
  const { data, error } = await supabase.rpc("link_guest_data_to_account", {
    p_guest_id: guestId,
  });
  if (error || !data || typeof data !== "object") {
    return { linked: false };
  }
  const row = data as Record<string, unknown>;
  return {
    linked: Boolean(row.linked),
    mode: row.mode as GuestLinkResult["mode"],
    movedOrders: row.moved_orders != null ? Number(row.moved_orders) : undefined,
    customerId: row.customer_id != null ? String(row.customer_id) : null,
    reason: row.reason != null ? String(row.reason) : undefined,
  };
}

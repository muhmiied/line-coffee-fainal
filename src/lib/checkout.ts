// Return contract of the `create_checkout_order` RPC.
// `payment_method` is the DB-mapped method (UI cash/instapay/e-wallet ->
// cash_on_delivery/instapay/wallet). `payment_status` is always "pending" after
// Phase 1 (Locked Decision 12: all payment methods start pending; nothing is
// auto-marked paid). The legacy "pending_review" value is gone — the RPC no
// longer produces it.
export type CheckoutOrderResult = {
  order_id: string;
  code: string;
  subtotal: number;
  discount_total: number;
  delivery_fee: number;
  total: number;
  // Optional during the authored-not-applied migration window. Phase 7 returns
  // a normalized code or null after the migration is applied.
  promo_code?: string | null;
  payment_method: "cash_on_delivery" | "instapay" | "wallet";
  payment_status: "pending";
  item_count: number;
};

const GUEST_ID_KEY = "line-guest-id-v1";
const CHECKOUT_RESULT_PREFIX = "line-checkout-result:";

function createGuestId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function createCheckoutAttemptId() {
  return createGuestId();
}

export function getOrCreateGuestId() {
  try {
    const existing = window.localStorage.getItem(GUEST_ID_KEY);
    if (existing && existing.length <= 64 && /^[A-Za-z0-9_-]+$/.test(existing)) {
      return existing;
    }

    const guestId = createGuestId();
    window.localStorage.setItem(GUEST_ID_KEY, guestId);
    return guestId;
  } catch {
    return createGuestId();
  }
}

export function checkoutResultStorageKey(orderId: string) {
  return `${CHECKOUT_RESULT_PREFIX}${orderId}`;
}

export function isCheckoutOrderResult(value: unknown): value is CheckoutOrderResult {
  if (!value || typeof value !== "object") return false;

  const result = value as Partial<CheckoutOrderResult>;
  return (
    typeof result.order_id === "string" &&
    typeof result.code === "string" &&
    typeof result.subtotal === "number" &&
    typeof result.discount_total === "number" &&
    typeof result.delivery_fee === "number" &&
    typeof result.total === "number" &&
    (result.promo_code === undefined ||
      result.promo_code === null ||
      typeof result.promo_code === "string") &&
    typeof result.item_count === "number" &&
    ["cash_on_delivery", "instapay", "wallet"].includes(result.payment_method ?? "") &&
    result.payment_status === "pending"
  );
}

const PROMO_VALIDATION_STATUSES = new Set<PromoValidationStatus>([
  "valid",
  "invalid",
  "not_started",
  "expired",
  "inactive",
  "usage_limit_reached",
  "minimum_not_met",
  "customer_limit_reached",
]);

type PromoValidationRow = {
  status?: unknown;
  code?: unknown;
  discount_total?: unknown;
  subtotal?: unknown;
  discounted_subtotal?: unknown;
  minimum_subtotal?: unknown;
  message?: unknown;
};

export async function validatePromoCode(
  code: string,
  productSubtotal: number,
  guestId: string,
): Promise<PromoValidationResult> {
  const { data, error } = await supabase.rpc("validate_promo_code", {
    p_code: code.trim(),
    p_subtotal: Math.round(productSubtotal * 100) / 100,
    p_guest_id: guestId,
  });

  if (error) throw new Error("Could not validate the promo code.");
  const row = (data ?? {}) as PromoValidationRow;
  const status = row.status as PromoValidationStatus;
  const discountTotal = Number(row.discount_total);
  const subtotal = Number(row.subtotal);
  const discountedSubtotal = Number(row.discounted_subtotal);

  if (
    !PROMO_VALIDATION_STATUSES.has(status) ||
    !Number.isFinite(discountTotal) ||
    !Number.isFinite(subtotal) ||
    !Number.isFinite(discountedSubtotal) ||
    typeof row.message !== "string"
  ) {
    throw new Error("Promo validation returned an invalid response.");
  }

  const minimumSubtotal =
    row.minimum_subtotal == null ? undefined : Number(row.minimum_subtotal);

  return {
    status,
    code: typeof row.code === "string" ? row.code : null,
    discountTotal,
    subtotal,
    discountedSubtotal,
    minimumSubtotal:
      minimumSubtotal !== undefined && Number.isFinite(minimumSubtotal)
        ? minimumSubtotal
        : undefined,
    message: row.message,
  };
}
import { supabase } from "@/lib/supabase/client";
import type {
  PromoValidationResult,
  PromoValidationStatus,
} from "@/lib/types/marketing";

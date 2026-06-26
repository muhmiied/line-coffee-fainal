export type CheckoutOrderResult = {
  order_id: string;
  code: string;
  subtotal: number;
  discount_total: number;
  delivery_fee: number;
  total: number;
  payment_method: "cash_on_delivery" | "instapay" | "wallet";
  payment_status: "pending" | "pending_review";
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
    typeof result.item_count === "number" &&
    ["cash_on_delivery", "instapay", "wallet"].includes(result.payment_method ?? "") &&
    ["pending", "pending_review"].includes(result.payment_status ?? "")
  );
}

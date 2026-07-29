import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked so getOrderNotificationPayload's tests never touch a real network —
// `rpc` is a single vi.fn() whose resolved value each test controls directly.
const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

import {
  buildWhatsAppOrderHref,
  createCheckoutAttemptId,
  getOrderNotificationPayload,
  isCheckoutOrderResult,
  type CheckoutOrderHandoff,
  type CheckoutOrderResult,
} from "./checkout";

// These guards are the client-side trust boundary for the checkout RPC's
// response: a malformed/tampered payload must never be accepted as a valid
// order confirmation, since the UI derives the customer-facing receipt and
// the WhatsApp/Telegram handoff from it.

// Deliberately loosely-typed: several tests below feed in adversarial values
// (wrong literal unions, wrong primitive types) to prove the runtime guard
// rejects them — that only makes sense against `unknown`, matching what
// isCheckoutOrderResult actually type-guards.
function baseResult(overrides: Record<string, unknown> = {}): unknown {
  return {
    order_id: "11111111-1111-1111-1111-111111111111",
    code: "LC-000123",
    subtotal: 500,
    discount_total: 50,
    delivery_fee: 50,
    total: 500,
    payment_method: "cash_on_delivery",
    payment_status: "pending",
    item_count: 2,
    ...overrides,
  };
}

function baseHandoff(overrides: Partial<CheckoutOrderHandoff> = {}): CheckoutOrderHandoff {
  return {
    customer: { name: "Test Customer", phone: "01012345678", whatsapp: "01012345678" },
    address: {
      governorate: "Cairo",
      area: "Nasr City",
      street: "Test St",
      building: "1",
      floorApt: "2",
    },
    items: [{ name: "Turkish Silk", detail: "250g", quantity: 1 }],
    whatsappHref: "https://wa.me/201012345678",
    telegramStatus: "sent",
    ...overrides,
  };
}

describe("isCheckoutOrderResult", () => {
  it("accepts a well-formed result with correct totals math", () => {
    expect(isCheckoutOrderResult(baseResult())).toBe(true);
  });

  it("rejects a non-object value", () => {
    expect(isCheckoutOrderResult(null)).toBe(false);
    expect(isCheckoutOrderResult(undefined)).toBe(false);
    expect(isCheckoutOrderResult("LC-000123")).toBe(false);
  });

  it("rejects a missing order_id or code", () => {
    expect(isCheckoutOrderResult(baseResult({ order_id: undefined }))).toBe(false);
    expect(isCheckoutOrderResult(baseResult({ code: undefined }))).toBe(false);
  });

  it("rejects a negative subtotal/discount/delivery/total", () => {
    expect(isCheckoutOrderResult(baseResult({ subtotal: -1 }))).toBe(false);
    expect(isCheckoutOrderResult(baseResult({ discount_total: -1 }))).toBe(false);
    expect(isCheckoutOrderResult(baseResult({ delivery_fee: -1 }))).toBe(false);
    expect(isCheckoutOrderResult(baseResult({ total: -1 }))).toBe(false);
  });

  it("rejects a non-finite total (NaN/Infinity injection)", () => {
    expect(isCheckoutOrderResult(baseResult({ total: Number.NaN }))).toBe(false);
    expect(isCheckoutOrderResult(baseResult({ total: Number.POSITIVE_INFINITY }))).toBe(false);
  });

  it("rejects a discount larger than the subtotal", () => {
    // Arithmetically self-consistent (100 - 150 + 50 = 0, non-negative) and
    // passes every OTHER check, so only the discount-vs-subtotal invariant
    // itself can reject this — a fixture that also broke the totals math or
    // went negative would pass even if this specific rule were deleted.
    expect(
      isCheckoutOrderResult(
        baseResult({ subtotal: 100, discount_total: 150, delivery_fee: 50, total: 0 }),
      ),
    ).toBe(false);
  });

  it("rejects a total that doesn't match subtotal - discount + delivery", () => {
    // Correct total would be 500 - 50 + 50 = 500; this claims 400.
    expect(isCheckoutOrderResult(baseResult({ total: 400 }))).toBe(false);
  });

  it("tolerates float rounding noise under the 0.01 epsilon", () => {
    expect(isCheckoutOrderResult(baseResult({ total: 500.005 }))).toBe(true);
  });

  it("rejects an unrecognized payment_method", () => {
    expect(isCheckoutOrderResult(baseResult({ payment_method: "credit_card" }))).toBe(false);
  });

  it("rejects any payment_status other than 'pending' (Decision 12)", () => {
    expect(isCheckoutOrderResult(baseResult({ payment_status: "paid" }))).toBe(false);
    expect(isCheckoutOrderResult(baseResult({ payment_status: "pending_review" }))).toBe(false);
  });

  it("accepts promo_code as undefined, null, or a string", () => {
    expect(isCheckoutOrderResult(baseResult({ promo_code: undefined }))).toBe(true);
    expect(isCheckoutOrderResult(baseResult({ promo_code: null }))).toBe(true);
    expect(isCheckoutOrderResult(baseResult({ promo_code: "WELCOME10" }))).toBe(true);
  });

  it("rejects a non-string, non-null promo_code", () => {
    expect(isCheckoutOrderResult(baseResult({ promo_code: 123 }))).toBe(false);
  });

  it("rejects a missing/non-numeric item_count", () => {
    expect(isCheckoutOrderResult(baseResult({ item_count: "2" }))).toBe(false);
  });

  it("accepts a well-formed handoff", () => {
    expect(isCheckoutOrderResult(baseResult({ handoff: baseHandoff() }))).toBe(true);
  });

  it("rejects a handoff missing customer or address", () => {
    const handoff = baseHandoff() as Record<string, unknown>;
    delete handoff.customer;
    expect(isCheckoutOrderResult(baseResult({ handoff: handoff as unknown as CheckoutOrderHandoff }))).toBe(
      false,
    );
  });

  it("rejects a handoff whose items is not an array", () => {
    const handoff = { ...baseHandoff(), items: "not-an-array" };
    expect(
      isCheckoutOrderResult(baseResult({ handoff: handoff as unknown as CheckoutOrderHandoff })),
    ).toBe(false);
  });

  it("rejects a handoff with an invalid telegramStatus", () => {
    const handoff = { ...baseHandoff(), telegramStatus: "sending" };
    expect(
      isCheckoutOrderResult(baseResult({ handoff: handoff as unknown as CheckoutOrderHandoff })),
    ).toBe(false);
  });
});

describe("buildWhatsAppOrderHref", () => {
  const result = baseResult({ handoff: baseHandoff() }) as CheckoutOrderResult;

  it("returns null when the handoff has no whatsappHref", () => {
    const noHref = {
      ...result,
      handoff: { ...baseHandoff(), whatsappHref: null },
    } as CheckoutOrderResult;
    expect(buildWhatsAppOrderHref(noHref)).toBeNull();
  });

  it("returns null when handoff itself is absent", () => {
    const noHandoff = { ...result, handoff: undefined } as CheckoutOrderResult;
    expect(buildWhatsAppOrderHref(noHandoff)).toBeNull();
  });

  it("builds a wa.me URL with the order details in the text param", () => {
    const href = buildWhatsAppOrderHref(result);
    expect(href).not.toBeNull();
    const url = new URL(href!);
    expect(url.hostname).toBe("wa.me");
    const text = url.searchParams.get("text") ?? "";
    expect(text).toContain(result.code);
    expect(text).toContain("Test Customer");
    expect(text).toContain("Turkish Silk");
  });

  it("rejects a non-https whatsappHref", () => {
    const httpHandoff = { ...baseHandoff(), whatsappHref: "http://wa.me/201012345678" };
    const tampered = { ...result, handoff: httpHandoff } as CheckoutOrderResult;
    expect(buildWhatsAppOrderHref(tampered)).toBeNull();
  });

  it("rejects a whatsappHref pointing at a host outside the allowlist", () => {
    const evilHandoff = { ...baseHandoff(), whatsappHref: "https://evil.example.com/phish" };
    const tampered = { ...result, handoff: evilHandoff } as CheckoutOrderResult;
    expect(buildWhatsAppOrderHref(tampered)).toBeNull();
  });

  it("rejects an unparseable whatsappHref instead of throwing", () => {
    const brokenHandoff = { ...baseHandoff(), whatsappHref: "not a url" };
    const tampered = { ...result, handoff: brokenHandoff } as CheckoutOrderResult;
    expect(() => buildWhatsAppOrderHref(tampered)).not.toThrow();
    expect(buildWhatsAppOrderHref(tampered)).toBeNull();
  });

  it("accepts the other two allowlisted WhatsApp hosts", () => {
    for (const host of ["api.whatsapp.com", "web.whatsapp.com"]) {
      const handoff = { ...baseHandoff(), whatsappHref: `https://${host}/send?phone=201012345678` };
      const withHost = { ...result, handoff } as CheckoutOrderResult;
      expect(buildWhatsAppOrderHref(withHost)).not.toBeNull();
    }
  });
});

describe("createCheckoutAttemptId", () => {
  it("generates a non-empty, unique-looking id each call", () => {
    const a = createCheckoutAttemptId();
    const b = createCheckoutAttemptId();
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });
});

// getOrderNotificationPayload is the ownership-safe trust-boundary lookup both
// the Telegram route and the WhatsApp handoff build their message from (Phase
// 5 Batch A). It must prove knowledge of the order's own checkout_attempt_id
// server-side (the RPC does the real enforcement); this suite covers the
// client wrapper's contract: it never throws, never leaks a partial/malformed
// payload, and always sends both identifying params to the RPC.
describe("getOrderNotificationPayload", () => {
  const orderId = "11111111-1111-1111-1111-111111111111";
  const attemptId = "attempt-abc-123";

  function validPayload(overrides: Record<string, unknown> = {}) {
    return {
      order_id: orderId,
      order_code: "LC-000123",
      customer: { name: "Test Customer", phone: "01012345678", whatsapp: "01012345678" },
      address: {
        governorate: "Cairo",
        area: "Nasr City",
        street: "Test St",
        building: "1",
        floor_apt: "2",
        landmark: "",
      },
      items: [
        { name: "Turkish Silk", detail: "250g", name_ar: "تركي حرير", detail_ar: "٢٥٠ جرام", quantity: 1 },
      ],
      subtotal: 500,
      discount: 0,
      delivery: 50,
      total: 550,
      payment_method: "cash_on_delivery",
      notes: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    rpc.mockReset();
  });

  it("an authorized owner (correct order_id + checkout_attempt_id) succeeds and returns the full payload", async () => {
    rpc.mockResolvedValueOnce({ data: validPayload(), error: null });
    const result = await getOrderNotificationPayload(orderId, attemptId);
    expect(result).not.toBeNull();
    expect(result?.order_code).toBe("LC-000123");
    expect(result?.customer.name).toBe("Test Customer");
    expect(rpc).toHaveBeenCalledWith("get_order_notification_payload", {
      p_order_id: orderId,
      p_checkout_attempt_id: attemptId,
    });
  });

  it("a wrong/mismatched checkout_attempt_id fails closed and leaks no data", async () => {
    // The RPC itself is what enforces the attempt-id match server-side; from
    // the client's perspective this looks like any other rejected call — an
    // error and no rows. The wrapper must return null, not a partial object.
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Order not found or checkout attempt does not match." },
    });
    const result = await getOrderNotificationPayload(orderId, "wrong-attempt-id");
    expect(result).toBeNull();
  });

  it("a missing/nonexistent order fails closed the same way as a wrong owner (no enumeration signal)", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "Order not found." } });
    const result = await getOrderNotificationPayload("00000000-0000-0000-0000-000000000000", attemptId);
    expect(result).toBeNull();
    // Confirms the failure mode for "doesn't exist" is identical in shape to
    // "exists but wrong attempt id" above (both: null, no thrown detail) —
    // there is no way for a caller to distinguish the two, which is the
    // point: neither case may reveal whether an order exists.
  });

  it("a malformed/incomplete payload (missing required fields) is rejected, not passed through", async () => {
    rpc.mockResolvedValueOnce({
      data: { order_id: orderId }, // missing order_code, customer, address, items
      error: null,
    });
    const result = await getOrderNotificationPayload(orderId, attemptId);
    expect(result).toBeNull();
  });

  it("a stale claim where the RPC returns null data with no error resolves to null, never throws", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(getOrderNotificationPayload(orderId, attemptId)).resolves.toBeNull();
  });

  it("never throws even if the underlying RPC call itself rejects (no live network involved in this test)", async () => {
    rpc.mockRejectedValueOnce(new Error("network unreachable"));
    await expect(getOrderNotificationPayload(orderId, attemptId)).resolves.toBeNull();
  });
});

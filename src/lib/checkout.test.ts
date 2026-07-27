import { describe, expect, it } from "vitest";
import {
  buildWhatsAppOrderHref,
  createCheckoutAttemptId,
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

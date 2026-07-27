import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Full-handler tests against the real exported POST — no source changes were
// needed to make this testable because Next.js route handlers are plain
// (Request) => Promise<Response> functions built on standard Web APIs
// (available natively in Node 20+, no jsdom required). Only the two real
// external dependencies are mocked: the Supabase client (`createClient`) and
// `fetch` (the actual Telegram API call).
const rpc = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: (...args: unknown[]) => rpc(...args) }),
}));

// Must satisfy the route's strict UUID_PATTERN (version nibble 1-5, variant
// nibble 8/9/a/b) — a lazily "all 1s" placeholder fails that check the same
// way a real malformed id would, so this is deliberately RFC 4122-shaped.
const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const ATTEMPT_ID = "attempt-1234567890";
const VALID_BODY = { orderId: ORDER_ID, checkoutAttemptId: ATTEMPT_ID };

const TRUSTED_ORDER_PAYLOAD = {
  order_id: ORDER_ID,
  order_code: "LC-000123",
  customer: { name: "Test Customer", phone: "01012345678", whatsapp: "01012345678" },
  address: { governorate: "Cairo", area: "Nasr City", street: "Test St" },
  items: [{ name: "Turkish Silk", detail: "250g", quantity: 1 }],
  subtotal: 500,
  discount: 0,
  delivery: 50,
  total: 550,
  payment_method: "cash_on_delivery",
  notes: null,
};

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://linecoffee.eg/api/order-notifications/telegram", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  });
}

// rpc() is a single mock queried by name across three different calls
// (get_order_notification_payload, claim_order_notification,
// mark/release_order_notification_claim) — route by the RPC name argument so
// each test can script exactly one of them without caring about call order.
function scriptRpc(responses: Record<string, unknown>) {
  rpc.mockImplementation(async (name: string) => {
    if (name in responses) return responses[name];
    return { data: null, error: null };
  });
}

describe("POST /api/order-notifications/telegram", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    rpc.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "placeholder-key";
    process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
    process.env.TELEGRAM_CHAT_ID = "test-chat-id";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
    // The in-memory dedupe cache lives on globalThis (deliberately, so it
    // survives serverless-instance module reloads in production) rather than
    // in module scope, so vi.resetModules() alone would not clear it between
    // tests that reuse the same ORDER_ID constant. Clear it explicitly.
    delete (globalThis as { lineCoffeeTelegramSent?: unknown }).lineCoffeeTelegramSent;
    // Each test gets a fresh Supabase client cache (module-scoped `cachedSupabase`).
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("rejects a cross-origin request (403)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(VALID_BODY, { origin: "https://evil.example.com" }));
    expect(res.status).toBe(403);
  });

  it("rejects a malformed body (400)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ orderId: "not-a-uuid", checkoutAttemptId: "short" }));
    expect(res.status).toBe(400);
  });

  it("rejects an oversized declared Content-Length (413)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(VALID_BODY, { "content-length": "999999" }));
    expect(res.status).toBe(413);
  });

  it("returns 503 when Supabase env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const { POST } = await import("./route");
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(503);
  });

  it("returns 404 when the trusted-order lookup finds nothing (unknown order or wrong proof)", async () => {
    scriptRpc({ get_order_notification_payload: { data: null, error: null } });
    const { POST } = await import("./route");
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 404 when the trusted payload's order_id does not match the request (tamper guard)", async () => {
    scriptRpc({
      get_order_notification_payload: {
        data: { ...TRUSTED_ORDER_PAYLOAD, order_id: "22222222-2222-4222-8222-222222222222" },
        error: null,
      },
    });
    const { POST } = await import("./route");
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("claim=already_sent short-circuits as a safe duplicate (never calls Telegram)", async () => {
    scriptRpc({
      get_order_notification_payload: { data: TRUSTED_ORDER_PAYLOAD, error: null },
      claim_order_notification: { data: "already_sent", error: null },
    });
    const { POST } = await import("./route");
    const res = await POST(makeRequest(VALID_BODY));
    const json = await res.json();
    expect(json).toEqual({ ok: true, duplicate: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("claim=in_progress reports success without sending a second message", async () => {
    scriptRpc({
      get_order_notification_payload: { data: TRUSTED_ORDER_PAYLOAD, error: null },
      claim_order_notification: { data: "in_progress", error: null },
    });
    const { POST } = await import("./route");
    const res = await POST(makeRequest(VALID_BODY));
    const json = await res.json();
    expect(json).toEqual({ ok: true, inProgress: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("claim=error (RPC failure) returns 503 without sending", async () => {
    scriptRpc({
      get_order_notification_payload: { data: TRUSTED_ORDER_PAYLOAD, error: null },
      claim_order_notification: { data: null, error: { message: "db down" } },
    });
    const { POST } = await import("./route");
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("claim=claimed with no bot token configured releases the claim and returns 503", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    scriptRpc({
      get_order_notification_payload: { data: TRUSTED_ORDER_PAYLOAD, error: null },
      claim_order_notification: { data: "claimed", error: null },
      release_order_notification_claim: { data: true, error: null },
    });
    const { POST } = await import("./route");
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(503);
    expect(rpc).toHaveBeenCalledWith(
      "release_order_notification_claim",
      expect.objectContaining({ p_order_id: ORDER_ID }),
    );
  });

  it("claim=claimed + Telegram API rejects the message releases the claim and returns 502", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad request", { status: 400 })));
    scriptRpc({
      get_order_notification_payload: { data: TRUSTED_ORDER_PAYLOAD, error: null },
      claim_order_notification: { data: "claimed", error: null },
      release_order_notification_claim: { data: true, error: null },
    });
    const { POST } = await import("./route");
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(502);
    expect(rpc).toHaveBeenCalledWith(
      "release_order_notification_claim",
      expect.objectContaining({ p_order_id: ORDER_ID }),
    );
  });

  it("claim=claimed + Telegram succeeds marks the notification durably sent, sends the real order details, and returns ok", async () => {
    scriptRpc({
      get_order_notification_payload: { data: TRUSTED_ORDER_PAYLOAD, error: null },
      claim_order_notification: { data: "claimed", error: null },
      mark_order_notification_sent: { data: true, error: null },
    });
    const { POST } = await import("./route");
    const res = await POST(makeRequest(VALID_BODY));
    const json = await res.json();
    expect(json).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith(
      "mark_order_notification_sent",
      expect.objectContaining({ p_order_id: ORDER_ID }),
    );
    expect(fetch).toHaveBeenCalledTimes(1);

    // Inspect what was actually sent to Telegram, not just that *something*
    // was sent — a blank/garbled message would otherwise report identically
    // green here, defeating the whole point of the trusted-payload pipeline
    // (parseTrustedOrder -> buildTelegramMessage).
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/sendMessage");
    const sentBody = JSON.parse(String((init as RequestInit).body));
    expect(sentBody.chat_id).toBe("test-chat-id");
    const text = String(sentBody.text);
    expect(text).toContain(TRUSTED_ORDER_PAYLOAD.order_code);
    expect(text).toContain(TRUSTED_ORDER_PAYLOAD.customer.name);
    expect(text).toContain(TRUSTED_ORDER_PAYLOAD.customer.phone);
    expect(text).toContain(TRUSTED_ORDER_PAYLOAD.items[0].name);
    expect(text).toContain("Total: 550.00 EGP");
  });

  it("never leaks cost, admin notes, or payment credentials into the real outbound Telegram message", async () => {
    // Unlike a check on the fixture's own key names, this proves the actual
    // sent text — even if a compromised/extended RPC response smuggled a
    // cost/credential field onto the trusted payload, buildTelegramMessage
    // only ever reads the whitelisted fields it's coded to read, so nothing
    // extra can reach the outbound message.
    const tamperedPayload = {
      ...TRUSTED_ORDER_PAYLOAD,
      cogs_total: 999.99,
      supplier_cost: "should-never-appear",
      admin_password_hash: "should-never-appear",
    };
    scriptRpc({
      get_order_notification_payload: { data: tamperedPayload, error: null },
      claim_order_notification: { data: "claimed", error: null },
      mark_order_notification_sent: { data: true, error: null },
    });
    const { POST } = await import("./route");
    await POST(makeRequest(VALID_BODY));

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const sentBody = JSON.parse(String((init as RequestInit).body));
    const text = String(sentBody.text);
    expect(text).not.toContain("999.99");
    expect(text).not.toContain("should-never-appear");
  });
});

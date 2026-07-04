import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type TelegramOrderPayload = {
  orderId: string;
  orderCode: string;
  customer: {
    name: string;
    phone: string;
    whatsapp: string;
  };
  address: {
    governorate: string;
    area: string;
    street: string;
    building: string;
    floorApt: string;
  };
  items: Array<{
    name: string;
    detail: string;
    quantity: number;
  }>;
  total: number;
  paymentMethod: "cash_on_delivery" | "instapay" | "wallet";
  notes: string | null;
};

const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_DEDUPE_ENTRIES = 500;
const globalTelegramState = globalThis as typeof globalThis & {
  lineCoffeeTelegramSent?: Map<string, number>;
};
const sentOrders =
  globalTelegramState.lineCoffeeTelegramSent ??
  (globalTelegramState.lineCoffeeTelegramSent = new Map<string, number>());

// Durable, DB-backed "already sent" guard. The in-memory Map above is per
// serverless instance, so a retry that lands on a cold/other instance would
// re-send. The log table (order_notifications) survives across instances. This
// uses only the public anon/publishable key + validated SECURITY DEFINER RPCs —
// no service role. All DB calls are best-effort: a DB failure here must never
// corrupt the already-saved order or block the notification response.
const NOTIFICATION_CHANNEL = "telegram";
let cachedSupabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (cachedSupabase) return cachedSupabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  cachedSupabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedSupabase;
}

async function durableNotificationWasSent(orderId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { data, error } = await client.rpc("order_notification_was_sent", {
      p_order_id: orderId,
      p_channel: NOTIFICATION_CHANNEL,
    });
    return !error && data === true;
  } catch {
    return false;
  }
}

async function markDurableNotificationSent(orderId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.rpc("log_order_notification", {
      p_order_id: orderId,
      p_channel: NOTIFICATION_CHANNEL,
    });
  } catch {
    // Best-effort: the order is already saved and the message already sent.
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maxLength)
    : "";
}

function parsePayload(value: unknown): TelegramOrderPayload | null {
  const body = asRecord(value);
  const customer = asRecord(body.customer);
  const address = asRecord(body.address);
  const paymentMethod = cleanText(body.paymentMethod, 30);
  const total = Number(body.total);
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  const items = rawItems.map((rawItem) => {
    const item = asRecord(rawItem);
    return {
      name: cleanText(item.name, 120),
      detail: cleanText(item.detail, 120),
      quantity: Number(item.quantity),
    };
  });

  const parsed: TelegramOrderPayload = {
    orderId: cleanText(body.orderId, 80),
    orderCode: cleanText(body.orderCode, 40),
    customer: {
      name: cleanText(customer.name, 120),
      phone: cleanText(customer.phone, 40),
      whatsapp: cleanText(customer.whatsapp, 40),
    },
    address: {
      governorate: cleanText(address.governorate, 80),
      area: cleanText(address.area, 80),
      street: cleanText(address.street, 180),
      building: cleanText(address.building, 80),
      floorApt: cleanText(address.floorApt, 80),
    },
    items,
    total,
    paymentMethod: paymentMethod as TelegramOrderPayload["paymentMethod"],
    notes: cleanText(body.notes, 500) || null,
  };

  const validItems =
    parsed.items.length > 0 &&
    parsed.items.every(
      (item) =>
        item.name &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= 1000,
    );
  const validPaymentMethod = ["cash_on_delivery", "instapay", "wallet"].includes(
    parsed.paymentMethod,
  );

  return parsed.orderId &&
    parsed.orderCode &&
    parsed.customer.name &&
    parsed.customer.phone &&
    parsed.address.governorate &&
    parsed.address.area &&
    parsed.address.street &&
    Number.isFinite(parsed.total) &&
    parsed.total >= 0 &&
    validItems &&
    validPaymentMethod
    ? parsed
    : null;
}

function cleanupDedupeCache(now: number) {
  for (const [orderId, sentAt] of sentOrders) {
    if (now - sentAt > DEDUPE_TTL_MS) sentOrders.delete(orderId);
  }
  while (sentOrders.size > MAX_DEDUPE_ENTRIES) {
    const oldestOrderId = sentOrders.keys().next().value;
    if (!oldestOrderId) break;
    sentOrders.delete(oldestOrderId);
  }
}

function buildAdminOrderUrl(request: Request, orderId: string) {
  const configuredBase = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  let baseUrl = new URL(request.url).origin;
  if (configuredBase) {
    try {
      baseUrl = new URL(configuredBase).origin;
    } catch {
      // The request origin is a safe fallback for local and deployed environments.
    }
  }

  const adminUrl = new URL("/admin/orders", baseUrl);
  adminUrl.searchParams.set("order", orderId);
  return adminUrl.toString();
}

function buildTelegramMessage(payload: TelegramOrderPayload, adminUrl: string) {
  const paymentMethod = {
    cash_on_delivery: "Cash on Delivery",
    instapay: "InstaPay",
    wallet: "Wallet",
  }[payload.paymentMethod];
  const address = [
    payload.address.street,
    payload.address.building && `Building ${payload.address.building}`,
    payload.address.floorApt,
    payload.address.area,
    payload.address.governorate,
  ]
    .filter(Boolean)
    .join(", ");
  const itemLines = payload.items.map(
    (item) =>
      `• ${item.name}${item.detail ? ` (${item.detail})` : ""} × ${item.quantity}`,
  );

  return [
    "☕ New Line Coffee order",
    "",
    `Order: ${payload.orderCode}`,
    `Customer: ${payload.customer.name}`,
    `Phone: ${payload.customer.phone}`,
    `WhatsApp: ${payload.customer.whatsapp || "Same as phone / not provided"}`,
    `Address: ${address}`,
    "",
    "Items:",
    ...itemLines,
    "",
    `Total: ${payload.total.toFixed(2)} EGP`,
    `Payment: ${paymentMethod}`,
    `Notes: ${payload.notes || "None provided"}`,
    "",
    `Admin: ${adminUrl}`,
  ]
    .join("\n")
    .slice(0, 4000);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ ok: false, warning: "Request origin rejected." }, { status: 403 });
  }

  let payload: TelegramOrderPayload | null = null;
  try {
    payload = parsePayload(await request.json());
  } catch {
    // Invalid JSON receives the same safe validation response as an invalid shape.
  }
  if (!payload) {
    return Response.json({ ok: false, warning: "Invalid notification request." }, { status: 400 });
  }

  const now = Date.now();
  cleanupDedupeCache(now);
  if (sentOrders.has(payload.orderId)) {
    return Response.json({ ok: true, duplicate: true });
  }
  // Durable cross-instance guard. If a prior instance already recorded this
  // order as notified, treat it as a duplicate (and refresh the local cache).
  if (await durableNotificationWasSent(payload.orderId)) {
    sentOrders.set(payload.orderId, now);
    return Response.json({ ok: true, duplicate: true });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!botToken || !chatId) {
    console.error("[telegram-order] Telegram is not configured.", {
      orderId: payload.orderId,
    });
    return Response.json(
      { ok: false, warning: "Admin notification is temporarily unavailable." },
      { status: 503 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildTelegramMessage(
          payload,
          buildAdminOrderUrl(request, payload.orderId),
        ),
        disable_web_page_preview: true,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("[telegram-order] Telegram rejected the notification.", {
        orderId: payload.orderId,
        status: response.status,
      });
      return Response.json(
        { ok: false, warning: "Admin notification could not be confirmed." },
        { status: 502 },
      );
    }

    sentOrders.set(payload.orderId, now);
    await markDurableNotificationSent(payload.orderId);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[telegram-order] Telegram request failed.", {
      orderId: payload.orderId,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return Response.json(
      { ok: false, warning: "Admin notification could not be confirmed." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type NotificationRequest = {
  orderId: string;
  checkoutAttemptId: string;
};

type TrustedOrder = {
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
    landmark: string;
  };
  items: Array<{
    name: string;
    detail: string;
    quantity: number;
  }>;
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  paymentMethod: "cash_on_delivery" | "instapay" | "wallet";
  notes: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ATTEMPT_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_DEDUPE_ENTRIES = 500;
const NOTIFICATION_CHANNEL = "telegram";
const globalTelegramState = globalThis as typeof globalThis & {
  lineCoffeeTelegramSent?: Map<string, number>;
};
const sentOrders =
  globalTelegramState.lineCoffeeTelegramSent ??
  (globalTelegramState.lineCoffeeTelegramSent = new Map<string, number>());

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maxLength)
    : "";
}

function amount(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseRequest(value: unknown): NotificationRequest | null {
  const body = asRecord(value);
  const orderId = text(body.orderId, 80);
  const checkoutAttemptId = text(body.checkoutAttemptId, 64);
  return UUID_PATTERN.test(orderId) && ATTEMPT_PATTERN.test(checkoutAttemptId)
    ? { orderId, checkoutAttemptId }
    : null;
}

function parseTrustedOrder(value: unknown): TrustedOrder | null {
  const row = asRecord(value);
  const customer = asRecord(row.customer);
  const address = asRecord(row.address);
  const paymentMethod = text(row.payment_method, 30);
  const rawItems = Array.isArray(row.items) ? row.items.slice(0, 50) : [];
  const items = rawItems.map((rawItem) => {
    const item = asRecord(rawItem);
    return {
      name: text(item.name, 160),
      detail: text(item.detail, 160),
      quantity: Number(item.quantity),
    };
  });
  const subtotal = amount(row.subtotal);
  const discount = amount(row.discount);
  const delivery = amount(row.delivery);
  const total = amount(row.total);

  if (
    !UUID_PATTERN.test(text(row.order_id, 80)) ||
    !text(row.order_code, 40) ||
    !text(customer.name, 120) ||
    !text(customer.phone, 40) ||
    !text(address.governorate, 80) ||
    !text(address.street, 180) ||
    items.length === 0 ||
    items.some(
      (item) =>
        !item.name ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 1000,
    ) ||
    subtotal === null ||
    discount === null ||
    delivery === null ||
    total === null ||
    !["cash_on_delivery", "instapay", "wallet"].includes(paymentMethod)
  ) {
    return null;
  }

  return {
    orderId: text(row.order_id, 80),
    orderCode: text(row.order_code, 40),
    customer: {
      name: text(customer.name, 120),
      phone: text(customer.phone, 40),
      whatsapp: text(customer.whatsapp, 40),
    },
    address: {
      governorate: text(address.governorate, 80),
      area: text(address.area, 80),
      street: text(address.street, 180),
      building: text(address.building, 80),
      floorApt: text(address.floor_apt, 80),
      landmark: text(address.landmark, 120),
    },
    items,
    subtotal,
    discount,
    delivery,
    total,
    paymentMethod: paymentMethod as TrustedOrder["paymentMethod"],
    notes: text(row.notes, 500) || null,
  };
}

async function getTrustedOrder(
  client: SupabaseClient,
  request: NotificationRequest,
): Promise<TrustedOrder | null> {
  const { data, error } = await client.rpc("get_order_notification_payload", {
    p_order_id: request.orderId,
    p_checkout_attempt_id: request.checkoutAttemptId,
  });
  if (error || !data) return null;
  const trusted = parseTrustedOrder(data);
  return trusted?.orderId === request.orderId ? trusted : null;
}

async function durableNotificationWasSent(
  client: SupabaseClient,
  request: NotificationRequest,
): Promise<boolean> {
  try {
    const { data, error } = await client.rpc("order_notification_was_sent", {
      p_order_id: request.orderId,
      p_channel: NOTIFICATION_CHANNEL,
      p_checkout_attempt_id: request.checkoutAttemptId,
    });
    return !error && data === true;
  } catch {
    return false;
  }
}

async function markDurableNotificationSent(
  client: SupabaseClient,
  request: NotificationRequest,
): Promise<void> {
  try {
    await client.rpc("log_order_notification", {
      p_order_id: request.orderId,
      p_channel: NOTIFICATION_CHANNEL,
      p_checkout_attempt_id: request.checkoutAttemptId,
    });
  } catch {
    // The order is already saved and Telegram already accepted the message.
  }
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
      // The request origin is the safe local/deployed fallback.
    }
  }
  const adminUrl = new URL("/admin/orders", baseUrl);
  adminUrl.searchParams.set("order", orderId);
  return adminUrl.toString();
}

function buildTelegramMessage(order: TrustedOrder, adminUrl: string) {
  const paymentMethod = {
    cash_on_delivery: "Cash on Delivery",
    instapay: "InstaPay",
    wallet: "Wallet",
  }[order.paymentMethod];
  const address = [
    order.address.street,
    order.address.building && `Building ${order.address.building}`,
    order.address.floorApt,
    order.address.landmark,
    order.address.area,
    order.address.governorate,
  ]
    .filter(Boolean)
    .join(", ");
  const itemLines = order.items.map(
    (item) =>
      `• ${item.name}${item.detail ? ` (${item.detail})` : ""} × ${item.quantity}`,
  );

  return [
    "☕ New Line Coffee order",
    "",
    `Order: ${order.orderCode}`,
    `Customer: ${order.customer.name}`,
    `Phone: ${order.customer.phone}`,
    `WhatsApp: ${order.customer.whatsapp || "Same as phone / not provided"}`,
    `Address: ${address}`,
    "",
    "Items:",
    ...itemLines,
    "",
    `Subtotal: ${order.subtotal.toFixed(2)} EGP`,
    `Discount: ${order.discount.toFixed(2)} EGP`,
    `Delivery: ${order.delivery.toFixed(2)} EGP`,
    `Total: ${order.total.toFixed(2)} EGP`,
    `Payment: ${paymentMethod}`,
    `Notes: ${order.notes || "None provided"}`,
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

  let notificationRequest: NotificationRequest | null = null;
  try {
    notificationRequest = parseRequest(await request.json());
  } catch {
    // Invalid JSON receives the same safe validation response as an invalid shape.
  }
  if (!notificationRequest) {
    return Response.json({ ok: false, warning: "Invalid notification request." }, { status: 400 });
  }

  const client = getSupabaseClient();
  if (!client) {
    return Response.json(
      { ok: false, warning: "Admin notification is temporarily unavailable." },
      { status: 503 },
    );
  }

  // This is the trust boundary: all message fields are fetched from the database
  // using order id + the checkout attempt capability. Browser-supplied order
  // names, totals, items, addresses, or payment details are never accepted.
  const trustedOrder = await getTrustedOrder(client, notificationRequest);
  if (!trustedOrder) {
    return Response.json({ ok: false, warning: "Order not found." }, { status: 404 });
  }

  const now = Date.now();
  cleanupDedupeCache(now);
  if (sentOrders.has(trustedOrder.orderId)) {
    return Response.json({ ok: true, duplicate: true });
  }
  if (await durableNotificationWasSent(client, notificationRequest)) {
    sentOrders.set(trustedOrder.orderId, now);
    return Response.json({ ok: true, duplicate: true });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!botToken || !chatId) {
    console.error("[telegram-order] Telegram is not configured.", {
      orderId: trustedOrder.orderId,
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
          trustedOrder,
          buildAdminOrderUrl(request, trustedOrder.orderId),
        ),
        disable_web_page_preview: true,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("[telegram-order] Telegram rejected the notification.", {
        orderId: trustedOrder.orderId,
        status: response.status,
      });
      return Response.json(
        { ok: false, warning: "Admin notification could not be confirmed." },
        { status: 502 },
      );
    }

    sentOrders.set(trustedOrder.orderId, now);
    await markDurableNotificationSent(client, notificationRequest);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[telegram-order] Telegram request failed.", {
      orderId: trustedOrder.orderId,
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

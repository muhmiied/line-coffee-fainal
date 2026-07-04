"use client";

// Line Coffee V3 — Admin Settings data layer (Phase 17A)
//
// Real, Supabase-backed store settings for the Admin Settings page. Reads and
// upserts rows in `public.site_settings` (the launch-core key/value config table
// created in Migration 1). No mock/local state — values persist across refresh.
//
// Access model (admin-only writes):
//   * All operations run as the browser `authenticated` role and are gated by
//     the existing site_settings_admin_all (is_admin()) RLS policy, so only a
//     signed-in admin can read/write. Migration 20260704160000 adds the table
//     grants that make this reachable at all.
//   * Every key managed here is public-facing store info (store name, contact,
//     social links, store status), stored with scope = 'public' / is_public =
//     true. No private admin data (login emails, credentials) is ever written
//     here — those live in admin_users and are never exposed.
//
// Honesty boundary: these are the persisted business settings (the source of
// truth going forward). This module does NOT change checkout / delivery / order
// logic. The delivery fee is still computed by resolve_delivery_fee() in SQL, so
// it is deliberately NOT surfaced as an editable field here (editing it would be
// fake). The public site displays the store-status notice; atomic order blocking
// remains unenforced until the checkout RPC can own that rule safely.

import { supabase } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types (the shape the Settings UI consumes)
// ---------------------------------------------------------------------------

export type BrandSettings = {
  storeName: string;
  defaultCurrency: string;
};

export type ContactSettings = {
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  businessAddress: string;
};

export type SocialSettings = {
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  whatsapp: string;
};

export type StorefrontSettings = {
  storeOpen: boolean;
  closedNotice: string;
};

export type AdminSettings = {
  brand: BrandSettings;
  contact: ContactSettings;
  social: SocialSettings;
  storefront: StorefrontSettings;
};

// The four site_settings keys this page owns. All are public-scoped.
const SETTING_KEYS = ["brand", "contact", "social_links", "storefront"] as const;

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  brand: { storeName: "Line Coffee", defaultCurrency: "EGP" },
  contact: { supportEmail: "", supportPhone: "", whatsappNumber: "", businessAddress: "" },
  social: { facebook: "", instagram: "", tiktok: "", youtube: "", whatsapp: "" },
  storefront: { storeOpen: true, closedNotice: "" },
};

// ---------------------------------------------------------------------------
// Errors + logging (mirrors admin-purchasing.ts idiom)
// ---------------------------------------------------------------------------

export class AdminSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminSettingsError";
  }
}

function devWarn(scope: string, message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[admin-settings:${scope}] ${message}`);
  }
}

function readError(scope: string, message: string) {
  devWarn(scope, message);
  return new AdminSettingsError("Could not load settings. Please try again.");
}

function writeError(scope: string, message: string) {
  devWarn(scope, message);
  if (message.includes("Admin access required") || message.includes("permission denied")) {
    return new AdminSettingsError("Admin permission is required to change settings.");
  }
  return new AdminSettingsError("Could not save settings. Please try again.");
}

// ---------------------------------------------------------------------------
// Safe jsonb readers — each stored value is `unknown`; narrow defensively.
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function mapBrand(value: unknown): BrandSettings {
  const r = asRecord(value);
  return {
    storeName: str(r.storeName, DEFAULT_ADMIN_SETTINGS.brand.storeName),
    defaultCurrency: str(r.defaultCurrency, DEFAULT_ADMIN_SETTINGS.brand.defaultCurrency),
  };
}

function mapContact(value: unknown): ContactSettings {
  const r = asRecord(value);
  return {
    supportEmail: str(r.supportEmail),
    supportPhone: str(r.supportPhone),
    whatsappNumber: str(r.whatsappNumber),
    businessAddress: str(r.businessAddress),
  };
}

function mapSocial(value: unknown): SocialSettings {
  const r = asRecord(value);
  return {
    facebook: str(r.facebook),
    instagram: str(r.instagram),
    tiktok: str(r.tiktok),
    youtube: str(r.youtube),
    whatsapp: str(r.whatsapp),
  };
}

function mapStorefront(value: unknown): StorefrontSettings {
  const r = asRecord(value);
  return {
    storeOpen: bool(r.storeOpen, DEFAULT_ADMIN_SETTINGS.storefront.storeOpen),
    closedNotice: str(r.closedNotice),
  };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getAdminSettings(): Promise<AdminSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", SETTING_KEYS as unknown as string[]);

  if (error) throw readError("load", error.message);

  const byKey = new Map<string, unknown>();
  for (const row of (data ?? []) as Array<{ key: string; value: unknown }>) {
    byKey.set(row.key, row.value);
  }

  return {
    brand: mapBrand(byKey.get("brand")),
    contact: mapContact(byKey.get("contact")),
    social: mapSocial(byKey.get("social_links")),
    storefront: mapStorefront(byKey.get("storefront")),
  };
}

// Public callers receive only the four launch-safe rows, and the query repeats
// the database visibility predicates as defense in depth. RLS remains the
// authoritative boundary.
export async function getPublicSettings(): Promise<AdminSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .eq("scope", "public")
    .eq("is_public", true)
    .in("key", SETTING_KEYS as unknown as string[]);

  if (error) throw readError("public-load", error.message);

  const byKey = new Map<string, unknown>();
  for (const row of (data ?? []) as Array<{ key: string; value: unknown }>) {
    byKey.set(row.key, row.value);
  }

  return {
    brand: mapBrand(byKey.get("brand")),
    contact: mapContact(byKey.get("contact")),
    social: mapSocial(byKey.get("social_links")),
    storefront: mapStorefront(byKey.get("storefront")),
  };
}

export function toPublicHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const PLACEHOLDER_PHONE_DIGITS = new Set([
  "01000000000",
  "1000000000",
  "201000000000",
]);

function toInternationalPhoneDigits(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (PLACEHOLDER_PHONE_DIGITS.has(digits)) return null;

  if (/^01\d{9}$/.test(digits)) {
    return `20${digits.slice(1)}`;
  }
  if (/^201\d{9}$/.test(digits)) {
    return digits;
  }

  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function resolvePublicPhone(...values: string[]): string | null {
  for (const value of values) {
    if (toInternationalPhoneDigits(value)) return value.trim();
  }
  return null;
}

export function formatPublicPhone(value: string): string | null {
  const digits = toInternationalPhoneDigits(value);
  if (!digits) return null;
  return /^201\d{9}$/.test(digits) ? `0${digits.slice(2)}` : value.trim();
}

export function toPhoneHref(value: string): string | null {
  const digits = toInternationalPhoneDigits(value);
  return digits ? `tel:+${digits}` : null;
}

export function toEmailHref(value: string): string | null {
  const normalized = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ? `mailto:${normalized}`
    : null;
}

export function toWhatsAppHref(number: string, explicitLink = ""): string | null {
  const configuredLink = toPublicHttpUrl(explicitLink);
  if (configuredLink) {
    const url = new URL(configuredLink);
    const isWhatsAppHost = ["wa.me", "api.whatsapp.com", "web.whatsapp.com"].includes(
      url.hostname.toLowerCase(),
    );
    const linkedValue = url.searchParams.get("phone") || url.pathname;
    const linkedDigits = linkedValue.replace(/\D/g, "");
    if (isWhatsAppHost && (!linkedDigits || toInternationalPhoneDigits(linkedDigits))) {
      return configuredLink;
    }
  }

  const digits = toInternationalPhoneDigits(number);
  return digits ? `https://wa.me/${digits}` : null;
}

// ---------------------------------------------------------------------------
// Write — upsert the four public-scoped keys in one call. Values are sanitized
// (trimmed) here so we never persist stray junk. scope='public' + is_public=true
// satisfies the table's public-scope CHECK; RLS is_admin() gates the write.
// ---------------------------------------------------------------------------

export async function saveAdminSettings(next: AdminSettings): Promise<void> {
  const s = (v: string) => v.trim();

  const rows = [
    {
      key: "brand",
      scope: "public",
      is_public: true,
      value: {
        storeName: s(next.brand.storeName) || DEFAULT_ADMIN_SETTINGS.brand.storeName,
        defaultCurrency:
          s(next.brand.defaultCurrency).toUpperCase() ||
          DEFAULT_ADMIN_SETTINGS.brand.defaultCurrency,
      },
    },
    {
      key: "contact",
      scope: "public",
      is_public: true,
      value: {
        supportEmail: s(next.contact.supportEmail),
        supportPhone: s(next.contact.supportPhone),
        whatsappNumber: s(next.contact.whatsappNumber),
        businessAddress: s(next.contact.businessAddress),
      },
    },
    {
      key: "social_links",
      scope: "public",
      is_public: true,
      value: {
        facebook: s(next.social.facebook),
        instagram: s(next.social.instagram),
        tiktok: s(next.social.tiktok),
        youtube: s(next.social.youtube),
        whatsapp: s(next.social.whatsapp),
      },
    },
    {
      key: "storefront",
      scope: "public",
      is_public: true,
      value: {
        storeOpen: Boolean(next.storefront.storeOpen),
        closedNotice: s(next.storefront.closedNotice),
      },
    },
  ];

  const { error } = await supabase
    .from("site_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) throw writeError("save", error.message);
}

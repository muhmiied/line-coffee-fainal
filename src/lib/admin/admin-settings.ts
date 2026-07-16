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
import {
  DEFAULT_PUBLIC_SETTINGS,
  PUBLIC_SETTING_KEYS,
  mapSiteSettingsRows,
  type BrandSettings,
  type ContactSettings,
  type SiteSettings,
  type SocialSettings,
  type StorefrontSettings,
} from "@/lib/settings/site-settings-shared";

export type {
  BrandSettings,
  ContactSettings,
  SocialSettings,
  StorefrontSettings,
};

// ---------------------------------------------------------------------------
// Types (the shape the Settings UI consumes)
// ---------------------------------------------------------------------------

export type AdminSettings = SiteSettings;

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = DEFAULT_PUBLIC_SETTINGS;

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
// Read
// ---------------------------------------------------------------------------

export async function getAdminSettings(): Promise<AdminSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", PUBLIC_SETTING_KEYS as unknown as string[]);

  if (error) throw readError("load", error.message);
  return mapSiteSettingsRows(
    (data ?? []) as Array<{ key: string; value: unknown }>,
  );
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

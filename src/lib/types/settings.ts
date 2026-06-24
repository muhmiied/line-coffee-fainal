// Line Coffee V3 — Launch-Core Site Settings Contract
// settings.ts — site-wide configuration that should be DB-backed later.
//
// Phase 3E. Type-only. Additive. Not yet imported anywhere.
//
// Closes the settings gap identified in the Supabase Schema + Real Data
// Transition Plan (§B gap, §E table 32): launch config (delivery fees, free-
// delivery threshold, contact info, payment methods, brand/SEO) is scattered as
// hardcoded constants across the codebase. This contract defines a single
// key/value settings shape plus typed shapes for the two settings most likely
// to drive real logic at launch (shipping + checkout). No runtime logic here.

import type { ID, ISODateTime, Money } from "@/lib/types/common";

// Visibility scope of a setting. "public" is safe for the website/anon to read
// (e.g. contact info); "admin" is dashboard-only; "system" is internal config.
// Supabase mapping: `site_settings.scope` (drives RLS: only public/safe keys
// are anon-readable).
export type SiteSettingScope = "public" | "admin" | "system";

// Known launch setting keys. The settings table is intentionally open
// (`key: SiteSettingKey | string`) so new keys can be added without a migration,
// but these are the canonical ones the app expects.
// Supabase mapping: `site_settings.key`.
export type SiteSettingKey =
  | "brand"
  | "contact"
  | "social_links"
  | "shipping"
  | "checkout"
  | "seo"
  | "announcement_defaults"
  | "free_delivery_threshold"
  | "whatsapp_number";

// A single site-wide setting row. `value` is `unknown` because each key carries
// a different payload (e.g. `shipping` → ShippingSettings, `whatsapp_number` →
// string); consumers narrow it by key. `isPublic` is the hard read-gate.
// Supabase mapping: `site_settings` table (value stored as jsonb).
export interface SiteSetting {
  id: ID;
  key: SiteSettingKey | string;
  scope: SiteSettingScope;
  value: unknown;
  isPublic: boolean;
  updatedBy?: ID;
  createdAt: ISODateTime;
  updatedAt?: ISODateTime;
}

// Typed payload for the "shipping" setting key. Drives delivery fee calculation
// and free-delivery threshold at checkout. Replaces the hardcoded
// "free ≥ 500 EGP else 50 EGP" constant.
// Supabase mapping: `site_settings.value` where key = "shipping".
export interface ShippingSettings {
  cairoFee: Money;
  gizaFee: Money;
  otherGovernoratesFee?: Money;
  freeDeliveryThreshold?: Money;
  enabledGovernorates?: string[];
}

// Typed payload for the "checkout" setting key. Controls guest checkout, the
// active payment methods offered, the WhatsApp requirement, and the order code
// prefix (e.g. "LC-").
// Supabase mapping: `site_settings.value` where key = "checkout".
export interface CheckoutSettings {
  allowGuestCheckout: boolean;
  activePaymentMethods: string[];
  requireWhatsApp: boolean;
  orderCodePrefix: string;
}

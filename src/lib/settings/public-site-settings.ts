"use client";

import { supabase } from "@/lib/supabase/client";
import {
  PUBLIC_SETTING_KEYS,
  mapSiteSettingsRows,
  type PublicSiteSettings,
} from "@/lib/settings/site-settings-shared";

export {
  DEFAULT_PUBLIC_SETTINGS,
  formatPublicPhone,
  resolvePublicPhone,
  toEmailHref,
  toPhoneHref,
  toPublicHttpUrl,
  toWhatsAppHref,
} from "@/lib/settings/site-settings-shared";
export type {
  BrandSettings,
  ContactSettings,
  PublicContactSettings,
  PublicSiteSettings,
  PublicSocialSettings,
  SocialSettings,
  StorefrontSettings,
} from "@/lib/settings/site-settings-shared";

const PUBLIC_SETTINGS_CACHE_MS = 5 * 60 * 1000;
let settingsPromise: Promise<PublicSiteSettings> | null = null;
let settingsRequestedAt = 0;

export function getPublicSettings(): Promise<PublicSiteSettings> {
  const now = Date.now();
  if (settingsPromise && now - settingsRequestedAt < PUBLIC_SETTINGS_CACHE_MS) {
    return settingsPromise;
  }

  settingsRequestedAt = now;
  const request = Promise.resolve(
    supabase
      .from("site_settings")
      .select("key,value")
      .eq("scope", "public")
      .eq("is_public", true)
      .in("key", [...PUBLIC_SETTING_KEYS]),
  )
    .then(({ data, error }) => {
      if (error) throw new Error(error.message);
      return mapSiteSettingsRows(
        (data ?? []) as Array<{ key: string; value: unknown }>,
      );
    });

  const cachedRequest = request.catch((error: unknown) => {
    if (settingsPromise === cachedRequest) settingsPromise = null;
    throw error;
  });
  settingsPromise = cachedRequest;
  return cachedRequest;
}

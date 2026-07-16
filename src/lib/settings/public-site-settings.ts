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

export async function getPublicSettings(): Promise<PublicSiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("key,value")
    .eq("scope", "public")
    .eq("is_public", true)
    .in("key", [...PUBLIC_SETTING_KEYS]);

  if (error) throw new Error(error.message);
  return mapSiteSettingsRows(
    (data ?? []) as Array<{ key: string; value: unknown }>,
  );
}

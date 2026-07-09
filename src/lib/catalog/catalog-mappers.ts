// Shared Supabase row → app-shape mapping helpers for the catalog data layers.
//
// These four helpers were previously duplicated byte-for-byte in both
// `public-catalog.ts` and `admin/admin-catalog.ts`. They are pure and have no
// Supabase/client dependency, so they live here and are imported by both.

import type { LocalizedValue } from "@/lib/context/language";

/** Coerce a numeric-or-string DB value to a finite number, else `fallback`. */
export function toNumber(
  value: number | string | null | undefined,
  fallback = 0,
) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/** Like `toNumber`, but returns `undefined` for null/undefined/non-finite. */
export function toOptionalNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return undefined;
  const parsed = toNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Build a trimmed bilingual value, falling back AR→EN when AR is empty. */
export function localized(en?: string | null, ar?: string | null): LocalizedValue {
  return {
    en: en?.trim() ?? "",
    ar: ar?.trim() ?? en?.trim() ?? "",
  };
}

/** True when either language slot of a localized value is non-empty. */
export function hasLocalizedValue(value?: LocalizedValue) {
  return Boolean(value?.en || value?.ar);
}

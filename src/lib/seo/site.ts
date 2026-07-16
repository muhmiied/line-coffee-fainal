// Line Coffee V3 — Phase 20A: SEO + AI-search foundation (site constants).
//
// Framework-agnostic brand/SEO constants and small URL/text helpers shared by
// the metadata layers, sitemap, robots, JSON-LD builders, and the /llms.txt
// endpoint. No data access, no UI. Safe to import from server or client code.
//
// The canonical base URL is env-driven (NEXT_PUBLIC_SITE_URL) with a brand-safe
// fallback to the Line Coffee domain, so canonicals/OG/sitemap all resolve to
// one absolute origin. Set NEXT_PUBLIC_SITE_URL in the deployment env to the
// real launch domain to override the fallback.

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "https://linecoffee.eg";

/** Absolute site origin, no trailing slash. */
export const SITE_URL = rawSiteUrl.replace(/\/+$/, "");

export const SITE_NAME = "Line Coffee";
export const SITE_NAME_AR = "لاين كوفي";
export const FOUNDING_YEAR = "2015";

/** Real, configured WhatsApp contact number (international digits, e.g. 201004761171). */
export const SITE_WHATSAPP_PHONE = (process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "").trim();

/** Default social share / OG image — a real raster hero asset (good for OG rendering). */
export const DEFAULT_OG_IMAGE = "/assets/hero/dark-roast.png";

/** Brand logo (used for Organization structured data). */
export const BRAND_LOGO = "/brand/logo-colored.svg";

export const DEFAULT_TITLE = "Line Coffee — Premium Egyptian Specialty Coffee";

export const DEFAULT_DESCRIPTION =
  "Line Coffee is a premium Egyptian specialty coffee brand, family-run since 2015. " +
  "Shop Turkish blends, espresso blends, easy coffee, flavored coffee, coffee mix, cappuccino and hot chocolate, " +
  "or build your own with Make Your Espresso and Make Your Flavor. Carefully sourced and delivered across Egypt.";

export const SITE_KEYWORDS = [
  "Line Coffee",
  "لاين كوفي",
  "Egyptian coffee",
  "specialty coffee Egypt",
  "coffee Cairo",
  "قهوة",
  "قهوة مختصة",
  "قهوة تركي",
  "Turkish coffee",
  "espresso blends",
  "خلطات إسبريسو",
  "coffee beans Egypt",
  "flavored coffee",
  "قهوة بالنكهات",
  "cappuccino",
  "hot chocolate",
  "make your espresso",
  "custom coffee blend",
];

/**
 * Canonical public product categories (slug + bilingual name). Used for the
 * sitemap fallback, the /llms.txt summary, and category name lookups. Mirrors
 * the real catalog category slugs; the sitemap prefers live DB data when
 * available and only falls back to this list.
 */
export const SITE_CATEGORIES = [
  { slug: "turkish-blends", en: "Turkish Blends", ar: "خلطات تركي" },
  { slug: "espresso-blends", en: "Espresso Blends", ar: "خلطات إسبريسو" },
  { slug: "easy-coffee", en: "Easy Coffee", ar: "قهوة سريعة التحضير" },
  { slug: "coffee-mix", en: "Coffee Mix", ar: "كوفي ميكس" },
  { slug: "cappuccino", en: "Cappuccino", ar: "كابتشينو" },
  { slug: "hot-chocolate", en: "Hot Chocolate", ar: "هوت شوكليت" },
  { slug: "flavor-coffee", en: "Flavor Coffee", ar: "قهوة نكهات" },
] as const;

export function categoryNameForSlug(slug: string): string {
  return SITE_CATEGORIES.find((category) => category.slug === slug)?.en ?? slug;
}

/** Build an absolute URL from a site-relative path (or pass through http(s) URLs). */
export function absoluteUrl(path = "/"): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Collapse whitespace and clamp to a metadata-friendly length. */
export function seoText(value: string | null | undefined, max = 160): string {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Normalize a phone number to bare E.164 digits (no leading "+"), the same
 * way src/lib/admin/admin-settings.ts's toInternationalPhoneDigits() does —
 * duplicated here (rather than imported from that "use client" module) so
 * this server-only SEO code has no dependency on the browser Supabase
 * client. Egyptian local mobiles (01XXXXXXXXX) become 20XXXXXXXXXX; numbers
 * already carrying the 20 country code pass through unchanged.
 */
export function toInternationalPhoneDigits(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (/^01\d{9}$/.test(digits)) return `20${digits.slice(1)}`;
  if (/^201\d{9}$/.test(digits)) return digits;

  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

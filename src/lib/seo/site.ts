// Line Coffee V3 — Phase 20A: SEO + AI-search foundation (site constants).
//
// Framework-agnostic brand/SEO constants and small URL/text helpers shared by
// the metadata layers, sitemap, robots, JSON-LD builders, and the /llms.txt
// endpoint. No data access, no UI. Safe to import from server or client code.
//
// The canonical base URL is env-driven (NEXT_PUBLIC_SITE_URL). A silent,
// always-on fallback to the production domain is unsafe: it would make a
// misconfigured deployment (a forgotten env var on a new environment, or a
// real domain change) emit confidently-wrong canonical/OG/sitemap/JSON-LD
// URLs with no signal anywhere that anything is wrong. So the fallback is
// scoped by what's actually running:
//   - local dev (`next dev`)         -> quiet console.warn, localhost fallback
//     (never crawled/indexed, so a wrong value here is harmless)
//   - a real live Vercel production
//     deployment (VERCEL_ENV==="production") -> loud console.error, since
//     this is the one case that genuinely serves real traffic/canonicals
//   - anything else (a local `next build`, CI, a Vercel preview build)
//     -> a single quiet console.warn, same real-domain fallback (localhost
//     would be wrong for a build that might get deployed or previewed)
// `next build` always sets NODE_ENV=production even for a local sanity-check
// build, so NODE_ENV alone can't tell a real deploy apart from a local build
// — that's what VERCEL_ENV narrows down. Set NEXT_PUBLIC_SITE_URL in the
// deployment env to the real launch domain to silence the warning entirely.
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL;
const isLocalDev = process.env.NODE_ENV !== "production";
const isRealProductionDeploy = process.env.VERCEL_ENV === "production";
const PRODUCTION_FALLBACK_SITE_URL = "https://linecoffee.eg";

if (!configuredSiteUrl) {
  if (isLocalDev) {
    console.warn(
      "[seo/site] NEXT_PUBLIC_SITE_URL is not set — using http://localhost:3000 for local development only.",
    );
  } else if (isRealProductionDeploy) {
    console.error(
      `[seo/site] NEXT_PUBLIC_SITE_URL is not set on a live production deployment. ` +
        `Falling back to ${PRODUCTION_FALLBACK_SITE_URL}, which may be WRONG for this deployment ` +
        `(canonical URLs, Open Graph tags, sitemap.xml, and JSON-LD will all be built from it). ` +
        `Set NEXT_PUBLIC_SITE_URL to the real domain for this environment.`,
    );
  } else {
    console.warn(
      `[seo/site] NEXT_PUBLIC_SITE_URL is not set for this build. Falling back to ` +
        `${PRODUCTION_FALLBACK_SITE_URL} — set it explicitly if this build is deployed anywhere.`,
    );
  }
}

const rawSiteUrl =
  configuredSiteUrl || (isLocalDev ? "http://localhost:3000" : PRODUCTION_FALLBACK_SITE_URL);

/** Absolute site origin, no trailing slash. */
export const SITE_URL = rawSiteUrl.replace(/\/+$/, "");

export const SITE_NAME = "Line Coffee";
export const SITE_NAME_AR = "لاين كوفي";
export const FOUNDING_YEAR = "2015";

/** Real, configured WhatsApp contact number (international digits, e.g. 201004761171). */
export const SITE_WHATSAPP_PHONE = (process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "").trim();

/** Default social share / OG image — a real raster hero asset (good for OG rendering). */
export const DEFAULT_OG_IMAGE = "/site-images/shared/metadata/default-og.png";

/** Brand logo (used for Organization structured data). */
export const BRAND_LOGO = "/site-images/shared/logos/line-coffee-colored.svg";

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

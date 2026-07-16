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

export type SiteSettings = {
  brand: BrandSettings;
  contact: ContactSettings;
  social: SocialSettings;
  storefront: StorefrontSettings;
};

export type PublicSiteSettings = SiteSettings;
export type PublicContactSettings = ContactSettings;
export type PublicSocialSettings = SocialSettings;

export const PUBLIC_SETTING_KEYS = [
  "brand",
  "contact",
  "social_links",
  "storefront",
] as const;

export const DEFAULT_PUBLIC_SETTINGS: SiteSettings = {
  brand: { storeName: "Line Coffee", defaultCurrency: "EGP" },
  contact: {
    supportEmail: "",
    supportPhone: "",
    whatsappNumber: "",
    businessAddress: "",
  },
  social: { facebook: "", instagram: "", tiktok: "", youtube: "", whatsapp: "" },
  storefront: { storeOpen: true, closedNotice: "" },
};

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

export function mapSiteSettingsRows(
  rows: Array<{ key: string; value: unknown }>,
): SiteSettings {
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  const brand = asRecord(byKey.get("brand"));
  const contact = asRecord(byKey.get("contact"));
  const social = asRecord(byKey.get("social_links"));
  const storefront = asRecord(byKey.get("storefront"));

  return {
    brand: {
      storeName: str(brand.storeName, DEFAULT_PUBLIC_SETTINGS.brand.storeName),
      defaultCurrency: str(
        brand.defaultCurrency,
        DEFAULT_PUBLIC_SETTINGS.brand.defaultCurrency,
      ),
    },
    contact: {
      supportEmail: str(contact.supportEmail),
      supportPhone: str(contact.supportPhone),
      whatsappNumber: str(contact.whatsappNumber),
      businessAddress: str(contact.businessAddress),
    },
    social: {
      facebook: str(social.facebook),
      instagram: str(social.instagram),
      tiktok: str(social.tiktok),
      youtube: str(social.youtube),
      whatsapp: str(social.whatsapp),
    },
    storefront: {
      storeOpen: bool(storefront.storeOpen, DEFAULT_PUBLIC_SETTINGS.storefront.storeOpen),
      closedNotice: str(storefront.closedNotice),
    },
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

  if (/^01\d{9}$/.test(digits)) return `20${digits.slice(1)}`;
  if (/^201\d{9}$/.test(digits)) return digits;

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

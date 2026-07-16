// Line Coffee V3 — Phase 20A: JSON-LD (schema.org) builders + renderer.
//
// Pure builders that produce schema.org structured-data objects from real,
// available fields only (no fabricated ratings/reviews, no invented prices),
// plus a <JsonLd> server component that renders them as escaped
// <script type="application/ld+json"> tags. Used by the public metadata layers
// and the root layout. No UI, no data access here — callers pass real data in.

import {
  BRAND_LOGO,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  FOUNDING_YEAR,
  SITE_NAME,
  SITE_NAME_AR,
  SITE_URL,
  SITE_WHATSAPP_PHONE,
  absoluteUrl,
  toInternationalPhoneDigits,
} from "@/lib/seo/site";
import type { SeoBlogPost } from "@/lib/seo/data";
import type { SeoBusinessInfo, SeoCategory, SeoProduct } from "@/lib/seo/data";

type JsonLdObject = Record<string, unknown>;

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

function telephone(): string | undefined {
  const digits = toInternationalPhoneDigits(SITE_WHATSAPP_PHONE);
  return digits ? `+${digits}` : undefined;
}

export function organizationJsonLd(): JsonLdObject {
  const phone = telephone();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: SITE_NAME_AR,
    url: SITE_URL,
    logo: absoluteUrl(BRAND_LOGO),
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    description: DEFAULT_DESCRIPTION,
    foundingDate: FOUNDING_YEAR,
    areaServed: { "@type": "Country", name: "Egypt" },
    ...(phone
      ? {
          contactPoint: [
            {
              "@type": "ContactPoint",
              telephone: phone,
              contactType: "customer service",
              areaServed: "EG",
              availableLanguage: ["Arabic", "English"],
            },
          ],
        }
      : {}),
  };
}

export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ["en", "ar"],
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function productJsonLd(product: SeoProduct): JsonLdObject {
  const url = absoluteUrl(`/products/${product.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    image: absoluteUrl(product.image),
    sku: product.slug,
    brand: { "@type": "Brand", name: SITE_NAME },
    ...(product.categoryName ? { category: product.categoryName } : {}),
    url,
    ...(product.price !== null
      ? {
          offers: {
            "@type": "Offer",
            price: product.price,
            priceCurrency: product.currency,
            // Derived from the real inventory_stock ledger (see
            // public_products.is_available) — never hardcoded, so a
            // genuinely out-of-stock product is never announced as InStock.
            availability: product.isAvailable
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
            url,
            seller: { "@id": ORGANIZATION_ID },
          },
        }
      : {}),
  };
}

export function collectionPageJsonLd(input: {
  name: string;
  description?: string;
  path: string;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: absoluteUrl(input.path),
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORGANIZATION_ID },
  };
}

export function categoryJsonLd(category: SeoCategory): JsonLdObject {
  return collectionPageJsonLd({
    name: category.name,
    description: category.description,
    path: `/products/category/${category.slug}`,
  });
}

export function articleJsonLd(post: SeoBlogPost): JsonLdObject {
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    image: absoluteUrl(post.image),
    ...(post.publishedAt
      ? { datePublished: post.publishedAt, dateModified: post.publishedAt }
      : {}),
    ...(post.category ? { articleSection: post.category } : {}),
    inLanguage: "en",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@id": ORGANIZATION_ID, "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@id": ORGANIZATION_ID,
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: absoluteUrl(BRAND_LOGO) },
    },
  };
}

export function contactPageJsonLd(): JsonLdObject {
  const phone = telephone();
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${SITE_NAME}`,
    url: absoluteUrl("/contact"),
    isPartOf: { "@id": WEBSITE_ID },
    about: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      ...(phone
        ? {
            contactPoint: {
              "@type": "ContactPoint",
              telephone: phone,
              contactType: "customer service",
              areaServed: "EG",
              availableLanguage: ["Arabic", "English"],
            },
          }
        : {}),
    },
  };
}

export function aboutPageJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${SITE_NAME}`,
    url: absoluteUrl("/about"),
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORGANIZATION_ID },
  };
}

/**
 * LocalBusiness (Store) — built only from real, admin-configured
 * `site_settings` values (see getSeoBusinessInfo). No opening hours, geo
 * coordinates, price range, or ratings are ever fabricated: those fields are
 * simply omitted when the data doesn't exist. "Store" (not CafeOrCoffeeShop)
 * because Line Coffee sells for delivery/pickup rather than operating a
 * walk-in café — the roastery itself is appointment-only (see /contact FAQ).
 */
export function localBusinessJsonLd(info: SeoBusinessInfo | null): JsonLdObject {
  const phoneDigits = toInternationalPhoneDigits(info?.whatsappNumber || info?.supportPhone || "");
  const phone = phoneDigits ? `+${phoneDigits}` : undefined;
  const address = info?.businessAddress?.trim();
  const sameAs = [info?.social.facebook, info?.social.instagram, info?.social.tiktok, info?.social.youtube]
    .map((url) => url?.trim())
    .filter((url): url is string => Boolean(url) && /^https?:\/\//i.test(url as string));

  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE_URL}/#localbusiness`,
    name: info?.storeName || SITE_NAME,
    url: SITE_URL,
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    brand: { "@id": ORGANIZATION_ID },
    ...(phone ? { telephone: phone } : {}),
    ...(info?.supportEmail ? { email: info.supportEmail } : {}),
    ...(address ? { address: { "@type": "PostalAddress", streetAddress: address, addressCountry: "EG" } } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/**
 * FAQPage — pass ONLY the questions/answers actually rendered on the calling
 * page, in the same order, so the schema never diverges from visible content.
 */
export function faqJsonLd(items: Array<{ question: string; answer: string }>): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** Escape "<" so product/article text can never break out of the script tag. */
function serialize(data: JsonLdObject): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serialize(item) }}
        />
      ))}
    </>
  );
}

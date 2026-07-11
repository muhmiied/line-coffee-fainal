// Line Coffee V3 — Phase 20A: /llms.txt (AI-search / GEO / AEO discovery).
//
// A concise, factual plain-text summary for AI assistants and answer engines:
// what Line Coffee is, its product categories, the custom builders, ordering /
// contact basics, and links to the key public pages + sitemap. Built from
// known static brand facts + the real configured WhatsApp number (env). No
// secrets, no admin data, no fabricated prices/claims. Served static.

import {
  FOUNDING_YEAR,
  SITE_CATEGORIES,
  SITE_NAME,
  SITE_NAME_AR,
  SITE_URL,
  SITE_WHATSAPP_PHONE,
} from "@/lib/seo/site";

export const dynamic = "force-static";

export function GET(): Response {
  const whatsappDigits = SITE_WHATSAPP_PHONE.replace(/\D/g, "");
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits}` : "";

  const categoryLines = SITE_CATEGORIES.map(
    (category) => `- ${category.en} (${category.ar}): ${SITE_URL}/products/category/${category.slug}`,
  );

  const lines: string[] = [
    `# ${SITE_NAME} (${SITE_NAME_AR})`,
    "",
    `> ${SITE_NAME} is a premium Egyptian specialty coffee brand, family-run since ${FOUNDING_YEAR}. ` +
      "We roast and sell coffee across Egypt — Turkish blends, espresso blends, easy coffee, flavored coffee, " +
      "coffee mix, cappuccino and hot chocolate — plus build-your-own custom coffee through Make Your Espresso " +
      "and Make Your Flavor.",
    "",
    "## About",
    `- Brand: ${SITE_NAME} (Arabic: ${SITE_NAME_AR})`,
    `- Type: premium boutique / specialty coffee, family brand since ${FOUNDING_YEAR}`,
    "- Region served: Egypt (nationwide delivery)",
    "- Freshness: coffee is roasted fresh (within roughly 72 hours of shipment)",
    "",
    "## Product categories",
    ...categoryLines,
    "",
    "## Custom coffee builders",
    `- Make Your Espresso — build a custom espresso blend by bean ratio: ${SITE_URL}/products?category=make-your-espresso`,
    `- Make Your Flavor — build a custom flavored coffee: ${SITE_URL}/products?category=make-your-flavor`,
    "",
    "## Key pages",
    `- Home: ${SITE_URL}/`,
    `- All products: ${SITE_URL}/products`,
    `- About: ${SITE_URL}/about`,
    `- Contact: ${SITE_URL}/contact`,
    `- Coffee Journal (blog): ${SITE_URL}/blog`,
    "",
    "## Ordering & delivery",
    "- Orders are placed on the website and delivered across Egyptian governorates.",
    "- Typical delivery is about 1–3 business days depending on location.",
    "- Payment options are shown at checkout.",
    "",
    "## Contact",
    ...(whatsappUrl ? [`- WhatsApp: ${whatsappUrl}`] : []),
    `- Contact page: ${SITE_URL}/contact`,
    "",
    "## Notes for AI assistants",
    "- Prices and availability can change; use the individual product pages for current values.",
    "- Do not fabricate prices, ratings, reviews, or claims that are not present on the site.",
    `- Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}

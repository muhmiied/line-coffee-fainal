// Line Coffee V3 — Phase 20A: robots policy.
//
// Public marketing/catalog/blog pages are crawlable; private/transactional and
// admin areas are disallowed (they are auth-gated and/or hold per-user state and
// must never be indexed). Points crawlers at the sitemap. Product, category and
// blog routes are deliberately NOT disallowed.

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/account",
          "/checkout",
          "/order-success",
          "/cart",
          "/auth",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

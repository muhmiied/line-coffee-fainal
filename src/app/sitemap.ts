// Line Coffee V3 — Phase 20A: XML sitemap.
//
// Emits the public, indexable routes only. Static pages are always present;
// product / category / blog-post URLs are pulled from the live public catalog
// and published blog table via the server-safe SEO reads. Those reads never
// throw (they degrade to [] / static fallback), so a DB hiccup can only shrink
// the sitemap, never break the build. Revalidated hourly so new products/posts
// appear without a redeploy.

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import {
  getSeoBlogEntries,
  getSeoCategoryEntries,
  getSeoProductEntries,
} from "@/lib/seo/data";

export const revalidate = 3600;

function safeDate(value: string, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

// Canonical-URL decision (documented, not just implemented):
//   Real catalog categories are reachable at TWO URLs — the dedicated
//   `/products/category/[slug]` route (its own generateMetadata +
//   CollectionPage/Breadcrumb JSON-LD, self-canonicalizing) and
//   `/products?category=slug` (the same `/products` route filtered
//   client-side). `/products?category=...` never gets its own metadata —
//   Next.js metadata/canonical is resolved per matched route, and a query
//   string does not change which route matched, so every `?category=`
//   variant inherits `products/layout.tsx`'s static canonical of `/products`
//   itself. That means `/products/category/[slug]` is the indexable,
//   canonical URL for a category, and `/products?category=slug` already
//   correctly defers its canonical signal to `/products` — there is no
//   duplicate-canonical conflict to fix in code. Only `/products/category/
//   [slug]` URLs are listed below; the sitemap should only ever contain
//   canonical URLs.
//
//   The two custom-builder "categories" (make-your-espresso / make-your-
//   flavor) have no dedicated route at all — they only exist as a
//   `/products?category=...` client-side view, so (by the same rule) their
//   canonical is `/products`. They are intentionally NOT listed as separate
//   sitemap entries (listing a non-canonical URL would contradict its own
//   canonical tag); they remain discoverable via internal links from the
//   homepage hero, About, and the `/products` sidebar.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/shipping`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/returns`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const [productEntries, categoryEntries, blogEntries] = await Promise.all([
    getSeoProductEntries(),
    getSeoCategoryEntries(),
    getSeoBlogEntries(),
  ]);

  const productSitemapEntries: MetadataRoute.Sitemap = productEntries.map((entry) => ({
    url: `${SITE_URL}/products/${entry.slug}`,
    lastModified: safeDate(entry.lastModified, now),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categorySitemapEntries: MetadataRoute.Sitemap = categoryEntries.map((entry) => ({
    url: `${SITE_URL}/products/category/${entry.slug}`,
    lastModified: safeDate(entry.lastModified, now),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const blogPostEntries: MetadataRoute.Sitemap = blogEntries.map((entry) => ({
    url: `${SITE_URL}/blog/${entry.slug}`,
    lastModified: safeDate(entry.lastModified, now),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticEntries, ...productSitemapEntries, ...categorySitemapEntries, ...blogPostEntries];
}

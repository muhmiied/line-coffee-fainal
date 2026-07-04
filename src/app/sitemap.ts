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
  getSeoCategorySlugs,
  getSeoProductSlugs,
} from "@/lib/seo/data";

export const revalidate = 3600;

function safeDate(value: string, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/make-your-espresso`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/make-your-flavor`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/shipping`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/returns`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const [productSlugs, categorySlugs, blogEntries] = await Promise.all([
    getSeoProductSlugs(),
    getSeoCategorySlugs(),
    getSeoBlogEntries(),
  ]);

  const productEntries: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${SITE_URL}/products/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categorySlugs.map((slug) => ({
    url: `${SITE_URL}/products/category/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const blogPostEntries: MetadataRoute.Sitemap = blogEntries.map((entry) => ({
    url: `${SITE_URL}/blog/${entry.slug}`,
    lastModified: safeDate(entry.lastModified, now),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticEntries, ...productEntries, ...categoryEntries, ...blogPostEntries];
}

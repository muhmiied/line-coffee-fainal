// Line Coffee V3 — Phase 20A: server-safe SEO data reads.
//
// SEO metadata, JSON-LD, and the sitemap render on the SERVER (generateMetadata,
// sitemap.ts). The app's normal catalog/blog helpers are "use client" modules
// bound to the browser Supabase client, so they can't be used here. This module
// creates its own lazy anon Supabase client (persistSession:false, no session-
// in-URL) — the same pattern the Phase 18B Telegram route uses — and reads ONLY
// the already-public, anon-readable views/tables:
//   * public_products / public_product_variants (public catalog views)
//   * public_categories (public catalog view)
//   * blog_posts (RLS: anon may read published rows only)
//
// No service-role key, no private/admin data, no writes. Every read is wrapped
// so a missing env var, network error, or empty result degrades gracefully
// (null / []) and NEVER throws — the site build and page render must not fail
// because of an SEO read. Per-request reads are deduped via React cache() so a
// leaf layout's generateMetadata + its JSON-LD share a single query.

import { cache } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_OG_IMAGE, categoryNameForSlug } from "@/lib/seo/site";

// Canonical category slugs for fallbacks when the live DB read is unavailable.
// Kept in sync with SITE_CATEGORIES in site.ts.
const SITE_CATEGORY_SLUGS = [
  "turkish-blends",
  "espresso-blends",
  "easy-coffee",
  "coffee-mix",
  "cappuccino",
  "hot-chocolate",
  "flavor-coffee",
] as const;

let cachedClient: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  cachedClient =
    url && key
      ? createClient(url, key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        })
      : null;

  return cachedClient;
}

function pickString(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = (value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export type SeoProduct = {
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  categorySlug: string;
  categoryName: string;
  image: string;
  price: number | null;
  currency: string;
};

type SeoProductRow = {
  id: string;
  slug: string;
  name_en: string | null;
  name_ar: string | null;
  subtitle_en: string | null;
  subtitle_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  notes_en: string | null;
  notes_ar: string | null;
  category_slug: string | null;
  image_url: string | null;
};

export const getSeoProduct = cache(async (slug: string): Promise<SeoProduct | null> => {
  const client = getClient();
  if (!client || !slug) return null;

  try {
    const { data, error } = await client
      .from("public_products")
      .select(
        "id, slug, name_en, name_ar, subtitle_en, subtitle_ar, description_en, description_ar, notes_en, notes_ar, category_slug, image_url",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as SeoProductRow;

    let price: number | null = null;
    const { data: variants } = await client
      .from("public_product_variants")
      .select("price")
      .eq("product_id", row.id);

    if (Array.isArray(variants)) {
      const numbers = variants
        .map((variant) => Number((variant as { price: number | string | null }).price))
        .filter((value) => Number.isFinite(value) && value > 0);
      if (numbers.length > 0) price = Math.min(...numbers);
    }

    const categorySlug = pickString(row.category_slug);

    return {
      slug: row.slug,
      name: pickString(row.name_en, row.name_ar, slug),
      nameAr: pickString(row.name_ar, row.name_en),
      description: pickString(
        row.description_en,
        row.notes_en,
        row.subtitle_en,
        row.description_ar,
        row.notes_ar,
      ),
      categorySlug,
      categoryName: categoryNameForSlug(categorySlug),
      image: pickString(row.image_url, DEFAULT_OG_IMAGE),
      price,
      currency: "EGP",
    };
  } catch {
    return null;
  }
});

export async function getSeoProductSlugs(): Promise<string[]> {
  const client = getClient();
  if (!client) return [];

  try {
    const { data, error } = await client.from("public_products").select("slug");
    if (error || !Array.isArray(data)) return [];
    return data
      .map((row) => (row as { slug: string | null }).slug)
      .filter((slug): slug is string => Boolean(slug));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type SeoCategory = {
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  image: string;
};

type SeoCategoryRow = {
  slug: string;
  name_en: string | null;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  image_url: string | null;
};

export const getSeoCategory = cache(async (slug: string): Promise<SeoCategory | null> => {
  const fallbackName = categoryNameForSlug(slug);
  const fallback: SeoCategory | null =
    (SITE_CATEGORY_SLUGS as readonly string[]).includes(slug)
      ? { slug, name: fallbackName, nameAr: fallbackName, description: "", image: DEFAULT_OG_IMAGE }
      : null;

  const client = getClient();
  if (!client || !slug) return fallback;

  try {
    const { data, error } = await client
      .from("public_categories")
      .select("slug, name_en, name_ar, description_en, description_ar, image_url")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return fallback;
    const row = data as SeoCategoryRow;

    return {
      slug: row.slug,
      name: pickString(row.name_en, row.name_ar, fallbackName),
      nameAr: pickString(row.name_ar, row.name_en, fallbackName),
      description: pickString(row.description_en, row.description_ar),
      image: pickString(row.image_url, DEFAULT_OG_IMAGE),
    };
  } catch {
    return fallback;
  }
});

export async function getSeoCategorySlugs(): Promise<string[]> {
  const client = getClient();
  if (!client) return [...SITE_CATEGORY_SLUGS];

  try {
    const { data, error } = await client.from("public_categories").select("slug");
    if (error || !Array.isArray(data)) return [...SITE_CATEGORY_SLUGS];
    const slugs = data
      .map((row) => (row as { slug: string | null }).slug)
      .filter((slug): slug is string => Boolean(slug));
    return slugs.length > 0 ? slugs : [...SITE_CATEGORY_SLUGS];
  } catch {
    return [...SITE_CATEGORY_SLUGS];
  }
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

export type SeoBlogPost = {
  slug: string;
  title: string;
  titleAr: string;
  excerpt: string;
  image: string;
  category: string;
  publishedAt: string;
};

type SeoBlogRow = {
  slug: string;
  title_en: string | null;
  title_ar: string | null;
  excerpt_en: string | null;
  excerpt_ar: string | null;
  category_en: string | null;
  category_ar: string | null;
  published_at: string | null;
  hero_image: string | null;
  card_image: string | null;
};

const BLOG_FALLBACK_IMAGE = "/assets/story/roastery.png";

function mapBlogRow(row: SeoBlogRow): SeoBlogPost {
  return {
    slug: row.slug,
    title: pickString(row.title_en, row.title_ar, row.slug),
    titleAr: pickString(row.title_ar, row.title_en),
    excerpt: pickString(row.excerpt_en, row.excerpt_ar),
    image: pickString(row.hero_image, row.card_image, BLOG_FALLBACK_IMAGE),
    category: pickString(row.category_en, row.category_ar),
    publishedAt: pickString(row.published_at),
  };
}

const BLOG_COLUMNS =
  "slug, title_en, title_ar, excerpt_en, excerpt_ar, category_en, category_ar, published_at, hero_image, card_image";

export const getSeoBlogPost = cache(async (slug: string): Promise<SeoBlogPost | null> => {
  const client = getClient();
  if (!client || !slug) return null;

  try {
    const { data, error } = await client
      .from("blog_posts")
      .select(BLOG_COLUMNS)
      .eq("slug", slug)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .maybeSingle();

    if (error || !data) return null;
    return mapBlogRow(data as SeoBlogRow);
  } catch {
    return null;
  }
});

export async function getSeoBlogEntries(): Promise<Array<{ slug: string; lastModified: string }>> {
  const client = getClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from("blog_posts")
      .select("slug, published_at")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .limit(500);

    if (error || !Array.isArray(data)) return [];
    return data
      .map((row) => {
        const typed = row as { slug: string | null; published_at: string | null };
        return typed.slug
          ? { slug: typed.slug, lastModified: pickString(typed.published_at) }
          : null;
      })
      .filter((entry): entry is { slug: string; lastModified: string } => entry !== null);
  } catch {
    return [];
  }
}

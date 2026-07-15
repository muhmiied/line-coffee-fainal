// Shared types + pure row-mapping logic for the public blog. No Supabase
// import here and no "use client" — safe to import from both the browser
// client fetcher (public-blog.ts) and the server-safe fetcher
// (server-blog.ts, used for SSR on /blog).

import type { LocalizedValue } from "@/lib/context/language";

export type PublicBlogBodyBlock = {
  type: "heading" | "paragraph";
  text: LocalizedValue;
};

export type PublicBlogPost = {
  id: string;
  slug: string;
  title: LocalizedValue;
  excerpt: LocalizedValue;
  image: string;
  heroImage: string;
  category: LocalizedValue;
  date: string;
  readTime: LocalizedValue;
  featured: boolean;
  tags: LocalizedValue[];
  body: PublicBlogBodyBlock[];
};

export type BlogPostRow = {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string;
  excerpt_en: string;
  excerpt_ar: string;
  content_en: string;
  content_ar: string;
  category_en: string;
  category_ar: string;
  featured: boolean;
  published_at: string;
  read_time_en: string;
  read_time_ar: string;
  tags: unknown;
  hero_image: string | null;
  card_image: string | null;
};

export const PUBLIC_BLOG_COLUMNS = `
  id,
  slug,
  title_en,
  title_ar,
  excerpt_en,
  excerpt_ar,
  content_en,
  content_ar,
  category_en,
  category_ar,
  featured,
  published_at,
  read_time_en,
  read_time_ar,
  tags,
  hero_image,
  card_image
`;

/** Summary-only columns for the listing page — skips the two full body
 * fields (content_en/content_ar can be several KB each), which the list view
 * never renders (only the detail page needs full body text). */
export const PUBLIC_BLOG_SUMMARY_COLUMNS = `
  id,
  slug,
  title_en,
  title_ar,
  excerpt_en,
  excerpt_ar,
  category_en,
  category_ar,
  featured,
  published_at,
  read_time_en,
  read_time_ar,
  tags,
  hero_image,
  card_image
`;

function localizedTags(value: unknown): LocalizedValue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const en = typeof row.en === "string" ? row.en : "";
    const ar = typeof row.ar === "string" ? row.ar : en;
    return en ? [{ en, ar }] : [];
  });
}

function contentChunks(value: string) {
  return value
    .split(/\r?\n\s*\r?\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function parseBody(contentEn: string, contentAr: string): PublicBlogBodyBlock[] {
  const enChunks = contentChunks(contentEn);
  const arChunks = contentChunks(contentAr);
  const length = Math.max(enChunks.length, arChunks.length);

  return Array.from({ length }, (_, index) => {
    const enChunk = enChunks[index] ?? "";
    const arChunk = arChunks[index] ?? "";
    const heading = enChunk.startsWith("## ") || arChunk.startsWith("## ");
    return {
      type: heading ? "heading" as const : "paragraph" as const,
      text: {
        en: heading ? enChunk.replace(/^##\s+/, "") : enChunk,
        ar: heading ? arChunk.replace(/^##\s+/, "") : arChunk,
      },
    };
  }).filter((block) => block.text.en || block.text.ar);
}

const FALLBACK_IMAGE = "/assets/story/roastery.png";

/** Maps a full row (with body content) — used by the detail page. */
export function mapPost(row: BlogPostRow): PublicBlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: { en: row.title_en, ar: row.title_ar },
    excerpt: { en: row.excerpt_en, ar: row.excerpt_ar },
    image: row.card_image ?? row.hero_image ?? FALLBACK_IMAGE,
    heroImage: row.hero_image ?? row.card_image ?? FALLBACK_IMAGE,
    category: { en: row.category_en, ar: row.category_ar },
    date: row.published_at.slice(0, 10),
    readTime: { en: row.read_time_en, ar: row.read_time_ar },
    featured: row.featured,
    tags: localizedTags(row.tags),
    body: parseBody(row.content_en, row.content_ar),
  };
}

/** Maps a summary row (no body content) — used by the listing page, whose
 * cards never render body text. `body` is empty, never used by the list. */
export function mapPostSummary(row: Omit<BlogPostRow, "content_en" | "content_ar">): PublicBlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: { en: row.title_en, ar: row.title_ar },
    excerpt: { en: row.excerpt_en, ar: row.excerpt_ar },
    image: row.card_image ?? row.hero_image ?? FALLBACK_IMAGE,
    heroImage: row.hero_image ?? row.card_image ?? FALLBACK_IMAGE,
    category: { en: row.category_en, ar: row.category_ar },
    date: row.published_at.slice(0, 10),
    readTime: { en: row.read_time_en, ar: row.read_time_ar },
    featured: row.featured,
    tags: localizedTags(row.tags),
    body: [],
  };
}

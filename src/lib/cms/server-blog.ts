// Server-safe public blog reads for SSR (Phase 2 performance pass).
//
// /blog and /blog/[slug] are Server Components so they render real article
// content in the initial HTML. Uses its own lazy anon Supabase client (same
// pattern as server-catalog.ts / seo/data.ts) since the browser-bound client
// persists sessions to localStorage, which doesn't exist server-side. Reads
// ONLY published, already-past-publish-date rows — draft/archived/future
// posts never reach these functions, matching the existing RLS-backed
// public-blog.ts behavior.

import { unstable_cache } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  PUBLIC_BLOG_COLUMNS,
  PUBLIC_BLOG_SUMMARY_COLUMNS,
  mapPost,
  mapPostSummary,
  type BlogPostRow,
  type PublicBlogPost,
} from "@/lib/cms/public-blog-shared";

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
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        })
      : null;

  return cachedClient;
}

// Published articles are safe to cache: the query already filters to
// status='published' AND published_at <= now(), so a cached response can
// never show a draft/future post — it only delays how quickly a fresh
// publish appears (bounded by this revalidate window, matching the products
// catalog cache for consistency).
const BLOG_REVALIDATE_SECONDS = 300;

export type BlogListPage = { posts: PublicBlogPost[]; totalCount: number };

async function fetchServerBlogPostsPage(limit: number, offset: number): Promise<BlogListPage> {
  const client = getClient();
  if (!client) return { posts: [], totalCount: 0 };

  try {
    const nowIso = new Date().toISOString();
    const [countResult, rowsResult] = await Promise.all([
      client
        .from("blog_posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .lte("published_at", nowIso),
      client
        .from("blog_posts")
        .select(PUBLIC_BLOG_SUMMARY_COLUMNS)
        .eq("status", "published")
        .lte("published_at", nowIso)
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false })
        .range(offset, offset + limit - 1),
    ]);

    if (rowsResult.error || !Array.isArray(rowsResult.data)) return { posts: [], totalCount: 0 };

    const rows = rowsResult.data as Omit<BlogPostRow, "content_en" | "content_ar">[];
    return { posts: rows.map(mapPostSummary), totalCount: countResult.count ?? rows.length };
  } catch {
    return { posts: [], totalCount: 0 };
  }
}

/** First page of published articles (summary only, no body) for /blog SSR. */
export const getServerBlogPostsPage = unstable_cache(
  fetchServerBlogPostsPage,
  ["public-blog-posts-page-v1"],
  { revalidate: BLOG_REVALIDATE_SECONDS, tags: ["public-blog"] },
);

// A genuine fetch error is allowed to throw (into error.tsx) rather than
// silently rendering "article not found" for a transient DB/network issue —
// same reasoning as getServerPublicProductBySlug in server-catalog.ts.
// `.maybeSingle()` returning {data: null, error: null} is the only case that
// legitimately maps to `null` (article genuinely doesn't exist / isn't
// published yet).
async function fetchServerBlogPostBySlug(slug: string): Promise<PublicBlogPost | null> {
  const client = getClient();
  if (!client || !slug) return null;

  const { data, error } = await client
    .from("blog_posts")
    .select(PUBLIC_BLOG_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) throw new Error(`Failed to load article "${slug}": ${error.message}`);
  if (!data) return null;

  return mapPost(data as BlogPostRow);
}

export const getServerBlogPostBySlug = unstable_cache(
  fetchServerBlogPostBySlug,
  ["public-blog-post-by-slug-v1"],
  { revalidate: BLOG_REVALIDATE_SECONDS, tags: ["public-blog"] },
);

async function fetchServerRelatedBlogPosts(excludeSlug: string, limit: number): Promise<PublicBlogPost[]> {
  const client = getClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from("blog_posts")
      .select(PUBLIC_BLOG_SUMMARY_COLUMNS)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .neq("slug", excludeSlug)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error || !Array.isArray(data)) return [];
    return (data as Omit<BlogPostRow, "content_en" | "content_ar">[]).map(mapPostSummary);
  } catch {
    return [];
  }
}

/** 2 other published articles for the detail page's "Related Articles" —
 * never fetches the whole table. */
export const getServerRelatedBlogPosts = unstable_cache(
  fetchServerRelatedBlogPosts,
  ["public-blog-related-v1"],
  { revalidate: BLOG_REVALIDATE_SECONDS, tags: ["public-blog"] },
);

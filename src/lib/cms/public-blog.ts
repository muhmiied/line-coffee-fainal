"use client";

// Browser-bound public blog fetcher. Types + row-mapping logic live in
// public-blog-shared.ts (no Supabase import) so the server-side SSR fetcher
// (server-blog.ts) can reuse the exact same mapping without duplicating it.

import { supabase } from "@/lib/supabase/client";
import {
  PUBLIC_BLOG_COLUMNS,
  PUBLIC_BLOG_SUMMARY_COLUMNS,
  mapPost,
  mapPostSummary,
  type BlogPostRow,
} from "@/lib/cms/public-blog-shared";

export type { PublicBlogBodyBlock, PublicBlogPost } from "@/lib/cms/public-blog-shared";

function devWarn(message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[public-blog] ${message}`);
  }
}

export type BlogListPage = { posts: import("@/lib/cms/public-blog-shared").PublicBlogPost[]; totalCount: number };

/**
 * Phase 2: paginated summary read (no body content transferred — the list
 * view never renders it) for the client "Load More" control on /blog.
 */
export async function listPublishedBlogPostsPage(range: { from: number; to: number }): Promise<BlogListPage> {
  const [countResult, rowsResult] = await Promise.all([
    supabase
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .lte("published_at", new Date().toISOString()),
    supabase
      .from("blog_posts")
      .select(PUBLIC_BLOG_SUMMARY_COLUMNS)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("featured", { ascending: false })
      .order("published_at", { ascending: false })
      .range(range.from, range.to),
  ]);

  if (countResult.error) {
    devWarn(countResult.error.message);
    throw new Error("Could not load published articles.");
  }
  if (rowsResult.error) {
    devWarn(rowsResult.error.message);
    throw new Error("Could not load published articles.");
  }

  const rows = (rowsResult.data ?? []) as Omit<BlogPostRow, "content_en" | "content_ar">[];
  return { posts: rows.map(mapPostSummary), totalCount: countResult.count ?? rows.length };
}

/** Fetches one published post directly by slug — never the whole table. */
export async function getPublishedBlogPostBySlug(slug: string) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(PUBLIC_BLOG_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    devWarn(error.message);
    throw new Error("Could not load this article.");
  }
  return data ? mapPost(data as BlogPostRow) : null;
}

/** Lightweight related-articles read: 2 other published posts, no body. */
export async function getRelatedBlogPosts(excludeSlug: string, limit = 2) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(PUBLIC_BLOG_SUMMARY_COLUMNS)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .neq("slug", excludeSlug)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    devWarn(error.message);
    return [];
  }
  return ((data ?? []) as Omit<BlogPostRow, "content_en" | "content_ar">[]).map(mapPostSummary);
}

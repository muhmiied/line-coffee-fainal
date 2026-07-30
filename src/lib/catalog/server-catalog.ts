// Server-safe public catalog reads for SSR (Phase 2 performance pass).
//
// /products is a Server Component so it can render real product/category
// content in the initial HTML instead of an empty shell + client fetch. The
// browser-bound client in src/lib/supabase/client.ts persists sessions to
// localStorage and reads the URL for auth callbacks — neither exists on the
// server, so it cannot be reused here. This module creates its own lazy anon
// Supabase client (persistSession:false, no session-in-URL detection) — the
// same pattern already used by src/lib/seo/data.ts — and reads ONLY the
// public, RLS/view-safe `public_categories` / `public_products` /
// `public_product_variants` views. No service role, no admin/cost fields.
// Row-mapping logic is shared with the client fetcher via
// public-catalog-shared.ts so the two can never silently disagree on shape.

import { unstable_cache } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  PUBLIC_PRODUCT_COLUMNS,
  mapCategoryRow,
  mapProductRows,
  type PublicCatalogCategory,
  type PublicCatalogProduct,
  type PublicCategoryRow,
  type PublicProductRow,
  type PublicVariantRow,
} from "@/lib/catalog/public-catalog-shared";

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

async function fetchVariantRows(client: SupabaseClient, productIds: string[]): Promise<PublicVariantRow[]> {
  if (productIds.length === 0) return [];
  const { data, error } = await client
    .from("public_product_variants")
    .select("id, product_id, size, price, compare_at_price, stock_state, sort_order")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as PublicVariantRow[];
}

// Published catalog content is safe to cache: `public_categories` /
// `public_products` already filter to active + public + show-on-website at
// the DB view level (the security boundary), so caching their output for a
// short window cannot leak a hidden/draft row — it only delays how quickly a
// publish/edit becomes visible. 5 minutes matches the existing sitemap
// revalidate window (src/app/sitemap.ts) for consistency. Admin preview
// (previewProduct/previewImage) never touches this cache — it is a pure
// client-side image-URL overlay applied AFTER this data loads (see
// ProductsPageClient.tsx), so preview always reflects the just-edited value
// without needing a cache-bypass.
const CATALOG_REVALIDATE_SECONDS = 300;

async function fetchServerPublicCategories(): Promise<PublicCatalogCategory[]> {
  const client = getClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from("public_categories")
      .select("id, slug, name_en, name_ar, description_en, description_ar, image_url, sort_order")
      .order("sort_order", { ascending: true })
      .order("name_en", { ascending: true });
    if (error || !Array.isArray(data)) return [];
    return (data as PublicCategoryRow[]).map(mapCategoryRow);
  } catch {
    return [];
  }
}

/** All public categories. Small, fixed-size table — always fetched in full. */
export const getServerPublicCategories = unstable_cache(
  fetchServerPublicCategories,
  ["public-categories-v1"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["public-catalog"] },
);

export type ServerCatalogPage = { products: PublicCatalogProduct[]; totalCount: number };

/**
 * First page of a category's products for the server-rendered initial HTML.
 * Bounded by `limit` (never the whole future catalog) with an accurate
 * `totalCount` so the client's "Load More" control knows when to stop.
 * Degrades to an empty page (never throws) — the client component re-fetches
 * on mount if this returns nothing, so a transient SSR read failure can't
 * break the route.
 */
async function fetchServerPublicProductsPage(
  categorySlug: string,
  limit: number,
): Promise<ServerCatalogPage> {
  const client = getClient();
  if (!client || !categorySlug) return { products: [], totalCount: 0 };

  try {
    const [categories, countResult, rowsResult] = await Promise.all([
      getServerPublicCategories(),
      client
        .from("public_products")
        .select("id", { count: "exact", head: true })
        .eq("category_slug", categorySlug),
      client
        .from("public_products")
        .select(PUBLIC_PRODUCT_COLUMNS)
        .eq("category_slug", categorySlug)
        .order("name_en", { ascending: true })
        .range(0, Math.max(0, limit - 1)),
    ]);

    if (rowsResult.error || !Array.isArray(rowsResult.data)) return { products: [], totalCount: 0 };

    const productRows = rowsResult.data as unknown as PublicProductRow[];
    const variants = await fetchVariantRows(client, productRows.map((p) => p.id));

    return {
      products: mapProductRows(productRows, variants, categories),
      totalCount: countResult.count ?? productRows.length,
    };
  } catch {
    return { products: [], totalCount: 0 };
  }
}

export const getServerPublicProductsPage = unstable_cache(
  fetchServerPublicProductsPage,
  ["public-products-page-v1"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["public-catalog"] },
);

/**
 * Single product by slug for the SSR product-detail page — one targeted
 * query, never the whole catalog. Also used for the category page's active
 * category resolution.
 */
// Unlike the listing reads above, a genuine fetch error here is allowed to
// throw (into the route's error.tsx boundary) instead of degrading to an
// empty result — this is the page's ONLY content source (no client-side
// fallback fetch exists once SSR fully owns the detail page), so silently
// mapping "the DB errored" to "this product doesn't exist" would show a
// real customer a false 404 for a product that does exist. `.maybeSingle()`
// returns `{data: null, error: null}` for a genuinely-absent row (not an
// error), which is the only case that legitimately maps to `null` here.
async function fetchServerPublicProductBySlug(slug: string): Promise<PublicCatalogProduct | null> {
  const client = getClient();
  if (!client || !slug) return null;

  const [categoryRows, productResult] = await Promise.all([
    client
      .from("public_categories")
      .select("id, slug, name_en, name_ar, description_en, description_ar, image_url, sort_order")
      .order("sort_order", { ascending: true })
      .order("name_en", { ascending: true }),
    client.from("public_products").select(PUBLIC_PRODUCT_COLUMNS).eq("slug", slug).maybeSingle(),
  ]);

  if (productResult.error) {
    throw new Error(`Failed to load product "${slug}": ${productResult.error.message}`);
  }
  if (!productResult.data) return null;

  const productRow = productResult.data as unknown as PublicProductRow;
  const categories = ((categoryRows.data ?? []) as PublicCategoryRow[]).map(mapCategoryRow);
  const variants = await fetchVariantRows(client, [productRow.id]);

  return mapProductRows([productRow], variants, categories)[0] ?? null;
}

export const getServerPublicProductBySlug = unstable_cache(
  fetchServerPublicProductBySlug,
  ["public-product-by-slug-v1"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["public-catalog"] },
);

/**
 * Lightweight per-category product counts (COUNT-only, zero product rows
 * transferred) for the category page's "Related Categories" strip. Replaces
 * downloading the entire multi-hundred-product catalog just to compute a
 * handful of counts.
 */
async function fetchServerCategoryProductCounts(slugs: string[]): Promise<Record<string, number>> {
  const client = getClient();
  if (!client || slugs.length === 0) return {};

  try {
    const results = await Promise.all(
      slugs.map((slug) =>
        client
          .from("public_products")
          .select("id", { count: "exact", head: true })
          .eq("category_slug", slug)
          .then((res) => [slug, res.count ?? 0] as const),
      ),
    );
    return Object.fromEntries(results);
  } catch {
    return {};
  }
}

export const getServerCategoryProductCounts = unstable_cache(
  fetchServerCategoryProductCounts,
  ["public-category-product-counts-v1"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["public-catalog"] },
);

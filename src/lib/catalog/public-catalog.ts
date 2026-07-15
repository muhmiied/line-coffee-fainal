"use client";

// Browser-bound public catalog fetcher. Types + row-mapping logic live in
// public-catalog-shared.ts (no Supabase import, safe from server code too) so
// the server-side SSR fetcher (server-catalog.ts) can reuse the exact same
// mapping without duplicating it — the two can never silently drift apart in
// how a raw row becomes a typed product/category.

import { supabase } from "@/lib/supabase/client";
import {
  PUBLIC_PRODUCT_COLUMNS,
  PublicCatalogReadError,
  asCatalogError,
  looksLikeUuid,
  mapCategoryRow,
  mapProductRows,
  mapVariantRows,
  uniqueValues,
  type PublicCategoryRow,
  type PublicProductRow,
  type PublicVariantRow,
} from "@/lib/catalog/public-catalog-shared";

export type {
  PublicCatalogSize,
  PublicCatalogBlendComponent,
  PublicCatalogCategory,
  PublicCatalogProduct,
} from "@/lib/catalog/public-catalog-shared";
export { PublicCatalogReadError } from "@/lib/catalog/public-catalog-shared";

async function fetchCategoryRows() {
  const { data, error } = await supabase
    .from("public_categories")
    .select("id, slug, name_en, name_ar, description_en, description_ar, image_url, sort_order")
    .order("sort_order", { ascending: true })
    .order("name_en", { ascending: true });

  if (error) throw new PublicCatalogReadError(undefined, error);
  return (data ?? []) as PublicCategoryRow[];
}

async function fetchProductRows() {
  const { data, error } = await supabase
    .from("public_products")
    .select(
      PUBLIC_PRODUCT_COLUMNS,
    )
    .order("category_slug", { ascending: true })
    .order("name_en", { ascending: true });

  if (error) throw new PublicCatalogReadError(undefined, error);
  return (data ?? []) as unknown as PublicProductRow[];
}

async function fetchProductRowsByCategorySlug(slug: string, range?: { from: number; to: number }) {
  let query = supabase
    .from("public_products")
    .select(
      PUBLIC_PRODUCT_COLUMNS,
    )
    .eq("category_slug", slug)
    .order("name_en", { ascending: true });

  if (range) query = query.range(range.from, range.to);

  const { data, error } = await query;
  if (error) throw new PublicCatalogReadError(undefined, error);
  return (data ?? []) as unknown as PublicProductRow[];
}

async function fetchProductRowsBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];

  const { data, error } = await supabase
    .from("public_products")
    .select(
      PUBLIC_PRODUCT_COLUMNS,
    )
    .in("slug", slugs);

  if (error) throw new PublicCatalogReadError(undefined, error);
  return (data ?? []) as unknown as PublicProductRow[];
}

async function fetchProductRowBySlug(slug: string) {
  const { data, error } = await supabase
    .from("public_products")
    .select(
      PUBLIC_PRODUCT_COLUMNS,
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new PublicCatalogReadError(undefined, error);
  return data as unknown as PublicProductRow | null;
}

async function fetchVariantRows(productIds?: string[]) {
  if (productIds && productIds.length === 0) return [];

  let query = supabase
    .from("public_product_variants")
    .select("id, product_id, size, price, compare_at_price, stock_state, sort_order")
    .order("sort_order", { ascending: true });

  if (productIds) {
    query = query.in("product_id", productIds);
  }

  const { data, error } = await query;
  if (error) throw new PublicCatalogReadError(undefined, error);
  return (data ?? []) as PublicVariantRow[];
}

async function fetchVariantRowsByProductId(productId: string) {
  const { data, error } = await supabase
    .from("public_product_variants")
    .select("id, product_id, size, price, compare_at_price, stock_state, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) throw new PublicCatalogReadError(undefined, error);
  return (data ?? []) as PublicVariantRow[];
}

export async function getPublicCategories() {
  try {
    return (await fetchCategoryRows()).map(mapCategoryRow);
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getPublicProducts() {
  try {
    const [categoryRows, productRows] = await Promise.all([
      fetchCategoryRows(),
      fetchProductRows(),
    ]);
    const categories = categoryRows.map(mapCategoryRow);
    const variants = await fetchVariantRows(productRows.map((product) => product.id));
    return mapProductRows(productRows, variants, categories);
  } catch (error) {
    throw asCatalogError(error);
  }
}

async function fetchProductRowsBestSellers() {
  const { data, error } = await supabase
    .from("public_products")
    .select(
      PUBLIC_PRODUCT_COLUMNS,
    )
    .eq("best_seller", true)
    .order("name_en", { ascending: true });

  if (error) throw new PublicCatalogReadError(undefined, error);
  return (data ?? []) as unknown as PublicProductRow[];
}

export async function getPublicBestSellers() {
  try {
    const [categoryRows, productRows] = await Promise.all([
      fetchCategoryRows(),
      fetchProductRowsBestSellers(),
    ]);
    const categories = categoryRows.map(mapCategoryRow);
    const variants = await fetchVariantRows(productRows.map((product) => product.id));
    return mapProductRows(productRows, variants, categories);
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getPublicProductsByCategorySlug(slug: string) {
  try {
    const [categoryRows, productRows] = await Promise.all([
      fetchCategoryRows(),
      fetchProductRowsByCategorySlug(slug),
    ]);
    const categories = categoryRows.map(mapCategoryRow);
    const variants = await fetchVariantRows(productRows.map((product) => product.id));
    return mapProductRows(productRows, variants, categories);
  } catch (error) {
    throw asCatalogError(error);
  }
}

/**
 * Phase 2: paginated variant used by the client "Load More" control on
 * /products, so switching category or paging further never requires
 * downloading the whole catalog. `totalCount` comes from the same
 * category-scoped `count: 'exact'` the page needs to know whether more
 * products remain.
 */
export async function getPublicProductsByCategorySlugPage(
  slug: string,
  range: { from: number; to: number },
) {
  try {
    const [categoryRows, countResult] = await Promise.all([
      fetchCategoryRows(),
      supabase
        .from("public_products")
        .select("id", { count: "exact", head: true })
        .eq("category_slug", slug),
    ]);
    if (countResult.error) throw new PublicCatalogReadError(undefined, countResult.error);

    const productRows = await fetchProductRowsByCategorySlug(slug, range);
    const categories = categoryRows.map(mapCategoryRow);
    const variants = await fetchVariantRows(productRows.map((product) => product.id));
    return {
      products: mapProductRows(productRows, variants, categories),
      totalCount: countResult.count ?? productRows.length,
    };
  } catch (error) {
    throw asCatalogError(error);
  }
}

/**
 * Phase 2: database-backed search within a category, replacing the previous
 * in-memory `.filter()` over whatever happened to already be loaded — search
 * results are always complete for the category regardless of pagination
 * state.
 */
export async function searchPublicProductsByCategorySlug(
  slug: string,
  query: string,
  range: { from: number; to: number },
) {
  try {
    const trimmed = query.trim();
    if (!trimmed) return getPublicProductsByCategorySlugPage(slug, range);

    const categoryRows = await fetchCategoryRows();
    const filterExpr = `name_en.ilike.%${trimmed}%,name_ar.ilike.%${trimmed}%`;

    const [countResult, rowsResult] = await Promise.all([
      supabase
        .from("public_products")
        .select("id", { count: "exact", head: true })
        .eq("category_slug", slug)
        .or(filterExpr),
      supabase
        .from("public_products")
        .select(PUBLIC_PRODUCT_COLUMNS)
        .eq("category_slug", slug)
        .or(filterExpr)
        .order("name_en", { ascending: true })
        .range(range.from, range.to),
    ]);
    if (countResult.error) throw new PublicCatalogReadError(undefined, countResult.error);
    if (rowsResult.error) throw new PublicCatalogReadError(undefined, rowsResult.error);

    const productRows = (rowsResult.data ?? []) as unknown as PublicProductRow[];
    const categories = categoryRows.map(mapCategoryRow);
    const variants = await fetchVariantRows(productRows.map((product) => product.id));
    return {
      products: mapProductRows(productRows, variants, categories),
      totalCount: countResult.count ?? productRows.length,
    };
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getPublicProductsBySlugs(slugs: string[]) {
  try {
    const uniqueSlugs = uniqueValues(slugs);
    const [categoryRows, productRows] = await Promise.all([
      fetchCategoryRows(),
      fetchProductRowsBySlugs(uniqueSlugs),
    ]);
    const categories = categoryRows.map(mapCategoryRow);
    const variants = await fetchVariantRows(productRows.map((product) => product.id));
    const products = mapProductRows(productRows, variants, categories);
    const bySlug = new Map(products.map((product) => [product.slug, product]));

    return uniqueSlugs
      .map((slug) => bySlug.get(slug))
      .filter((product): product is (typeof products)[number] => product !== undefined);
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getPublicProductBySlug(slug: string) {
  try {
    const [categoryRows, productRow] = await Promise.all([
      fetchCategoryRows(),
      fetchProductRowBySlug(slug),
    ]);

    if (!productRow) return null;

    const categories = categoryRows.map(mapCategoryRow);
    const variants = await fetchVariantRowsByProductId(productRow.id);
    return mapProductRows([productRow], variants, categories)[0] ?? null;
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getPublicProductVariants(productIdOrSlug: string) {
  try {
    if (looksLikeUuid(productIdOrSlug)) {
      return mapVariantRows(await fetchVariantRowsByProductId(productIdOrSlug));
    }

    const product = await fetchProductRowBySlug(productIdOrSlug);
    if (!product) return [];

    return mapVariantRows(await fetchVariantRowsByProductId(product.id));
  } catch (error) {
    throw asCatalogError(error);
  }
}

export async function getPublicCatalogProductBySlug(slug: string) {
  return getPublicProductBySlug(slug);
}

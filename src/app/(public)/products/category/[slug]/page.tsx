// Server Component (Phase 2 performance pass): fetches the category and its
// products directly by slug on the server, and computes the "Related
// Categories" strip via lightweight COUNT-only queries instead of
// downloading the entire multi-category catalog just to tally a few numbers.

import { notFound } from "next/navigation";
import {
  getServerCategoryProductCounts,
  getServerPublicCategories,
  getServerPublicProductsPage,
} from "@/lib/catalog/server-catalog";
import CategoryPageClient from "./CategoryPageClient";

// Bounded (not literally unlimited) but large enough to cover any realistic
// category size today — this page's search/price-filter/sort already run
// client-side over the category's full set, which stays reasonably small
// (tens of products); true incremental pagination only matters for the much
// larger /products cross-category listing, which already has it.
const CATEGORY_PRODUCTS_LIMIT = 500;
const RELATED_CATEGORIES_COUNT = 5;

export default async function ProductCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: categorySlug } = await params;

  const categories = await getServerPublicCategories();
  const category = categories.find((item) => item.slug === categorySlug);

  if (!category) {
    notFound();
  }

  const relatedCategories = categories.filter((item) => item.slug !== categorySlug).slice(0, RELATED_CATEGORIES_COUNT);

  const [{ products }, relatedCounts] = await Promise.all([
    getServerPublicProductsPage(categorySlug, CATEGORY_PRODUCTS_LIMIT),
    getServerCategoryProductCounts(relatedCategories.map((item) => item.slug)),
  ]);

  return (
    <CategoryPageClient
      category={category}
      products={products}
      relatedCategories={relatedCategories.map((item) => ({
        ...item,
        productCount: relatedCounts[item.slug] ?? 0,
      }))}
    />
  );
}

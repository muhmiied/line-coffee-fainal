// Server Component (Phase 2 performance pass): fetches the active category's
// first page of real categories/products on the server so /products renders
// useful HTML immediately, instead of an empty shell + client-only fetch.
// The interactive parts (search, category switching, Load More, admin
// preview overlay) live in ProductsPageClient.tsx, seeded with this data.

import {
  getServerPublicCategories,
  getServerPublicProductsPage,
} from "@/lib/catalog/server-catalog";
import ProductsPageClient from "./ProductsPageClient";

const INITIAL_PAGE_SIZE = 24;
const STUDIO_CATEGORY_IDS = ["make-your-espresso", "make-your-flavor"];

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const rawCategoryParam = params.category ?? params.cat;
  const rawCategory = typeof rawCategoryParam === "string" ? rawCategoryParam : undefined;

  const categories = await getServerPublicCategories();
  const validSlugs = new Set([...categories.map((c) => c.slug), ...STUDIO_CATEGORY_IDS]);
  const initialCategorySlug =
    rawCategory && validSlugs.has(rawCategory) ? rawCategory : (categories[0]?.slug ?? "");

  const isStudio = STUDIO_CATEGORY_IDS.includes(initialCategorySlug);
  const initialPage =
    isStudio || !initialCategorySlug
      ? { products: [], totalCount: 0 }
      : await getServerPublicProductsPage(initialCategorySlug, INITIAL_PAGE_SIZE);

  return (
    <ProductsPageClient
      categories={categories}
      initialCategorySlug={initialCategorySlug}
      initialProducts={initialPage.products}
      initialTotalCount={initialPage.totalCount}
    />
  );
}

// Server Component (Phase 2 performance pass): fetches the requested product
// directly by slug — never the whole catalog — and renders real product HTML
// immediately. The interactive purchase UI (gallery, weight/quantity, add to
// cart, wishlist) lives in ProductDetailClient.tsx, seeded with this data.

import {
  getServerPublicCategories,
  getServerPublicProductBySlug,
  getServerPublicProductsPage,
} from "@/lib/catalog/server-catalog";
import ProductDetailClient, { ProductNotFound } from "./ProductDetailClient";

const RELATED_PRODUCTS_LIMIT = 4;

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, categories] = await Promise.all([
    getServerPublicProductBySlug(slug),
    getServerPublicCategories(),
  ]);

  if (!product) {
    return <ProductNotFound />;
  }

  const category = categories.find((item) => item.slug === product.category);

  // Lightweight same-category related products (reuses the existing bounded,
  // cached category-page query — never the whole catalog) for a small
  // internal-linking strip. Fetch one extra so excluding the current product
  // still leaves a full row when the category has enough items.
  const relatedPage = product.category
    ? await getServerPublicProductsPage(product.category, RELATED_PRODUCTS_LIMIT + 1)
    : { products: [], totalCount: 0 };
  const relatedProducts = relatedPage.products
    .filter((item) => item.slug !== product.slug)
    .slice(0, RELATED_PRODUCTS_LIMIT);

  return (
    <ProductDetailClient product={product} category={category} relatedProducts={relatedProducts} />
  );
}

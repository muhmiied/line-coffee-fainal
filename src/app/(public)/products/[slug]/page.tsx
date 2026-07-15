// Server Component (Phase 2 performance pass): fetches the requested product
// directly by slug — never the whole catalog — and renders real product HTML
// immediately. The interactive purchase UI (gallery, weight/quantity, add to
// cart, wishlist) lives in ProductDetailClient.tsx, seeded with this data.

import { getServerPublicCategories, getServerPublicProductBySlug } from "@/lib/catalog/server-catalog";
import ProductDetailClient, { ProductNotFound } from "./ProductDetailClient";

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

  return <ProductDetailClient product={product} category={category} />;
}

// Rendered by Next.js when products/[slug]/page.tsx calls notFound() — this
// is what turns a missing product into a real HTTP 404 while keeping the
// existing bilingual "Product Missing" presentation.
import { ProductNotFound } from "./ProductDetailClient";

export default function NotFound() {
  return <ProductNotFound />;
}

// Rendered by Next.js when products/category/[slug]/page.tsx calls
// notFound() — turns a missing category into a real HTTP 404 while keeping
// the existing bilingual "Category Missing" presentation.
import { CategoryNotFound } from "./CategoryPageClient";

export default function NotFound() {
  return <CategoryNotFound />;
}

// Rendered by Next.js when blog/[slug]/page.tsx calls notFound() — turns a
// missing article into a real HTTP 404 while keeping the existing bilingual
// "Article not found" presentation.
import { BlogPostNotFound } from "./BlogPostClient";

export default function NotFound() {
  return <BlogPostNotFound />;
}

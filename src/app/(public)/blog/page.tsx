// Server Component (Phase 2 performance pass): server-renders the first page
// of published articles instead of an empty shell + client-only fetch.
// Interactive search/category filter/Load More live in BlogPageClient.tsx.

import { getServerBlogPostsPage } from "@/lib/cms/server-blog";
import BlogPageClient from "./BlogPageClient";

const INITIAL_PAGE_SIZE = 12;

export default async function BlogPage() {
  const { posts, totalCount } = await getServerBlogPostsPage(INITIAL_PAGE_SIZE, 0);

  return <BlogPageClient initialPosts={posts} initialTotalCount={totalCount} />;
}

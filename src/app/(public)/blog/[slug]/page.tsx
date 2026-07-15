// Server Component (Phase 2 performance pass): fetches the requested article
// directly by slug — never the whole table — and renders real content
// immediately. Related-articles uses a lightweight 2-row read instead of
// downloading every published post to pick 2 at random.

import { getServerBlogPostBySlug, getServerRelatedBlogPosts } from "@/lib/cms/server-blog";
import BlogPostClient, { BlogPostNotFound } from "./BlogPostClient";

const RELATED_COUNT = 2;

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getServerBlogPostBySlug(slug);

  if (!post) {
    return <BlogPostNotFound />;
  }

  const related = await getServerRelatedBlogPosts(slug, RELATED_COUNT);

  return <BlogPostClient post={post} related={related} />;
}

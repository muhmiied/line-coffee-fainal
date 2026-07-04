// SEO wrapper for a blog post. Reads the real published post (blog_posts, anon
// read of published rows only) to build Article metadata + Article/BreadcrumbList
// JSON-LD. Falls back to a noindex generic when the post is missing/unpublished.

import type { Metadata } from "next";
import { getSeoBlogPost } from "@/lib/seo/data";
import { articleMetadata, pageMetadata } from "@/lib/seo/metadata";
import { JsonLd, articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { DEFAULT_DESCRIPTION, seoText } from "@/lib/seo/site";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getSeoBlogPost(slug);

  if (!post) {
    return pageMetadata({
      title: "Coffee Journal",
      description: DEFAULT_DESCRIPTION,
      path: `/blog/${slug}`,
      index: false,
    });
  }

  return articleMetadata({
    title: post.title,
    description: seoText(post.excerpt, 160) || `${post.title} — from the Line Coffee journal.`,
    path: `/blog/${post.slug}`,
    image: post.image,
    publishedTime: post.publishedAt || undefined,
    section: post.category || undefined,
  });
}

export default async function BlogPostSeoLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const post = await getSeoBlogPost(slug);

  return (
    <>
      {post ? (
        <JsonLd
          data={[
            articleJsonLd(post),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Journal", path: "/blog" },
              { name: post.title, path: `/blog/${post.slug}` },
            ]),
          ]}
        />
      ) : null}
      {children}
    </>
  );
}

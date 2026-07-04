// SEO wrapper for the Blog area. Sets the listing metadata; /blog/[slug]
// overrides it with per-article metadata + Article JSON-LD.

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Coffee Journal",
  description:
    "Stories, brewing guides and roasting notes from Line Coffee — Egypt's premium specialty coffee brand since 2015.",
  path: "/blog",
});

export default function BlogSeoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

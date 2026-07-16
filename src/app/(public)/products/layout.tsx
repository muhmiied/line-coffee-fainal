// SEO wrapper for the Products area. Sets the listing's metadata (title,
// description, canonical, Open Graph). Dynamic children — /products/[slug] and
// /products/category/[slug] — override this via their own generateMetadata, so
// no page-specific JSON-LD is emitted here (it would leak onto every child).

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Coffee Products",
  description:
    "Browse the full Line Coffee range — Turkish blends, espresso blends, easy coffee, flavored coffee, coffee mix, cappuccino and hot chocolate. Carefully sourced specialty coffee delivered across Egypt.",
  path: "/products",
});

export default function ProductsSeoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

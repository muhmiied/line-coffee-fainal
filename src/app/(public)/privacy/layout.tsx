// SEO metadata for the Privacy Policy page.

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Line Coffee collects, uses, and protects your personal information when you shop with us in Egypt.",
  path: "/privacy",
});

export default function PrivacySeoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

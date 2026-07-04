// SEO metadata for the Terms of Service page.

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms and conditions for buying from Line Coffee — orders, delivery, and your rights as a customer in Egypt.",
  path: "/terms",
});

export default function TermsSeoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// SEO metadata for the Returns & Refunds page.

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Returns & Refunds",
  description:
    "Line Coffee returns and refunds policy — eligibility, how to start a return, and how refunds are handled for orders in Egypt.",
  path: "/returns",
});

export default function ReturnsSeoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

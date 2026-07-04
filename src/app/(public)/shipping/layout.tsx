// SEO metadata for the Shipping & Delivery page.

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Shipping & Delivery",
  description:
    "Line Coffee delivery information — delivery areas across Egypt, timing, fees, and our freshly-roasted guarantee.",
  path: "/shipping",
});

export default function ShippingSeoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

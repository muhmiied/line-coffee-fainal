// SEO wrapper for the About page: metadata + AboutPage JSON-LD.

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd, aboutPageJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = pageMetadata({
  title: "About Line Coffee",
  description:
    "Line Coffee is a family-run Egyptian specialty coffee brand, crafting blends with intention since 2015. Learn our story, our sourcing philosophy, and our commitment to freshness.",
  path: "/about",
});

export default function AboutSeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={aboutPageJsonLd()} />
      {children}
    </>
  );
}

// SEO wrapper for the Contact page: metadata + ContactPage JSON-LD.

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd, contactPageJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = pageMetadata({
  title: "Contact Line Coffee",
  description:
    "Get in touch with Line Coffee. Questions about orders, custom blends, wholesale, or delivery across Egypt — reach us by WhatsApp, phone, or email.",
  path: "/contact",
});

export default function ContactSeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={contactPageJsonLd()} />
      {children}
    </>
  );
}

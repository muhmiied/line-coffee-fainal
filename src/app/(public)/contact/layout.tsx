// SEO wrapper for the Contact page: metadata + ContactPage JSON-LD.

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd, contactPageJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { CONTACT_FAQ_ITEMS } from "@/lib/content/contact-faq";

export const metadata: Metadata = pageMetadata({
  title: "Contact Line Coffee",
  description:
    "Get in touch with Line Coffee. Questions about orders, custom blends, wholesale, or delivery across Egypt — reach us by WhatsApp, phone, or email.",
  path: "/contact",
});

// FAQPage schema is built from the exact same CONTACT_FAQ_ITEMS the client
// page renders (English strings — the visible page is bilingual via the
// cookie-driven language toggle, but structured data needs one fixed
// language), so it can never list a question that isn't actually on the page.
export default function ContactSeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={[
          contactPageJsonLd(),
          faqJsonLd(CONTACT_FAQ_ITEMS.map((item) => ({ question: item.question.en, answer: item.answer.en }))),
        ]}
      />
      {children}
    </>
  );
}

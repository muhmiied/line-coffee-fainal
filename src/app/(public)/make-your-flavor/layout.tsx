// SEO wrapper for the Make Your Flavor builder page.

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Make Your Flavor",
  description:
    "Design your own flavored coffee with Line Coffee. Pick a base and add the flavors you love to build a custom cup, freshly prepared and delivered across Egypt.",
  path: "/make-your-flavor",
  keywords: ["make your flavor", "custom flavored coffee", "build your own coffee", "قهوة بنكهات مخصصة"],
});

export default function MakeYourFlavorSeoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

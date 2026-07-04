// SEO wrapper for the Make Your Espresso builder page.

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Make Your Espresso",
  description:
    "Build your own espresso blend with Line Coffee. Choose your beans and ratios to create a custom-roasted espresso tuned to your taste, delivered fresh across Egypt.",
  path: "/make-your-espresso",
  keywords: ["make your espresso", "custom espresso blend", "build your own coffee", "خلطة إسبريسو مخصصة"],
});

export default function MakeYourEspressoSeoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import type { Metadata } from "next";
import { LineCoffeeHome } from "@/features/website/home/LineCoffeeHome";
import { DEFAULT_DESCRIPTION } from "@/lib/seo/site";

export const metadata: Metadata = {
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function Home() {
  return <LineCoffeeHome />;
}

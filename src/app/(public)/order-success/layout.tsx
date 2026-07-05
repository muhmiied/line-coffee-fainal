import type { Metadata } from "next";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/private-metadata";

export const metadata: Metadata = {
  robots: PRIVATE_PAGE_ROBOTS,
};

export default function OrderSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

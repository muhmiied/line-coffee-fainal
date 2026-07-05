import type { Metadata } from "next";
import CheckoutOwnerBoundary from "./CheckoutOwnerBoundary";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/private-metadata";

export const metadata: Metadata = {
  robots: PRIVATE_PAGE_ROBOTS,
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CheckoutOwnerBoundary>{children}</CheckoutOwnerBoundary>;
}

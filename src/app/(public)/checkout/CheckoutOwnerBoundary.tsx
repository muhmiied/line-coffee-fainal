"use client";

import { useAuth } from "@/lib/hooks/useAuth";

/**
 * Checkout holds customer PII and saved-address results in local state. Remount
 * the page whenever the authenticated owner changes so none of that state can
 * survive an Account A -> Account B session switch.
 */
export default function CheckoutOwnerBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const ownerKey = isLoading ? "loading" : (user?.id ?? "guest");

  return <div key={ownerKey}>{children}</div>;
}

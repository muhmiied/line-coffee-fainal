"use client";

import { useAuth } from "@/lib/hooks/useAuth";

/**
 * Account pages keep RPC results in local component state. Remount the route
 * subtree whenever the authenticated owner changes so Account A data can never
 * remain visible after a direct Account A -> Account B session switch.
 */
export default function AccountOwnerBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const ownerKey = isLoading ? "loading" : (user?.id ?? "signed-out");

  return <div key={ownerKey}>{children}</div>;
}

"use client";

import { ErrorScreen } from "@/components/error/ErrorScreen";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen error={error} reset={reset} homeHref="/admin/dashboard" />;
}

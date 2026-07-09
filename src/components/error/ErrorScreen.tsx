"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

// Shared branded fallback for the App Router error boundaries. Intentionally
// self-contained (no data/context dependencies) so it stays reliable even when
// the surrounding tree is the thing that failed. Bilingual static copy.
export function ErrorScreen({
  error,
  reset,
  homeHref = "/",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
}) {
  useEffect(() => {
    // Surface the error for debugging; the UI stays friendly in production.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#0B0806] px-4 text-center">
      <div className="w-full max-w-md rounded-2xl border border-[#B6885E]/18 bg-[#120D09]/80 px-6 py-8 shadow-[0_20px_56px_rgba(0,0,0,0.45)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#B6885E]/12 ring-1 ring-[#B6885E]/20">
          <AlertTriangle className="h-7 w-7 text-[#D6A373]" />
        </div>
        <h1 className="mb-1 font-serif text-xl font-bold text-[#F5E6D8]">
          Something went wrong
        </h1>
        <p className="mb-1 text-sm text-[#D6B79A]/70" dir="rtl">
          حدث خطأ غير متوقع
        </p>
        <p className="mb-6 text-xs leading-5 text-[#B79B85]/55">
          An unexpected error occurred. You can try again, or head back to the
          homepage.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="premium-button w-full rounded-full py-3 text-sm font-semibold"
          >
            Try again
          </button>
          <Link
            href={homeHref}
            className="w-full rounded-full border border-[#B6885E]/20 py-3 text-sm text-[#D6B79A]/80 transition-colors hover:text-[#F5E6D8]"
          >
            Back to home
          </Link>
        </div>
        {error.digest && (
          <p className="mt-4 text-[10px] text-[#B79B85]/35">
            Ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

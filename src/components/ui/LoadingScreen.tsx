import { Loader2 } from "lucide-react";

// Branded route-transition fallback used by the App Router loading.tsx files.
// Server component (no interactivity) — just a themed spinner.
export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-[#0B0806] px-4 text-center"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-[#D6A373]" />
      <p className="text-sm text-[#B79B85]/60">{label}</p>
    </div>
  );
}

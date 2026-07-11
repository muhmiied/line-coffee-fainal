// Branded route-transition fallback used by the App Router loading.tsx files.
// Server component (no interactivity) — an elegant warm-coffee loader driven by
// the .line-loader tokens in globals.css (dark coffee field, warm pulsing bean
// core, spinning gold arc). Lightweight, no external spinner asset.
export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="relative flex min-h-[60vh] flex-col items-center justify-center gap-5 overflow-hidden bg-[#0b0806] px-4 text-center"
      role="status"
      aria-live="polite"
    >
      {/* Ambient warm glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_50%_45%,rgba(182,136,94,0.12),transparent_70%)]"
      />

      <div className="relative">
        <div className="line-loader">
          <span className="line-loader-core">
            <span className="line-loader-bean" />
          </span>
        </div>
      </div>

      <p className="relative text-sm font-medium tracking-wide text-[#d6bb9f]/80">
        {label}
      </p>
    </div>
  );
}

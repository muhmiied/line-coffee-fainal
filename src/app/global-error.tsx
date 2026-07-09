"use client";

import { useEffect } from "react";

// Catches errors thrown in the root layout itself. It replaces the whole
// document, so it must render its own <html>/<body> and cannot rely on the app
// providers or global CSS classes being available.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" dir="ltr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0806",
          color: "#F5E6D8",
          fontFamily: "Georgia, 'Times New Roman', serif",
          padding: "1rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#B79B85", marginBottom: "1.5rem" }}>
            An unexpected error occurred while loading Line Coffee.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: "pointer",
              borderRadius: 9999,
              border: "1px solid rgba(182,136,94,0.4)",
              background: "linear-gradient(135deg,#b6885e,#d6a373)",
              color: "#1a120c",
              padding: "0.75rem 2rem",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

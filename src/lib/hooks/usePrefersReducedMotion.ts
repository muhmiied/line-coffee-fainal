"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

// The global CSS rule in globals.css already freezes CSS animations/
// transitions under this media query, but it cannot touch JS-driven
// setInterval loops (hero auto-rotate, count-up numbers, announcement-bar
// cycling). Components that run their own timers should gate them with this.
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    // Reading a browser-only media query can't happen during render (SSR has
    // no window), so the initial value is necessarily synced in the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

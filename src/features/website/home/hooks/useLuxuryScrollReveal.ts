"use client";

import { useEffect } from "react";
import { useLanguage } from "@/lib/context/language";

/**
 * Attaches an IntersectionObserver to every [data-reveal] element on the page
 * and adds the `is-visible` class when they enter the viewport.
 *
 * Re-runs when the language changes because RTL/LTR layout shifts may move
 * elements out of their previous viewport positions.
 */
export function useLuxuryScrollReveal() {
  const { language } = useLanguage();

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -4% 0px", threshold: 0.06 },
    );

    nodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      const alreadyVisible =
        rect.top < window.innerHeight && rect.bottom > 0;

      if (alreadyVisible) {
        node.classList.add("is-visible");
      } else {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, [language]);
}

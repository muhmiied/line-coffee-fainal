"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

export function useWishlist() {
  const [ids, setIds] = useLocalStorage<string[]>("line-wishlist-v1", []);

  const toggle = useCallback(
    (slug: string) =>
      setIds((prev) =>
        prev.includes(slug) ? prev.filter((id) => id !== slug) : [...prev, slug],
      ),
    [setIds],
  );

  const isWishlisted = useCallback((slug: string) => ids.includes(slug), [ids]);

  const remove = useCallback(
    (slug: string) => setIds((prev) => prev.filter((id) => id !== slug)),
    [setIds],
  );

  return { ids, count: ids.length, toggle, isWishlisted, remove };
}

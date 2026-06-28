"use client";

import { useCallback, useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

// Module-level guard: sync from Supabase only once per browser session so
// every ProductCard mounting the hook doesn't fire redundant RPCs.
let _synced = false;

export function useWishlist() {
  const [ids, setIds] = useLocalStorage<string[]>("line-wishlist-v1", []);

  // On first mount, load from Supabase and merge with localStorage.
  // Runs only once per session (guarded by module-level _synced flag).
  useEffect(() => {
    if (_synced) return;
    _synced = true;
    import("@/lib/account/customer-account")
      .then(({ getCustomerWishlist }) => getCustomerWishlist())
      .then((slugs) => {
        if (slugs.length === 0) return;
        setIds((prev) => {
          const merged = Array.from(new Set([...prev, ...slugs]));
          // Only update if something actually changed to avoid re-renders
          return merged.length !== prev.length ? merged : prev;
        });
      })
      .catch(() => {
        // Supabase unavailable — localStorage remains source of truth
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(
    (slug: string) => {
      const willRemove = ids.includes(slug);
      setIds((prev) =>
        willRemove ? prev.filter((id) => id !== slug) : [...prev, slug],
      );
      // Async Supabase sync — fire-and-forget
      import("@/lib/account/customer-account").then(
        ({ addCustomerWishlistItem, removeCustomerWishlistItem }) => {
          if (willRemove) {
            removeCustomerWishlistItem(slug).catch(() => {});
          } else {
            addCustomerWishlistItem(slug).catch(() => {});
          }
        },
      );
    },
    [ids, setIds],
  );

  const isWishlisted = useCallback((slug: string) => ids.includes(slug), [ids]);

  const remove = useCallback(
    (slug: string) => {
      setIds((prev) => prev.filter((id) => id !== slug));
      import("@/lib/account/customer-account").then(
        ({ removeCustomerWishlistItem }) => {
          removeCustomerWishlistItem(slug).catch(() => {});
        },
      );
    },
    [setIds],
  );

  return { ids, count: ids.length, toggle, isWishlisted, remove };
}

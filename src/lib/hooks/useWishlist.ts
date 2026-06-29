"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateGuestId } from "@/lib/checkout";

// =============================================================================
// Owner-scoped wishlist store (Phase 2 bugfix)
// =============================================================================
// The wishlist MUST be scoped to the current owner:
//   * authenticated  -> the signed-in user (`auth:<userId>`), server is truth.
//   * guest          -> the device guest_id (`guest:<guestId>`), server is truth,
//                       with a guest-scoped localStorage cache for instant paint.
//
// Hard rules enforced here:
//   * No single GLOBAL localStorage key (that was the leak: Account A's items
//     stayed in `line-wishlist-v1` through logout and into Account B's session).
//   * Authenticated wishlist is NEVER written to localStorage — only memory +
//     server. So no account-owned item can ever leak through localStorage.
//   * On every auth change the in-memory list is cleared IMMEDIATELY and the new
//     owner's list is (re)fetched from the server. Account A items never survive
//     a logout or an Account B login.
//   * Ownership is resolved only from auth.uid() (server) or the device guest_id.
//     Never from phone/email.
//
// All components share ONE in-memory list via useSyncExternalStore, so the header
// count, the header drawer, and /account/wishlist always agree.

const LEGACY_GLOBAL_KEY = "line-wishlist-v1"; // pre-fix shared key — purged, never read
const GUEST_KEY_PREFIX = "line-wishlist-v1:guest:";

type OwnerKind = "auth" | "guest";

type WishlistState = {
  ownerKey: string | null; // "auth:<id>" | "guest:<id>" | null (unresolved)
  kind: OwnerKind | null;
  guestId: string | null; // set only when kind === "guest"
  ids: string[];
};

const EMPTY: string[] = [];

let store: WishlistState = {
  ownerKey: null,
  kind: null,
  guestId: null,
  ids: EMPTY,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return store.ids;
}

function getServerSnapshot() {
  return EMPTY;
}

// ─── localStorage helpers (guest scope only) ─────────────────────────────────

let _legacyCleared = false;
function clearLegacyKeyOnce() {
  if (_legacyCleared || typeof window === "undefined") return;
  _legacyCleared = true;
  try {
    // The old global key shared one wishlist across every account on the device.
    // Purge it so a pre-fix leaked list can never be read again.
    window.localStorage.removeItem(LEGACY_GLOBAL_KEY);
  } catch {
    // ignore (private mode / quota)
  }
}

function safeGuestId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return getOrCreateGuestId();
  } catch {
    return null;
  }
}

function readGuestCache(guestId: string): string[] {
  try {
    const raw = window.localStorage.getItem(GUEST_KEY_PREFIX + guestId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function writeGuestCache(guestId: string, ids: string[]) {
  try {
    window.localStorage.setItem(GUEST_KEY_PREFIX + guestId, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

// ─── Server (source of truth) — dynamic import keeps it off the critical path ──

async function fetchServerWishlist(): Promise<string[]> {
  const mod = await import("@/lib/account/customer-account");
  // getCustomerWishlist self-scopes: auth.uid() when signed in, else guest_id.
  return mod.getCustomerWishlist();
}

function persistServer(slug: string, remove: boolean) {
  import("@/lib/account/customer-account")
    .then((mod) => {
      const op = remove
        ? mod.removeCustomerWishlistItem(slug)
        : mod.addCustomerWishlistItem(slug);
      return op.catch(() => {});
    })
    .catch(() => {});
}

// ─── Owner switching ─────────────────────────────────────────────────────────

function setOwner(ownerKey: string, kind: OwnerKind, guestId: string | null) {
  clearLegacyKeyOnce();
  if (store.ownerKey === ownerKey) return; // already on this owner — no reload

  // 1) IMMEDIATE clear: drop the previous owner's list right now. Guests seed from
  //    their own scoped cache for instant paint; auth owners start empty (auth
  //    lists never touch localStorage).
  const seed = kind === "guest" && guestId ? readGuestCache(guestId) : [];
  store = { ownerKey, kind, guestId, ids: seed };
  emit();

  // 2) Reconcile from the server (the source of truth for both owners).
  const token = ownerKey;
  fetchServerWishlist()
    .then((slugs) => {
      if (store.ownerKey !== token) return; // owner changed mid-flight — discard
      store = { ownerKey: token, kind, guestId, ids: slugs };
      if (kind === "guest" && guestId) writeGuestCache(guestId, slugs);
      emit();
    })
    .catch(() => {
      // keep the seed; server unavailable
    });
}

function mutate(slug: string, remove: boolean) {
  if (!store.ownerKey) return; // owner not resolved yet — ignore the action
  const has = store.ids.includes(slug);
  if (remove && !has) return;
  if (!remove && has) return;

  const next = remove
    ? store.ids.filter((s) => s !== slug)
    : [...store.ids, slug];
  store = { ...store, ids: next };
  emit();

  if (store.kind === "guest" && store.guestId) writeGuestCache(store.guestId, next);
  persistServer(slug, remove);
}

// ─── One module-level auth watcher drives the owner ──────────────────────────
// A single supabase auth subscription (not one per component) keeps the wishlist
// owner in sync with sign-in / sign-out, so account switches clear + refetch.

let _authWatcherStarted = false;

function applyAuthUser(userId: string | null | undefined) {
  if (userId) {
    setOwner(`auth:${userId}`, "auth", null);
    return;
  }
  const guestId = safeGuestId();
  if (guestId) setOwner(`guest:${guestId}`, "guest", guestId);
}

function startAuthWatcher() {
  if (_authWatcherStarted || typeof window === "undefined") return;
  _authWatcherStarted = true;
  clearLegacyKeyOnce();

  supabase.auth
    .getUser()
    .then(({ data }) => applyAuthUser(data.user?.id ?? null))
    .catch(() => applyAuthUser(null));

  supabase.auth.onAuthStateChange((_event, session) => {
    applyAuthUser(session?.user?.id ?? null);
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWishlist() {
  // Start the shared auth watcher once (first mounted consumer wins).
  useEffect(() => {
    startAuthWatcher();
  }, []);

  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((slug: string) => {
    mutate(slug, store.ids.includes(slug));
  }, []);

  const remove = useCallback((slug: string) => {
    mutate(slug, true);
  }, []);

  const isWishlisted = useCallback((slug: string) => ids.includes(slug), [ids]);

  return { ids, count: ids.length, toggle, isWishlisted, remove };
}

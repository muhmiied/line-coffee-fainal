"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getOrCreateGuestId } from "@/lib/checkout";
import {
  COMMERCE_OWNER_LINKED_EVENT,
  getResolvedCommerceOwner,
  startCommerceOwnerResolver,
} from "@/lib/hooks/useAuth";

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

// Per-slug operation queue: rapid add/remove clicks on the SAME product must
// reach the server in the order the user made them (rapid-toggle rule), and a
// failed write must reconcile — but only revert what IT changed, never a
// different slug or a newer local toggle the user has since made on this one
// (no "restoring unrelated products" / no clobbering fresher intent).
//
// `latestSlugSeq` tracks which queued operation is the LATEST for a slug.
// Checking "does current state match what I wanted" alone is not enough: on
// add→remove→add where the first add fails but the third (also an add)
// later succeeds, by the time the first add's catch runs, the THIRD click's
// synchronous optimistic update (fired immediately at click time, ahead of
// any network round trip) already left the store showing "has" — so the
// first add's catch would wrongly read that as its own effect and revert a
// state it didn't create. Only the operation that is still the most
// recently queued one for that slug is allowed to reconcile.
const pendingSlugOps = new Map<string, Promise<void>>();
const latestSlugSeq = new Map<string, number>();

function queuePersist(slug: string, remove: boolean, ownerToken: string) {
  const seq = (latestSlugSeq.get(slug) ?? 0) + 1;
  latestSlugSeq.set(slug, seq);

  const prior = pendingSlugOps.get(slug) ?? Promise.resolve();
  const next = prior.catch(() => {}).then(async () => {
    // The owner may have changed since this op was queued (e.g. queued as a
    // guest action, then the visitor signed in before it got to run) — the
    // Supabase client always sends the CURRENT session's credentials, so an
    // un-scoped write here could land on the wrong owner's account. Skip it
    // entirely rather than write under a different owner than intended.
    if (store.ownerKey !== ownerToken) return;

    const mod = await import("@/lib/account/customer-account");
    try {
      if (remove) await mod.removeCustomerWishlistItem(slug);
      else await mod.addCustomerWishlistItem(slug);
    } catch {
      if (store.ownerKey !== ownerToken) return; // owner switched — nothing to reconcile
      if (latestSlugSeq.get(slug) !== seq) return; // a newer op for this slug is queued/queued-since — defer to it
      const currentlyHas = store.ids.includes(slug);
      const failedOpTargetHas = !remove; // what the failed write tried to make true
      if (currentlyHas !== failedOpTargetHas) return; // a newer local toggle already moved past this
      const reverted = remove
        ? [...store.ids, slug] // failed remove -> restore locally
        : store.ids.filter((s) => s !== slug); // failed add -> undo locally
      store = { ...store, ids: reverted };
      if (store.kind === "guest" && store.guestId) writeGuestCache(store.guestId, reverted);
      emit();
    }
  });
  pendingSlugOps.set(slug, next);
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

  const ownerToken = store.ownerKey;
  const next = remove
    ? store.ids.filter((s) => s !== slug)
    : [...store.ids, slug];
  store = { ...store, ids: next };
  emit();

  if (store.kind === "guest" && store.guestId) writeGuestCache(store.guestId, next);
  queuePersist(slug, remove, ownerToken);
}

// ─── Owner resolution is driven by the shared commerce-owner resolver ───────
// The wishlist used to run its OWN independent supabase.auth.onAuthStateChange
// listener here and hydrate the moment the raw event fired. That raced ahead
// of link_guest_data_to_account() (which moves the guest's items onto the
// account), so a fresh sign-in briefly showed an empty account wishlist, and
// logout briefly showed the stale pre-link guest cache before the server
// confirmed those rows had moved. COMMERCE_OWNER_LINKED_EVENT (useAuth.ts)
// fires only once linking has settled (or timed out) for a given transition,
// so subscribing to it instead makes hydration always come after migration.

let _wishlistOwnerWatcherStarted = false;

function applyAuthUser(userId: string | null | undefined) {
  if (userId) {
    // If we were previously a guest, that guest's items have just been (or
    // were attempted to be) linked to this account by the resolver — its
    // local cache is now stale. Clear it now so a LATER logout back to this
    // same guest_id seeds from nothing instead of flashing the pre-link
    // items before the server confirms they moved (the reported "old guest
    // wishlist appears briefly, then disappears" symptom). The server stays
    // authoritative either way: setOwner() below always re-fetches next.
    if (store.kind === "guest" && store.guestId) {
      try {
        window.localStorage.removeItem(GUEST_KEY_PREFIX + store.guestId);
      } catch {
        // ignore (private mode / quota)
      }
    }
    setOwner(`auth:${userId}`, "auth", null);
    return;
  }
  const guestId = safeGuestId();
  if (guestId) setOwner(`guest:${guestId}`, "guest", guestId);
}

function startAuthWatcher() {
  if (_wishlistOwnerWatcherStarted || typeof window === "undefined") return;
  _wishlistOwnerWatcherStarted = true;
  clearLegacyKeyOnce();

  // Ensures the shared resolver is running even if no useAuth() consumer has
  // mounted yet on this page.
  startCommerceOwnerResolver();

  // A resolution may have already completed before this listener attaches
  // (e.g. this is the first useWishlist() consumer to mount, but useAuth()
  // in the header resolved the owner earlier this page load) — pick that up
  // synchronously rather than waiting on an event that may never fire again.
  const already = getResolvedCommerceOwner();
  if (already) applyAuthUser(already.userId);

  window.addEventListener(COMMERCE_OWNER_LINKED_EVENT, (event) => {
    const detail = (event as CustomEvent<{ userId: string | null; epoch: number }>).detail;
    applyAuthUser(detail?.userId ?? null);
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

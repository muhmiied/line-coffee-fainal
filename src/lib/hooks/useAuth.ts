"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export const AUTH_OWNER_CHANGED_EVENT = "line-auth-owner-changed";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

// Non-sensitive "a session exists" presence cookie mirrored for the Edge
// middleware (src/middleware.ts), which cannot read the localStorage-backed
// Supabase session. It carries no token and is a UX hint only — RLS + AdminShell
// remain the real admin gates. Refreshed on every load while a session lives.
const SESSION_PRESENCE_COOKIE = "line-auth";
const SESSION_PRESENCE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function setSessionPresenceCookie(present: boolean) {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = present
    ? `${SESSION_PRESENCE_COOKIE}=1; path=/; max-age=${SESSION_PRESENCE_MAX_AGE}; SameSite=Lax${secure}`
    : `${SESSION_PRESENCE_COOKIE}=; path=/; max-age=0; SameSite=Lax${secure}`;
}

function mapUser(user: User | null): AuthUser | null {
  if (!user?.email) return null;

  const metadata = user.user_metadata ?? {};
  const firstAndLastName = [metadata.first_name, metadata.last_name]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
  const metadataName = [
    metadata.full_name,
    metadata.name,
    firstAndLastName,
    metadata.display_name,
  ].find((value): value is string => typeof value === "string" && Boolean(value.trim()));

  return {
    id: user.id,
    name: metadataName?.trim() || user.email,
    email: user.email,
  };
}

function notifyAuthOwnerChanged(userId: string | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(AUTH_OWNER_CHANGED_EVENT, { detail: { userId } }),
  );
}

export function clearLegacyMockAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("line-user-v1");
}

// Phase 2: link same-device guest data (orders/addresses/wishlist) to the
// signed-in account. Best-effort and idempotent — safe to re-run on every
// sign-in; a repeat run simply finds nothing left to migrate.
async function linkGuestDataBestEffort() {
  try {
    const mod = await import("@/lib/account/customer-account");
    await mod.linkGuestDataToAccount();
  } catch {
    // Migration may not be applied yet, or the network call failed — ignore.
    // Account reads still work via the auth-based ownership path.
  }
}

// =============================================================================
// Commerce owner resolver — the single source of "who owns account-linked
// data right now, and has same-device guest data finished migrating to them".
// =============================================================================
// Root cause this replaces: useWishlist used to run its OWN independent
// supabase.auth.onAuthStateChange listener and hydrated the signed-in
// owner's wishlist the instant the raw auth event fired — racing ahead of
// linkGuestDataToAccount(), which is what actually moves the guest's items
// onto the account. The wishlist would briefly read an empty account list
// (items not migrated yet), then never re-fetch once linking finished a
// moment later. On logout the same race showed the stale pre-link guest
// cache for a frame before the server confirmed those rows had moved.
//
// COMMERCE_OWNER_LINKED_EVENT is dispatched only once a transition has fully
// settled — including waiting (with a bounded timeout) for guest-data
// linking on a genuine sign-in — so any consumer that hydrates from it can
// never race ahead of the migration. It fires for every path a session can
// change through: explicit signIn/signUp/signOut in this tab, a sign-in from
// another tab or auth event, and token refreshes (deduped as no-ops).
export const COMMERCE_OWNER_LINKED_EVENT = "line-commerce-owner-linked";

const OWNER_LINK_TIMEOUT_MS = 8000;

function dispatchOwnerLinked(userId: string | null, epoch: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMMERCE_OWNER_LINKED_EVENT, { detail: { userId, epoch } }),
  );
}

// Resolves `promise` or `undefined` after `ms`, whichever comes first. Never
// rejects, so a slow/hung link attempt can never leave a caller waiting
// forever (bounded-timeout rule).
function boundedWait<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      },
    );
  });
}

// undefined = never resolved yet (page just loaded); null = resolved as guest.
let _resolvedOwnerUserId: string | null | undefined = undefined;
let _ownerEpoch = 0;
// The last epoch that actually finished settling (link attempted/timed out
// and the "ready" event dispatched) — distinct from _ownerEpoch, which is
// bumped the instant a transition is CLAIMED, before its link has run. A
// late-mounting consumer must only ever see a fully settled epoch; otherwise
// it could apply an auth owner while linking is still in flight and hydrate
// the still-unmigrated account list (the same class of bug this fix closes).
let _settledEpoch = 0;

// Epoch-guarded so a slow in-flight resolution can never clobber a newer one
// (e.g. sign-in immediately followed by sign-out while linking is still in
// flight): whichever transition's synchronous prefix runs first "claims"
// _resolvedOwnerUserId before any await yields, so a redundant call for the
// same target (the explicit signIn() await racing the SDK's own
// onAuthStateChange reaction to the same sign-in) becomes a same-owner no-op.
async function resolveCommerceOwner(userId: string | null): Promise<void> {
  if (_resolvedOwnerUserId !== undefined && _resolvedOwnerUserId === userId) {
    return; // same owner already resolved (e.g. a token refresh) — no-op
  }
  const isNewSignIn = userId !== null && userId !== _resolvedOwnerUserId;
  _resolvedOwnerUserId = userId;
  const epoch = ++_ownerEpoch;

  if (isNewSignIn) {
    // Give same-device guest data a bounded chance to migrate onto this
    // account BEFORE announcing the owner as ready.
    await boundedWait(linkGuestDataBestEffort(), OWNER_LINK_TIMEOUT_MS);
  }

  if (epoch !== _ownerEpoch) return; // superseded by a newer transition mid-flight
  _settledEpoch = epoch;
  dispatchOwnerLinked(userId, epoch);
}

// Synchronous snapshot of the last completed resolution, for a consumer that
// mounts AFTER the resolver already settled once (e.g. a lazily-mounted
// wishlist UI) — it must pick up the current owner immediately instead of
// waiting on COMMERCE_OWNER_LINKED_EVENT, which only fires on the NEXT
// transition and may never come again this page load. Returns null while a
// transition has been claimed but not yet settled (still linking), so a
// late-mount consumer never applies an owner ahead of its migration —
// COMMERCE_OWNER_LINKED_EVENT will still arrive once it settles.
export function getResolvedCommerceOwner(): { userId: string | null; epoch: number } | null {
  if (_resolvedOwnerUserId === undefined) return null;
  if (_settledEpoch !== _ownerEpoch) return null;
  return { userId: _resolvedOwnerUserId, epoch: _ownerEpoch };
}

let _resolverStarted = false;

// Idempotent singleton — safe to call from every consumer's mount effect so
// the resolver is always running regardless of which hook mounts first.
export function startCommerceOwnerResolver() {
  if (_resolverStarted || typeof window === "undefined") return;
  _resolverStarted = true;

  // getUser() revalidates over the network and can fail/hang; per the rule
  // that lookup errors must never be interpreted as "guest", a rejection
  // here resolves nothing and is NOT treated as a signed-out visitor.
  // onAuthStateChange's initial event (below) is sourced from the local
  // session cache and fires without a network round trip, so it is the real
  // settlement path when the network call is slow or unavailable.
  supabase.auth.getUser().then(
    ({ data }) => {
      void resolveCommerceOwner(data.user?.id ?? null);
    },
    () => {
      // Swallow — see comment above. Left unresolved for the listener/timer.
    },
  );

  supabase.auth.onAuthStateChange((_event, session) => {
    void resolveCommerceOwner(session?.user?.id ?? null);
  });

  // Final bounded fallback: if nothing above has resolved the owner within
  // the timeout (e.g. both the network call and the local session read
  // stalled), resolve as guest so a consumer can never be stuck unresolved
  // indefinitely (the "auth loading must always settle" rule).
  setTimeout(() => {
    if (_resolvedOwnerUserId === undefined) {
      void resolveCommerceOwner(null);
    }
  }, OWNER_LINK_TIMEOUT_MS);
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Idempotent — the resolver keeps running for the life of the page even
    // after this component unmounts, which is correct: it is not React
    // state, just the single shared owner-resolution singleton.
    startCommerceOwnerResolver();

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(mapUser(data.user));
      setIsLoading(false);
      setSessionPresenceCookie(Boolean(data.user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapUser(session?.user ?? null));
      setIsLoading(false);
      setSessionPresenceCookie(Boolean(session?.user));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    clearLegacyMockAuth();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    setUser(mapUser(data.user));
    setSessionPresenceCookie(true);
    notifyAuthOwnerChanged(data.user.id);
    // Link same-device guest data (bounded) and announce the owner as ready
    // before the caller routes on, so wishlist hydration never races ahead.
    await resolveCommerceOwner(data.user.id);
    return data;
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      clearLegacyMockAuth();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) throw error;
      setUser(mapUser(data.user));
      setSessionPresenceCookie(Boolean(data.session?.user));
      notifyAuthOwnerChanged(data.session?.user.id ?? null);
      // Only an active session can link (auth.uid() must resolve). When email
      // confirmation is required there is no session yet — linking + owner
      // resolution happen on the first authenticated load instead.
      if (data.session) {
        await resolveCommerceOwner(data.session.user.id);
      }
      return data;
    },
    [],
  );

  // A failed sign-out must leave the user visibly authenticated — clearing
  // local identity before confirming the revoke would flip Auth/Wishlist/
  // Cart to guest under a still-valid account. So the revoke is awaited
  // FIRST; only a confirmed success clears local state. The caller is
  // expected to catch and show a retry prompt on failure.
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;

    clearLegacyMockAuth();
    setUser(null);
    setSessionPresenceCookie(false);
    notifyAuthOwnerChanged(null);
    void resolveCommerceOwner(null);
  }, []);

  // Real "sign out of every device" — scope: "global" revokes the refresh
  // token for every session (including this one), not just the local copy.
  // Unlike signOut() above, failures are NOT swallowed: the caller needs to
  // know the revoke did not happen so it can show an honest error instead of
  // claiming every session was signed out when it may not have been.
  const signOutEverywhere = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) throw error;
    clearLegacyMockAuth();
    setUser(null);
    setSessionPresenceCookie(false);
    notifyAuthOwnerChanged(null);
    void resolveCommerceOwner(null);
  }, []);

  return {
    user,
    isLoading,
    isLoggedIn: user !== null,
    signIn,
    signUp,
    signOut,
    signOutEverywhere,
  };
}

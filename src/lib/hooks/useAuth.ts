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

  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "";

  return {
    id: user.id,
    name: metadataName.trim() || user.email,
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
// signed-in account. Best-effort and idempotent. Guarded so a persisted session
// only triggers one link attempt per page load; explicit sign-in/up always links.
let _guestLinkAttempted = false;

async function linkGuestDataBestEffort() {
  _guestLinkAttempted = true;
  try {
    const mod = await import("@/lib/account/customer-account");
    await mod.linkGuestDataToAccount();
  } catch {
    // Migration may not be applied yet, or the network call failed — ignore.
    // Account reads still work via the auth-based ownership path.
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(mapUser(data.user));
      setIsLoading(false);
      setSessionPresenceCookie(Boolean(data.user));
      // Persisted session detected: link same-device guest data once per load.
      if (data.user && !_guestLinkAttempted) {
        void linkGuestDataBestEffort();
      }
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
    // Link any same-device guest data to this account before the caller routes on.
    await linkGuestDataBestEffort();
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
      // confirmation is required there is no session yet — linking happens on
      // the first authenticated load instead.
      if (data.session) {
        await linkGuestDataBestEffort();
      }
      return data;
    },
    [],
  );

  const signOut = useCallback(async () => {
    // Drop the legacy mock key first, then best-effort revoke the Supabase
    // session. Even if the network call fails we still clear local identity so
    // no stale admin/customer state survives the sign-out.
    clearLegacyMockAuth();
    setUser(null);
    setSessionPresenceCookie(false);
    notifyAuthOwnerChanged(null);
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore — local identity was cleared above regardless
    }
  }, []);

  return {
    user,
    isLoading,
    isLoggedIn: user !== null,
    signIn,
    signUp,
    signOut,
  };
}

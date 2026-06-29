"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

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
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore — local identity is cleared below regardless
    }
    setUser(null);
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

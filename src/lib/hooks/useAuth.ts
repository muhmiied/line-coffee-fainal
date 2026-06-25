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

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(mapUser(data.user));
      setIsLoading(false);
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

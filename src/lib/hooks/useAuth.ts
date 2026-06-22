"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

export type MockUser = { name: string; email: string };

export function useAuth() {
  const [user, setUser] = useLocalStorage<MockUser | null>("line-user-v1", null);

  const signIn = useCallback(
    (name: string, email: string) => setUser({ name, email }),
    [setUser],
  );

  const signOut = useCallback(() => setUser(null), [setUser]);

  return { user, isLoggedIn: user !== null, signIn, signOut };
}

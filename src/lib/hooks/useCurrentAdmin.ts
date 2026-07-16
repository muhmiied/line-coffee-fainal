"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  getAdminForUser,
  getCurrentAdmin,
  type CurrentAdmin,
  type CurrentAdminResult,
} from "@/lib/auth/admin";

type AdminAuthStatus = "loading" | CurrentAdminResult["status"];

type UseCurrentAdminState = {
  status: AdminAuthStatus;
  admin: CurrentAdmin | null;
  error: string | null;
  resolvedUserId: string | null;
};

// Hard ceiling: if neither the initial resolution nor the first auth event has
// settled by now, fall to a visible error instead of spinning forever.
const RESOLVE_TIMEOUT_MS = 10_000;

function toState(result: CurrentAdminResult): UseCurrentAdminState {
  return {
    status: result.status,
    admin: result.status === "authorized" ? result.admin : null,
    error: result.status === "error" ? result.error : null,
    resolvedUserId: result.user?.id ?? null,
  };
}

export function useCurrentAdmin() {
  const [state, setState] = useState<UseCurrentAdminState>({
    status: "loading",
    admin: null,
    error: null,
    resolvedUserId: null,
  });
  const activeRef = useRef(true);
  const requestVersionRef = useRef(0);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = useCallback((result: CurrentAdminResult) => {
    if (!activeRef.current) return;
    setState(toState(result));
  }, []);

  // Manual re-check (used by the gate's "Try again" action). Safe to call from
  // event handlers — it is NOT invoked inside an onAuthStateChange callback.
  const resolve = useCallback(
    async (
      resolver: () => Promise<CurrentAdminResult>,
      expectedUserId: string | null,
    ) => {
      if (!activeRef.current) return resolver();
      const requestVersion = ++requestVersionRef.current;
      if (watchdogRef.current) clearTimeout(watchdogRef.current);

      // A changed auth owner must never inherit the previous user's role.
      setState({
        status: "loading",
        admin: null,
        error: null,
        resolvedUserId: expectedUserId,
      });

      watchdogRef.current = setTimeout(() => {
        if (!activeRef.current || requestVersionRef.current !== requestVersion) return;
        setState({
          status: "error",
          admin: null,
          error:
            "Admin access check timed out. Verify the Supabase connection and the admin_users RLS policy.",
          resolvedUserId: expectedUserId,
        });
      }, RESOLVE_TIMEOUT_MS);

      const result = await resolver();
      if (!activeRef.current || requestVersionRef.current !== requestVersion) return result;
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
      apply(result);
      return result;
    },
    [apply],
  );

  const refresh = useCallback(
    () => resolve(() => getCurrentAdmin(), null),
    [resolve],
  );

  useEffect(() => {
    activeRef.current = true;
    let cancelled = false;

    // Initial resolution. getCurrentAdmin() uses getSession() (no /user network
    // stall) and never rejects, so this always settles the state.
    const initialTimer = setTimeout(() => {
      if (cancelled) return;
      void resolve(() => getCurrentAdmin(), null);
    }, 0);

    // React to future auth changes. IMPORTANT: resolve from the `session` passed
    // into the callback. Do NOT call supabase.auth.getUser()/getSession() (or
    // getCurrentAdmin) in here — re-entering the auth client from its own event
    // callback is what can leave the resolver stuck. getAdminForUser only issues
    // a PostgREST read, which is safe inside the callback.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const authUser = session?.user ?? null;
      void resolve(() => getAdminForUser(authUser), authUser?.id ?? null);
    });

    return () => {
      cancelled = true;
      activeRef.current = false;
      clearTimeout(initialTimer);
      requestVersionRef.current += 1;
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
      subscription.unsubscribe();
    };
  }, [resolve]);

  return {
    ...state,
    isLoading: state.status === "loading",
    isAdmin: state.status === "authorized",
    refresh,
  };
}

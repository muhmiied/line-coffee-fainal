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
};

// Hard ceiling: if neither the initial resolution nor the first auth event has
// settled by now, fall to a visible error instead of spinning forever.
const RESOLVE_TIMEOUT_MS = 10_000;

function toState(result: CurrentAdminResult): UseCurrentAdminState {
  return {
    status: result.status,
    admin: result.status === "authorized" ? result.admin : null,
    error: result.status === "error" ? result.error : null,
  };
}

export function useCurrentAdmin() {
  const [state, setState] = useState<UseCurrentAdminState>({
    status: "loading",
    admin: null,
    error: null,
  });
  const activeRef = useRef(true);

  const apply = useCallback((result: CurrentAdminResult) => {
    if (!activeRef.current) return;
    setState(toState(result));
  }, []);

  // Manual re-check (used by the gate's "Try again" action). Safe to call from
  // event handlers — it is NOT invoked inside an onAuthStateChange callback.
  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading", error: null }));
    const result = await getCurrentAdmin();
    apply(result);
    return result;
  }, [apply]);

  useEffect(() => {
    activeRef.current = true;
    let settled = false;

    const settle = (result: CurrentAdminResult) => {
      settled = true;
      apply(result);
    };

    // Watchdog so a stalled network/RLS call can never pin the gate on "loading".
    const watchdog = setTimeout(() => {
      if (settled || !activeRef.current) return;
      settled = true;
      setState({
        status: "error",
        admin: null,
        error:
          "Admin access check timed out. Verify the Supabase connection and the admin_users RLS policy.",
      });
    }, RESOLVE_TIMEOUT_MS);

    // Initial resolution. getCurrentAdmin() uses getSession() (no /user network
    // stall) and never rejects, so this always settles the state.
    getCurrentAdmin().then((result) => {
      if (!activeRef.current) return;
      clearTimeout(watchdog);
      settle(result);
    });

    // React to future auth changes. IMPORTANT: resolve from the `session` passed
    // into the callback. Do NOT call supabase.auth.getUser()/getSession() (or
    // getCurrentAdmin) in here — re-entering the auth client from its own event
    // callback is what can leave the resolver stuck. getAdminForUser only issues
    // a PostgREST read, which is safe inside the callback.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      getAdminForUser(session?.user ?? null).then((result) => {
        if (!activeRef.current) return;
        clearTimeout(watchdog);
        settle(result);
      });
    });

    return () => {
      activeRef.current = false;
      clearTimeout(watchdog);
      subscription.unsubscribe();
    };
  }, [apply]);

  return {
    ...state,
    isLoading: state.status === "loading",
    isAdmin: state.status === "authorized",
    refresh,
  };
}

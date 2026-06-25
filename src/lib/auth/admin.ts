"use client";

import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type {
  AdminPermission,
  AdminRole,
  AdminUserStatus,
} from "@/lib/types/admin";

export type CurrentAdmin = {
  id: string;
  authUserId: string;
  email: string;
  displayName: string | null;
  role: AdminRole;
  status: AdminUserStatus;
  permissions: AdminPermission[] | null;
};

type AdminUserRow = {
  id: string;
  auth_user_id: string;
  email: string;
  display_name: string | null;
  role: AdminRole;
  status: AdminUserStatus;
  permissions: AdminPermission[] | null;
};

export type CurrentAdminResult =
  | { status: "signed_out"; user: null; admin: null; error: null }
  | { status: "forbidden"; user: User; admin: null; error: null }
  | { status: "authorized"; user: User; admin: CurrentAdmin; error: null }
  | { status: "error"; user: User | null; admin: null; error: string };

const ADMIN_ROLES = new Set<AdminRole>(["super_admin", "admin"]);

const ADMIN_COLUMNS =
  "id, auth_user_id, email, display_name, role, status, permissions";

function mapAdmin(row: AdminUserRow): CurrentAdmin {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    permissions: row.permissions,
  };
}

function devWarn(message: string) {
  if (process.env.NODE_ENV !== "production") {
    // Surface the reason an admin check did not authorize, without leaking
    // tokens or secrets — only the resolution outcome is logged.
    console.warn(`[admin-auth] ${message}`);
  }
}

export function formatAdminRole(role: AdminRole) {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "Viewer";
}

export function getAdminDisplayName(admin: CurrentAdmin) {
  return admin.displayName?.trim() || admin.email;
}

export function getAdminInitials(admin: CurrentAdmin) {
  const source = admin.displayName?.trim() || admin.email.split("@")[0] || admin.email;
  const parts = source.split(/\s+/).filter(Boolean);
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : source.slice(0, 2);

  return initials.toUpperCase();
}

/**
 * Resolve the admin identity for a known Supabase Auth user. Pure data layer:
 * queries `public.admin_users` by `auth_user_id` (the canonical link column) and
 * never throws — every failure mode maps to a concrete result so callers can
 * always settle their UI state.
 *
 *  - no user          → signed_out
 *  - no row           → forbidden (authenticated, but not an admin)
 *  - row not active   → forbidden (disabled admin)
 *  - role not admin   → forbidden (e.g. viewer-only, not allowed in the shell)
 *  - query/RLS error  → error (shown to the operator, never a silent hang)
 *  - active admin row → authorized
 */
export async function getAdminForUser(
  user: User | null,
): Promise<CurrentAdminResult> {
  if (!user) {
    return { status: "signed_out", user: null, admin: null, error: null };
  }

  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select(ADMIN_COLUMNS)
      // Match on the canonical link column. `.maybeSingle()` (not `.single()`)
      // so zero rows resolve to `data: null` instead of a PGRST116/406 error.
      .eq("auth_user_id", user.id)
      .maybeSingle<AdminUserRow>();

    if (error) {
      devWarn(`admin_users query failed: ${error.message}`);
      return { status: "error", user, admin: null, error: error.message };
    }

    if (!data) {
      devWarn("no admin_users row for the current auth user — treating as non-admin.");
      return { status: "forbidden", user, admin: null, error: null };
    }

    if (data.status !== "active") {
      devWarn(`admin_users row is "${data.status}", not active — access denied.`);
      return { status: "forbidden", user, admin: null, error: null };
    }

    if (!ADMIN_ROLES.has(data.role)) {
      devWarn(`admin_users role "${data.role}" is not permitted in the admin shell.`);
      return { status: "forbidden", user, admin: null, error: null };
    }

    return { status: "authorized", user, admin: mapAdmin(data), error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected error resolving admin access.";
    devWarn(`admin_users query threw: ${message}`);
    return { status: "error", user, admin: null, error: message };
  }
}

/**
 * Resolve the current admin from the active Supabase session. Uses
 * `getSession()` (local/cached, no `/auth/v1/user` network round-trip) so the
 * gate cannot stall on a slow user-validation request — the admin_users read it
 * triggers is still RLS-protected by the user's JWT. Never throws.
 */
export async function getCurrentAdmin(): Promise<CurrentAdminResult> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      devWarn(`getSession failed: ${error.message}`);
      return { status: "error", user: null, admin: null, error: error.message };
    }

    return await getAdminForUser(session?.user ?? null);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected error reading the session.";
    devWarn(`getSession threw: ${message}`);
    return { status: "error", user: null, admin: null, error: message };
  }
}

export async function resolvePostLoginDestination(fallbackPath = "/") {
  const result = await getCurrentAdmin();
  return result.status === "authorized" ? "/admin/dashboard" : fallbackPath;
}

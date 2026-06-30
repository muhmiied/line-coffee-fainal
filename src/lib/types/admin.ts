// Line Coffee V3 — Launch-Core Admin Security Contract
// admin.ts — admin users, roles, and permissions.
//
// Type-only. Additive.
// Status (2026-06-29, Phase 3 audit): LIVE — `AdminRole`, `AdminUserStatus`, and
// `AdminPermission` are imported by `src/lib/auth/admin.ts` (the real admin gate
// reads `public.admin_users` by `auth_user_id`). `ADMIN_ROLE_PERMISSIONS` /
// `RoleDefinition` remain forward-looking. See `src/lib/types/README.md`.
//
// Defines the canonical identity, role, and permission vocabulary used by the
// real `/admin/*` gate. Runtime authorization lives in `src/lib/auth/admin.ts`
// and resolves active membership from `public.admin_users`.

import type { ID, ISODateTime } from "@/lib/types/common";

// Admin role tiers. "super_admin" is the owner (full control incl. managing
// other admins); "admin" runs operations; "viewer" is read-only.
// Supabase mapping: `admin_users.role`.
export type AdminRole = "super_admin" | "admin" | "viewer";

// Hard account state for an admin user. "disabled" preserves history while
// revoking access.
// Supabase mapping: `admin_users.status`.
export type AdminUserStatus = "active" | "disabled";

// Practical per-module permission strings for launch. Coarse-grained (one
// read + one manage scope per admin module) — fine-grained per-action
// permissions are a post-launch concern.
// Supabase mapping: `admin_users.permissions` / `roles.permissions`.
export type AdminPermission =
  | "dashboard.read"
  | "products.manage"
  | "categories.manage"
  | "orders.manage"
  | "customers.manage"
  | "inventory.manage"
  | "accounting.manage"
  | "marketing.manage"
  | "cms.manage"
  | "settings.manage"
  | "admin_users.manage";

// The canonical admin user. Linked to a Supabase Auth user via `authUserId`.
// `permissions` is optional: when absent, the role's default set
// (ADMIN_ROLE_PERMISSIONS) applies; when present, it overrides for that user.
// Supabase mapping: `admin_users` table (FK `authUserId` → Supabase Auth user).
export interface AdminUser {
  id: ID;
  authUserId: ID;
  email: string;
  displayName?: string;
  role: AdminRole;
  status: AdminUserStatus;
  permissions?: AdminPermission[];
  createdAt: ISODateTime;
  updatedAt?: ISODateTime;
  lastLoginAt?: ISODateTime;
}

// A role definition: the default permission set a role grants. System roles are
// built-in and cannot be deleted; custom roles (future) can be edited.
// Supabase mapping: `roles` table (or derived from ADMIN_ROLE_PERMISSIONS at
// launch, since a `role` enum on `admin_users` is sufficient for a single-owner
// launch).
export interface RoleDefinition {
  role: AdminRole;
  label: string;
  permissions: AdminPermission[];
  isSystemRole: boolean;
}

// Declarative default permission map per role. Small, type-safe `as const`
// lookup — no runtime behavior. `super_admin` holds every permission; `admin`
// holds all except managing other admin users; `viewer` is read-only.
// Validated against the union via `satisfies` so adding an AdminPermission
// surfaces here at compile time.
export const ADMIN_ROLE_PERMISSIONS = {
  super_admin: [
    "dashboard.read",
    "products.manage",
    "categories.manage",
    "orders.manage",
    "customers.manage",
    "inventory.manage",
    "accounting.manage",
    "marketing.manage",
    "cms.manage",
    "settings.manage",
    "admin_users.manage",
  ],
  admin: [
    "dashboard.read",
    "products.manage",
    "categories.manage",
    "orders.manage",
    "customers.manage",
    "inventory.manage",
    "accounting.manage",
    "marketing.manage",
    "cms.manage",
    "settings.manage",
  ],
  viewer: ["dashboard.read"],
} as const satisfies Record<AdminRole, readonly AdminPermission[]>;

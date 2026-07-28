# Agent Work Protocol

This protocol is mandatory for every AI agent or developer working on Line Coffee V3.

## Source of truth

- Read `docs/final-system-reference/LINE_COFFEE_V3_COMPLETE_SYSTEM_REFERENCE.md` first.
- Read `docs/final-system-reference/LINE_COFFEE_V3_ROUTE_DATA_FLOW_MAP.md` for where a specific route's content/data lives.
- Read `docs/final-system-reference/LINE_COFFEE_V3_FINAL_AUDIT_AND_OPERATIONS.md` for the current launch verdict, accepted risks, and owner checklists.
- Use `CLAUDE.md` for locked architecture/design rules and the historical Change Log.
- Treat older mock-only/backend-future plans as history when they conflict with the documents above or current code.

## Before starting

- Confirm the active branch, commit, and `git status`; never overwrite unexplained user changes.
- If the worktree is dirty, inspect it and obtain explicit approval before continuing on top of it.
- Identify the affected module boundaries, runtime data source, and required validations before editing.
- Keep patches scoped. Repository-wide scans are appropriate only for an explicitly approved audit or when needed to prove a cross-cutting invariant.
- Supabase is live production infrastructure. Read-only inspection is allowed when in scope; never apply a migration, reset/seed a database, mutate live data, or change secrets without explicit owner approval.

## During work

- Preserve the established public visual direction unless a redesign is explicitly requested.
- Keep root, public, account, admin, server-route, and database responsibilities separate.
- The storefront, account, admin, CMS, settings, catalog, checkout, inventory, packaging, promos, accounting, and analytics business data are Supabase-backed. Do not introduce mock business data or silent runtime fallbacks.
- Keep server-authoritative pricing, delivery, promo, packaging, inventory/FIFO, COGS, and order-state rules in validated database RPCs; never trust client totals or add a service-role browser client.
- Public settings reads must use public-scoped rows; admin writes must stay behind authenticated RLS/RPC authorization.
- Preserve English/Arabic behavior, LTR/RTL parity, keyboard access, visible focus, and reduced-motion handling.
- Do not expose secrets, customer data, admin-only columns, purchase costs, or internal notes.
- Do not reintroduce removed visual systems: trust strips, smoke/gradient bridges, section-blend systems, transitional fog, or random animation.

## Before finishing

- Validate in proportion to risk. Code closure normally requires TypeScript, ESLint, relevant focused checks, dependency audit when packages changed, production build, and browser smoke for changed user flows.
- Never submit a real order/contact message, send a notification, or exercise destructive admin actions unless the owner explicitly approves the side effect and cleanup plan.
- Run `git diff --check`, review the final diff/status, and document unresolved risks honestly as blockers, non-blockers, or **Not tested**.
- For material state changes, update the relevant file under `docs/final-system-reference/` and append an entry to `CLAUDE.md`'s Change Log (its own explicit agent rule).
- Summarize exact files changed, migrations created/applied, validation results, side effects, and follow-up ownership.
- Do not commit, push, open a PR, deploy, or change production configuration unless explicitly requested.

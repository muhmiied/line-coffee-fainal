-- Phase 8-9 post-apply hardening.
--
-- The public builder pages still use their static TypeScript catalogs, so the
-- three cost-free catalog views do not need a client-role grant in this phase.
-- Run them as the caller and remove the unnecessary privileged read surface.
-- Non-destructive: no table, row, or column is changed.

alter view public.public_espresso_beans
  set (security_invoker = true);
alter view public.public_flavor_bases
  set (security_invoker = true);
alter view public.public_flavor_items
  set (security_invoker = true);

revoke all on public.public_espresso_beans from public, anon, authenticated;
revoke all on public.public_flavor_bases from public, anon, authenticated;
revoke all on public.public_flavor_items from public, anon, authenticated;

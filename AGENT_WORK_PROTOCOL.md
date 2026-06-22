# Agent Work Protocol

This protocol is mandatory for every AI agent or developer working on the Line Coffee V3 project.

## Before Starting

- Read `AGENTS.md` if it exists.
- Read `LINE_COFFEE_V3_PROJECT_LOG.md`.
- Understand the current task before editing.
- Read only files relevant to the task.
- Do not scan the whole repo unless necessary.
- Identify exact files before editing.
- Keep patches minimal.

## During Work

- Do not touch Supabase, Dashboard, Checkout, Orders, Auth, or database logic unless explicitly requested.
- Preserve the current homepage visual direction.
- Keep components separated.
- Respect Arabic/English and RTL/LTR behavior.
- Avoid random animations.
- Use premium editorial motion only when needed.
- Do not reintroduce removed visual systems: trust strip, smoke bridges, gradient bridges, section blend systems, transitional fog.

## Before Finishing

- Run lint, build, or typecheck commands when appropriate and available.
- Update `LINE_COFFEE_V3_PROJECT_LOG.md` with a new Agent Work Log entry.
- Summarize changed files.
- Mention validation results.
- Mention unresolved issues.

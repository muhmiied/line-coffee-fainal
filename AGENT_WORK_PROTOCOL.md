# Agent Work Protocol

This protocol is mandatory for every AI agent or developer working on the Line Coffee V3 project.

## Source Of Truth

- Read `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md` first.
- Then read `LINE_COFFEE_V3_PROJECT_LOG.md`.
- Read `CLAUDE.md` for historical context only when needed.
- Do not use old planning docs, audits, or prompts as the source of truth when they conflict with `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md`.
- If a major project decision changes, update `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md`.

## Before Starting

- Understand the current task before editing.
- Work module by module.
- Read only files relevant to the task.
- Do not scan the whole repo unless the user explicitly approves it.
- Identify exact files before editing.
- Keep patches minimal and scoped.
- Treat Supabase/backend/API/database work as deferred unless explicitly approved.

## During Work

- Do not touch unrelated modules.
- Preserve the current homepage visual direction.
- Do not redesign the homepage unless explicitly requested.
- Keep public website, account, admin, CMS, and Media Studio responsibilities separate.
- Keep all current dashboard/admin work mock-only unless explicitly stated otherwise.
- Respect Arabic/English and RTL/LTR behavior.
- Avoid random animations.
- Use premium editorial motion only when needed.
- Do not reintroduce removed visual systems: trust strip, smoke bridges, gradient bridges, section blend systems, transitional fog.

## Before Finishing

- Run lint, build, or typecheck commands only when appropriate for the task.
- For documentation-only work, do not run code validation unless there is a clear reason.
- Append a new entry to `LINE_COFFEE_V3_PROJECT_LOG.md` after each completed work session.
- Summarize changed files.
- Mention validation results.
- Mention unresolved issues or warnings.

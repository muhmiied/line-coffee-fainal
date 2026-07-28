# Line Coffee Final / V3

Line Coffee V3 is a bilingual (Arabic/English) Egyptian specialty-coffee e-commerce platform: a public storefront with two custom product builders (Make Your Espresso, Make Your Flavor), real customer accounts, and a full admin operations dashboard (catalog, orders, inventory/FIFO, accounting, analytics, marketing, CMS, settings).

The backend is **real Supabase**, not mock data. The browser talks to Postgres directly on the anon/publishable key; every write goes through a validated `SECURITY DEFINER` RPC that recomputes prices/stock/eligibility server-side. There is no service-role server anywhere in this codebase.

## Start here

Before changing anything in this project, read `CLAUDE.md`, then the three files under `docs/final-system-reference/`:

1. [`docs/final-system-reference/LINE_COFFEE_V3_COMPLETE_SYSTEM_REFERENCE.md`](docs/final-system-reference/LINE_COFFEE_V3_COMPLETE_SYSTEM_REFERENCE.md) — architecture and every module, in depth.
2. [`docs/final-system-reference/LINE_COFFEE_V3_ROUTE_DATA_FLOW_MAP.md`](docs/final-system-reference/LINE_COFFEE_V3_ROUTE_DATA_FLOW_MAP.md) — where a specific route's copy/images/data comes from.
3. [`docs/final-system-reference/LINE_COFFEE_V3_FINAL_AUDIT_AND_OPERATIONS.md`](docs/final-system-reference/LINE_COFFEE_V3_FINAL_AUDIT_AND_OPERATIONS.md) — live schema inventory, accepted risks, and the launch checklist.

`AGENT_WORK_PROTOCOL.md` has the operating rules every agent/developer follows on this project. `CLAUDE.md`'s Change Log is the complete chronological build history — useful context, but not the current-state source of truth (the three files above are).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript strict |
| Styling | Tailwind CSS v4 |
| Backend | Supabase Postgres — anon key + `SECURITY DEFINER` RPCs, no service role |
| Tests | Vitest + Testing Library (99 tests) |

## Folder map (actual, not planned)

- `src/app/(public)` — public website, ecommerce, auth, account routes.
- `src/app/admin` — real admin dashboard routes.
- `src/app/api` — the one server route (Telegram order notification).
- `src/components` — shared UI, layout, product, and admin components.
- `src/features/website` — public website + builder feature modules.
- `src/lib` — data layers (`admin/`, `catalog/`, `account/`, `checkout.ts`), auth, SEO, hooks, Supabase client.
- `src/lib/mock-data/visual-content.ts` — the homepage's static presentation/copy config (intentional, not a backend gap — Media Studio is cancelled).
- `src/types` — shared TypeScript types.
- `supabase/migrations` — every applied SQL migration (44 files, local/remote in sync).
- `docs/final-system-reference` — the authoritative documentation (see above).

## Getting started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run test:run
npm run build
```

## Architecture guardrails

- No homepage/public redesign unless explicitly requested — the visual direction is locked.
- No service-role key, no direct client writes to sensitive tables — every write goes through a validated RPC.
- Keep public, account, admin, and server-route responsibilities separate (see the System Reference, §2 "Layout ownership").
- Preserve English/Arabic parity, RTL/LTR correctness, and accessibility behavior in any change.

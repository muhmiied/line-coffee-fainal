# Line Coffee Final / V3

This repository is the current working Line Coffee V3 platform surface.

It is no longer foundation-only. The public website, customer-facing ecommerce flow, account/auth UI, and Admin Dashboard mock UI are active in this repo.

Backend, Supabase, real APIs, real payments, and production persistence are still deferred unless explicitly approved.

## Current Phase

Line Coffee V3 is in the mock UI buildout phase.

Active areas include:

- Premium bilingual public website.
- Product catalog, category pages, and product detail pages.
- Make Your Espresso and Make Your Flavor builders.
- Cart, checkout, and order-success mock flow.
- Auth and customer account mock UI.
- Admin Dashboard mock modules.
- Marketing & Promotions restructure in progress.

## AI Handoff

Before changing this project, read these in order:

1. [`docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md`](docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md)
2. [`AGENT_WORK_PROTOCOL.md`](AGENT_WORK_PROTOCOL.md)
3. [`LINE_COFFEE_V3_PROJECT_LOG.md`](LINE_COFFEE_V3_PROJECT_LOG.md)

The current-state file is the main source of truth for future AI sessions. Older planning docs are historical if they conflict with it.

## Reference Repositories

Reference repositories are read-only sources of context. Do not modify them and do not copy code blindly.

- Architecture source of truth: https://github.com/muhmiied/line-coffee-v2
- Business and customer journey reference: https://github.com/muhmiied/line-coffee

## Brand Foundation

- Brand: Line Coffee
- Primary brown: `#522500`
- Beige: `#FFDCC2`
- Black: `#000000`
- White: `#FFFFFF`
- Arabic font direction: Cairo/Tajawal and current project typography rules
- English font direction: Playfair Display

## Architecture Guardrails

- Build in this repository only.
- Keep old repositories read-only.
- Keep content structures bilingual.
- Keep public website, account, admin, CMS, and Media Studio responsibilities separate.
- Keep mock data in `src/lib/mock-data` until backend binding is explicitly approved.
- Do not introduce Supabase, API routes, database migrations, or backend persistence without approval.
- Do not redesign the homepage unless explicitly requested.

## Folder Map

- `src/app` - Next.js App Router entry point and routes.
- `src/app/(public)` - Public website, ecommerce, auth, and account routes.
- `src/app/admin` - Admin Dashboard mock routes.
- `src/components` - Shared UI, layout, product, and admin components.
- `src/features/website` - Public website feature modules.
- `src/features/dashboard` - Dashboard feature modules.
- `src/features/cms` - Future Content Builder and CMS modules.
- `src/features/media-studio` - Future Media Studio modules.
- `src/features/builders` - Custom builder modules.
- `src/lib/design-tokens` - Brand and design token definitions.
- `src/lib/mock-data` - Mock data until Supabase is connected later.
- `src/types` - Shared TypeScript types.
- `src/content` - Temporary structured content until CMS binding exists.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Validation

```bash
npm run lint
npm run build
```

For documentation-only work, code validation is usually not required.

## Design System

The design foundation is documented in [`docs/DESIGN_SYSTEM_FOUNDATION.md`](docs/DESIGN_SYSTEM_FOUNDATION.md).

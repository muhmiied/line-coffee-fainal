# Line Coffee Final / Visual Lab

This is the clean foundation for the future Line Coffee platform.

The project starts as a visual and architecture lab. It will grow into the
future Line Coffee website, premium ecommerce experience, CMS, dashboard,
Media Studio, custom builders, analytics surface, and mobile-ready content
source.

## Current Phase

Foundation only.

This phase includes:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Line Coffee brand tokens
- Cairo and Playfair Display font strategy
- Future-facing folder structure
- Design system foundation primitives

This phase intentionally does not include:

- Homepage implementation
- Dashboard implementation
- Backend implementation
- Supabase connection
- Auth
- Real APIs
- Production database schema

## Reference Repositories

Reference repositories are read-only sources of context. Do not modify them and
do not copy code blindly.

- Architecture source of truth: https://github.com/muhmiied/line-coffee-v2
- Business and customer journey reference: https://github.com/muhmiied/line-coffee

## Visual References

These references define quality and taste direction only. Do not copy branding,
content, layouts, or UI one-to-one.

- Emotional and editorial reference: https://irishcafe-template.framer.website/
- Product showcase and footer reference: https://cafenza.framer.website/

## Brand Foundation

- Brand: Line Coffee
- Primary brown: `#522500`
- Beige: `#FFDCC2`
- Black: `#000000`
- White: `#FFFFFF`
- Arabic font: Cairo
- English font: Playfair Display

## Architecture Guardrails

- Build in this repository only.
- Keep the old repositories read-only.
- Keep content structures bilingual from day one.
- Prepare every public content surface for future CMS control.
- Prepare every visual asset path for future Media Studio ownership.
- Keep dashboard, backend, auth, and database work out of this phase.

## Folder Map

- `src/app` - Next.js App Router entry point and future route groups.
- `src/app/(public)` - Future public website routes.
- `src/app/(dashboard)` - Future dashboard routes.
- `src/components` - Shared UI, layout, and brand components.
- `src/features/website` - Future public website feature modules.
- `src/features/dashboard` - Future dashboard feature modules.
- `src/features/cms` - Future Content Builder and CMS modules.
- `src/features/media-studio` - Future Media Studio modules.
- `src/features/builders` - Future custom Espresso and Flavor builders.
- `src/lib/design-tokens` - Brand and design token definitions.
- `src/lib/mock-data` - Mock data until Supabase is connected later.
- `src/types` - Shared TypeScript types.
- `src/content` - Temporary structured content until CMS binding exists.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Validation

```bash
npm run lint
npm run build
```

## Agent Handoff

Before changing this project, read [`AGENT_WORK_PROTOCOL.md`](AGENT_WORK_PROTOCOL.md)
and [`LINE_COFFEE_V3_PROJECT_LOG.md`](LINE_COFFEE_V3_PROJECT_LOG.md).

## Design System

The current design foundation is documented in
[`docs/DESIGN_SYSTEM_FOUNDATION.md`](docs/DESIGN_SYSTEM_FOUNDATION.md).

## Next Recommended Phase

Build the first public website skeleton using the design system primitives:
announcement bar, public shell, section composition, and mock-data wiring only.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

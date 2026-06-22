# LINE COFFEE V3 - Current State

Last updated: 2026-06-22

This file is the main source of truth for future AI sessions. If older planning docs, audits, prompts, or changelogs conflict with this file, follow this file.

## AI Reading Order

1. Read this file first.
2. Read `AGENT_WORK_PROTOCOL.md`.
3. Read `LINE_COFFEE_V3_PROJECT_LOG.md`.
4. If the task is Marketing, also read `docs/AI_HANDOFF_MARKETING.md`.
5. Then read only the exact source or documentation files required for the current task.

Do not scan the whole repository by default.

## Current Phase

Line Coffee V3 is in the mock UI buildout phase.

The public website, customer account/auth area, and Admin Dashboard mock UI are active. Backend, Supabase, real APIs, real persistence, real payments, and production database work are still deferred unless explicitly approved by the user.

The immediate active task is the Marketing & Promotions restructure.

## Current Repo Purpose

This repository is the working Line Coffee V3 product surface:

- Premium bilingual public website.
- Customer ecommerce journey in mock/local form.
- Customer account and auth UI in mock/local form.
- Admin Dashboard mock operating system.
- Future CMS, Media Studio, analytics, accounting, and Supabase binding foundation.

The repo should continue to be shaped module by module with minimal, focused changes.

## Completed Public Website Areas

These public/customer routes exist in the current repo:

- `/` homepage.
- `/products` product catalog.
- `/products/category/[slug]` category pages.
- `/products/[slug]` product detail pages.
- `/make-your-espresso` custom espresso builder.
- `/make-your-flavor` custom flavor builder.
- `/cart` cart page.
- `/checkout` mock checkout.
- `/order-success` mock order success.
- `/about` brand page.
- `/blog` journal index.
- `/blog/[slug]` journal detail pages.
- `/contact` contact page.
- `/privacy`, `/terms`, `/shipping`, `/returns` legal/support pages.

The homepage visual direction is considered locked. Do not redesign it unless the user explicitly asks.

## Completed Account/Auth Areas

These account and auth areas exist as mock/customer-facing UI:

- `/auth/login`
- `/auth/signup`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/account/profile`
- `/account/orders`
- `/account/orders/[id]`
- `/account/addresses`
- `/account/wishlist`
- `/account/notifications`
- `/account/settings`

Treat these as mock/local UI unless a task explicitly approves backend/auth integration.

## Completed Admin Modules

Completed or active admin mock modules include:

- Admin shell, sidebar, and topbar.
- Main dashboard.
- Orders.
- Products.
- Inventory.
- Customers.
- Make Your Espresso / Espresso Manager.
- Make Your Flavor / Flavor Manager.
- Marketing & Promotions initial rebuild, now being restructured.

Accounting, Analytics, and CMS route/mock files exist, but they are next modules for focused review/buildout. Do not treat them as final.

## Current Active Task

Current active task: Marketing & Promotions restructure.

Marketing should become a practical business workflow for campaigns, promo codes, announcement bar messages, and performance review. It must not become Media Studio, website section editing, or broad banner management.

## Current Marketing Target Structure

The approved Marketing structure is exactly four tabs:

1. Offers
2. Promo Codes
3. Announcement Bar
4. Performance

Targeting belongs inside Offer and Promo Code builders, not as a separate Marketing tab.

Announcement Bar controls only the small rotating announcement bar above the public website header. It must not edit hero banners, section banners, page banners, visual layout, or Media Studio areas.

Performance must clearly show:

- Original order value before discount.
- Discount given.
- Paid revenue after discount.
- Usage details by customer and order where mock data exists.

## Old Marketing Structure To Remove

The previous Marketing structure is obsolete. Remove or avoid:

- Customer Targeting tab.
- Website Banners tab.
- Hero/section banner management.
- Scheduled/Expired as primary filters.
- Visible Per Customer Limit field.
- Generic unstructured New Offer form.

The previous five-tab Marketing implementation is obsolete.

## Business Rules

Current rules that future work must preserve:

- Mock-only currently.
- No Supabase/backend yet.
- No real APIs or persistence unless explicitly approved.
- Finished products are inventory units by package size: 250g, 500g, and 1kg.
- Espresso beans are KG-based.
- Packaging is unit-based.
- Customer returns and supplier returns are separate workflows.
- Guests are valid customers.
- Guest customers can be VIP, repeat, or high-value.
- Customer tags do not override computed customer segments except Wholesale Potential.
- Tags are descriptive/admin signals, not replacements for computed segment logic.
- Marketing announcement messages are mock-only and must not update the public header without explicit approval.

## Next Modules

After Marketing is finished and visually reviewed, continue module by module:

1. Accounting
2. Analytics
3. CMS
4. Media Studio later

Do not jump to backend binding before the admin mock workflows are reviewed.

## Hard Restrictions

- No unrelated rewrites.
- No homepage redesign.
- No backend, API, database, or Supabase work unless explicitly approved.
- No public website integration from Marketing unless explicitly approved.
- No whole-repo scanning by default.
- Read only relevant files per task.
- Identify exact files before editing.
- Keep patches minimal and scoped.
- Preserve bilingual EN/AR and RTL/LTR behavior.
- Preserve premium dark Line Coffee visual direction.

## Notes For Future AI Sessions

- `README.md` is a project entry point, not the detailed source of truth.
- `CLAUDE.md` contains a large historical change log. Use it for history, not current decisions when it conflicts with this file.
- `LINE_COFFEE_V3_PROJECT_LOG.md` is still the work timeline and must be appended after completed work sessions.
- Older planning docs may be historical and may describe phases that are already complete.
- `docs/AI_HANDOFF_MARKETING.md` exists as a Marketing-specific handoff. Use it only after this file and only for Marketing tasks.

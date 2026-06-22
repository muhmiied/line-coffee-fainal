# Line Coffee V3 — AI Handoff

## Purpose
This file is for a new Claude Code session/account to continue the current interrupted work without re-reading or re-auditing the whole project.

## Project
Line Coffee V3 Admin Dashboard.

Current phase: Admin Dashboard mock UI phase.

Everything is still mock-only:
- No backend
- No Supabase
- No APIs
- No persistence
- No public website integration unless explicitly approved

GitHub repo:
`https://github.com/muhmiied/line-coffee-fainal.git`

## Critical Rule
Do not scan or rewrite the whole repository.
Read this file first, then only read the exact files listed under the current task.

## Approved / Completed Mock Modules
The following admin modules are considered approved mock phases unless the user asks for changes:
- Admin shell / layout
- Main Dashboard
- Orders
- Products
- Make Your Espresso
- Make Your Flavor
- Inventory
- Customers

## Current In-Progress Module
Marketing & Promotions.

The previous Claude session stopped because the session limit was reached while writing `src/app/admin/marketing/page.tsx`.

## User-Approved Marketing Restructure
The user rejected the previous Marketing UX because it was technically organized but not aligned with the real business workflow.

### Old structure to remove
- Offers
- Promo Codes
- Customer Targeting
- Website Banners
- Performance

### New approved structure
Only 4 tabs:
1. Offers
2. Promo Codes
3. Announcement Bar
4. Performance

Remove:
- Customer Targeting tab
- Website Banners tab as broad banner management
- Hero banner management
- Section banner management
- Scheduled / Expired as primary filters
- Visible Per Customer Limit field
- Generic unstructured New Offer form

Marketing must not manage Media Studio visual areas. Marketing controls offers, promo codes, header announcement bar messages, and performance only.

## Business Workflow To Support
Admin should be able to:

1. Create an Offer or Promo Code
2. Choose rules and audience inside the builder
3. Create or be reminded to create an Announcement Bar message
4. See the item in Offers or Promo Codes
5. Pause / Activate / Delete / Archive it
6. Later see Performance
7. Open usage details and see which customers/orders used it

## Allowed Files For Current Task
Only work on Marketing-related files:
- `src/lib/mock-data/admin/marketing-mock.ts`
- `src/app/admin/marketing/page.tsx`
- `src/components/admin/marketing/CustomerPickerModal.tsx`
- Other small Marketing-only component files if genuinely needed

## Do Not Touch
Do not edit:
- Dashboard
- Orders
- Products
- Inventory
- Customers
- Make Your Espresso
- Make Your Flavor
- Accounting
- Analytics
- CMS
- Media Studio
- Public website
- Auth
- Admin layout
- `globals.css`
- App layout

## What The Previous Claude Session Successfully Wrote
The previous session completed these files before stopping:

### 1. `src/lib/mock-data/admin/marketing-mock.ts`
This file was rewritten with the new Marketing data model.

It includes:
- `OfferType = "free-shipping" | "percentage" | "fixed" | "gift" | "first-order"`
- `OfferStatus = "Active" | "Paused" | "Archived"`
- `AudienceType = "all" | "vip" | "repeat" | "new" | "inactive" | "at-risk" | "wholesale-potential" | "specific"`
- `Offer`
- `PromoCode`
- `AnnouncementMessage`
- `UsageRecord`
- `OFFERS`
- `PROMO_CODES`
- `ANNOUNCEMENT_MESSAGES`
- `USAGE_RECORDS`
- `MARKETING_SUMMARY`

Important data decisions:
- `offer-002` is active and intentionally has no `announcementId` to trigger a missing announcement warning.
- `pc-002` is active and intentionally has no `announcementId` to trigger a missing announcement warning.
- Campaign revenue is split into:
  - `originalRevenue`
  - `discountGiven`
  - `paidRevenue`
- `UsageRecord` stores customer/order usage details.

### 2. `src/components/admin/marketing/CustomerPickerModal.tsx`
This file was created.

It supports two modes:
- `select`: select customers for targeted offers/promo codes
- `send`: show WhatsApp and Email actions for sending promo codes to individual customers

It imports:
- `ADMIN_CUSTOMERS`
- `getSegments`
from `src/lib/mock-data/admin/customers-mock.ts`.

It provides:
- search by name / phone / email
- filter by all / registered / guest
- segment chips
- WhatsApp button
- Email button when email exists
- selected customer IDs returned via `onConfirm`

## What Failed / Interrupted
Claude started writing:
`src/app/admin/marketing/page.tsx`

The write failed mid-file because the output was too long and the Claude session limit was reached.

The incomplete attempted page contained:
- shared atoms such as `SBadge`, `TypeBadge`, `AudBadge`, `FInput`, `FSelect`
- `OfferBuilderModal`
- `OfferDetailDrawer`
- `PromoBuilderModal`
- `PromoDetailDrawer`
- `AnnMessageModal`
- `UsageDetailsDrawer`
- `OffersTab`
- `PromoCodesTab`
- `AnnouncementBarTab`
- `PerformanceTab`
- The file stopped around the Performance table implementation.

## Required Next Task For New Claude
Continue by completing/replacing `src/app/admin/marketing/page.tsx` only, using the already-created `marketing-mock.ts` and `CustomerPickerModal.tsx`.

Important: first inspect whether `src/app/admin/marketing/page.tsx` is partial/corrupt from the failed write. If it is incomplete, replace the whole file cleanly. Do not try to patch a broken partial file.

## Required `page.tsx` Features

### Global Top Area
Keep 6 KPI cards:
1. Active Offers
2. Active Promo Codes
3. Total Usage
4. Discount Given
5. Campaign Revenue / Paid Revenue
6. Missing Announcements

If active offers or active promo codes do not have announcement messages, show a warning/banner:
`X active campaigns have no announcement message. Customers may not notice them.`

Include a `Fix Now` button. It should switch the active tab to `Announcement Bar`.

### Tab 1 — Offers
Offers are automatic/general campaigns.

Examples:
- Free shipping above 1000 EGP
- 10% discount on first order
- 50 EGP off for new customers
- Gift with order above 1500 EGP

Filters:
- Active
- Paused
- Archived may be hidden under All/Archive if needed

Do not use Scheduled/Expired as main filters.

Each offer must show:
- title EN/AR
- offer type
- condition/rules
- target audience
- start/end dates
- status
- announcement status: Has announcement / No announcement
- used count
- orders generated
- original value before discount
- discount given
- paid revenue after discount
- actions

Actions:
- View details
- Edit if implemented simply
- Pause / Activate
- Delete if unused
- Archive if used
- Create Announcement

### Offer Builder
Replace generic New Offer with guided builder.

Step/type choices:
1. Free Shipping
2. Percentage Discount
3. Fixed Amount Discount
4. Gift With Order
5. First Order Offer

Fields change based on offer type.

Target audience must be inside builder:
- All Customers
- VIP
- Repeat
- New
- Inactive
- At Risk
- Wholesale Potential
- Specific Customers

If Specific Customers is selected, open `CustomerPickerModal` in `select` mode.

New offer must be added to local page state and appear immediately.

### Tab 2 — Promo Codes
Promo Codes are manual checkout codes.

Each row must show:
- code
- discount type
- value
- minimum order
- usage rule: unlimited or limited total uses
- used/max uses when applicable
- target audience
- dates
- status
- announcement status
- original value before discount
- discount given
- paid revenue after discount
- actions

Actions:
- Copy code
- View details
- Pause / Activate
- Delete if unused
- Archive if used
- Send to Customers
- Create Announcement

### Promo Code Builder
Fields:
- promo code word
- discount type: Percentage / Fixed amount
- value
- minimum order
- usage rule: Unlimited until paused / Limited total uses
- max uses if limited
- start date
- end date
- target audience
- status

Do not show `Per Customer Limit` in this version.

If Specific Customers is selected, open `CustomerPickerModal` in `select` mode.

For Send to Customers, open `CustomerPickerModal` in `send` mode with WhatsApp/email links.

New promo code must be added to local page state and appear immediately.

### Tab 3 — Announcement Bar
This replaces Website Banners.

Purpose: control only the small rotating announcement bar above the public website header.

Do not manage:
- Hero banners
- Section banners
- Page banners
- Visual layout
- Media Studio areas

Announcement messages can be:
- linked to an offer
- linked to a promo code
- standalone custom message

Each message has:
- internal title
- text EN
- text AR
- active boolean
- start date
- end date
- optional link URL
- related offer ID optional
- related promo code ID optional
- priority/order

UI must include:
- Active messages
- Paused messages
- Missing Announcement Warnings
- Add Custom Message
- Create Message from Offer/Promo
- Mock preview of rotation if simple

If active offer/code has no announcement, show warning with `Create Message` button.

Clicking `Create Message` opens form prefilled with linked offer/promo and suggested EN/AR copy.

Saving a message must:
- add the message to local state
- link the new message to the related offer/promo through local overrides
- remove the missing warning

Do not edit PublicHeader now.

### Tab 4 — Performance
Two views:
- Offers Performance
- Promo Codes Performance

Each row should show:
- name/code
- status
- used count
- orders count
- original order value before discount
- discount given
- paid revenue after discount
- average before discount
- average after discount
- best segment
- action to open usage details

Do not show only revenue/discount. The user needs before-discount, discount, and after-discount clearly.

### Usage Details Drawer / Popup
Clicking any offer or promo code in Performance must open usage details.

Show:
- campaign name/code
- used count
- original total
- discount total
- paid total
- table of customers/orders who used it:
  - customer name
  - phone / WhatsApp
  - customer type
  - order ID
  - order date
  - original total
  - discount amount
  - final paid amount
  - order status
  - WhatsApp button

Use `USAGE_RECORDS` from `marketing-mock.ts`.

No Orders or Customers module changes.

## Delete / Archive Rules
For Offers and Promo Codes:
- If `usedCount === 0`, allow Delete.
- If `usedCount > 0`, do not hard-delete. Use Archive.
- Archived items should not appear in Active/Paused by default.
- Archived items can still appear in Performance history.

Local mock behavior:
- Delete can remove locally added unused items, or hide base mock items through local override.
- Archive sets status to `Archived`.

## Local State Requirement
New Offer, New Promo Code, and New Announcement Message must add to local page state immediately.

Do not only show success flash.

Expected:
- Create Offer -> appears immediately in Offers tab
- Create Promo Code -> appears immediately in Promo Codes tab
- Create Announcement -> appears immediately in Announcement Bar tab
- KPI cards update
- filters include local items
- performance can show new items with zero usage

Lost on refresh is OK.

## Design / Style Constraints
Keep the premium dark Line Coffee admin style already used across the dashboard.

Avoid:
- generic CRM feel
- ERP-heavy interface
- public site visual editing
- Media Studio responsibilities
- unrelated rewrites

Use existing classes and Tailwind style patterns from current admin pages. Do not edit `globals.css`.

## Accessibility / Lint Rules
Important project patterns:
- all non-submit buttons must have `type="button"`
- `aria-pressed` and `aria-expanded` must be string ternaries: `"true"` / `"false"`
- do not use boolean expressions in `aria-hidden`
- all sub-components should be defined at module level, not inside the main component
- avoid React nested component lint issues
- keep date logic stable/mock-friendly

## Verification Required
After implementation run:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Manual checks:
- Only 4 tabs exist: Offers, Promo Codes, Announcement Bar, Performance
- Customer Targeting tab removed
- Website Banners tab replaced by Announcement Bar
- New Offer builder changes fields based on offer type
- New Promo Code has no visible Per Customer Limit
- Specific Customers opens CustomerPickerModal
- WhatsApp links work with prepared messages
- Add Offer adds local item immediately
- Add Promo Code adds local item immediately
- Add Announcement Message adds local item immediately
- Active offers/codes without announcement show warning
- Create Message from warning pre-fills message
- Performance shows original / discount / paid values
- Usage details opens and shows customer/order rows
- Pause/Activate works
- Delete or Archive works based on usage
- No unrelated modules changed

## Recommended First Prompt For New Claude Session
Read `docs/ai/AI_HANDOFF_MARKETING.md` first. Then inspect only:
- `src/lib/mock-data/admin/marketing-mock.ts`
- `src/components/admin/marketing/CustomerPickerModal.tsx`
- `src/app/admin/marketing/page.tsx`

If `page.tsx` is incomplete from the previous failed write, replace the whole file cleanly.

Continue the Marketing & Promotions restructure only. Do not touch unrelated modules.

## After Completion
Update this file with:
- final files changed
- what was implemented
- verification results
- what remains mock-only

Then stop. Do not proceed to Accounting until the user visually reviews Marketing.

-- =====================================================================
-- Migration:  20260626130000_seed_best_sellers_featured
-- Project:    Line Coffee V3
-- Runs after: 20260626120000_add_new_until_to_products
-- =====================================================================
--
-- PURPOSE
--   Mark a curated set of products as best_seller and/or featured so that:
--     1. The homepage BestSellersSection (now Supabase-driven, not hardcoded)
--        has enough data to test both the grid layout (≤4 products) and the
--        marquee layout (5+ products).
--     2. The Featured badge is testable on the admin Product Drawer and
--        public product cards.
--
-- SEED SELECTION
--   Best Sellers (6 products across 4 categories):
--     - turkish-silk      (Turkish Blends)
--     - high-mood         (Turkish Blends — also Featured)
--     - heavy-crema       (Espresso Blends — also Featured)
--     - black-label       (Espresso Blends)
--     - classic-line      (Easy Coffee)
--     - original-cappuccino (Cappuccino)
--
--   Featured (2 of the above):
--     - high-mood         (premium Turkish, complex aroma)
--     - heavy-crema       (premium Espresso, rich crema)
--
-- STRATEGY
--   Targeted per-product UPDATE statements.
--   Only best_seller and featured are touched; all other columns are left
--   exactly as seeded by 20260625_catalog_seed.sql.
--
--   On conflict: these slugs must already exist from the catalog seed.
--   If a slug is missing (e.g. seed not applied yet) the UPDATE is a no-op.
--
-- THIS FILE IS AUTHORED ONLY. It is NOT applied here. No database/Supabase
-- commands are run as part of producing this file. Apply with your normal
-- migration workflow (e.g. supabase db push) before manual testing.
-- =====================================================================


-- ─── Best Sellers ─────────────────────────────────────────────────────────────

update public.products set best_seller = true where slug = 'turkish-silk';
update public.products set best_seller = true where slug = 'high-mood';
update public.products set best_seller = true where slug = 'heavy-crema';
update public.products set best_seller = true where slug = 'black-label';
update public.products set best_seller = true where slug = 'classic-line';
update public.products set best_seller = true where slug = 'original-cappuccino';


-- ─── Featured ─────────────────────────────────────────────────────────────────

update public.products set featured = true where slug = 'high-mood';
update public.products set featured = true where slug = 'heavy-crema';

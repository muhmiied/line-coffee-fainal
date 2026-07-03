// Admin dashboard mock data — REMOVED (Phase 14A).
//
// The Admin main dashboard now reads 100% real Supabase data through
// `src/lib/admin/admin-dashboard.ts`. All fabricated KPI/chart/activity/
// best-seller/visitor constants that used to live here have been deleted.
//
// The only remaining export is the legacy capitalized `OrderStatus` union,
// which the (separate, unrelated) mock orders module `orders-mock.ts` still
// imports as a type. It is kept here to avoid touching that out-of-scope file.

export type OrderStatus =
  | "New"
  | "Preparing"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Returned";

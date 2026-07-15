// Shared numeric helpers for the real admin dashboard and analytics data
// layers. Phase 2: day/week/month bucketing and row scanning moved into SQL
// (see migration 20260713140000_phase2_reporting_aggregates.sql), so this
// file now only holds the tiny formatting helpers still applied client-side
// to the RPCs' pre-aggregated numbers.

/** Percentage change (current vs previous), rounded to 0.1; null when no base. */
export function trendPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Round to 2 decimal places (money/percentage display precision). */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Shared numeric/date helpers + label constants for the real admin dashboard
// and analytics data layers. These were previously duplicated byte-for-byte in
// admin-dashboard.ts and admin-analytics.ts. (Per-module bits that genuinely
// differ — devWarn/readError tags, error classes, scan limits — stay local.)

export const DAY = 86_400_000;

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Coerce a numeric-or-string amount to a finite number (else 0). */
export function money(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Parse a timestamp string to epoch ms (0 when missing/invalid). */
export function ts(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Percentage change (current vs previous), rounded to 0.1; null when no base. */
export function trendPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Read the (possibly array-embedded) related order's status from an item row. */
export function firstOrderStatus(
  orders: { status: string } | { status: string }[] | null,
): string | null {
  if (!orders) return null;
  if (Array.isArray(orders)) return orders[0]?.status ?? null;
  return orders.status ?? null;
}

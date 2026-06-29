// Line Coffee V3 — Delivery zone resolution (Phase 1)
//
// Locked Decisions 10 + 11 / Master Execution Plan §6.5.
//
// IMPORTANT: this is a DISPLAY mirror of the authoritative SQL function
// `public.resolve_delivery_fee(governorate, area)` in migration
// 20260629120000_phase1_delivery_deduction_payment.sql. The checkout UI uses it
// to show the customer the right fee before placing the order, but the server
// ALWAYS recomputes the fee inside `create_checkout_order` — the client value is
// never trusted. If you change one, change BOTH to keep them identical.
//
// Resolution order (first match wins; more-specific zone beats the general
// governorate, because Shorouk/Madinaty/Haram/October/Zayed sit inside the
// Cairo/Giza governorates):
//   1. Shorouk / Madinaty               -> 30 EGP
//   2. Haram / 6 October / Sheikh Zayed -> 100 EGP  (checked before #3)
//   3. remaining Cairo / Giza           -> 50 EGP
//   4. all other governorates           -> 0 EGP + courier note

export type DeliveryZoneKey =
  | "shorouk_madinaty"
  | "haram_october_zayed"
  | "cairo_giza"
  | "governorate_courier";

export type DeliveryResolution = {
  fee: number;
  zone: DeliveryZoneKey;
  /** Courier note for out-of-Cairo/Giza orders; null otherwise. */
  note: string | null;
};

const COURIER_NOTE =
  "Outside Cairo/Giza: the customer pays the courier directly on delivery. The delivery fee is outside Line Coffee revenue unless an admin overrides it for this order.";

function includesAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

/**
 * Resolve the delivery fee + zone for a governorate/area pair.
 * Mirrors the server-side `resolve_delivery_fee` SQL exactly.
 */
export function resolveDeliveryFee(
  governorate: string | null | undefined,
  area: string | null | undefined,
): DeliveryResolution {
  const gov = (governorate ?? "").trim().toLowerCase();
  const ar = (area ?? "").trim().toLowerCase();
  const isCairoGiza =
    gov === "cairo" || gov === "giza" || gov === "القاهرة" || gov === "الجيزة";

  // 1. Shorouk / Madinaty -> 30
  if (includesAny(ar, ["shorouk", "madinaty", "الشروق", "مدينتي"])) {
    return { fee: 30, zone: "shorouk_madinaty", note: null };
  }

  // 2. Haram / 6 October / Sheikh Zayed -> 100  (before the general Cairo/Giza)
  if (
    includesAny(ar, [
      "haram",
      "الهرم",
      "october",
      "اكتوبر",
      "أكتوبر",
      "sheikh zayed",
      "زايد",
    ])
  ) {
    return { fee: 100, zone: "haram_october_zayed", note: null };
  }

  // 3. remaining Cairo / Giza -> 50
  if (isCairoGiza) {
    return { fee: 50, zone: "cairo_giza", note: null };
  }

  // 4. all other governorates -> 0 + courier note
  return { fee: 0, zone: "governorate_courier", note: COURIER_NOTE };
}

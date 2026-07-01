// Line Coffee V3 - Launch-Core Marketing Contract
// marketing.ts - canonical promo code, offer, and announcement bar contracts.
//
// Phase 7 makes the promo subset live. Offers and announcement-bar contracts
// remain forward-looking.

import type {
  ID,
  ISODateTime,
  ImageAssetRef,
  LocalizedValue,
  Money,
} from "@/lib/types/common";

export type DiscountType = "percentage" | "fixed_amount" | "free_shipping";

export type AudienceType =
  | "all"
  | "new_customers"
  | "returning_customers"
  | "specific_customers";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "expired"
  | "archived";

export type PromoUsageRule =
  | "single_use"
  | "multi_use"
  | "once_per_customer";

export type PromoCodeDiscountType = "percentage" | "fixed_amount";
export type PromoCodeStatus = "active" | "inactive";

// Live Phase-7 promo-code contract. Usage count is derived from
// `promo_redemptions`; checkout validation and discount calculation are
// server-side only.
export interface PromoCode {
  id: ID;
  code: string;
  status: PromoCodeStatus;
  discountType: PromoCodeDiscountType;
  value: Money;
  minimumSubtotal?: Money;
  maxDiscount?: Money;
  startsAt?: ISODateTime;
  endsAt?: ISODateTime;
  usageLimit?: number;
  perCustomerLimit?: number;
  usedCount: number;
  notes?: string;
  createdAt: ISODateTime;
  updatedAt?: ISODateTime;
}

export type OfferType =
  | "bundle"
  | "discount"
  | "free_shipping"
  | "seasonal"
  | "custom";

// Business offer contract. Product/category references stay as IDs so this
// type does not couple Marketing to product/category runtime shapes yet.
// Supabase mapping: `offers` table.
export interface Offer {
  id: ID;
  title: LocalizedValue;
  description?: LocalizedValue;
  type: OfferType;
  discountType?: DiscountType;
  value?: Money | number;
  productIds?: ID[];
  categoryIds?: ID[];
  minOrderAmount?: Money;
  audience: AudienceType;
  status: CampaignStatus;
  active: boolean;
  startsAt?: ISODateTime;
  endsAt?: ISODateTime;
  image?: ImageAssetRef;
  createdAt: ISODateTime;
  updatedAt?: ISODateTime;
}

export type AnnouncementAnimation = "static" | "slide" | "fade" | "marquee";

// Small rotating bar above the public website header. This must not own hero,
// section, page banner, or Media Studio content.
// Supabase mapping: `announcement_bar_items` table.
export interface AnnouncementBarItem {
  id: ID;
  internalTitle: string;
  text: LocalizedValue;
  ctaLabel?: LocalizedValue;
  ctaUrl?: string;
  linkedPromoCodeId?: ID;
  linkedOfferId?: ID;
  priority: number;
  active: boolean;
  status: CampaignStatus;
  animation: AnnouncementAnimation;
  durationSeconds?: number;
  startsAt?: ISODateTime;
  endsAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt?: ISODateTime;
}

export type PromoValidationStatus =
  | "valid"
  | "invalid"
  | "not_started"
  | "expired"
  | "inactive"
  | "usage_limit_reached"
  | "minimum_not_met"
  | "customer_limit_reached";

// Safe, cost-free result from `validate_promo_code`. The final checkout always
// recalculates against DB-authoritative product prices.
export interface PromoValidationResult {
  status: PromoValidationStatus;
  code: string | null;
  discountTotal: Money;
  subtotal: Money;
  discountedSubtotal: Money;
  minimumSubtotal?: Money;
  message: string;
}

// ---------------------------------------------------------------------------
// Promo redemption tracking (Phase 3E)
// ---------------------------------------------------------------------------
//
// Closes the redemption gap from the Supabase Schema + Real Data Transition
// Plan (§B gap, §E table 23): PromoCode.usedCount is only an aggregate. A
// per-use record is required to enforce maxUses / once_per_customer and to feed
// the Marketing → Performance tab (original value, discount given, paid revenue,
// usage by customer/order). Promo VALIDATION remains future server-side only;
// this is just the audit record of an accepted redemption.

// One recorded use of a promo code against an order. `codeSnapshot` freezes the
// code string at redemption time so history survives later code edits/renames.
// Supabase mapping: `promo_redemptions` table.
export interface PromoRedemption {
  id: ID;
  promoCodeId: ID;
  orderId: ID;
  customerId?: ID;
  codeSnapshot: string;
  discountAmount: Money;
  originalOrderValue?: Money;
  redeemedAt: ISODateTime;
}

// Aggregated redemption stats for one promo code (DERIVED from PromoRedemption
// rows). Mirrors PromoCode.usedCount but adds discount/value totals for the
// Marketing Performance tab.
// Supabase mapping: SQL view/aggregation over `promo_redemptions`.
export interface PromoRedemptionSummary {
  promoCodeId: ID;
  usedCount: number;
  totalDiscountAmount: Money;
  totalOrderValue?: Money;
}

// Line Coffee V3 - Launch-Core Marketing Contract
// marketing.ts - canonical promo code, offer, and announcement bar contracts.
//
// Phase 3D. Type-only. Additive. Imported by nothing yet.
//
// These contracts prepare the future Marketing Admin, checkout promo validation,
// and public announcement bar data shape without implementing validation logic,
// connecting checkout, or wiring Marketing Admin to the public header.

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

// Future server-side discount code contract. Promo validation must happen on
// the backend later; this file intentionally provides no runtime validator.
// Supabase mapping: `promo_codes` table.
export interface PromoCode {
  id: ID;
  code: string;
  title: LocalizedValue;
  description?: LocalizedValue;
  discountType: DiscountType;
  value: Money | number;
  minOrderAmount?: Money;
  maxDiscountAmount?: Money;
  usageRule: PromoUsageRule;
  maxUses?: number;
  usedCount: number;
  audience: AudienceType;
  specificCustomerIds?: ID[];
  startDate?: ISODateTime;
  endDate?: ISODateTime;
  status: CampaignStatus;
  active: boolean;
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
  | "expired"
  | "inactive"
  | "usage_limit_reached"
  | "min_order_not_met"
  | "not_allowed_for_customer";

// Result shape for future server-only checkout promo validation.
export interface PromoValidationResult {
  status: PromoValidationStatus;
  promoCode?: PromoCode;
  discountAmount: Money;
  freeShipping: boolean;
  message: LocalizedValue;
}

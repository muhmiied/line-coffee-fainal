"use client";

import { supabase } from "@/lib/supabase/client";
import type {
  PromoCode,
  PromoCodeDiscountType,
  PromoCodeStatus,
} from "@/lib/types/marketing";

type PromoCodeRow = {
  id: string;
  code: string;
  status: PromoCodeStatus;
  discount_type: PromoCodeDiscountType;
  value: number | string;
  minimum_subtotal: number | string | null;
  max_discount: number | string | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  promo_redemptions?: Array<{ count: number }> | null;
};

export type PromoCodeInput = {
  id?: string;
  code: string;
  status: PromoCodeStatus;
  discountType: PromoCodeDiscountType;
  value: number;
  minimumSubtotal?: number;
  maxDiscount?: number;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  perCustomerLimit?: number;
  notes?: string;
};

export class AdminMarketingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminMarketingError";
  }
}

function money(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapPromo(row: PromoCodeRow, usedCount = 0): PromoCode {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    discountType: row.discount_type,
    value: money(row.value),
    minimumSubtotal:
      row.minimum_subtotal == null ? undefined : money(row.minimum_subtotal),
    maxDiscount: row.max_discount == null ? undefined : money(row.max_discount),
    startsAt: row.starts_at ?? undefined,
    endsAt: row.ends_at ?? undefined,
    usageLimit: row.usage_limit ?? undefined,
    perCustomerLimit: row.per_customer_limit ?? undefined,
    usedCount,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export async function listPromoCodes(): Promise<PromoCode[]> {
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*, promo_redemptions(count)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new AdminMarketingError("Could not load promo codes.");
  }

  return ((data ?? []) as PromoCodeRow[]).map((row) =>
    mapPromo(row, row.promo_redemptions?.[0]?.count ?? 0),
  );
}

export async function savePromoCode(input: PromoCodeInput): Promise<PromoCode> {
  const { data, error } = await supabase.rpc("upsert_promo_code", {
    p_payload: {
      id: input.id ?? null,
      code: input.code,
      status: input.status,
      discount_type: input.discountType,
      value: input.value,
      minimum_subtotal: input.minimumSubtotal ?? null,
      max_discount: input.maxDiscount ?? null,
      starts_at: input.startsAt ?? null,
      ends_at: input.endsAt ?? null,
      usage_limit: input.usageLimit ?? null,
      per_customer_limit: input.perCustomerLimit ?? null,
      notes: input.notes ?? null,
    },
  });

  if (error) throw new AdminMarketingError("Could not save the promo code.");
  return mapPromo(data as PromoCodeRow);
}

export async function deactivatePromoCode(id: string): Promise<PromoCode> {
  const { data, error } = await supabase.rpc("deactivate_promo_code", {
    p_promo_code_id: id,
  });

  if (error) throw new AdminMarketingError("Could not deactivate the promo code.");
  return mapPromo(data as PromoCodeRow);
}

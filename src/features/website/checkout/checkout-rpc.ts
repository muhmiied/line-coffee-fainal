import type { CartItem } from "@/lib/context/cart";

// Builds the exact item shape `create_checkout_order` expects per kind. The
// server always re-validates and re-prices — this only forwards the customer's
// selection (product+size, or the structured builder payload). Returns null
// when a cart item is missing the data it needs (e.g. a builder item added
// before this contract existed), so the caller can ask the customer to
// remove/re-add it rather than submit a malformed line.
export type CheckoutRpcItem =
  | { kind: "product"; slug: string; size: string; quantity: number }
  | {
      kind: "espresso-blend";
      size: string;
      quantity: number;
      beans: Array<{ bean_key: string; percent: number }>;
    }
  | {
      kind: "flavor-mix";
      size: string;
      quantity: number;
      base_key: string;
      flavor_keys: string[];
    };

export function buildCheckoutItem(item: CartItem): CheckoutRpcItem | null {
  if (item.kind === "product") {
    const size = item.detail.en;
    if (!item.slug || !["250g", "500g", "1kg"].includes(size)) return null;
    return { kind: "product", slug: item.slug, size, quantity: item.qty };
  }

  if (item.kind === "espresso-blend") {
    const data = item.customData;
    if (!data || data.kind !== "espresso-blend" || data.beans.length === 0) return null;
    return {
      kind: "espresso-blend",
      size: data.packageSize,
      quantity: item.qty,
      beans: data.beans.map((bean) => ({ bean_key: bean.beanKey, percent: bean.percent })),
    };
  }

  if (item.kind === "flavor-mix") {
    const data = item.customData;
    if (!data || data.kind !== "flavor-mix" || data.flavorKeys.length === 0) return null;
    return {
      kind: "flavor-mix",
      size: data.packageSize,
      quantity: item.qty,
      base_key: data.baseKey,
      flavor_keys: data.flavorKeys,
    };
  }

  return null;
}

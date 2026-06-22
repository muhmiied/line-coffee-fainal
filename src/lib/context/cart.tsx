"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CartItem = {
  id: string;
  kind: "product" | "espresso-blend" | "flavor-mix";
  name: { en: string; ar: string };
  detail: { en: string; ar: string };
  pricePerUnit: number;
  qty: number;
  slug?: string;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "id"> & { id?: string }) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartCtx | null>(null);

let _seq = 0;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useLocalStorage<CartItem[]>("line-cart-v1", []);
  const [isOpen, setIsOpen] = useState(false);

  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
  const total = useMemo(
    () => items.reduce((s, i) => s + i.pricePerUnit * i.qty, 0),
    [items],
  );

  const addItem = useCallback(
    (incoming: Omit<CartItem, "id"> & { id?: string }) => {
      // Products use a deterministic ID so same product+size merges.
      // Studio items get a unique ID so each "add" is a separate entry.
      const id =
        incoming.id ??
        (incoming.kind === "product"
          ? `product-${incoming.slug ?? incoming.name.en}-${incoming.detail.en}`
          : `studio-${incoming.kind}-${++_seq}`);

      setItems((prev) => {
        const existing = prev.find((i) => i.id === id);
        if (existing) {
          return prev.map((i) =>
            i.id === id ? { ...i, qty: i.qty + (incoming.qty ?? 1) } : i,
          );
        }
        return [...prev, { ...incoming, id, qty: incoming.qty ?? 1 }];
      });
      setIsOpen(true);
    },
    [setItems],
  );

  const removeItem = useCallback(
    (id: string) => setItems((prev) => prev.filter((i) => i.id !== id)),
    [setItems],
  );

  const updateQty = useCallback(
    (id: string, delta: number) =>
      setItems((prev) =>
        prev
          .map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
          .filter((i) => i.qty > 0),
      ),
    [setItems],
  );

  const clearCart  = useCallback(() => setItems([]), [setItems]);
  const openCart   = useCallback(() => setIsOpen(true), []);
  const closeCart  = useCallback(() => setIsOpen(false), []);

  const ctx = useMemo<CartCtx>(
    () => ({
      items, count, total, isOpen,
      addItem, removeItem, updateQty, clearCart, openCart, closeCart,
    }),
    [items, count, total, isOpen, addItem, removeItem, updateQty, clearCart, openCart, closeCart],
  );

  return <CartContext.Provider value={ctx}>{children}</CartContext.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

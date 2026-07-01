"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { getOrCreateGuestId } from "@/lib/checkout";
import { AUTH_OWNER_CHANGED_EVENT } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase/client";
import type {
  EspressoBuilderPayload,
  FlavorBuilderPayload,
} from "@/lib/types/builders";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CartItem = {
  id: string;
  kind: "product" | "espresso-blend" | "flavor-mix";
  name: { en: string; ar: string };
  detail: { en: string; ar: string };
  pricePerUnit: number;
  qty: number;
  slug?: string;
  // Structured builder payload (Phase 8/9). Present for "espresso-blend" /
  // "flavor-mix" items; the checkout page forwards it to the
  // create_checkout_order RPC for server-side validation/pricing — the
  // server never trusts pricePerUnit for these kinds. Absent for "product".
  customData?: EspressoBuilderPayload | FlavorBuilderPayload;
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
const LEGACY_GLOBAL_KEY = "line-cart-v1";
const OWNER_KEY_PREFIX = "line-cart-v1:";
const EMPTY_ITEMS: CartItem[] = [];

type CartStore = {
  ownerKey: string | null;
  items: CartItem[];
  isOpen: boolean;
};

const SERVER_SNAPSHOT: CartStore = {
  ownerKey: null,
  items: EMPTY_ITEMS,
  isOpen: false,
};

let store: CartStore = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
let legacyKeyPurged = false;
let authWatcherStarted = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return store;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

function storageKey(ownerKey: string) {
  return `${OWNER_KEY_PREFIX}${ownerKey}`;
}

function isLocalizedValue(value: unknown): value is CartItem["name"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const localized = value as Record<string, unknown>;
  return typeof localized.en === "string" && typeof localized.ar === "string";
}

function isPackageSize(value: unknown): value is "250g" | "500g" | "1kg" {
  return value === "250g" || value === "500g" || value === "1kg";
}

function isEspressoBuilderPayload(value: unknown): value is EspressoBuilderPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<EspressoBuilderPayload>;
  return (
    payload.kind === "espresso-blend" &&
    isPackageSize(payload.packageSize) &&
    Array.isArray(payload.beans) &&
    payload.beans.length > 0 &&
    payload.beans.every(
      (bean) =>
        bean &&
        typeof bean === "object" &&
        typeof bean.beanKey === "string" &&
        typeof bean.percent === "number",
    )
  );
}

function isFlavorBuilderPayload(value: unknown): value is FlavorBuilderPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<FlavorBuilderPayload>;
  return (
    payload.kind === "flavor-mix" &&
    isPackageSize(payload.packageSize) &&
    typeof payload.baseKey === "string" &&
    Array.isArray(payload.flavorKeys) &&
    payload.flavorKeys.length > 0 &&
    payload.flavorKeys.every((key) => typeof key === "string")
  );
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.id === "string" &&
    ["product", "espresso-blend", "flavor-mix"].includes(item.kind ?? "") &&
    isLocalizedValue(item.name) &&
    isLocalizedValue(item.detail) &&
    typeof item.pricePerUnit === "number" &&
    Number.isFinite(item.pricePerUnit) &&
    item.pricePerUnit >= 0 &&
    typeof item.qty === "number" &&
    Number.isInteger(item.qty) &&
    item.qty > 0 &&
    (item.slug === undefined || typeof item.slug === "string") &&
    (item.customData === undefined ||
      isEspressoBuilderPayload(item.customData) ||
      isFlavorBuilderPayload(item.customData))
  );
}

function purgeLegacyGlobalKey() {
  if (legacyKeyPurged || typeof window === "undefined") return;
  legacyKeyPurged = true;
  try {
    // The pre-fix key was shared by every guest/account on the device. Never
    // import it into a scoped cart because its owner cannot be established.
    window.localStorage.removeItem(LEGACY_GLOBAL_KEY);
  } catch {
    // Ignore unavailable storage; the unsafe key is never read.
  }
}

function readOwnerCart(ownerKey: string): CartItem[] {
  try {
    const raw = window.localStorage.getItem(storageKey(ownerKey));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
  } catch {
    return [];
  }
}

function persistOwnerCart(ownerKey: string, items: CartItem[]) {
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(storageKey(ownerKey));
    } else {
      window.localStorage.setItem(storageKey(ownerKey), JSON.stringify(items));
    }
  } catch {
    // Keep the in-memory cart usable when storage is unavailable.
  }
}

function setOwner(ownerKey: string) {
  purgeLegacyGlobalKey();
  if (store.ownerKey === ownerKey) return;

  // Owner + items switch atomically. No previous-owner frame can render.
  store = {
    ownerKey,
    items: readOwnerCart(ownerKey),
    isOpen: false,
  };
  emit();
}

function applyAuthOwner(userId: string | null | undefined) {
  if (userId) {
    setOwner(`auth:${userId}`);
    return;
  }

  const guestId = getOrCreateGuestId();
  setOwner(`guest:${guestId}`);
}

function updateCart(updater: (items: CartItem[]) => CartItem[]) {
  const ownerKey = store.ownerKey;
  if (!ownerKey) return;
  const items = updater(store.items);
  store = { ...store, items };
  emit();
  persistOwnerCart(ownerKey, items);
}

function setCartOpen(isOpen: boolean) {
  if (store.isOpen === isOpen) return;
  store = { ...store, isOpen };
  emit();
}

function startOwnerWatcher() {
  if (authWatcherStarted || typeof window === "undefined") return;
  authWatcherStarted = true;
  purgeLegacyGlobalKey();

  let authEventSeen = false;
  supabase.auth.onAuthStateChange((_event, session) => {
    authEventSeen = true;
    applyAuthOwner(session?.user?.id);
  });

  // getSession reads the locally persisted session and avoids waiting on a
  // network user lookup before the cart can resolve its owner.
  void supabase.auth
    .getSession()
    .then(({ data }) => {
      if (!authEventSeen) applyAuthOwner(data.session?.user?.id);
    })
    .catch(() => {
      if (!authEventSeen) applyAuthOwner(null);
    });

  window.addEventListener(AUTH_OWNER_CHANGED_EVENT, (event) => {
    const detail = (event as CustomEvent<{ userId?: unknown }>).detail;
    applyAuthOwner(typeof detail?.userId === "string" ? detail.userId : null);
  });

  window.addEventListener("storage", (event) => {
    const ownerKey = store.ownerKey;
    if (!ownerKey) return;
    const currentKey = storageKey(ownerKey);
    if (event.key !== null && event.key !== currentKey) return;
    store = { ...store, items: readOwnerCart(ownerKey), isOpen: false };
    emit();
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    startOwnerWatcher();
  }, []);

  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const { items, isOpen } = snapshot;

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

      updateCart((prev) => {
        const existing = prev.find((i) => i.id === id);
        if (existing) {
          return prev.map((i) =>
            i.id === id ? { ...i, qty: i.qty + (incoming.qty ?? 1) } : i,
          );
        }
        return [...prev, { ...incoming, id, qty: incoming.qty ?? 1 }];
      });
      setCartOpen(true);
    },
    [],
  );

  const removeItem = useCallback(
    (id: string) => updateCart((prev) => prev.filter((i) => i.id !== id)),
    [],
  );

  const updateQty = useCallback(
    (id: string, delta: number) =>
      updateCart((prev) =>
        prev
          .map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
          .filter((i) => i.qty > 0),
      ),
    [],
  );

  const clearCart  = useCallback(() => updateCart(() => []), []);
  const openCart   = useCallback(() => setCartOpen(true), []);
  const closeCart  = useCallback(() => setCartOpen(false), []);

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

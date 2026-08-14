"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type CartContextValue = {
  quantities: Record<string, number>;
  setQuantity: (cartKey: string, quantity: number) => void;
  addItem: (productId: string, variantId?: string | null) => void;
  itemCount: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "shokakko_cart";
const MAX_QTY = 10;

/** Sprint 3.5 — a cart line's key is the bare productId for a plain
 * product (unchanged from before variants existed), or
 * `${productId}::${variantId}` once a variant is chosen — two different
 * variants of the same product are genuinely separate lines, so they
 * need separate keys/quantities. */
export function buildCartKey(productId: string, variantId?: string | null): string {
  return variantId ? `${productId}::${variantId}` : productId;
}

export function parseCartKey(key: string): { productId: string; variantId: string | null } {
  const separator = key.indexOf("::");
  if (separator === -1) return { productId: key, variantId: null };
  return { productId: key.slice(0, separator), variantId: key.slice(separator + 2) };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Client-only load, after mount, to avoid an SSR/client markup mismatch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // One-time hydration from localStorage after mount (deliberately
      // starts empty during SSR/first paint to avoid a hydration mismatch,
      // then syncs from the external store) — not a cascading-render risk.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setQuantities(JSON.parse(raw));
    } catch {
      // Corrupt/blocked storage — start empty, not fatal.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities));
    } catch {
      // Storage full/blocked — cart just won't survive a reload.
    }
  }, [quantities, hydrated]);

  const setQuantity = useCallback((cartKey: string, quantity: number) => {
    setQuantities((prev) => {
      const wasEmpty = !prev[cartKey];
      if (quantity <= 0) {
        if (!(cartKey in prev)) return prev;
        const next = { ...prev };
        delete next[cartKey];
        return next;
      }
      if (wasEmpty) setDrawerOpen(true); // auto-open on 0 -> N
      return { ...prev, [cartKey]: Math.min(MAX_QTY, quantity) };
    });
  }, []);

  const addItem = useCallback((productId: string, variantId?: string | null) => {
    const cartKey = buildCartKey(productId, variantId);
    setQuantities((prev) => {
      const current = prev[cartKey] ?? 0;
      if (current === 0) setDrawerOpen(true);
      return { ...prev, [cartKey]: Math.min(MAX_QTY, current + 1) };
    });
  }, []);

  const clearCart = useCallback(() => setQuantities({}), []);

  const itemCount = useMemo(
    () => Object.values(quantities).reduce((sum, q) => sum + q, 0),
    [quantities],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      quantities,
      setQuantity,
      addItem,
      itemCount,
      isDrawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      clearCart,
    }),
    [quantities, setQuantity, addItem, itemCount, isDrawerOpen, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

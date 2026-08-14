"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toggleWishlistItem } from "./actions";

type WishlistContextValue = {
  /** Called with no variant id (every pre-Sprint-3.5 caller), this means
   * "is any variant of this product, or the plain product itself,
   * wishlisted" — exactly what the card's heart icon and the "♡
   * Wishlist" grid filter need, so neither had to change. Pass a
   * variant id (only the Product Details page does) for an exact match. */
  has: (productId: string, variantId?: string | null) => boolean;
  toggle: (productId: string, variantId?: string | null) => void;
  ids: string[];
  count: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = "shokakko_wishlist";

/** Sprint 3.5 — same composite-key convention as the cart
 * (`${productId}::${variantId}`, or the bare productId when there's no
 * variant) so two different variants of the same product can both be
 * wishlisted at once. */
function buildWishlistKey(productId: string, variantId?: string | null): string {
  return variantId ? `${productId}::${variantId}` : productId;
}

/**
 * Two modes, decided once per request by the root layout (server-side,
 * from the shokakko_preorder_token cookie — see src/lib/wishlist.ts and
 * submitPreOrder):
 *
 * - **local** (`linkedToken` null): today's pre-migration behavior,
 *   unchanged — `ids` lives in `localStorage`.
 * - **linked** (`linkedToken` set): this browser has submitted a
 *   pre-order. `ids` starts from `initialLinkedIds` (fetched server-side,
 *   always fresh per request) and every `toggle()` writes straight to the
 *   database via the `toggleWishlistItem` Server Action instead of
 *   `localStorage`.
 *
 * Every consumer (`ProductCard`, `ProductDetailsView`, `WishlistDrawer`,
 * the wishlist filter, `SiteHeader`) only ever calls the public API below
 * — the mode switch is entirely internal, so none of them need to know
 * which mode is active.
 */
export function WishlistProvider({
  children,
  linkedToken,
  initialLinkedIds,
}: {
  children: React.ReactNode;
  linkedToken: string | null;
  initialLinkedIds: string[];
}) {
  const linked = linkedToken !== null;
  const [ids, setIds] = useState<string[]>(linked ? initialLinkedIds : []);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  // Linked mode already has real data from the server on first render —
  // only local mode needs the post-mount localStorage hydration step.
  const [hydrated, setHydrated] = useState(linked);

  useEffect(() => {
    if (linked) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // One-time hydration from localStorage after mount — see the
      // matching comment in CartContext.tsx.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setIds(JSON.parse(raw));
    } catch {
      // Corrupt/blocked storage — start empty, not fatal.
    }
    setHydrated(true);
  }, [linked]);

  useEffect(() => {
    if (linked || !hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Storage full/blocked — wishlist just won't survive a reload.
    }
  }, [ids, hydrated, linked]);

  const toggle = useCallback(
    (productId: string, variantId?: string | null) => {
      const key = buildWishlistKey(productId, variantId);
      const previousIds = ids;
      const nextIds = previousIds.includes(key)
        ? previousIds.filter((id) => id !== key)
        : [...previousIds, key];

      // Optimistic either way — instant UI regardless of mode.
      setIds(nextIds);

      if (linked && linkedToken) {
        toggleWishlistItem(linkedToken, productId, variantId ?? null).catch(() => {
          // Roll back to exactly what it was before this optimistic
          // update — rare (network blip), but otherwise the UI would
          // silently drift from what's actually saved.
          setIds(previousIds);
        });
      }
    },
    [ids, linked, linkedToken],
  );

  const has = useCallback(
    (productId: string, variantId?: string | null) => {
      if (variantId !== undefined && variantId !== null) {
        return ids.includes(buildWishlistKey(productId, variantId));
      }
      // No variant specified — "is anything for this product wishlisted"
      // (the plain product itself, or any of its variants).
      return ids.some((id) => id === productId || id.startsWith(`${productId}::`));
    },
    [ids],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      has,
      toggle,
      ids,
      count: ids.length,
      isDrawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
    }),
    [has, toggle, ids, isDrawerOpen],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}

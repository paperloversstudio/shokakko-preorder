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
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
  ids: string[];
  count: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = "shokakko_wishlist";

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
    (productId: string) => {
      const previousIds = ids;
      const nextIds = previousIds.includes(productId)
        ? previousIds.filter((id) => id !== productId)
        : [...previousIds, productId];

      // Optimistic either way — instant UI regardless of mode.
      setIds(nextIds);

      if (linked && linkedToken) {
        toggleWishlistItem(linkedToken, productId).catch(() => {
          // Roll back to exactly what it was before this optimistic
          // update — rare (network blip), but otherwise the UI would
          // silently drift from what's actually saved.
          setIds(previousIds);
        });
      }
    },
    [ids, linked, linkedToken],
  );

  const has = useCallback((productId: string) => ids.includes(productId), [ids]);

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

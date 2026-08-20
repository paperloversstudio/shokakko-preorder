"use client";

import { useEffect } from "react";
import { linkBrowserToOrder } from "./actions";

/** Mirrors src/components/cart/ClearCartOnMount.tsx's exact shape — a
 * mount-only Server Action side effect with nothing to render. Links
 * this browser's WishlistContext into linked mode against this order
 * (same cookie submitPreOrder already sets), so browsing anywhere else
 * on the site and tapping ♡ writes straight into this exact order's
 * wishlist — no new "add to wishlist" UI needed inside the portal
 * itself. See the Sprint 5 plan's "Decisions." */
export function LinkBrowserOnMount({ token }: { token: string }) {
  useEffect(() => {
    void linkBrowserToOrder(token);
    // Intentionally only on mount, once per token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

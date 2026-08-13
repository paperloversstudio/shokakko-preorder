"use client";

import { useEffect } from "react";
import { useCart } from "./CartContext";

/** Mounted only on the order confirmation page — the pre-order Server
 * Action redirects here on success, so this is the one place a completed
 * checkout is guaranteed to have actually happened; clearing the
 * localStorage-persisted cart here (rather than optimistically before
 * submission) means a failed/invalid submission never loses the
 * customer's cart. */
export function ClearCartOnMount() {
  const cart = useCart();

  useEffect(() => {
    cart.clearCart();
    // Intentionally only on mount — clearCart's identity is stable anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

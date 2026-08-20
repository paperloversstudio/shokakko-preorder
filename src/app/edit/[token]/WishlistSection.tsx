"use client";

import Link from "next/link";
import { useTransition } from "react";
import { formatPrice } from "@/lib/validations/product";
import { toggleWishlistItem } from "@/components/wishlist/actions";
import { moveWishlistItemToOrder } from "./actions";

export type PortalWishlistItem = {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  productBrand: string;
  variantLabel: string | null;
  priceCents: number | null;
  imageUrl: string | null;
  productStatus: "active" | "draft" | "sold_out";
};

/** Remove reuses toggleWishlistItem (components/wishlist/actions.ts)
 * directly, same Server Action WishlistContext's linked mode already
 * calls — no new action needed. Move to Pre-order is the one genuinely
 * new action (moveWishlistItemToOrder). "Add Products" needs no UI here
 * at all — see LinkBrowserOnMount.tsx and the "Browse more products"
 * link below. */
export function WishlistSection({ token, items }: { token: string; items: PortalWishlistItem[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display font-bold">Wishlist</h2>
        <Link href="/" className="text-sm font-semibold text-blue hover:underline">
          Browse more products →
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">
          Nothing saved yet — tap ♡ on any product while browsing to add it here.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-mint/30">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg">🎀</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.productName}</p>
                <p className="truncate text-xs text-ink-soft">{item.variantLabel ?? item.productBrand}</p>
                <p className="text-xs text-ink-soft">{formatPrice(item.priceCents)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {item.productStatus === "active" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(() => {
                        void moveWishlistItemToOrder(token, item.productId, item.variantId);
                      })
                    }
                    className="rounded-pill bg-blue px-3 py-1 text-xs font-bold text-white transition hover:brightness-105 disabled:opacity-50"
                  >
                    Move to Pre-order
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(() => {
                      void toggleWishlistItem(token, item.productId, item.variantId);
                    })
                  }
                  className="text-xs font-semibold text-coral hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

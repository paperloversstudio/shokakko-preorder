"use client";

import { Drawer } from "@/components/ui/Drawer";
import { formatPrice } from "@/lib/validations/product";
import { useCart } from "@/components/cart/CartContext";
import type { CatalogProduct } from "@/components/catalog/types";
import { useWishlist } from "./WishlistContext";

/** Scoped to this drawer only — the rest of the app already has its own
 * Sold Out badge / "Price Coming Soon" text treatments (ProductCard,
 * Product Details, checkout) that this doesn't touch. */
function getStatusDisplay(product: CatalogProduct): { emoji: string; label: string } {
  if (product.status === "sold_out") return { emoji: "🔴", label: "Sold Out" };
  if (product.priceCents === null) return { emoji: "🟡", label: "Price Coming Soon" };
  return { emoji: "🟢", label: "Available" };
}

export function WishlistDrawer({ products }: { products: CatalogProduct[] }) {
  const wishlist = useWishlist();
  const cart = useCart();

  const items = wishlist.ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is CatalogProduct => p !== undefined);

  return (
    <Drawer
      open={wishlist.isDrawerOpen}
      onClose={wishlist.closeDrawer}
      title="Your wishlist"
      mobileVariant="bottom-sheet"
    >
      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Nothing here yet — tap the ♡ on any product to save it for later.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {items.map((product) => {
            const statusDisplay = getStatusDisplay(product);
            return (
              <li key={product.id} className="flex items-center gap-3 py-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-mint/30">
                  {product.images[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0].url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">
                      🎀
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{product.name}</p>
                  <p className="truncate text-xs text-ink-soft">{product.brand}</p>
                  <p className="text-xs text-ink-soft">
                    {formatPrice(product.priceCents, product.currency)}
                  </p>
                  <p className="text-xs text-ink-soft">
                    <span aria-hidden>{statusDisplay.emoji}</span> {statusDisplay.label}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {product.status === "active" && (
                    <button
                      type="button"
                      onClick={() => {
                        cart.addItem(product.id);
                        wishlist.toggle(product.id);
                      }}
                      aria-label={`Move ${product.name} to pre-order`}
                      className="rounded-pill bg-blue px-3 py-1 text-xs font-bold text-white transition hover:brightness-105"
                    >
                      Move to Pre-order
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => wishlist.toggle(product.id)}
                    aria-label={`Remove ${product.name} from wishlist`}
                    className="text-xs font-semibold text-coral hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}

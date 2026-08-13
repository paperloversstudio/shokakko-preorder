"use client";

import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { QuantitySelector } from "@/components/catalog/QuantitySelector";
import { formatPrice } from "@/lib/validations/product";
import type { CatalogProduct } from "@/components/catalog/types";
import { useCart } from "./CartContext";

export function CartDrawer({ products }: { products: CatalogProduct[] }) {
  const cart = useCart();
  const router = useRouter();

  const lines = Object.entries(cart.quantities)
    .map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      return product ? { product, quantity } : null;
    })
    .filter((line): line is { product: CatalogProduct; quantity: number } => line !== null);

  return (
    <Drawer open={cart.isDrawerOpen} onClose={cart.closeDrawer} title="Your cart">
      {lines.length === 0 ? (
        <p className="text-sm text-ink-soft">Your cart is empty — add something cute!</p>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y divide-line">
            {lines.map(({ product, quantity }) => (
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
                  <p className="text-xs text-ink-soft">
                    {formatPrice(product.priceCents, product.currency)} each
                  </p>
                  <div className="mt-1">
                    <QuantitySelector
                      value={quantity}
                      onChange={(qty) => cart.setQuantity(product.id, qty)}
                      size="sm"
                    />
                  </div>
                </div>
                <p className="shrink-0 font-display text-sm font-bold">
                  {product.priceCents !== null
                    ? formatPrice(product.priceCents * quantity, product.currency)
                    : "TBC"}
                </p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              cart.closeDrawer();
              router.push("/checkout");
            }}
            className="rounded-pill bg-blue px-5 py-3 font-display font-bold text-white shadow-sm shadow-blue/30 transition hover:brightness-105"
          >
            Next Step
          </button>
        </div>
      )}
    </Drawer>
  );
}

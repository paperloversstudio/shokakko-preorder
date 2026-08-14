"use client";

import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { QuantitySelector } from "@/components/catalog/QuantitySelector";
import { formatPrice } from "@/lib/validations/product";
import type { CatalogProduct } from "@/components/catalog/types";
import { useCart, parseCartKey } from "./CartContext";

export function CartDrawer({ products }: { products: CatalogProduct[] }) {
  const cart = useCart();
  const router = useRouter();

  const lines = Object.entries(cart.quantities)
    .map(([cartKey, quantity]) => {
      const { productId, variantId } = parseCartKey(cartKey);
      const product = products.find((p) => p.id === productId);
      if (!product) return null;
      const variant = variantId
        ? (product.variants.find((v) => v.id === variantId) ?? null)
        : null;
      return { cartKey, product, variant, quantity };
    })
    .filter(
      (line): line is { cartKey: string; product: CatalogProduct; variant: CatalogProduct["variants"][number] | null; quantity: number } =>
        line !== null,
    );

  return (
    <Drawer open={cart.isDrawerOpen} onClose={cart.closeDrawer} title="Your cart">
      {lines.length === 0 ? (
        <p className="text-sm text-ink-soft">Your cart is empty — add something cute!</p>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y divide-line">
            {lines.map(({ cartKey, product, variant, quantity }) => {
              const imageUrl = variant?.imageUrl ?? product.images[0]?.url;
              const priceCents = variant?.priceCents ?? product.priceCents;
              return (
                <li key={cartKey} className="flex items-center gap-3 py-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-mint/30">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg">
                        🎀
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{product.name}</p>
                    {variant && (
                      <p className="truncate text-xs text-ink-soft">
                        {product.variantGroupName}: {variant.name}
                      </p>
                    )}
                    <p className="text-xs text-ink-soft">
                      {formatPrice(priceCents, product.currency)} each
                    </p>
                    <div className="mt-1">
                      <QuantitySelector
                        value={quantity}
                        onChange={(qty) => cart.setQuantity(cartKey, qty)}
                        size="sm"
                      />
                    </div>
                  </div>
                  <p className="shrink-0 font-display text-sm font-bold">
                    {priceCents !== null
                      ? formatPrice(priceCents * quantity, product.currency)
                      : "TBC"}
                  </p>
                </li>
              );
            })}
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

"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PreOrderFormFields } from "@/components/catalog/PreOrderFormFields";
import { formatPrice } from "@/lib/validations/product";
import { submitPreOrder, type OrderSubmitState } from "@/app/order/actions";
import { useCart } from "@/components/cart/CartContext";
import { useWishlist } from "@/components/wishlist/WishlistContext";
import type { CatalogProduct } from "@/components/catalog/types";

const initialState: OrderSubmitState = {};

export function CheckoutForm({
  products,
  preorderInfoHtml,
}: {
  products: CatalogProduct[];
  preorderInfoHtml: string | null;
}) {
  const cart = useCart();
  const wishlist = useWishlist();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(submitPreOrder, initialState);
  const [billingSame, setBillingSame] = useState(true);
  const errors = state.fieldErrors ?? {};

  const lines = useMemo(
    () =>
      Object.entries(cart.quantities)
        .map(([productId, quantity]) => {
          const product = products.find((p) => p.id === productId);
          return product ? { product, quantity } : null;
        })
        .filter((line): line is { product: CatalogProduct; quantity: number } => line !== null),
    [cart.quantities, products],
  );

  const cartJson = useMemo(
    () =>
      JSON.stringify(
        lines.map(({ product, quantity }) => ({ productId: product.id, quantity })),
      ),
    [lines],
  );

  // Migrated into the database as part of this submission — see
  // submitPreOrder. Harmless to include even if this browser is already
  // "linked" (from a prior order) — the ids just reflect whatever's
  // currently wishlisted either way.
  const wishlistJson = useMemo(() => JSON.stringify(wishlist.ids), [wishlist.ids]);

  const totalCents = lines.reduce(
    (sum, { product, quantity }) =>
      product.priceCents !== null ? sum + product.priceCents * quantity : sum,
    0,
  );
  const hasUnknownPrice = lines.some(({ product }) => product.priceCents === null);

  if (lines.length === 0) {
    return (
      <div className="rounded-card bg-white p-8 text-center shadow-sm shadow-ink/5">
        <p className="text-ink-soft">Your cart is empty.</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 rounded-pill bg-blue px-5 py-2 font-display font-bold text-white"
        >
          ← Back to shopping
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-card bg-white p-5 shadow-sm shadow-ink/5 sm:p-8">
        <h2 className="mb-4 font-display text-xl font-bold">Your items</h2>
        <ul className="flex flex-col divide-y divide-line">
          {lines.map(({ product, quantity }) => (
            <li key={product.id} className="flex items-center gap-4 py-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-mint/30">
                {product.images[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.images[0].url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">
                    🎀
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-ink-soft">
                  {product.brand} · × {quantity}
                </p>
              </div>
              <p className="shrink-0 font-display font-bold">
                {product.priceCents !== null
                  ? formatPrice(product.priceCents * quantity, product.currency)
                  : "Price Coming Soon"}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-line pt-3 font-display font-bold">
          <span>Total</span>
          <span>
            {formatPrice(totalCents)}
            {hasUnknownPrice && " + TBC"}
          </span>
        </div>
      </div>

      {preorderInfoHtml && (
        <div className="rounded-card bg-white p-5 shadow-sm shadow-ink/5 sm:p-8">
          {/* Admin-authored content from the Settings page's rich text
              editor — schema-constrained at the editor level, see
              PreorderInfoEditor.tsx, so this is safe to render as-is. */}
          <div
            className="rich-text"
            dangerouslySetInnerHTML={{ __html: preorderInfoHtml }}
          />
        </div>
      )}

      <p className="px-1 text-sm font-bold text-ink">
        Tax included. Shipping fee may apply. For details, please refer to
        our{" "}
        <a
          href="https://www.shokakko.com.au/pages/shipping-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-blue hover:underline"
        >
          Shipping Policy
        </a>
        .
      </p>

      <form
        action={formAction}
        className="flex flex-col gap-5 rounded-card bg-white p-5 shadow-sm shadow-ink/5 sm:p-8"
      >
        <input type="hidden" name="cartJson" value={cartJson} />
        <input type="hidden" name="wishlistJson" value={wishlistJson} />

        {state.error && (
          <p
            role="alert"
            className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral"
          >
            {state.error}
          </p>
        )}

        <PreOrderFormFields
          errors={errors}
          billingSame={billingSame}
          onBillingSameChange={setBillingSame}
        />

        <Button
          type="submit"
          disabled={pending || lines.length === 0}
          size="lg"
          className="self-stretch sm:self-start"
        >
          {pending ? "Saving…" : "Save My Pre-order"}
        </Button>
      </form>
    </div>
  );
}

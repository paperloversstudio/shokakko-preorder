"use client";

import { useState, useTransition } from "react";
import { formatPrice } from "@/lib/validations/product";
import { VariantPills } from "@/components/catalog/VariantPills";
import { QuantitySelector } from "@/components/catalog/QuantitySelector";
import type { CatalogVariant } from "@/components/catalog/types";
import { updateOrderItemQuantity, updateOrderItemVariant, removeOrderItem } from "./actions";

export type PortalOrderItem = {
  id: string;
  productId: string | null;
  variantId: string | null;
  quantity: number;
  productName: string;
  productBrand: string;
  variantName: string | null;
  unitPriceCents: number | null;
  imageUrl: string | null;
  variantGroupName: string | null;
  variants: CatalogVariant[];
};

function ItemRow({ token, item }: { token: string; item: PortalOrderItem }) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [variantId, setVariantId] = useState(item.variantId);
  const [priceCents, setPriceCents] = useState(item.unitPriceCents);
  const [pending, startTransition] = useTransition();

  const selectedVariant = item.variants.find((v) => v.id === variantId);
  const imageUrl = selectedVariant?.imageUrl ?? item.imageUrl;
  const subtotalCents = priceCents !== null ? priceCents * quantity : null;

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-mint/30">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg">🎀</div>
        )}
      </div>

      <div className="flex-1">
        <p className="font-semibold">{item.productName}</p>
        <p className="text-xs text-ink-soft">{item.productBrand}</p>

        {item.variantGroupName && item.variants.length > 0 && (
          <div className="mt-2">
            <VariantPills
              groupName={item.variantGroupName}
              variants={item.variants}
              selectedId={variantId ?? ""}
              onSelect={(newVariantId) => {
                const variant = item.variants.find((v) => v.id === newVariantId);
                setVariantId(newVariantId);
                if (variant) setPriceCents(variant.priceCents);
                startTransition(() => {
                  void updateOrderItemVariant(token, item.id, newVariantId);
                });
              }}
            />
          </div>
        )}
        {!item.variantGroupName && item.variantName && (
          <p className="mt-1 text-xs font-semibold text-ink-soft">Variant: {item.variantName}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <p className="font-display font-bold">{formatPrice(subtotalCents)}</p>
        <p className="text-xs text-ink-soft">{formatPrice(priceCents)} each</p>
        <QuantitySelector
          value={quantity}
          size="sm"
          onChange={(next) => {
            // Never let the stepper zero an item out — "Remove Item" is
            // the explicit action for that (see the Sprint 5 plan).
            if (next < 1) return;
            setQuantity(next);
            startTransition(() => {
              void updateOrderItemQuantity(token, item.id, next);
            });
          }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Remove ${item.productName} from your pre-order?`)) return;
            startTransition(() => {
              void removeOrderItem(token, item.id);
            });
          }}
          className="text-xs font-semibold text-coral hover:underline disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </li>
  );
}

export function OrderItemsSection({ token, items }: { token: string; items: PortalOrderItem[] }) {
  const totalCents = items.reduce(
    (sum, item) => (item.unitPriceCents !== null ? sum + item.unitPriceCents * item.quantity : sum),
    0,
  );
  const hasUnknownPrice = items.some((item) => item.unitPriceCents === null);

  return (
    <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
      <h2 className="font-display font-bold">Products</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">No items in this pre-order yet.</p>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-line">
            {items.map((item) => (
              <ItemRow key={item.id} token={token} item={item} />
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-line pt-3 font-display font-bold">
            <span>Total</span>
            <span>
              {formatPrice(totalCents)}
              {hasUnknownPrice && " + TBC"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

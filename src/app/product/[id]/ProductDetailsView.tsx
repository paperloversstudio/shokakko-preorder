"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { QuantitySelector } from "@/components/catalog/QuantitySelector";
import { formatPrice } from "@/lib/validations/product";
import { useCart } from "@/components/cart/CartContext";
import { useWishlist } from "@/components/wishlist/WishlistContext";
import type { CatalogProduct } from "@/components/catalog/types";

export function ProductDetailsView({ product }: { product: CatalogProduct }) {
  const cart = useCart();
  const wishlist = useWishlist();
  const [activeImage, setActiveImage] = useState(0);

  const quantity = cart.quantities[product.id] ?? 0;
  const isSoldOut = product.status === "sold_out";
  const isWishlisted = wishlist.has(product.id);
  const images = product.images;
  const mainImage =
    images.length > 0 ? images[Math.min(activeImage, images.length - 1)].url : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      <Link
        href="/"
        className="self-start text-sm font-semibold text-ink-soft hover:text-ink"
      >
        ← Back to shopping
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Gallery */}
        <div className="flex flex-col gap-3">
          <div className="aspect-square w-full overflow-hidden rounded-card bg-mint/30">
            {mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mainImage}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl">
                🎀
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, index) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Show photo ${index + 1}`}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    index === activeImage ? "border-blue" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue">
              {product.brand}
            </p>
            <h1 className="font-display text-2xl font-bold leading-snug">
              {product.name}
            </h1>
            <p className="text-xs text-ink-soft">SKU {product.sku}</p>
          </div>

          {isSoldOut && <Badge tone="coral">Sold Out</Badge>}

          {product.type && (
            <p className="text-sm text-ink-soft">
              <span className="font-semibold text-ink">Type:</span> {product.type}
            </p>
          )}

          {product.description && (
            <p className="text-sm text-ink-soft">{product.description}</p>
          )}

          {product.estimatedArrival && (
            <p className="text-sm font-semibold text-ink-soft">
              📦 Estimated arrival: {product.estimatedArrival}
            </p>
          )}

          <p className="font-display text-2xl font-extrabold text-ink">
            {product.priceCents === null ? (
              <span className="text-coral">Price Coming Soon</span>
            ) : (
              formatPrice(product.priceCents, product.currency)
            )}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => wishlist.toggle(product.id)}
              aria-pressed={isWishlisted}
              className="flex items-center gap-2 rounded-pill border border-line bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-mint/30"
            >
              <span className="text-lg">{isWishlisted ? "❤️" : "♡"}</span>
              {isWishlisted ? "Wishlisted" : "Add to Wishlist"}
            </button>

            {!isSoldOut &&
              (quantity === 0 ? (
                <button
                  type="button"
                  onClick={() => cart.addItem(product.id)}
                  className="flex min-h-[50px] items-center gap-2 rounded-pill bg-blue px-4 py-2.5 text-sm font-display font-semibold text-white shadow-sm shadow-blue/30 transition hover:brightness-105 active:brightness-95"
                >
                  Add to Pre-order
                </button>
              ) : (
                <QuantitySelector
                  value={quantity}
                  onChange={(qty) => cart.setQuantity(product.id, qty)}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

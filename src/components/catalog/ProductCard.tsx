"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/validations/product";
import { useCart } from "@/components/cart/CartContext";
import { useWishlist } from "@/components/wishlist/WishlistContext";
import { QuantitySelector } from "./QuantitySelector";
import type { CatalogProduct } from "./types";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const cart = useCart();
  const wishlist = useWishlist();
  const quantity = cart.quantities[product.id] ?? 0;
  const isSoldOut = product.status === "sold_out";
  const image = product.images[0]?.url;
  const isWishlisted = wishlist.has(product.id);
  const detailsHref = `/product/${product.id}`;
  // Sprint 3.5 — a product with variants can't be wishlisted/added to
  // cart with one click from the grid (which variant is wanted has to be
  // chosen first) — "View Options" sends them to the Details page, where
  // the pills live, instead of guessing.
  const hasVariants = Boolean(product.variantGroupName) && product.variants.length > 0;

  return (
    <li
      className={`flex flex-col overflow-hidden rounded-card bg-white shadow-sm shadow-ink/5 transition ${
        quantity > 0 ? "ring-2 ring-blue" : ""
      }`}
    >
      <div className="relative aspect-square w-full bg-mint/30">
        {/* Wraps only the photo — the heart button below is a sibling, not
            nested inside this link, so it keeps working without needing
            stopPropagation. */}
        <Link href={detailsHref} className="block h-full w-full">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl">
              🎀
            </div>
          )}
        </Link>
        {!hasVariants && (
          <button
            type="button"
            onClick={() => wishlist.toggle(product.id)}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={isWishlisted}
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-pill bg-white/90 text-base shadow-sm transition active:scale-95"
          >
            {isWishlisted ? "❤️" : "♡"}
          </button>
        )}
        {isSoldOut && (
          <span className="absolute left-1.5 top-1.5 rounded-pill bg-ink/80 px-2 py-0.5 text-[10px] font-bold text-white">
            Sold Out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link href={detailsHref} className="block">
          <p className="text-[10px] font-bold uppercase tracking-wide text-blue">
            {product.brand}
          </p>
          <h3 className="line-clamp-2 font-display text-sm font-bold leading-snug">
            {product.name}
          </h3>
        </Link>

        {/* Collection tags are intentionally not shown to customers here —
            they still drive the sidebar/drawer filter and admin views. */}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-1.5 pt-1.5">
          <span className="font-display text-sm font-extrabold text-ink">
            {product.priceCents === null ? (
              <span className="text-coral">Price Coming Soon</span>
            ) : (
              formatPrice(product.priceCents, product.currency)
            )}
          </span>
          {hasVariants ? (
            <Link
              href={detailsHref}
              className="rounded-pill bg-blue px-3 py-1.5 text-xs font-display font-bold text-white shadow-sm shadow-blue/30 transition hover:brightness-105"
            >
              View Options
            </Link>
          ) : isSoldOut ? (
            <Badge tone="coral">Sold Out</Badge>
          ) : (
            <QuantitySelector
              value={quantity}
              onChange={(qty) => cart.setQuantity(product.id, qty)}
              size="sm"
            />
          )}
        </div>
      </div>
    </li>
  );
}

"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useCart } from "@/components/cart/CartContext";
import { useWishlist } from "@/components/wishlist/WishlistContext";

function IconBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-coral px-1 text-[10px] font-bold text-white">
      {count}
    </span>
  );
}

export function SiteHeader({ logoUrl }: { logoUrl: string | null }) {
  const cart = useCart();
  const wishlist = useWishlist();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 px-4 py-3 backdrop-blur">
      {/* 3-column grid so the logo is genuinely centered regardless of the
          icon cluster's width — a plain flex justify-between can't center
          the middle item once the two sides are unequal widths.
          minmax(0,1fr), not bare 1fr: without the 0 minimum, a track's
          implicit content-based minimum can force it wider than its
          "fair share" on narrow screens (the icon cluster has more
          intrinsic width than the empty spacer), which throws the
          center column off true center. */}
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div aria-hidden />
        <Link href="/" className="flex justify-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded logo URL
            <img
              src={logoUrl}
              alt="Shokakko Australia"
              className="h-14 w-auto max-w-[160px] object-contain sm:h-16 sm:max-w-[200px] lg:h-20 lg:max-w-[260px]"
            />
          ) : (
            <Logo className="text-3xl sm:text-4xl" />
          )}
        </Link>
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={wishlist.openDrawer}
            aria-label={`Wishlist, ${wishlist.count} item${wishlist.count === 1 ? "" : "s"}`}
            className="relative flex h-10 w-10 items-center justify-center rounded-pill text-xl hover:bg-mint/40"
          >
            {wishlist.count > 0 ? "❤️" : "♡"}
            <IconBadge count={wishlist.count} />
          </button>
          <button
            type="button"
            onClick={cart.openDrawer}
            aria-label={`Shopping cart, ${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"}`}
            className="relative flex h-10 w-10 items-center justify-center rounded-pill text-xl hover:bg-mint/40"
          >
            🛍️
            <IconBadge count={cart.itemCount} />
          </button>
          <Link
            href="/my-preorders"
            aria-label="My pre-order"
            title="My pre-order"
            className="flex h-10 w-10 items-center justify-center rounded-pill text-xl hover:bg-mint/40"
          >
            🧾
          </Link>
        </div>
      </div>
    </header>
  );
}

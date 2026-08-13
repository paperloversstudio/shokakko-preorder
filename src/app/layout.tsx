import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { cookies } from "next/headers";
import { CartProvider } from "@/components/cart/CartContext";
import { WishlistProvider } from "@/components/wishlist/WishlistContext";
import { PREORDER_TOKEN_COOKIE, getLinkedWishlist } from "@/lib/wishlist";
import "./globals.css";

// Single site-wide font family (Poppins) — used for both display/heading
// and body text everywhere (customer pages, checkout, admin, buttons,
// forms, nav, product cards). See globals.css's @theme block: both
// --font-display and --font-body resolve to this one font, so no
// component needs to change which Tailwind class it uses.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Shokakko Australia — Pre-Orders",
  description:
    "Browse and pre-order cute Japanese stationery from Shokakko Australia, straight from our overseas exhibition floor.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Reading cookies() here — once per request, for every page — decides
  // which WishlistContext mode this browser gets (see WishlistContext.tsx
  // and submitPreOrder). A side effect: it also makes every page dynamic
  // (can't statically prerender a page whose layout depends on a
  // request-specific cookie) — an acceptable, expected trade-off, not a
  // bug, for pages this small.
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(PREORDER_TOKEN_COOKIE)?.value ?? null;
  const linkedIds = rawToken ? await getLinkedWishlist(rawToken) : null;
  // null means "no cookie" or "stale/invalid token" — both fall back to
  // the browser's local (pre-migration) wishlist.
  const linkedToken = linkedIds !== null ? rawToken : null;

  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-ink font-body">
        <CartProvider>
          <WishlistProvider linkedToken={linkedToken} initialLinkedIds={linkedIds ?? []}>
            {children}
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}

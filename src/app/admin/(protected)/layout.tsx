import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { SiteLogo } from "@/components/SiteLogo";
import { logoutAction } from "./actions";

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  await requireAdmin();
  const settings = await db.siteSettings.findUnique({ where: { id: "singleton" } });

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-10 border-b border-line bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <SiteLogo logoUrl={settings?.logoUrl ?? null} size="compact" href="/admin" />
          <nav className="flex flex-wrap items-center gap-1 text-sm font-semibold">
            <Link
              href="/admin/products"
              className="rounded-pill px-3 py-1.5 hover:bg-mint/50"
            >
              Products
            </Link>
            <Link
              href="/admin/banners"
              className="rounded-pill px-3 py-1.5 hover:bg-mint/50"
            >
              Banners
            </Link>
            <Link
              href="/admin/collections"
              className="rounded-pill px-3 py-1.5 hover:bg-mint/50"
            >
              Collections
            </Link>
            <Link
              href="/admin/emails"
              className="rounded-pill px-3 py-1.5 hover:bg-mint/50"
            >
              Emails
            </Link>
            <Link
              href="/admin/preorders"
              className="rounded-pill px-3 py-1.5 hover:bg-mint/50"
            >
              Pre-orders
            </Link>
            <Link
              href="/admin/purchases"
              className="rounded-pill px-3 py-1.5 hover:bg-mint/50"
            >
              Purchases
            </Link>
            <Link
              href="/admin/analytics"
              className="rounded-pill px-3 py-1.5 hover:bg-mint/50"
            >
              Analytics
            </Link>
            <Link
              href="/admin/settings"
              className="rounded-pill px-3 py-1.5 hover:bg-mint/50"
            >
              Settings
            </Link>
            <Link
              href="/"
              className="rounded-pill px-3 py-1.5 hover:bg-mint/50"
            >
              View site
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-pill px-3 py-1.5 text-coral hover:bg-coral/10"
              >
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

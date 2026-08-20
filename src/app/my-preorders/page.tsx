import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { SiteLogo } from "@/components/SiteLogo";
import { Footer } from "@/components/layout/Footer";
import { RequestEditLinkForm } from "./RequestEditLinkForm";

export const metadata: Metadata = {
  title: "My Pre-order — Shokakko Australia",
};

/** Sprint 5, Part 1 — the real "Retrieve My Pre-order" flow, replacing
 * the Sprint 1 placeholder. Accountless, email-based lookup: enter your
 * email, get a secure edit link if an order exists — see
 * src/app/my-preorders/actions.ts for the "never reveal whether an
 * address exists" behavior. */
export default async function MyPreOrdersPage() {
  const settings = await db.siteSettings.findUnique({ where: { id: "singleton" } });

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
        <SiteLogo logoUrl={settings?.logoUrl ?? null} size="homepage" />
        <div className="w-full rounded-card bg-white p-8 shadow-sm shadow-ink/5">
          <p className="text-4xl">🧾</p>
          <h1 className="mt-2 font-display text-2xl font-bold">My Pre-order</h1>
          <p className="mx-auto mt-3 max-w-sm text-ink-soft">
            Enter the email address you used at checkout, and we&apos;ll
            send you a secure link to view and edit your pre-order — no
            account or password needed.
          </p>
          <div className="mt-6">
            <RequestEditLinkForm />
          </div>
        </div>
        <Link
          href="/"
          className="rounded-pill bg-blue px-6 py-3 font-display font-bold text-white shadow-sm shadow-blue/30"
        >
          ← Back to shopping
        </Link>
      </main>
      <Footer />
    </div>
  );
}

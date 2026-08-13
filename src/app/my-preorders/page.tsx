import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "My Pre-order — Shokakko Australia",
};

// Placeholder only — Sprint 1 scope. The real flow (accountless, email-based
// lookup: customer enters their email, gets a secure "Edit My Pre-order"
// link if one exists) is planned for a later sprint. Nothing behind this
// page yet on purpose.
export default function MyPreOrdersPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
        <Link href="/">
          <Logo className="text-lg" />
        </Link>
        <div className="rounded-card bg-white p-8 shadow-sm shadow-ink/5">
          <p className="text-4xl">🧾</p>
          <h1 className="mt-2 font-display text-2xl font-bold">My Pre-order</h1>
          <p className="mt-3 text-ink-soft">
            This feature will be implemented in a later sprint.
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            You&apos;ll be able to enter your email here to receive a secure
            link for editing your pre-order — no account or password needed.
          </p>
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

import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Unsubscribe — Shokakko Australia",
  robots: { index: false, follow: false },
};

/**
 * The one deliberate exception to this app's "every mutation is a Server
 * Action" convention: an unsubscribe link clicked from an email client is
 * a plain GET navigation with no JS involved, so the write has to happen
 * here in the page itself rather than behind a form submission. Written
 * to be safe to load more than once (email clients/security scanners
 * sometimes pre-fetch links) — it only ever sets `unsubscribedAt` if it
 * isn't already set, and always shows the same confirmation either way.
 */
export default async function UnsubscribePage({
  params,
}: PageProps<"/unsubscribe/[token]">) {
  const { token } = await params;

  const order = await db.preOrder.findUnique({ where: { editToken: token } });

  if (order && !order.unsubscribedAt) {
    await db.preOrder.update({
      where: { id: order.id },
      data: { unsubscribedAt: new Date() },
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <Logo className="text-xl" />
        {order ? (
          <>
            <p className="text-4xl">🌷</p>
            <h1 className="font-display text-xl font-bold">You&apos;re unsubscribed</h1>
            <p className="text-sm text-ink-soft">
              {order.customerName}, you won&apos;t receive any more Update or
              Reminder emails from Shokakko Australia. Your pre-order itself
              is unaffected.
            </p>
          </>
        ) : (
          <>
            <p className="text-4xl">🎀</p>
            <h1 className="font-display text-xl font-bold">Link not recognized</h1>
            <p className="text-sm text-ink-soft">
              This unsubscribe link doesn&apos;t match a pre-order — it may
              have expired or already been used.
            </p>
          </>
        )}
        <Link
          href="/"
          className="mt-2 rounded-pill bg-blue px-6 py-3 font-display font-bold text-white shadow-sm shadow-blue/30"
        >
          ← Back to shopping
        </Link>
      </main>
      <Footer />
    </div>
  );
}

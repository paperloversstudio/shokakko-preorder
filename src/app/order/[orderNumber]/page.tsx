import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Logo } from "@/components/Logo";
import { ClearCartOnMount } from "@/components/cart/ClearCartOnMount";
import { Footer } from "@/components/layout/Footer";
import { CopyLinkButton } from "@/components/shared/CopyLinkButton";
import { formatPrice } from "@/lib/validations/product";

export const metadata: Metadata = {
  title: "Pre-order received — Shokakko Australia",
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({
  params,
}: PageProps<"/order/[orderNumber]">) {
  const { orderNumber } = await params;
  const order = await db.preOrder.findUnique({
    where: { orderNumber },
    include: { items: true },
  });

  if (!order) notFound();

  // The future Pre-order Workspace page (/edit/[token]) isn't built yet —
  // this sprint only generates and stores the token. Shown as inert text
  // (not a clickable link) so visiting it today doesn't lead to a
  // confusing 404 — see docs/PRD.md and CHANGELOG.md for the full context.
  let editUrl: string | null = null;
  if (order.editToken) {
    const headersList = await headers();
    const host = headersList.get("host") ?? "localhost:3000";
    const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    editUrl = `${protocol}://${host}/edit/${order.editToken}`;
  }

  const totalCents = order.items.reduce(
    (sum, item) =>
      item.unitPriceCents !== null ? sum + item.unitPriceCents * item.quantity : sum,
    0,
  );
  const hasUnknownPrice = order.items.some((item) => item.unitPriceCents === null);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
        <ClearCartOnMount />
        <div className="text-center">
          <Logo className="justify-center text-xl" />
        </div>

        <div className="rounded-card bg-white p-6 text-center shadow-sm shadow-ink/5 sm:p-8">
          <p className="text-4xl">🌸</p>
          <h1 className="mt-2 font-display text-2xl font-bold">
            Thank you, {order.customerName}!
          </h1>
          <p className="mt-1 text-ink-soft">
            Your pre-order has been received — no payment was taken. We&apos;ll
            be in touch by email once we&apos;re back in Australia.
          </p>
          <p className="mt-4 inline-block rounded-pill bg-mint px-4 py-1.5 font-display font-bold text-[#3f6b57]">
            Order {order.orderNumber}
          </p>
        </div>

        {editUrl && (
          <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5 sm:p-8">
            <h2 className="mb-2 font-display font-bold">Edit My Pre-order</h2>
            <p className="mb-3 text-sm text-ink-soft">
              Email functionality will be implemented in a future sprint.
              For now, please bookmark this page if you would like to edit
              your pre-order later.
            </p>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-mint/30 p-3">
              <code className="min-w-0 flex-1 break-all text-xs text-ink-soft">
                {editUrl}
              </code>
              <CopyLinkButton text={editUrl} />
            </div>
          </div>
        )}

        <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5 sm:p-8">
          <h2 className="mb-3 font-display font-bold">Items</h2>
          <ul className="flex flex-col divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{item.productName}</p>
                  <p className="text-sm text-ink-soft">{item.productBrand}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">× {item.quantity}</p>
                  <p className="text-sm text-ink-soft">
                    {formatPrice(item.unitPriceCents)}
                  </p>
                </div>
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

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
            <h2 className="mb-2 font-display font-bold">Shipping to</h2>
            <p className="whitespace-pre-wrap text-sm">{order.shippingAddress}</p>
          </div>
          <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
            <h2 className="mb-2 font-display font-bold">Billing address</h2>
            <p className="whitespace-pre-wrap text-sm">
              {order.billingAddress ?? "Same as shipping"}
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="self-center rounded-pill bg-blue px-6 py-3 font-display font-bold text-white shadow-sm shadow-blue/30"
        >
          ← Keep browsing
        </Link>
      </main>
      <Footer />
    </div>
  );
}

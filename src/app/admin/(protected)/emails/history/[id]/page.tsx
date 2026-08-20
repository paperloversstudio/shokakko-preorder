import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/validations/product";

export default async function EmailHistoryDetailPage({
  params,
}: PageProps<"/admin/emails/history/[id]">) {
  const { id } = await params;
  const digest = await db.emailDigest.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!digest) notFound();

  const newItems = digest.items.filter((i) => i.kind === "new");
  const priceItems = digest.items.filter((i) => i.kind === "price_update");
  const soldOutItems = digest.items.filter((i) => i.kind === "sold_out");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/emails/history"
          className="text-sm font-semibold text-ink-soft hover:text-ink"
        >
          ← Back to history
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold">Newsletter — {digest.status}</h1>
        <p className="text-sm text-ink-soft">
          Status: {digest.status}
          {digest.recipientCount !== null &&
            ` · ${digest.recipientCount} recipient${digest.recipientCount === 1 ? "" : "s"}`}
          {digest.generatedAt &&
            ` · generated ${digest.generatedAt.toLocaleString("en-AU", {
              dateStyle: "medium",
              timeStyle: "short",
            })}`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4 rounded-card bg-white p-6 shadow-sm shadow-ink/5">
          <h2 className="font-display font-bold">What was captured</h2>
          <p className="text-sm text-ink-soft">
            The structure this digest used (which sections were shown,
            Karen&apos;s Notes, etc.) lives in the{" "}
            <Link href="/admin/emails/templates/digest" className="underline hover:text-ink">
              Newsletter template
            </Link>{" "}
            — this saved render below shows exactly what was sent.
            Automatically-computed New Products/Price Updates/Sold Out
            captured for this specific send:
          </p>

          {newItems.length === 0 && priceItems.length === 0 && soldOutItems.length === 0 && (
            <p className="text-sm text-ink-soft">
              Nothing automatically-computed was captured for this send.
            </p>
          )}

          {newItems.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-ink">New Products captured</h3>
              <ul className="mt-1 text-sm text-ink-soft">
                {newItems.map((item) => (
                  <li key={item.id}>
                    {item.productName} — {formatPrice(item.priceCents)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {priceItems.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-ink">Price Updates captured</h3>
              <ul className="mt-1 text-sm text-ink-soft">
                {priceItems.map((item) => (
                  <li key={item.id}>
                    {item.productName} — {formatPrice(item.previousPriceCents)} →{" "}
                    {formatPrice(item.priceCents)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {soldOutItems.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-ink">Sold Out captured</h3>
              <ul className="mt-1 text-sm text-ink-soft">
                {soldOutItems.map((item) => (
                  <li key={item.id}>{item.productName}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">Saved render</h2>
          {digest.renderedHtml ? (
            <iframe
              title={`Newsletter ${digest.status} — saved render`}
              srcDoc={digest.renderedHtml}
              className="h-[700px] w-full rounded-card border border-line bg-white"
            />
          ) : (
            <p className="rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
              Not generated yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

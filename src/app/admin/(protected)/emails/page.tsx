import Link from "next/link";
import { db } from "@/lib/db";
import { resolveTemplateSections } from "@/lib/email/data/generic";
import { renderGenericEmail } from "@/lib/email/render";
import { buildFooterLinks } from "@/lib/email/site-url";
import { findOrCreateCurrentDraft } from "./actions";
import { NotificationCentreForm } from "./NotificationCentreForm";

export default async function NotificationCentrePage() {
  const [draft, recipientCount, settings] = await Promise.all([
    findOrCreateCurrentDraft(),
    db.preOrder.count({ where: { unsubscribedAt: null } }),
    db.siteSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  // Once a digest has been generated at least once, show exactly what was
  // saved rather than a fresh live recompute — Generate Email can itself
  // change the live New/Price-Update candidates (advancing
  // lastNotifiedPriceCents consumes the diff), so re-deriving "live" right
  // after generating would show a *different*, already-moved-on state
  // than what was actually captured. Before any generate, there's nothing
  // saved yet, so the live recompute is the only preview available.
  let previewHtml = draft.renderedHtml;
  if (!previewHtml) {
    const logoUrl = settings?.logoUrl ?? null;
    const eventName = settings?.eventName ?? null;
    const footerLinks = await buildFooterLinks(settings, null);
    const { subject, sections } = await resolveTemplateSections("digest", {
      firstName: "there",
      logoUrl,
      eventName,
      footerLinks,
      editUrl: null,
    });
    previewHtml = await renderGenericEmail({ subject, firstName: "there", logoUrl, eventName, footerLinks, sections });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Notification Centre</h1>
          <p className="text-sm text-ink-soft">
            Prepare the Newsletter — collect changes throughout the day,
            then generate one digest when you&apos;re ready.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Link
            href="/admin/emails/templates"
            className="rounded-pill px-3 py-1.5 text-sm font-semibold hover:bg-mint/50"
          >
            Email Templates →
          </Link>
          <Link
            href="/admin/emails/history"
            className="rounded-pill px-3 py-1.5 text-sm font-semibold hover:bg-mint/50"
          >
            View history →
          </Link>
          <Link
            href="/admin/emails/logs"
            className="rounded-pill px-3 py-1.5 text-sm font-semibold hover:bg-mint/50"
          >
            Email Logs →
          </Link>
          <Link
            href="/admin/emails/dashboard"
            className="rounded-pill px-3 py-1.5 text-sm font-semibold hover:bg-mint/50"
          >
            Dashboard →
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
          <NotificationCentreForm
            status={draft.status}
            generatedAt={draft.generatedAt ? draft.generatedAt.toISOString() : null}
            recipientCount={recipientCount}
          />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">
            {draft.renderedHtml ? "Last generated preview" : "Live preview"}
          </h2>
          <p className="text-sm text-ink-soft">
            {draft.renderedHtml
              ? "Exactly what Generate Email saved — click it again after making changes to refresh this."
              : "Reflects the catalogue right now — click Generate Email to save this as the digest."}{" "}
            Shown with a placeholder name and every section toggled on — the
            real send personalizes New Products and Price Updates per
            recipient&apos;s own notification preferences, so some
            customers&apos; copies may be shorter than this preview.
          </p>
          <iframe
            title="Newsletter preview"
            srcDoc={previewHtml}
            className="h-[700px] w-full rounded-card border border-line bg-white"
          />
        </div>
      </div>
    </div>
  );
}

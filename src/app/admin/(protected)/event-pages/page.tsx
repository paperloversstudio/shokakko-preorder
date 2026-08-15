import Link from "next/link";
import { db } from "@/lib/db";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { PROTECTED_SLUGS } from "@/lib/validations/event-page";
import { deleteEventPage } from "./actions";

/** Guarantees the two seeded pages exist — same "lazy singleton" pattern
 * as SiteSettings' upsert-on-save, applied here on every list-page visit
 * instead. This is what makes the pages exist on staging without a
 * manual seed run: the first time an admin opens this screen after the
 * migration lands, both rows get created if missing. Safe to call
 * repeatedly — `update: {}` is a no-op once they already exist. */
async function ensureSeedPages() {
  await Promise.all([
    db.eventPage.upsert({
      where: { slug: "how-to-preorder" },
      update: {},
      create: { slug: "how-to-preorder", title: "How to Pre-order", sortOrder: 0 },
    }),
    db.eventPage.upsert({
      where: { slug: "about-event" },
      update: {},
      create: { slug: "about-event", title: "About the Event", sortOrder: 1 },
    }),
  ]);
}

export default async function AdminEventPagesPage() {
  await ensureSeedPages();

  const pages = await db.eventPage.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { sections: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Event Pages</h1>
          <p className="text-sm text-ink-soft">
            Write and update your own site content — How to Pre-order, About
            the Event, and any future page — with no code changes.
          </p>
        </div>
        <Link
          href="/admin/event-pages/new"
          className="rounded-pill bg-blue px-4 py-2 text-sm font-display font-bold text-white shadow-sm shadow-blue/30 transition hover:brightness-105"
        >
          + Add Page
        </Link>
      </div>

      <ul className="flex flex-col gap-3">
        {pages.map((page) => {
          const isProtected = (PROTECTED_SLUGS as readonly string[]).includes(page.slug);
          return (
            <li
              key={page.id}
              className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-sm shadow-ink/5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-bold">{page.title}</span>
                <span className="text-sm text-ink-soft">
                  /{page.slug} · {page._count.sections} section
                  {page._count.sections === 1 ? "" : "s"}
                </span>
                <Link
                  href={`/${page.slug}`}
                  target="_blank"
                  className="text-sm font-semibold text-blue hover:underline"
                >
                  View page →
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/event-pages/${page.id}`}
                  className="rounded-pill border border-line px-3 py-1.5 text-sm font-semibold hover:bg-mint/30"
                >
                  Edit
                </Link>
                {isProtected ? (
                  <span className="text-xs text-ink-soft" title="Linked from the homepage and footer">
                    Can&apos;t be deleted
                  </span>
                ) : (
                  <DeleteButton
                    action={() => deleteEventPage(page.id)}
                    confirmMessage={`Delete "${page.title}"? This can't be undone.`}
                  >
                    Delete
                  </DeleteButton>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

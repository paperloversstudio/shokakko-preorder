import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PROTECTED_SLUGS, type SectionType } from "@/lib/validations/event-page";
import { EventPageForm } from "../EventPageForm";
import { PageSectionList } from "../PageSectionList";
import { updateEventPage } from "../actions";

export default async function EventPageBuilderPage({
  params,
}: PageProps<"/admin/event-pages/[id]">) {
  const { id } = await params;
  const page = await db.eventPage.findUnique({
    where: { id },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });
  if (!page) notFound();

  const isProtected = (PROTECTED_SLUGS as readonly string[]).includes(page.slug);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/event-pages"
        className="text-sm font-semibold text-ink-soft hover:text-ink"
      >
        ← Back to Event Pages
      </Link>
      <h1 className="font-display text-2xl font-bold">Edit page</h1>

      <div className="max-w-lg rounded-card bg-white p-6 shadow-sm shadow-ink/5">
        <EventPageForm
          action={updateEventPage.bind(null, page.id)}
          defaults={{ title: page.title, slug: page.slug }}
          submitLabel="Save changes"
          slugLocked={isProtected}
        />
      </div>

      <div>
        <h2 className="font-display text-lg font-bold">Sections</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Drag to reorder. Click a section to expand and edit it.
        </p>
        <PageSectionList
          pageId={page.id}
          initialSections={page.sections.map((s) => ({
            id: s.id,
            type: s.type as SectionType,
            data: s.data,
          }))}
        />
      </div>
    </div>
  );
}

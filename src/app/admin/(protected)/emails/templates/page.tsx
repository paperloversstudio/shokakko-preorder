import Link from "next/link";
import { db } from "@/lib/db";
import { EMAIL_KINDS, EMAIL_KIND_LABELS, EMAIL_KIND_DESCRIPTIONS } from "@/lib/validations/email-template";

export default async function EmailTemplatesPage() {
  const templates = await db.emailTemplate.findMany({
    include: { _count: { select: { sections: true } } },
  });
  const templateByKind = new Map(templates.map((t) => [t.kind, t]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/emails" className="text-sm font-semibold text-ink-soft hover:text-ink">
          ← Back to Notification Centre
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold">Email Templates</h1>
        <p className="text-sm text-ink-soft">
          Every email this site sends is built from the same reusable
          components (Hero Banner, Rich Text, Product Cards, ...) — pick a
          template to add, reorder, show/hide sections, or edit its
          content. Changing structure here never needs a code change.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {EMAIL_KINDS.map((kind) => {
          const template = templateByKind.get(kind);
          return (
            <Link
              key={kind}
              href={`/admin/emails/templates/${kind}`}
              className="flex flex-col gap-1 rounded-card bg-white p-5 shadow-sm shadow-ink/5 transition hover:shadow-md"
            >
              <h2 className="font-display text-lg font-bold">{EMAIL_KIND_LABELS[kind]}</h2>
              <p className="text-sm text-ink-soft">{EMAIL_KIND_DESCRIPTIONS[kind]}</p>
              <p className="mt-2 text-xs font-semibold text-ink-soft">
                {template
                  ? `${template._count.sections} section${template._count.sections === 1 ? "" : "s"} · updated ${template.updatedAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`
                  : "Not set up yet — click to start"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

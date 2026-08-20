import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EMAIL_KINDS, EMAIL_KIND_LABELS, type EmailKind, type EmailSectionType } from "@/lib/validations/email-template";
import { formatCustomerName } from "@/lib/validations/order";
import { buildConfirmationEmailData } from "@/lib/email/data/confirmation";
import { buildEditLinkEmailData } from "@/lib/email/data/edit-link";
import { buildReminderEmailData } from "@/lib/email/data/reminder";
import { resolveTemplateSections } from "@/lib/email/data/generic";
import { renderGenericEmail } from "@/lib/email/render";
import { buildFooterLinks } from "@/lib/email/site-url";
import { findOrCreateTemplate } from "../actions";
import { EmailTemplateSectionList } from "../EmailTemplateSectionList";
import { TemplateSubjectForm } from "../TemplateSubjectForm";

const HAS_ORDER_CONTEXT = new Set<EmailKind>(["confirmation", "edit_link", "reminder"]);

export default async function EmailTemplateEditorPage({
  params,
  searchParams,
}: PageProps<"/admin/emails/templates/[kind]">) {
  const { kind: kindParam } = await params;
  if (!(EMAIL_KINDS as readonly string[]).includes(kindParam)) notFound();
  const kind = kindParam as EmailKind;

  const [template, tags, products] = await Promise.all([
    findOrCreateTemplate(kind),
    db.tag.findMany({ orderBy: { name: "asc" } }),
    db.product.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, brand: true },
    }),
  ]);

  const collectionOptions = tags.map((t) => ({ id: t.id, name: t.name }));
  const usesOrder = HAS_ORDER_CONTEXT.has(kind);

  let previewHtml: string | null = null;
  let orderPickerOptions: { orderNumber: string; label: string }[] = [];
  let selectedOrderNumber: string | undefined;

  if (usesOrder) {
    const { order: orderParam } = await searchParams;
    const requestedOrderNumber = Array.isArray(orderParam) ? orderParam[0] : orderParam;
    const orders = await db.preOrder.findMany({
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true, customerFirstName: true, customerLastName: true, editToken: true },
      take: 20,
    });
    orderPickerOptions = orders.map((o) => ({
      orderNumber: o.orderNumber,
      label: `${o.orderNumber} — ${formatCustomerName(o.customerFirstName, o.customerLastName)}`,
    }));
    const selected = orders.find((o) => o.orderNumber === requestedOrderNumber) ?? orders[0];
    selectedOrderNumber = selected?.orderNumber;

    if (selected) {
      const data =
        kind === "confirmation"
          ? await buildConfirmationEmailData(selected.orderNumber)
          : kind === "reminder"
            ? await buildReminderEmailData(selected.orderNumber)
            : await buildEditLinkEmailData(selected);
      previewHtml = data ? await renderGenericEmail(data) : null;
    }
  } else {
    // digest — placeholder preview, same convention as the Notification
    // Centre's own live preview.
    const settings = await db.siteSettings.findUnique({ where: { id: "singleton" } });
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
      <div>
        <Link href="/admin/emails/templates" className="text-sm font-semibold text-ink-soft hover:text-ink">
          ← Back to Email Templates
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold">{EMAIL_KIND_LABELS[kind]}</h1>
        <p className="text-sm text-ink-soft">
          Add, reorder, show/hide, and edit sections — no code changes
          needed. The preview alongside updates as you save.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          <div className="rounded-card bg-white p-6 shadow-sm shadow-ink/5">
            <TemplateSubjectForm
              kind={kind}
              subject={template.subject}
              placeholderHint={
                kind === "confirmation" ? "Use {{order_number}} to include the order number." : undefined
              }
            />
          </div>
          <EmailTemplateSectionList
            templateId={template.id}
            initialSections={template.sections.map((s) => ({
              id: s.id,
              type: s.type as EmailSectionType,
              show: s.show,
              data: s.data,
            }))}
            collectionOptions={collectionOptions}
            productOptions={products}
            showEditUrlHint={usesOrder}
          />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">Preview</h2>
          {usesOrder && (
            <form method="get" className="flex flex-wrap items-center gap-2">
              <label htmlFor="order" className="text-sm font-semibold">
                Preview using order:
              </label>
              <select
                id="order"
                name="order"
                defaultValue={selectedOrderNumber}
                className="rounded-xl border border-line px-3 py-1.5 text-sm"
              >
                {orderPickerOptions.map((o) => (
                  <option key={o.orderNumber} value={o.orderNumber}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-pill bg-blue px-4 py-1.5 text-sm font-bold text-white">
                Preview
              </button>
            </form>
          )}
          {previewHtml ? (
            <iframe
              title={`${EMAIL_KIND_LABELS[kind]} preview`}
              srcDoc={previewHtml}
              className="h-[700px] w-full rounded-card border border-line bg-white"
            />
          ) : (
            <p className="rounded-card bg-white p-8 text-center text-ink-soft shadow-sm shadow-ink/5">
              No pre-orders yet to preview against.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

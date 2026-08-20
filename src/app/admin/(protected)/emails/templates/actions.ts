"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage, InvalidImageError } from "@/lib/storage";
import {
  EMAIL_SECTION_TYPES,
  defaultSectionData,
  heroBannerSectionDataSchema,
  richTextSectionDataSchema,
  imageSectionDataSchema,
  collectionCardsSectionDataSchema,
  productCardsSectionDataSchema,
  ctaButtonSectionDataSchema,
  type EmailKind,
  type EmailSectionType,
} from "@/lib/validations/email-template";
import { flattenZodError } from "@/lib/validations/utils";

export type SectionFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export type SubjectFormState = { error?: string; fieldErrors?: Record<string, string> };

/** Every kind's EmailTemplate is created lazily the first time its editor
 * page is visited — same singleton-row-on-first-touch pattern as
 * SiteSettings/EmailDigest elsewhere in this app. */
export async function findOrCreateTemplate(kind: EmailKind) {
  const existing = await db.emailTemplate.findUnique({
    where: { kind },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });
  if (existing) return existing;

  return db.emailTemplate.create({
    data: { kind, subject: "Shokakko Australia" },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function updateTemplateSubject(
  kind: EmailKind,
  _prevState: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  await requireAdmin();
  const subject = formData.get("subject")?.toString().trim() ?? "";
  if (!subject) return { fieldErrors: { subject: "Subject is required" } };

  const template = await findOrCreateTemplate(kind);
  await db.emailTemplate.update({ where: { id: template.id }, data: { subject } });

  revalidatePath(`/admin/emails/templates/${kind}`);
  return {};
}

// --- Section list management (mirrors event-pages/actions.ts) -----------

export async function addSection(templateId: string, type: EmailSectionType): Promise<void> {
  await requireAdmin();
  if (!(EMAIL_SECTION_TYPES as readonly string[]).includes(type)) return;

  const template = await db.emailTemplate.findUnique({ where: { id: templateId } });
  if (!template) return;

  const maxSortOrder = await db.emailTemplateSection.aggregate({
    where: { templateId },
    _max: { sortOrder: true },
  });

  await db.emailTemplateSection.create({
    data: {
      templateId,
      type,
      data: defaultSectionData(type) as Prisma.InputJsonValue,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath(`/admin/emails/templates/${template.kind}`);
}

async function getSectionForUpdate(sectionId: string) {
  return db.emailTemplateSection.findUnique({
    where: { id: sectionId },
    include: { template: { select: { id: true, kind: true } } },
  });
}

export async function deleteSection(sectionId: string): Promise<void> {
  await requireAdmin();
  const section = await getSectionForUpdate(sectionId);
  if (!section) return;

  // Best-effort image cleanup for the two section types that store one —
  // same "don't leave orphaned uploads behind" precedent as Event Pages.
  const urls: string[] = [];
  if (section.type === "hero_banner") {
    const parsed = heroBannerSectionDataSchema.safeParse(section.data);
    if (parsed.success && parsed.data.imageUrl) urls.push(parsed.data.imageUrl);
  } else if (section.type === "image") {
    const parsed = imageSectionDataSchema.safeParse(section.data);
    if (parsed.success && parsed.data.url) urls.push(parsed.data.url);
  }

  await db.emailTemplateSection.delete({ where: { id: sectionId } });
  await Promise.all(urls.map((url) => storage.remove(url)));

  revalidatePath(`/admin/emails/templates/${section.template.kind}`);
}

export async function duplicateSection(sectionId: string): Promise<void> {
  await requireAdmin();
  const section = await getSectionForUpdate(sectionId);
  if (!section) return;

  await db.$transaction([
    db.emailTemplateSection.updateMany({
      where: { templateId: section.templateId, sortOrder: { gt: section.sortOrder } },
      data: { sortOrder: { increment: 1 } },
    }),
    db.emailTemplateSection.create({
      data: {
        templateId: section.templateId,
        type: section.type,
        show: section.show,
        data: section.data as Prisma.InputJsonValue,
        sortOrder: section.sortOrder + 1,
      },
    }),
  ]);

  revalidatePath(`/admin/emails/templates/${section.template.kind}`);
}

export async function reorderSections(templateId: string, orderedIds: string[]): Promise<void> {
  await requireAdmin();
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.emailTemplateSection.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
  const template = await db.emailTemplate.findUnique({ where: { id: templateId }, select: { kind: true } });
  if (template) revalidatePath(`/admin/emails/templates/${template.kind}`);
}

/** The ☑/☐ Show toggle — a section stays in the list either way, only
 * whether resolveTemplateSections() includes it in a real send changes. */
export async function toggleSectionShow(sectionId: string): Promise<void> {
  await requireAdmin();
  const section = await getSectionForUpdate(sectionId);
  if (!section) return;

  await db.emailTemplateSection.update({ where: { id: sectionId }, data: { show: !section.show } });
  revalidatePath(`/admin/emails/templates/${section.template.kind}`);
}

// --- Per-type section content updates ------------------------------------

export async function updateHeroBannerSection(
  sectionId: string,
  _prevState: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireAdmin();
  const section = await getSectionForUpdate(sectionId);
  if (!section) return { error: "Section not found." };

  const existing = heroBannerSectionDataSchema.safeParse(section.data);
  const existingUrl = existing.success ? existing.data.imageUrl : null;

  let imageUrl = existingUrl;
  const removeImage = formData.get("removeImage") === "on";
  const file = formData.get("image");
  try {
    if (file instanceof File && file.size > 0) {
      imageUrl = await storage.save(file);
    } else if (removeImage) {
      imageUrl = null;
    }
  } catch (err) {
    if (err instanceof InvalidImageError) return { error: err.message };
    throw err;
  }

  const linkUrl = formData.get("linkUrl")?.toString().trim() || null;

  await db.emailTemplateSection.update({
    where: { id: sectionId },
    data: { data: { imageUrl, linkUrl } as Prisma.InputJsonValue },
  });

  if (imageUrl !== existingUrl && existingUrl) await storage.remove(existingUrl);

  revalidatePath(`/admin/emails/templates/${section.template.kind}`);
  return {};
}

export async function updateRichTextSection(
  sectionId: string,
  _prevState: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireAdmin();
  const section = await getSectionForUpdate(sectionId);
  if (!section) return { error: "Section not found." };

  const raw = formData.get("html")?.toString() ?? "";
  const parsed = richTextSectionDataSchema.safeParse({ html: raw || null });
  if (!parsed.success) return { fieldErrors: flattenZodError(parsed.error) };

  await db.emailTemplateSection.update({
    where: { id: sectionId },
    data: { data: parsed.data as Prisma.InputJsonValue },
  });

  revalidatePath(`/admin/emails/templates/${section.template.kind}`);
  return {};
}

export async function updateImageSection(
  sectionId: string,
  _prevState: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireAdmin();
  const section = await getSectionForUpdate(sectionId);
  if (!section) return { error: "Section not found." };

  const existing = imageSectionDataSchema.safeParse(section.data);
  const existingUrl = existing.success ? existing.data.url : null;

  let url = existingUrl;
  const file = formData.get("image");
  try {
    if (file instanceof File && file.size > 0) {
      url = await storage.save(file);
    }
  } catch (err) {
    if (err instanceof InvalidImageError) return { error: err.message };
    throw err;
  }
  if (!url) return { error: "Please upload an image." };

  const linkUrl = formData.get("linkUrl")?.toString().trim() || null;
  const caption = formData.get("caption")?.toString().trim() || undefined;

  await db.emailTemplateSection.update({
    where: { id: sectionId },
    data: { data: { url, linkUrl, caption } as Prisma.InputJsonValue },
  });

  if (url !== existingUrl && existingUrl) await storage.remove(existingUrl);

  revalidatePath(`/admin/emails/templates/${section.template.kind}`);
  return {};
}

export async function updateCollectionCardsSection(
  sectionId: string,
  _prevState: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireAdmin();
  const section = await getSectionForUpdate(sectionId);
  if (!section) return { error: "Section not found." };

  const collectionIds = formData.getAll("collectionIds").map((v) => v.toString());
  const parsed = collectionCardsSectionDataSchema.safeParse({ collectionIds });
  if (!parsed.success) return { fieldErrors: flattenZodError(parsed.error) };

  await db.emailTemplateSection.update({
    where: { id: sectionId },
    data: { data: parsed.data as Prisma.InputJsonValue },
  });

  revalidatePath(`/admin/emails/templates/${section.template.kind}`);
  return {};
}

export async function updateProductCardsSection(
  sectionId: string,
  _prevState: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireAdmin();
  const section = await getSectionForUpdate(sectionId);
  if (!section) return { error: "Section not found." };

  const productIds = formData.getAll("productIds").map((v) => v.toString());
  const parsed = productCardsSectionDataSchema.safeParse({
    source: formData.get("source")?.toString() ?? "manual",
    productIds,
  });
  if (!parsed.success) return { fieldErrors: flattenZodError(parsed.error) };

  await db.emailTemplateSection.update({
    where: { id: sectionId },
    data: { data: parsed.data as Prisma.InputJsonValue },
  });

  revalidatePath(`/admin/emails/templates/${section.template.kind}`);
  return {};
}

export async function updateCtaButtonSection(
  sectionId: string,
  _prevState: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireAdmin();
  const section = await getSectionForUpdate(sectionId);
  if (!section) return { error: "Section not found." };

  const parsed = ctaButtonSectionDataSchema.safeParse({
    text: formData.get("text")?.toString() ?? "",
    url: formData.get("url")?.toString() ?? "",
  });
  if (!parsed.success) return { fieldErrors: flattenZodError(parsed.error) };

  await db.emailTemplateSection.update({
    where: { id: sectionId },
    data: { data: parsed.data as Prisma.InputJsonValue },
  });

  revalidatePath(`/admin/emails/templates/${section.template.kind}`);
  return {};
}

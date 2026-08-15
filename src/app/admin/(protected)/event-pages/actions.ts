"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage, InvalidImageError } from "@/lib/storage";
import {
  eventPageFormSchema,
  slugSchema,
  textSectionDataSchema,
  imageSectionDataSchema,
  gallerySectionDataSchema,
  buttonSectionDataSchema,
  defaultSectionData,
  PROTECTED_SLUGS,
  SECTION_TYPES,
  type SectionType,
} from "@/lib/validations/event-page";
import { flattenZodError } from "@/lib/validations/utils";

export type EventPageFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export type SectionFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function isProtectedSlug(slug: string): boolean {
  return (PROTECTED_SLUGS as readonly string[]).includes(slug);
}

/** Pulls every stored image URL out of a list of sections' `data` blobs
 * (image/gallery types only) — used for best-effort storage cleanup when
 * a section or a whole page is deleted. */
function collectImageUrls(sections: { type: string; data: unknown }[]): string[] {
  const urls: string[] = [];
  for (const section of sections) {
    if (section.type === "image") {
      const parsed = imageSectionDataSchema.safeParse(section.data);
      if (parsed.success && parsed.data.url) urls.push(parsed.data.url);
    } else if (section.type === "gallery") {
      const parsed = gallerySectionDataSchema.safeParse(section.data);
      if (parsed.success) {
        for (const img of parsed.data.images) if (img.url) urls.push(img.url);
      }
    }
  }
  return urls;
}

// --- Page CRUD ----------------------------------------------------------

export async function createEventPage(
  _prevState: EventPageFormState,
  formData: FormData,
): Promise<EventPageFormState> {
  await requireAdmin();

  const parsed = eventPageFormSchema.safeParse({
    title: formData.get("title")?.toString() ?? "",
    slug: formData.get("slug")?.toString() ?? "",
  });
  if (!parsed.success) return { fieldErrors: flattenZodError(parsed.error) };

  const conflict = await db.eventPage.findUnique({ where: { slug: parsed.data.slug } });
  if (conflict) return { fieldErrors: { slug: "This slug is already used by another page." } };

  const maxSortOrder = await db.eventPage.aggregate({ _max: { sortOrder: true } });
  const page = await db.eventPage.create({
    data: {
      title: parsed.data.title,
      slug: parsed.data.slug,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath("/admin/event-pages");
  redirect(`/admin/event-pages/${page.id}`);
}

export async function updateEventPage(
  id: string,
  _prevState: EventPageFormState,
  formData: FormData,
): Promise<EventPageFormState> {
  await requireAdmin();

  const existing = await db.eventPage.findUnique({ where: { id } });
  if (!existing) return { error: "Page not found." };

  const title = formData.get("title")?.toString().trim() ?? "";
  if (!title) return { fieldErrors: { title: "Title is required" } };

  // The two seeded pages' slugs are locked — the homepage nav pills and
  // the footer link to /how-to-preorder and /about-event by exact URL.
  let slug = existing.slug;
  if (!isProtectedSlug(existing.slug)) {
    const parsedSlug = slugSchema.safeParse(formData.get("slug")?.toString() ?? "");
    if (!parsedSlug.success) {
      return { fieldErrors: { slug: parsedSlug.error.issues[0]?.message ?? "Invalid slug" } };
    }
    slug = parsedSlug.data;
    if (slug !== existing.slug) {
      const conflict = await db.eventPage.findUnique({ where: { slug } });
      if (conflict) return { fieldErrors: { slug: "This slug is already used by another page." } };
    }
  }

  await db.eventPage.update({ where: { id }, data: { title, slug } });

  revalidatePath("/admin/event-pages");
  revalidatePath(`/admin/event-pages/${id}`);
  revalidatePath(`/${existing.slug}`);
  if (slug !== existing.slug) revalidatePath(`/${slug}`);
  return {};
}

export async function deleteEventPage(id: string): Promise<void> {
  await requireAdmin();
  const existing = await db.eventPage.findUnique({
    where: { id },
    include: { sections: true },
  });
  if (!existing) return;
  // Silently refuse — the admin UI already hides the delete control for
  // these two, this is the server-side backstop.
  if (isProtectedSlug(existing.slug)) return;

  const urls = collectImageUrls(existing.sections);

  await db.eventPage.delete({ where: { id } }); // cascades to sections

  await Promise.all(urls.map((url) => storage.remove(url)));

  revalidatePath("/admin/event-pages");
  revalidatePath(`/${existing.slug}`);
}

// --- Section list management ---------------------------------------------

export async function addSection(pageId: string, type: SectionType): Promise<void> {
  await requireAdmin();
  if (!(SECTION_TYPES as readonly string[]).includes(type)) return;

  const page = await db.eventPage.findUnique({ where: { id: pageId } });
  if (!page) return;

  const maxSortOrder = await db.pageSection.aggregate({
    where: { pageId },
    _max: { sortOrder: true },
  });

  await db.pageSection.create({
    data: {
      pageId,
      type,
      data: defaultSectionData(type) as Prisma.InputJsonValue,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath(`/admin/event-pages/${pageId}`);
  revalidatePath(`/${page.slug}`);
}

export async function deleteSection(sectionId: string): Promise<void> {
  await requireAdmin();
  const section = await db.pageSection.findUnique({
    where: { id: sectionId },
    include: { page: { select: { id: true, slug: true } } },
  });
  if (!section) return;

  const urls = collectImageUrls([section]);
  await db.pageSection.delete({ where: { id: sectionId } });
  await Promise.all(urls.map((url) => storage.remove(url)));

  revalidatePath(`/admin/event-pages/${section.page.id}`);
  revalidatePath(`/${section.page.slug}`);
}

export async function duplicateSection(sectionId: string): Promise<void> {
  await requireAdmin();
  const section = await db.pageSection.findUnique({
    where: { id: sectionId },
    include: { page: { select: { id: true, slug: true } } },
  });
  if (!section) return;

  // Shift every later section down one sortOrder slot, then insert the
  // copy right after the original — one transaction so ordering never
  // has a gap or a duplicate value partway through. The copy references
  // the same stored image URL(s) as the original (no re-upload) — it
  // only diverges once one of the two is independently edited.
  await db.$transaction([
    db.pageSection.updateMany({
      where: { pageId: section.pageId, sortOrder: { gt: section.sortOrder } },
      data: { sortOrder: { increment: 1 } },
    }),
    db.pageSection.create({
      data: {
        pageId: section.pageId,
        type: section.type,
        data: section.data as Prisma.InputJsonValue,
        sortOrder: section.sortOrder + 1,
      },
    }),
  ]);

  revalidatePath(`/admin/event-pages/${section.page.id}`);
  revalidatePath(`/${section.page.slug}`);
}

export async function reorderSections(pageId: string, orderedIds: string[]): Promise<void> {
  await requireAdmin();
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.pageSection.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
  const page = await db.eventPage.findUnique({ where: { id: pageId }, select: { slug: true } });
  revalidatePath(`/admin/event-pages/${pageId}`);
  if (page) revalidatePath(`/${page.slug}`);
}

async function getSectionForUpdate(sectionId: string) {
  return db.pageSection.findUnique({
    where: { id: sectionId },
    include: { page: { select: { id: true, slug: true } } },
  });
}

// --- Per-type section content updates -------------------------------------

export async function updateTextSection(
  sectionId: string,
  _prevState: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireAdmin();
  const section = await getSectionForUpdate(sectionId);
  if (!section) return { error: "Section not found." };

  const parsed = textSectionDataSchema.safeParse({
    title: formData.get("title")?.toString() ?? undefined,
    html: formData.get("html")?.toString() ?? "",
  });
  if (!parsed.success) return { fieldErrors: flattenZodError(parsed.error) };

  await db.pageSection.update({
    where: { id: sectionId },
    data: { data: parsed.data as Prisma.InputJsonValue },
  });

  revalidatePath(`/admin/event-pages/${section.page.id}`);
  revalidatePath(`/${section.page.slug}`);
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
  const existingUrl = existing.success ? existing.data.url : "";

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

  const caption = formData.get("caption")?.toString().trim() || undefined;

  await db.pageSection.update({
    where: { id: sectionId },
    data: { data: { url, caption } as Prisma.InputJsonValue },
  });

  if (url !== existingUrl && existingUrl) await storage.remove(existingUrl);

  revalidatePath(`/admin/event-pages/${section.page.id}`);
  revalidatePath(`/${section.page.slug}`);
  return {};
}

type ImageToken = { kind: "existing"; url: string } | { kind: "new"; fileIndex: number };

function parseImageOrderTokens(raw: string | null): ImageToken[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((t): t is string => typeof t === "string")
    .map((token): ImageToken | null => {
      if (token.startsWith("existing:")) {
        return { kind: "existing", url: token.slice("existing:".length) };
      }
      if (token.startsWith("new:")) {
        const fileIndex = Number(token.slice("new:".length));
        return Number.isInteger(fileIndex) ? { kind: "new", fileIndex } : null;
      }
      return null;
    })
    .filter((t): t is ImageToken => t !== null);
}

function parseCaptions(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((c) => (typeof c === "string" ? c : "")) : [];
  } catch {
    return [];
  }
}

export async function updateGallerySection(
  sectionId: string,
  _prevState: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireAdmin();
  const section = await getSectionForUpdate(sectionId);
  if (!section) return { error: "Section not found." };

  const existing = gallerySectionDataSchema.safeParse(section.data);
  const existingUrls = new Set(existing.success ? existing.data.images.map((i) => i.url) : []);

  const orderTokens = parseImageOrderTokens(formData.get("imageOrder")?.toString() ?? null);
  const captions = parseCaptions(formData.get("captions")?.toString() ?? null);
  const newFiles = formData.getAll("newImages").filter((f): f is File => f instanceof File);

  const images: { url: string; caption?: string }[] = [];
  try {
    for (let i = 0; i < orderTokens.length; i++) {
      const token = orderTokens[i];
      const caption = captions[i]?.trim() || undefined;
      if (token.kind === "existing") {
        images.push({ url: token.url, caption });
      } else {
        const file = newFiles[token.fileIndex];
        if (!file || file.size === 0) continue;
        const url = await storage.save(file);
        images.push({ url, caption });
      }
    }
  } catch (err) {
    if (err instanceof InvalidImageError) return { error: err.message };
    throw err;
  }

  await db.pageSection.update({
    where: { id: sectionId },
    data: { data: { images } as Prisma.InputJsonValue },
  });

  const keptUrls = new Set(images.map((i) => i.url));
  const removed = [...existingUrls].filter((url) => !keptUrls.has(url));
  await Promise.all(removed.map((url) => storage.remove(url)));

  revalidatePath(`/admin/event-pages/${section.page.id}`);
  revalidatePath(`/${section.page.slug}`);
  return {};
}

export async function updateButtonSection(
  sectionId: string,
  _prevState: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireAdmin();
  const section = await getSectionForUpdate(sectionId);
  if (!section) return { error: "Section not found." };

  const parsed = buttonSectionDataSchema.safeParse({
    text: formData.get("text")?.toString() ?? "",
    url: formData.get("url")?.toString() ?? "",
    openInNewTab: formData.get("openInNewTab") === "on",
  });
  if (!parsed.success) return { fieldErrors: flattenZodError(parsed.error) };

  await db.pageSection.update({
    where: { id: sectionId },
    data: { data: parsed.data as Prisma.InputJsonValue },
  });

  revalidatePath(`/admin/event-pages/${section.page.id}`);
  revalidatePath(`/${section.page.slug}`);
  return {};
}

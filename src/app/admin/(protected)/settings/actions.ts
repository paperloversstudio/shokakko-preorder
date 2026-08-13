"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage, InvalidImageError } from "@/lib/storage";
import { siteSettingsFormSchema } from "@/lib/validations/settings";
import { flattenZodError } from "@/lib/validations/utils";

export type SettingsFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export async function updateSiteSettings(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  await requireAdmin();

  const parsed = siteSettingsFormSchema.safeParse({
    eventName: formData.get("eventName")?.toString() ?? "",
    eventLocation: formData.get("eventLocation")?.toString() ?? "",
    eventInfo: formData.get("eventInfo")?.toString() ?? "",
    countdownTargetAt: formData.get("countdownTargetAt")?.toString() ?? "",
    preorderInfoHtml: formData.get("preorderInfoHtml")?.toString() ?? "",
    emailHeroLinkUrl: formData.get("emailHeroLinkUrl")?.toString() ?? "",
    emailContactUrl: formData.get("emailContactUrl")?.toString() ?? "",
    emailShippingPolicyUrl: formData.get("emailShippingPolicyUrl")?.toString() ?? "",
    emailWebsiteUrl: formData.get("emailWebsiteUrl")?.toString() ?? "",
    emailInstagramUrl: formData.get("emailInstagramUrl")?.toString() ?? "",
  });
  if (!parsed.success) return { fieldErrors: flattenZodError(parsed.error) };
  const values = parsed.data;

  const existing = await db.siteSettings.findUnique({ where: { id: "singleton" } });

  let logoUrl = existing?.logoUrl ?? null;
  const removeLogo = formData.get("removeLogo") === "on";
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    let newUrl: string;
    try {
      newUrl = await storage.save(logoFile);
    } catch (err) {
      if (err instanceof InvalidImageError) return { error: err.message };
      throw err;
    }
    if (existing?.logoUrl) await storage.remove(existing.logoUrl);
    logoUrl = newUrl;
  } else if (removeLogo && existing?.logoUrl) {
    await storage.remove(existing.logoUrl);
    logoUrl = null;
  }

  // Same upload/remove pattern as the site logo above, for the Update
  // Email's one static Hero Banner image (Sprint 3).
  let emailHeroImageUrl = existing?.emailHeroImageUrl ?? null;
  const removeEmailHeroImage = formData.get("removeEmailHeroImage") === "on";
  const emailHeroImageFile = formData.get("emailHeroImage");
  if (emailHeroImageFile instanceof File && emailHeroImageFile.size > 0) {
    let newUrl: string;
    try {
      newUrl = await storage.save(emailHeroImageFile);
    } catch (err) {
      if (err instanceof InvalidImageError) return { error: err.message };
      throw err;
    }
    if (existing?.emailHeroImageUrl) await storage.remove(existing.emailHeroImageUrl);
    emailHeroImageUrl = newUrl;
  } else if (removeEmailHeroImage && existing?.emailHeroImageUrl) {
    await storage.remove(existing.emailHeroImageUrl);
    emailHeroImageUrl = null;
  }

  const countdownTargetAt = values.countdownTargetAt
    ? new Date(values.countdownTargetAt)
    : null;
  // Tiptap's canonical "empty" output is "<p></p>", not "" — treat both as
  // "no content" so an untouched editor doesn't render a blank paragraph.
  const preorderInfoHtml =
    values.preorderInfoHtml && values.preorderInfoHtml !== "<p></p>"
      ? values.preorderInfoHtml
      : null;

  const emailFields = {
    emailHeroImageUrl,
    emailHeroLinkUrl: values.emailHeroLinkUrl || null,
    emailContactUrl: values.emailContactUrl || null,
    emailShippingPolicyUrl: values.emailShippingPolicyUrl || null,
    emailWebsiteUrl: values.emailWebsiteUrl || null,
    emailInstagramUrl: values.emailInstagramUrl || null,
  };

  await db.siteSettings.upsert({
    where: { id: "singleton" },
    update: {
      logoUrl,
      eventName: values.eventName || null,
      eventLocation: values.eventLocation || null,
      eventInfo: values.eventInfo || null,
      countdownTargetAt,
      preorderInfoHtml,
      ...emailFields,
    },
    create: {
      id: "singleton",
      logoUrl,
      eventName: values.eventName || null,
      eventLocation: values.eventLocation || null,
      eventInfo: values.eventInfo || null,
      countdownTargetAt,
      preorderInfoHtml,
      ...emailFields,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/admin/emails");
  return { success: true };
}

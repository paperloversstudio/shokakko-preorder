import { z } from "zod";

export const siteSettingsFormSchema = z.object({
  eventName: z.string().trim().max(200).optional(),
  eventLocation: z.string().trim().max(200).optional(),
  eventInfo: z.string().trim().max(1000).optional(),
  // Raw value from an <input type="datetime-local">, e.g. "2026-09-20T18:00".
  countdownTargetAt: z.string().trim().optional(),
  // HTML from the admin's Tiptap editor — see prisma/schema.prisma's
  // comment on SiteSettings.preorderInfoHtml for the sanitization approach.
  preorderInfoHtml: z.string().optional(),
  // --- Email settings (Sprint 3) ---
  emailHeroLinkUrl: z.string().trim().max(500).optional(),
  emailContactUrl: z.string().trim().max(500).optional(),
  emailShippingPolicyUrl: z.string().trim().max(500).optional(),
  emailWebsiteUrl: z.string().trim().max(500).optional(),
  emailInstagramUrl: z.string().trim().max(500).optional(),
});

export type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;

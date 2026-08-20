import { z } from "zod";

export const emailDigestFormSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200),
  karenNotesHtml: z.string().optional(),
  showKarenNotes: z.boolean().default(false),
  showCollections: z.boolean().default(false),
  showRecommended: z.boolean().default(false),
  showNewProducts: z.boolean().default(false),
  showPriceUpdates: z.boolean().default(false),
  showSoldOut: z.boolean().default(false),
  ctaText: z.string().trim().min(1, "Button text is required").max(60),
  ctaUrl: z.string().trim().min(1, "Button URL is required").max(500),
});

export type EmailDigestFormValues = z.infer<typeof emailDigestFormSchema>;

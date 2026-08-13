import { z } from "zod";

export const MAX_HERO_BANNERS = 5;

export const bannerFormSchema = z.object({
  headline: z.string().trim().min(1, "Headline is required").max(200),
  description: z.string().trim().max(500).optional(),
  buttonText: z.string().trim().max(60).optional(),
  buttonUrl: z.string().trim().max(500).optional(),
  isActive: z.string().optional(), // checkbox: "on" or missing
});

export type BannerFormValues = z.infer<typeof bannerFormSchema>;

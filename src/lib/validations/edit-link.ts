import { z } from "zod";

/** "Send Me My Edit Link" form (Sprint 5, /my-preorders). Same email
 * validation shape as `orderFormSchema.customerEmail` — kept as its own
 * small schema rather than importing that one field out of a bigger
 * object, since this form has nothing else in it. */
export const requestEditLinkSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
});

export type RequestEditLinkValues = z.infer<typeof requestEditLinkSchema>;

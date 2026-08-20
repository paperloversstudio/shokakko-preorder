import "server-only";
import { render } from "@react-email/render";
import { GenericEmail } from "./templates/GenericEmail";
import type { GenericEmailData } from "./data/generic";

/** One render function for every email kind, post-Sprint-6's Email
 * Template Manager — replaces the 4 separate renderXEmail() functions
 * that each targeted one fixed template file. */
export async function renderGenericEmail(data: GenericEmailData): Promise<string> {
  return render(GenericEmail({ data }));
}

import "server-only";
import { nanoid } from "nanoid";

/** Random, unguessable token behind the future /edit/[token] Pre-order
 * Workspace page (not built yet — see PreOrder.editToken's schema comment)
 * and the shokakko_preorder_token cookie that links an ongoing wishlist to
 * a submitted order. 24 chars of nanoid's default alphabet is comfortably
 * enough entropy for a bearer-style secret at this app's stakes. */
export function generateEditToken(): string {
  return nanoid(24);
}

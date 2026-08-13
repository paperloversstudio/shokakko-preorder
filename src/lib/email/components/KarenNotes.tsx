import { emailBrand, emailFontFamily } from "./brand";

/**
 * Email Design System — Karen's Notes. Rich text, admin-editable from the
 * Notification Centre (reuses the existing `PreorderInfoEditor` Tiptap
 * component, same constrained paragraphs/bold/italic/lists/links schema as
 * the checkout page's pre-order info — see prisma/schema.prisma's comment
 * on SiteSettings.preorderInfoHtml for why that output is safe to render
 * via dangerouslySetInnerHTML without a separate sanitizer). Optional —
 * renders nothing if hidden or empty, exactly like preorderInfoHtml today.
 */
export function KarenNotes({ html }: { html: string | null }) {
  if (!html) return null;

  return (
    <tr>
      <td style={{ padding: "16px 32px 0" }}>
        <div
          style={{
            fontFamily: emailFontFamily,
            fontSize: 14,
            lineHeight: 1.6,
            color: emailBrand.ink,
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </td>
    </tr>
  );
}

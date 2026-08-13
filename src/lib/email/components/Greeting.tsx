import { emailBrand, emailFontFamily } from "./brand";

/**
 * Email Design System — Greeting. "Hi {{first_name}}," — first name only
 * (see src/lib/email/first-name.ts), reused across all three templates.
 */
export function Greeting({ firstName }: { firstName: string }) {
  return (
    <tr>
      <td style={{ padding: "8px 32px 0" }}>
        <p
          style={{
            fontFamily: emailFontFamily,
            fontSize: 18,
            fontWeight: 600,
            color: emailBrand.ink,
            margin: 0,
          }}
        >
          Hi {firstName},
        </p>
      </td>
    </tr>
  );
}

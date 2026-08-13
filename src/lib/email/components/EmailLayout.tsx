import type { ReactNode } from "react";
import { emailBrand } from "./brand";

/**
 * Outer document shell every template wraps its composed sections in —
 * not one of the 8 named Design System components, just the `<html>`/
 * `<head>`/600px-table plumbing they all sit inside. Declares the
 * `.grid-col` responsive rule once (33.33% desktop → 50% mobile) that
 * `ResponsiveCardGrid` relies on, and a best-effort Google Fonts import
 * for Poppins (honored by some clients — e.g. Apple Mail, the Gmail app —
 * stripped by others, which fall back to the inline sans-serif stack;
 * see src/lib/email/components/brand.ts).
 *
 * Known limitation: Outlook's desktop client doesn't run the media query
 * below, so the 3-column desktop layout shows there regardless of screen
 * size — a standard, accepted email-dev trade-off, not fixed this sprint.
 */
export function EmailLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <html>
      {/* This is a standalone HTML email document rendered to a string by
          @react-email/render, not a Next.js page — next/head doesn't apply
          here, a real <head>/<html>/<body> and a direct Google Fonts
          <link> are correct and necessary. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          .grid-col { width: 33.333%; }
          @media only screen and (max-width: 480px) {
            .grid-col { width: 50% !important; }
          }
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: emailBrand.mint }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "24px 12px" }}>
                <table
                  role="presentation"
                  width="600"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    width: "100%",
                    maxWidth: 600,
                    backgroundColor: emailBrand.cream,
                    borderRadius: 24,
                    overflow: "hidden",
                  }}
                >
                  <tbody>{children}</tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

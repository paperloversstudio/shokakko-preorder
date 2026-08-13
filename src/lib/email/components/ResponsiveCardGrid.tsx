import type { ReactNode } from "react";

/**
 * Internal layout primitive — not one of the 8 named Design System
 * components, just the shared grid mechanic behind them: "3 cards per row
 * desktop, 2 per row mobile." Used by both `ProductCard` (Karen's Picks /
 * New Products / Price Updates — same grid, no duplicate layouts) and
 * `CollectionCard`.
 *
 * Classic email "hybrid" responsive grid: fluid `inline-block` columns
 * (not a `<table>` with a fixed 3-per-row assumption) so any item count
 * wraps naturally, switching from 33.33% to 50% width via the `.grid-col`
 * media query rule declared once in `EmailLayout`'s `<style>` block.
 * `fontSize: 0` on the wrapper removes the whitespace gap `inline-block`
 * elements otherwise leave between each other.
 */
export function ResponsiveCardGrid({ children }: { children: ReactNode[] }) {
  return (
    <tr>
      <td style={{ padding: "8px 20px", fontSize: 0, textAlign: "center" }}>
        {children.map((child, i) => (
          <div
            key={i}
            className="grid-col"
            style={{ display: "inline-block", verticalAlign: "top", width: "33.333%" }}
          >
            <div style={{ padding: 12 }}>{child}</div>
          </div>
        ))}
      </td>
    </tr>
  );
}

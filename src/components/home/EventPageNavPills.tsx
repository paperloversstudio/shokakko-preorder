import Link from "next/link";

/**
 * Sprint 4 — two homepage pill links to the seeded Event Pages, sitting
 * directly under the hero banner. Deliberately its own component (not
 * folded into FilterGroups/ProductToolbar) so it stays structurally
 * separate from Product Filters, per the sprint brief's explicit
 * requirement. Outline-pill styling matches FilterChips'/unselected-
 * VariantPills' existing language rather than introducing a new pill
 * treatment.
 */
export function EventPageNavPills() {
  return (
    <nav
      aria-label="Event information"
      className="mx-auto flex w-full max-w-6xl flex-wrap justify-center gap-2 px-4 py-3"
    >
      <Link
        href="/how-to-preorder"
        className="rounded-pill border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-mint/30"
      >
        How to Pre-order
      </Link>
      <Link
        href="/about-event"
        className="rounded-pill border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-mint/30"
      >
        About the Event
      </Link>
    </nav>
  );
}

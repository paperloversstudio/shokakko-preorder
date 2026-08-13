# Changelog

Notable changes to the Shokakko Australia pre-order site, newest first.

## Milestone 1 — Staging Deployment Prep (2026-08-13)

Prepares the project for a staging deployment on Vercel — **no
deployment, DNS change, or Sprint 4 work happened in this milestone**,
per your explicit scope. See `docs/DEPLOYMENT.md` for the full guide and
`docs/TESTING_CHECKLIST.md` for the QA pass to run once staging is live.

### Added

- **Git repository initialized** — this project had no version control
  until now. `main` as the default branch, initial commit covers the
  full Sprint 1–3 state.
- **Site-wide staging Basic Auth gate** (`src/proxy.ts`) — when
  `STAGING_BASIC_AUTH_USER`/`STAGING_BASIC_AUTH_PASSWORD` are both set,
  every route (not just `/admin`) requires an HTTP Basic Auth login
  first. Inactive locally and on any future real production deploy
  unless explicitly configured.
- **`docs/DEPLOYMENT.md`** — local development, git workflow, Vercel
  deployment, GoDaddy DNS configuration, environment variables,
  production checklist, rollback procedure, common deployment issues.
- **`docs/TESTING_CHECKLIST.md`** — full manual QA checklist (homepage,
  products, filters, wishlist, cart, checkout, admin, Notification
  Centre, responsive breakpoints, cross-browser, performance).
- A real project `README.md`, replacing the generic `create-next-app`
  boilerplate.
- `"postinstall": "prisma generate"` in `package.json` — required for
  Vercel's build (nothing previously triggered Prisma Client generation
  outside local dev's manual commands).
- `BASE_URL` and `EMAIL_API_KEY` reserved (unused) environment variables,
  for a future non-request email-sending context and whichever provider
  Sprint 4 eventually picks.

### Changed

- **`.env` hygiene fixed**: `ADMIN_PASSWORD`/`SESSION_SECRET` moved out
  of the committed `.env` into a new, gitignored `.env.local` — `.env`
  now holds only genuinely non-secret shared defaults, matching what its
  own header comment already claimed but didn't actually enforce.
- **`.gitignore`** — the previous `.env*` pattern would have also
  excluded the intentionally-committed `.env`/`.env.example`; narrowed to
  the standard `.env*.local` pattern. Also added `/dev.db` and
  `/dev.db-journal` (previously untracked by accident, not by rule — a
  real risk once this became a git repo, since the dev database can hold
  real customer data).

### Reviewed, not changed

- `src/lib/db.ts`, `src/lib/storage/index.ts` — both already fully
  env-var-driven and swappable (Turso/hosted libSQL, Vercel Blob) with no
  code changes needed for staging, per their existing design.
- No hardcoded `localhost` URLs found anywhere in application code — the
  two places `localhost` appears (`src/lib/email/site-url.ts`, the order
  confirmation page) both derive the site's origin dynamically from the
  incoming request, which already works correctly across
  local/staging/production without configuration.
- `LOGO_URL` — deliberately **not** added as an env var despite being in
  the milestone brief's example list; the logo is admin-uploaded and
  stored in the database (`SiteSettings.logoUrl`), editable live without
  a redeploy — an already-shipped feature that an env var would regress.
- `EMAIL_PROVIDER` — this project already has the equivalent
  `EMAIL_DRIVER` (Sprint 3); kept as-is rather than introducing a second
  name for the same concept.

## Sprint 3 — Email Communication System (2026-08-13)

Builds the complete email template system and an admin Notification
Centre — **no real email provider is wired up yet**, per your explicit
scope decision. Planned via `.claude/plans/noble-chasing-whisper.md`; see
`docs/PRD.md` §2.16/§4.7b for the full current-state documentation and
`PROJECT_NOTES.md` for the decision log.

### Added

- **Email Design System** (`src/lib/email/components/`): 8 independent,
  reusable components — Header, Hero Banner, Greeting, Karen's Notes,
  Collection Card, Product Card, CTA Button, Footer. The same `ProductCard`
  instance backs Karen's Picks, New Products, *and* Price Updates — no
  duplicate layouts. Responsive product/collection grids: 3 cards per row
  on desktop, 2 on mobile.
- **Three email templates**: Confirmation Email (placeholder layout —
  Header, Greeting, Order Summary, CTA, Footer), Update Email (the
  primary reusable "what's new" email — Header, Hero Banner, Greeting,
  Karen's Notes, Collections, Karen's Picks, New Products, Price Updates,
  CTA, Footer), Reminder Email (placeholder layout — Header, Greeting,
  Countdown, CTA, Footer). Confirmation/Reminder are intentionally
  placeholder — no Canva design has been shared yet; only their HTML will
  need to change once it is.
- **Notification Centre** (`/admin/emails`): edit a single "current
  draft" Update Email — toggle each optional section, write Karen's
  Notes (reusing the existing Tiptap editor), pick which Collections and
  which products to feature, set the CTA button text/URL and subject —
  with a live preview alongside. **Generate Email** renders the final
  HTML, saves it, computes New Products/Price Updates automatically from
  live product data, and prepares the recipient list — it does not send
  anything. A disabled "Send Update" button marks where real sending
  will go. `/admin/emails/history` lists every digest ever generated;
  `/admin/emails/confirmation` and `/admin/emails/reminder` are live
  preview harnesses against any real order.
- **"Mark as New" product toggle** — a manual admin checkbox
  (`Product.isNew`) driving the Update Email's New Products section.
- **Price Updates tracking** — `Product.lastNotifiedPriceCents` records
  the price baseline; a product only appears in Price Updates once its
  current price differs from that baseline, and the baseline advances
  when Generate Email captures the change.
- **Collections**: `/admin/collections` manages a square image per
  product tag (new — collections had no image before); `/collections`
  and `/collections/[id]` are the public pages an email's Collection
  Card links to.
- **Unsubscribe**: `/unsubscribe/[token]` sets `PreOrder.unsubscribedAt`,
  excluding that customer from future digest recipient lists. Reachable
  directly by URL — the one deliberate exception to this app's
  "every mutation is a Server Action" convention, since an email-client
  link click has no JS to invoke one from.
- **Email settings** (Admin Settings page): one hero image + link for the
  Update Email, and admin-editable Contact Us / Shipping Policy / Website
  / Instagram links for every email's Footer — independent of the
  site-wide header/footer, which are unchanged.
- **`EmailService` interface** (`src/lib/email/types.ts`) — a swappable
  send abstraction, same pattern as the existing image `StorageAdapter`.
  Its only implementation this sprint logs instead of sending. No
  provider is hard-coded anywhere, per your explicit instruction.

### Changed

- Nothing existing was modified in place — every Sprint 3 change is a new
  route, a new optional schema field, or a new admin form section.

### Database

- `Product.isNew` (new, default `false`), `Product.lastNotifiedPriceCents`
  (new, nullable, seeded to the starting price on create).
- `Tag.imageUrl` (new, nullable).
- `PreOrder.unsubscribedAt` (new, nullable).
- `SiteSettings.emailHeroImageUrl` / `emailHeroLinkUrl` /
  `emailContactUrl` / `emailShippingPolicyUrl` / `emailWebsiteUrl` /
  `emailInstagramUrl` (all new, nullable).
- `EmailDigest` (new table) — one prepared Update Email; `EmailDigestItem`
  (new table) — snapshotted New Products/Price Updates entries.
- Purely additive migration, same shape as every migration since the UI
  Refinement Pass — `prisma migrate dev` applied it directly, no manual
  workaround needed.

### New dependency

- **`@react-email/render`** — turns the Email Design System's React
  components into email-client-safe HTML strings. `@react-email/components`
  (a bundled component library) was deliberately **not** installed — at
  install time it and its entire sub-package tree showed as deprecated on
  npm, so the 8 components are hand-built from plain HTML elements instead.

### Not in this sprint (explicitly out of scope, per your scope decisions)

- Any real email provider/sending — `EmailService` has no implementation
  beyond a console no-op. "Generate Email" never calls `.send()`.
- Real Canva-designed Confirmation/Reminder templates — placeholders only.
- Wishlist/Pre-order-targeted digest recipients and a scheduled daily
  digest — named in the brief's "Future Compatibility" section and
  explicitly not built; today's recipient list is a broadcast to every
  non-unsubscribed customer.
- Wiring Confirmation Email to fire automatically on checkout, or any
  trigger for Reminder Email.

## Sprint 2 — Wishlist & Pre-order Workspace (2026-08-11)

Makes the wishlist durable across visits once a customer places their
first pre-order, adds a wishlist-only filter and a mobile bottom-sheet
drawer, and lays the database/architecture groundwork for the future
"Edit My Pre-order" page — without building that page yet. Planned via
`.claude/plans/noble-chasing-whisper.md`; see `docs/PRD.md` §2.3/§4.7/§4.7a
for the full current-state documentation and `PROJECT_NOTES.md` for the
decision log.

### Added

- **Durable wishlist**: before a customer's first pre-order, the wishlist
  behaves exactly as before (`localStorage` only, survives refresh/browser
  restart, linked to that browser). The moment they submit their first
  pre-order, their wishlist migrates into the database, attached to that
  order, and a `shokakko_preorder_token` cookie (1-year expiry) keeps that
  browser linked to it going forward — every later visit (and every later
  wishlist change) reads and writes the database instead of
  `localStorage`, automatically, with no separate "sign in" step.
- **Header wishlist icon** now switches ♡ → ❤️ once anything is saved
  (was always ♡), alongside the existing numeric badge.
- **Wishlist filter** ("♡ Wishlist" checkbox in the filter sidebar/drawer)
  — narrows the product grid to only wishlisted items, composing with the
  existing Search/Brand/Collection/Type/price filters rather than
  replacing them.
- **Wishlist drawer**: now shows Brand and a live **Product Status**
  indicator per item (🟢 Available / 🟡 Price Coming Soon / 🔴 Sold Out,
  computed fresh on every render — never a stale snapshot). "Add to cart"
  renamed to **"Move to Pre-order"** — adds qty 1 to the cart and removes
  the item from the wishlist in one click, both counters updating
  instantly with no page reload. On mobile, the drawer is now a full-width
  **bottom sheet** (slides up, rounded top corners) instead of the
  side-panel every other drawer uses — reverts to the same ~30%-width side
  panel on tablet/desktop.
- **Secure edit token architecture (prep only, per explicit scope
  decision — see `PROJECT_NOTES.md`)**: every new pre-order now gets a
  random, unique `editToken`, stored on the `PreOrder` row. The order
  confirmation page ("Success Page") now shows the future
  `/edit/{token}` URL as read-only text plus a **Copy Link** button, with
  a note that email delivery and the edit page itself are coming in a
  future sprint — the URL is generated and stored but the page it points
  to does **not** exist yet (visiting it today would 404, by design, not
  by oversight).

### Changed

- Root layout (`src/app/layout.tsx`) is now an `async` Server Component —
  reads the wishlist-link cookie server-side and passes initial wishlist
  state into `WishlistProvider`, rather than the client fetching it after
  mount.

### Database

- `PreOrder.editToken` (new, nullable, unique) — the secure token
  described above.
- `WishlistItem` (new table) — one row per wishlisted product per
  `PreOrder`, cascade-deletes with either side. Deliberately **not** a
  snapshot (unlike `OrderItem`) — the wishlist's whole point is live
  status, so it's a plain reference to the current product.
- Purely additive migration, same shape as the UI Refinement Pass's
  `preorderInfoHtml` column — no expand/backfill/contract sequence
  needed. Karen's one pre-existing real order was backfilled with a
  generated `editToken` for consistency.

### Not in this sprint (explicitly out of scope, per your scope decisions)

- The `/edit/[token]` page itself — only the token and the (inert) URL are
  generated and stored this sprint.
- Any email sending — the order confirmation page is the only place a
  customer sees their edit link today.
- Multiple Events, a Wholesale Catalogue, and the three Notify-when-…
  features named in the brief — the schema was checked for compatibility
  with all of these (see `docs/PRD.md` §16) but nothing was built for them.

## UI Refinement Pass (2026-08-08)

A smaller, targeted pass on top of Sprint 1 — global font, header layout,
product-card/detail changes, and checkout-page content. Planned via
`.claude/plans/noble-chasing-whisper.md`.

### Added

- **Product Details page** (`/product/[id]`): full-size image gallery
  (supports multiple photos), name, brand, description, type, status,
  price (or "Price Coming Soon"), a Wishlist button, and an "Add to
  Pre-order" button that swaps to the usual quantity stepper once the item
  is in the cart. Every product card's photo and name now link here.
- **Admin: Pre-order Information rich text editor** — a WYSIWYG editor
  (Tiptap) on the Settings page for content that renders above the
  checkout form, editable without touching code. Schema deliberately
  limited to paragraphs/bold/italic/lists/links.
- **Checkout: shipping notice** — "Tax included. Shipping fee may apply.
  For details, please refer to our Shipping Policy." below the order
  summary, linking to the real shipping policy page in a new tab.
- **Footer** on every customer-facing page (`/`, `/checkout`,
  `/product/[id]`, `/order/[orderNumber]`, `/my-preorders`) — "Contact Us"
  and "Shipping Policy" links, both opening in a new tab. Not on `/admin/*`.

### Changed

- **Font**: the whole site (customer pages, checkout, admin, buttons,
  forms, nav, product cards) now uses a single font, Poppins — replaces
  the previous two-font pairing (Baloo 2 for headings, Nunito for body).
- **Header**: the logo moved to top-center (was left-aligned) and is
  roughly 2x its previous size, on a 3-column grid so it's genuinely
  centered regardless of the icon cluster's width.
- **Product cards**: collection tags are no longer shown on the card
  (filtering by collection still works — the sidebar/drawer filter and
  admin views are unaffected); the unknown-price label changed from
  "Coming Soon" to "Price Coming Soon" everywhere it appears (catalog,
  checkout, order confirmation, admin).
- **Checkout logo**: the "Shokakko Australia" text is replaced with the
  admin-uploaded logo (falls back to the text if none is uploaded, same
  pattern as the main header).

### Fixed

- Header logo wasn't *exactly* centered on narrow (mobile) viewports — a
  CSS grid quirk where a bare `1fr` track's implicit content-based minimum
  let the icon cluster's column grow wider than its "fair share," pushing
  the center column off true center. Fixed with `minmax(0,1fr)` on the
  flanking columns.

### Database

- `SiteSettings.preorderInfoHtml` (new, nullable) — holds the admin's
  rich-text checkout content. Purely additive, no data-loss risk, applied
  as a single ordinary migration (unlike Sprint 1's imageUrl/isActive
  removal, this needed no expand/backfill/contract sequence).

### New dependency

- **Tiptap** (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`) for the
  admin rich text editor — the one deviation from the project's
  zero-new-dependencies pattern so far; genuine WYSIWYG editing isn't
  reasonably hand-rollable with native `contentEditable`.

## Sprint 1 — Customer Browsing Experience & Homepage Redesign (2026-08-08)

Full homepage redesign plus the admin capabilities needed to drive it.
Planned via `.claude/plans/noble-chasing-whisper.md`; see `docs/PRD.md` for
the full current-state documentation and `PROJECT_NOTES.md` for the
session-by-session decision log.

### Added

**Customer-facing**
- Redesigned homepage: header (admin-uploadable logo, cart/wishlist/"My
  Pre-order" icons with live badge counts), a hero banner carousel (up to 5
  admin-managed banners, auto-rotating, true responsive desktop/tablet/
  mobile images), an event-info strip with a live countdown, a search + sort
  toolbar, and a filter sidebar (desktop)/drawer (mobile & tablet) —
  multi-select Brand/Collection/Type, a Sold Out toggle, and a price range.
- Responsive product grid: 2 columns mobile, 3 tablet, 4 desktop, denser
  cards than before.
- Wishlist: heart toggle on every card (♡ ↔ ❤️), persisted to
  `localStorage` only (no account, no database table) — a header icon opens
  a drawer listing wishlisted items with quick "Add to cart."
- Cart drawer: adding an item auto-opens a right-side drawer (persisted to
  `localStorage`, ~30% width on desktop, near-full-width on mobile/tablet)
  showing image/name/price/quantity/subtotal per line, with a "Next Step"
  button that proceeds to checkout without forcing an immediate redirect on
  every add.
- New `/checkout` page: itemized cart summary with medium product images,
  the pre-order form (unchanged fields), "Save My Pre-order" button.
- New `/my-preorders`: placeholder page for the future accountless,
  email-based "retrieve my pre-order" flow. Not implemented yet — Sprint 1
  ships the page and explanatory copy only.
- Floating admin-login button on the homepage.
- Sold-out products are shown (not hidden) with a badge and a disabled
  quantity control, per the new Product Status field.

**Admin**
- Multi-photo product uploads with drag-and-drop reordering (native HTML5
  drag events, no new dependency) — replaces the old single-photo field.
- Product Type (free text, same pattern as Brand) and Product Status
  (Active / Draft / Sold Out) — replaces the old visible/hidden checkbox.
- Hero Banner management (`/admin/banners`): up to 5 banners, each with
  headline/description/button text+URL and three responsive image uploads
  (1920×600 desktop, 1600×500 tablet, 1080×1350 mobile), drag-to-reorder,
  and an enable/disable toggle per banner.
- Site Settings (`/admin/settings`): homepage logo upload, event name/
  location/info, and an optional countdown target date/time.
- Sequential order numbers (`PO1001`, `PO1002`, …) — see "Changed" below.

### Changed

- **Order numbers**: replaced the random `SHK-YYMMDD-XXXX` format with a
  gap-free, sequential counter (`PO1001`, `PO1002`, …) that only ever
  increments — deleting a pre-order never frees or reuses its number. Shown
  everywhere an order number already appeared (admin list/detail, the
  customer confirmation page); no email/CSV export/customer-edit-page work
  was in scope for this sprint.
- `Product.imageUrl` (single image) → `Product.images` (`ProductImage[]`,
  ordered, admin-sortable). Existing photos were backfilled automatically
  during migration — nothing was lost.
- `Product.isActive` (boolean) → `Product.status` (`"active"` |
  `"draft"` | `"sold_out"`). Existing values were backfilled 1:1
  (`true` → `active`, `false` → `draft`).
- Customer catalog query now reads live on every request (unchanged from
  before this sprint — still `force-dynamic`), and additionally fetches
  hero banners and site settings.

### Removed

- `OrderSheet.tsx`, `CartBar.tsx`, `TagFilter.tsx`, `OrderForm.tsx` — all
  superseded by the new header/hero/toolbar/filter/grid composition, the
  cart drawer, and the checkout page (`PreOrderFormFields.tsx` +
  `CheckoutForm.tsx`).

### Fixed (found after initial sprint verification, during real usage)

- **Hero banner uploads failed with "Body exceeded 1 MB limit" / "Unexpected
  end of form"** — real photo uploads (unlike the small test images used
  during initial verification) hit two separate, undocumented-by-default
  Next.js request-size ceilings: Server Actions cap request bodies at 1MB by
  default, and `src/proxy.ts` (middleware, matches every `/admin/*` route)
  separately caps request bodies it reads at 10MB by default. A hero
  banner's three full-size images together routinely exceed both. Fixed by
  raising both limits in `next.config.ts`
  (`experimental.serverActions.bodySizeLimit` and
  `experimental.proxyClientMaxBodySize`, both to `"40mb"`) — per-file
  size/type validation (`assertValidImage`, 8MB/file) is unchanged and
  still runs once the request actually reaches the Server Action.
- **Console warning on every admin form**: "Cannot specify a encType or
  method for a form that specifies a function as the action" — an
  unnecessary `encType="multipart/form-data"` attribute on `ProductForm`,
  `BannerForm`, and `SettingsForm`'s `<form>` elements; React 19 sets this
  automatically for Server Action forms. Removed from all three.

### Not in this sprint (explicitly out of scope)

- Wishlist persistence to a database, or linking it to a customer identity.
- Any email sending (order confirmation, "retrieve my pre-order," etc.).
- The real "Retrieve My Pre-order" email-lookup flow.
- CSV export of pre-orders.
- A customer-facing order-edit page.
- Customer accounts/login of any kind.

---

## Phase 1 (2026-08-08)

Initial build: schema, admin auth, product/pre-order admin CRUD, the
original single-page customer catalog + order form, image storage adapter.
See `docs/PRD.md` for full details of what shipped in this phase (folded
into "Implemented Features" rather than kept as a separate historical
section, since Sprint 1 substantially changed or replaced most of the
customer-facing surface described there).

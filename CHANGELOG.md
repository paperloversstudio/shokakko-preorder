# Changelog

Notable changes to the Shokakko Australia pre-order site, newest first.

## Sprint 6 — Communication Platform (2026-08-20)

Connects the Email Architecture (Sprint 3), the Self-Service Portal
(Sprint 5), and the Notification Centre (Sprint 3) into one real
communication platform. This is the first sprint that actually sends
email — every prior sprint built the templates, the admin authoring
experience, and the interface, but nothing ever left the server.
Provider-independent by design: nothing built this sprint hard-codes the
app to Resend specifically.

### Added

- **A real `EmailService` driver** — `resendEmailService`
  (`src/lib/email/resend.ts`), sending through the Resend API, selected
  via `EMAIL_DRIVER=resend`. Local dev is unaffected (still defaults to
  the console driver). Swapping to a different provider later (SES,
  Brevo, SMTP) is the same shape again: one new file, one new case in
  the driver selector, no call-site changes.
- **An Email Queue** (`src/lib/email/queue.ts`, backed by a new
  `EmailLog` table) — every real send now goes through
  Queue → Worker → Resend instead of calling the provider directly.
  Tracks `pending` → `sending` → `sent`/`failed`, the provider's message
  id, and the real error message on failure.
- **Automatic Confirmation Email** — fires on every successful checkout,
  best-effort (never blocks the order). Customer name, order number,
  event name, itemized order summary, an Edit My Pre-order button (the
  secure token itself is never shown as text), contact info, footer.
- **A real "Retrieve My Pre-order"** — `requestEditLink` now actually
  sends the Edit Link Email instead of logging to console. The
  privacy-preserving behavior (identical message whether or not an
  order exists) is unchanged.
- **Automatic Reminder Email** — fires 24 hours before the event
  countdown closes, via a new cron route
  (`src/app/api/cron/emails/route.ts`, this project's first API route)
  on a daily Vercel Cron schedule (Hobby-plan limit — see Fixed, below).
  Event name, countdown, an Edit My Pre-order button, contact info.
  Respects each customer's own "Remind me 24 hours before preorder
  closes" preference.
- **A real "Send Update"** — the Notification Centre's Send Update
  button now actually sends, personalizing each recipient's copy
  against their own New Products/Price Updates notification
  preferences, and skipping a recipient entirely if nothing would show
  them anything. Only one email goes out per customer.
- **A new "Sold Out" section** on the Update Email — automatically
  computed (mirrors how New Products/Price Updates already work), with
  its own admin toggle.
- **Email Logs** (`/admin/emails/logs`) — every attempted send, any
  status, with recipient/template/status/sent time/provider/error, and
  a Retry button on failed rows.
- **Notification Dashboard** (`/admin/emails/dashboard`) — Emails Sent
  Today / Pending / Failed tiles, Daily Digest History, Reminder
  History.
- **A stuck-email sweep** — the same cron route retries any queued email
  stuck `pending`/`sending` for more than 10 minutes, so a crash
  mid-request or a provider outage doesn't silently lose a send.

### Scope note

Confirmed with you before building: for Sprint 6, implement Resend
specifically, behind the existing swappable `EmailService` interface —
no other provider needed this sprint. "Mark as published" (advancing
`Product.lastNotifiedPriceCents`/the new `lastNotifiedStatus`/`isNew`)
moved from Generate Email time to actual Send time, since there's now a
real send to hang it off — Generate can be re-clicked freely without
consuming the diff it's only meant to preview. Karen's Notes/
Collections/Karen's Picks/Sold Out are not gated by any customer
preference — every non-unsubscribed recipient the admin included sees
those regardless; only New Products, Price Updates, and the Reminder are
preference-gated, matching exactly the three toggles Sprint 5 already
built. Scheduled Digest, Product-specific Notifications, Wholesale
Emails, and Multi-event Communication were named explicitly as future
work, not built — see the PRD's Future Ideas.

### Fixed (found during this sprint's own verification)

- **The Sold Out candidates query silently excluded every
  never-notified product** — `lastNotifiedStatus: { not: "sold_out" }`
  alone never matches a `NULL` column in SQL (most products start with
  `lastNotifiedStatus: null`), so a freshly sold-out product never
  showed up as a candidate. Fixed with an explicit `OR` covering both
  "never notified" and "notified for a different status."
- **The Reminder Email batch guard compared the wrong two timestamps**
  — an early version checked `reminderBatchSentAt >= countdownTargetAt`,
  which is only true once the countdown itself has already passed,
  meaning the batch would re-send on every cron run right up until the
  event closed. Fixed to a simple `reminderBatchSentAt != null` check,
  with the admin Settings action resetting it back to `null` whenever
  `countdownTargetAt` itself changes — verified idempotent across
  repeated cron hits, and re-armed correctly after changing the
  countdown.
- **`vercel.json`'s original hourly cron schedule silently blocked every
  deployment for this project**, not just the cron job — discovered
  during this sprint's own staging rollout, when the Sprint 6 push
  (and everything after it) never produced a deployment at all, with no
  visible error anywhere until manually triggering a deployment through
  Vercel's dashboard surfaced "Hobby accounts are limited to daily cron
  jobs." Fixed by changing the schedule to once daily
  (`0 20 * * *`) — see the PRD's §2.22.6 and Known Issue 28 for the
  trade-off this means for the Reminder Email's exact lead time.

## Sprint 5 — Customer Self-Service Portal (2026-08-20)

Closes the loop every prior sprint deferred: since Sprint 2, every order
has carried a secure, unguessable edit token with nowhere for a customer
to actually use it. This sprint builds the full accountless retrieval +
editing flow — no passwords, no accounts, ever.

### Added

- **"My Pre-order"** (`/my-preorders`) — replaces the Sprint 1 placeholder
  with a real email-lookup form. Never reveals whether an address has an
  order: every outcome (found, not found, or a send failure) shows the
  identical message, "If a preorder exists for this email address, a
  secure edit link has been sent to your email."
- **The Self-Service Portal** (`/edit/{token}`) — a complete editable view
  of a customer's pre-order:
  - **Products**: change variant (pills), change quantity, remove an
    item — each saves instantly, price re-fetched live on any change.
  - **Wishlist**: opening the portal links that browser to the order (same
    cookie checkout already sets), so browsing the site and tapping ♡
    anywhere already saves to this exact order — no new UI needed for
    that. The portal itself shows what's saved, with Remove and Move to
    Pre-order actions.
  - **Customer Information**: name, email, shipping address, billing
    address, notes — its own Save Changes button, inline "Your preorder
    has been updated successfully" confirmation, no page reload.
  - **Notification Preferences**: three toggles (new products, price
    updates, 24-hour close reminder), each saving the instant it's
    switched.
  - **Order Timeline**: Order Created → Updated (× however many changes)
    → Current Version, in plain language.
- **Admin Order History** — a new section on each pre-order's admin detail
  page listing every change with its real type, date, and time (Order
  Created, Product Added/Removed, Variant/Quantity Changed, Shipping/
  Billing Address Updated, Notification Preferences Updated, ...).
- The order confirmation page's edit link is now a real, clickable link
  (was inert text through Sprint 4, since the page it pointed to didn't
  exist yet).

### Scope note

No real email provider is wired up this sprint (confirmed with you before
building) — "sending" still logs to the server console, exactly like
every email-shaped feature since Sprint 3. Everything else — the lookup,
the token, the entire portal, the timeline, the admin history — is fully
built and working; swapping in a real provider later is a small, isolated
change or an already-established interface. Notification preferences are
stored and fully editable, but don't yet change who actually receives an
Update Email — that targeting logic was already documented as future
work in Sprint 3's PRD notes.

### Fixed (found during this sprint's own verification)

- **The customer-facing Order Timeline mislabeled a legacy order's first
  change as "Order Created"** — it originally picked the label
  positionally (index 0 = Created), but an order placed before this
  sprint has no real `order_created` history row at all, so its first
  logged entry is actually whatever else changed first. Fixed to key off
  the entry's real type instead of its position.

## Sprint 4 — Event Pages CMS (2026-08-15)

Transforms the site into a small Event Platform: a block-based CMS Karen
can use to write and update site content herself — How to Pre-order,
About the Event, and any future page (FAQ, Privacy Policy, Wholesale
Information, ...) — with no code changes. **This sprint does not modify
any existing pre-order/checkout/product/variant/purchase/analytics
functionality** — every touch to existing files is additive (two nav
pills, two footer links, one admin nav link).

### Added

- **Event Pages admin** (`/admin/event-pages`) — a Page List (with the
  two seeded pages, How to Pre-order and About the Event, guaranteed to
  exist on first visit) and a Page Builder per page (`/admin/event-pages/
  [id]`) supporting **+ Add Section**, drag-and-drop reordering,
  Duplicate, Delete, and Collapse/Expand, for five section types:
  - **Text** — title + a rich text editor supporting headings, bold,
    italic, bullet/numbered lists, hyperlinks, tables (insert, add row/
    column, delete), a horizontal rule, text colour, text alignment, and
    an emoji picker. Pasting from Microsoft Word works — the editor's own
    schema filters pasted content down to what it supports, keeping
    formatting on-brand automatically.
  - **Image** — one photo with an optional caption, resized responsively.
  - **Gallery** — any number of photos in a grid that adapts by count (1
    → full width, 2 → 2 columns, 3 → 3 columns, 4 → 2×2, 5+ → a
    responsive wrap), each maintaining its crop and never overflowing the
    page.
  - **Button** — text, URL, and an "open in new tab" option.
  - **Divider** — a plain visual line between sections.
- **Two customer pages**: `/how-to-preorder` and `/about-event`, plus a
  single `/[slug]` route that automatically serves any future page an
  admin creates — no new route file needed per page.
- **Two nav pills** under the homepage hero banner ("How to Pre-order,"
  "About the Event"), kept structurally separate from the Product
  Filters.
- **Two new footer links** (How to Pre-order, About the Event), alongside
  the existing Contact Us / Shipping Policy links.
- **`EventPage`/`PageSection` schema** — one open `type` string +
  a `Json` `data` column per section, deliberately chosen so a future
  section type (Video, FAQ Accordion, Countdown Timer, Google Map,
  embedded Instagram/YouTube, Product Carousel — all named in the brief
  as future-only) needs a new type value and a new validation schema, not
  a migration. None of those are implemented this sprint.

### Fixed (found during this sprint's own verification)

- **Tiptap toolbar buttons could steal focus from the editor mid-command**
  — clicking a plain `<button>` shifts DOM focus to it by default, which
  can clear the editor's active text selection before a formatting
  command runs against it. Added the standard Tiptap fix
  (`onMouseDown={(e) => e.preventDefault()}` on every toolbar control) to
  the new rich text editor.
- **A wide table could force the whole page to scroll horizontally** —
  `.rich-text table` now uses `display: block; overflow-x: auto` so a
  table scrolls within its own bounds instead, matching "no horizontal
  scrolling" from the brief.

## Hero banner upload fix (2026-08-14)

### Fixed

- **Hero banner uploads failed on staging** with a raw browser network
  error ("This page couldn't load") — reported after the Sprint 3.5
  deploy. Root cause: Vercel's serverless functions cap a request body at
  ~4.5MB, a hard platform limit that can't be raised from application code
  (this app's own `next.config.ts` body-size setting only governs what
  Next.js accepts *below* that ceiling). A hero banner submits three
  full-size images (up to 8MB each, per this app's own per-file check) in
  one request — easily exceeding Vercel's limit even though every
  individual file passed validation. Vercel rejects the oversized request
  before Next.js ever runs, so the failure showed as a generic browser
  error instead of anything in-app.
- **Fix**: new `src/lib/image-compress.ts` re-encodes every uploaded photo
  through a canvas the moment it's selected, before it's ever added to a
  form — same visual quality, dramatically smaller file size (a real
  7.7MB product photo already in this app's uploads compressed to
  0.34MB in testing). Wired into the three places that can bundle
  multiple photos into one submission: `BannerForm.tsx` (the reported
  bug — three required hero images), `ProductImageManager.tsx` (multiple
  product photos), and `ProductVariantManager.tsx` (variant images).
  Deliberately **not** applied to the site logo or collection image
  uploads (single files, well under the limit on their own, more likely
  to need PNG transparency preserved — this fix re-encodes everything as
  JPEG).

## Post-Sprint-3.5 fix (2026-08-14)

### Fixed

- **Homepage header logo was oversized** — up to 160px tall (`h-40` at the
  `lg` breakpoint), a leftover from two separate "double the size" passes
  compounding on top of each other. Reduced to a typical header size (40px
  mobile up to 56px desktop), matching the reference size shown on the
  live shokakko.com.au Shopify store. Scoped to `SiteLogo`'s `homepage`
  preset only (also used on My Pre-order and the order confirmation page)
  — the `checkout` preset (4x, used only on `/checkout`) was left as-is,
  since only the homepage-style logo was reported as too large.

## Sprint 3.5 — Product Variants, Purchase Dashboard & Analytics Dashboard (2026-08-14)

Improves product management for large event catalogues (100–200 products)
and adds two new admin dashboards for purchasing efficiently and reading
customer interest during a live exhibition. **This sprint deliberately did
not modify the existing customer preorder/checkout workflow** — variant
selection happens entirely on the Product Details page, before anything
reaches the cart.

### Added

- **Product Variants** — one optional variant group per product (e.g.
  "Design" → Cat/Bear/Rabbit), each variant with its own optional SKU,
  price override, and image. Admin: a new variant-rows editor on the
  product form, mirroring the existing photo manager's add/remove/drag-
  reorder pattern. Customer: variants render as selectable **pills** (not
  a dropdown) on the Product Details page — selecting one instantly swaps
  the main image/price with no page reload. Cart, wishlist, checkout, and
  both the admin order detail and customer order confirmation pages are
  all variant-aware, showing a "{Variant group}: {Variant name}" line
  wherever an item is listed.
- **`prisma/schema.prisma`**: new `ProductVariant` model;
  `Product.variantGroupName`/`purchaseStatus`; `WishlistItem.variantId`
  (unique constraint extended to include it); `OrderItem.variantId`/
  `variantName`; new `ActivityLog` model. One additive migration, applied
  cleanly with no data loss.
- **Admin Purchase Dashboard** (`/admin/purchases`) — mobile-first (built
  for Karen's iPhone first, full desktop support too). Summary tiles
  (Total Products, Products Without Price, Draft/Sold Out Products, Total
  Wishlist Items, Total Pre-orders, Average Order Size), a Purchase
  Progress bar, and a Buying List scoped to every product/variant that
  appears in at least one submitted pre-order — with Brand/Collection/
  Product Type/Product Status/Purchased Status filters, sort by Quantity/
  Brand/Collection/Name, a Not Purchased/Partially Purchased/Purchased
  status per row that persists to the database, CSV export, and a
  print-friendly view.
- **Admin Analytics Dashboard** (`/admin/analytics`) — Most Wishlisted
  Products/Brands/Collections, Most Added To Pre-order, Most Popular
  Brands/Collections, Products Waiting For Price, High Interest Products
  (wishlisted but rarely ordered), and a Recent Activity feed.
- **`ActivityLog`** table — a small, generic event feed (not a full audit
  log) fed by four write points: a product being added, a product's price
  actually changing, a pre-order being submitted, and a wishlist item
  being added from an already-linked browser. Powers the Analytics
  Dashboard's Recent Activity section.
- Admin nav gained **Purchases** and **Analytics** links.

### Changed

- **Homepage product cards simplified**: SKU and Estimated Arrival no
  longer render on the grid card (still shown on the Product Details
  page). A product with a variant group shows a **"View Options"** button
  in place of the one-click wishlist heart/quantity stepper, since which
  variant is wanted has to be chosen on the Details page first.
- **Cart and wishlist are now variant-aware end to end**: both contexts
  key their state by a composite `productId::variantId` string when a
  variant is involved (a plain product's key is unchanged, so every
  pre-existing call site needed zero changes) — two different variants of
  the same product are two independent cart lines / wishlist entries.

### Fixed

- **New variant rows silently failed to save** — `variantFormSchema`'s
  `id` field was `z.string().trim().optional()`, which only accepts
  `undefined`; the admin form always sends `id: null` (not `undefined`)
  for a brand-new row, so every new row failed validation and was quietly
  dropped from `variantsJson` before it ever reached the database (the
  parent product and its `variantGroupName` still saved correctly, making
  this easy to miss without directly re-querying the database). Caught
  during this sprint's own verification pass, before shipping. Fixed by
  changing the schema to `.nullable().optional()`.

## Checkout & Logo Polish (2026-08-14)

Post-staging-review fixes: structured checkout fields, shipping method,
logo sizing/placement, and clearer shipping copy.

### Changed

- **PreOrder schema restructured**: `customerName` split into
  `customerFirstName`/`customerLastName`; the free-text `shippingAddress`/
  `billingAddress` fields replaced with structured Address 1/2, Suburb,
  State/Territory, Postcode, and Country (defaults to "Australia", still
  editable) for both shipping and billing. Existing orders were backfilled
  (old name → first name, old address → address line 1) rather than lost —
  worth a quick tidy-up pass in the admin for any pre-existing orders.
- **Shipping method** added to checkout: Standard Shipping or Express
  Shipping, shown on the order confirmation page and in the admin
  pre-order detail view.
- **Checkout form fields**: "Full name" is now "First name"/"Last name";
  the single shipping/billing address textarea is now six structured
  fields each (`PreOrderFormFields.tsx`); a new note about free shipping
  over AUD $100 and the Shipping Policy link sits under the shipping
  method selector.
- The existing "Tax included. Shipping fee may apply…" note above the
  checkout form is now bold, for visibility.
- **Site logo**: doubled in size on the homepage header; 4× on the
  checkout page; now also shown (at homepage size) on My Pre-order and the
  order confirmation ("Thank you") page, and at a compact size in the
  admin header — previously those three pages only ever showed the
  fallback text logo, never the uploaded image. New shared
  `src/components/SiteLogo.tsx` component backs all five placements so
  their sizing stays in sync.
- `src/lib/email/first-name.ts` removed — `PreOrder.customerFirstName` now
  exists directly, so the "split full name" helper it provided is no
  longer needed.

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

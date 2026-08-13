# Project Notes — Shokakko Australia Pre-Order Site

Running log of decisions, state, and next steps. Paste this file back in at the
start of future sessions.

## What this is

A mobile-first **pre-order management site** for Shokakko Australia (cute
Japanese stationery), used during overseas stationery exhibitions:

- Karen (admin) adds products live throughout the exhibition day, with photos,
  from her phone/laptop.
- Customers browse on their phones and submit a pre-order (no payment) —
  one combined order sheet: pick quantities across as many products as they
  like, then fill in their details once at the bottom and submit everything
  together.
- Not an ecommerce site — no checkout, no payment processing, no accounts for
  customers.

This is a **separate project** from the "Paper Lovers Studio" SaaS app that
also lives on this machine — different brand, different purpose, no shared
code/database. See the note below on where it lives.

## Where it lives

`C:\Users\Karen\Documents\shokakko-preorder` — deliberately **outside**
OneDrive sync (unlike Paper Lovers Studio, which lives in a OneDrive folder
and has known file-lock/sync-delay issues as a result). Keep this project
here, or move it to another non-synced location if needed — avoid OneDrive
folders for the working copy.

## UI Refinement Pass (2026-08-08, after Sprint 1)

Smaller, targeted follow-up: site-wide font (Poppins), centered/larger
header logo, a new Product Details page, collection tags hidden from
customers (filtering still works), "Price Coming Soon" wording, an admin
WYSIWYG editor for checkout pre-order info, a checkout shipping notice +
logo swap, and a footer on every customer page. Full list in
`CHANGELOG.md`; this section is just what's worth remembering later.

**Font change was a two-line trick, not a find-and-replace**: rather than
touching every component that uses `font-display`/`font-body` Tailwind
classes, both tokens in `globals.css`'s `@theme` block now point at the
same Poppins CSS variable. Worth remembering if a future font change comes
up again — repoint the token, don't hunt down every usage.

**Real bug caught during verification, not from guessing**: the header
logo wasn't *exactly* centered on mobile — a CSS grid quirk. A bare `1fr`
track still gets an implicit *content-based* minimum width, so the icon
cluster's column (which has real content) could grow past its "fair share"
on narrow screens, pushing the centered logo off-true-center. Only showed
up at the 375px breakpoint, not tablet/desktop — a good reminder to always
check the narrowest breakpoint specifically when centering something
against an asymmetric layout. Fixed with `minmax(0,1fr)`.

**Rich text editor decision**: added Tiptap rather than hand-rolling
`contentEditable` (deprecated `execCommand`, unreliable cross-browser) —
the one new dependency added since Sprint 1 started with zero. Kept the
editor's own schema deliberately small (paragraphs/bold/italic/lists/
links only — no headings/images/code/blockquotes) specifically so its
output can never contain anything unsafe, including from pasted content,
without needing a second sanitizer library. Only the single admin
password-holder can ever write this content.

**Found while testing, not touched**: `SiteSettings.eventInfo` already
had real content Karen had typed in — "Pre-Order Instructions: 1) ABC
2) BCD" — clearly a workaround for not having a dedicated pre-order-info
field before this pass. Left it exactly as-is (it still drives the
homepage's event strip) since it's her real content, but she may want to
move that text into the new dedicated Pre-order Information editor on the
Settings page now that it exists — worth asking, not assuming.

**Testing rich text via browser automation**: `document.execCommand
('insertText', ...)` doesn't respect a ProseMirror editor's "stored marks"
the way real typing does — toggling Bold then typing produced plain text
in testing. Selecting existing text first (`Range`/`Selection` APIs) and
*then* clicking a formatting button worked correctly and confirmed the
editor itself was fine — a testing-methodology gotcha, not a real bug, but
worth remembering if Tiptap ever needs re-testing this way.

## Status: Phase 1 + Sprint 1 complete, verified end-to-end in a real browser session

See `docs/PRD.md` for the full current-state reference (every route,
component, database entity) — this file stays a chronological decision log;
the PRD is the source of truth for "what does the app do today."
`CHANGELOG.md` has the sprint-by-sprint summary.

Everything below has been built, type-checked (`tsc --noEmit`), linted
(`eslint`), built for production (`next build`), and click-tested in a live
dev server. The customer-facing description below reflects **Sprint 1's**
redesign — the original Phase 1 single-page order sheet (tag chips + inline
bottom form) has been replaced; see "Sprint 1" further down for exactly what
changed and why.

- **Database**: Prisma schema — `Product`, `Tag` (many-to-many), `PreOrder`,
  `OrderItem`. Running on SQLite (via the `@prisma/adapter-libsql` driver
  adapter, Prisma 7 requires a driver adapter — no bare `url` in the
  datasource block anymore). `OrderItem.productId` is nullable with
  `onDelete: SetNull` and every item also stores a **snapshot**
  (`productName`/`productBrand`/`productSku`/`unitPriceCents`) — deleting or
  editing a product later never corrupts a past order's record of what was
  actually ordered.
- **Admin auth**: single shared password (`ADMIN_PASSWORD` env var), no
  accounts/sign-up. A signed cookie (HMAC via Web Crypto, works in both the
  Node and Edge runtimes) gates `/admin/*` via `src/proxy.ts` (Next 16
  renamed `middleware.ts` → `proxy.ts`, **and the exported function itself
  must be named `proxy`**, not `middleware` — this tripped up the first
  build, see "Bugs found & fixed" below).
- **Admin product CRUD**: `/admin/products` (list), `/new`, `/[id]` (edit +
  delete). Photo upload, brand, name, SKU (unique), description, estimated
  arrival (free-text, optional), price in dollars (blank = "Coming Soon"),
  comma-separated collection tags (auto-created), visible/hidden toggle,
  sort order.
- **Admin pre-orders view**: `/admin/preorders` (list) and `/[id]` (detail) —
  customer info, shipping/billing address, items, notes, and a status
  dropdown (new/confirmed/fulfilled/cancelled).
- **Customer catalog** (redesigned in Sprint 1): `/` — header (admin-
  uploadable logo, cart/wishlist/"My Pre-order" icons), hero banner carousel,
  event-info/countdown strip, search + sort toolbar, filter sidebar
  (desktop)/drawer (mobile), responsive product grid (2/3/4 cols). Quantity
  steppers (0–10, client-state, no page refresh) feed a `localStorage`-
  persisted cart; adding an item auto-opens a slide-in cart drawer. "Next
  Step" goes to `/checkout`, a dedicated page with the pre-order form
  (name/email/shipping/billing-optional/notes) and a "Save My Pre-order"
  button. Submission is a Server Action that **re-fetches product data
  server-side** (never trusts client-submitted prices/names) and creates the
  order + snapshotted line items together.
- **Wishlist**: heart toggle per product card, `localStorage`-only (no DB,
  no account) — header icon opens a drawer with an "Add to cart" shortcut.
- **"My Pre-order"**: currently a placeholder page (`/my-preorders`) — the
  real flow will be accountless/email-based, not built yet (see "Next steps").
- **Order confirmation**: `/order/[orderNumber]` — public (no auth, since the
  customer just submitted it themselves), `noindex`, shows order number,
  items, total, addresses.
- **Image storage**: swappable adapter (`src/lib/storage/`) — `local` driver
  (saves to `/public/uploads/products`, works great for dev, **does not
  persist on Vercel**) today; `vercel-blob` driver already written and
  installed, just needs `STORAGE_DRIVER=vercel-blob` +
  `BLOB_READ_WRITE_TOKEN` at deploy time (see "Going live" below).
- **Brand theme**: `src/app/globals.css` — `#97b4d6` (blue), `#e0c9e8`
  (lavender), `#e89898` (coral), `#ddefe6` (mint), warm cream background,
  soft brown ink text. Fonts: Baloo 2 (display/headings) + Nunito (body),
  both Google Fonts via `next/font`.

## Bugs found & fixed during verification (worth knowing about)

1. **Next.js 16 proxy export name**: `src/proxy.ts` must export a function
   named `proxy` (or a default export) — exporting `middleware` (the old
   Next 15 name) silently breaks *every* route with a build-time error.
   Fixed; if this resurfaces after a Next.js upgrade, check this first.
2. **Route-group fix for the login-redirect loop**: the admin layout
   (`requireAdmin()` + nav) originally lived at `src/app/admin/layout.tsx`,
   which also wrapped `/admin/login` itself — an unauthenticated visitor to
   `/admin/login` got redirected to `/admin/login` by its own layout,
   forever. Fixed by moving everything *except* `login/` into a
   `src/app/admin/(protected)/` route group (route groups don't affect the
   URL, so `/admin/products` etc. are unchanged) — `login/` now sits outside
   the auth-requiring layout.
3. **Homepage was statically prerendered at build time** — `next build`
   showed `/` as `○ Static`, meaning it would have frozen the product list
   at whatever existed at build time and never shown products Karen adds
   live during the exhibition without a redeploy. This is the one bug that
   would have directly broken the core purpose of the site. Fixed with
   `export const dynamic = "force-dynamic"` in `src/app/page.tsx` — every
   request now re-queries the database. (The admin mutations already call
   `revalidatePath("/")` too, which is redundant now but harmless.)
4. **`prisma migrate dev` on SQLite doesn't support `createMany`'s
   `skipDuplicates`** (Postgres/CockroachDB only) — the tag-upsert logic in
   `src/app/admin/(protected)/products/actions.ts` uses a loop of
   `db.tag.upsert(...)` instead, which works on every database Prisma
   supports.

## Sprint 1 — Customer Browsing Experience & Homepage Redesign (2026-08-08)

Planned via a formal plan-mode pass (`.claude/plans/noble-chasing-whisper.md`)
after four clarifying questions resolved real contradictions in the sprint
brief (most importantly: the brief said "no database changes" in one place
but then required schema-changing admin features like multi-image products
and hero banners elsewhere — resolved as "no DB changes" applying only to
Wishlist, everything else in scope). Full feature list in `CHANGELOG.md`.

**Schema migration was done expand-then-contract, on purpose**: added
`ProductImage`/`HeroBanner`/`SiteSettings`/`OrderSequence` and
`Product.type`/`status` as a first migration *alongside* the old
`imageUrl`/`isActive` columns, ran a one-off backfill script, verified the
backfilled data matched, and only then dropped the old columns in a second
migration. This mattered in practice — by the time this sprint started, the
dev database already had **real data from Karen's own testing** (a product
she added herself with a real photo, and a real submitted pre-order), not
just seed data. A single combined migration would have silently dropped
that photo. Always check `db.product.findMany()` for real-looking data
before a destructive-looking schema change, not just seed data.

**`prisma migrate dev` can't run non-interactively when a migration has a
data-loss warning** (dropping a column with non-null values, even after
you've already backfilled it elsewhere) — it hard-refuses in a non-TTY
environment rather than prompting. Worked around by using
`prisma migrate diff --script` to generate the raw SQL by hand, writing it
into a manually-created migration folder (matching Prisma's own naming
convention), and applying it with `prisma migrate deploy` (which doesn't
prompt). Worth knowing if this happens again — don't fight the interactive
prompt, generate the migration file directly.

**Order numbers**: sequential `PO1001`, `PO1002`, … via a single-row
`OrderSequence` counter (`src/lib/order-number.ts`) that only ever
increments (`upsert` + atomic `increment`) — deleting a `PreOrder` can never
free up or reuse its number. Replaced the old random `SHK-YYMMDD-XXXX`
scheme entirely; `generateOrderNumber()` no longer exists in
`src/lib/validations/order.ts`.

**Cart/wishlist state architecture**: two React Contexts
(`CartContext`/`WishlistContext`), both `localStorage`-persisted, mounted
once at the root layout so they survive navigating between `/`, `/checkout`,
and the order confirmation page. The cart is explicitly cleared from
`ClearCartOnMount` on the **confirmation page**, not optimistically before
submission — `submitPreOrder` redirects server-side on success, so there's
no client-side "success" callback to hook into; clearing on the
confirmation page (only ever reached after a genuinely created order) means
a failed/invalid submission never loses the customer's cart.

**Shared `Drawer` primitive** (`src/components/ui/Drawer.tsx`): one
component backs the Cart, Wishlist, and mobile Filter drawers. Always
rendered in the DOM (even closed) and animated via opacity/translate-x
transitions — deliberately not using an animation library, consistent with
this project's minimal-dependency approach so far.

**Product Status replaces the old `isActive` boolean** with three states:
`active` (visible + orderable), `sold_out` (visible, not orderable — a
"Sold Out" badge replaces the quantity stepper), `draft` (hidden from
customers entirely, same as the old `isActive: false`). Stored as a plain
`String`, not a Prisma `enum` — Prisma enums aren't supported on this
project's SQLite datasource, and it matches how `PreOrder.status` already
worked.

**Real-world bug found after the sprint was verified and handed off**:
uploading actual-size hero banner photos (not the tiny test images used
during verification) failed with "Body exceeded 1 MB limit," then after a
partial fix, "Unexpected end of form." Two *separate* Next.js request-size
ceilings, both undocumented until you hit them: Server Actions default to a
1MB body cap (`experimental.serverActions.bodySizeLimit`), and — this is
the one that's easy to miss — `src/proxy.ts` (middleware, matches every
`/admin/*` route) has its **own, independent** 10MB default cap on request
bodies it reads (`experimental.proxyClientMaxBodySize`, renamed from
`middlewareClientMaxBodySize` in this Next.js version). Any admin form that
uploads more than ~10MB combined needs *both* raised in `next.config.ts`,
not just one — worth remembering if a future upload-related "form" error
shows up again. Lesson for testing: verify file uploads with realistically-
sized images, not tiny synthetic test files, since exactly this bug hid
behind small test uploads during Sprint 1's own verification pass.

**Verification caught one thing worth remembering**: after a Server Action
that doesn't redirect (e.g. `updateProduct`), a `<select>`/`<input>` using
`defaultValue` does **not** visually refresh even though the database was
updated correctly — React reuses the mounted DOM node for uncontrolled
elements across re-renders. Not a bug (confirmed via direct DB reads during
this sprint's testing), just something to expect: reload the page to see a
freshly-saved value reflected in an uncontrolled form field.

## Sprint 2 — Wishlist & Pre-order Workspace (2026-08-11)

Planned via a formal plan-mode pass (`.claude/plans/noble-chasing-whisper.md`)
after two clarifying questions resolved a real gap in the brief: it
referenced a secure "Edit My Pre-order" link/page that didn't exist yet.
Karen's answers scoped this sprint down to **generating and storing the
token + showing the future URL on the confirmation page only** — no
`/edit/[token]` page, no email sending, both explicitly deferred. Full
feature list in `CHANGELOG.md`.

**Architecture decision — cookie-linked, not localStorage-linked, once
durable**: rather than adding this app's first client-side
"fetch wishlist on mount" pattern, the root layout itself became `async`
and reads the `shokakko_preorder_token` cookie server-side, resolving it
to the linked order's wishlist before the page even renders — consistent
with how every other page here is Server-Component-first. This also meant
**no new "migrate on page load" component was needed** at all: the
existing post-submission redirect naturally re-renders the root layout,
which picks up the cookie `submitPreOrder` just set. Contrast with
`ClearCartOnMount`, which stays necessary since the cart is genuinely
ephemeral/client-only and has no server-side counterpart to read back.

**`WishlistItem` deliberately does not snapshot**, unlike `OrderItem`. The
entire point of a wishlist is *live* status — a customer needs to see
today's price/availability, not what it was when they saved it — so it's
just a `productId` reference that cascade-deletes if the product goes
away. This was a conscious contrast with the already-established
`OrderItem` snapshot pattern, not an inconsistency.

**Extending `Drawer` instead of forking it**: added one opt-in prop
(`mobileVariant`, default `"side"`) rather than either hard-coding the
bottom-sheet behavior into the shared component (would have silently
changed Cart/Filter drawer behavior, which the brief never asked to
change) or copy-pasting a second drawer component (would have meant two
places to fix future drawer bugs). Same reasoning applied to
`WishlistContext`'s local/linked mode split — its public API
(`has`/`toggle`/`ids`/`count`) didn't change, so `ProductCard`,
`ProductDetailsView`, `WishlistDrawer`, and the new wishlist filter all
needed zero changes to pick up durable persistence.

**Known trade-off, written down rather than silently accepted**: if a
customer's already-linked browser submits a *second* pre-order,
`submitPreOrder` generates a new `editToken`/cookie and migrates whatever
`WishlistContext` currently holds (which, since the browser was already
linked, reflects the *first* order's live `WishlistItem` rows) onto the
*new* order. The first order's `WishlistItem` rows aren't deleted — they
just stop being "live" from that browser's perspective and become a
historical snapshot of what was wishlisted at that point. Not a data-loss
bug, just worth knowing if `WishlistItem` history ever needs surfacing
somewhere (e.g., a future admin view of repeat customers). Documented in
`docs/PRD.md` §14, item 10.

**Non-interactive `prisma migrate dev` failure, again**: same class of
issue as Sprint 1 — a `UNIQUE` constraint on `PreOrder.editToken` against
existing NULL rows triggered the "environment is non-interactive" refusal
even though it's actually harmless (SQL treats multiple NULLs as
non-colliding under `UNIQUE`). Same fix as before: `prisma migrate diff
--script` → hand-write the migration folder → `prisma migrate deploy`.
This is now a well-worn pattern for this project, not a one-off.

**Testing checklist from the brief, confirmed**: add/remove wishlist,
counter updates, drawer contents (including the new bottom sheet on
mobile vs. the desktop side panel), Move to Pre-order, search/filters
composing with the new wishlist filter, Product Details page staying in
sync with the grid, and a full regression pass through cart → checkout →
order confirmation → admin to confirm nothing from Sprint 1/the UI
Refinement Pass broke.

## Sprint 3 — Email Communication System (2026-08-13)

Planned via a formal plan-mode pass after two rounds of clarifying
questions/answers — the brief's "Notification Centre... click Send
Update" language implied real email delivery, but Karen's actual answer
scoped this sprint down to the complete template/authoring system with
sending stubbed (a console no-op), real delivery explicitly deferred.
Mid-plan, Karen also refined the architecture request from "three
separate HTML emails" to a proper **Email Design System** — 8 shared,
independent components every template composes from — which simplified
rather than complicated the plan, since it's what the business-logic/
presentation split was already heading toward. Full feature list in
`CHANGELOG.md`.

**The `@react-email/components` decision, worth remembering**: installed
it first (per the original plan), then `pnpm add` printed a deprecation
warning — "Package no longer supported, contact support" — not just on
that package but on its *entire* sub-package tree (19 deprecated
sub-dependencies). That's an unusual signal (normal deprecations point to
a successor package; this one didn't), so rather than build new
infrastructure on top of it, removed it and kept only `@react-email/render`
(not deprecated, just the `render()` function) — the 8 Design System
components are hand-built from plain `<table>`/`<img>`/`<a>` elements
instead. Worth checking `npm view <package> deprecated` right after
installing anything new, not just trusting the initial `pnpm add` to have
picked a healthy package.

**Price Updates baseline timing — a real design decision, not obvious**:
`Product.lastNotifiedPriceCents` (the "has this price changed since the
last digest" baseline) advances when **Generate Email** runs, not when a
real send eventually succeeds (there is no real send yet). This means
Generate Email is effectively the "finalize this digest" checkpoint for
Sprint 3, matching Karen's own description of it ("render the *final*
email... save the generated HTML") more literally than a repeatable,
side-effect-free preview would have. Consequence worth remembering: click
Generate Email twice with no price changes in between, and the second
click shows an empty Price Updates section — correct once real sending
exists (a price shouldn't be reported twice), but means re-testing this
section means editing a product's price again first. Also seeded
`lastNotifiedPriceCents` to a product's starting price automatically on
creation, so the very first price edit is detectable without needing a
bootstrap digest to run first.

**"Current draft" digest, not "one row per generate"**: `/admin/emails`
finds the most recent `EmailDigest` with status `draft`/`generated`, or
creates one lazily — same lightweight pattern as `SiteSettings`'
singleton row, but with history preserved (`status: "sent"` will, in a
future sprint, be what makes the *next* Generate Email start a fresh
row). Clicking Generate Email repeatedly updates the *same* row in place,
which is why `/admin/emails/history` will show just one growing entry
until a future sprint adds a real send action — documented in the PRD as
expected behavior, not a bug, so it doesn't get "fixed" by surprise later.

**New public route class**: `/unsubscribe/[token]` is the first page in
this app that performs a database write on a plain `GET` request, inside
the Server Component itself rather than behind a Server Action form —
unavoidable, since an email client's link click is just a navigation with
no JS to invoke a Server Action from. Made idempotent (only sets
`unsubscribedAt` if unset) specifically because GET requests can get
prefetched/re-visited unexpectedly (link scanners, browser prefetch).

**Collection Card images vs. Product Card images — different treatment,
on purpose**: `Tag` had no image field at all before this sprint, so
Collection Cards needed a genuine new upload (`Tag.imageUrl`,
`/admin/collections`). Product Cards' "square photo," by contrast, just
CSS-crops the product's *existing* primary image (`object-fit: cover`) —
no new product-image field, since one already exists and a square crop of
it looks fine. Two different-looking requirements ("square image" for
both) that turned out to need two different amounts of new schema.

**Testing note**: verified the Notification Centre's Generate Email
end-to-end against the dev database directly (checked `EmailDigest`/
`EmailDigestItem` rows, `recipientCount`, and `lastNotifiedPriceCents`
advancing via a throwaway Node script using the same `PrismaLibSql`
adapter `src/lib/db.ts` uses) rather than trusting the UI alone — same
verification habit as Sprint 2's DB-level checks after wishlist
migration. Deleted all test artifacts (a scratch product price edit, any
test digests) afterward, leaving only Karen's real data.

## Milestone 1 — Staging Deployment Prep (2026-08-13)

Not a sprint — prep work before Sprint 4, explicitly scoped to *not*
deploy or touch DNS (both require Karen's own Vercel/GoDaddy account
access, which an agent session doesn't have). Full guide in
`docs/DEPLOYMENT.md`; this section is just what's worth remembering.

**Found a real env-hygiene gap while reviewing for deployment**: `.env`
(intended, per its own header comment, to hold only committed, non-secret
defaults) actually had `ADMIN_PASSWORD` and a real generated
`SESSION_SECRET` in it — harmless *only* because the `.gitignore` at the
time blanket-ignored `.env*` (so `.env` was never actually going to be
committed despite the file's own comment claiming otherwise). Fixed both
sides: moved the real secrets to a new `.env.local` (the file that's
*supposed* to hold them), and narrowed `.gitignore` to the standard
`.env*.local` pattern so `.env`/`.env.example` are properly tracked going
forward, matching what the project's docs already claimed. Also caught
`dev.db` itself wasn't gitignored at all — would have committed a SQLite
file containing Karen's one real customer order on the very first commit
if not caught here. Worth remembering: "we have a `.gitignore`" doesn't
mean "the `.gitignore` does what its neighboring comments say it does" —
worth actually reading it against intent, not just checking it exists.

**Staging gate — Basic Auth, not a new login page**: `STAGING_BASIC_AUTH_USER`/
`STAGING_BASIC_AUTH_PASSWORD` in `src/proxy.ts`, applied to every route
via a broadened middleware matcher, layered *before* the existing
`/admin` session check (both apply independently — confirmed via curl
with all four combinations: no creds, wrong creds, correct creds on a
public route, correct staging creds but no admin session on `/admin/*`).
Chose plain HTTP Basic Auth over a custom staging-login page — no new UI
to build, browsers cache the credential for the origin after the first
prompt, and it's a well-understood pattern for exactly this "keep a
non-production deployment away from search engines and randos" use case.
Deliberately env-var-gated (not a hardcoded `NODE_ENV` check) so it can
never accidentally activate in local dev or leak into a real future
production deploy — it's simply never set in either place.

**Env var list from the brief, reconciled rather than followed literally**:
`LOGO_URL` wasn't added — the logo is already admin-uploaded and
DB-stored (`SiteSettings.logoUrl`, editable live without a redeploy, a
real shipped feature), and an env var would be a regression, not an
improvement. `EMAIL_PROVIDER` wasn't added either — Sprint 3 already
built `EMAIL_DRIVER` for exactly this, matching the existing
`STORAGE_DRIVER` naming convention; introducing a second name for the
same concept would just be confusing. `BASE_URL` was added but reserved/
unused — every current URL-building call already derives the origin from
the incoming request's Host header (`src/lib/email/site-url.ts`), which
is strictly better (auto-adapts across environments, zero config) than a
static env var for anything that currently runs inside a request; kept
`BASE_URL` around for whenever Sprint 4 adds something that doesn't (e.g.
a scheduled/cron email send with no request to read a header from).

**No hardcoded `localhost` found anywhere in application code** — grepped
the whole `src/` tree specifically for this milestone. The only two hits
(`site-url.ts`, the order confirmation page) both already do
request-based host detection (`localhost`/`127.0.0.1` → `http`,
otherwise `https`), which was already correct for this exact deployment
scenario without any change needed.

**Deployment/DNS steps are documentation only, not actions taken**:
`docs/DEPLOYMENT.md`'s Vercel and GoDaddy sections are written as a guide
for Karen to follow herself — no Vercel project was created, no domain
was added, no DNS record was changed, per the explicit "do not deploy
yet" instruction. The one exception: `git init` + the initial commit,
which the brief explicitly asked for and which stays entirely local
until Karen pushes it somewhere herself.

## Decisions made this session

- **Order model**: one combined order sheet per visit (not a preorder-per-
  product flow) — explicit choice, matches a typical exhibition order sheet.
- **Admin access**: single shared password, not a full account system — only
  Karen uses it.
- **Tags**: implicit Prisma many-to-many (`Tag[]` / `Product[]`), not an
  explicit join table — simpler `connect`/`set` nested-write syntax, no need
  for per-tag metadata.
- **Hard delete allowed for products**: since `OrderItem` snapshots the
  product's details at order time and `productId` is nullable with
  `SetNull`, deleting a product from the catalog can never break a past
  order's record.
- **Package manager**: pnpm (matches the sibling Paper Lovers Studio
  project's convention on this machine).

## Not yet configured (needed before going live for a real exhibition)

**See `docs/DEPLOYMENT.md` for the actionable, up-to-date version of this
list** (Milestone 1) — the summary below is kept for historical context
and still accurate, just less detailed than the deployment guide.

Everything below is fine for local development but **must** change before
this is a real, publicly-reachable site during a live event:

1. **Database**: SQLite (`file:./dev.db`) only lives on this machine and
   won't work on Vercel's serverless filesystem. Before deploying, either:
   - Point `DATABASE_URL` at a hosted **libSQL/Turso** database — zero code
     change needed, same adapter (`@prisma/adapter-libsql`), same schema.
   - Or switch to **Postgres** (e.g. Neon, same as the sibling Paper Lovers
     Studio project) — requires swapping `src/lib/db.ts`'s adapter to
     `@prisma/adapter-pg` and `prisma/schema.prisma`'s `provider` to
     `"postgresql"`, then a fresh `prisma migrate dev`.
2. **Image storage**: set `STORAGE_DRIVER=vercel-blob` and provision
   `BLOB_READ_WRITE_TOKEN` from the Vercel Blob dashboard for this project —
   the adapter code is already written and installed
   (`src/lib/storage/vercel-blob.ts`), this is purely an env var change.
3. **`ADMIN_PASSWORD`**: currently a dev-only placeholder in `.env` — set a
   real password before the exhibition and don't reuse it elsewhere.
4. **`SESSION_SECRET`**: currently a locally-generated dev secret in `.env`
   — generate a fresh one for production with
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
5. **Hosting**: deploy to Vercel (`vercel` CLI or dashboard import). Set all
   of the above as Vercel environment variables — don't commit real secrets.
6. **Custom domain / QR code**: once deployed, generate a QR code pointing at
   the live URL for customers to scan at the exhibition booth.
7. **`EMAIL_DRIVER`**: currently `"console"` (logs, sends nothing) in
   `.env`. Before any real email should go out, this needs an actual
   provider decision (Resend, Brevo, SES, ...) and a new driver
   implementing `src/lib/email/types.ts`'s `EmailService` interface — see
   "Next steps" below.

## Next steps (not started, only if wanted)

- **A real `EmailService` driver + wiring up "Send Update"**: the
  template system, Notification Centre, and interface are all built
  (Sprint 3) — what's missing is picking a provider, implementing the
  driver, and turning "Generate Email" + a new "Send Update" action into
  an actual per-recipient send loop (`renderUpdateEmail()` is already
  parameterized per-recipient, ready for this).
- **The `/edit/[token]` page** and **"Retrieve My Pre-order"** (the real
  version behind the `/my-preorders` placeholder): the token half is done
  (every `PreOrder.editToken` is generated and stored) and Sprint 3 built
  the Confirmation Email that would carry it — what's still missing is
  the page itself at that route, the email-lookup-by-address flow, and
  the email provider decision above.
- **Real Canva designs for Confirmation/Reminder emails** — Karen will
  share these in a future sprint; only `src/lib/email/components/`/
  `templates/` need to change to adopt them, per Sprint 3's explicit
  business-logic/presentation split.
- **Wishlist/Pre-order-targeted digest recipients + a scheduled daily
  digest** — named in the Sprint 3 brief's "Future Compatibility" section
  and explicitly not built; today every digest broadcasts to every
  non-unsubscribed customer.
- Export pre-orders to CSV/spreadsheet from the admin for easier
  post-exhibition fulfillment planning.
- Bulk product actions (e.g. mark several hidden/visible/sold-out at once)
  if the catalog grows large enough that one-by-one editing gets tedious.

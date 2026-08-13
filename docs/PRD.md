# Product Requirements Document — Shokakko Australia Pre-Order Site

**Status:** Living document — single source of truth for this project.
**Version:** 5.0 (updated after Sprint 3 — Email Communication System: a
reusable Email Design System (8 shared components), three email
templates (Confirmation, Update, Reminder) built on it, an admin
Notification Centre that prepares one Update Email digest at a time, a
`Product.isNew` toggle and price-change tracking, admin-manageable
Collection images + public collection pages, a working unsubscribe link,
and a swappable `EmailService` interface. **No real email provider is
wired up this sprint** — see §2.16 and §15 for exactly what's deferred to
a future sprint. Carries forward Sprint 2's durable wishlist/Pre-order
Workspace architecture and the UI Refinement Pass that preceded it.
**5.1** (Milestone 1, Staging Deployment Prep): §9 now points to the new
`docs/DEPLOYMENT.md`; "no git repository" resolved — see §14).
**Scope of this document:** Every claim below is derived from reading the
actual source code, database schema, and migrations in this repository.
Nothing here describes a feature that is not already implemented. Where
something is planned but not built, it is explicitly marked as such in
"Planned Features" or "Future Ideas." For the chronological history of
*why* things changed, see `CHANGELOG.md` and `PROJECT_NOTES.md` — this
document only describes current state.

---

## 1. Product Summary

Shokakko Australia's pre-order site is a **mobile-first pre-order management
system**, not an ecommerce store. It exists to support a specific real-world
workflow:

1. Karen (the store owner/admin) travels overseas to stationery exhibitions.
2. Throughout the exhibition day, she adds newly-discovered products to the
   site live, from her phone or laptop, including photos — and manages hero
   banners and event info the same way.
3. Customers at the exhibition (or anywhere, since the site is a public URL)
   browse the live catalog on their phones, optionally save items to a
   wishlist, and submit a **pre-order** via a cart-drawer-and-checkout flow —
   no payment is collected.
4. Karen reviews submitted pre-orders in the admin panel and follows up with
   customers after returning to Australia.

There are no customer accounts, no payment processing, and no email sending
anywhere in the codebase yet. The cart is still client-side only
(`localStorage`) for the lifetime of a single visit. The wishlist is
client-side only (`localStorage`) **until** a customer submits their first
pre-order — at that point it migrates into the database and stays linked
to that browser (via a cookie) for every visit afterward, see §2.3.

---

## 2. Implemented Features

### 2.1 Customer-facing homepage (`/`)

Composed in `src/app/page.tsx` (Server Component, `force-dynamic` — see
§7) from several client components:

- **Header** (`SiteHeader`): a 3-column grid — an empty spacer, the site
  logo centered in the middle column, and the icon cluster on the right.
  The logo renders `SiteSettings.logoUrl` if the admin has uploaded one
  (`h-14 sm:h-16 lg:h-20`, roughly 2x its pre-refinement-pass size, with a
  `max-width` cap so an unusually wide upload can't blow out the layout),
  otherwise falls back to the text wordmark (`Logo`) at a matching larger
  size. Both flanking grid columns use `minmax(0,1fr)` rather than a bare
  `1fr` — without it, the icon cluster's real content width can force that
  column wider than the empty spacer on narrow screens, pushing the
  "centered" logo off true center (this was an actual bug, caught and
  fixed during this pass's mobile verification). Three icons on the right:
  a Wishlist heart (♡ when empty, ❤️ once anything is saved — **new in
  Sprint 2**, was always ♡ before — badge shows the saved-item count,
  opens the wishlist drawer), a Cart bag (🛍️, badge shows total item
  count, opens the cart drawer), and a "My Pre-order" receipt icon (🧾, links to
  `/my-preorders`).
- **Hero carousel** (`HeroCarousel`): rotates through every `isActive`
  `HeroBanner`, sorted by `sortOrder`, every ~6 seconds (`setInterval`), or
  manually via dot indicators. Each banner renders via `<picture>` with
  `<source>` breakpoints selecting the desktop/tablet/mobile image
  (`max-width: 1279px` → tablet image, `max-width: 767px` → mobile image),
  with headline/description text and an optional button overlaid on a
  gradient. Renders nothing if there are zero active banners.
- **Event info strip** (`EventInfoStrip`): a thin bar below the hero showing
  `SiteSettings.eventName`/`eventLocation`/`eventInfo` (only the fields that
  are set) and, if `countdownTargetAt` is set, a live-updating "Pre-orders
  close in Xd Xh Xm" countdown (re-computed every 60 seconds client-side).
  Renders nothing if no settings field is populated.
- **Product toolbar** (`ProductToolbar`): a search input (client-side
  substring match across name/brand/SKU) and a sort `<select>` (Newest /
  Name A–Z / Price Low→High / Price High→Low). A "Filters" button opens the
  mobile filter drawer (hidden on desktop, where the sidebar is always
  visible).
- **Filters** (`FilterGroups`, shared by `FilterSidebar` and
  `FilterDrawer`): a **"♡ Wishlist"** checkbox (**new in Sprint 2** — when
  checked, narrows the grid to only wishlisted products, composing with
  every other filter below rather than replacing them); multi-select
  checkboxes for **Brand**, **Product Collection** (the existing `Tag`
  model — every distinct tag across the loaded products), and **Product
  Type**; a **price range** (min/max dollar inputs); and a single
  **"Show sold out items"** checkbox (checked by default). "Clear all
  filters" resets everything, including the Wishlist checkbox. All
  filtering/sorting/searching happens client-side over the already-fetched
  product list — no
  additional network requests.
- **Product grid**: responsive — 2 columns on mobile, 3 at the `md`
  breakpoint (≥768px), 4 at `lg` (≥1024px). Each `ProductCard` shows: photo
  (or a 🎀 placeholder), a wishlist heart toggle (top-right of the photo), a
  "Sold Out" badge (top-left) when applicable, brand, name, SKU, short
  description, estimated arrival, price (or "Price Coming Soon" in coral —
  no longer just "Coming Soon," see §2.14), and either a quantity stepper
  (0–10) or a "Sold Out" badge in place of it. **Collection tags are no
  longer shown on the card** — they still exist and still drive the
  sidebar/drawer filter above and the admin, just not the card's own
  display (a deliberate change in this pass). Cards are visually denser
  (smaller padding/text) than the pre-Sprint-1 design. Both the photo and
  the name/brand/SKU/description block are wrapped in separate `<Link>`s
  to `/product/[id]` (§2.14) — kept as siblings of the wishlist heart and
  the price/quantity row, not nested inside the links, so those controls
  keep working without needing `stopPropagation`.
- **Floating admin button** (`FloatingAdminButton`): fixed bottom-right,
  links to `/admin/login`.
- **Cart drawer** and **Wishlist drawer** (see §2.2/§2.3) are always mounted
  on this page (invisible until opened) so the header icons and the
  auto-open-on-add behavior work here.
- **Footer** (§2.13a): every customer-facing page, including this one, ends
  with the site footer.

### 2.2 Cart & Checkout

- **Cart state** (`CartContext`, `src/components/cart/CartContext.tsx`): a
  React Context holding `{ productId: quantity }`, persisted to
  `localStorage` (`shokakko_cart`) and mounted once at the root layout so it
  survives navigating between `/`, `/checkout`, and the order confirmation
  page. Quantity is clamped 0–10. The moment an item's quantity goes from 0
  to any positive number, the cart drawer auto-opens.
- **Cart drawer** (`CartDrawer`): a right-side slide-in panel (see the
  shared `Drawer` primitive below). Desktop width ~30% of the viewport
  (clamped between a sensible min/max); near-full-width on mobile/tablet.
  Lists each line with a small photo, unit price, an inline quantity
  stepper, and the line subtotal. A "Next Step" button navigates to
  `/checkout` and closes the drawer — it does **not** trigger on every
  quantity change, only on the initial auto-open action described above,
  plus manual opens via the header cart icon.
- **`/checkout`** (`src/app/checkout/page.tsx` + `CheckoutForm.tsx`): fetches
  the current product catalog and `SiteSettings` server-side (so prices/
  availability are always fresh), reads the cart from `CartContext`, and
  shows each line with a **medium** product image, name, quantity, and
  price, plus a total. The page header shows the admin-uploaded logo in
  place of the old "Shokakko Australia" text (same fallback-to-text
  pattern as `SiteHeader`, at the page's original, un-enlarged size — the
  2x sizing in §2.1 is header-only). Below the order summary: the admin's
  **Pre-order Information** rich text (§2.15), if any has been written,
  then a **shipping notice** — "Tax included. Shipping fee may apply. For
  details, please refer to our Shipping Policy." with "Shipping Policy"
  linking to `https://www.shokakko.com.au/pages/shipping-policy` in a new
  tab — then the same customer/shipping/billing/notes fields as before
  (extracted into a shared `PreOrderFormFields` component), with the
  submit button labeled **"Save My Pre-order."** Ends with the site
  footer (§2.13a). If the cart is empty, shows a "Your cart is empty"
  state with a link back to `/`.
- **Submission**: still the `submitPreOrder` Server Action
  (`src/app/order/actions.ts`) — validates the form, re-fetches product data
  server-side (never trusts client-submitted prices/names), generates the
  next sequential order number (§2.7), creates the `PreOrder` + `OrderItem`
  rows, and redirects to `/order/[orderNumber]`.
- **Cart clearing**: a small client component, `ClearCartOnMount`, mounted
  only on the order confirmation page, calls `clearCart()` once on mount.
  This is deliberate — `submitPreOrder` redirects server-side on success, so
  there's no client-side "it worked" callback to hook into; clearing on the
  confirmation page (only ever reached after a real, successful order)
  means a failed/invalid submission never wipes out the customer's cart.

### 2.3 Wishlist — the Pre-order Workspace (Sprint 2: now durable)

Belongs conceptually to the customer's "Pre-order Workspace," not a
traditional ecommerce wishlist — its job is helping someone narrow down a
100–200-product exhibition catalogue to what they actually want to order,
not a saved-for-later list they browse after checkout.

- **State** (`WishlistContext`, `src/components/wishlist/WishlistContext.tsx`):
  a React Context holding an array of wishlisted product IDs, with **two
  persistence modes** that the Provider switches between transparently —
  every consumer (`ProductCard`, the Product Details page, the header, the
  drawer, the filter) calls the same `has`/`toggle`/`ids`/`count` API in
  either mode and needs no awareness of which one is active:
  - **Local mode** (before a customer's first pre-order submission):
    unchanged from Sprint 1 — persisted to `localStorage`
    (`shokakko_wishlist`), linked only to that browser, survives refresh
    and browser restart, no database row, no server round-trip.
  - **Linked mode** (after a customer's first pre-order submission): every
    `toggle()` optimistically updates local state immediately (instant UI,
    no page reload) and fires the `toggleWishlistItem` Server Action
    (`src/components/wishlist/actions.ts`) in the background to create/
    delete the matching `WishlistItem` row, rolling the optimistic update
    back if the write fails. The root layout (`src/app/layout.tsx`, now
    `async`) reads the `shokakko_preorder_token` cookie on every request,
    resolves it to the linked order's current wishlisted product IDs
    (`getLinkedWishlist`, `src/lib/wishlist.ts`), and passes them into
    `WishlistProvider` as the initial state — so the wishlist is already
    correct on first paint, no client-side fetch-on-mount step.
- **Migration, exactly once, at first submission**: `submitPreOrder`
  (§2.2) reads the wishlist IDs the checkout form submits alongside the
  cart, re-validates every ID against real products server-side (never
  trusts client data), creates one `WishlistItem` row per valid ID
  attached to the new `PreOrder`, and sets the `shokakko_preorder_token`
  httpOnly cookie (1-year expiry — "survives browser restart"). From that
  point on, the *same browser* is in linked mode for every future visit;
  see §14 for what happens if that browser later submits a **second**
  pre-order.
- Every `ProductCard` and the Product Details page (§2.14) have a heart
  button that calls `toggle(productId)` — visually ♡ (not wishlisted) ↔
  ❤️ (wishlisted) — and stay in sync automatically in both modes, since
  they share the one Context.
- **Header**: the wishlist icon itself switches ♡ → ❤️ once `count > 0`
  (new in Sprint 2, previously always ♡), in addition to the existing
  numeric badge.
- **Wishlist drawer** (`WishlistDrawer`): opened from the header's heart
  icon. **New in Sprint 2**: a full-width bottom sheet on mobile (slides up,
  rounded top corners, capped height) rather than the side-panel every
  other drawer uses — see §2.4 — reverting to the same ~30%-width side
  panel from the `sm` breakpoint up. Lists every wishlisted product still
  in the catalog with photo, name, **brand** (new), price, a live
  **Product Status** indicator (new — 🟢 Available / 🟡 Price Coming Soon /
  🔴 Sold Out, computed from the product's current data on every render,
  so it updates automatically the moment Karen changes a price or status —
  never a stale snapshot, and never requires the customer to "recreate"
  anything), a "Remove" action, and — if the product is `active` — a
  **"Move to Pre-order"** button (renamed from "Add to cart") that calls
  both `CartContext.addItem` (qty 1) and `wishlist.toggle` (remove) in one
  click, updating both header counters immediately with no page reload.
- **Not snapshotted, by design**: unlike `OrderItem` (§2.2), a
  `WishlistItem` only stores a `productId` reference, not a copy of the
  product's name/price/status. The entire point of the wishlist is *live*
  status, and if a product is later deleted from the catalog its
  `WishlistItem` rows cascade-delete too — there's nothing meaningful left
  to show.

### 2.4 Shared `Drawer` primitive

`src/components/ui/Drawer.tsx` — one component backs the Cart drawer, the
Wishlist drawer, and the mobile Filter drawer. Always rendered in the DOM
(even when closed) and animated via CSS `opacity`/`translate-x` (or, for
the bottom-sheet variant, `translate-y`) transitions (no animation
library). Closes on Escape, backdrop click, or its own ✕ button; locks
`document.body` scroll while open.

**New in Sprint 2**: an opt-in `mobileVariant?: "side" | "bottom-sheet"`
prop, default `"side"` — the exact, unchanged behavior every existing
consumer (Cart drawer, mobile Filter drawer) already had, full-height
right-side slide-in at every breakpoint. Only the Wishlist drawer passes
`"bottom-sheet"`: full-width, slides up from the bottom with rounded top
corners and a capped height (`max-h-[85vh]`) on mobile, reverting to the
identical side panel as every other drawer from the `sm` breakpoint up.

### 2.5 Order confirmation page (`/order/[orderNumber]`) — the "Success Page"

Unchanged in behavior from before Sprint 1 (still public, still `noindex`,
still shows the itemized order/addresses) except that it now also mounts
`ClearCartOnMount` (§2.2), the order number it displays follows the new
sequential format (§2.7), and — **new in Sprint 2** — if the order has a
secure `editToken` (§4.7, every order created from this point on has one),
an "Edit My Pre-order" card renders between the thank-you message and the
itemized order: the future edit URL (`/edit/{token}`) shown as **inert,
non-clickable text** (that route doesn't exist yet — a live link would 404
today), a "Copy Link" button (`CopyLinkButton`, `navigator.clipboard`),
and a note that email delivery is coming in a future sprint and to
bookmark this page in the meantime. This is the temporary stand-in for the
"real" delivery mechanism described in §15 — this page, not email, is
currently the only place a customer ever sees their edit link.

### 2.6 "My Pre-order" placeholder (`/my-preorders`)

Still a static page — heading "My Pre-order," a short explanation that this
feature is coming in a later sprint, and a description of the **intended**
future design: the customer enters their email address, and if a pre-order
exists for that address, the system sends a secure "Edit My Pre-order"
link. **Nothing behind this page is implemented yet** — no form, no email
lookup, no data access. This project is intentionally accountless; there is
no plan to add customer login/passwords.

Sprint 2 prepared the *architecture* this page will eventually need
(§2.5/§4.7 — every order now gets a stored `editToken`) but deliberately
did not build the `/edit/[token]` page or wire this placeholder up to
anything — the only place a customer can see their own edit link today is
the order confirmation page's Success Page card (§2.5), not this page.

### 2.7 Sequential order numbers

Replaces the earlier random `SHK-YYMMDD-XXXX` format. `src/lib/order-number.ts`
(server-only):

```ts
export async function getNextOrderNumber(): Promise<string> {
  const seq = await db.orderSequence.upsert({
    where: { id: "singleton" },
    update: { lastNumber: { increment: 1 } },
    create: { id: "singleton", lastNumber: 1001 },
  });
  return `PO${seq.lastNumber}`;
}
```

Backed by a single-row `OrderSequence` table (§4.6) that only ever
increments — deleting a `PreOrder` can never free up or reuse its number.
The first order generated is `PO1001`, then `PO1002`, and so on. Shown
wherever an order number already appeared: the admin pre-orders list/detail,
and the customer order-confirmation page. **Not** wired into any email,
CSV export, or a dedicated customer-facing "edit my order" page — none of
those exist in this codebase (see §15/§16).

### 2.8 Admin: product management, extended

Everything from the original product admin (`/admin/products`, `/new`,
`/[id]`) still applies, plus:

- **Multiple photos per product**, with drag-and-drop reordering
  (`ProductImageManager.tsx`, native HTML5 drag events — `draggable`,
  `onDragStart`/`onDragOver`/`onDrop`, no new dependency). The first photo
  in the order is the product's thumbnail everywhere on the customer site.
  Photos can be added, removed, and reordered in the same form submission;
  the server resolves an `imageOrder` token list (`"existing:<id>"` /
  `"new:<fileIndex>"`) against the uploaded files to know exactly what
  changed.
- **Product Type**: a free-text field (`Product.type`), same pattern as
  `brand` — no fixed/predefined list.
- **Product Status** replaces the old "Visible to customers" checkbox with
  a three-way select: **Active** (visible + orderable), **Sold Out**
  (visible, not orderable — customers see a badge instead of a quantity
  control), **Draft** (hidden from the customer site entirely, same
  behavior as the old unchecked state).
- The product list/edit pages show the primary photo (`images[0]`), a
  "Draft"/"Sold Out" badge (replacing the old "Hidden" badge), and the
  product's type in its summary line.

### 2.9 Admin: Hero Banner management (`/admin/banners`, new)

- **List** (`/admin/banners`): every banner, drag-to-reorder (updates
  `sortOrder` via a `reorderBanners` Server Action), an inline
  Enable/Disable toggle per row, Edit/Delete actions. Capped at **5**
  banners — the "+ Add banner" button hides once the limit is reached, and
  `createBanner` also enforces the limit server-side.
- **Create/Edit** (`/new`, `/[id]`, sharing `BannerForm.tsx`): headline
  (required), description, button text + URL (both optional — button only
  renders on the homepage if both are set), and **three separate image
  uploads** — desktop (1920×600), tablet (1600×500), mobile (1080×1350) —
  true responsive variants, not one image scaled by CSS. On create, all
  three images are required; on edit, an unreplaced slot keeps its existing
  image. An "Active" checkbox controls whether the banner is included in
  the homepage rotation.

### 2.10 Admin: Site Settings (`/admin/settings`, new)

A single settings form (not a list) backing the `SiteSettings` singleton
row: logo upload (with a "remove current logo" option), event name, event
location, free-text event info, and an optional countdown target
date/time (`<input type="datetime-local">`). Saving shows an inline "Settings
saved" confirmation. All fields are optional — an empty settings row means
the homepage's `EventInfoStrip` renders nothing and the header falls back to
the text logo.

### 2.11 Admin pre-order management

Unchanged in behavior from before Sprint 1 — `/admin/preorders` (list) and
`/[id]` (detail), status dropdown (new/confirmed/fulfilled/cancelled). The
order number displayed now follows the new `PO####` format automatically,
since both pages simply render `order.orderNumber`.

### 2.12 Image storage (swappable adapter)

Unchanged architecture from before Sprint 1 — `src/lib/storage/` with a
`local` driver (default, filesystem-based, dev-only) and a `vercel-blob`
driver (implemented, not yet the active default). Now called from three
places instead of one: product photos (multiple per product), hero banner
images (three per banner), and the site logo — all through the same
`storage.save(file)`/`storage.remove(url)` interface, no changes needed to
the adapter itself to support the new callers.

### 2.13 Brand theme

Colors unchanged from before Sprint 1 (`#97b4d6` blue, `#e0c9e8` lavender,
`#e89898` coral, `#ddefe6` mint, `rounded-card`/`rounded-pill` radii — see
§12). **Fonts changed in this pass**: the whole site now uses a single
font, **Poppins**, replacing the Baloo 2 (headings) + Nunito (body) pair —
see §12 for how this was done without touching every component. Sprint 1
added a consistent emoji icon set for the header/drawers (♡/❤️ wishlist,
🛍️ cart, 🧾 my pre-order, 🔐 admin login, ⠿ drag handle) alongside the
pre-existing set (🎀 placeholder photo, 📦 estimated arrival, 🌸 order
confirmation, ✿ logo mark) — still no icon library.

### 2.13a Footer

`src/components/layout/Footer.tsx` — two links, "Contact Us"
(`https://www.shokakko.com.au/pages/contact-us`) and "Shipping Policy"
(`https://www.shokakko.com.au/pages/shipping-policy`), both opening in a
new tab. Rendered at the bottom of every customer-facing page: `/`,
`/checkout`, `/product/[id]`, `/order/[orderNumber]`, `/my-preorders`. Not
rendered on any `/admin/*` page.

### 2.14 Product Details page (`/product/[id]`, new)

`src/app/product/[id]/page.tsx` (Server Component, `force-dynamic`, same
reasoning as the homepage — live prices/availability during a live
exhibition) + `ProductDetailsView.tsx` (client). Fetches the same
active/sold-out catalog query as the homepage, finds the requested
product, and calls `notFound()` if it doesn't exist or is `draft`
(matching the homepage's visibility rule). Renders the full `SiteHeader`,
`CartDrawer`, and `WishlistDrawer` (passed the *entire* catalog, not just
the one product being viewed, so cart/wishlist lines from other products
still resolve correctly in those drawers), and the footer (§2.13a).

The details view itself shows: an image gallery (a large main photo plus a
clickable thumbnail strip when there's more than one — `product.images`
supports any number), brand, name, SKU, product type (if set), a "Sold
Out" badge when applicable, description, estimated arrival, price (or
"Price Coming Soon"), a Wishlist toggle button, and either an "Add to
Pre-order" button (calls `CartContext.addItem`, which auto-opens the cart
drawer on first add — same mechanism the grid already used) or, once the
item is in the cart, the same `QuantitySelector` used everywhere else in
its place. A "← Back to shopping" link returns to `/`.

Every `ProductCard` on the homepage links here (§2.1).

### 2.15 Admin: Pre-order Information rich text editor (new)

A WYSIWYG editor (`PreorderInfoEditor.tsx`, built on
[Tiptap](https://tiptap.dev) — see §7 for why this is the one new
dependency since Sprint 1) added to the existing Site Settings form
(`/admin/settings` — no new page, no second save action, just one more
field in the same form). Its toolbar supports Bold, Italic, Bullet list,
Numbered list, and Link (prompted via `window.prompt` for the URL, kept
simple rather than building a link popover). Writes its HTML into a
hidden `preorderInfoHtml` form field on every edit, submitted together
with the rest of the Settings form.

**Deliberately narrow schema**: the editor only registers
paragraph/bold/italic/bulletList/orderedList/listItem/link — headings,
images, code blocks, blockquotes, and horizontal rules are disabled via
`StarterKit.configure({...: false})`. Because Tiptap (built on
ProseMirror) can only ever produce HTML representable in its own
registered schema — including from pasted content, which gets filtered
down to the same allow-list — this means there's no path to an injected
`<script>` tag or event-handler attribute without a separate sanitizer
library. Only the single admin password-holder can ever write this
content (same trust boundary as the pre-existing, undocumented-elsewhere
banner `buttonUrl` field — see §11).

The saved HTML renders on `/checkout` via `dangerouslySetInnerHTML`,
above the pre-order form (§2.2), styled by a small `.rich-text` CSS block
in `globals.css` shared between the editor's own live view and the
checkout page's rendered output. An empty/untouched editor
(Tiptap's canonical empty output, `<p></p>`) is stored as `null`, not as
an empty paragraph, so the checkout page simply doesn't render the block
when nothing's been written.

### 2.16 Email Communication System (Sprint 3)

**No real email provider is wired up this sprint** (per your explicit
scope decision) — everything below builds the complete template system,
the admin authoring/preview experience, and the architecture for sending,
but nothing ever actually leaves the server. "Generate Email" renders and
saves HTML and prepares recipient data; it never calls `emailService.send()`.

#### 2.16.1 Email Design System

`src/lib/email/components/` — eight independent, reusable components, all
plain React returning `<tr>`-level fragments (no JSX assumptions about
their parent beyond "inside an email `<table>`"), so any template can mix
and match them:

| Component | Renders |
|---|---|
| `Header` | Centered logo (`SiteSettings.logoUrl`, text-wordmark fallback) + event title (`SiteSettings.eventName`) |
| `HeroBanner` | One configurable image (`SiteSettings.emailHeroImageUrl`/`emailHeroLinkUrl`) — renders nothing if unset |
| `Greeting` | "Hi {first name}," — first name only, via `getFirstName()` (§2.16.4) |
| `KarenNotes` | Admin rich text, reusing the exact same Tiptap editor component as `preorderInfoHtml` (§2.15), just a different form field name |
| `CollectionCard` | Square image + name, links to `/collections/[id]` |
| `ProductCard` | Square photo, brand, name, price/"Price Coming Soon", 🟢/🟡/🔴 status (mirrors the Sprint 2 wishlist-drawer convention), links to `/product/[id]` — the **same** component instance backs Karen's Picks, New Products, *and* Price Updates, no duplicate layouts |
| `CTAButton` | One large rounded pill button, configurable text + URL |
| `Footer` | Contact Us / Shipping Policy / Website / Instagram (all from `SiteSettings`' `email*` fields) + a per-recipient Unsubscribe link |

Plus internal, non-shared plumbing: `ResponsiveCardGrid` (the fluid
`inline-block`-column "3 desktop → 2 mobile" grid mechanic every card
grid uses, driven by one `.grid-col` media-query rule) and `EmailLayout`
(the `<html>/<head>/<body>` document shell + 600px content table every
template wraps around its composed sections — not one of the 8 named
components, just the wrapper they all sit inside).

**Business logic / presentation split**: `src/lib/email/data/{confirmation,update,reminder}.ts`
are pure functions that turn Prisma rows into plain-data props
(`ConfirmationEmailData`, `UpdateEmailData`, `ReminderEmailData`) — no
JSX. `src/lib/email/templates/*.tsx` only ever consume that plain data.
When your Canva designs are ready, only the components/templates change;
the data builders and every call site stay untouched.

**New dependency**: `@react-email/render` (`render(reactElement) → Promise<string>`)
— the only package installed. `@react-email/components` (a bundled
component library) was deliberately **not** installed: at install time it
and its entire sub-package tree showed as deprecated on npm ("no longer
supported"), so the 8 Design System components above are hand-built from
plain `<table>`/`<img>`/`<a>` elements instead — same "scoped, justified
exception" reasoning as the Tiptap precedent, but keeping the dependency
surface to the one non-deprecated piece actually needed.

**Known limitation**: Outlook's desktop (Word-engine) client doesn't run
the `.grid-col` media query, so it always shows the 3-column desktop
layout regardless of screen size there — a standard, accepted email-dev
trade-off.

#### 2.16.2 The three templates

- **Confirmation Email** (`ConfirmationEmail.tsx`) — Header, Greeting,
  Order Summary (template-specific, not shared), CTA Button, Footer.
  Dynamic fields: customer first name, order number, itemized order
  summary + total, the Edit My Pre-order link/button. **Placeholder
  layout** — no Canva design has been shared yet, per your answer;
  swapping it in later only touches this file and `OrderSummary.tsx`.
- **Update Email** (`UpdateEmail.tsx`) — the primary reusable
  "here's what's new" email. Header, Hero Banner, Greeting, Karen's
  Notes, Collection Cards, Product Card grids (Karen's Picks / New
  Products / Price Updates — §2.16.3), CTA Button, Footer. Every optional
  section only renders if its toggle is on *and* it has content.
- **Reminder Email** (`ReminderEmail.tsx`) — Header, Greeting, Countdown
  (template-specific, reuses `SiteSettings.countdownTargetAt`, the same
  field the homepage's `EventInfoStrip` already shows), CTA Button,
  Footer. Also a **placeholder layout**.

Neither Confirmation nor Reminder is wired to an automatic trigger point
this sprint (no send-on-checkout, no scheduled reminder) — both are only
reachable via their admin preview pages (§2.16.5). Wiring a real trigger
is Sprint 4 territory, once actual sending exists.

#### 2.16.3 Notification Centre (`/admin/emails`)

"Collect changes throughout the day, then generate one digest" — modeled
as a single **current draft** `EmailDigest` row (the most recent one with
`status` in `draft`/`generated`; created lazily on first visit, like
`SiteSettings`' singleton pattern but with history preserved instead of a
literal singleton id). The admin edits toggles, Karen's Notes, which
Collections/products to feature, subject, and CTA text/URL — then clicks
**Generate Email**, which:

1. Saves whatever's currently in the form onto the draft.
2. Computes **New Products** (`Product.isNew: true`, active) and
   **Price Updates** (active products whose `priceCents` differs from
   their `lastNotifiedPriceCents` baseline — products with no baseline
   yet are excluded, nothing to compare against) from live product state.
3. Snapshots both into `EmailDigestItem` rows (replacing this draft's
   prior snapshot, so re-generating reflects current state, not
   duplicates) — same "snapshot, not live reference" reasoning as
   `OrderItem` vs. `WishlistItem` elsewhere in this schema, so a digest's
   history stays accurate even after the product changes again.
4. **Advances `lastNotifiedPriceCents`** to the current price for every
   product just captured — this is the diff-consuming checkpoint for this
   sprint, since there's no real send yet to hang it off.
   `lastNotifiedPriceCents` is also seeded to a product's starting price
   automatically on creation, so its very first edit is correctly
   detectable without needing a prior digest.
5. Computes `recipients` (every `PreOrder` with `unsubscribedAt: null`)
   and `recipientCount` — "prepare all required recipient data."
6. Renders the final HTML (`renderUpdateEmail`) and saves it to
   `renderedHtml`; sets `status: "generated"`.

The page also shows a **live preview** (an `<iframe srcDoc>`) of the
current draft, refreshed on every Generate. A disabled "Send Update —
coming in Sprint 4" button sits next to Generate Email for continuity
with the original brief's language.

**Personalization caveat**: the saved `renderedHtml` is *one*
representative preview render (a generic placeholder name), not what
every recipient would actually receive — `renderUpdateEmail()` is fully
parameterized per-recipient already, so real per-recipient rendering at
send time is a small addition for whichever sprint wires up sending.

`/admin/emails/history` lists every digest ever generated (newest first);
`/admin/emails/history/[id]` shows a past digest's saved render plus
exactly which sections/products/collections were captured, read-only.
Since nothing is ever marked `"sent"` this sprint, history will show one
entry that keeps updating each time Generate Email runs — multiple rows
only start appearing once a future sprint adds a way to finalize/send a
digest and start a fresh draft.

`/admin/emails/confirmation` and `/admin/emails/reminder` are simple
preview harnesses — pick any existing real `PreOrder` from a dropdown,
render that template against it live. Nothing is persisted.

#### 2.16.4 Supporting pieces

- **`Product.isNew`** (new field) — a manual "🆕 Mark as New" checkbox on
  the product form (`ProductForm.tsx`), not automatic/date-based, so Karen
  controls exactly which products count as new and for how long.
- **`Product.lastNotifiedPriceCents`** (new field) — the Price Updates
  baseline described above.
- **`Tag.imageUrl`** (new field) — collections had no image at all before
  this sprint. Managed at `/admin/collections` (list every tag, inline
  square-image upload, same `storage.save`/`remove` pattern as every
  other image field in this app).
- **`/collections/[id]`** (new public page) — what a Collection Card
  actually links to. Server Component scoped to one tag, reuses the
  existing customer-facing `ProductCard` (`src/components/catalog/`)
  directly rather than the full `ProductBrowser` — no search/filter/sort
  needed, already narrowed to one collection. `/collections` is a simple
  index of every tag.
- **`PreOrder.unsubscribedAt`** (new field) + **`/unsubscribe/[token]`**
  (new public page) — the one deliberate exception to this app's
  "every mutation is a Server Action" convention: an unsubscribe link
  clicked from an email client is a plain GET navigation with no JS, so
  the write happens directly in the page component rather than behind a
  form submission. Written to be safe to load more than once (looks up
  the order by `editToken`, only sets `unsubscribedAt` if not already
  set, always shows the same confirmation).
- **`src/lib/email/site-url.ts`** — absolute-URL helpers (edit link,
  product link, collection link, unsubscribe link, footer links) shared
  by every data builder, extracted from the protocol/host-detection logic
  that originally lived inline in the order confirmation page (Sprint 2).
- **`src/lib/email/first-name.ts`** — `getFirstName()`, since
  `PreOrder.customerName` only ever stores one "Full name" field; every
  Greeting shows first name only, per your explicit instruction.
- **`EmailService` interface** (`src/lib/email/types.ts`) — swappable
  send abstraction, same pattern as `StorageAdapter`
  (`src/lib/storage/types.ts`). Its only implementation this sprint,
  `consoleEmailService`, just logs — nothing calls `.send()` yet. A real
  driver (Resend, Brevo, SES, ...) plugs in behind this interface later
  with no changes needed anywhere that already imports `emailService`; no
  provider is hard-coded, per your explicit instruction.

---

## 3. Screens (complete list, exactly as they behave today)

| Screen | Route | Auth | Renders |
|---|---|---|---|
| Homepage | `/` | Public | Header, hero carousel, event info, toolbar, filters, product grid, footer (§2.1) |
| Product Details | `/product/[id]` | Public | Image gallery, full details, wishlist/add-to-pre-order (§2.14) |
| Checkout | `/checkout` | Public | Cart summary, pre-order info, shipping notice, pre-order form (§2.2) |
| Order confirmation | `/order/[orderNumber]` | Public (token-based via the order number) | Order summary, clears the cart (§2.5) |
| My Pre-order (placeholder) | `/my-preorders` | Public | Static explanation, no functionality (§2.6) |
| Collection | `/collections/[id]` | Public | Products in one tag — Email Collection Cards link here (§2.16.4) |
| Collections index | `/collections` | Public | Every collection, square image + name |
| Unsubscribe | `/unsubscribe/[token]` | Public (token-based) | Sets `PreOrder.unsubscribedAt`, confirmation message (§2.16.4) |
| Admin login | `/admin/login` | Public | Password form |
| Admin dashboard | `/admin` | Admin session required | Stat tiles + quick links |
| Admin product list | `/admin/products` | Admin session required | Product table |
| Admin add product | `/admin/products/new` | Admin session required | `ProductForm` (create mode) |
| Admin edit product | `/admin/products/[id]` | Admin session required | `ProductForm` (edit mode) + Delete |
| Admin banner list | `/admin/banners` | Admin session required | Drag-reorderable banner list (§2.9) |
| Admin add banner | `/admin/banners/new` | Admin session required | `BannerForm` (create mode) |
| Admin edit banner | `/admin/banners/[id]` | Admin session required | `BannerForm` (edit mode) + Delete |
| Admin collections | `/admin/collections` | Admin session required | Tag list, inline square-image upload (§2.16.4) |
| Admin Notification Centre | `/admin/emails` | Admin session required | Update Email draft editor + live preview + Generate Email (§2.16.3) |
| Admin email history | `/admin/emails/history`, `/history/[id]` | Admin session required | Past generated digests, read-only detail |
| Admin Confirmation preview | `/admin/emails/confirmation` | Admin session required | Live preview against a real order |
| Admin Reminder preview | `/admin/emails/reminder` | Admin session required | Live preview against a real order |
| Admin settings | `/admin/settings` | Admin session required | Logo/event/countdown form + Email settings (§2.10, §2.16.4) |
| Admin pre-order list | `/admin/preorders` | Admin session required | Pre-order table |
| Admin pre-order detail | `/admin/preorders/[id]` | Admin session required | Full order detail |
| 404 (not found) | any unmatched path | Public | Next.js's default, unstyled not-found page — still no custom `not-found.tsx` |

---

## 4. Database Structure

ORM: **Prisma 7.9.1**, SQLite via `@prisma/adapter-libsql`. Schema file:
`prisma/schema.prisma`. Migration history now includes Sprint 1's
expand-then-contract sequence (§4.7).

### 4.1 `Product`

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `brand` | `String` | Required |
| `name` | `String` | Required |
| `sku` | `String` | Required, **unique** |
| `description` | `String?` | Optional |
| `estimatedArrival` | `String?` | Optional, free text |
| `priceCents` | `Int?` | Optional; `null` renders as "Price Coming Soon" |
| `currency` | `String` | Default `"AUD"` |
| `type` | `String?` | **New in Sprint 1** — free text, same pattern as `brand` |
| `status` | `String` | **New in Sprint 1**, default `"active"` — `"active"` \| `"draft"` \| `"sold_out"`. Replaces the removed `isActive` boolean |
| `sortOrder` | `Int` | Default `0`; ascending sort key |
| `isNew` | `Boolean` | **New in Sprint 3**, default `false` — manual "🆕 Mark as New" admin toggle for the Update Email's New Products section (§2.16.4) |
| `lastNotifiedPriceCents` | `Int?` | **New in Sprint 3** — Price Updates baseline; seeded to `priceCents` on create, advanced only by "Generate Email" (§2.16.3) |
| `createdAt` / `updatedAt` | `DateTime` | Auto-managed |
| `images` | `ProductImage[]` | **New in Sprint 1** — replaces the removed `imageUrl` string |
| `tags` | `Tag[]` | Implicit many-to-many |
| `orderItems` | `OrderItem[]` | One-to-many |
| `digestItems` | `EmailDigestItem[]` | **New in Sprint 3** — see §4.7b |
| `recommendedInDigests` | `EmailDigest[]` | **New in Sprint 3** — digests that featured this product under Karen's Picks |

`imageUrl` and `isActive` **no longer exist** on this model — removed in a
follow-up migration after their data was backfilled into `images`/`status`
(see §4.7).

### 4.2 `ProductImage` (new in Sprint 1)

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `productId` | `String` | FK → `Product.id`, `onDelete: Cascade` |
| `url` | `String` | Public URL from the active storage adapter |
| `sortOrder` | `Int` | Default `0` — admin-drag-and-drop order; the lowest is the product's thumbnail everywhere |
| `createdAt` | `DateTime` | Auto-set |

### 4.3 `HeroBanner` (new in Sprint 1)

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `headline` | `String` | Required |
| `description` | `String?` | Optional |
| `buttonText` / `buttonUrl` | `String?` | Both optional; the CTA button only renders if both are set |
| `desktopImageUrl` | `String` | Required (1920×600) |
| `tabletImageUrl` | `String` | Required (1600×500) |
| `mobileImageUrl` | `String` | Required (1080×1350) |
| `isActive` | `Boolean` | Default `true` — controls inclusion in the homepage rotation |
| `sortOrder` | `Int` | Default `0` — admin-drag-and-drop order; also the rotation order |
| `createdAt` / `updatedAt` | `DateTime` | Auto-managed |

No hard database constraint caps the row count at 5 — the limit is enforced
in `createBanner` (`src/app/admin/(protected)/banners/actions.ts`) and
reflected in the admin UI (the "+ Add banner" button hides at 5).

### 4.4 `SiteSettings` (new in Sprint 1)

| Field | Type | Notes |
|---|---|---|
| `id` | `String` | Always `"singleton"` — single-row table by convention, not a DB-level constraint |
| `logoUrl` | `String?` | Header logo; falls back to the text wordmark if unset |
| `eventName` / `eventLocation` / `eventInfo` | `String?` | All optional, shown in the homepage's event info strip |
| `countdownTargetAt` | `DateTime?` | Optional — if unset, no countdown renders |
| `preorderInfoHtml` | `String?` | **New in this pass** — admin-authored rich text (Tiptap), rendered above the checkout form; see §2.15 |
| `emailHeroImageUrl` / `emailHeroLinkUrl` | `String?` | **New in Sprint 3** — the Update Email's one Hero Banner image + optional link (§2.16.1) |
| `emailContactUrl` / `emailShippingPolicyUrl` / `emailWebsiteUrl` / `emailInstagramUrl` | `String?` | **New in Sprint 3** — admin-configurable email Footer links, independent of the site-wide `Footer.tsx` component (which stays hardcoded) |
| `updatedAt` | `DateTime` | Auto-managed |

Lazily created via `upsert` on first save (`updateSiteSettings`) — no
migration-time seed row required.

### 4.5 `Tag`

`id`, `name` (unique), implicit many-to-many with `Product` via a
Prisma-managed `_ProductToTag` join table — unchanged since before Sprint
1. **New in Sprint 3**: `imageUrl` (`String?`) — the square Collection
Card image (§2.16.1/§2.16.4), managed at `/admin/collections`; collections
had no image at all before this sprint.

### 4.6 `OrderSequence` (new in Sprint 1)

| Field | Type | Notes |
|---|---|---|
| `id` | `String` | Always `"singleton"` |
| `lastNumber` | `Int` | Default `1000` — the next generated order number is `PO${lastNumber}` after an atomic increment; see §2.7 |

### 4.7 `PreOrder` / `OrderItem`

Structurally unchanged from before Sprint 1 for `OrderItem` (still
snapshotting product details with a nullable `productId`/`SetNull`). `
PreOrder` gained two things in Sprint 2:

| Field | Type | Notes |
|---|---|---|
| `editToken` | `String?` | **New in Sprint 2** — `@unique`, nullable (old pre-Sprint-2 orders have none). A random 24-char token (`nanoid`, `src/lib/edit-token.ts`) generated once at submission and never rotated. Three purposes: (1) the future `/edit/{token}` URL, (2) the `shokakko_preorder_token` cookie that links linked-mode wishlist writes back to this order (§2.3), and (3) **new in Sprint 3** — the `/unsubscribe/{token}` link in every email's Footer. |
| `wishlistItems` | `WishlistItem[]` | **New in Sprint 2** — see §4.7a. |
| `unsubscribedAt` | `DateTime?` | **New in Sprint 3** — set when this customer clicks Unsubscribe (§2.16.4); excludes them from every future `EmailDigest`'s `recipients`. |
| `receivedDigests` | `EmailDigest[]` | **New in Sprint 3** — which digests counted this order as a recipient (computed at generate time). |

The only functional change to `orderNumber` itself is **how** it's
generated (§2.7) — the column didn't change shape.

### 4.7a `WishlistItem` (new in Sprint 2)

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `preOrderId` | `String` | FK → `PreOrder.id`, `onDelete: Cascade` |
| `productId` | `String` | FK → `Product.id`, `onDelete: Cascade` |
| `addedAt` | `DateTime` | Auto-set |

`@@unique([preOrderId, productId])` prevents duplicate rows for the same
product on the same order. Deliberately **not** a snapshot (contrast with
`OrderItem`) — the wishlist's whole purpose is live status, so it's a
plain reference to the current `Product` row; if the product is deleted,
its `WishlistItem` rows cascade-delete with it. Tied to `PreOrder`, not a
new `Customer` entity, to keep today's accountless model intact — see the
future-compatibility note in §16.

### 4.7b `EmailDigest` / `EmailDigestItem` (new in Sprint 3)

One prepared Update Email — see §2.16.3 for the full mechanics.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `status` | `String` | Default `"draft"` — `"draft"` \| `"generated"` \| `"sent"` (`"sent"` unused until a future sprint wires real sending) |
| `subject` | `String` | Default `"Shokakko Australia — Latest Updates"` |
| `karenNotesHtml` | `String?` | Same Tiptap-authored HTML pattern as `SiteSettings.preorderInfoHtml` |
| `showKarenNotes` / `showCollections` / `showRecommended` / `showNewProducts` / `showPriceUpdates` | `Boolean` | Section toggles, all default `false` |
| `ctaText` / `ctaUrl` | `String` | Defaults `"View New Products"` / `"/"` |
| `renderedHtml` | `String?` | Saved by Generate Email — one representative preview render, not per-recipient (§2.16.3) |
| `recipientCount` | `Int?` | Computed at generate time |
| `generatedAt` | `DateTime?` | Set by Generate Email |
| `collections` | `Tag[]` | Admin-picked, implicit many-to-many |
| `recommendedProducts` | `Product[]` | Admin-picked ("Karen's Picks"), implicit many-to-many |
| `recipients` | `PreOrder[]` | Computed at generate time — every non-unsubscribed `PreOrder` |
| `items` | `EmailDigestItem[]` | Computed sections, snapshotted — see below |

`EmailDigestItem` snapshots the **computed** sections (New Products,
Price Updates) at generate time — unlike `collections`/`recommendedProducts`
(admin-picked, so a live relation is fine), these are automatic, so a row
is captured per item with `kind` (`"new"` \| `"price_update"`),
`productName`, `priceCents`, and (for `price_update` only)
`previousPriceCents` — same "snapshot vs. live-reference" reasoning as
`OrderItem` vs. `WishlistItem`, so a digest's history stays accurate even
if the product's price changes again afterward, or the product is deleted
(`productId` is nullable, `SetNull`).

### 4.8 Migration history (Sprint 1's expand-then-contract sequence)

Because the dev database already held **real data** by the time this
sprint started (a product Karen added herself with a real photo, and a real
submitted pre-order — not just seed data), the `Product` schema change was
done in three migrations rather than one, specifically to avoid data loss:

1. **Expand**: add `ProductImage`, `HeroBanner`, `SiteSettings`,
   `OrderSequence`, and `Product.type`/`status`, while *keeping* the old
   `imageUrl`/`isActive` columns.
2. **Backfill** (a one-off script, not a migration): copy every non-null
   `Product.imageUrl` into a `ProductImage` row, and every `isActive: false`
   into `status: "draft"`. Verified against the live data before proceeding.
3. **Contract**: drop `Product.imageUrl` and `Product.isActive` now that
   nothing depends on them.

The UI Refinement Pass that followed needed only one additive, nullable
column (`SiteSettings.preorderInfoHtml`) — no expand/backfill/contract
sequence was necessary, since nothing existing was being removed or
reshaped. **Sprint 2** was the same shape again: one purely additive
migration — a nullable `PreOrder.editToken` column plus the new
`WishlistItem` table — nothing existing removed or reshaped, so no
expand/backfill/contract sequence was needed there either. Karen's one
pre-existing real order was backfilled with a generated `editToken` for
consistency (optional, but keeps real data on the same footing as new
orders). **Sprint 3** followed the same additive shape once more: two
nullable/defaulted columns each on `Product` and `PreOrder`, one nullable
column on `Tag`, six nullable columns on `SiteSettings`, and two new
tables (`EmailDigest`, `EmailDigestItem`) plus three new join tables for
the digest's many-to-many relations — nothing existing removed or
reshaped, `prisma migrate dev` applied it directly with no manual
workaround needed this time (no NULL-vs-UNIQUE warning to route around).

### 4.9 Entity relationships

```
Product ──(many-to-many)── Tag
Product ──(one-to-many, cascade on delete)── ProductImage
Product ──(one-to-many, optional FK, SetNull on delete)── OrderItem
Product ──(one-to-many, cascade on delete)── WishlistItem
Product ──(one-to-many, optional FK, SetNull on delete)── EmailDigestItem
Product ──(many-to-many)── EmailDigest (recommendedProducts)
Tag ──(many-to-many)── EmailDigest (collections)
PreOrder ──(one-to-many, cascade on delete)── OrderItem
PreOrder ──(one-to-many, cascade on delete)── WishlistItem
PreOrder ──(many-to-many)── EmailDigest (recipients)
EmailDigest ──(one-to-many, cascade on delete)── EmailDigestItem
HeroBanner, SiteSettings, OrderSequence — standalone, no FKs
```

Still no `User`/`Customer`/`Account` table — the admin identity remains a
single shared password in an environment variable, and the cart remains
entirely client-side. The wishlist is client-side until a customer's first
pre-order submission, then lives in the database attached to that
`PreOrder` (§2.3/§4.7a) — deliberately not a new `Customer` entity, so
"accountless" still holds even once wishlist data is durable.

---

## 5. API Structure

Still **no conventional REST or JSON API routes** — no `src/app/api/`
directory. Every write is a Next.js Server Action.

| Action | File | Auth | Behavior |
|---|---|---|---|
| `loginAction` | `admin/login/actions.ts` | None | Verifies password, sets session cookie |
| `logoutAction` | `admin/(protected)/actions.ts` | Admin session (via layout) | Clears session cookie |
| `createProduct` / `updateProduct` / `deleteProduct` | `admin/(protected)/products/actions.ts` | `requireAdmin()` | Product CRUD, now including multi-image resolution (§2.8) |
| `createBanner` / `updateBanner` / `deleteBanner` | `admin/(protected)/banners/actions.ts` | `requireAdmin()` | Banner CRUD, enforces the 5-banner cap on create |
| `toggleBannerActive` | same file | `requireAdmin()` | Single-field enable/disable, used by the drag-list's inline toggle |
| `reorderBanners` | same file | `requireAdmin()` | Batch `sortOrder` update from a drag-and-drop reorder |
| `updateSiteSettings` | `admin/(protected)/settings/actions.ts` | `requireAdmin()` | Upserts the `SiteSettings` singleton, now including `preorderInfoHtml` |
| `updatePreOrderStatus` | `admin/(protected)/preorders/actions.ts` | `requireAdmin()` | Updates `PreOrder.status` |
| `submitPreOrder` | `app/order/actions.ts` | None (public) | Validates, re-fetches products server-side, generates the next sequential order number and a secure `editToken`, creates the order + wishlist migration (§2.3), sets the `shokakko_preorder_token` cookie |
| `toggleWishlistItem` | `components/wishlist/actions.ts` | None (public — scoped by the caller's cookie-derived token, not a login) | **New in Sprint 2.** Looks up the `PreOrder` by `editToken`, no-ops silently if not found, otherwise creates/deletes the matching `WishlistItem` row. Called by `WishlistContext` only once a wishlist is in linked mode (§2.3) |
| `generateEmail` | `admin/(protected)/emails/actions.ts` | `requireAdmin()` | **New in Sprint 3.** Saves the Notification Centre form onto the current draft `EmailDigest`, computes/snapshots New Products + Price Updates, advances `Product.lastNotifiedPriceCents`, computes recipients, renders + saves `renderedHtml` (§2.16.3). Never calls `emailService.send()` |
| `updateTagImage` | `admin/(protected)/collections/actions.ts` | `requireAdmin()` | **New in Sprint 3.** Uploads/removes a `Tag`'s square Collection Card image |

Still no API rate limiting, no API key/token auth, no separate backend
service — the "API" and the web app remain the same Next.js process.

**One deliberate exception to "every mutation is a Server Action"**: the
public `/unsubscribe/[token]` page (§2.16.4) writes `PreOrder.unsubscribedAt`
directly in a Server Component during render, because an unsubscribe link
clicked from an email client is a plain GET navigation with no JS to
invoke a Server Action from. It's written to be safe to load more than
once.

---

## 6. Component Structure

```
src/
├── app/
│   ├── layout.tsx                 Root layout — now async (Sprint 2): reads the
│   │                               wishlist-link cookie, fonts, CartProvider +
│   │                               WishlistProvider(linkedToken, initialLinkedIds)
│   ├── page.tsx                   Homepage (Server Component, force-dynamic)
│   ├── product/[id]/
│   │   ├── page.tsx                 NEW (UI pass) — Product Details (Server Component)
│   │   └── ProductDetailsView.tsx   NEW (UI pass) — gallery, wishlist, add-to-pre-order (client)
│   ├── checkout/
│   │   ├── page.tsx                 Fetches SiteSettings too (logo, preorderInfoHtml)
│   │   └── CheckoutForm.tsx         + pre-order info render, shipping notice,
│   │                                 + wishlistJson hidden field (Sprint 2)
│   ├── my-preorders/page.tsx      Still a placeholder; ends with <Footer />
│   ├── order/
│   │   ├── actions.ts               submitPreOrder: + editToken generation, wishlist
│   │   │                             migration, sets shokakko_preorder_token cookie
│   │   └── [orderNumber]/page.tsx   Confirmation + ClearCartOnMount, <Footer />,
│   │                                 + Edit My Pre-order card (Sprint 2, §2.5)
│   ├── collections/
│   │   ├── page.tsx                 NEW (Sprint 3) — index of every collection
│   │   └── [id]/page.tsx            NEW (Sprint 3) — one collection's products,
│   │                                 reuses components/catalog/ProductCard
│   ├── unsubscribe/[token]/page.tsx NEW (Sprint 3) — sets PreOrder.unsubscribedAt
│   │                                 directly (§5's Server Action exception)
│   └── admin/
│       ├── login/                 Unchanged
│       └── (protected)/
│           ├── layout.tsx           Nav includes Banners/Collections/Emails/Settings
│           ├── products/            Extended: type/status, ProductImageManager,
│           │                         + isNew "Mark as New" checkbox (Sprint 3)
│           ├── banners/             list/new/[id]/actions/BannerForm/BannerList
│           ├── collections/         NEW (Sprint 3) — Tag list + TagImageForm.tsx
│           ├── emails/              NEW (Sprint 3) — Notification Centre:
│           │   ├── page.tsx           draft editor + live preview
│           │   ├── NotificationCentreForm.tsx
│           │   ├── actions.ts         findOrCreateCurrentDraft, generateEmail
│           │   ├── history/           past digests list + [id] read-only detail
│           │   ├── confirmation/      Confirmation Email preview (pick an order)
│           │   └── reminder/          Reminder Email preview (pick an order)
│           ├── settings/            + PreorderInfoEditor.tsx (Tiptap);
│           │                         + Email settings section (Sprint 3)
│           └── preorders/           Unchanged
├── components/
│   ├── Logo.tsx                    Unchanged text wordmark (fallback when no logo uploaded)
│   ├── ui/
│   │   ├── Button.tsx, Badge.tsx, Field.tsx   Unchanged
│   │   └── Drawer.tsx                Shared slide-in panel (Cart/Wishlist/Filter);
│   │                                  + opt-in mobileVariant="bottom-sheet" (Sprint 2)
│   ├── shared/
│   │   ├── DeleteButton.tsx        Unchanged
│   │   └── CopyLinkButton.tsx      NEW (Sprint 2) — clipboard-copy button, used
│   │                                on the order confirmation page's edit-link card
│   ├── layout/
│   │   ├── SiteHeader.tsx           Centered logo (minmax(0,1fr) grid), 2x size;
│   │   │                             wishlist icon swaps ♡→❤️ at count > 0 (Sprint 2)
│   │   ├── FloatingAdminButton.tsx
│   │   └── Footer.tsx               Contact Us / Shipping Policy links
│   ├── home/
│   │   ├── HeroCarousel.tsx         Responsive picture-based rotation
│   │   └── EventInfoStrip.tsx       Event info + live countdown
│   ├── cart/
│   │   ├── CartContext.tsx          localStorage-persisted cart state (unchanged)
│   │   ├── CartDrawer.tsx
│   │   └── ClearCartOnMount.tsx
│   ├── wishlist/
│   │   ├── WishlistContext.tsx      Sprint 2 — dual-mode (local/linked); public
│   │   │                             API unchanged, so every consumer below is
│   │   │                             unaffected by the mode switch
│   │   ├── WishlistDrawer.tsx       Sprint 2 — bottom-sheet on mobile, Brand +
│   │   │                             live Product Status per row, "Move to
│   │   │                             Pre-order" (was "Add to cart")
│   │   └── actions.ts               NEW (Sprint 2) — toggleWishlistItem Server Action
│   └── catalog/
│       ├── types.ts                  CatalogProduct: images[]/type/status replace imageUrl/isActive
│       ├── ProductCard.tsx           No tag badges; links to /product/[id]; "Price Coming Soon"
│       ├── ProductBrowser.tsx        Owns search/sort/filter state, renders the
│       │                              grid; + wishlistOnly filter condition (Sprint 2)
│       ├── ProductToolbar.tsx        Search + sort
│       ├── FilterGroups.tsx          The filter checkboxes/inputs;
│       │                              + "♡ Wishlist" checkbox (Sprint 2)
│       ├── FilterSidebar.tsx         Desktop wrapper around FilterGroups
│       ├── FilterDrawer.tsx          Mobile wrapper (uses Drawer)
│       ├── PreOrderFormFields.tsx    Extracted from the old OrderForm
│       └── QuantitySelector.tsx      Extended with a `size` prop (sm/md)
└── lib/
    ├── db.ts, auth.ts, session.ts    Unchanged
    ├── order-number.ts               Sequential PO#### generator
    ├── edit-token.ts                 NEW (Sprint 2) — generateEditToken() via nanoid
    ├── wishlist.ts                   NEW (Sprint 2) — getLinkedWishlist(token), the
    │                                  shokakko_preorder_token cookie name/TTL constants
    ├── catalog.ts                    Shared Prisma-row → CatalogProduct mapper
    ├── storage/                      Unchanged interface, more call sites
    ├── email/                        NEW (Sprint 3) — see §2.16
    │   ├── types.ts, console.ts, index.ts   EmailService interface + no-op driver
    │   ├── site-url.ts               Absolute-URL helpers (edit/product/
    │   │                              collection/unsubscribe links, footer links)
    │   ├── first-name.ts             getFirstName()
    │   ├── render.ts                 renderConfirmationEmail/renderUpdateEmail/
    │   │                              renderReminderEmail (@react-email/render)
    │   ├── components/                The 8-component Email Design System +
    │   │   │                          brand.ts, ResponsiveCardGrid, EmailLayout
    │   │   ├── Header.tsx, HeroBanner.tsx, Greeting.tsx, KarenNotes.tsx
    │   │   ├── CollectionCard.tsx, ProductCard.tsx, CTAButton.tsx, Footer.tsx
    │   │   └── ResponsiveCardGrid.tsx, EmailLayout.tsx, brand.ts
    │   ├── data/                      Business-logic layer — Prisma rows → plain props
    │   │   ├── confirmation.ts, update.ts, reminder.ts
    │   └── templates/                 Presentation layer — compose the 8 components
    │       ├── ConfirmationEmail.tsx, UpdateEmail.tsx, ReminderEmail.tsx
    │       └── OrderSummary.tsx, Countdown.tsx   (template-specific, not shared)
    └── validations/
        ├── product.ts                 type/status; PRODUCT_STATUSES union;
        │                               + isNew field (Sprint 3)
        ├── order.ts                   generateOrderNumber() removed (superseded)
        ├── banner.ts
        ├── settings.ts                + preorderInfoHtml field;
        │                               + email settings fields (Sprint 3)
        ├── email-digest.ts            NEW (Sprint 3) — Notification Centre form schema
        └── utils.ts                   Unchanged
```

**Removed in Sprint 1**: `components/catalog/OrderSheet.tsx`,
`CartBar.tsx`, `TagFilter.tsx`, `OrderForm.tsx` — all superseded by the
components listed above. Nothing was removed in the UI Refinement Pass,
Sprint 2, or Sprint 3 — every change across all three was additive or
in-place.

State management: still no global state library. Two React Contexts
(`CartContext`, `WishlistContext`) exist for state that genuinely needs to
be shared across sibling components (header badges, drawers, grid) and
survive client-side navigation — both are thin and hand-written, not a
general-purpose store. `CartContext` is `localStorage`-backed only.
`WishlistContext` (Sprint 2) is dual-mode — `localStorage`-backed until a
customer's first pre-order submission, then server-backed (cookie +
Server Actions) from that point on — see §2.3.

---

## 7. Technical Architecture

Unchanged from before Sprint 1 in every load-bearing way: Next.js 16.3.0
(App Router, Turbopack), React 19.2.8, TypeScript strict mode, Tailwind CSS
v4 (CSS-first `@theme`, no config file), Prisma 7.9.1 with the
`@prisma/adapter-libsql` driver adapter on SQLite, Zod 4 for validation,
Server Actions for all mutations (still no REST/GraphQL layer), the
from-scratch HMAC-signed-cookie admin auth, the swappable image storage
adapter, pnpm. **No new external services or dependencies were introduced
in Sprint 1** — the entire redesign (drawers, carousel, countdown,
drag-and-drop reordering, multi-select filters) was built with the
framework's own primitives (React state/Context, native HTML5 drag events,
CSS transitions, `<picture>`), consistent with the project's established
minimal-dependency approach.

**The UI Refinement Pass that followed added exactly one new dependency**:
[Tiptap](https://tiptap.dev) (`@tiptap/react`, `@tiptap/pm`,
`@tiptap/starter-kit`) for the admin's rich text editor (§2.15) — genuine
WYSIWYG editing isn't reasonably hand-rollable with native
`contentEditable` (deprecated `execCommand`, inconsistent cross-browser
behavior), so this is a deliberate, scoped exception to the
zero-new-dependencies pattern, not a drift away from it. Everything else
in that pass (the font swap, the centered header, the Product Details
page, the footer) used only framework/CSS primitives, same as Sprint 1.

The customer-facing pages that now read live client state
(`CartProvider`/`WishlistProvider`, mounted in the root layout) are still
Server-Component-first for data fetching — `/` and `/checkout` are Server
Components that fetch from Prisma and pass plain data down to Client
Component leaves; only the interactive leaves (`ProductBrowser`,
`ProductCard`, the drawers, the header) are `"use client"`.

**New in Sprint 2**: the root layout (`src/app/layout.tsx`) is now itself
`async` — it reads the `shokakko_preorder_token` cookie and resolves it to
initial wishlist state server-side before rendering `WishlistProvider`.
This is a deliberate architecture choice (§2.3): once wishlist data is
durable, treat it as server data like everything else in this app, rather
than adding the codebase's first client-side fetch-on-mount pattern. The
trade-off, accepted on purpose: every page now goes through a cookie read
on the server, which was already effectively true of `/` and `/product/
[id]` (`force-dynamic`) but now also applies uniformly regardless of a
given page's own rendering mode.

**Sprint 3 added one new dependency**: [`@react-email/render`](https://react.email)
(`render(reactElement) → Promise<string>`) for turning the Email Design
System's React components into email-client-safe HTML strings — same
"scoped, justified exception" reasoning as the Tiptap precedent, kept as
narrow as possible (just the rendering function; the 8 Design System
components themselves are hand-built from plain `<table>`/`<img>`/`<a>`
elements, not a bundled component library — see §2.16.1 for why
`@react-email/components` was deliberately avoided). No email-sending
package was added — `EmailService` (§2.16.4) has exactly one
implementation this sprint, a console-logging no-op.

## 8. Project Structure (top level)

Unchanged from PRD v1.0 except:

```
shokakko-preorder/
├── CHANGELOG.md                NEW — sprint-by-sprint change log
├── docs/PRD.md                 This document
├── .claude/plans/
│   └── noble-chasing-whisper.md  Sprint 1's approved implementation plan
├── prisma/
│   ├── schema.prisma            Product.type/status, +4 new models
│   ├── seed.ts                  Unchanged — 6 demo products
│   └── migrations/               +3 migrations for Sprint 1 (§4.8)
└── (src/, public/, config files — see §6 for the src/ tree)
```

---

## 9. Deployment Guide

**Superseded by [`docs/DEPLOYMENT.md`](DEPLOYMENT.md)** (Milestone 1,
2026-08-13) — the full, current local dev / git workflow / Vercel /
GoDaddy DNS / environment variables / rollback guide lives there now,
kept separate from this document since it changes independently of the
product features described here.

**Still not deployed anywhere** as of this milestone — Milestone 1
prepared the project for a *staging* deployment (git repository
initialized, env vars audited and reorganized, a site-wide staging
Basic Auth gate added) but did not actually deploy it or touch DNS; both
require Karen's own Vercel/GoDaddy account access. The database-adapter-
swap and image-storage-driver-swap paths (`src/lib/db.ts`,
`src/lib/storage/`) remain unchanged and are still the intended route —
both were already fully env-var-driven before this milestone, requiring
no code changes to point at a hosted database/Vercel Blob.

---

## 10. Environment Variables

Unchanged from PRD v1.0 through Sprint 2 — `DATABASE_URL`,
`DATABASE_AUTH_TOKEN`, `ADMIN_PASSWORD`, `SESSION_SECRET`,
`STORAGE_DRIVER`, `BLOB_READ_WRITE_TOKEN`. **Sprint 3 adds one**:
`EMAIL_DRIVER` (defaults to `"console"`, the only implemented value —
logs instead of sending; a future sprint adds a real provider value here,
see §2.16.4/§15) (see `.env.example`).

---

## 11. Security Considerations

Everything from PRD v1.0 still applies unchanged (no rate limiting, no CSRF
defense beyond Server Actions' same-origin default, hand-written constant-
time-ish password comparison, no DB-level enum/check constraints, no audit
log, no 2FA/password reset). Sprint 1 doesn't change the threat model
meaningfully, with two additions worth noting:

- **`updateSiteSettings` and the banner actions accept a `buttonUrl` field
  with no scheme/domain restriction** — an admin (the only person who can
  reach these forms) could set a banner button to point anywhere, including
  `javascript:` URIs in principle. Not a customer-facing risk (only Karen
  can set this), but worth knowing if banner management is ever opened up
  to more than one trusted admin.
- **The 5-banner cap is enforced only in `createBanner`'s application
  code**, not a database constraint — a direct database write (outside this
  app) could exceed it.

**New in Sprint 3**:

- **`/unsubscribe/[token]` performs a database write on a plain GET
  request** — the one deliberate exception to Server-Actions-only
  mutations (§5), unavoidable since email links have no JS to invoke a
  Server Action from. The token is the same unguessable `editToken`
  already used for the edit link, and the write is idempotent (only sets
  `unsubscribedAt` if unset), so this doesn't introduce a new class of
  risk beyond what `editToken`'s existing bearer-token model already
  accepts (§17's **Edit Token** entry) — but it's worth flagging that any
  GET-triggered mutation is unusual and a candidate for link-scanning/
  prefetch false-positives, which is exactly why it was written to be
  safe to load more than once.
- **The email settings' URL fields (`emailContactUrl`, `emailWebsiteUrl`,
  etc.) accept any string with no scheme/domain restriction** — same
  trust boundary and same class of gap as the pre-existing banner
  `buttonUrl` field above; only the single admin password-holder can
  reach these forms.

---

## 12. UI Design Language

The palette, shape language (`rounded-card`/`rounded-pill`), and
soft-shadow elevation from PRD v1.0 are **unchanged**. **Typography
changed in the UI Refinement Pass**: the site now uses a single font,
**Poppins**, everywhere — customer pages, checkout, admin, buttons, forms,
nav, product cards — replacing the earlier Baloo 2 (display) + Nunito
(body) pairing. Implemented by repointing both the `--font-display` and
`--font-body` design tokens at the same Poppins CSS variable in
`globals.css`, so no component's Tailwind classes needed to change (see
§7/§13). What else is new since PRD v1.0:

- **Drawers**: a consistent right-side slide-in pattern (Cart, Wishlist,
  mobile Filters) — white header bar with a title and ✕ close button, cream
  body, a semi-transparent dark backdrop, CSS transform/opacity transitions
  (no animation library).
- **Denser product cards**: smaller image-to-text ratio, smaller type scale
  (10–14px range for card metadata vs. the previous design's slightly
  larger text), tighter padding — matches the brief's "slightly smaller"
  card instruction while keeping every original field (photo, brand, name,
  SKU, description, estimated arrival, tags, price, quantity control).
- **New iconography, still emoji-only**: ♡/❤️ (wishlist, the only
  interactive-state icon pair in the app), 🛍️ (cart), 🧾 (my pre-order), 🔐
  (admin login), ⠿ (drag handle in admin lists). Coexists with the
  pre-existing set (🎀 📦 🌸 ✿) — no icon library was introduced.
- **Live-updating micro-copy**: the countdown string ("Pre-orders close in
  Xd Xh Xm") re-renders every 60 seconds without a page reload — the only
  place in the app with this kind of ambient live text.
- **Sold Out styling**: a dark pill badge overlaid on the product photo
  (customer grid) plus a coral `Badge` in place of the quantity control.
  "Price Coming Soon" is also coral text — both share the brand's "needs
  attention" color rather than using distinct colors per state, since both
  really are the same category of message to the customer (this product
  isn't purchasable/priced yet).
- **Centered header logo**: a 3-column grid layout (spacer / logo / icons)
  rather than the earlier flex `justify-between` — see §2.1 for the
  `minmax(0,1fr)` detail that makes the centering exact on mobile, not just
  "close enough."
- **Rich text content**: a small `.rich-text` CSS block (paragraph spacing,
  list markers, link color/underline, bold weight) styles both the admin's
  live Tiptap editor and the matching HTML rendered on `/checkout` — the
  only place in the app where admin-authored formatted content appears on
  a customer-facing page.
- **Bottom-sheet drawer (new in Sprint 2)**: the Wishlist drawer is the
  first consumer of the `Drawer` primitive's mobile-only bottom-sheet
  variant — visually distinct from the Cart/Filter drawers' side panel at
  the same breakpoint (slides up instead of in, rounded top corners,
  capped height) — see §2.4.
- **Live status emoji, scoped to one place (new in Sprint 2)**: the
  Wishlist drawer shows 🟢 Available / 🟡 Price Coming Soon / 🔴 Sold Out
  per line, computed fresh on every render. Deliberately not reused on
  `ProductCard` or the Product Details page, which already have their own
  established Sold-Out-badge/"Price Coming Soon" treatments — this is a
  small helper scoped to the drawer only, not a new site-wide status
  convention. The Sprint 3 email `ProductCard` reuses this exact
  🟢/🟡/🔴 convention again (a small, independent copy — see §2.16.1 —
  since email rendering runs server-side against plain data props, not
  the client `CatalogProduct` shape the wishlist drawer's helper expects).
- **A new brand colour for email only, Sprint 3**: `#78b7c4` (a soft
  teal), used for CTA buttons, links, and highlights across all three
  email templates — literal hex constants in
  `src/lib/email/components/brand.ts`, not a `globals.css` token, since
  email HTML can't reliably use CSS custom properties. The existing site
  palette (`#97b4d6` blue, `#e0c9e8` lavender, `#e89898` coral, `#ddefe6`
  mint) is copied into the same file 1:1 for backgrounds/accents, so
  emails still read as unmistakably Shokakko even with one new accent
  colour layered in. Poppins is loaded via a best-effort Google Fonts
  `<link>` in the email's own `<head>` (honored by some clients, e.g.
  Apple Mail; others fall back to a sans-serif stack) — rounded pill
  buttons and soft pastel card backgrounds match the site's existing
  shape language.

---

## 13. Coding Standards

Everything from PRD v1.0 continues to hold and was reinforced, not
contradicted, by Sprint 1's additions:

- Server Components by default; `"use client"` only where genuinely needed.
  Even the new drawers/carousel/header are client components *only* because
  they hold interactive state — data fetching stayed in `page.tsx`.
- Server Actions colocated per route segment (`banners/actions.ts`,
  `settings/actions.ts` follow the exact same pattern as
  `products/actions.ts`/`preorders/actions.ts`).
- Validation centralized in `src/lib/validations/`, one file per domain
  concept (`banner.ts`, `settings.ts` added, following `product.ts`/
  `order.ts`'s existing shape).
- Defense-in-depth auth unchanged — every new admin Server Action
  (`createBanner`, `updateSiteSettings`, etc.) independently calls
  `requireAdmin()`, exactly like the pre-existing product/pre-order actions.
- **New pattern this sprint, now established**: small, hand-written,
  `localStorage`-backed React Contexts for client-only state that needs to
  survive navigation (`CartContext`, `WishlistContext`) — deliberately not a
  general state-management library, matching the project's continued
  preference for framework primitives over dependencies.
- **New pattern this sprint**: native HTML5 drag-and-drop
  (`ProductImageManager`, `BannerList`) instead of a drag-and-drop library —
  consistent with the "swappable adapter, minimal dependency" ethos already
  established for storage/database.
- No test files were added this sprint either — see §14.
- **UI Refinement Pass**: when a dependency genuinely can't be avoided
  (Tiptap, §7/§2.15), scope its configuration as narrowly as the feature
  needs (a small schema allow-list, not the full default toolset) rather
  than accepting the library's defaults wholesale — keeps both the
  attack surface and the UI surface no bigger than the actual requirement.
  Shared design tokens (`--font-display`/`--font-body`) were treated as the
  stable abstraction for the font change — repoint the token, don't touch
  every call site.
- **Sprint 2**: extend a shared primitive with an opt-in prop rather than
  forking it or changing its default — `Drawer`'s `mobileVariant` prop
  defaults to today's behavior, so `CartDrawer`/`FilterDrawer` needed zero
  changes to keep working exactly as before (§2.4). The same instinct
  shaped `WishlistContext`'s local/linked mode split — the public API
  (`has`/`toggle`/`ids`/`count`) stayed identical, so every existing
  consumer (`ProductCard`, Product Details, the header, the filter) needed
  no changes to support durable wishlist state (§2.3). Server Actions
  continue re-validating all client-submitted IDs against the database
  before writing (`toggleWishlistItem`, the wishlist migration in
  `submitPreOrder`) — same defense-in-depth pattern as every prior sprint's
  mutations.
- **Sprint 3**: business logic and presentation kept in genuinely separate
  files, not just separate functions — `src/lib/email/data/*.ts` (Prisma
  rows → plain props) never imports JSX, `templates/*.tsx` never queries
  the database, so re-skinning a template later touches zero business
  logic (§2.16.1). The same "extend via interface, hard-code nothing"
  instinct as `StorageAdapter` produced `EmailService` — one interface,
  one dev-safe no-op implementation, provider selection by env var, no
  provider name appears anywhere in the codebase's logic. The 8 Design
  System components are deliberately framework-minimal (no
  `@react-email/components`, which showed as deprecated on npm at install
  time — see §2.16.1) rather than pulling in a library just because one
  exists for this problem space.

---

## 14. Known Issues

Carried forward from PRD v1.0 (still true, not re-litigated here: no
automated tests, no rate limiting, local storage/SQLite don't work on
serverless hosting, no CSV export, no pagination on
admin lists, `Math.random()`-based IDs elsewhere in the app, no custom
404, unused `create-next-app` boilerplate assets). **Git repository now
exists** (Milestone 1) — no longer a known issue. **"No email
notifications" is now more precisely "no email is ever actually
sent"** — Sprint 3 built the full template/authoring system, see §14's
Sprint 3 items below and §15. New or changed this sprint:

1. **Client-side-only search/sort/filtering** — `ProductBrowser` filters the
   *entire already-fetched* product list in the browser; there's no
   server-side search/pagination. Fine at the current handful-of-products
   scale; would need revisiting if the catalog grew into the hundreds.
2. **The 5-hero-banner cap and true responsive image requirement add
   real upload burden** — each banner needs three correctly-sized images
   uploaded by hand; there's no client-side image validation that the
   uploaded file actually matches the labeled dimensions (only file
   type/size are validated, same `assertValidImage` as everywhere else).
3. **Cart and wishlist are `localStorage`-only, per-browser** — a customer
   who adds items on their phone and later opens the site on a laptop
   starts with an empty cart/wishlist on the second device. This is a
   known, accepted trade-off for this sprint (explicitly out of scope to
   persist), not an oversight.
4. **"My Pre-order" is a placeholder with no way to actually retrieve a
   past order** other than the confirmation-page URL the customer was
   shown once at submission time (unchanged from PRD v1.0, but now more
   visible since there's a dedicated header icon pointing at an
   unfinished feature).
5. **`updateSiteSettings`'s `buttonUrl`/banner `buttonUrl` fields accept
   any string** with no scheme allow-list (§11).
6. **Uncontrolled form fields don't visually refresh after a non-redirecting
   Server Action** (e.g. editing a product's status without changing pages)
   — the database is correctly updated, but the rendered `<select>`/`<input>`
   keeps showing its pre-submission value until the page is reloaded, since
   React doesn't force-update a mounted uncontrolled element's DOM value
   from a changed `defaultValue` prop. Confirmed via direct database reads
   during this sprint's verification — not a data-integrity bug, purely a
   display staleness quirk worth knowing about.

New or changed in the UI Refinement Pass:

7. **The rich text editor's Link tool accepts any URL with no
   scheme/domain restriction** (via `window.prompt`), same trust boundary
   and same class of gap as the pre-existing banner `buttonUrl` field
   (§11) — only the single admin password-holder can reach it.
8. **The admin's own product-list "Coming Soon" price badge still reads
   "Coming Soon," not "Price Coming Soon"** — the wording change was
   scoped to customer-facing surfaces (`formatPrice()`, which the admin
   list doesn't use for that particular badge); left as-is rather than
   editing internal-facing admin copy that wasn't part of the request.
9. **No client-side check that a hero banner or product photo upload
   actually matches any particular aspect ratio or dimensions** — only
   file type/size are validated (unchanged from PRD v2.0's note on this).

New or changed in Sprint 2:

10. **A second pre-order submission from an already-linked browser does
    not re-home the wishlist** — `submitPreOrder` always generates a fresh
    `editToken`/`PreOrder` and overwrites the `shokakko_preorder_token`
    cookie with the new one, but only migrates the wishlist IDs the
    *current* checkout form submitted (whatever `WishlistContext` held at
    that moment, which — since the browser was already in linked mode —
    reflects the first order's `WishlistItem` rows, not a second
    `localStorage` copy). In practice this means a customer's wishlist
    correctly "follows" them across repeat submissions from the same
    browser rather than resetting, but it does mean older `PreOrder` rows'
    `WishlistItem` rows become historical snapshots of "what was
    wishlisted when that order was placed," not live-updating after a
    newer order takes over the cookie. Not a data-loss bug — every row
    stays in the database — but worth knowing if `WishlistItem` history is
    ever surfaced anywhere (e.g. a future admin view).
11. **The `/edit/[token]` page doesn't exist yet** — visiting the URL shown
    on the order confirmation page 404s today. This is intentional and
    called out on the page itself (§2.5); only the token generation/
    storage and the (inert) URL display were in scope for Sprint 2, per
    the sprint's explicit scope decision (see `PROJECT_NOTES.md`).
12. **The root layout reading a cookie on every request** (§7) means every
    page is now effectively dynamically rendered regardless of its own
    `dynamic` export — a deliberate, accepted trade-off for keeping the
    wishlist's server-linking logic simple and centralized, not something
    that needs fixing.

New or changed in Sprint 3:

13. **No email is ever actually sent** — `EmailService` has exactly one
    implementation, a console-logging no-op (§2.16.4). "Generate Email"
    only renders/saves HTML and prepares recipient data; nothing calls
    `.send()`. Wiring a real provider is explicitly deferred (§15).
14. **Confirmation and Reminder are placeholder layouts** — no Canva
    design has been shared yet, per your explicit Sprint 3 answer. Their
    dynamic-field plumbing (customer name, order number, countdown, edit
    link) is complete and won't need to change once a real design arrives
    — only the template/component files will.
15. **Email history effectively shows one growing entry, not many** —
    since nothing is ever marked `"sent"` (item 13), the "current draft"
    and "most recent history entry" are the same row until a future
    sprint adds a way to finalize a digest. Not a bug, just what "no real
    send yet" looks like in the history list (§2.16.3).
16. **Price Updates only detects a change once, then goes quiet** — its
    baseline (`Product.lastNotifiedPriceCents`) advances at Generate
    Email time (not at an actual send, since none exists yet), so
    clicking Generate Email twice in a row with no further price changes
    shows an empty Price Updates section the second time — correct
    behavior once real sending exists (a price shouldn't be reported
    twice), but means testing this section repeatedly requires editing a
    product's price again between generates.
17. **`/unsubscribe/[token]` performs a write on a GET request** — the
    one exception to this app's Server-Actions-only mutation pattern,
    unavoidable for an email-client-clicked link (§5/§11).
18. **Collections aren't curated automatically** — the Update Email's
    Collection Cards section shows only the tags an admin explicitly
    picks in the Notification Centre (mirroring how Recommended Products
    already works), not every tag in the database. Some seed/test data
    tags (e.g. stray lowercase duplicates from early testing) have no
    square image yet and would need one added at `/admin/collections`
    before looking right in a real send.
19. **No client-side check that an email hero/collection image is
    actually square** — same class of gap as hero banner/product photo
    dimension checks elsewhere (§14 item 2/§16); only file type/size are
    validated.

---

## 15. Planned Features

Concretely scoped, but explicitly deferred out of Sprint 1 by name — these
are not speculative, they were named directly in the sprint brief and then
excluded on purpose:

- **The real "Retrieve My Pre-order" flow** behind `/my-preorders`:
  accountless, email-based lookup ("enter your email, get a secure edit
  link"). The signed-link mechanism itself is built (every `PreOrder` has
  a stored, unique `editToken`, §4.7) and Sprint 3 built the full
  Confirmation Email template that would carry it — what's still missing
  is looking an order up by email address, and actually sending anything
  (see the `EmailService` item below).
- **The `/edit/{token}` page itself** — the customer-facing pre-order edit
  page the token already points at (§2.5/§2.6). Every email template's
  CTA/edit link already points at this URL; the route it resolves to
  still doesn't exist.
- **CSV export** of pre-orders from the admin, for offline fulfillment
  planning.
- **A real `EmailService` driver** (Sprint 4-scoped, per your explicit
  Sprint 3 answer) — Resend, Brevo, SES, or similar, implementing the
  interface already defined in `src/lib/email/types.ts` (§2.16.4). This
  is what turns "Generate Email" into an actual send, wires Confirmation
  Email to fire on checkout submission, gives Reminder Email a real
  trigger (manual admin send vs. scheduled — undecided), and moves
  per-recipient personalized rendering (already supported by
  `renderUpdateEmail()`) from theoretical to real.
- **Real Canva-designed Confirmation and Reminder templates** — Sprint 3
  shipped placeholder layouts for both, per your explicit answer; you'll
  share the Canva exports in a future sprint and only the
  `components`/`templates` files need to change to adopt them (§2.16.1).
- **Wishlist/Pre-order-targeted digest recipients** — named directly in
  the original Sprint 3 brief's "Future Compatibility" section and
  explicitly not built: today's `recipients` (§4.7b) is a broadcast to
  every non-unsubscribed `PreOrder`. Narrowing it to "only customers with
  this product in their wishlist/pre-order" doesn't need a schema change
  — `EmailDigest`/`EmailDigestItem` already reference the specific
  products involved, and `WishlistItem`/`OrderItem` already link
  products back to `PreOrder`s — just new query logic at generate time.
- **Scheduled daily digest** (e.g. automatically at 6:00 PM) — also named
  in the original brief and explicitly not built. The Notification
  Centre's "current draft" model (§2.16.3) doesn't block this: a
  scheduled job would just need to call the same generate logic
  `generateEmail` already implements, then (once real sending exists)
  send and start a fresh draft.

---

## 16. Future Ideas

Not scoped, not committed — carried over from PRD v1.0 and extended:

- Bulk admin actions (e.g. mark several products Draft/Active/Sold Out at
  once) if the catalog grows large enough that one-by-one editing becomes
  tedious.
- Rate limiting / bot protection on the public checkout form and admin
  login (PRD v1.0 Known Issue, still unaddressed).
- Server-side search/pagination if the catalog outgrows the current
  client-side-filtering approach (§14.1).
- Client-side validation (or server-side image dimension checks) that a
  hero banner upload actually matches its labeled 1920×600/1600×500/
  1080×1350 target, rather than relying on the admin to crop correctly
  before uploading.
- `SiteSettings.eventInfo` currently holds admin-typed pre-order
  instructions as a workaround from before the dedicated
  `preorderInfoHtml` rich text editor existed (§2.15) — worth asking
  whether to migrate that content into the new field so it's formatted
  properly and shown in the right place (checkout, not just the homepage
  event strip), rather than assuming.
- **Ideas named in the Sprint 2 brief, explicitly not built, but not
  precluded by anything shipped this sprint** — kept here as a note of
  where the current schema would and wouldn't need to change:
  - *Multiple Events*: today `Product`/`HeroBanner`/`SiteSettings` all
    implicitly describe one ongoing exhibition. A future `Event` model
    could sit between `Product` and everything else without reshaping
    `WishlistItem`/`OrderItem` — both already hang off `Product`/
    `PreOrder`, not off a global "the current event" assumption.
  - *Wholesale Catalogue*: would most likely be a second `Product`-like
    surface (a flag on `Product`, or a parallel model) rather than a
    change to the wishlist/cart architecture itself — neither `CartContext`
    nor `WishlistContext` assume there's only one catalogue.
  - *Notify-when-Price-Updated / Notify-when-Available /
    Notify-when-New-Products-Added*: none of these need a new relationship
    to `PreOrder` — they'd naturally hang a new table off `WishlistItem`
    (for the first two, since those are inherently per-saved-item) or off
    `Product`/a new subscription-style model (for the third). Nothing in
    Sprint 2's schema was built to anticipate this beyond simply not
    blocking it — no speculative columns or tables were added. **Update,
    Sprint 3**: the *content* side of "Notify-when-Price-Updated" and
    "Notify-when-New-Products-Added" now exists (the Update Email's Price
    Updates/New Products sections, §2.16.2) — what's still missing is
    exactly the per-customer *targeting* piece described here, since
    Sprint 3's `recipients` is still a broadcast to everyone (§15).
- Client-side validation (or server-side image dimension checks) that an
  email hero/collection image is actually square, matching §14 item 19 —
  same class of gap as the hero banner dimension-check idea above.
- A dedicated Tag admin CRUD (rename, delete, merge duplicates) —
  `/admin/collections` (Sprint 3) only manages each tag's image; tags
  themselves are still only created via the product form's comma-separated
  field, so cleanup of stray/duplicate tags (§14 item 18) is still manual,
  database-level work today.

---

## 17. Glossary

- **Pre-order**: a customer's submission of desired products/quantities plus
  contact and shipping details, with no payment collected. Stored as one
  `PreOrder` row plus one `OrderItem` row per distinct product.
- **Price Coming Soon**: the customer-facing label shown wherever
  `Product.priceCents` is `null` (was just "Coming Soon" before the UI
  Refinement Pass).
- **Sold Out**: a `Product.status` value — visible to customers but not
  orderable (distinct from `draft`, which hides the product entirely).
- **Snapshot**: copying a product's name/brand/SKU/price onto each
  `OrderItem` at order-submission time, so later edits/deletion of the
  `Product` never change historical order records.
- **Admin**: the single shared password-protected identity (Karen) with
  access to `/admin/*`. Not a multi-user role system.
- **Drawer**: the shared slide-in UI pattern used for Cart, Wishlist, and
  mobile Filters (`src/components/ui/Drawer.tsx`) — right-side panel by
  default, or a mobile-only bottom sheet for the Wishlist drawer (§2.4).
- **Singleton row**: a database table intentionally holding exactly one row
  (`id: "singleton"`), used for `SiteSettings` and `OrderSequence` — a
  lightweight alternative to a dedicated key-value settings table.
- **Pre-order Workspace**: the conceptual home of the wishlist (§2.3) — not
  a traditional ecommerce "saved for later" list, but the tool a customer
  uses to narrow down a large exhibition catalogue to what they actually
  want to order.
- **Linked mode**: the state a customer's `WishlistContext` enters once
  their browser holds a valid `shokakko_preorder_token` cookie — wishlist
  reads/writes go to the database (`WishlistItem` rows on their
  `PreOrder`) instead of `localStorage`. The opposite is **local mode**
  (§2.3).
- **`editToken`**: a random, unique, never-rotated token generated once per
  `PreOrder` at submission time (§4.7). Serves three purposes today: the
  value stored in the `shokakko_preorder_token` cookie (linking a browser
  to its order for wishlist purposes), the `{token}` in the future
  `/edit/{token}` URL shown on the order confirmation page (§2.5) — that
  route itself doesn't exist yet (§15) — and, new in Sprint 3, the
  `{token}` in every email's `/unsubscribe/{token}` Footer link (§2.16.4).
- **Email Design System**: the 8 independent, reusable components
  (Header, Hero Banner, Greeting, Karen's Notes, Collection Card, Product
  Card, CTA Button, Footer) every email template is composed from
  (§2.16.1) — `src/lib/email/components/`.
- **Notification Centre**: the admin screen (`/admin/emails`) for
  preparing the Update Email — one **current draft** `EmailDigest` at a
  time, refined over the course of a day, finalized by clicking
  **Generate Email** (§2.16.3).
- **Digest** / **`EmailDigest`**: one prepared Update Email — its section
  toggles, Karen's Notes, picked Collections/Recommended Products,
  computed New Products/Price Updates, recipient list, and saved rendered
  HTML, all as one database row (§4.7b).
- **`EmailService`**: the swappable send interface
  (`src/lib/email/types.ts`) every future email provider will implement —
  same role as `StorageAdapter`. Its only implementation this sprint is a
  no-op that logs instead of sending (§2.16.4).

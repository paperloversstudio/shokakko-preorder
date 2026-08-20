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
**6.0** (Sprint 3.5 — Product Variants, Purchase Dashboard & Analytics
Dashboard): one optional variant group per product, shown to customers as
selectable pills (§2.17); a simplified homepage card (§2.1); a mobile-first
admin Purchase Dashboard for buying efficiently during an exhibition
(§2.18); an Analytics Dashboard surfacing wishlist/order interest signals
(§2.19); a small `ActivityLog` table feeding both dashboards' "Recent
Activity." This sprint deliberately did not touch the checkout flow's
steps, fields, or UX. Also folds in the still-undocumented **Checkout &
Logo Polish** pass from the previous session: `PreOrder.customerName` split
into `customerFirstName`/`customerLastName`, the shipping/billing address
fields restructured from one free-text field into Address 1/2, Suburb,
State, Postcode, Country, a Standard/Express `shippingMethod` selector, a
bolded shipping notice, and the shared `SiteLogo` component (2x size on the
homepage header, 4x on checkout) — see §2.1/§2.2/§4.7 below.
**7.0** (Sprint 4 — Event Pages CMS): transforms the site into a small
Event Platform. A block-based CMS (§2.20) lets Karen write and update her
own site content — How to Pre-order, About the Event, and any future page
(FAQ, Privacy Policy, Wholesale Information, ...) — with no code changes.
Five section types (Text, Image, Gallery, Button, Divider), a Page
Builder with drag-reorder/duplicate/delete/collapse, a single `/[slug]`
catch-all route that serves any admin-created page automatically, two
new homepage nav pills, and two new footer links. **This sprint does not
modify any existing pre-order/checkout/product/variant/purchase/
analytics functionality** — every touch to existing files is additive.
**8.0** (Sprint 5 — Customer Self-Service Portal): closes the loop every
prior sprint deferred — a customer can now request their secure edit link
by email (§2.6, never revealing whether an address has an order) and
land on a complete self-service portal at `/edit/{token}` (§2.21): change
a variant/quantity, remove an item, manage their wishlist (including
moving items into the order), edit their customer/shipping/billing info,
manage notification preferences, and see a plain-language order timeline
— entirely passwordless. A new `OrderHistoryEntry` table backs both that
timeline and a new admin Order History section (§2.11). **No real email
provider is wired up this sprint either** (confirmed before building) —
sending still logs to the console, same as every email-shaped feature
since Sprint 3; see §2.16.4/§15.
**9.0** (Sprint 6 — Communication Platform): connects the Email
Architecture, Self-Service Portal, and Notification Centre into one real
communication platform (§2.22). A live `resendEmailService` (§2.16.4)
behind the existing `EmailService` interface — the first email this
project has ever actually sent. Confirmation Email now fires
automatically on checkout, the Edit Link Email now really sends (§2.6),
and a new automatic Reminder Email goes out 24 hours before the event
countdown closes, all driven by this project's first-ever `src/app/api/`
route on a Vercel Cron schedule. The Notification Centre's "Send
Update" button is real: it personalizes New Products/Price Updates per
recipient's own notification preferences (§2.21's toggles, unused until
now), adds a new automatically-computed **Sold Out** section, and only
marks its "already notified" checkpoints (`lastNotifiedPriceCents`,
the new `lastNotifiedStatus`, `isNew`) once every send has actually been
attempted — not at Generate time as before. A new `EmailLog` table (§4.7g)
is the Email Queue every real send goes through, backing two new admin
screens: Email Logs (§2.22.4) and a Notification Dashboard (§2.22.5).
**10.0** (Email Template Manager & Consistent Variant Rendering):
generalizes the Newsletter's admin-editable structure to cover all four
email kinds — Confirmation, Retrieve My Pre-order, Reminder, Newsletter
— from one Email Template Manager (§2.23), the same open
`type: String` + `data: Json` section architecture Sprint 4's Event
Pages CMS already proved, applied to email instead of web pages. Every
section (Hero Banner, Greeting, Rich Text, Image, Collection Cards,
Product Cards, CTA Button, Footer, Countdown) is independently
show/hide-toggleable, reorderable, and editable with no code change —
`EmailDigest` slims down to a pure send-operation record, and one
generic `GenericEmail.tsx` renderer replaces the four previously fixed
template files. Also fixes a real bug: the Confirmation Email never
showed a chosen variant at all; `OrderItem` now permanently snapshots
`variantGroupName` alongside the existing `variantName`, read through
one shared `getOrderItemOptions()` helper (§17) used consistently across
the Confirmation Email, Retrieve My Pre-order Email, Admin Orders, the
Customer Self-Service Portal, and the Purchase Dashboard — deliberately
returning an array so a future multi-option-group product needs no
call-site changes.
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
  The logo renders via the shared `SiteLogo` component (`size="homepage"`,
  `src/components/SiteLogo.tsx`) — `SiteSettings.logoUrl` if the admin has
  uploaded one (roughly 2x its pre-refinement-pass size, with a `max-width`
  cap so an unusually wide upload can't blow out the layout), otherwise
  falls back to the text wordmark (`Logo`) at a matching larger size. The
  same `SiteLogo` component (different `size` preset) also backs the
  checkout header (§2.2, 4x this size), My Pre-order, and the order
  confirmation page — one place to keep every logo placement in sync. Both
  flanking grid columns use `minmax(0,1fr)` rather than a bare `1fr` —
  without it, the icon cluster's real content width can force that column
  wider than the empty spacer on narrow screens, pushing the "centered"
  logo off true center (this was an actual bug, caught and fixed during
  this pass's mobile verification). Three icons on the right:
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
- **Event Pages nav pills** (`EventPageNavPills`, new in Sprint 4): two
  outline-pill links, "How to Pre-order" and "About the Event," directly
  under the hero carousel and above the event info strip — see §2.20.7.
  Deliberately its own row, not merged into the filters below.
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
  breakpoint (≥768px), 4 at `lg` (≥1024px). **Simplified in Sprint 3.5**:
  each `ProductCard` now shows only photo (or a 🎀 placeholder), a wishlist
  heart toggle (top-right of the photo), a "Sold Out" badge (top-left) when
  applicable, brand, name, and price (or "Price Coming Soon" in coral) —
  **SKU, short description, and estimated arrival no longer render on the
  card** (they were removed outright, not moved elsewhere, per the sprint's
  "simplify the homepage" brief; still shown on the Product Details page,
  §2.14). A plain product shows either a quantity stepper (0–10) or a "Sold
  Out" badge; a product with a variant group (`variantGroupName` set, §2.17)
  shows a **"View Options"** pill button in that same spot instead — linking
  to the Product Details page, since which variant is wanted has to be
  chosen there before it can be wishlisted or added to the cart; the
  wishlist heart is hidden on a variant product's card for the same reason.
  **Collection tags are no longer shown on the card** — they still exist
  and still drive the sidebar/drawer filter above and the admin, just not
  the card's own display (a Sprint 2/3 change, unaffected by this sprint).
  Both the photo and the name/brand block are wrapped in separate `<Link>`s
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
  availability are always fresh), reads the cart from `CartContext`
  (variant-aware, §2.17), and shows each line with a **medium** product
  image, name, a **"{Variant group}: {Variant name}"** subtitle when the
  line has a selected variant, quantity, and price, plus a total. The page
  header shows the `SiteLogo` component at `size="checkout"` — **4x** the
  homepage header's own preset (same fallback-to-text pattern as
  `SiteHeader` when no logo is uploaded). Below the order summary: the
  admin's **Pre-order Information** rich text (§2.15), if any has been
  written, then a **bolded shipping notice** — "**Tax included. Shipping
  fee may apply.** For details, please refer to our Shipping Policy." with
  "Shipping Policy" linking to
  `https://www.shokakko.com.au/pages/shipping-policy` in a new tab — then
  the pre-order form (`PreOrderFormFields`, shared component): **First
  name** / **Last name** (split from the old single "Full name" field),
  email, a **structured shipping address** — Address 1, Address 2
  (optional), Suburb, State/Territory, Postcode, Country (defaults to
  "Australia," editable) — a **Shipping method** selector (Standard /
  Express), the existing "Billing address is the same as shipping"
  checkbox (revealing the same structured fields for billing when
  unchecked), and Notes — with the submit button labeled **"Save My
  Pre-order."** Ends with the site footer (§2.13a). If the cart is empty,
  shows a "Your cart is empty" state with a link back to `/`.
- **Submission**: still the `submitPreOrder` Server Action
  (`src/app/order/actions.ts`) — validates the form, re-fetches product data
  server-side (never trusts client-submitted prices/names), generates the
  next sequential order number (§2.7), creates the `PreOrder` + `OrderItem`
  rows, and redirects to `/order/[orderNumber]`.
- **One pre-order per email address** (added post-Sprint-6, in response
  to a real customer submitting duplicates) — before creating anything,
  `submitPreOrder` checks for an existing `PreOrder` with that exact
  `customerEmail` and any `status` other than `"cancelled"`. If one
  exists, the submission is rejected with a field error on Email ("An
  order already exists for this email address. Visit My Pre-order to
  view or edit it.") rather than creating a second order — the customer
  is pointed at the existing Self-Service Portal/Retrieve flow (§2.6,
  §2.21) instead of duplicating. The match is exact/case-sensitive, same
  precedent as `/my-preorders`' own lookup (§14 item 23) — kept
  consistent rather than introducing a second, differently-behaved email
  comparison. Excluding `cancelled` orders is deliberate: an admin
  cancelling an order is exactly what should free that email up to
  submit a fresh one.
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
- **Variant-aware, Sprint 3.5**: `toggle`/`has` accept an optional
  `variantId` (§2.17) — two different variants of the same product can
  each be wishlisted independently, as separate `WishlistItem` rows. Called
  with no variant id, exactly as every pre-existing call site (the card's
  heart, the "♡ Wishlist" grid filter) still does, `has()` means "is any
  variant of this product, or the plain product, wishlisted" — those call
  sites needed zero changes. Only the Product Details page passes a
  specific `variantId`.
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
sequential format (§2.7), and — **new in Sprint 2, now a real link as of
Sprint 5** — if the order has a secure `editToken` (§4.7, every order
created from this point on has one), an "Edit My Pre-order" card renders
between the thank-you message and the itemized order: the edit URL
(`/edit/{token}`, §2.21) as an actual clickable link (was inert text
through Sprint 4, since the page it pointed to didn't exist yet), a "Copy
Link" button (`CopyLinkButton`, `navigator.clipboard`), and a note that
the same link can be requested again anytime from My Pre-order (§2.6)
using the order's email address.

### 2.6 "Retrieve My Pre-order" (`/my-preorders`, real as of Sprint 5)

Replaces the Sprint 1–4 placeholder with the real, accountless,
email-based lookup flow: a single Email Address field and a **"Send Me My
Edit Link"** button (`RequestEditLinkForm.tsx`, client, `useActionState`).
On submit, `requestEditLink` (`src/app/my-preorders/actions.ts`) looks up
the most recent `PreOrder` for that email and — if found — sends the
Edit Link Email (§2.16.2); regardless of whether an order was found, or
even whether the send itself succeeded, the page always shows the exact
same message: **"If a preorder exists for this email address, a secure
edit link has been sent to your email."** This is a deliberate,
non-negotiable privacy property — the only thing that varies is a genuine
input-format error (not a valid email at all), which is normal form
validation, not an existence leak. See §11 for the one known gap this
form has (no rate limiting, same unaddressed class of gap as the admin
login and checkout).

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

**New in Sprint 5**: the detail page gains an **Order History** card
listing every `OrderHistoryEntry` for that order — Action (a human label
via `ORDER_HISTORY_TYPE_LABELS`), Date, and Time, newest first (matching
this app's existing newest-first convention for every other admin feed).
Examples: Order Created, Product Added, Product Removed, Variant Changed,
Quantity Changed, Shipping/Billing Address Updated, Notification
Preferences Updated. Same underlying table that drives the customer-
facing Order Timeline on the Self-Service Portal (§2.21), just shown with
full detail instead of collapsed to "Updated."

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

`src/components/layout/Footer.tsx` — **New in Sprint 4**: two internal
links, "How to Pre-order" (`/how-to-preorder`) and "About the Event"
(`/about-event`), added before the two pre-existing external links,
"Contact Us" (`https://www.shokakko.com.au/pages/contact-us`) and
"Shipping Policy" (`https://www.shokakko.com.au/pages/shipping-policy`,
both still opening in a new tab). Rendered at the bottom of every
customer-facing page: `/`, `/checkout`, `/product/[id]`,
`/order/[orderNumber]`, `/my-preorders`, and — new in Sprint 4—
`/[slug]` (§2.20.6). Not rendered on any `/admin/*` page.

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

**Variant selection, Sprint 3.5** (§2.17): when `product.variantGroupName`
is set, a `VariantPills` row renders between the product type/description
block and the price — one pill per `ProductVariant`, filled with the brand
blue when selected, outlined when not (`src/components/catalog/
VariantPills.tsx`). Selecting a pill is plain `useState`, no navigation and
no network request — "the selection updates instantly." It immediately
swaps: the **main product image** to the variant's own `imageUrl` (falling
back to the product's own gallery/thumbnail selection if the variant has
none — clicking a thumbnail directly clears the variant-image override
until a different variant is picked), and the **price** to the variant's
`priceCentsOverride` if it has one (falling back to the product's own
price otherwise). The SKU line also falls back the same way (variant SKU,
or the product's own SKU if the variant has none). The Wishlist toggle and
Add to Pre-order/quantity control act on the *currently selected* variant
— `cart.addItem(product.id, selectedVariant?.id)` / `wishlist.toggle
(product.id, selectedVariant?.id)` — so two different variants of the same
product are two independent cart lines / wishlist entries.

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

### 2.16 Email Communication System (Sprint 3; real sending as of Sprint 6; admin-editable structure as of §2.23)

Built in Sprint 3 as a complete template system, admin authoring/preview
experience, and architecture for sending — with no real provider wired up
and nothing ever actually leaving the server. Sprint 6 (§2.22) connected
it to a real provider. **As of §2.23's Email Template Manager, the four
fixed template files this section originally described
(`ConfirmationEmail.tsx`/`EditLinkEmail.tsx`/`ReminderEmail.tsx`/
`UpdateEmail.tsx`) no longer exist** — replaced by one generic
`GenericEmail.tsx` renderer driven by an admin-editable `EmailTemplate`
row per kind. The Email Design System components below (§2.16.1) are
unchanged and still exactly what every template is built from; §2.16.2's
description of "three/four templates" is now historical — see §2.23 for
the current, generalized structure.

#### 2.16.1 Email Design System

`src/lib/email/components/` — nine independent, reusable components, all
plain React returning `<tr>`-level fragments (no JSX assumptions about
their parent beyond "inside an email `<table>`"), so any template can mix
and match them:

| Component | Renders |
|---|---|
| `Header` | Centered logo (`SiteSettings.logoUrl`, text-wordmark fallback) + event title (`SiteSettings.eventName`) — not a section (§4.7h), every email always shows it |
| `HeroBanner` | One configurable image, **post-Sprint-6** sourced from a `hero_banner` section's own `data.imageUrl`/`data.linkUrl` (§2.23.1), not `SiteSettings` — renders nothing if unset |
| `Greeting` | "Hi {first name}," — first name only, via `getFirstName()` (§2.16.4) |
| `KarenNotes` | A `rich_text` section's admin-authored HTML, reusing the exact same Tiptap editor component as `preorderInfoHtml` (§2.15) |
| `EmailImage` | **New post-Sprint-6.** A standalone `image` section — one photo, optional caption, optional link — distinct from `HeroBanner` so a template can carry more than one image |
| `CollectionCard` | Square image + name, links to `/collections/[id]` |
| `ProductCard` | Square photo, brand, name, price/"Price Coming Soon", 🟢/🟡/🔴 status (mirrors the Sprint 2 wishlist-drawer convention), links to `/product/[id]` — the **same** component instance backs every `product_cards` marketing source, no duplicate layouts |
| `CTAButton` | One large rounded pill button, configurable text + URL — **post-Sprint-6**, `url` may be the literal `{{edit_url}}` placeholder, substituted with the recipient's real edit link at render time (§2.23.2) |
| `Footer` | Contact Us / Shipping Policy / Website / Instagram (all from `SiteSettings`' `email*` fields) + a per-recipient Unsubscribe link |

Two more live in `src/lib/email/templates/` rather than `components/`,
since each is bound to one specific data shape rather than being freely
reusable: `OrderSummary` (an `order_items` `product_cards` section — an
order's own line items, quantities, and — **post-Sprint-6** — each
item's selected options via `getOrderItemOptions()`, §2.23.4) and
`Countdown` (a `countdown` section — time remaining until
`SiteSettings.countdownTargetAt`).

Plus internal, non-shared plumbing: `ResponsiveCardGrid` (the fluid
`inline-block`-column "3 desktop → 2 mobile" grid mechanic every card
grid uses, driven by one `.grid-col` media-query rule) and `EmailLayout`
(the `<html>/<head>/<body>` document shell + 600px content table every
template wraps around its composed sections — not one of the 8 named
components, just the wrapper they all sit inside).

**Business logic / presentation split**: `src/lib/email/data/{confirmation,edit-link,reminder}.ts`
each own one kind's own fetching (which order, which recipient, the
countdown math) and end by calling the shared
`src/lib/email/data/generic.ts`'s `resolveTemplateSections()` (§2.23.2),
which turns that kind's admin-authored `EmailTemplateSection` rows into
one plain `GenericEmailData` prop — no JSX anywhere in `data/`.
`src/lib/email/templates/GenericEmail.tsx` only ever consumes that plain
data. When your Canva designs are ready, only the components/template
change; the data builders, the resolution engine, and every call site
stay untouched — this is what "changing the layout shouldn't require
backend changes" means concretely (§2.23).

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

#### 2.16.2 The four email kinds

Through Sprint 6 this subsection described four separate fixed template
files (`ConfirmationEmail.tsx`, `UpdateEmail.tsx`, `ReminderEmail.tsx`,
`EditLinkEmail.tsx`), each with its section list hardcoded in JSX. **Post-
Sprint-6**, all four are `GenericEmail.tsx` rendering an admin-editable
section list instead — see §2.23.1/2.23.2 for the mechanics and §2.23.5
for exactly which sections each kind ships with by default (the same
visual output this paragraph used to describe verbatim). In short:

- **Confirmation Email** (`kind: "confirmation"`) — Greeting, this
  order's own items (Product Cards, `source: "order_items"`), CTA Button
  (Edit My Pre-order), Footer.
- **Retrieve My Pre-order / Edit Link Email** (`kind: "edit_link"`) —
  same shape as Confirmation.
- **Reminder Email** (`kind: "reminder"`) — Greeting, Countdown (reuses
  `SiteSettings.countdownTargetAt`, the same field the homepage's
  `EventInfoStrip` shows), CTA Button, Footer.
- **Newsletter** (`kind: "digest"`) — Greeting, Hero Banner/Rich Text/
  Collection Cards/Product Cards (Karen's Picks, New Products, Price
  Updates, Sold Out — all admin-toggled, §2.23.3), CTA Button, Footer.

Every one of these four has a real automatic trigger (§2.22): Confirmation
fires from `submitPreOrder` on checkout, Edit Link fires from
`requestEditLink` (§2.6), Reminder fires from the cron route 24 hours
before `SiteSettings.countdownTargetAt`, and Newsletter fires from the
Notification Centre's "Send Update."

#### 2.16.3 Notification Centre (`/admin/emails`)

"Collect changes throughout the day, then generate one digest" — modeled
as a single **current draft** `EmailDigest` row (the most recent one with
`status` in `draft`/`generated`; created lazily on first visit, like
`SiteSettings`' singleton pattern but with history preserved instead of a
literal singleton id). **Post-Sprint-6**, the Notification Centre itself
is purely operational — there's no form to fill in here anymore. Which
sections show, Karen's Notes, Collections/products to feature, subject,
and CTA text/URL are all edited once, structurally, at
`/admin/emails/templates/digest` (§2.23.3), not per send. Clicking
**Generate Email** here:

1. Saves whatever's currently in the form onto the draft.
2. Computes **New Products** (`Product.isNew: true`, active), **Price
   Updates** (active products whose `priceCents` differs from their
   `lastNotifiedPriceCents` baseline — products with no baseline yet are
   excluded, nothing to compare against), and — **new in Sprint 6** —
   **Sold Out** (`status: "sold_out"`, not yet flagged via the new
   `Product.lastNotifiedStatus` — §2.22.2) from live product state.
3. Snapshots all three into `EmailDigestItem` rows (replacing this
   draft's prior snapshot, so re-generating reflects current state, not
   duplicates) — same "snapshot, not live reference" reasoning as
   `OrderItem` vs. `WishlistItem` elsewhere in this schema, so a digest's
   history stays accurate even after the product changes again.
4. Computes `recipients` (every `PreOrder` with `unsubscribedAt: null`)
   and `recipientCount` — "prepare all required recipient data."
5. Resolves the current `EmailTemplate("digest")` (§2.23.2) and renders
   the final HTML via `renderGenericEmail`, saving it to `renderedHtml`;
   sets `status: "generated"`.

**As of Sprint 6, Generate Email no longer advances
`lastNotifiedPriceCents`** (or the new `lastNotifiedStatus`/`isNew`
checkpoints) — through Sprint 5 it did, "since there's no real send yet
to hang it off." Now that sending is real (§2.22.2), those checkpoints
only advance once `sendDigest()` has actually attempted every recipient's
send — Generate can be clicked and re-clicked freely without silently
consuming the diff it's only supposed to preview.

The page also shows a **live preview** (an `<iframe srcDoc>`) of the
current draft, refreshed on every Generate, plus (**new in Sprint 6**) a
real **Send Update** button next to Generate Email — disabled until a
`generated` draft exists. See §2.22.2 for exactly what it does.

**Personalization caveat**: the saved `renderedHtml` is *one*
representative preview render (a generic placeholder name, every section
toggled on), not what every recipient actually receives — **as of Sprint
6**, a real send personalizes the New Products/Price Updates sections per
recipient's own notification preferences (§2.22.3), so some customers'
copies are shorter than this preview. The preview page says so explicitly.

`/admin/emails/history` lists every digest ever generated (newest first);
`/admin/emails/history/[id]` shows a past digest's saved render plus
exactly which sections/products/collections were captured, read-only.
Through Sprint 5, nothing was ever marked `"sent"`, so history showed one
entry that kept updating each time Generate Email ran. **As of Sprint
6**, clicking Send Update sets `status: "sent"` and that row becomes
immutable history — the next Generate Email creates a fresh draft, so
multiple rows now accumulate over time, one per actual send. See
`/admin/emails/logs` (§2.22.4) for the individual per-recipient sends
behind any one "sent" row.

**Retired post-Sprint-6**: `/admin/emails/confirmation` and
`/admin/emails/reminder`, the two standalone preview harnesses that used
to live here (pick a real `PreOrder`, render that template against it
live). That capability now lives at `/admin/emails/templates/confirmation`
and `/admin/emails/templates/reminder` (§2.23.3), alongside the section
editor for the same kind instead of separate from it.

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
- **`src/lib/email/first-name.ts`** — `getFirstName()`. Originally needed
  because `PreOrder` only stored one "Full name" field; superseded in
  practice once the Checkout & Logo Polish pass split that into
  `customerFirstName`/`customerLastName` (§4.7), but kept as-is here
  since every Greeting still shows first name only, per your explicit
  instruction, and nothing needed to change at its call sites.
- **`EmailService` interface** (`src/lib/email/types.ts`) — swappable
  send abstraction, same pattern as `StorageAdapter`
  (`src/lib/storage/types.ts`). Its only implementation through Sprint 5,
  `consoleEmailService`, just logs — nothing called `.send()` for real
  before Sprint 5's `requestEditLink` (§2.6), and even that stayed
  against the console driver. **As of Sprint 6** (§2.22.1), a second
  implementation, `resendEmailService` (`src/lib/email/resend.ts`), sends
  through the [Resend](https://resend.com) API — selected via
  `EMAIL_DRIVER=resend` (local dev defaults to unset, i.e. console).
  Swapping to a different provider later (SES, Brevo, SMTP) is the same
  shape again: one new file implementing `EmailService`, one new `case`
  in `getEmailService()` (`src/lib/email/index.ts`), no changes anywhere
  that already imports `emailService` — the interface itself needed zero
  changes to accommodate a real provider, exactly as designed in Sprint 3.

### 2.17 Product Variants (Sprint 3.5)

Built for a catalogue where the same product (e.g. a notebook) commonly
comes in several designs/colours/sizes that would otherwise each need a
separate `Product` row. Deliberately scoped to **one optional variant
group per product** — no nested/multi-axis variants (e.g. Design *and*
Size together) — per the sprint brief's "Current requirement."

- **Admin** (`ProductVariantManager.tsx`, part of `ProductForm.tsx`): a
  free-text **Variant group name** field ("Design," "Colour," "Style,"
  "Size," …, same no-fixed-list pattern as `Product.type`/`brand`). No
  variant rows render at all until a group name is typed — a blank group
  name means "this product has no variants," and the server treats it as
  the single source of truth for that rule even if rows exist underneath.
  Each row: **Variant name** (required), **SKU** (optional, unique across
  both `Product.sku` and `ProductVariant.sku`), **Price override**
  (optional dollars — blank means "use the product's own price"), and one
  **image** (optional — no per-variant gallery). Rows support add/remove
  and native HTML5 drag-to-reorder (same pattern as `ProductImageManager`/
  `BannerList`), submitted as one `variantsJson` hidden field plus a shared
  hidden multi-file input, mirroring the existing image-manager pattern
  exactly. **Explicitly not built** (marked "(Future)" in the brief):
  per-variant Stock and Barcode — see §16.
- **Customer** (§2.14): variant selection is **pills, not a dropdown**,
  with instant, no-navigation image/price swapping.
- **Cart & Wishlist**: both `CartContext` and `WishlistContext` key their
  state by a composite `"${productId}::${variantId}"` string when a
  variant is involved (`buildCartKey`/`parseCartKey`, exported from
  `CartContext.tsx`) — a plain product's key is unchanged (`productId`
  alone), so every pre-existing call site needed zero changes. The Cart
  drawer, Wishlist drawer, and checkout item list all resolve a line's
  variant via this key and show a **"{Variant group}: {Variant name}"**
  subtitle under the product name.
- **Order submission**: `submitPreOrder` re-fetches the real
  `ProductVariant` row server-side (never trusts client data) and
  snapshots `variantId` (live reference) plus `variantName` (permanent
  snapshot, same "snapshot vs. live-reference" pattern as `productName` —
  §17) and the variant's price-override-or-product-price onto each
  `OrderItem`. This is the **only** checkout-adjacent change this sprint —
  the checkout flow's own steps/fields/UX are untouched.
- **Admin order display**: every item row on the admin pre-order detail
  page and the customer's own order confirmation page shows a
  "{Variant group}: {Variant name}" line under the product name whenever
  the order item has one — e.g. "Notebook" / "Design: Bear" — satisfying
  the brief's explicit requirement that admin orders clearly show which
  variant was ordered, not just the base product name.

### 2.18 Admin: Purchase Dashboard (`/admin/purchases`, new)

**Purpose, in Karen's words**: help her buy products efficiently while
physically walking around an exhibition. **Mobile-first** — designed for
her iPhone first, with full desktop support as well.

- **Scope**: the Buying List (below) covers every distinct
  product/variant combination that appears in **at least one submitted
  pre-order** — not the whole catalogue — since "Requested Quantity" and
  "Number of Customers" only mean something for items customers actually
  asked for (confirmed with you during planning).
- **Summary tiles**: Total Products, Products Without Price, Draft
  Products, Sold Out Products, Total Wishlist Items, Total Pre-orders, and
  **Average Order Size** (total `OrderItem` quantity ÷ number of
  `PreOrder`s — a dollar-value average would be misleading while many
  products have no price yet).
- **Purchase Progress**: a `bg-blue`-filled bar over a `bg-mint` track
  showing the percentage of buying-list rows marked Purchased, plus
  "Purchased X/Y Products" and "Remaining Z Products" text.
- **Buying List** (`PurchaseBuyingList.tsx`, client): stacked cards below
  the `md` breakpoint, an actual `<table>` from `md:` up (and forced into
  table layout when printing, regardless of screen width) — each row shows
  product photo, product name, variant name (if any), requested quantity,
  number of distinct customers, and a purchase-status `<select>`. Filters
  (Brand, Collection, Product Type, Product Status, Purchased Status —
  multi-select chips) and sort (Quantity / Brand / Collection / Product
  Name) are client-side state over the already-fetched list, the same
  "fetch once, filter in the browser" approach `ProductBrowser` already
  established for the customer catalog.
- **Purchase status**: **Not Purchased** / **Partially Purchased** /
  **Purchased**, stored directly on `Product.purchaseStatus` (a
  variant-less product) or `ProductVariant.purchaseStatus` (a variant),
  updated via `updatePurchaseStatus` (optimistic `<select>` + Server
  Action + `revalidatePath`, the same pattern `StatusSelect.tsx` already
  established for pre-order status) — **"Status should persist"** is
  satisfied by writing straight to the database, not client-only state.
- **CSV Export**: builds a CSV string client-side from the currently
  filtered/sorted rows and triggers a download via `Blob` +
  `URL.createObjectURL` + a temporary `<a download>` click — no new
  dependency, no server round trip.
- **Print-Friendly View**: a "Print" button calling `window.print()`; a
  new `@media print` block in `globals.css` hides the admin header/nav and
  the dashboard's summary tiles/filters/buttons (each tagged
  `print:hidden`), leaving just a clean table of the buying list — the
  Buying List's mobile card layout is also forced into its desktop
  `<table>` form when printing (`print:block`), regardless of the actual
  screen width, so a phone print/share still produces a real table.

### 2.19 Admin: Analytics Dashboard (`/admin/analytics`, new)

A single read-only Server Component surfacing customer-behaviour signals
from wishlist and pre-order activity — helps Karen see what customers are
interested in, not just what they've committed to buying. Every list below
is computed from two single-pass queries (all `WishlistItem`s and all
`OrderItem`s, each joined to their `Product`) rather than one database
`groupBy` per section, then aggregated/sorted in JavaScript — simpler to
keep correct than juggling many separate relation-spanning aggregations,
and the dataset is boutique-event-sized, not web-scale.

- **Most Wishlisted Products** / **Most Wishlisted Brands** / **Most
  Wishlisted Collections** — ranked by `WishlistItem` count (product-level,
  not per-variant — a product's total interest across all its variants
  combined).
- **Most Added To Pre-order** / **Most Popular Brands** / **Most Popular
  Collections** — the same shape, but ranked by total `OrderItem` quantity
  instead of wishlist count: interest vs. actual commitment, two different
  signals, deliberately shown side by side.
- **Products Waiting For Price** — products with `priceCents: null`,
  ranked by wishlist count descending, so the ones customers care about
  most bubble to the top of Karen's to-price list.
- **High Interest Products** — a plain, documented heuristic:
  `wishlistCount − orderedQuantity`, descending, filtered to a positive
  score — "customers like this but haven't committed to buying it yet."
  Not a hidden magic number; easy to adjust later if needed.
- **Recent Activity** — the most recent 20 rows from the new `ActivityLog`
  table (§4.7c), reverse-chronological, with a small icon per type (🆕
  product added, 💲 price updated, 🧾 order submitted, ♡ wishlist added).
  **Known gap**: a wishlist add made *before* a customer's browser is
  "linked" (§2.3 — i.e. before their first pre-order submission) never
  calls the `toggleWishlistItem` Server Action, so it never logs an
  activity row — only wishlist adds from an already-linked browser do.
  This doesn't affect the wishlist **data** itself (that first-time add
  still correctly becomes a real `WishlistItem` row once the customer
  checks out, via the existing migration step, §2.3) or any of the
  "Most Wishlisted" lists above, which query `WishlistItem` directly — it
  only means Recent Activity under-represents first-time wishlist adds.
  Deliberate scope boundary, not a bug: the approved plan named exactly
  `toggleWishlistItem`'s create branch as the trigger point.

### 2.20 Event Pages CMS (Sprint 4)

A lightweight, block-based content management system so Karen can write
and update her own site content — no code changes, no developer needed.
Turns the single-event pre-order site into a small Event Platform capable
of hosting future events' informational pages (Taiwan Creative Expo,
Bungujoshi Haku, Kamihaku, a future Wholesale Portal) as well as the two
seeded pages this sprint ships with.

#### 2.20.1 Data model — one open `type`, not one table per section

`EventPage` (`slug`, `title`, `sortOrder`) has many `PageSection` rows
(`type: String`, `data: Json`, `sortOrder`). Deliberately **one** table
for every section type, not a table per type — a future section (Video,
FAQ Accordion, Countdown Timer, Google Map, embedded Instagram/YouTube,
Product Carousel — all explicitly named in the brief as future-only, none
built this sprint) is just a new `type` string value plus a new Zod
schema in `src/lib/validations/event-page.ts`, no migration required.
Same reasoning already used for `ActivityLog.type` in Sprint 3.5 — see
§4.1b/§4.1c.

#### 2.20.2 Admin: Page List + Page Builder

- **Page List** (`/admin/event-pages`) — before listing, upserts the two
  seeded pages by slug if they don't already exist (same "lazy singleton"
  pattern as `SiteSettings`, applied per-visit instead of once) — this is
  what guarantees they exist on staging with no manual seed step, not
  just locally. Shows every page's title, slug, section count, a View
  Page link, Edit, and Delete (hidden for the two protected pages, see
  below) plus **+ Add Page** (title + slug, slug auto-suggested from the
  title via a client-side `slugify()` until the admin types into the slug
  field directly).
- **Page Builder** (`/admin/event-pages/[id]`) — a small title/slug edit
  form at top (slug read-only with an explanation when the page is
  protected), then the section list.
- **Slug validation**: lowercase letters/digits/hyphens only, checked
  against `RESERVED_SLUGS` (`admin`, `api`, `checkout`, `collections`,
  `my-preorders`, `order`, `product`, `unsubscribe` — every existing
  top-level route) so an admin can never accidentally create a page whose
  URL is silently shadowed by a real feature (Next always resolves a
  static route before the `/[slug]` catch-all at the same level regardless,
  but a page that can never be reached is still a confusing dead end
  worth blocking up front).
- **`PROTECTED_SLUGS`** (`how-to-preorder`, `about-event`) — the two
  seeded pages' slugs can't be changed and the pages can't be deleted,
  server-enforced in `updateEventPage`/`deleteEventPage` (the admin UI
  also hides the affected controls) — the homepage nav pills and the
  footer link to these exact URLs, so this prevents an easy way to
  silently break both.

#### 2.20.3 Section management

Each section is its own independently-savable block (a dedicated Server
Action per type, not one form for the whole page — friendlier for a
non-technical admin, since a mistake in one section's form can't block
saving the others):

- **+ Add Section** — a small type-picker menu (5 options with a
  one-line description each); creates a row with sensible empty defaults
  at the end of the list, appearing inline with no page navigation.
- **Drag-and-drop reorder** — native HTML5 drag events on just the
  section card's header row (not the whole card, including its expanded
  editor — keeps native drag from ever interfering with text selection
  inside an expanded Text section's rich text editor), same
  `draggable`/`onDragStart`/`onDragOver`/`onDrop` idiom as
  `BannerList.tsx`.
- **Duplicate** — copies a section's `type` and `data` (including any
  image URL(s) — no re-upload; the copy only diverges once one of the two
  is independently edited) immediately after the original.
- **Delete** — removes the row and best-effort deletes any stored
  image(s) it referenced.
- **Collapse/Expand** — per-card, local UI state only, not persisted.

#### 2.20.4 The five section types

- **Text** — an optional title plus a rich text editor
  (`EventSectionRichTextEditor.tsx`) supporting headings (H2/H3),
  paragraphs, bold, italic, bullet/numbered lists, hyperlinks, tables
  (insert a 3×3 with header row, add row, add column, delete table — the
  add/delete controls only show while the cursor is inside a table), a
  horizontal rule, text colour (a curated swatch row: the brand palette
  plus black/gray), text alignment (left/centre/right), and a curated
  emoji-insert popover (no emoji-picker dependency — a handful of rows
  covering brand marks + everyday reactions, inserted as plain Unicode
  text). **Deliberately a separate component from
  `../settings/PreorderInfoEditor.tsx`**, not a wider-configured variant
  of it — that editor's narrow schema is documented there as a trust
  boundary for `preorderInfoHtml`/`karenNotesHtml`, and loosening it to
  add headings/tables/colours would weaken that guarantee for two
  unrelated features. Same Tiptap `useEditor`/`EditorContent`/hidden-
  field-on-`onUpdate` shape, its own independently-scoped schema.
  "Copy & paste from Microsoft Word" needs no special handling — Tiptap/
  ProseMirror already filters pasted HTML down to whatever the editor's
  schema allows, so Word's own fonts/margins/track-changes markup get
  stripped automatically while headings/bold/italic/lists/tables/links
  survive.
- **Image** — one photo (reuses the same preview-and-replace upload UI as
  `BannerForm`'s image slots, run through `compressImageFile`, §2.17's
  compression fix, before staging) plus an optional caption.
- **Gallery** — unlimited photos via a multi-image picker modeled closely
  on `ProductImageManager.tsx` (drag-reorder, `DataTransfer`-synced
  hidden file input, `existing:<url>`/`new:<n>` order tokens — keyed by
  the image's own URL rather than a database row id, since gallery images
  aren't separate rows, just entries in `PageSection.data.images[]`),
  extended with a caption per photo. Rendered as a grid whose column
  count is picked from the image count: 1 → full width (natural aspect
  ratio, not cropped), 2 → 2 columns, 3 → 3 columns, 4 → 2×2, 5+ → a
  responsive wrap (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`). Every
  2+-count cell is `aspect-square object-cover` — the same crop-to-fill
  convention `ProductCard`'s photo and every admin thumbnail grid in this
  app already use.
- **Button** — button text, a URL, and an "open in new tab" checkbox;
  renders as a pill CTA matching the site's existing button language.
- **Divider** — no configurable fields; renders a plain `border-t` rule.

#### 2.20.5 Customer-facing rendering

`src/components/event-pages/SectionRenderer.tsx` (Server Component) reads
each section's `type` and renders the matching view. A Text section's
saved HTML renders via `dangerouslySetInnerHTML` into the shared
`.rich-text` class (extended this sprint, §2.15/§12, to also style
`h2`/`h3`/`table`/`th`/`td`/`hr` — text colour and alignment are inline
`style` attributes Tiptap applies directly, needing no extra CSS). A wide
table uses `display: block; overflow-x: auto` on the `<table>` element
itself so it scrolls within its own bounds rather than ever forcing the
whole page to scroll horizontally — "no horizontal scrolling" from the
brief, achieved without a wrapper `<div>` since this HTML comes straight
from Tiptap's own output.

#### 2.20.6 `/[slug]` — the dynamic catch-all route

A single `src/app/[slug]/page.tsx` serves **every** `EventPage` by its
`slug` column — `/how-to-preorder`, `/about-event`, and any future
admin-created page, all through the same file. This is exactly what
"future pages added without architecture changes" needs: a brand-new
`EventPage` row becomes reachable at its URL immediately, with zero new
route files. Next always resolves a static route (`/checkout`,
`/product`, etc.) before a dynamic one at the same level, so nothing
existing can ever be shadowed. Renders the standard `SiteHeader` +
`CartDrawer` + `WishlistDrawer` (same full-catalog-fetch pattern as
`/product/[id]`, so the header's cart/wishlist icons work identically
here) + the page's sections + `Footer`.

#### 2.20.7 Homepage nav pills

`EventPageNavPills.tsx` — two outline-pill links ("How to Pre-order,"
"About the Event") rendered directly under `<HeroCarousel />` and before
`<EventInfoStrip />` on the homepage. Deliberately its own component, not
folded into `FilterGroups`/`ProductToolbar`, so it stays structurally
separate from Product Filters per the brief's explicit requirement.
Styling matches `FilterChips`'/unselected-`VariantPills`' existing
outline-pill language rather than introducing a new pill treatment.

### 2.21 Customer Self-Service Portal (`/edit/[token]`, Sprint 5)

The destination of every edit link — a complete, passwordless, editable
view of one customer's pre-order. Reached only via the secure `editToken`
(§4.7); the customer never sees or enters the token itself, only ever
clicks a link that already has it (§2.6).

**Linking, not a new wishlist system**: opening the page mounts
`LinkBrowserOnMount.tsx` (mirrors `ClearCartOnMount.tsx`'s exact
"Server-Action-on-mount, nothing to render" shape), which sets the same
`shokakko_preorder_token` cookie `submitPreOrder` already sets. From that
moment, this browser's `WishlistContext` (§2.3) is in linked mode against
this exact order — browsing anywhere else on the site and tapping ♡
already saves here, no new "add to wishlist" UI was needed inside the
portal itself.

**Products**: each `OrderItem` shows its photo, name, `VariantPills`
(reused as-is, §2.17) if the product has a variant group, price,
`QuantitySelector` (reused as-is, minimum 1 — going to zero isn't exposed
via the stepper, "Remove" is the explicit action for that), computed
subtotal, and a Remove button, plus an order total. Every change — a
variant swap, a quantity change — re-fetches the live product/variant
server-side and re-snapshots the price, same never-trust-stale-data
principle as `submitPreOrder`.

**Wishlist**: shows what's currently saved to this order (image, name,
variant label, price), with Remove (reuses `toggleWishlistItem` from
`components/wishlist/actions.ts` directly — no new action needed) and
Move to Pre-order (`moveWishlistItemToOrder` — increments a matching
existing `OrderItem` or creates a new one, same snapshot shape as
`submitPreOrder`, then drops the `WishlistItem`) actions per row, plus a
"Browse more products" link.

**Customer Information**: First/Last Name, Email, structured Shipping
Address, structured Billing Address (+ "same as shipping"), Notes — its
own form with a **Save Changes** button and an inline "Your preorder has
been updated successfully" confirmation (no page reload). Deliberately
does **not** include Shipping Method, even though it's part of the
`orderFormSchema` this reuses (`.omit({ shippingMethod: true })`) — kept
out to match exactly what was asked for this section.

**Notification Preferences**: three checkboxes — "Notify me when new
products are added," "...when product prices are updated," "Remind me 24
hours before preorder closes" — each backed by a `PreOrder` boolean
column, saving the instant it's toggled (no Save button, per the
explicit "save immediately" requirement). Through Sprint 5, **stored and
fully editable but not yet consumed by anything** — `EmailDigest`'s
recipient list (§2.16.3) was still a broadcast to every non-unsubscribed
order. **As of Sprint 6** (§2.22.3), `notifyNewProducts`/
`notifyPriceUpdates` personalize a real digest send per recipient (each
section is only included if the digest's own toggle *and* that
recipient's own preference are both on), and `notifyReminderBeforeClose`
gates the automatic Reminder Email batch. Karen's Notes/Collections/
Karen's Picks/Sold Out remain un-gated — every non-unsubscribed recipient
the admin included sees those regardless of their preference checkboxes.

**Order Timeline**: a plain-language history — "Order Created," then
"Updated" for every change after that (regardless of its real type — the
admin Order History, §2.11, shows the real type per row instead), ending
in a "Current Version" marker. Keyed off each `OrderHistoryEntry`'s
actual `type` field, not just "is this the first row" — an order placed
before this sprint has no `order_created` row at all, so treating
position as the signal would mislabel its first real change as "Order
Created" (caught during this sprint's own verification, fixed before
shipping). "Last Updated" (shown in the portal's header, alongside Order
Number and Event Name) is the same data source's latest timestamp, not a
separate stored column — see §4.7's `OrderHistoryEntry` note.

**A broken or expired link shows a friendly message**, not a bare 404 —
"This link is invalid or has expired," with a link back to My Pre-order.

Full site chrome (`SiteHeader` + `CartDrawer` + `WishlistDrawer`, same
full-catalog-fetch pattern as `/product/[id]` and the Sprint 4 `/[slug]`
route) so the header's cart/wishlist icons behave identically to every
other page on the site.

### 2.22 Communication Platform (Sprint 6)

Connects the Email Communication System (§2.16), the Self-Service
Portal's notification preferences (§2.21), and the Notification Centre
into one real platform: a live provider, automatic triggers at every
point a customer or admin would expect an email, and admin visibility
into what actually sent. **Provider-independent by design** — nothing
built this sprint couples the app to Resend specifically; see §2.16.4.

#### 2.22.1 Email Queue (`src/lib/email/queue.ts`)

A new `EmailLog` table (§4.7g) that every real send goes through first —
"Queue → Worker → Resend" as three functions over that table, not
separate infrastructure (no Redis/queue service anywhere in this stack,
and this app's volume is exhibition-scale — tens to low-hundreds of
recipients, not thousands):

- **`enqueueEmail()`** — the "Queue" step. Writes a `pending` `EmailLog`
  row (recipient, subject, HTML, template, and an optional link to the
  `PreOrder`/`EmailDigest` it's for) and nothing else.
- **`processEmailLog(id)`** — the "Worker" step. Loads the row, marks it
  `sending`, calls the configured `EmailService`, and records the outcome
  — `sent` (with the provider's message id) or `failed` (with the real
  error message). Safe to call more than once on the same row, which is
  exactly what a Retry click or the cron sweep below does.
- **`sendTrackedEmail()`** — enqueue + process back-to-back; every real
  send site in this app calls this instead of `emailService.send()`
  directly, which is what makes every attempt show up in Email Logs
  (§2.22.4) automatically, with no per-call-site logging code.

A stuck `pending`/`sending` row (a crash mid-request, a provider outage
between attempts) is swept up and retried by the cron route (§2.22.6)
whenever it's been sitting for more than 10 minutes — the closest thing
to a real background worker this app has, and enough at this scale.

#### 2.22.2 Confirmation, Edit Link, and the real "Send Update"

- **Confirmation Email** now fires automatically at the end of
  `submitPreOrder`, right after the existing `ActivityLog`/
  `OrderHistoryEntry` inserts — best-effort, same as those two, so a
  provider outage never breaks checkout (the attempt still lands in
  Email Logs as `failed`, visible for Karen to retry). The Secure Edit
  Token is never shown as visible text, only as the CTA button's `href`.
- **"Retrieve My Pre-order"** (`requestEditLink`, §2.6) now routes
  through `sendTrackedEmail` instead of the raw `EmailService` — its
  privacy behavior (identical response regardless of whether an order
  exists) needed no changes, since a send failure was already
  best-effort and swallowed before this sprint.
- **"Send Update"** (`sendDigest()`, `src/app/admin/(protected)/emails/actions.ts`)
  is the Notification Centre's real send action, replacing the
  disabled placeholder button. Requires a `generated` draft. Re-derives
  New Products/Price Updates/Sold Out from live product state (the same
  functions Generate Email used) rather than trusting the saved
  `EmailDigestItem` snapshot, so a send always reflects the freshest
  catalogue truth even if something changed between Generate and Send —
  the snapshot stays a historical record for `/admin/emails/history`.
  Loops every non-unsubscribed `PreOrder`, personalizes per recipient
  (§2.22.3), skips a recipient entirely if nothing would show them
  anything, and sends one `sendTrackedEmail()` call per recipient — "only
  ONE email per customer" is structural, not a dedup step. Only after
  every attempted send does it advance the "mark as published"
  checkpoints (`lastNotifiedPriceCents`, the new
  `Product.lastNotifiedStatus`, `isNew`) and flip the digest to `"sent"`.

#### 2.22.3 Sold Out & per-recipient personalization

- **Sold Out** is a new, automatically-computed Update Email section
  (`computeSoldOutCandidates()`), following the exact same "checkpoint"
  pattern Price Updates already used: a new `Product.lastNotifiedStatus`
  baseline (§4.1), candidates are products with `status: "sold_out"` not
  yet flagged as notified, and it's cleared back to `null` whenever a
  product's status is saved as anything other than `"sold_out"` — so a
  restock-then-sell-out cycle is picked up as a fresh candidate again. A
  new "Show Sold Out" toggle on `NotificationCentreForm.tsx` matches the
  existing New Products/Price Updates checkbox exactly.
- **Personalization** applies only to the three preferences that exist
  (§2.21) — `notifyNewProducts`/`notifyPriceUpdates` gate their sections
  per recipient; Karen's Notes/Collections/Karen's Picks/Sold Out are not
  preference-gated and reach every non-unsubscribed recipient the admin
  included. The Notification Centre's preview shows the "maximal"
  version (every section on, as if every recipient opted into
  everything) with a caption noting some customers' real copies may be
  shorter.

#### 2.22.4 Email Logs (`/admin/emails/logs`, new)

Every attempted send, any status, newest first, reading directly from
`EmailLog`: Recipient, Template, Status (badge), Sent time, Provider,
Error message, and a **Retry** button on any `failed` row (re-runs
`processEmailLog` via a new `retryEmailLog` Server Action). Linked from
`/admin/emails`'s header alongside the existing "View history" link.

#### 2.22.5 Notification Dashboard (`/admin/emails/dashboard`, new)

At-a-glance health of the whole platform: **Emails Sent Today**,
**Pending Emails**, **Failed Emails** (three `EmailLog` count tiles,
same visual convention as the Purchase Dashboard's summary tiles), a
short **Daily Digest History** recap (linking to the existing
`/admin/emails/history`), and **Reminder History** — grouped by the
calendar day reminder `EmailLog` rows were sent, since every reminder
send already produces its own log row and no separate "batch" table was
needed.

#### 2.22.6 Reminder Email & the cron route (new)

The Reminder Email (`ReminderEmail.tsx`, built in Sprint 3, never
triggered before this sprint) now fires automatically 24 hours before
`SiteSettings.countdownTargetAt` — site-wide, not per-order, since the
countdown itself is one site-wide field (a future multi-event feature
would need to move this per-event, see §16). `src/app/api/cron/emails/route.ts`
— **this project's first API route** — is the single entrypoint, called
once daily by Vercel Cron (`vercel.json`, `0 20 * * *` — Vercel's Hobby
plan, which this deployment is on, rejects any cron schedule running
more than once a day; it enforces this at deploy time, and the very
first deploy attempt with an hourly schedule silently blocked *every*
deployment for this project, not just the cron itself, until caught and
fixed during this sprint's own staging rollout), authenticated via a
bearer-token check against `CRON_SECRET` (Vercel sends this header
automatically for a configured cron once the env var exists; anything
else gets `401`). Each run: (1) sweeps and retries any `EmailLog` stuck
`pending`/`sending` for over 10 minutes (§2.22.1), and (2) if the
countdown is set, in the future, and within 24 hours, and
`SiteSettings.reminderBatchSentAt` is still `null` for it, sends the
batch to every eligible `PreOrder` (`unsubscribedAt: null`,
`notifyReminderBeforeClose: true`, has an `editToken`) and stamps
`reminderBatchSentAt`. **Changing the countdown target in
`/admin/settings` re-arms the guard** — `updateSiteSettings` resets
`reminderBatchSentAt` back to `null` whenever `countdownTargetAt` itself
changes, so a newly-set or moved event gets its own fresh reminder
cycle. Because the check is window-based (≤24h away, not "exactly now"),
a daily cron still gives every customer at least 24h notice — in
practice a 24–48h lead time depending on what time of day the cron
happens to run relative to the countdown target. Upgrading to Vercel's
Pro plan later would allow an hourly schedule for a tighter window, with
no code changes — only the schedule string in `vercel.json`.

#### 2.22.7 Environment

New env vars (`.env.example`): `EMAIL_DRIVER=resend` (unset/`"console"`
for local dev, unchanged), `RESEND_API_KEY`, `EMAIL_FROM` (a verified
Resend sender address), `CRON_SECRET`.

### 2.23 Email Template Manager & Consistent Variant Rendering

Generalizes §2.22.2's per-kind hard-wired structure to a single,
admin-editable system covering all four email kinds — same open
`type: String` + `data: Json` section architecture as Sprint 4's Event
Pages CMS (§2.20.1), applied to email instead of web pages, and built by
directly mirroring that CMS's Page Builder UI.

#### 2.23.1 Data model

Two new models: `EmailTemplate` (`id`, `kind` — `"confirmation"` |
`"edit_link"` | `"reminder"` | `"digest"`, `@unique` — `subject`) and
`EmailTemplateSection` (`id`, `templateId`, `type`, `show: Boolean`, the
☑/☐ toggle, `sortOrder`, `data: Json`). Nine section types:
**Hero Banner**, **Greeting**, **Rich Text**, **Image**,
**Collection Cards**, **Product Cards**, **CTA Button**, **Footer**, and
**Countdown** (a ninth addition beyond the original brief's list, folded
into the same uniform system rather than staying a Reminder-only
hardcoded exception). `Header` is deliberately *not* a section — every
email always shows it, unconditionally, same as before.

`EmailDigest` (§4.7b) slims down to a pure send-operation record
(`status`, `renderedHtml`, `recipientCount`, `generatedAt`, `recipients`,
`items`, `emailLogs`) — the fields that used to be template *structure*
(`subject`, `karenNotesHtml`/six `show*` booleans, `ctaText`/`ctaUrl`,
picked `collections`/`recommendedProducts`) moved to
`EmailTemplate(kind: "digest")`'s sections, so there's one source of
truth for "what's in my Newsletter," not two. `SiteSettings.emailHeroImageUrl`/
`emailHeroLinkUrl` (Sprint 3, used only by the Newsletter) are retired —
Hero Banner is now a real per-template section, uploaded the same way
banner/product/collection images already are.

`OrderItem` gains `variantGroupName String?` (§4.7), snapshotted
alongside the existing `variantName` at every write site
(`submitPreOrder`, `updateOrderItemVariant`, `moveWishlistItemToOrder`)
— closes a real gap where the group label ("Design," "Colour," ...) had
no permanent record, only a live join through `productId` that
disappears once a product is deleted.

#### 2.23.2 The section-resolution engine

`src/lib/email/data/generic.ts`'s `resolveTemplateSections(kind, ctx)` is
the shared core every kind's data builder ends with — loads the
admin-authored `EmailTemplate`, filters to shown sections, and resolves
each into concrete render props using whatever business-logic context
(`ctx`) the caller already fetched. Each kind keeps its own thin builder
(`buildConfirmationEmailData`, `buildEditLinkEmailData`,
`buildReminderEmailData` — still owning "which order/countdown," never
returning JSX); the Newsletter's `generateEmail`/`sendDigest`
(`src/app/admin/(protected)/emails/actions.ts`) call it directly. One
generic `GenericEmail.tsx` (`src/lib/email/templates/`) replaces the
four previously fixed template files, switching on each resolved
section's type to call the matching Design System component — a new
`EmailImage` component (named to avoid a naming collision with
`next/image`) joins the 8 from §2.16.1 for standalone images distinct
from Hero Banner.

**`product_cards`'s `data.source` is the fork between "marketing
content" and "this recipient's own order."** `"manual"` (admin-picked),
`"new_products"`/`"price_updates"`/`"sold_out"` (auto-computed, same
functions §2.22.2 already used) render as a `ProductCard` grid, exactly
like the old Newsletter sections did. `"order_items"` is new: it renders
the *recipient's own* `OrderItem` rows via `OrderSummary.tsx` — name,
variant options (§2.23.4), quantity, subtotal, total — the same shape
Confirmation always used, now reusable by any kind. **The Retrieve My
Pre-order template's default now includes this section, shown** —
before this sprint it showed no items at all.

A CTA Button's `url` may be the literal placeholder `{{edit_url}}`,
substituted at render time with the recipient's own `/edit/{token}` link
— lets Confirmation/Retrieve/Reminder's buttons stay per-recipient
without a special-cased field; the Newsletter just uses a real URL
instead, since it has no single recipient. A Confirmation subject may
similarly include `{{order_number}}`, substituted by that kind's own
builder.

The Newsletter's per-recipient personalization (§2.22.3) is now a
`resolveTemplateSections` call per recipient, with
`excludeProductSources: ["new_products", "price_updates"]` populated per
that recipient's own `notifyNewProducts`/`notifyPriceUpdates` — same
behavior as before, expressed as a context filter instead of two
hardcoded booleans.

#### 2.23.3 Admin: `/admin/emails/templates`

A list of the 4 kinds (section count + last updated) linking to
`/admin/emails/templates/[kind]` — a Page-Builder-style editor
mirroring Event Pages' exactly: drag-reorder, duplicate, delete,
collapse/expand (`EmailTemplateSectionList.tsx` / `EmailSectionCard.tsx`
= `PageSectionList.tsx` / `SectionCard.tsx`), plus one addition Event
Pages sections never needed — a **Show/Hide** toggle pill in each card's
header. A live preview sits alongside: for Confirmation/Retrieve/
Reminder, pick any real recent order (same "preview against a real
order" convention the old standalone preview pages used — those two
pages are retired, folded in here); for the Newsletter, a placeholder-
data preview, same convention as `/admin/emails`'s own.
`/admin/emails` itself is now purely operational (Generate/Send/preview
against whatever the Newsletter template currently says) — its former
toggle-checkbox form moved entirely into the Template Manager.

#### 2.23.4 Consistent variant rendering across 6 surfaces

A new pure helper, `getOrderItemOptions()`
(`src/lib/order-item-options.ts`), reads `{ variantName, variantGroupName }`
and returns `{ label, value }[]` — **always an array**, even though
today it's always 0 or 1 entries, so a future multi-option-group product
(e.g. "Size: A5" *and* "Colour: Blue" on one line) only needs this one
function to change, not a rewrite of every display site. Falls back to
the generic label `"Variant"` only for a legacy row with a name but no
group snapshot. A small shared component, `OrderItemOptions.tsx`
(`src/components/shared/`), renders that array as one line per option
for app-UI surfaces; email templates call the helper directly inline.

Applied consistently, replacing every hardcoded `"Variant: {name}"`
label, across: the Confirmation Email, the Retrieve My Pre-order Email
(previously showed no items at all), the admin order detail page
(`/admin/preorders/[id]`), the customer-facing order confirmation page
(`/order/[orderNumber]` — fixed alongside its near-identical admin twin,
though not explicitly named in the brief), the Self-Service Portal
(`/edit/[token]`'s read-only fallback, when the live product/variant no
longer exists), and the Purchase Dashboard (`PurchaseBuyingList.tsx` —
previously showed no group label at all, just a bare variant name; its
existing live product/variant join now also selects `variantGroupName`).

#### 2.23.5 Seeding

`scripts/seed-email-templates.mjs` (mirrors
`scripts/apply-remote-migrations.mjs`'s env-var-driven, idempotent
pattern) creates the 4 `EmailTemplate` rows with sections reproducing
exactly what each email looked like before this sprint, so nothing
visually changed until an admin edited something through the new
builder. Safe to re-run — skips any kind that already has a row.

---

## 3. Screens (complete list, exactly as they behave today)

| Screen | Route | Auth | Renders |
|---|---|---|---|
| Homepage | `/` | Public | Header, hero carousel, event info, toolbar, filters, product grid, footer (§2.1) |
| Product Details | `/product/[id]` | Public | Image gallery, full details, wishlist/add-to-pre-order (§2.14) |
| Checkout | `/checkout` | Public | Cart summary, pre-order info, shipping notice, pre-order form (§2.2) |
| Order confirmation | `/order/[orderNumber]` | Public (token-based via the order number) | Order summary, clears the cart (§2.5) |
| My Pre-order | `/my-preorders` | Public | Email-lookup form, sends a secure edit link (§2.6) |
| Self-Service Portal | `/edit/[token]` | Public (token-based) | Full editable pre-order — products, wishlist, customer info, notification preferences, timeline (§2.21) |
| Collection | `/collections/[id]` | Public | Products in one tag — Email Collection Cards link here (§2.16.4) |
| Collections index | `/collections` | Public | Every collection, square image + name |
| Unsubscribe | `/unsubscribe/[token]` | Public (token-based) | Sets `PreOrder.unsubscribedAt`, confirmation message (§2.16.4) |
| Event Page | `/[slug]` (e.g. `/how-to-preorder`, `/about-event`) | Public | One `EventPage`'s title + sections, full header/drawers/footer (§2.20.6) |
| Admin login | `/admin/login` | Public | Password form |
| Admin dashboard | `/admin` | Admin session required | Stat tiles + quick links |
| Admin product list | `/admin/products` | Admin session required | Product table |
| Admin add product | `/admin/products/new` | Admin session required | `ProductForm` (create mode) |
| Admin edit product | `/admin/products/[id]` | Admin session required | `ProductForm` (edit mode) + Delete |
| Admin banner list | `/admin/banners` | Admin session required | Drag-reorderable banner list (§2.9) |
| Admin add banner | `/admin/banners/new` | Admin session required | `BannerForm` (create mode) |
| Admin edit banner | `/admin/banners/[id]` | Admin session required | `BannerForm` (edit mode) + Delete |
| Admin collections | `/admin/collections` | Admin session required | Tag list, inline square-image upload (§2.16.4) |
| Admin Notification Centre | `/admin/emails` | Admin session required | Newsletter live preview + Generate Email + Send Update, purely operational (§2.22.2, §2.23.3) |
| Admin email history | `/admin/emails/history`, `/history/[id]` | Admin session required | Past generated/sent digests, read-only detail |
| Admin Email Logs | `/admin/emails/logs` | Admin session required | Every attempted send, any status, with Retry (§2.22.4) |
| Admin Notification Dashboard | `/admin/emails/dashboard` | Admin session required | Sent-today/pending/failed tiles, Daily Digest + Reminder history (§2.22.5) |
| Admin Email Templates | `/admin/emails/templates` | Admin session required | List of the 4 email kinds, section count + last updated (§2.23.3) |
| Admin Email Template Builder | `/admin/emails/templates/[kind]` | Admin session required | Page-Builder-style section editor (add/reorder/duplicate/delete/show-hide) + live preview (§2.23.3) — replaces the retired `/admin/emails/confirmation`/`/reminder` preview pages |
| Admin settings | `/admin/settings` | Admin session required | Logo/event/countdown form + Email settings (§2.10, §2.16.4) |
| Admin pre-order list | `/admin/preorders` | Admin session required | Pre-order table |
| Admin pre-order detail | `/admin/preorders/[id]` | Admin session required | Full order detail |
| Admin Purchase Dashboard | `/admin/purchases` | Admin session required | Summary tiles, progress bar, mobile-first Buying List with filters/sort/CSV/print (§2.18) |
| Admin Analytics Dashboard | `/admin/analytics` | Admin session required | Wishlist/order interest signals, Recent Activity feed (§2.19) |
| Admin Event Pages list | `/admin/event-pages` | Admin session required | Page List, seeded-page upsert-on-visit, + Add Page (§2.20.2) |
| Admin add Event Page | `/admin/event-pages/new` | Admin session required | Title/slug form |
| Admin Page Builder | `/admin/event-pages/[id]` | Admin session required | Title/slug form + section list (add/reorder/duplicate/delete/edit) (§2.20.2–2.20.4) |
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
| `lastNotifiedPriceCents` | `Int?` | **New in Sprint 3** — Price Updates baseline; seeded to `priceCents` on create, advanced only by a real Send Update (§2.22.2, moved from Generate Email as of Sprint 6) |
| `lastNotifiedStatus` | `String?` | **New in Sprint 6** — Sold Out checkpoint, same pattern as `lastNotifiedPriceCents` above. `null` until a Send Update includes this product as sold-out (§2.22.3); reset back to `null` whenever the product's status is saved as anything other than `"sold_out"` |
| `variantGroupName` | `String?` | **New in Sprint 3.5** — free text ("Design," "Colour," …); `null` = this product has no variants (§2.17) |
| `purchaseStatus` | `String` | **New in Sprint 3.5**, default `"not_purchased"` — Purchase Dashboard checklist status, used only for a variant-less product (§2.18) |
| `createdAt` / `updatedAt` | `DateTime` | Auto-managed |
| `images` | `ProductImage[]` | **New in Sprint 1** — replaces the removed `imageUrl` string |
| `tags` | `Tag[]` | Implicit many-to-many |
| `variants` | `ProductVariant[]` | **New in Sprint 3.5** — see §4.1a |
| `orderItems` | `OrderItem[]` | One-to-many |
| `wishlistItems` | `WishlistItem[]` | One-to-many |
| `digestItems` | `EmailDigestItem[]` | **New in Sprint 3** — see §4.7b |
| `recommendedInDigests` | `EmailDigest[]` | **New in Sprint 3** — digests that featured this product under Karen's Picks |

`imageUrl` and `isActive` **no longer exist** on this model — removed in a
follow-up migration after their data was backfilled into `images`/`status`
(see §4.7).

### 4.1a `ProductVariant` (new in Sprint 3.5)

One row per pill option under a product's single variant group
(`Product.variantGroupName`) — deliberately flat, one group per product,
not a separate `VariantGroup` model, matching the brief's "Current
requirement: Support ONE Variant Group per product" (§2.17).

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `productId` | `String` | FK → `Product.id`, `onDelete: Cascade` |
| `name` | `String` | "Cat," "Bear," "Rabbit," … |
| `sku` | `String?` | Optional, `@unique` when set — nullable-unique is fine on SQLite (every `NULL` is distinct), same precedent as `PreOrder.editToken` |
| `priceCentsOverride` | `Int?` | `null` = use the parent `Product`'s own `priceCents` |
| `imageUrl` | `String?` | One image per variant (no gallery) — swaps in as the main product photo on selection |
| `sortOrder` | `Int` | Default `0` — admin-controlled pill display order |
| `purchaseStatus` | `String` | Default `"not_purchased"` — Purchase Dashboard checklist status for this specific variant (§2.18) |
| `createdAt` | `DateTime` | Auto-set |
| `orderItems` | `OrderItem[]` | One-to-many |
| `wishlistItems` | `WishlistItem[]` | One-to-many |

**Explicitly not built** (marked "(Future)" in the sprint brief, and not
blocked by this shape): per-variant Stock and Barcode fields — see §16.

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
| `emailContactUrl` / `emailShippingPolicyUrl` / `emailWebsiteUrl` / `emailInstagramUrl` | `String?` | **New in Sprint 3** — admin-configurable email Footer links, independent of the site-wide `Footer.tsx` component (which stays hardcoded) |
| `reminderBatchSentAt` | `DateTime?` | **New in Sprint 6** — guards the automatic Reminder Email batch (§2.22.6) against sending twice for the same `countdownTargetAt`. Reset to `null` by `updateSiteSettings` whenever `countdownTargetAt` itself changes |
| `updatedAt` | `DateTime` | Auto-managed |

Lazily created via `upsert` on first save (`updateSiteSettings`) — no
migration-time seed row required.

**Retired post-Sprint-6**: `emailHeroImageUrl`/`emailHeroLinkUrl` (the
Update Email's one global Hero Banner). Hero Banner images are now
per-template — each kind's own `hero_banner` section carries its own
`imageUrl`/`linkUrl` in its `data` (§2.23.1, §4.7h), uploaded the same
way as any other email image.

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

`PreOrder`'s customer/address shape was restructured in the previous
session's **Checkout & Logo Polish** pass (undocumented until now — folded
in as part of this sprint's docs update, per §"Version" above):

| Field | Type | Notes |
|---|---|---|
| `customerFirstName` / `customerLastName` | `String` | Replaces the old single `customerName` "Full name" field |
| `shippingAddress1` / `shippingAddress2` | `String` / `String?` | Address 1 required, Address 2 optional — replaces the old single free-text `shippingAddress` field |
| `shippingSuburb` / `shippingState` / `shippingPostcode` | `String` | Required |
| `shippingCountry` | `String` | Default `"Australia"`, editable for international orders |
| `billingAddress1`/`2`/`Suburb`/`State`/`Postcode`/`Country` | all `String?` | Same shape as shipping, every field nullable — `null` across the board means "same as shipping" (the checkout form's default) |
| `shippingMethod` | `String` | Default `"standard"` — `"standard"` \| `"express"`, chosen at checkout |

`OrderItem` remains structurally the same snapshotting shape from before
Sprint 1 (nullable `productId`/`SetNull`), plus two Sprint 3.5 additions
(§2.17):

| Field | Type | Notes |
|---|---|---|
| `variantId` | `String?` | **New in Sprint 3.5** — FK → `ProductVariant.id`, `SetNull`. Live reference to which variant was ordered, if any |
| `variantName` | `String?` | **New in Sprint 3.5** — permanent snapshot of the chosen variant's name (e.g. "Bear"), same reasoning as `productName` — so "Notebook / Design: Bear" still displays correctly even if the variant is later renamed or deleted |
| `variantGroupName` | `String?` | **New post-Sprint-6** — permanent snapshot of the variant's *group* name (e.g. "Design"), alongside `variantName` above. Closes a gap where the group label had no permanent record, only a live join through `productId` that disappears once the product is deleted. Read together via `getOrderItemOptions()` (§2.23.4, `src/lib/order-item-options.ts`). |

`PreOrder` itself gained:

| Field | Type | Notes |
|---|---|---|
| `editToken` | `String?` | **New in Sprint 2** — `@unique`, nullable (old pre-Sprint-2 orders have none). A random 24-char token (`nanoid`, `src/lib/edit-token.ts`) generated once at submission and never rotated. Purposes: (1) the `/edit/{token}` Self-Service Portal URL (real as of Sprint 5, §2.21), (2) the `shokakko_preorder_token` cookie that links linked-mode wishlist writes back to this order (§2.3), and (3) the `/unsubscribe/{token}` link in every email's Footer. |
| `wishlistItems` | `WishlistItem[]` | **New in Sprint 2** — see §4.7a. |
| `unsubscribedAt` | `DateTime?` | **New in Sprint 3** — set when this customer clicks Unsubscribe (§2.16.4); excludes them from every future `EmailDigest`'s `recipients`. |
| `receivedDigests` | `EmailDigest[]` | **New in Sprint 3** — which digests counted this order as a recipient (computed at generate time). |
| `notifyNewProducts` / `notifyPriceUpdates` / `notifyReminderBeforeClose` | `Boolean` | **New in Sprint 5**, default `true` each — customer-managed notification preferences, editable from the Self-Service Portal (§2.21). **As of Sprint 6**, actually consumed: the first two personalize `sendDigest()`'s per-recipient content, the third gates the automatic Reminder Email batch (§2.22.2/§2.22.6). |
| `historyEntries` | `OrderHistoryEntry[]` | **New in Sprint 5** — see §4.7f. |
| `emailLogs` | `EmailLog[]` | **New in Sprint 6** — every email ever attempted to this order, see §4.7g. |

The only functional change to `orderNumber` itself is **how** it's
generated (§2.7) — the column didn't change shape. "Last Updated," shown
in the Self-Service Portal's header, is deliberately **not** a stored
`updatedAt` column — it's derived from the latest `historyEntries`
timestamp (falling back to `createdAt` if there's somehow no history yet)
so it doesn't need a manual bump on every mutation across `OrderItem`/
`WishlistItem`/`PreOrder` itself.

### 4.7a `WishlistItem` (new in Sprint 2)

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `preOrderId` | `String` | FK → `PreOrder.id`, `onDelete: Cascade` |
| `productId` | `String` | FK → `Product.id`, `onDelete: Cascade` |
| `variantId` | `String?` | **New in Sprint 3.5** — FK → `ProductVariant.id`, `SetNull`, live reference (not a snapshot, same reasoning as `productId`) — which variant was wishlisted, if any (§2.17) |
| `addedAt` | `DateTime` | Auto-set |

`@@unique([preOrderId, productId, variantId])` (extended in Sprint 3.5 to
include `variantId`) prevents duplicate rows for the same product+variant
combination on the same order — two different variants of the same
product can each be wishlisted independently, as separate rows.
Deliberately **not** a snapshot (contrast with `OrderItem`) — the
wishlist's whole purpose is live status, so it's a plain reference to the
current `Product`/`ProductVariant` row; if the product is deleted, its
`WishlistItem` rows cascade-delete with it, and if just the variant is
deleted, the row falls back to pointing at the base product (`SetNull`)
rather than vanishing. Tied to `PreOrder`, not a new `Customer` entity, to
keep today's accountless model intact — see the future-compatibility note
in §16.

### 4.7b `EmailDigest` / `EmailDigestItem` (new in Sprint 3; slimmed post-Sprint-6)

One Newsletter **send-operation record** — see §2.22.2/§2.23.1 for the
full mechanics. Through Sprint 6 this model also owned template
*structure* (`subject`, `karenNotesHtml`, six `show*` booleans,
`ctaText`/`ctaUrl`, picked `collections`/`recommendedProducts`) — as of
§2.23, that structure moved to `EmailTemplate(kind: "digest")`'s
sections (§4.7h), and those fields/relations were **removed** from this
model.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `status` | `String` | Default `"draft"` — `"draft"` \| `"generated"` \| `"sent"` (`"sent"` real as of Sprint 6, §2.22.2 — set by `sendDigest()`, at which point the row becomes immutable history) |
| `renderedHtml` | `String?` | Saved by Generate Email — one representative preview render, not per-recipient (§2.16.3, §2.22.3) |
| `recipientCount` | `Int?` | Through Sprint 5, set at generate time. **As of Sprint 6**, set by `sendDigest()` to the actual number of recipients sent to (personalization can skip a recipient — §2.22.3) |
| `generatedAt` | `DateTime?` | Set by Generate Email |
| `recipients` | `PreOrder[]` | Computed at generate time — every non-unsubscribed `PreOrder`. **As of Sprint 6**, `sendDigest()` re-queries this fresh at send time rather than trusting this snapshot, in case subscriptions changed between Generate and Send |
| `items` | `EmailDigestItem[]` | Computed sections, snapshotted — see below |
| `emailLogs` | `EmailLog[]` | **New in Sprint 6** — every per-recipient send attempt behind this digest, see §4.7g |

`EmailDigestItem` snapshots the **computed** sections (New Products,
Price Updates, and — **new in Sprint 6** — Sold Out) at generate time —
unlike `collections`/`recommendedProducts` (admin-picked, so a live
relation is fine), these are automatic, so a row is captured per item
with `kind` (`"new"` \| `"price_update"` \| `"sold_out"`), `productName`,
`priceCents`, and (for `price_update` only) `previousPriceCents` — same
"snapshot vs. live-reference" reasoning as `OrderItem` vs. `WishlistItem`,
so a digest's history stays accurate even if the product's price changes
again afterward, or the product is deleted (`productId` is nullable,
`SetNull`). **As of Sprint 6**, `sendDigest()` re-derives live candidates
rather than reading these snapshot rows back — see §2.22.2 for why.

### 4.7c `ActivityLog` (new in Sprint 3.5)

A small, generic activity feed backing the Analytics Dashboard's "Recent
Activity" section (§2.19) — deliberately **not** a full audit log (no
before/after diffing, no actor tracking, since there's only ever one
admin).

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `type` | `String` | `"product_added"` \| `"price_updated"` \| `"order_submitted"` \| `"wishlist_added"` |
| `message` | `String` | Short human-readable line, e.g. "Midori Notebook price changed to $12.50" |
| `productId` | `String?` | Plain nullable string, deliberately **not** an FK/cascade — a deleted product never needs its history rewritten or removed |
| `createdAt` | `DateTime` | Auto-set |

Fed by exactly four insert points, each wrapped in `.catch(() => {})` so a
logging failure never blocks the real write it's attached to:
`createProduct` (`product_added`), `updateProduct` — only when
`priceCents` actually changes (`price_updated`), `submitPreOrder`
(`order_submitted`), and `toggleWishlistItem`'s create branch
(`wishlist_added` — see §2.19's Recent Activity note for the one known gap
this last trigger point has).

### 4.7d `EventPage` (new in Sprint 4)

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `slug` | `String` | `@unique` — e.g. `"how-to-preorder"`. Validated against `RESERVED_SLUGS`/`PROTECTED_SLUGS` in `src/lib/validations/event-page.ts` (§2.20.2) |
| `title` | `String` | Shown as the page's `<h1>` and in the admin Page List |
| `sortOrder` | `Int` | Default `0` — admin Page List display order |
| `createdAt` / `updatedAt` | `DateTime` | Auto-managed |
| `sections` | `PageSection[]` | One-to-many, cascade on delete |

### 4.7e `PageSection` (new in Sprint 4)

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `pageId` | `String` | FK → `EventPage.id`, `onDelete: Cascade` |
| `type` | `String` | `"text"` \| `"image"` \| `"gallery"` \| `"button"` \| `"divider"` — open string, not an enum, same reasoning as `ActivityLog.type`/`Product.status` (§2.20.1) |
| `data` | `Json` | Per-type shape, validated at the application boundary (§2.20.4) — Prisma's native `Json` type, parsed/serialized automatically by Prisma Client |
| `sortOrder` | `Int` | Default `0` — the section's position on the page |
| `createdAt` / `updatedAt` | `DateTime` | Auto-managed |

### 4.7f `OrderHistoryEntry` (new in Sprint 5)

One row per meaningful change to a `PreOrder` after it's created — feeds
both the Self-Service Portal's customer-facing Order Timeline (§2.21,
collapsed to "Order Created" / "Updated" × N / "Current Version") and the
admin Order History (§2.11, full detail per row). Same "small generic
feed, not a full audit log" shape and reasoning as Sprint 3.5's
`ActivityLog`, just scoped to one order instead of being a site-wide
feed.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `preOrderId` | `String` | FK → `PreOrder.id`, `onDelete: Cascade` |
| `type` | `String` | `"order_created"` \| `"product_added"` \| `"product_removed"` \| `"variant_changed"` \| `"quantity_changed"` \| `"shipping_address_updated"` \| `"billing_address_updated"` \| `"customer_info_updated"` \| `"notification_preferences_updated"` — see `ORDER_HISTORY_TYPES` in `src/lib/validations/order-history.ts` |
| `message` | `String` | Short, human-readable line, e.g. "Bear Notebook removed" |
| `createdAt` | `DateTime` | Auto-set |

Written by every mutation in `src/app/edit/[token]/actions.ts` on
success, plus one insert in `submitPreOrder` (`order_created`) so the
timeline has a real starting point from day one. An order placed before
this sprint has no `order_created` row at all — its Timeline/History
simply start from whatever the first change after Sprint 5 happens to be
(the Timeline component keys its "Order Created" label off the entry's
real `type`, not its position, specifically to handle this correctly —
see §2.21).

### 4.7g `EmailLog` (new in Sprint 6)

The Email Queue every real send goes through — see §2.22.1 for the full
"Queue → Worker → Resend" mechanics.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `to` / `subject` / `html` | `String` | The exact email actually sent (or attempted) |
| `template` | `String` | `"confirmation"` \| `"edit_link"` \| `"reminder"` \| `"digest"` |
| `status` | `String` | Default `"pending"` — `"pending"` \| `"sending"` \| `"sent"` \| `"failed"` |
| `provider` | `String?` | Which `EmailService` driver actually handled the attempt — `"resend"` \| `"console"` |
| `providerMessageId` | `String?` | The provider's own id for a successful send |
| `errorMessage` | `String?` | Set on `"failed"` — the real error, shown in Email Logs (§2.22.4) |
| `attempts` | `Int` | Default `0`, incremented every time `processEmailLog` runs (a fresh send, a Retry click, or a cron sweep retry all increment this) |
| `preOrderId` | `String?` | FK → `PreOrder.id`, `SetNull` — nullable so a log row survives its order being deleted |
| `digestId` | `String?` | FK → `EmailDigest.id`, `SetNull` — set only for `template: "digest"` rows |
| `createdAt` / `sentAt` | `DateTime` / `DateTime?` | `createdAt` is when it was queued; `sentAt` is set only on success |

Indexed on `status` (the cron sweep's stuck-row query, §2.22.6) and
`[template, sentAt]` (the Notification Dashboard's Reminder History
grouping, §2.22.5).

### 4.7h `EmailTemplate` / `EmailTemplateSection` (new post-Sprint-6)

The Email Template Manager's data model — see §2.23.1 for the full
reasoning, structurally identical to `EventPage`/`PageSection` (§4.7d/e).

**`EmailTemplate`**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `kind` | `String` | `@unique` — `"confirmation"` \| `"edit_link"` \| `"reminder"` \| `"digest"` |
| `subject` | `String` | May include a kind-specific placeholder (`{{order_number}}` for Confirmation) — substituted by that kind's own data builder |
| `sections` | `EmailTemplateSection[]` | Ordered by `sortOrder` |

**`EmailTemplateSection`**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `templateId` | `String` | FK → `EmailTemplate.id`, `onDelete: Cascade` |
| `type` | `String` | `"hero_banner"` \| `"greeting"` \| `"rich_text"` \| `"image"` \| `"collection_cards"` \| `"product_cards"` \| `"cta_button"` \| `"footer"` \| `"countdown"` |
| `show` | `Boolean` | Default `true` — the admin ☑/☐ toggle; a hidden section stays in the list but is skipped by `resolveTemplateSections()` |
| `sortOrder` | `Int` | Default `0` |
| `data` | `Json` | Per-type shape, validated at the application boundary (not by the DB) — same precedent as `PageSection.data` |

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
**Sprint 3.5** was additive again: two new columns on `Product`
(`variantGroupName`, `purchaseStatus`), one new `ProductVariant` table,
one new nullable `variantId` column each on `WishlistItem`/`OrderItem`
(plus `OrderItem.variantName`), and one new `ActivityLog` table —
`prisma migrate dev` applied cleanly on the first attempt, preserving all
existing data. **Sprint 4** added two brand-new tables (`EventPage`,
`PageSection`) with no columns on any existing table at all — the
simplest possible additive shape, `prisma migrate dev` applied cleanly on
the first attempt. **Sprint 5** added three `Boolean` columns on
`PreOrder` plus one new table (`OrderHistoryEntry`) — additive again,
applied cleanly on the first attempt, no data loss. **Sprint 6** added
one `Boolean` column on `EmailDigest` (`showSoldOut`), one nullable
`String` column on `Product` (`lastNotifiedStatus`), one nullable
`DateTime` column on `SiteSettings` (`reminderBatchSentAt`), and one new
table (`EmailLog`) — additive again, applied cleanly on the first
attempt, no data loss.

### 4.9 Entity relationships

```
Product ──(many-to-many)── Tag
Product ──(one-to-many, cascade on delete)── ProductImage
Product ──(one-to-many, cascade on delete)── ProductVariant
Product ──(one-to-many, optional FK, SetNull on delete)── OrderItem
Product ──(one-to-many, cascade on delete)── WishlistItem
Product ──(one-to-many, optional FK, SetNull on delete)── EmailDigestItem
ProductVariant ──(one-to-many, optional FK, SetNull on delete)── OrderItem
ProductVariant ──(one-to-many, optional FK, SetNull on delete)── WishlistItem
PreOrder ──(one-to-many, cascade on delete)── OrderItem
PreOrder ──(one-to-many, cascade on delete)── WishlistItem
PreOrder ──(one-to-many, cascade on delete)── OrderHistoryEntry
PreOrder ──(many-to-many)── EmailDigest (recipients)
EmailDigest ──(one-to-many, cascade on delete)── EmailDigestItem
EventPage ──(one-to-many, cascade on delete)── PageSection
EmailTemplate ──(one-to-many, cascade on delete)── EmailTemplateSection
HeroBanner, SiteSettings, OrderSequence, ActivityLog — standalone, no FKs
  (ActivityLog.productId is a plain nullable string, not a real FK)
```

`Product`'s and `Tag`'s former many-to-many relations to `EmailDigest`
(`recommendedProducts`/`collections`) are gone post-Sprint-6 — that
content now lives as plain `productIds`/`collectionIds` arrays inside
`EmailTemplate("digest")`'s `product_cards`/`collection_cards` sections'
`data` (§2.23.1, §4.7h), not as a database relation.

Still no `User`/`Customer`/`Account` table — the admin identity remains a
single shared password in an environment variable, and the cart remains
entirely client-side. The wishlist is client-side until a customer's first
pre-order submission, then lives in the database attached to that
`PreOrder` (§2.3/§4.7a) — deliberately not a new `Customer` entity, so
"accountless" still holds even once wishlist data is durable.

---

## 5. API Structure

Every write is still a Next.js Server Action. **As of Sprint 6**, one
conventional API route exists — `src/app/api/cron/emails/route.ts`, this
project's first `src/app/api/` file, a `GET` handler for Vercel Cron
(§2.22.6), not a Server Action and not reachable by the browser app
itself. Everything else below remains a Server Action.

| Action | File | Auth | Behavior |
|---|---|---|---|
| `loginAction` | `admin/login/actions.ts` | None | Verifies password, sets session cookie |
| `logoutAction` | `admin/(protected)/actions.ts` | Admin session (via layout) | Clears session cookie |
| `createProduct` / `updateProduct` / `deleteProduct` | `admin/(protected)/products/actions.ts` | `requireAdmin()` | Product CRUD, now including multi-image resolution (§2.8) and variant-row resolution (§2.17) — also feeds `ActivityLog` (`product_added`, and `price_updated` when `priceCents` actually changes). **As of Sprint 6**, `updateProduct` also clears `Product.lastNotifiedStatus` back to `null` whenever `status` is saved as anything other than `"sold_out"` (§2.22.3) |
| `createBanner` / `updateBanner` / `deleteBanner` | `admin/(protected)/banners/actions.ts` | `requireAdmin()` | Banner CRUD, enforces the 5-banner cap on create |
| `toggleBannerActive` | same file | `requireAdmin()` | Single-field enable/disable, used by the drag-list's inline toggle |
| `reorderBanners` | same file | `requireAdmin()` | Batch `sortOrder` update from a drag-and-drop reorder |
| `updateSiteSettings` | `admin/(protected)/settings/actions.ts` | `requireAdmin()` | Upserts the `SiteSettings` singleton, now including `preorderInfoHtml`. **As of Sprint 6**, also resets `reminderBatchSentAt` back to `null` whenever `countdownTargetAt` itself changes, re-arming the Reminder Email guard (§2.22.6) |
| `updatePreOrderStatus` | `admin/(protected)/preorders/actions.ts` | `requireAdmin()` | Updates `PreOrder.status` |
| `submitPreOrder` | `app/order/actions.ts` | None (public) | Validates, **new post-Sprint-6** — rejects the submission (a field error on Email) if any non-`cancelled` `PreOrder` already exists for that exact email address, pointing the customer at My Pre-order instead (§2.2) — re-fetches products **and variants** server-side, generates the next sequential order number and a secure `editToken`, creates the order (snapshotting each item's variant, §2.17) + wishlist migration (§2.3), sets the `shokakko_preorder_token` cookie, feeds `ActivityLog` (`order_submitted`) and — **new in Sprint 5** — `OrderHistoryEntry` (`order_created`) — and **new in Sprint 6** — a best-effort automatic Confirmation Email via `sendTrackedEmail` (§2.22.2) |
| `toggleWishlistItem` | `components/wishlist/actions.ts` | None (public — scoped by the caller's cookie-derived token, not a login) | **New in Sprint 2**, extended in Sprint 3.5 with an optional `variantId` parameter. Looks up the `PreOrder` by `editToken`, no-ops silently if not found, otherwise creates/deletes the matching `WishlistItem` row (validating the variant actually belongs to the product first) and, on create, feeds `ActivityLog` (`wishlist_added`, §2.19). Called by `WishlistContext` once a wishlist is in linked mode (§2.3), and — **new in Sprint 5** — reused directly by the Self-Service Portal's wishlist Remove button (§2.21), no wrapper needed |
| `generateEmail` | `admin/(protected)/emails/actions.ts` | `requireAdmin()` | **New in Sprint 3, simplified post-Sprint-6.** No longer parses a form — there's no structural input left to submit. Computes/snapshots New Products + Price Updates + Sold Out into `EmailDigestItem`, resolves the current `EmailTemplate("digest")` via `resolveTemplateSections()` (§2.23.2), renders + saves `renderedHtml` (§2.16.3) |
| `sendDigest` | same file | `requireAdmin()` | **New in Sprint 6, personalization rebuilt post-Sprint-6.** Requires a `generated` draft, loops every non-unsubscribed recipient, resolves `"digest"` sections per recipient with `excludeProductSources` set from that recipient's `notifyNewProducts`/`notifyPriceUpdates` prefs (§2.23.2), skips recipients whose resolved sections carry no content, sends via `sendTrackedEmail`, then advances every "mark as published" checkpoint and sets `status: "sent"` (§2.22.2) |
| `retryEmailLog` | same file | `requireAdmin()` | **New in Sprint 6.** Re-runs the Email Queue's worker step (`processEmailLog`) on one existing `EmailLog` row — the Email Logs page's Retry button (§2.22.4) |
| `updateTagImage` | `admin/(protected)/collections/actions.ts` | `requireAdmin()` | **New in Sprint 3.** Uploads/removes a `Tag`'s square Collection Card image |
| `updatePurchaseStatus` | `admin/(protected)/purchases/actions.ts` | `requireAdmin()` | **New in Sprint 3.5.** Updates `Product.purchaseStatus` or `ProductVariant.purchaseStatus` (whichever applies) for one Buying List row (§2.18) |
| `createEventPage` / `updateEventPage` / `deleteEventPage` | `admin/(protected)/event-pages/actions.ts` | `requireAdmin()` | **New in Sprint 4.** `EventPage` CRUD — slug uniqueness/reserved-word checks on create, slug locked + delete refused for `PROTECTED_SLUGS` (§2.20.2) |
| `addSection` / `deleteSection` / `duplicateSection` / `reorderSections` | same file | `requireAdmin()` | **New in Sprint 4.** Section list management — `reorderSections` mirrors `reorderBanners`' one-`$transaction`-of-index-updates shape exactly (§2.20.3) |
| `updateTextSection` / `updateImageSection` / `updateGallerySection` / `updateButtonSection` | same file | `requireAdmin()` | **New in Sprint 4.** One dedicated, per-type-validated action per section type — image/gallery variants upload via `storage.save`, run new files through `compressImageFile` (§2.20.4) |
| `findOrCreateTemplate` / `updateTemplateSubject` | `admin/(protected)/emails/templates/actions.ts` | `requireAdmin()` | **New post-Sprint-6.** `EmailTemplate` lookup-or-create by `kind`, and its subject-line editor (§2.23.3) |
| `addSection` / `deleteSection` / `duplicateSection` / `reorderSections` / `toggleSectionShow` | same file | `requireAdmin()` | **New post-Sprint-6.** Mirrors Event Pages' section-list actions above exactly, plus `toggleSectionShow` for the ☑ Show / ☐ Hide pill — `deleteSection` also cleans up any uploaded image for `hero_banner`/`image` sections (§2.23.3) |
| `updateHeroBannerSection` / `updateRichTextSection` / `updateImageSection` / `updateCollectionCardsSection` / `updateProductCardsSection` / `updateCtaButtonSection` | same file | `requireAdmin()` | **New post-Sprint-6.** One dedicated, per-type-validated action per `EmailTemplateSection` type — `greeting`/`footer`/`countdown` sections have nothing to save, so no action exists for them (§2.23.3) |
| `requestEditLink` | `app/my-preorders/actions.ts` | None (public) | **New in Sprint 5.** Looks up the most recent `PreOrder` by email, sends the Edit Link Email if found via `sendTrackedEmail` (**as of Sprint 6** — was the raw `EmailService` through Sprint 5) — always returns the identical message regardless of outcome (§2.6) |
| `linkBrowserToOrder` | `app/edit/[token]/actions.ts` | None (public — token-scoped, same bearer model as `toggleWishlistItem`) | **New in Sprint 5.** Called once on mount by `LinkBrowserOnMount.tsx`; sets the `shokakko_preorder_token` cookie so this browser's `WishlistContext` switches into linked mode against this order (§2.21) |
| `updateOrderItemQuantity` / `updateOrderItemVariant` / `removeOrderItem` | same file | None (public, token-scoped) | **New in Sprint 5.** Re-fetches live product/variant data server-side on every change (never trusts client price/name data); each logs one `OrderHistoryEntry` |
| `moveWishlistItemToOrder` | same file | None (public, token-scoped) | **New in Sprint 5.** Increments a matching existing `OrderItem` or creates one (same snapshot shape as `submitPreOrder`), then deletes the `WishlistItem` |
| `updateCustomerInfo` | same file | None (public, token-scoped) | **New in Sprint 5.** Validates via `orderFormSchema.omit({ shippingMethod: true })`; diffs old vs. new to log the specific `OrderHistoryEntry` type(s) that actually changed |
| `updateNotificationPreference` | same file | None (public, token-scoped) | **New in Sprint 5.** Saves one of the three notification boolean columns the instant its checkbox is toggled |

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
│   ├── my-preorders/               Real as of Sprint 5 (§2.6):
│   │   ├── page.tsx                  Email-lookup form + <Footer />
│   │   ├── actions.ts                requestEditLink — same message regardless of outcome
│   │   └── RequestEditLinkForm.tsx   Client, useActionState
│   ├── edit/[token]/               NEW (Sprint 5) — the Self-Service Portal (§2.21):
│   │   ├── page.tsx                  Fetches PreOrder by editToken; friendly message
│   │   │                             (not a bare 404) if the token doesn't match
│   │   ├── actions.ts                Every mutation — quantity/variant/remove,
│   │   │                             move-wishlist-to-order, customer info,
│   │   │                             notification preferences, linkBrowserToOrder
│   │   ├── LinkBrowserOnMount.tsx    Mirrors cart/ClearCartOnMount.tsx's exact shape
│   │   ├── OrderItemsSection.tsx     VariantPills/QuantitySelector reused as-is
│   │   ├── WishlistSection.tsx       Remove reuses toggleWishlistItem directly
│   │   ├── CustomerInfoForm.tsx      Own Save Changes button + inline confirmation
│   │   ├── NotificationPreferences.tsx  Instant-save per checkbox
│   │   └── OrderTimeline.tsx         Order Created / Updated x N / Current Version
│   ├── order/
│   │   ├── actions.ts               submitPreOrder: + editToken generation, wishlist
│   │   │                             migration, sets shokakko_preorder_token cookie,
│   │   │                             + OrderHistoryEntry (order_created) (Sprint 5)
│   │   └── [orderNumber]/page.tsx   Confirmation + ClearCartOnMount, <Footer />,
│   │                                 + Edit My Pre-order card — a real link as of
│   │                                 Sprint 5, was inert text through Sprint 4 (§2.5)
│   ├── collections/
│   │   ├── page.tsx                 NEW (Sprint 3) — index of every collection
│   │   └── [id]/page.tsx            NEW (Sprint 3) — one collection's products,
│   │                                 reuses components/catalog/ProductCard
│   ├── unsubscribe/[token]/page.tsx NEW (Sprint 3) — sets PreOrder.unsubscribedAt
│   │                                 directly (§5's Server Action exception)
│   ├── [slug]/page.tsx            NEW (Sprint 4) — the Event Pages CMS's single
│   │                                 catch-all route, serves every EventPage (§2.20.6)
│   └── admin/
│       ├── login/                 Unchanged
│       └── (protected)/
│           ├── layout.tsx           Nav includes Banners/Collections/Emails/
│           │                         Purchases/Analytics/Event Pages/Settings (Sprint 4)
│           ├── products/            Extended: type/status, ProductImageManager,
│           │                         + isNew "Mark as New" checkbox (Sprint 3);
│           │                         + ProductVariantManager.tsx (Sprint 3.5, §2.17)
│           ├── banners/             list/new/[id]/actions/BannerForm/BannerList
│           ├── collections/         NEW (Sprint 3) — Tag list + TagImageForm.tsx
│           ├── purchases/           NEW (Sprint 3.5) — page.tsx, PurchaseBuyingList.tsx,
│           │                         actions.ts (updatePurchaseStatus) — §2.18
│           ├── analytics/           NEW (Sprint 3.5) — page.tsx, read-only (§2.19)
│           ├── event-pages/         NEW (Sprint 4) — the Event Pages CMS admin:
│           │   ├── page.tsx           Page List, upserts the two seeded pages (§2.20.2)
│           │   ├── new/page.tsx       Add Page form
│           │   ├── [id]/page.tsx      Page Builder — title/slug form + section list
│           │   ├── actions.ts         Page + section CRUD (§5)
│           │   ├── EventPageForm.tsx, PageSectionList.tsx, SectionCard.tsx
│           │   ├── TextSectionEditor.tsx, ImageSectionEditor.tsx,
│           │   │   GallerySectionEditor.tsx, ButtonSectionEditor.tsx
│           │   └── EventSectionRichTextEditor.tsx  Wider Tiptap editor (§2.20.4)
│           ├── emails/              NEW (Sprint 3), simplified post-Sprint-6 —
│           │   │                     Notification Centre, purely operational now:
│           │   ├── page.tsx           live preview + Generate Email / Send Update
│           │   ├── NotificationCentreForm.tsx   No more toggles/Karen's Notes/CTA fields
│           │   ├── actions.ts         findOrCreateCurrentDraft, generateEmail, sendDigest
│           │   ├── history/           past digests list + [id] read-only detail
│           │   ├── logs/, dashboard/  Unchanged (§2.22.4/2.22.5)
│           │   └── templates/         NEW post-Sprint-6 — Email Template Manager (§2.23.3):
│           │       ├── page.tsx         4 kind cards (confirmation/edit_link/reminder/digest)
│           │       ├── [kind]/page.tsx  Section editor + live preview (replaces the
│           │       │                     retired confirmation/ and reminder/ preview pages)
│           │       ├── actions.ts       Template + section CRUD, one update*Section
│           │       │                     action per type, toggleSectionShow
│           │       ├── EmailTemplateSectionList.tsx, EmailSectionCard.tsx
│           │       └── HeroBannerSectionEditor.tsx, RichTextSectionEditor.tsx,
│           │           ImageSectionEditor.tsx, CollectionCardsSectionEditor.tsx,
│           │           ProductCardsSectionEditor.tsx, CTAButtonSectionEditor.tsx,
│           │           TemplateSubjectForm.tsx
│           ├── settings/            + PreorderInfoEditor.tsx (Tiptap);
│           │                         + Email settings section (Sprint 3)
│           └── preorders/           + shows a "{Variant group}: {Variant}" line
│                                     per item when present (Sprint 3.5, §2.17);
│                                     + Order History card, [id]/page.tsx (Sprint 5, §2.11)
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
│   │   └── Footer.tsx               + How to Pre-order / About the Event links (Sprint 4)
│   ├── event-pages/
│   │   └── SectionRenderer.tsx      NEW (Sprint 4) — renders text/image/gallery/
│   │                                 button/divider sections (§2.20.5)
│   ├── home/
│   │   ├── HeroCarousel.tsx         Responsive picture-based rotation
│   │   ├── EventPageNavPills.tsx    NEW (Sprint 4) — the two homepage nav pills (§2.20.7)
│   │   └── EventInfoStrip.tsx       Event info + live countdown
│   ├── cart/
│   │   ├── CartContext.tsx          localStorage-persisted cart state;
│   │   │                             Sprint 3.5 — composite `${productId}::${variantId}`
│   │   │                             keys, buildCartKey/parseCartKey exported (§2.17)
│   │   ├── CartDrawer.tsx           + resolves each line's variant for display (Sprint 3.5)
│   │   └── ClearCartOnMount.tsx
│   ├── wishlist/
│   │   ├── WishlistContext.tsx      Sprint 2 — dual-mode (local/linked); public
│   │   │                             API unchanged, so every consumer below is
│   │   │                             unaffected by the mode switch; Sprint 3.5 —
│   │   │                             has()/toggle() take an optional variantId (§2.3)
│   │   ├── WishlistDrawer.tsx       Sprint 2 — bottom-sheet on mobile, Brand +
│   │   │                             live Product Status per row, "Move to
│   │   │                             Pre-order" (was "Add to cart"); Sprint 3.5 —
│   │   │                             resolves each line's variant for display
│   │   └── actions.ts               NEW (Sprint 2) — toggleWishlistItem Server Action;
│   │                                  Sprint 3.5 — optional variantId param + ActivityLog insert
│   └── catalog/
│       ├── types.ts                  CatalogProduct: images[]/type/status replace imageUrl/isActive;
│       │                              + variantGroupName/variants (Sprint 3.5)
│       ├── ProductCard.tsx           No tag badges; links to /product/[id]; "Price Coming Soon";
│       │                              Sprint 3.5 — no SKU/estimated arrival; "View Options"
│       │                              button in place of heart+stepper on a variant product (§2.1)
│       ├── VariantPills.tsx          NEW (Sprint 3.5) — filled/outline pill selector (§2.17)
│       ├── ProductBrowser.tsx        Owns search/sort/filter state, renders the
│       │                              grid; + wishlistOnly filter condition (Sprint 2)
│       ├── ProductToolbar.tsx        Search + sort
│       ├── FilterGroups.tsx          The filter checkboxes/inputs;
│       │                              + "♡ Wishlist" checkbox (Sprint 2)
│       ├── FilterSidebar.tsx         Desktop wrapper around FilterGroups
│       ├── FilterDrawer.tsx          Mobile wrapper (uses Drawer)
│       ├── PreOrderFormFields.tsx    Extracted from the old OrderForm; restructured
│       │                              for First/Last name + structured address +
│       │                              shipping method (Checkout & Logo Polish pass)
│       └── QuantitySelector.tsx      Extended with a `size` prop (sm/md)
├── SiteLogo.tsx                    NEW (Checkout & Logo Polish pass) — shared
│                                     homepage/checkout/compact logo presets (§2.1)
└── lib/
    ├── db.ts, auth.ts, session.ts    Unchanged
    ├── order-number.ts               Sequential PO#### generator
    ├── edit-token.ts                 NEW (Sprint 2) — generateEditToken() via nanoid
    ├── wishlist.ts                   NEW (Sprint 2) — getLinkedWishlist(token), the
    │                                  shokakko_preorder_token cookie name/TTL constants;
    │                                  Sprint 3.5 — returns composite variant-aware keys
    ├── catalog.ts                    Shared Prisma-row → CatalogProduct mapper;
    │                                  + variants mapping (Sprint 3.5)
    ├── storage/                      Unchanged interface, more call sites
    ├── email/                        NEW (Sprint 3) — see §2.16; templates
    │   │                              generalized post-Sprint-6, see §2.23
    │   ├── types.ts, console.ts, index.ts   EmailService interface + no-op driver
    │   ├── site-url.ts               Absolute-URL helpers (edit/product/
    │   │                              collection/unsubscribe links, footer links)
    │   ├── first-name.ts             getFirstName()
    │   ├── render.ts                 Collapsed post-Sprint-6 to one function,
    │   │                              renderGenericEmail(data: GenericEmailData)
    │   ├── components/                The 9-component Email Design System +
    │   │   │                          brand.ts, ResponsiveCardGrid, EmailLayout
    │   │   ├── Header.tsx, HeroBanner.tsx, Greeting.tsx, KarenNotes.tsx
    │   │   ├── EmailImage.tsx         NEW post-Sprint-6 — a standalone `image` section
    │   │   ├── CollectionCard.tsx, ProductCard.tsx, CTAButton.tsx, Footer.tsx
    │   │   └── ResponsiveCardGrid.tsx, EmailLayout.tsx, brand.ts
    │   ├── data/                      Business-logic layer — Prisma rows → plain props
    │   │   ├── generic.ts             NEW post-Sprint-6 — the shared section-resolution
    │   │   │                          engine, resolveTemplateSections() (§2.23.2); every
    │   │   │                          builder below ends by calling into this
    │   │   ├── confirmation.ts, edit-link.ts, reminder.ts   Thin per-kind wrappers —
    │   │   │                          fetch this kind's own data, call generic.ts
    │   │   └── update.ts              Trimmed post-Sprint-6 — buildUpdateEmailData()
    │   │                              removed; keeps + exports toProductCardData/
    │   │                              toCollectionCardData and the New/Price/SoldOut
    │   │                              candidate computers, now called from generic.ts
    │   └── templates/                 Presentation layer — compose the Design System
    │       ├── GenericEmail.tsx       NEW post-Sprint-6 — replaces the 4 fixed
    │       │                          template files (§2.23.1); switches on each
    │       │                          resolved section's type
    │       └── OrderSummary.tsx, Countdown.tsx   (bound to one data shape, not shared —
    │                                  OrderSummary now renders each item's selected
    │                                  options via getOrderItemOptions(), §2.23.4)
    └── validations/
        ├── product.ts                 type/status; PRODUCT_STATUSES union;
        │                               + isNew field (Sprint 3);
        │                               + variantGroupName field (Sprint 3.5)
        ├── variant.ts                  NEW (Sprint 3.5) — variantFormSchema/
        │                               variantsFormSchema (§2.17)
        ├── purchase.ts                 NEW (Sprint 3.5) — PURCHASE_STATUSES,
        │                               PURCHASE_STATUS_LABELS (§2.18)
        ├── order.ts                   generateOrderNumber() removed (superseded);
        │                               restructured for First/Last name +
        │                               structured address (Checkout & Logo Polish pass);
        │                               orderFormSchema reused as-is by the Self-
        │                               Service Portal via .omit({shippingMethod}) (Sprint 5)
        ├── banner.ts
        ├── settings.ts                + preorderInfoHtml field;
        │                               + email settings fields (Sprint 3)
        ├── event-page.ts              NEW (Sprint 4) — SECTION_TYPES, RESERVED_SLUGS,
        │                               PROTECTED_SLUGS, slugSchema, eventPageFormSchema,
        │                               per-section-type data schemas (§2.20)
        ├── email-template.ts          NEW post-Sprint-6, replaces the removed
        │                               email-digest.ts — EMAIL_KINDS, EMAIL_SECTION_TYPES,
        │                               per-section-type data schemas, PRODUCT_CARDS_SOURCES,
        │                               EDIT_URL_PLACEHOLDER (§2.23.1)
        ├── order-history.ts           NEW (Sprint 5) — ORDER_HISTORY_TYPES,
        │                               ORDER_HISTORY_TYPE_LABELS (§2.11, §2.21)
        ├── edit-link.ts                NEW (Sprint 5) — requestEditLinkSchema (§2.6)
        └── utils.ts                   Unchanged
```

**Removed in Sprint 1**: `components/catalog/OrderSheet.tsx`,
`CartBar.tsx`, `TagFilter.tsx`, `OrderForm.tsx` — all superseded by the
components listed above. Nothing was removed in the UI Refinement Pass,
Sprint 2, Sprint 3, or Sprint 3.5 — every change across all four was
additive or in-place (Sprint 3.5's homepage card simplification, §2.1,
removed *fields from a card's display*, not a component).

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
package was added this sprint — `EmailService` (§2.16.4) had exactly one
implementation, a console-logging no-op. **Resolved in Sprint 6** — see
below.

**Sprint 3.5 added zero new dependencies.** Variant pills, the composite
cart/wishlist keying, CSV export, and print styles are all built from
framework/browser primitives already established elsewhere in this
codebase: `useState` (pills, same pattern as every other client toggle),
`Blob`/`URL.createObjectURL`/a temporary `<a download>` (CSV, the standard
vanilla approach — no CSV precedent existed anywhere in the codebase
before this sprint), `window.print()` + a `@media print` CSS block (first
one in the project), and Tailwind's built-in `print:` variant.

**Sprint 4 added four new packages, all extending the already-justified
Tiptap exception** (originally adopted in the UI Refinement Pass, §13) —
not a new dependency decision: `@tiptap/extension-table`,
`@tiptap/extension-text-style`, `@tiptap/extension-color`,
`@tiptap/extension-text-align`. All four are official first-party Tiptap
packages, same major version line as the already-installed
`@tiptap/react`/`@tiptap/starter-kit`. (`@tiptap/extension-table` already
bundles `TableRow`/`TableCell`/`TableHeader` internally, so the
equivalent standalone packages were never added — kept the dependency
list to exactly what's actually imported.) Everything else this sprint —
drag-reorder, the emoji picker, the responsive gallery grid, the
`display: block; overflow-x: auto` table-scroll technique — uses only
framework/browser primitives already established elsewhere in this
codebase.

**Sprint 5 added zero new dependencies** — the entire Self-Service Portal
(the linking mechanism, the customer-info form, the Order Timeline) reuses
existing primitives and existing components (`VariantPills`,
`QuantitySelector`, `orderFormSchema`) exactly as they already were.

**Sprint 6 added one new dependency**: [`resend`](https://resend.com/docs)
(the official Node SDK), for `resendEmailService` (§2.16.4, §2.22.1) — the
first real email-sending package this project has ever installed. The
`Resend` client is constructed lazily inside `send()`, not at module load,
since `src/lib/email/resend.ts` is imported unconditionally by the driver
selector regardless of which driver is active, and the SDK throws
immediately if constructed without an API key — which would otherwise
break every build/dev run that doesn't set `RESEND_API_KEY`. No queue/cron
package was added either — the Email Queue (§2.22.1) and the cron sweep
(§2.22.6) are both built from Prisma + a plain Next.js Route Handler +
Vercel's own Cron feature, not a new dependency.

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
`EMAIL_DRIVER` (defaults to `"console"` — logs instead of sending, still
the local-dev default as of Sprint 6). **Sprint 6 adds three more**, all
required only when `EMAIL_DRIVER="resend"` (or, for `CRON_SECRET`, to
authorize the cron route regardless of driver): `RESEND_API_KEY` (from
the Resend dashboard), `EMAIL_FROM` (a verified Resend sender address,
e.g. `"Shokakko Australia <preorders@shokakko.com.au>"`), and
`CRON_SECRET` (protects `src/app/api/cron/emails/route.ts` — Vercel sends
it automatically as a bearer token once both this var and a `vercel.json`
cron entry exist) (see `.env.example`).

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

**New in Sprint 5**:

- **"Send Me My Edit Link" (`/my-preorders`) has no rate limiting** — the
  same unaddressed gap this document already documents for the admin
  login and the checkout form (this section's opening paragraph), now
  also true of a second public, unauthenticated form. Its own design
  correctly never reveals whether a given email has an order (§2.6), but
  nothing stops repeated submissions from the same source.
- **Every Self-Service Portal mutation trusts the `editToken` alone** —
  same bearer-token model `toggleWishlistItem` already established
  (§17's **Edit Token** entry), extended to a much larger surface (order
  item edits, customer info, notification preferences). Not a new class
  of risk beyond what that model already accepts, but worth naming
  explicitly now that the token guards real order mutations, not just a
  wishlist toggle.

**New in Sprint 6**:

- **`src/app/api/cron/emails/route.ts` is protected by a single static
  bearer token** (`CRON_SECRET`) compared with `!==`, not a
  constant-time comparison — same class of gap this document already
  notes for the admin password check (this section's opening paragraph).
  Low real-world risk given the route only sends emails and retries
  queued rows (no data exposure, no destructive action), but worth
  naming since it's this project's first genuinely public API endpoint.
- **The cron route has no rate limiting either** — anyone who obtains
  (or guesses) `CRON_SECRET` could trigger it repeatedly; the worst
  outcome is duplicate reminder-sweep attempts, which the
  `reminderBatchSentAt` guard (§2.22.6) already makes safe to repeat.
- **`EmailLog.html` stores the full rendered email body**, including
  every recipient's name/address/order details baked into that HTML —
  this is necessary for Retry to work (§2.22.1) but means Email Logs
  (an admin-only page) is now a second place, beyond the `PreOrder`
  table itself, holding customer PII. No new exposure surface (admin
  session required, same as every other admin page), just worth naming.

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
exists** (Milestone 1) — no longer a known issue. **"No email is ever
actually sent" is resolved as of Sprint 6** (§2.22) — see items 13/15/16/
24 below, all now struck through, and the new items under "New or
changed in Sprint 6." New or changed this sprint:

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

13. ~~**No email is ever actually sent**~~ — **resolved in Sprint 6**
    (§2.22.1) via `resendEmailService`. Kept here, struck through, for
    the historical record and because §17's cross-references still point
    at this item number.
14. **Confirmation and Reminder are placeholder layouts** — no Canva
    design has been shared yet, per your explicit Sprint 3 answer. Their
    dynamic-field plumbing (customer name, order number, countdown, edit
    link) is complete and won't need to change once a real design arrives
    — only the template/component files will.
15. ~~**Email history effectively shows one growing entry, not many**~~ —
    **resolved in Sprint 6**: Send Update sets `status: "sent"`, and each
    sent digest becomes its own immutable history row (§2.22.2).
16. ~~**Price Updates only detects a change once, then goes quiet**~~ —
    **resolved in Sprint 6**: the baseline now advances at real Send
    time, not at Generate time (§2.22.2), so Generate can be re-clicked
    freely without consuming the diff it's only meant to preview.
17. **`/unsubscribe/[token]` performs a write on a GET request** — the
    one exception to this app's Server-Actions-only mutation pattern,
    unavoidable for an email-client-clicked link (§5/§11).
18. **Collections aren't curated automatically** — the Newsletter's
    Collection Cards section shows only the tags an admin explicitly
    picks in the Email Template Manager (**post-Sprint-6**, was the
    Notification Centre; §2.23.3), not every tag in the database. Some seed/test data
    tags (e.g. stray lowercase duplicates from early testing) have no
    square image yet and would need one added at `/admin/collections`
    before looking right in a real send.
19. **No client-side check that an email hero/collection image is
    actually square** — same class of gap as hero banner/product photo
    dimension checks elsewhere (§14 item 2/§16); only file type/size are
    validated.

New or changed in Sprint 3.5:

20. **Recent Activity under-represents first-time wishlist adds** — a
    wishlist add made before a customer's browser is "linked" (before
    their first pre-order submission) never calls the `toggleWishlistItem`
    Server Action, so it's never logged to `ActivityLog`; only wishlist
    adds from an already-linked, returning browser show up in Recent
    Activity. The underlying wishlist **data** is unaffected — the item
    still correctly becomes a real `WishlistItem` row via the existing
    migration step at checkout, and every "Most Wishlisted" list on the
    Analytics Dashboard queries `WishlistItem` directly, not the log. A
    deliberate scope boundary (§2.19), not a bug.
21. **A product's purchase status has no bulk-update path** — the
    Purchase Dashboard's status `<select>` updates one product/variant row
    at a time; marking many rows Purchased at once (e.g. after a big
    buying pass) requires clicking through each one. See the Bulk admin
    actions idea in §16.
22. **The Buying List's "Number of Customers" relies on a cart invariant,
    not an explicit distinct-count query** — it's mathematically derived
    from `OrderItem.groupBy`'s row count for a given product+variant,
    which is only correct because the cart never allows more than one
    quantity per product+variant per single checkout (true today, and
    true for every order placed so far) — worth revisiting if that
    invariant ever changes (e.g. a future "add the same variant twice as
    separate lines" feature).

New or changed in Sprint 5:

23. **Email lookup on `/my-preorders` is case-sensitive** — matches
    exactly how the address was typed at checkout. SQLite has no
    case-insensitive collation configured on this column, and Postgres's
    `mode: "insensitive"` isn't available here — a real but low-impact
    limitation (email autofill/paste rarely changes case), documented
    rather than engineered around with a shadow normalized-email column.
24. ~~**Notification preferences don't yet change who receives
    anything**~~ — **resolved in Sprint 6**: `sendDigest()` personalizes
    New Products/Price Updates per recipient's own preferences, and the
    Reminder Email batch is gated by `notifyReminderBeforeClose` (§2.22.3,
    §2.22.6).
25. **No confirmation before a portal mutation applies** except Remove
    actions (native `window.confirm`) — a variant swap or quantity change
    saves the instant it's clicked, matching this app's established
    "instant save" convention for lists of inline controls elsewhere
    (Purchase Dashboard, Page Builder), not a gap specific to this sprint.

New or changed in Sprint 6:

26. **The cron route's bearer-token check is a plain string comparison**,
    not constant-time, and there's no rate limiting on it either (§11) —
    low real-world risk (the route only sends queued emails and retries
    failed rows; `reminderBatchSentAt` already makes repeated triggering
    safe), but worth knowing since it's this project's first genuinely
    public API endpoint.
27. **`EmailLog.html` stores the full rendered body of every email ever
    sent**, indefinitely — no retention/pruning policy exists yet. Fine
    at this app's exhibition-scale volume, but would need a cleanup job
    if this platform ran continuously for a long time.
28. **The Reminder Email runs once daily** (`vercel.json`'s `0 20 * * *`)
    because this deployment is on Vercel's Hobby plan, which rejects any
    more-frequent cron schedule at deploy time — discovered the hard way
    during this sprint's own staging rollout, when an initially-hourly
    schedule silently blocked every deployment for the project, not just
    the cron (§2.22.6). Since the eligibility check is window-based
    (≤24h away, not exact-time), every customer still gets at least 24h
    notice — in practice 24–48h depending on time-of-day. Upgrading to
    Pro would allow a tighter, closer-to-24h schedule with no code
    change, only the schedule string.
29. **No automated tests exist for any Sprint 6 trigger** (checkout →
    Confirmation, Send Update's personalization loop, the cron route) —
    same "no automated tests" gap this document already carries forward
    from PRD v1.0, now covering a larger, more failure-sensitive surface
    (real money-adjacent customer communication). Verified manually this
    sprint (console driver, one full send/receive cycle per trigger); a
    real regression suite is future work.

---

## 15. Planned Features

Concretely scoped, but explicitly deferred out of Sprint 1 by name — these
are not speculative, they were named directly in the sprint brief and then
excluded on purpose:

- ~~**The real "Retrieve My Pre-order" flow** behind `/my-preorders`~~ —
  **built in Sprint 5** (§2.6). Kept here, struck through, only so the
  cross-reference below (`EmailService`) still reads sensibly — see §2.21
  for what actually shipped.
- ~~**The `/edit/{token}` page itself**~~ — **built in Sprint 5** as the
  Self-Service Portal (§2.21).
- **CSV export of pre-orders themselves** from the admin pre-order list,
  for offline fulfillment planning — **not** built this sprint. Sprint 3.5
  added CSV export, but scoped to the Purchase Dashboard's Buying List
  (§2.18), a different export with different columns; the underlying
  `Blob`/download mechanic is generic and could be reused for a pre-order
  export later.
- ~~**A real `EmailService` driver**~~ — **built in Sprint 6** as
  `resendEmailService` (§2.16.4, §2.22.1). Confirmation now fires on
  checkout, `requestEditLink` sends for real, Reminder has a real
  automatic trigger (cron-driven, not manual — §2.22.6), and
  per-recipient personalized rendering is real, not just supported
  (§2.22.3).
- **Real Canva-designed Confirmation and Reminder templates** — Sprint 3
  shipped placeholder layouts for both; still placeholders as of this
  sprint. **Post-Sprint-6, this is now explicitly what the Email Template
  Manager was built to support** (§2.23) — swapping in a Canva visual
  layer only ever touches the Design System `components/` files (and
  possibly `GenericEmail.tsx`'s per-type switch), never the data
  builders, the resolution engine, or any Server Action. You'll share the
  Canva exports in a future sprint.
- ~~**Wishlist/Pre-order-targeted digest recipients**~~ — the
  *preference*-based half (New Products/Price Updates/Reminder,
  §2.21/§2.22.3) is **built in Sprint 6**. Still not built: narrowing
  recipients to "only customers with *this specific* product in their
  wishlist/pre-order," which would need new query logic joining
  `EmailDigestItem`'s featured products against `WishlistItem`/
  `OrderItem` — named in the original Sprint 3 brief, still future work.
- ~~**Scheduled daily digest**~~ (e.g. automatically at 6:00 PM) — the
  underlying send mechanics are real as of Sprint 6 (`sendDigest()`,
  §2.22.2) and a cron route already exists and runs regularly
  (§2.22.6), but nothing calls `sendDigest()` from the cron route today
  — "Send Update" is still an explicit admin click. Explicitly named as
  *not* to build in the Sprint 6 brief's own "Future Compatibility"
  list; see §16.

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
- **Named directly in the Sprint 3.5 brief's "Future Compatibility"
  section, explicitly not built this sprint** — kept here as a note of
  where the current schema would and wouldn't need to change:
  - *Stock Management* / *Barcode*: `ProductVariant` already has the exact
    shape these would extend — two more nullable columns (`stock: Int?`,
    `barcode: String?`), no restructuring, matching the brief's explicit
    "(Future)" marking on both (§2.17/§4.1a).
  - *Supplier Management* / *Purchase Cost*: neither needs a change to
    `Product`/`ProductVariant` — a future `Supplier` model and a
    `purchaseCostCents` column would sit alongside the existing purchasing
    fields without touching the customer-facing schema at all.
  - *Wholesale Portal*: like the Sprint 2 note on a Wholesale Catalogue,
    most likely a second `Product`-like surface (a flag, or a parallel
    model) rather than a change to `CartContext`/`WishlistContext` — neither
    assumes there's only one catalogue or one price per product (variant
    price overrides, §2.17, already establish that a product can have more
    than one price today).
  - *Conversion Rate*: would live as a computed metric over existing data
    (wishlist count vs. order count per product — the exact numbers the
    Analytics Dashboard's High Interest Products already computes, §2.19)
    rather than needing a new stored field.
  - *Email Analytics*: open/click tracking would need new columns on a
    sent email/recipient record — **Sprint 6's `EmailLog`** (§4.7g) is
    exactly that per-send record, already storing recipient/template/
    status/provider/timestamp; open/click tracking would add
    `openedAt`/`clickedAt` columns to it rather than needing a new table.
  - *Multiple Events*: unchanged from the Sprint 2 note already on file —
    a future `Event` model could sit between `Product` and everything else
    without reshaping `ProductVariant`/`WishlistItem`/`OrderItem`, none of
    which assume a single global "the current event."
  - **Purchase status as a plain field, not a join table** (`Product.
    purchaseStatus`/`ProductVariant.purchaseStatus`, §2.18): a deliberate
    choice this sprint to sidestep SQLite's NULL-isn't-equal-to-NULL
    unique-constraint pitfall entirely. A future purchase-order/supplier
    model could absorb this later without touching the customer-facing
    schema, since nothing customer-visible reads these two fields.
- **Named directly in the Sprint 4 brief's "Future Compatibility"
  section, explicitly not built this sprint** — every one of these is a
  new `PageSection.type` value plus a new Zod data schema, not a schema
  migration, because of the `type: String` + `data: Json` shape chosen in
  §2.20.1:
  - *Video* — a `{ url, caption? }` shape, structurally identical to the
    Image section already built.
  - *FAQ Accordion* — a `{ items: [{ question, answer }] }` shape, same
    "array of small objects" pattern the Gallery section's `images[]`
    already establishes.
  - *Countdown Timer* — could reuse `SiteSettings.countdownTargetAt`'s
    existing live-updating client component (`EventInfoStrip`'s
    countdown logic, §2.1) rather than duplicating it, with its own
    `targetAt` stored in the section's `data`.
  - *Google Map* — a `{ embedUrl }` or `{ lat, lng }` shape; rendering an
    iframe/static map needs no new backend logic.
  - *Embedded Instagram Posts* / *Embedded YouTube Videos* — a
    `{ url }` shape rendering the platform's own oEmbed/iframe embed.
  - *Product Carousel* — the one section type genuinely reaching back
    into this app's own data (a `{ productIds: string[] }` or
    `{ tagId }` shape, querying `Product` at render time) rather than
    being fully self-contained like the other five — worth noting since
    it's a different shape of complexity from the rest.
- **Named directly in the Sprint 5 brief's "Future Compatibility"
  section, explicitly not built this sprint**:
  - *Order Lock after Cut-off Date* — would most naturally be a computed
    check against `SiteSettings.countdownTargetAt` (already the same
    field the homepage countdown and Reminder Email use), gating the
    Self-Service Portal's mutation actions once the date passes, rather
    than a new stored field.
  - *Staff Notes* — a second, admin-only notes field on `PreOrder`
    (`order.notes` is customer-editable and customer-visible; a separate
    `staffNotes` column, shown only in `/admin/preorders/[id]`, would sit
    alongside it with no conflict).
  - *Order Status* — already exists (`PreOrder.status`, §4.7); if this
    meant something more granular (e.g. a fulfillment sub-status), it
    would extend, not replace, the existing field.
  - *Payment Status* / *Invoice History* — this app deliberately collects
    no payment ("no payment was taken" is shown on every order
    confirmation); either would be a genuinely new `Payment`/`Invoice`
    model with no assumptions blocking it in the current schema.
  - *Customer Messages* — a `Message` model referencing `PreOrder`, in
    the same shape as `OrderHistoryEntry` (§4.7f) but customer-authored
    instead of system-generated; that table's existence as a precedent
    for "small, `PreOrder`-scoped, append-only" data is exactly what this
    would extend.
- **Named directly in the Sprint 6 brief's "Future Compatibility"
  section, explicitly not built this sprint**:
  - *Scheduled Digest* — the cron route (§2.22.6) already runs on a
    regular schedule; a future "digest schedule" setting would just add
    a call to `sendDigest()` there once eligibility conditions are met,
    reusing the exact same function the admin's manual click already
    calls. No architectural change needed, only new trigger logic.
  - *Product-specific Notifications* ("notify me when this exact product
    is back in stock/price-drops") — would be a new join table between
    `PreOrder`/`WishlistItem` and `Product` (a "watch" row), separate
    from the three site-wide preference booleans on `PreOrder` today
    (§2.21) which are necessarily broad, not per-product.
  - *Wholesale Emails* — would need a new recipient concept alongside
    `PreOrder` (a wholesale contact isn't a pre-order), most likely
    paired with the Wholesale Portal idea already noted above (Sprint
    3.5's Future Compatibility) rather than extending `PreOrder` itself.
  - *Multi-event Communication* — `SiteSettings.reminderBatchSentAt`
    (§4.4) is a singleton guard for exactly one event's countdown, matching
    this app's existing single-event scope; a future multi-event feature
    (§16's Sprint 2/3.5 notes on an `Event` model) would move this guard
    onto a per-event row instead.

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
  `PreOrder` at submission time (§4.7). Serves three purposes: the value
  stored in the `shokakko_preorder_token` cookie (linking a browser to
  its order for wishlist purposes), the `{token}` in the `/edit/{token}`
  Self-Service Portal URL (real as of Sprint 5, §2.21), and, new in
  Sprint 3, the `{token}` in every email's `/unsubscribe/{token}` Footer
  link (§2.16.4).
- **Email Design System**: the 9 independent, reusable components
  (Header, Hero Banner, Greeting, Karen's Notes, Email Image, Collection
  Card, Product Card, CTA Button, Footer) every email is composed from
  (§2.16.1) — `src/lib/email/components/`.
- **Email Template Manager**: the admin area (`/admin/emails/templates`,
  **post-Sprint-6**) where each of the 4 email kinds' `EmailTemplate`
  section list is authored — add/reorder/duplicate/delete/show-hide, same
  interaction as the Event Pages Page Builder (§2.23.3). This is the
  layer that makes email "layout" a database edit, not a code change.
- **Notification Centre**: the admin screen (`/admin/emails`) for
  actually sending the Newsletter — **post-Sprint-6**, purely operational
  (Generate Email / Send Update against whatever the Email Template
  Manager's `"digest"` template currently says); structural editing moved
  to the Email Template Manager above (§2.16.3).
- **Digest** / **`EmailDigest`**: one *send operation* of the Newsletter —
  computed New Products/Price Updates/Sold Out, recipient list, and saved
  rendered HTML, all as one database row (§4.7b). **Post-Sprint-6**, its
  structure (section toggles, Karen's Notes, picked Collections/products)
  is no longer stored here — that's `EmailTemplate("digest")`'s sections
  (§4.7h) — `EmailDigest` only records that one send happened. `status`
  moves `"draft"` → `"generated"` → `"sent"`; only the last is immutable
  history (§2.22.2).
- **`EmailService`**: the swappable send interface
  (`src/lib/email/types.ts`) every email provider implements — same role
  as `StorageAdapter`. Two implementations exist: `consoleEmailService`
  (a no-op that logs, the local-dev default) and, new in Sprint 6,
  `resendEmailService` (§2.22.1), a real send through the Resend API.
- **Email Queue**: the `EmailLog`-backed enqueue-then-process pattern
  (`src/lib/email/queue.ts`, §2.22.1) every real send goes through —
  new in Sprint 6.
- **`EmailLog`**: one row per attempted email send — recipient, subject,
  rendered HTML, template, status (`pending`/`sending`/`sent`/`failed`),
  provider, and error message (§4.7g). Backs Email Logs (§2.22.4) and the
  Notification Dashboard (§2.22.5). New in Sprint 6.
- **Variant** / **Variant group**: a product's single optional group of
  pill-selectable options (e.g. "Design" → Cat/Bear/Rabbit), each its own
  `ProductVariant` row with an optional SKU, price override, and image
  (§2.17, §4.1a). Not the same concept as "Product Type" or "Product
  Collection" — those are catalogue taxonomy, a variant is a specific
  purchasable option *within* one product listing.
- **`getOrderItemOptions()`**: the one shared helper (`src/lib/order-item-
  options.ts`, **post-Sprint-6**) every surface calls to render an
  `OrderItem`'s selected variant consistently — Confirmation Email,
  Retrieve My Pre-order Email, Admin Orders, the Self-Service Portal, and
  the Purchase Dashboard all call it instead of hardcoding the word
  "Variant" (§2.23.4). Always returns an array of `{label, value}` pairs
  (today 0-or-1 entries), so a future multi-option-group product (e.g.
  Size *and* Colour on one line) is additive here only.
- **Buying List**: the Purchase Dashboard's core table — every distinct
  product/variant combination that appears in at least one submitted
  pre-order, with requested quantity, customer count, and a purchase
  status the admin can update while physically shopping (§2.18).
- **Purchase status**: **Not Purchased** / **Partially Purchased** /
  **Purchased** — Karen's own buying checklist state per product/variant,
  entirely separate from `PreOrder.status` (new/confirmed/fulfilled/
  cancelled, which tracks a customer's order) and from `Product.status`
  (active/draft/sold_out, which tracks catalogue visibility) — three
  independent status fields answering three different questions (§2.18).
- **`ActivityLog`** / **Recent Activity**: a small, generic event feed
  (product added, price updated, order submitted, wishlist added) fed by
  four write points, shown reverse-chronologically on the Analytics
  Dashboard — deliberately not a full audit log (§4.7c, §2.19).
- **High Interest Products**: a documented heuristic on the Analytics
  Dashboard — `wishlistCount − orderedQuantity`, descending — surfacing
  products customers save but haven't committed to ordering yet (§2.19).
- **`EventPage`**: one CMS-managed content page (§2.20) — a `title`, a
  unique `slug` (its URL), and an ordered list of `PageSection`s. Reached
  at `/{slug}` via the single `/[slug]` catch-all route (§2.20.6).
- **Section** / **`PageSection`**: one content block on an `EventPage` —
  Text, Image, Gallery, Button, or Divider this sprint (§2.20.4). One
  table with an open `type` string and a `Json` `data` blob, deliberately
  chosen so a future type needs no migration (§2.20.1).
- **Protected slug**: `how-to-preorder` or `about-event` — the two seeded
  pages' slugs, which can't be changed, and the pages themselves can't be
  deleted, because the homepage nav pills and the site footer link to
  those exact URLs (§2.20.2).
- **Reserved slug**: one of the 8 existing top-level route segments
  (`admin`, `api`, `checkout`, `collections`, `my-preorders`, `order`,
  `product`, `unsubscribe`) that a new `EventPage`'s slug is blocked from
  using, so an admin never creates a page that's silently unreachable
  behind a real route (§2.20.2).
- **Self-Service Portal**: the customer-facing page at `/edit/{token}`
  (§2.21, Sprint 5) — a complete, passwordless, editable view of one
  pre-order (products, wishlist, customer info, notification
  preferences, timeline). The destination every edit link points to.
- **`OrderHistoryEntry`**: one row per meaningful change to a `PreOrder`
  (§4.7f) — powers both the Self-Service Portal's simplified Order
  Timeline and the admin's full-detail Order History (§2.11). Same
  small-generic-feed shape as `ActivityLog`, scoped to one order.
- **Notification preferences**: the three customer-managed booleans on
  `PreOrder` (new products, price updates, 24-hour close reminder) —
  editable from the Self-Service Portal, saved instantly per toggle.
  Real as of Sprint 6 (§2.22.3, §2.22.6): the first two personalize a
  digest send, the third gates the automatic Reminder Email.

# Staging Testing Checklist

Manual QA checklist for the staging deployment
(`preorder.shokakko.com.au`, Basic Auth-protected — see
[`DEPLOYMENT.md`](DEPLOYMENT.md#staging-mode)). Run this end to end before
telling anyone else the staging URL, and again after any deploy that
touches a checked area. Check off `[x]` as you go, or copy this file per
test pass if you want a dated record.

Log in with the staging Basic Auth credentials first — if that prompt
doesn't appear, stop and fix that before testing anything else (it means
the site currently isn't gated, see `DEPLOYMENT.md`).

---

## Homepage (`/`)

- [ ] Loads with no console errors (browser dev tools → Console).
- [ ] Header logo shows (uploaded logo, or the text wordmark fallback if
      none uploaded) and is centered regardless of icon-cluster width.
- [ ] Hero banner carousel rotates (if any active banners exist);
      dot indicators work; renders nothing if zero active banners
      (not broken).
- [ ] Event info strip shows event name/location/info and a live
      countdown, if configured in Settings; renders nothing if unset.
- [ ] Product grid loads all active/sold-out products; sold-out items
      show a "Sold Out" badge in place of the quantity stepper.
- [ ] "Price Coming Soon" shows in coral for any product with no price.
- [ ] Floating admin button (bottom-right) links to `/admin/login`.
- [ ] Footer shows Contact Us / Shipping Policy links, opens in a new tab.

## Products (`/product/[id]`)

- [ ] Every card's photo and name link to its Product Details page.
- [ ] Image gallery shows all photos; thumbnail strip appears when there's
      more than one.
- [ ] Brand, name, SKU, type, description, estimated arrival all render.
- [ ] Wishlist toggle button works and stays in sync with the card's own
      heart icon (toggle on one, confirm the other reflects it after
      navigating back).
- [ ] "Add to Pre-order" swaps to the quantity stepper once the item is
      in the cart.
- [ ] "← Back to shopping" returns to `/`.

## Filters

- [ ] Search (name/brand/SKU substring) narrows the grid correctly.
- [ ] Sort (Newest / Name A–Z / Price Low→High / Price High→Low) reorders
      correctly.
- [ ] Brand, Product Collection, and Product Type checkboxes narrow the
      grid; multiple selections within one group are OR'd, across groups
      are AND'd.
- [ ] Price range (min/max) narrows correctly, including edge values.
- [ ] "Show sold out items" (checked by default) hides sold-out products
      when unchecked.
- [ ] "♡ Wishlist" filter shows only wishlisted products, and composes
      correctly with every filter above (e.g. search + wishlist-only
      together).
- [ ] "Clear all filters" resets every control, including the wishlist
      checkbox.
- [ ] Mobile: the "Filters" button opens the filter drawer; desktop: the
      sidebar is always visible, no button shown.

## Wishlist

- [ ] Heart toggle on a card flips ♡ ↔ ❤️ instantly, no page reload.
- [ ] Header badge count updates immediately; icon itself swaps ♡ → ❤️
      once count > 0.
- [ ] Wishlist drawer opens from the header icon; lists every wishlisted
      product with photo, brand, name, price, and a 🟢/🟡/🔴 status line.
- [ ] "Move to Pre-order" adds qty 1 to the cart *and* removes the item
      from the wishlist in one click; both counters update.
- [ ] "Remove" removes an item without touching the cart.
- [ ] **Before any pre-order is ever submitted from this browser**:
      refresh the page — wishlist survives (stored in `localStorage`).
- [ ] **After submitting a pre-order**: wishlist persists via the
      database instead — confirm by clearing `localStorage` (dev tools →
      Application → Local Storage → clear) and reloading; the wishlist
      should still show correctly (it's now server-linked via a cookie).
- [ ] Mobile: the wishlist drawer is a full-width bottom sheet, visually
      distinct from the cart/filter drawers' side-panel style at the same
      width.

## Shopping Cart

- [ ] Adding the first unit of any product auto-opens the cart drawer.
- [ ] Quantity stepper in the drawer and on the card/details page stay in
      sync.
- [ ] Line subtotal and cart total calculate correctly, including a
      product with no price ("+ TBC" on the total).
- [ ] "Next Step" navigates to `/checkout` and closes the drawer.
- [ ] Cart persists across a page refresh (before checkout) but clears
      automatically after a successful pre-order submission.

## Checkout (`/checkout`)

- [ ] Empty cart shows a "Your cart is empty" state with a link back to
      `/`, instead of a broken/blank form.
- [ ] Order summary lists every cart line with a photo, name, quantity,
      price.
- [ ] Admin's Pre-order Information rich text (if any) renders above the
      form.
- [ ] Shipping notice + "Shipping Policy" link render, link opens in a
      new tab.
- [ ] Form validation: submitting with required fields empty shows
      inline errors, doesn't silently fail.
- [ ] Submitting a valid order redirects to the order confirmation page
      (`/order/[orderNumber]`) with the correct sequential `PO####`
      number, itemized order, and total.
- [ ] Order confirmation shows the "Edit My Pre-order" card with a Copy
      Link button (copies successfully — check the clipboard or the
      button's "Copied!" state).
- [ ] Submitting a **second** pre-order from the same (already-linked)
      browser works and generates a new order number.

## Admin

- [ ] `/admin/login` rejects a wrong password with a visible error, no
      crash.
- [ ] Correct password logs in and redirects to `/admin`.
- [ ] Dashboard stat tiles show correct counts and link to the right
      pages.
- [ ] **Products**: create, edit, and delete a test product; multi-photo
      upload + drag-to-reorder works; "🆕 Mark as New" checkbox saves.
- [ ] **Banners**: create/edit/delete; drag-to-reorder; enable/disable
      toggle; the 5-banner cap is enforced (the "+ Add banner" button
      disappears at 5).
- [ ] **Collections**: upload a square image for a tag, confirm it shows
      on `/collections/[id]` and in a generated Update Email preview.
- [ ] **Settings**: logo upload/remove, event fields, countdown,
      pre-order info rich text, and the new Email Settings section
      (hero image, footer links) all save and show a confirmation.
- [ ] **Pre-orders**: list shows all submitted orders; detail page shows
      full order info; status dropdown (new/confirmed/fulfilled/
      cancelled) saves.
- [ ] Logging out actually clears the session (confirm `/admin` redirects
      to login afterward, not just the button disappearing visually).
- [ ] Every `/admin/*` page redirects to `/admin/login` when not logged
      in (test by opening one in a private/incognito window).

## Notification Centre (`/admin/emails`)

- [ ] Toggling each optional section (Karen's Notes, Collections,
      Recommended Products, New Products, Price Updates) shows/hides the
      matching section in both the counts display and, after generating,
      the saved preview.
- [ ] Karen's Notes rich text editor saves and renders correctly in the
      preview.
- [ ] Collections/Recommended Products multi-select checkboxes save the
      right picks.
- [ ] Subject, button text, and button URL fields save.
- [ ] "This will be prepared for N subscribed customers" reflects the
      real, current count (test: unsubscribe a test order via its
      `/unsubscribe/[token]` link, confirm the count drops by one).
- [ ] **Generate Email** produces a success message, updates "Last
      generated," and the preview pane shows exactly what was
      saved — not a stale or different render.
- [ ] Edit a product's price, Generate Email again, confirm it appears
      under Price Updates with old → new price; generate a third time
      with no further changes and confirm it's gone (correctly consumed,
      not repeated).
- [ ] `/admin/emails/history` lists the generated digest(s); clicking
      through to a digest's detail page shows the same saved HTML and a
      correct summary of what was included.
- [ ] `/admin/emails/confirmation` and `/admin/emails/reminder`: pick
      different real orders from the dropdown, confirm each renders with
      that order's correct name/order number/items or countdown.
- [ ] **No real email is ever sent** — confirm `EMAIL_DRIVER=console` in
      the staging environment variables (this is the whole point of
      staging; if this is ever wrong, stop testing immediately and fix
      the env var before continuing).

## Responsive Layout

Test each area above at all three breakpoints — resize the browser or use
dev tools' device toolbar:

### Desktop (≥1024px)
- [ ] Filter sidebar always visible (no "Filters" button).
- [ ] Product grid: 4 columns.
- [ ] Cart/Wishlist/Filter drawers: side panel, ~30% width.
- [ ] Email preview product/collection grids: 3 cards per row.

### Tablet (768–1023px)
- [ ] Product grid: 3 columns.
- [ ] Drawers: near-full-width side panel (same side-slide behavior as
      desktop, just wider proportionally).
- [ ] Header logo stays centered (not just "close enough" — check it
      isn't visibly off-center).

### Mobile (<768px)
- [ ] Product grid: 2 columns.
- [ ] "Filters" button visible, opens the filter drawer (side panel).
- [ ] Wishlist drawer specifically: full-width **bottom sheet** (slides
      up, rounded top corners) — visually distinct from the Cart/Filter
      drawers' side-panel style at the same width.
- [ ] Email preview product/collection grids: 2 cards per row (check via
      an email preview page, not the live site).
- [ ] All forms (checkout, admin) remain usable — no horizontal
      scrolling, no cut-off buttons.

## Cross-Browser Testing

Run at minimum the Homepage → Product Details → Cart → Checkout →
Confirmation flow, plus one Admin login, in each:

- [ ] Chrome (desktop)
- [ ] Safari (desktop, if a Mac is available)
- [ ] Firefox (desktop)
- [ ] Chrome (Android) or Safari (iOS) — real mobile device, not just a
      resized desktop browser window, since touch interactions (the
      quantity stepper, drawer swipe/tap targets) don't always behave
      identically to a mouse in dev tools' emulation.
- [ ] Confirm HTTP Basic Auth prompt itself works consistently — some
      mobile browsers handle Basic Auth prompts differently than desktop.

## Performance

- [ ] Homepage first load feels responsive on a throttled connection
      (dev tools → Network → "Slow 4G") — this app is explicitly
      `force-dynamic` (no static caching) since prices/availability must
      always be live, so some baseline latency is expected; the goal here
      is "no surprises," not a specific benchmark number.
- [ ] No obviously oversized images — product photos should be
      reasonably compressed before upload (no built-in resizing exists
      yet, see `docs/PRD.md` §14/§16).
- [ ] Run a Lighthouse pass (Chrome dev tools → Lighthouse) on the
      homepage and checkout page as a baseline reading — not a pass/fail
      gate at this stage, just a number worth recording before Sprint 4
      adds more (email rendering, sending) so future regressions are
      noticeable.
- [ ] No unhandled console errors/warnings on any page in this checklist.

---

## After Testing

- [ ] Delete any test products, test pre-orders, and test-generated email
      digests created during this pass, so the staging database doesn't
      accumulate junk data (same cleanup discipline used during
      development — see `PROJECT_NOTES.md`).
- [ ] File/report anything that failed, with the exact steps to
      reproduce, before moving on to Sprint 4.

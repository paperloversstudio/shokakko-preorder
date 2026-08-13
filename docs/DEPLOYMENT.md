# Deployment Guide

**Status:** Milestone 1 — staging deployment prep. This document covers
local development through a **staging** deployment on Vercel at
`preorder.shokakko.com.au`. It is not yet a production runbook — see
[Production Checklist](#production-checklist) for what still changes
before this becomes a real, publicly-usable site.

Nothing in this document has been deployed yet. Everything under
[Vercel Deployment](#vercel-deployment) and
[GoDaddy DNS Configuration](#godaddy-dns-configuration) is a guide for
Karen to carry out manually in the Vercel and GoDaddy dashboards — an
agent session has no access to either account.

---

## Local Development

```bash
pnpm install
cp .env.example .env.local
# edit .env.local: set ADMIN_PASSWORD, generate SESSION_SECRET with
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
pnpm exec prisma migrate deploy   # applies existing migrations to dev.db
pnpm run db:seed                  # optional — demo products
pnpm run dev
```

Open `http://localhost:3000`. Admin is at `/admin/login`, gated by
`ADMIN_PASSWORD`.

**Two `.env` files, both local-only:**
- `.env` — non-secret shared defaults (`DATABASE_URL=file:./dev.db`,
  `STORAGE_DRIVER=local`, `EMAIL_DRIVER=console`). Committed to git.
- `.env.local` — real secrets (`ADMIN_PASSWORD`, `SESSION_SECRET`).
  **Never committed** — see [Environment Variables](#environment-variables).

Changing the Prisma schema: edit `prisma/schema.prisma`, then run
`pnpm exec prisma migrate dev --name <description>`. If that fails
non-interactively (it does whenever a migration has *any* warning, even a
harmless one — a known Prisma limitation on this project, not a bug),
generate the SQL by hand instead:

```bash
pnpm exec prisma migrate diff \
  --from-config-datasource prisma.config.ts \
  --to-schema prisma/schema.prisma --script > /tmp/migration.sql
# strip any "◇ ..." dotenvx noise lines from the top of the file, then:
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_<description>
mv /tmp/migration.sql prisma/migrations/$(date +%Y%m%d%H%M%S)_<description>/migration.sql
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

---

## Git Workflow

The repository was initialized for Milestone 1 (it had no git history
before). Branch model, kept intentionally simple for a two-person
(Karen + agent sessions) project:

- **`main`** — always deployable. This is what Vercel's staging
  deployment tracks.
- **Feature branches** — `sprint-4-email-sending`, `fix-checkout-bug`,
  etc. — for anything non-trivial. Merge into `main` via a PR once it's
  verified locally (`tsc --noEmit`, `lint`, `build`, and a manual pass
  through the affected flow).
- **Small, obviously-safe fixes** can go straight to `main`.

```bash
git checkout -b sprint-4-email-sending
# ...work, commit...
git push -u origin sprint-4-email-sending
# open a PR, merge into main once green
```

Once `main` is connected to Vercel (see below), every push to `main`
auto-deploys to staging, and every PR gets its own preview URL for free —
useful for reviewing a change before it reaches the shared staging site.

**No remote exists yet.** To connect one:

```bash
gh repo create shokakko-preorder --private --source=. --remote=origin
git push -u origin main
```

(Or create the repo in the GitHub web UI first and `git remote add origin
<url>`.) A private repo is recommended — this project has no public-facing
open-source reason to be public, and a private repo is required either way
if any real customer data ever ends up in a database export or fixture
committed by mistake.

---

## Vercel Deployment

**Not done yet — this section is the guide for when you're ready.**

1. **Import the project**: [vercel.com/new](https://vercel.com/new) →
   import the GitHub repo. Vercel auto-detects Next.js; no `vercel.json`
   is needed for this project (standard `next build`/`next start`, no
   custom output mode).
2. **Set environment variables** (Project Settings → Environment
   Variables) — see [Environment Variables](#environment-variables) below
   for the full list and which Vercel environment (Production / Preview /
   Development) each belongs to. For this milestone, everything staging-
   related goes under **Preview** (or, for a fixed URL, scope it to the
   `main` branch specifically — see the note below).
3. **Provision a hosted database** (required — SQLite's local file
   doesn't survive Vercel's read-only, ephemeral serverless filesystem):
   - **Turso** (recommended — hosted libSQL, zero *app* code change, same
     `@prisma/adapter-libsql` this project already uses for its own
     queries):
     ```bash
     turso db create shokakko-preorder-staging
     turso db show shokakko-preorder-staging --url          # → DATABASE_URL
     turso db tokens create shokakko-preorder-staging        # → DATABASE_AUTH_TOKEN
     ```
     Set both as Vercel env vars, then apply the schema to it once from
     your machine:
     ```bash
     DATABASE_URL="<turso-url>" DATABASE_AUTH_TOKEN="<token>" \
       pnpm run db:migrate:remote
     ```
     **Not** `prisma migrate deploy` — confirmed while setting up staging
     that Prisma's migrate engine rejects `libsql://` URLs outright
     (`P1013: the scheme is not recognized`) for a `provider = "sqlite"`
     datasource, even though the app's own runtime queries go through
     `libsql://` just fine via the driver adapter. This only affects
     *applying* migrations, not normal queries. `db:migrate:remote`
     (`scripts/apply-remote-migrations.mjs`) applies `prisma/migrations/*/migration.sql`
     directly via `@libsql/client`, tracking what's been applied in a
     small `_manual_migrations` table so it's safe to re-run after adding
     future migrations — only the new ones get applied.
   - Postgres (Neon, etc.) is the other supported option but needs a code
     change first — swap the adapter in `src/lib/db.ts` to
     `@prisma/adapter-pg` and `prisma/schema.prisma`'s `provider` to
     `"postgresql"`. Not needed for staging; only worth it if there's a
     specific reason to prefer Postgres.
4. **Provision image storage**: create a Vercel Blob store (Project →
   Storage → Create Database → Blob) and copy its `BLOB_READ_WRITE_TOKEN`
   into the env vars. Set `STORAGE_DRIVER=vercel-blob`. The adapter code
   is already written (`src/lib/storage/vercel-blob.ts`) — this is purely
   configuration.
5. **Deploy**: push to `main` (or click "Deploy" in the dashboard for the
   first one).
6. **Fixed staging URL**: by default Vercel gives Preview deployments a
   new URL per commit. For a stable staging URL to point
   `preorder.shokakko.com.au` at, either (a) promote `main`'s latest
   deployment to a custom domain assignment regardless of environment —
   Vercel's Domains settings let you assign a domain to a specific
   git branch — or (b) treat this staging deployment as Production in
   Vercel's terms (since there's no *real* production yet) and revisit
   the distinction when a genuine production launch is planned. Given
   this is explicitly "not a production deployment," option (a) — a
   branch-scoped domain — better matches intent and is what this guide
   assumes.

**Before deploying, confirm locally:**
```bash
pnpm exec tsc --noEmit && pnpm run lint && pnpm run build
```
All three currently pass clean on `main` (verified as part of Milestone 1
prep, see [Production Checklist](#production-checklist)).

---

## GoDaddy DNS Configuration

Once the Vercel project has a deployment and you've added
`preorder.shokakko.com.au` as a domain in Vercel's Project Settings →
Domains (Vercel will tell you the exact record it wants — the below is
the standard case and matches what it will show):

1. Log into GoDaddy → **My Products** → find `shokakko.com.au` → **DNS**.
2. Add a new record:

   | Type | Name | Value | TTL |
   |---|---|---|---|
   | `CNAME` | `preorder` | `cname.vercel-dns.com` | 1 hour (default) |

   ("Name: `preorder`" is the subdomain part only — GoDaddy appends
   `.shokakko.com.au` automatically. Don't enter the full domain in that
   field.)
3. Save. DNS propagation is typically fast (minutes) but can take up to
   ~48 hours in rare cases.
4. Back in Vercel's Domains settings, it will show "Verifying..." until
   the CNAME resolves, then flip to a green checkmark and auto-provision
   an SSL certificate (no action needed — Vercel handles this).
5. Confirm: `https://preorder.shokakko.com.au` loads the site, and (once
   the staging gate is configured, see below) prompts for the Basic Auth
   login before showing anything.

If GoDaddy already has an existing `A` or `CNAME` record for `preorder`
(unlikely, but check first), remove or edit it rather than adding a
duplicate — DNS providers generally reject/ignore conflicting records for
the same name, and having both is confusing to debug later.

---

## Environment Variables

| Variable | Local (`.env`/`.env.local`) | Staging (Vercel) | Notes |
|---|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | Turso URL | see step 3 above |
| `DATABASE_AUTH_TOKEN` | *(unset)* | Turso token | only needed for hosted libSQL |
| `ADMIN_PASSWORD` | your choice, in `.env.local` | a **different** staging-only password | never reuse the local dev password anywhere real |
| `SESSION_SECRET` | generated once, in `.env.local` | a **fresh** generated value | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `STORAGE_DRIVER` | `local` | `vercel-blob` | |
| `BLOB_READ_WRITE_TOKEN` | *(unset)* | from Vercel Blob dashboard | |
| `EMAIL_DRIVER` | `console` | `console` | **must stay `console` on staging** — see [Staging Mode](#staging-mode) below; nothing sends real email until Sprint 4 wires a real driver anyway |
| `EMAIL_API_KEY` | *(unset)* | *(unset)* | reserved, unused by any driver yet |
| `BASE_URL` | *(unset)* | *(unset)* | reserved for a future non-request context (e.g. a scheduled email send); every current URL is derived from the request's own Host header, not this |
| `STAGING_BASIC_AUTH_USER` | *(unset)* | set this | site-wide login gate, see below |
| `STAGING_BASIC_AUTH_PASSWORD` | *(unset)* | set this | |

**Never committed**: `.env.local` and any `.env*.local` file (`.gitignore`
enforces this). **Committed**: `.env` (safe shared defaults only — no
secrets belong in it) and `.env.example` (the template, placeholder
values only).

**On not adding a `LOGO_URL` env var**, despite it being in the original
brief's example list: the site logo is admin-uploaded and stored in the
database (`SiteSettings.logoUrl`, editable at `/admin/settings` without a
redeploy) — that's a deliberate, already-shipped feature (Karen can swap
the logo live during an exhibition). Moving it to an env var would be a
regression, not an improvement, so it was left out.

**On `EMAIL_PROVIDER`**: this project already has an equivalent variable,
`EMAIL_DRIVER` (Sprint 3), matching the existing `STORAGE_DRIVER` naming
convention. Kept as-is rather than introducing a second name for the same
concept.

### Staging Mode

Set **both** `STAGING_BASIC_AUTH_USER` and `STAGING_BASIC_AUTH_PASSWORD`
on the staging deployment only. When both are present, `src/proxy.ts`
requires an HTTP Basic Auth login for *every* route (not just `/admin`)
before anything else runs — the whole site, including the homepage and
checkout, is gated. Leave both unset locally and on any future real
production deployment.

Combined with `EMAIL_DRIVER=console` (never sends real email — see
`src/lib/email/console.ts`) and the Notification Centre's "Generate
Email" never calling `emailService.send()` (Sprint 3's explicit scope),
staging is safe to test against: no real customer can reach it without
the Basic Auth credentials, and no email — real or test — ever leaves the
server.

---

## Production Checklist

Everything that must change before this is a *real*, publicly-launched
production site (not staging):

- [ ] `ADMIN_PASSWORD` — a strong, unique value, never reused from
      staging/local.
- [ ] `SESSION_SECRET` — a fresh generated value, never reused.
- [ ] `DATABASE_URL`/`DATABASE_AUTH_TOKEN` — a **separate** database from
      staging (never share one — staging test data must never mix with
      real customer orders, and a staging reset/wipe must never touch
      production).
- [ ] `STORAGE_DRIVER=vercel-blob` + a **separate** Blob store from
      staging, for the same reason.
- [ ] `STAGING_BASIC_AUTH_USER`/`PASSWORD` — **unset** (production must be
      reachable by real customers).
- [ ] A real `EmailService` driver wired up (Sprint 4) if any email
      feature is expected to work — until then, Confirmation/Update/
      Reminder emails still don't actually send in production either.
- [ ] Custom domain finalized (`shokakko.com.au` root or a different
      subdomain than staging's `preorder.` — decide before launch, not
      after, since changing it later means updating printed QR codes).
- [ ] Re-run the full [Testing Checklist](TESTING_CHECKLIST.md) against
      the production URL specifically, not just staging.
- [ ] Confirm `pnpm exec tsc --noEmit`, `pnpm run lint`, `pnpm run build`
      all pass clean on the exact commit being deployed.
- [ ] Rate limiting / bot protection on the public checkout form and
      admin login — still not implemented anywhere in this project (a
      known, carried-forward gap — see `docs/PRD.md` §11/§14).

**Staging-specific checklist** (what's actually needed for *this*
milestone, i.e. before telling anyone the staging URL):

- [ ] `pnpm exec tsc --noEmit && pnpm run lint && pnpm run build` all
      pass on `main`.
- [ ] Turso (or other hosted) database provisioned, migrations applied.
- [ ] Vercel Blob store provisioned.
- [ ] All env vars from the table above set for the staging environment
      in Vercel.
- [ ] `STAGING_BASIC_AUTH_USER`/`PASSWORD` set and confirmed working (a
      request without credentials returns 401).
- [ ] `EMAIL_DRIVER=console` confirmed (not a real provider).
- [ ] DNS record added at GoDaddy, `preorder.shokakko.com.au` resolves
      and shows a valid Vercel-issued SSL certificate.
- [ ] Full pass through [`TESTING_CHECKLIST.md`](TESTING_CHECKLIST.md).

---

## Rollback Procedure

Vercel keeps every deployment. Rolling back is a dashboard action, not a
git operation — the fastest safe option:

1. Vercel dashboard → the project → **Deployments**.
2. Find the last known-good deployment (by commit message/timestamp).
3. Click **⋯** → **Promote to Production** (or "Promote to [environment]"
   — the wording depends on which Vercel environment staging is scoped
   to). This immediately re-points the live domain at that build — no
   rebuild, no waiting.

**If the problem is bad data, not bad code** (e.g. a Notification Centre
digest generated with wrong content, a product edited incorrectly):
that's a database fix, not a deployment rollback — use `/admin` directly,
or connect with `prisma studio` against the staging `DATABASE_URL`.
Redeploying an older commit does **not** revert database changes; the
database and the deployed code are independent.

**If a bad migration was applied**: this project has no automatic
down-migrations (matching its established "hand-write the SQL" migration
practice — see Local Development above). Fixing forward (a new migration
that corrects the issue) is safer than attempting to reverse-apply SQL
against a database that may have already received writes under the new
schema.

**Git-level revert**, for when the bad commit itself needs to stop being
`main`'s HEAD (e.g. before merging a follow-up fix):
```bash
git revert <bad-commit-sha>   # preferred — keeps history honest
git push
```
Avoid `git reset --hard` + force-push on `main` once it's shared/deployed
— it rewrites history other clones (and Vercel's own deployment log tied
to commit SHAs) still reference.

---

## Common Deployment Issues

- **`prisma migrate deploy`/`migrate dev` fails with `P1013: The provided
  database string is invalid. The scheme is not recognized`** against a
  Turso/libSQL `DATABASE_URL`: expected, not a misconfiguration. Prisma's
  migrate engine doesn't accept `libsql://` for a `provider = "sqlite"`
  datasource — use `pnpm run db:migrate:remote` instead (see
  [Vercel Deployment](#vercel-deployment) step 3). Local SQLite
  (`file:./dev.db`) is unaffected; this only comes up against a hosted
  libSQL database.
- **Build fails with "Prisma Client not generated" / `@prisma/client did
  not initialize yet`**: Vercel's build runs `pnpm install` then
  `pnpm run build` — Prisma Client needs an explicit `prisma generate`
  somewhere in between. This project's `package.json` has a
  `"postinstall": "prisma generate"` script specifically so this happens
  automatically; if it's ever removed, this is why the build breaks.
- **500 errors on every page, works fine locally**: almost always a
  missing/wrong `DATABASE_URL` (or `DATABASE_AUTH_TOKEN`) in Vercel's env
  vars — SQLite's `file:./dev.db` doesn't exist on Vercel's filesystem at
  all. Check the function logs in Vercel's dashboard for the actual
  Prisma connection error.
- **Uploaded photos 404 / disappear after a deploy**: `STORAGE_DRIVER`
  is still `local` (or unset, which defaults to `local`) — Vercel's
  filesystem is ephemeral per-deployment, so anything saved to
  `/public/uploads` during one deployment is gone on the next. Set
  `STORAGE_DRIVER=vercel-blob` + `BLOB_READ_WRITE_TOKEN`.
- **"Body exceeded 1 MB limit" / "Unexpected end of form" on photo
  uploads**: already fixed project-wide via `next.config.ts`'s
  `serverActions.bodySizeLimit`/`proxyClientMaxBodySize` (both raised to
  40MB) — if this resurfaces, check that `next.config.ts` wasn't
  reverted, not that it needs re-fixing from scratch.
- **`prisma migrate dev` hangs or fails non-interactively** (CI, or an
  agent session): expected — see the workaround in
  [Local Development](#local-development). This is a known Prisma-on-
  SQLite limitation for this project, not a Vercel-specific issue.
- **DNS shows "Not configured" / SSL certificate pending for a long
  time**: usually just propagation delay (see
  [GoDaddy DNS Configuration](#godaddy-dns-configuration)) — re-check
  after 15–30 minutes before assuming something's actually wrong. Confirm
  the record with `nslookup preorder.shokakko.com.au` or
  [whatsmydns.net](https://www.whatsmydns.net).
- **Everything 401s, including pages that shouldn't require login**:
  `STAGING_BASIC_AUTH_USER`/`PASSWORD` are both set (as intended for
  staging) — this is the staging gate working correctly, not a bug. It
  should only ever apply on the staging environment; if it shows up on a
  future production deployment, those two env vars were set somewhere
  they shouldn't be.
- **`next dev`/`next build` warns about `AGENTS.md`'s
  `<!-- BEGIN:nextjs-agent-rules -->` block changing**: this file is
  regenerated by Next.js itself on `next dev` — committing the
  regenerated version (rather than fighting it) is the intended workflow,
  per the comment inside the file.

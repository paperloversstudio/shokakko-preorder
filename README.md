# Shokakko Australia — Pre-Order Site

A mobile-first, accountless pre-order management system for Shokakko
Australia (Japanese stationery), built for use live during overseas
exhibitions: the admin adds products from their phone throughout the day,
customers browse and submit pre-orders (no payment, no accounts), and the
admin follows up after the event.

Next.js 16 (App Router) + Prisma 7 + SQLite/libSQL locally (swappable to a
hosted database for deployment) + Tailwind CSS v4.

## Documentation

- [`docs/PRD.md`](docs/PRD.md) — the living source of truth for what's
  actually implemented: every route, database model, and architecture
  decision, kept in sync sprint by sprint.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — local dev setup, git
  workflow, Vercel deployment, DNS configuration, environment variables,
  and rollback procedure.
- [`docs/TESTING_CHECKLIST.md`](docs/TESTING_CHECKLIST.md) — the manual QA
  checklist used before/after each deployment.
- [`CHANGELOG.md`](CHANGELOG.md) — notable changes, newest first.
- [`PROJECT_NOTES.md`](PROJECT_NOTES.md) — the chronological decision log
  (the "why," not just the "what").

## Quick start

```bash
pnpm install
cp .env.example .env.local   # fill in ADMIN_PASSWORD / SESSION_SECRET
pnpm exec prisma migrate deploy
pnpm run db:seed              # optional — demo products
pnpm run dev
```

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md#local-development) for the
full walkthrough, including what each environment variable does.

## Scripts

| Command | Does |
|---|---|
| `pnpm run dev` | Local dev server (Turbopack) |
| `pnpm run build` | Production build |
| `pnpm run start` | Serve a production build locally |
| `pnpm run lint` | ESLint |
| `pnpm exec tsc --noEmit` | Type-check |
| `pnpm run db:seed` | Seed demo products |
| `pnpm run db:studio` | Prisma Studio (browse the database) |

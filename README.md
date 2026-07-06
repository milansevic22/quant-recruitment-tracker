# Quant Recruitment Tracker

Quant Recruitment Tracker is a polished internal MVP for monitoring public
careers pages at trading firms, hedge funds, and market makers. It surfaces
graduate, internship, quant, trading, research, and software engineering roles
in a clean dashboard.

The project is built for CrumbLabz stack alignment: Next.js App Router,
TypeScript, Tailwind CSS, Firebase Firestore, Firebase Admin SDK for privileged
writes, and Vercel-compatible deployment.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Firebase Firestore
- Firebase Admin SDK
- Vercel

## Folder Structure

```text
app/
  api/
    cron/
    jobs/
    scan/
    seed/
  globals.css
  layout.tsx
  page.tsx
components/
docs/
  tech-docs.html
lib/
  firebase/
  scanner/
public/
scripts/
types/
```

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

pnpm is also supported:

```bash
pnpm install
pnpm dev
```

The dashboard includes sample fallback data so it can be reviewed before
Firebase credentials are added.

## Environment Variables

Browser-safe Firebase config:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Server-only Firebase Admin config:

```bash
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
ADMIN_API_SECRET=
CRON_SECRET=
```

Optional notification support:

```bash
RESEND_API_KEY=
ALERT_EMAIL_TO=
ALERT_EMAIL_FROM=
```

## Firebase Setup

1. Create a Firebase project.
2. Enable Firestore in production or test mode, depending on your review needs.
3. Copy the web app config into the `NEXT_PUBLIC_FIREBASE_*` variables.
4. Create a service account key for the Admin SDK.
5. Add `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and
   `FIREBASE_PRIVATE_KEY` to `.env.local` and Vercel.
6. Use a strong random value for `ADMIN_API_SECRET`.

## Local Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```

Equivalent pnpm commands are `pnpm dev`, `pnpm lint`, `pnpm typecheck`, and
`pnpm build`.

## Admin Routes

Protected routes require the admin secret:

```bash
curl -X POST http://localhost:3000/api/seed \
  -H "x-admin-secret: your-secret"

curl -X POST http://localhost:3000/api/scan \
  -H "x-admin-secret: your-secret"

curl -X PATCH http://localhost:3000/api/jobs/JOB_ID/status \
  -H "x-admin-secret: your-secret" \
  -H "content-type: application/json" \
  -d '{"status":"applied"}'
```

Production uses the same header with the deployed domain:

```bash
curl -X POST https://your-domain.vercel.app/api/seed \
  -H "x-admin-secret: your-secret"

curl -X POST https://your-domain.vercel.app/api/scan \
  -H "x-admin-secret: your-secret"

curl -X PATCH https://your-domain.vercel.app/api/jobs/JOB_ID/status \
  -H "x-admin-secret: your-secret" \
  -H "content-type: application/json" \
  -d '{"status":"applied"}'
```

Scheduled scans are handled by Vercel Cron:

```text
GET /api/cron/scan
```

The cron route requires:

```bash
CRON_SECRET=
```

Vercel automatically sends `Authorization: Bearer $CRON_SECRET` when invoking
cron jobs. The included `vercel.json` runs the scanner daily at `0 13 * * *`
in UTC.

## Deployment Notes

Deploy the app to Vercel with the default Next.js settings. Add the same
environment variables in the Vercel project settings before calling protected
API routes. The included `vercel.json` wires Vercel Cron to the secured
`/api/cron/scan` route.

## Tech Docs

The technical walkthrough lives at:

```text
docs/tech-docs.html
```

It explains how the dashboard loads data, how Firebase client/Admin boundaries
work, how the protected seed and scan routes are called, how the scanner avoids
duplicates, and why the app falls back to sample data when credentials are
missing.

## Current MVP Status

Completed MVP:

- Documentation mini-site was created before application code.
- Dashboard renders summary cards, discovered roles, tracked companies, scan
  history, loading states, error states, and empty states.
- Dashboard review mode supports search, company/type/status filters, external
  job links, refresh, local job-status updates, and admin-enabled persisted
  status updates.
- Protected job-status updates can persist review decisions through
  `PATCH /api/jobs/:jobId/status`.
- Automation center shows watched sources, indexed postings, scan cadence,
  scanner safety, protected seed/scan controls, and a visible
  fetch-match-record pipeline.
- Review-mode scan button adds newly detected roles locally so the deployed app
  demonstrates the automated monitoring loop without Firebase credentials.
- Admin mode lets a reviewer paste the admin secret into the dashboard session,
  seed Firestore, run the live scanner, and persist status decisions without
  exposing the secret in source code.
- Production scanner includes verified Greenhouse API adapters for Jane Street
  and Optiver US before falling back to public HTML parsing for other firms.
- Optional Resend alerts email newly inserted jobs when `RESEND_API_KEY` and
  `ALERT_EMAIL_TO` are configured.
- Firebase client reads are used when browser-safe credentials are configured.
- Sample fallback data renders when Firebase credentials are missing or reads
  fail.
- Firebase Admin SDK powers protected seed and scan routes.
- Seed route populates initial companies and sample jobs without duplicate job
  inserts.
- Scanner performs gentle public-page checks and records per-company errors.
- Firestore rules are checked in so the intended read/write boundary is visible
  in the repository.

Verification completed:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- Live Greenhouse feed check on July 6, 2026: Optiver US returned 195 public
  jobs and Jane Street returned 200 public jobs.
- Browser checks at `http://localhost:3000` for desktop and mobile layout

The local shell did not expose `npm`, so verification used the bundled Node and
pnpm runtime. The package scripts remain standard and can be run through npm on
a machine where npm is installed.

## Known Limitations

- The scanner only checks public careers pages.
- It does not bypass bot protection, logins, CAPTCHAs, paywalls, or site
  restrictions.
- Dynamic careers pages and third-party job boards may require manual review.
- Email alerts require a Resend API key and a valid sender address.

## Future Improvements

- Review Vercel Cron logs after enabling scheduled scans.
- Replace the session-secret admin controls with Firebase Auth or another
  login-based reviewer flow.
- Add per-company scanner adapters for high-value sources.
- Add saved views and export support.

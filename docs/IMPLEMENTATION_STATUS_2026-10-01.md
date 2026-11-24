# NyumbaOps implementation status and next steps

**As of:** 1 October 2026 (Africa/Blantyre)  
**Repository:** `AfricanGiaNT/NyumbaOPs`  
**Active architecture:** Nest API with PostgreSQL/Supabase, a public Next.js site, and a separate Next.js staff dashboard

## Executive summary

The security, inquiry, and account-recovery work from priorities 1, 3, and 5 has been implemented. The production PostgreSQL migration was applied successfully after a manual backup. Local testing against live production data confirmed that public properties load, selected dates carry into the inquiry form, availability responds, a guest inquiry can be submitted, and that inquiry appears as **NEW** in the signed-in staff dashboard. No inquiry was converted into a booking during verification.

Commit `9ca7d32` (`improving the site`) contains the main implementation and is on both local `main` and `origin/main`. Railway is configured by the user to auto-deploy pushes to `main`, but the live Railway build and both live website deployments have **not been verified after that commit**. Six follow-up files remain uncommitted locally. Do not equate a passing local test or a synced Git commit with a confirmed live deployment.

## Decisions made

- Nest/PostgreSQL is the production source of truth. Firebase Functions/Firestore are retired for the active app.
- Guests submit inquiries; staff contact them and may convert an inquiry into a booking. Online payment and refunds are deferred.
- The separate `apps/dashboard` app is the active staff dashboard. The older dashboard routes inside `apps/public` redirect to it when configured.
- Financial records and analytics are for `OWNER` only. `OWNER` and `STAFF` may handle operational records such as properties, inquiries, and bookings.
- Inquiry conversion creates a `PENDING` booking hold for 24 hours. Expired holds cease blocking availability, and a scheduled job closes them.
- Password recovery uses a single-use email link instead of the public admin-key setup endpoint.

## Implementation completed

### API and access control

- The Nest API now requires JWT authentication by default. Login, health, public property/review reads, public inquiry submission, and the Telegram webhook are explicitly public routes.
- Financial controllers, including transactions, analytics, categories, loans, and utility bills, require `OWNER`. Operational controllers require `OWNER` or `STAFF` as appropriate.
- Property-image upload now requires an admin role and checks size, declared MIME type, and image file signature before using the server-side storage credential.
- Production startup requires a strong `JWT_SECRET`, Gmail credentials for reset mail, and an HTTPS dashboard URL. Login and reset requests are rate-limited. Telegram webhook requests require their configured secret.
- The API no longer initializes Firebase Admin on startup.

### Inquiries and booking holds

- Prisma models and Nest routes were added for inquiry creation, staff listing/detail, status changes, and conversion. Public submission validates the active property, dates, guest count, and contact fields.
- Conversion creates a guest and one linked `PENDING` booking in a transaction, checks availability again, and gives the hold a 24-hour expiry. Repeating conversion returns the linked inquiry rather than creating another booking.
- Availability, blocked dates, and calendar feeds ignore expired inquiry holds. Staff cannot confirm a hold after expiry. A five-minute scheduler cancels expired pending holds and marks their inquiries `EXPIRED`.
- The separate dashboard lists inquiries and supports contact, conversion, and, in a later **uncommitted** follow-up, “Mark expired.” Marking expired is terminal and does not create a booking.

### Guest and staff interfaces

- The public property page has a “Request these dates” form. Availability selection carries its dates into that form. The price shown with availability is labeled an estimated nightly subtotal.
- Guest checkout, payment confirmation, cancellation, and mock-payment pages no longer invite payment through retired public API routes. Old checkout links lead back to the inquiry path.
- Both active frontends treat `NEXT_PUBLIC_API_BASE_URL` as the Nest **origin**, adding `/api` exactly once. The separate dashboard hides owner-only finance views from staff and no longer presents a payment action backed by a missing Nest endpoint.
- The dashboard password-reset page now requests an email link and accepts a one-time reset token. Resetting a password increments the user's token version, invalidating prior JWTs.
- Repository Firebase Firestore and Storage rules were changed to deny client access. Deployment and security documents mark the old Firebase guidance as historical.

## Production database and backup

- Before migration, read-only checks showed exactly one pending migration and no unrelated Prisma schema differences. The migration `20260928_secure_inquiries_auth` was then applied to **production** with a database transaction, a five-second lock timeout, and a 60-second statement timeout.
- Post-migration checks reported `Database schema is up to date`, `No difference detected`, and no remaining direct `anon` or `authenticated` public-table grants. The migration added inquiries, reset tokens, booking hold expiry, and JWT token versioning. It did not create a test booking.
- Because the Supabase Free Plan has no scheduled project backup, a PostgreSQL 17 `pg_dump` custom-format archive of the production **public schema** was saved at `C:\Users\Admin\Documents\NyumbaOps Backups\production-public-20260930-113717.dump`.
- The archive is 117,102 bytes and passed `pg_restore --list` inspection: 234 archive entries, including 22 table-data entries and entries for guest, booking, and transaction data. Its SHA-256 is `C39B6D3FBAE706361B9781646E6EE71037B0095BA255B866DC4584A816889771`.
- **Backup limits:** This is an unencrypted local backup of `public`, not a full Supabase project backup. It does not include Storage objects or Supabase-managed schemas. It has been listed and hashed but **not restore-tested**. Keep it private and arrange a secure second copy.

## Testing and verification completed

| Check | Last observed result |
| --- | --- |
| Nest unit tests | 8 suites, 14 tests passed |
| Nest end-to-end tests | 2 suites, 4 tests passed |
| API, public-site, dashboard TypeScript checks | Passed |
| Local API | Started successfully; health returned 200; production-backed public listing returned 7 active properties |
| Local network exposure | Local API bound only to `127.0.0.1:3001`; `DISABLE_BACKGROUND_JOBS=true`, and local Telegram, Gmail, and storage-write credentials were empty |
| Public UI | Properties and a property detail rendered; the inquiry form appeared; `2026-11-05` to `2026-11-07` carried into the form; availability returned two available nights |
| Guest submission | User submitted through the local public site and saw “Inquiry submitted” |
| Staff UI | User signed in locally; the new record appeared on `/inquiries` as `NEW`; conversion was available but was **not** clicked |
| Protected route | Anonymous `GET /api/transactions` returned 401; invalid inquiry input returned 400 without creating a record |

The visible inquiry contained private contact information; this report intentionally omits it. At the last UI verification there was one `NEW` inquiry. Its status may have changed since then. The old repository Playwright setup still targets retired Firebase emulators and was not used to prove this Nest flow.

## Current checkout and environment

- The main implementation is in pushed commit `9ca7d32`. The following six code files are still modified locally: `calendar-sync.scheduler.ts`, `inquiry-holds.scheduler.ts`, `main.ts`, `telegram.service.ts`, `works.scheduler.ts`, and the separate dashboard's `InquiryList.tsx`. This report is a new untracked file until it is committed.
- Those uncommitted changes add `DISABLE_BACKGROUND_JOBS`, allow the API to bind explicitly to a host, and expose “Mark expired” in the dashboard. They are active in local development but **not guaranteed live** on Railway or Vercel. A push to `main` may immediately deploy them through Railway's Git integration.
- Ignored `apps/api/.env` currently uses production database connection strings for local verification but sets `NODE_ENV=development`, `HOST=127.0.0.1`, and `DISABLE_BACKGROUND_JOBS=true`; local Telegram, Gmail, and Supabase storage-write credentials are empty. Ignored `apps/api/.env.production.local` preserves the earlier production settings. Never commit either file.
- The public and dashboard `.env.local` files point to `http://localhost:3001`. At this report's check, local ports 3000, 3001, and 3002 were listening; server availability can change after this conversation.

## Recommended next steps, in order

1. **Decide what to do with the submitted inquiry.** If it was only a test, use the local dashboard's new “Mark expired” action and verify the status changes. Leave it `NEW` if staff should treat it as a real lead. Do not convert a test inquiry casually: conversion holds the selected production dates for 24 hours.
2. **Review and preserve the six local follow-ups.** Run the user-owned checks below, review the diff, and commit the changes. Because Railway auto-deploys `main`, use a review branch or otherwise control when these changes merge into `main`.
3. **Verify the live Railway API deployment.** Confirm it is running the intended commit and that production values for `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `DASHBOARD_URL`, `PUBLIC_URL`, Supabase Storage, and any Telegram webhook secret are set. The API refuses production startup if required reset-email settings are missing. Confirm `/api/health` and the new inquiry route after deployment. The database migration itself is already applied; do not reset the production database.
4. **Verify both live frontend deployments and their environment variables.** Both Vercel projects need `NEXT_PUBLIC_API_BASE_URL=https://nyumbaops-api-production-d06d.up.railway.app` (origin only, without `/api`). The public site needs the separate dashboard's `DASHBOARD_URL`; the dashboard needs `PUBLIC_APP_URL`; both need the matching revalidation secret. Check their build and deployment status before announcing the inquiry flow live. The Vercel CLI is not installed on this machine; `npm i -g vercel` is recommended for environment, deployment, and log work.
5. **Run a controlled live acceptance check after deployment.** On the real public site, confirm property loading, inquiry submission, and the dashboard's `NEW` state. Check owner versus staff permissions and password-reset delivery. Test conversion and 24-hour hold behavior only with agreed dates and a clearly identified test record, since it changes live availability.
6. **Improve backup and test isolation.** Keep the unencrypted dump secure, make an off-device copy under your normal backup policy, and rehearse restoration into an isolated database when available. A separate staging database remains the safer place for future booking and migration tests.
7. **Return to deferred work.** Online payments, webhook idempotency, automatic refunds, full booking-concurrency protection, exact fee/rate calculations, and replacement of the retired Firebase browser test suite remain outside this phase.

### Commands for user-run checks

From the repository root, after reviewing the environment:

```powershell
npm run prisma:generate --workspace api
npm test --workspace api -- --runInBand
npm run test:e2e --workspace api -- --runInBand
npx tsc --noEmit -p apps/api/tsconfig.build.json
npx tsc --noEmit -p apps/public/tsconfig.json
npx tsc --noEmit -p apps/dashboard/tsconfig.json
```

These checks do not replace the browser acceptance steps. The project instruction asks that final hands-on testing be left to the user unless the user explicitly requests that it be run.

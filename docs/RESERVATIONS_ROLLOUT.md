# Reservation rollout and user-run checks

The active API is Nest/PostgreSQL, the public site is `apps/public`, and the staff dashboard is `apps/dashboard`. The 2026-10-01 reservation migration has been prepared in the repository but has **not** been applied to production here.

## Human-run rollout

1. Review the schema migration and make a restorable backup of the target database. Confirm `DATABASE_URL` and `DIRECT_URL` point to an isolated staging database before any migration or flow check; a local `.env` may still point to production. Apply and check the migration in staging first. Do not reset the production database.
   The human-run migration command, with the intended database environment loaded, is `npx prisma migrate deploy --schema apps/api/prisma/schema.prisma`. Check `npx prisma migrate status --schema apps/api/prisma/schema.prisma` before and after.
2. Set `RESERVATIONS_ADMIN_EMAIL` to the one inbox that should receive new and promoted request alerts. Confirm the existing API values for `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and HTTPS `DASHBOARD_URL`. Production API startup now requires the reservation inbox setting.
3. Generate the Prisma client and deploy the API after the migration. The existing `/api/v1/public/inquiries` endpoint remains an alias for the new reservation submission flow during a staggered deployment.
4. Deploy the dashboard and public site after the API. Confirm both still use the Nest API origin in `NEXT_PUBLIC_API_BASE_URL`. Existing dashboard `/bookings` and `/inquiries` links redirect to `/reservations`; booking detail links redirect to `/stays/:id`.
5. Keep background jobs enabled in the deployed API. The reservation scheduler releases expired holds and advances the queue every five minutes; the email worker retries queued messages every minute. `DISABLE_BACKGROUND_JOBS=true` suppresses both for local work.

## Checks to run

Stop the local API if Windows reports that its Prisma query engine DLL is locked, then run these checks yourself. This work deliberately leaves test execution to the user under the repository instruction.

```powershell
npm run prisma:generate --workspace api
npm test --workspace api -- --runInBand
npx tsc --noEmit -p apps/api/tsconfig.build.json
npx tsc --noEmit -p apps/dashboard/tsconfig.json
npx tsc --noEmit -p apps/public/tsconfig.json
```

In an isolated environment, use a property and dates that are safe to change:

1. Submit a request on open dates. Confirm the public receipt says the dates are held but unconfirmed, the reservation appears as **Awaiting review**, the availability calendar shows an amber temporary hold, and the configured inbox plus guest receive emails.
2. Request overlapping dates from another address. Confirm that request is **Queued**, its guest receives a queue email, and the same dates remain selectable for queueing on desktop and mobile.
3. Sign in as STAFF and confirm decisions are unavailable. Sign in as OWNER, accept the first request, and confirm it becomes **Accepted, follow-up** with a new 24-hour expiry. Final confirmation must be a separate action.
4. Reject a held request or allow its hold to expire. Confirm the oldest eligible queued request receives a new hold and both the guest and admin inbox are notified. Check a queued request with different dates is skipped until its full range is free.
5. Finally confirm a request. Confirm the guest receives the confirmation email and the stay appears in **Stays**. Verify that cancellation from Reservations releases dates and advances an eligible queue; verify a synced external booking conflict marks the affected request cancelled and emails the guest.
6. Check failed SMTP delivery leaves an email job pending for retry without losing the reservation. Check older Inquiries appear as legacy records without retroactive holds or emails; an owner can explicitly start review.

Check date overlap using check-in inclusive and check-out exclusive. The earliest selectable date is calculated in the property's `Africa/Blantyre` calendar day. Do not use real guest addresses or live property dates for the staging checks.

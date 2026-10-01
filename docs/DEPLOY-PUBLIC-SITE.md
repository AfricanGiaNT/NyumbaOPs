# Deploy NyumbaOps with the Nest API

The active stack is `apps/api` (Nest/PostgreSQL), `apps/public` (guest website), and `apps/dashboard` (staff dashboard). Firebase Functions and Firestore are retired. Guest payments are not available in this phase; guests submit inquiries and staff confirm payment outside the app.

## Before changing production

1. Back up the PostgreSQL database. Inspect its actual table names and the `_prisma_migrations` history. Some older SQL files in this repository were applied manually, so do not run `prisma migrate deploy` against production until the history is reconciled.
2. Review the additive migration at `apps/api/prisma/migrations/20260928_secure_inquiries_auth/migration.sql` against that database. Apply it in staging first. It adds inquiry and reset-token tables, a booking hold expiry, JWT token versioning, and revokes direct Supabase Data API table access from `anon` and `authenticated`.
3. Check that the Nest database connection still has its required privileges after the grants change. The public and dashboard apps should never connect to PostgreSQL directly.

## API configuration

Set `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `DASHBOARD_URL`, and `PUBLIC_URL` on the API host. `JWT_SECRET` must be a strong random value. The API refuses to start in production if a required reset-email setting is absent. Set `TELEGRAM_WEBHOOK_SECRET` when the Telegram bot is enabled. The API route prefix is `/api`.

The removed `POST /api/auth/setup-password` endpoint has no replacement public bootstrap route. For a new database only, set `BOOTSTRAP_OWNER_EMAIL` and `BOOTSTRAP_OWNER_PASSWORD` (12 or more characters) in a trusted shell and run `npm run bootstrap:owner --workspace api`. Once an owner password exists, use the email reset flow from the dashboard.

## Frontend configuration

The two Next.js applications deploy separately. Set `NEXT_PUBLIC_API_BASE_URL` on **both** to the Nest API origin, such as `https://api.example.com`, without `/api`; the clients append `/api` exactly once. Set `DASHBOARD_URL` on `apps/public` to the separate dashboard origin so old `/dashboard/*` links redirect there. Set `PUBLIC_APP_URL` and `REVALIDATION_SECRET` on `apps/dashboard` for public cache revalidation, and the matching `REVALIDATION_SECRET` on `apps/public`.

Install the Vercel CLI with `npm i -g vercel` if you use Vercel to manage the frontend environments, deployments, and logs. Deploy the API and verified database migration before deploying the updated public site and dashboard. Do not redeploy the old Firebase Functions API.

## User verification

After deployment, test on staging first: browse an active property, check dates, submit an inquiry, see it in the separate dashboard, convert it to a pending booking, confirm its 24-hour expiry, and try the email reset flow. Verify that anonymous users cannot read financial records or upload images, staff cannot access owner-only finance routes, and owners can still manage them. Production migration and deployment should follow only after these checks pass.

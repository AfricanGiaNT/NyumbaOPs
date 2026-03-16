# Deploying NyumbaOPs to Vercel (Single Merged App)

The public site and admin dashboard are merged into **one Next.js app** at `apps/public`.
The dashboard is served under `/dashboard/*` routes.

## Prerequisites

- Vercel account
- Vercel CLI installed (`vercel --version`)
- Cloud Functions already deployed at `https://api-tz2cgdzudq-uc.a.run.app`

---

## Step 1: Set environment variables

```powershell
cd c:\Users\Hp\OneDrive\NyumbaOPs\apps\public
```

Add each variable one at a time. For every one, select **Production + Preview + Development**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api-tz2cgdzudq-uc.a.run.app` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyBZzVtut0HMha1DZWBvhKNcBy_rYBKQWvs` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `nyumbaops.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `nyumbaops` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `nyumbaops.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `429311575602` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:429311575602:web:5fecc401013f9e646cde2b` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | `G-Q6Q5RVWBZZ` |
| `NEXT_PUBLIC_PRODUCTION_API_URL` | `https://api-tz2cgdzudq-uc.a.run.app` |

Example command:
```powershell
vercel env add NEXT_PUBLIC_API_BASE_URL
```

---

## Step 2: Deploy

```powershell
cd c:\Users\Hp\OneDrive\NyumbaOPs\apps\public
vercel --prod
```

If it asks questions:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → Yes (or create new, name it `nyumbaops`)
- **Want to override settings?** → No

**Copy the production URL** (e.g. `https://nyumbaops.vercel.app`).

### If the build fails

Check the build logs on the Vercel web dashboard. Common fixes:
- **Node version error** → Project Settings → General → Node.js Version → **20.x**
- **Dependency error** → Delete `apps/public/pnpm-lock.yaml` and redeploy

---

## Step 3: Add NEXT_PUBLIC_SITE_URL

After deploying, add the site URL env var pointing to itself:

```powershell
vercel env add NEXT_PUBLIC_SITE_URL
```
→ Value: `https://YOUR-VERCEL-URL.vercel.app`

Then redeploy: `vercel --prod`

---

## Step 4: Update Cloud Functions with deployed URL

### 4a. Edit `functions/.env`

```env
PUBLIC_URL=https://YOUR-VERCEL-URL.vercel.app
DASHBOARD_URL=https://YOUR-VERCEL-URL.vercel.app/dashboard
```

### 4b. Rebuild and redeploy functions

```powershell
cd c:\Users\Hp\OneDrive\NyumbaOPs\functions
npm run build
cd c:\Users\Hp\OneDrive\NyumbaOPs
firebase deploy --only functions
```

### 4c. Add Vercel domain to Firebase Auth

Go to [Firebase Console](https://console.firebase.google.com/project/nyumbaops/authentication/settings) → **Settings** → **Authorized domains** and add your Vercel domain (e.g. `nyumbaops.vercel.app`).

---

## Step 5: Configure PayChangu Webhook

Go to your [PayChangu Dashboard](https://paychangu.com) → **Webhook Settings** and set:

```
https://api-tz2cgdzudq-uc.a.run.app/v1/public/webhooks/paychangu
```

---

## Step 6: Test

1. Open `https://YOUR-VERCEL-URL.vercel.app` — public site
2. Open `https://YOUR-VERCEL-URL.vercel.app/dashboard` — admin login
3. Browse a property → Book → Complete payment → Confirm redirect works
4. Log into dashboard → Verify booking appears

---

## URL Summary

| Service | URL |
|---------|-----|
| Public site | `https://YOUR-VERCEL-URL.vercel.app` |
| Dashboard | `https://YOUR-VERCEL-URL.vercel.app/dashboard` |
| Dashboard login | `https://YOUR-VERCEL-URL.vercel.app/dashboard/login` |
| Cloud Functions API | `https://api-tz2cgdzudq-uc.a.run.app` |
| PayChangu webhook | `https://api-tz2cgdzudq-uc.a.run.app/v1/public/webhooks/paychangu` |

---

## Local development

Your local `.env.local` files still point to the emulators. No changes needed for local dev.

- **Public site**: `http://localhost:3000`
- **Dashboard**: `http://localhost:3000/dashboard`
- **Functions .env**: Keep `PUBLIC_URL=http://localhost:3000` for local testing

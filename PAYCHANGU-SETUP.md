# PayChangu Payment Integration - Setup Guide

Complete guide to set up and configure PayChangu payment gateway for NyumbaOPs.

## Prerequisites

- [ ] PayChangu account (sandbox or production)
- [ ] Node.js and npm installed
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] ngrok installed (for local webhook testing): https://ngrok.com/download

## Step 1: Get PayChangu Credentials

### For Sandbox Testing (Recommended First)

1. **Sign up for PayChangu:**
   - Visit https://paychangu.com
   - Create an account
   - Navigate to Dashboard → Settings → API Keys

2. **Obtain API Keys:**
   - **Public Key**: `pk_sandbox_xxxxx` (used in frontend if needed)
   - **Secret Key**: `sk_sandbox_xxxxx` (used in backend)
   - **Webhook Secret**: `whsec_xxxxx` (for webhook signature verification)

3. **Save credentials securely** - you'll need them in the next step

### For Production (After Testing)

- Follow the same process but use production keys
- Ensure your business is verified with PayChangu
- Test thoroughly in sandbox before switching to production

---

## Step 2: Configure Environment Variables

### Option A: Local Development (Firebase Emulator)

1. **Create `.env` file in `functions/` directory:**

```bash
cd functions
cp .env.example .env
```

2. **Edit `functions/.env` with your credentials:**

```env
# Replace with your actual PayChangu credentials
PAYCHANGU_PUBLIC_KEY=PUB-TEST-lU3cD0LiVVIhrVICng1C3kYgmasNZQIb
PAYCHANGU_SECRET_KEY=SEC-TEST-08F1q9xOjLqsVa6w6gABH7ChMxZJiBPW
PAYCHANGU_WEBHOOK_SECRET=pcg_whsec_7F4kN2pYt9qM6sV1xA8eL0zH3cR5bT7uJ9wQ4dX2
PAYCHANGU_ENVIRONMENT=sandbox

# Leave this for now - we'll update it after setting up ngrok
PAYCHANGU_WEBHOOK_URL=https://placeholder.ngrok.io/nyumbaops/us-central1/api/v1/public/webhooks/paychangu

PUBLIC_URL=http://localhost:3001
DASHBOARD_URL=http://localhost:3000
```

3. **Add `.env` to `.gitignore`** (should already be there):

```bash
# Verify it's ignored
cat functions/.gitignore | grep .env
```

### Option B: Firebase Functions Config (Production)

```bash
# Navigate to functions directory
cd functions

# Set PayChangu credentials
firebase functions:config:set \
  paychangu.public_key="pk_sandbox_xxxxx" \
  paychangu.secret_key="sk_sandbox_xxxxx" \
  paychangu.webhook_secret="whsec_xxxxx" \
  paychangu.environment="sandbox"

# Set webhook URL (update after deployment)
firebase functions:config:set \
  paychangu.webhook_url="https://us-central1-nyumbaops.cloudfunctions.net/api/v1/public/webhooks/paychangu"

# View current configuration
firebase functions:config:get
```

**Note:** Firebase Functions config is for deployed functions. For local emulator, use `.env` file.

---

## Step 3: Set Up Webhook Testing with ngrok

PayChangu needs to send webhooks to your local server. We'll use ngrok to create a public URL.

### Install ngrok

**Windows:**
```powershell
# Download from https://ngrok.com/download
# Or use Chocolatey:
choco install ngrok
```

**Mac/Linux:**
```bash
brew install ngrok
# Or download from https://ngrok.com/download
```

### Start ngrok Tunnel

1. **Start Firebase Emulator** (in one terminal):

```bash
cd c:\Users\Hp\OneDrive\NyumbaOPs
npm run emulators
```

Wait for emulators to start. You should see:
```
✔  functions[us-central1-api]: http function initialized (http://127.0.0.1:5001/nyumbaops/us-central1/api).
```

2. **Start ngrok** (in another terminal):

```bash
ngrok http 5001
```

You'll see output like:
```
Forwarding  https://abc123def456.ngrok.io -> http://localhost:5001
```

3. **Copy the HTTPS URL** (e.g., `https://abc123def456.ngrok.io`)

4. **Update webhook URL in `functions/.env`:**

```env
PAYCHANGU_WEBHOOK_URL=https://abc123def456.ngrok.io/nyumbaops/us-central1/api/v1/public/webhooks/paychangu
```

5. **Restart Firebase Emulator** to load new environment variable:

```bash
# Stop emulator (Ctrl+C)
# Start again
npm run emulators
```

### Configure Webhook in PayChangu Dashboard

1. Log in to PayChangu dashboard
2. Navigate to **Settings → Webhooks**
3. Add webhook URL:
   ```
   https://abc123def456.ngrok.io/nyumbaops/us-central1/api/v1/public/webhooks/paychangu
   ```
4. Select events to listen for:
   - `payment.success`
   - `payment.failed`
5. Save configuration

**Important:** ngrok URLs change each time you restart ngrok (on free plan). You'll need to update the webhook URL in PayChangu dashboard each time.

---

## Step 4: Start the Applications

### Terminal 1: Firebase Emulator
```bash
cd c:\Users\Hp\OneDrive\NyumbaOPs
npm run emulators
```

### Terminal 2: ngrok
```bash
ngrok http 5001
```

### Terminal 3: Dashboard App
```bash
cd c:\Users\Hp\OneDrive\NyumbaOPs\apps\dashboard
npm run dev
```

### Terminal 4: Public App (Optional)
```bash
cd c:\Users\Hp\OneDrive\NyumbaOPs\apps\public
npm run dev
```

---

## Step 5: Verify Setup

### Test API Connection

Run this PowerShell command to test PayChangu API:

```powershell
$headers = @{
    "Authorization" = "Bearer sk_sandbox_YOUR_SECRET_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    amount = 1000
    currency = "MWK"
    first_name = "Test"
    last_name = "User"
    email = "test@example.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.paychangu.com/sandbox/payment/checkout" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

**Expected Response:**
```json
{
  "status": "success",
  "checkout_id": "chk_xxxxx",
  "checkout_url": "https://checkout.paychangu.com/xxxxx"
}
```

### Test Webhook Endpoint

```powershell
# Test webhook endpoint is accessible
Invoke-RestMethod -Uri "http://localhost:5001/nyumbaops/us-central1/api/v1/public/webhooks/paychangu" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"event":"payment.success","data":{"checkout_id":"test123"}}'
```

**Expected:** Should return `{"received":true}` (signature validation will fail, but endpoint is working)

---

## Step 6: Run Test Flow

Now you're ready to test the full payment flow! See `PAYCHANGU-TESTING.md` for detailed testing procedures.

**Quick Test:**

1. Open dashboard: http://localhost:3000
2. Create a booking with a guest and property
3. Go to booking detail page
4. Click "Add payment" → "PayChangu link" tab
5. Click "Generate link"
6. Copy the payment link and open in browser
7. Complete payment using PayChangu sandbox test credentials
8. Check Firebase Functions logs for webhook receipt
9. Refresh booking page to see payment reflected

---

## Troubleshooting

### Issue: "Failed to create PayChangu checkout"

**Cause:** Invalid API credentials or network issue

**Solution:**
1. Verify API keys are correct in `.env`
2. Check you're using sandbox keys with sandbox environment
3. Test API connection with curl/PowerShell command above
4. Check Firebase Functions logs: `firebase functions:log`

### Issue: Webhook not received

**Cause:** ngrok URL not configured or expired

**Solution:**
1. Verify ngrok is running: check terminal for active tunnel
2. Copy current ngrok URL and update in PayChangu dashboard
3. Restart Firebase Emulator after changing webhook URL
4. Test webhook endpoint directly (see Step 5)

### Issue: "Invalid signature" on webhook

**Cause:** Webhook secret mismatch

**Solution:**
1. Verify `PAYCHANGU_WEBHOOK_SECRET` matches PayChangu dashboard
2. Ensure webhook secret is set in `.env`
3. Restart Firebase Emulator after changing secret

### Issue: Payment link works but booking not updating

**Cause:** Webhook received but handler failed

**Solution:**
1. Check Firebase Functions logs for errors
2. Verify `paychanguCheckoutId` in payment record matches webhook
3. Ensure booking exists and is not cancelled
4. Check database permissions

---

## Production Deployment

### Before Going Live:

1. **Get Production Credentials:**
   - Obtain production API keys from PayChangu
   - Ensure business verification is complete

2. **Update Configuration:**
   ```bash
   firebase functions:config:set \
     paychangu.public_key="pk_live_xxxxx" \
     paychangu.secret_key="sk_live_xxxxx" \
     paychangu.webhook_secret="whsec_live_xxxxx" \
     paychangu.environment="production"
   ```

3. **Deploy Functions:**
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions
   ```

4. **Configure Production Webhook:**
   - Get deployed function URL from Firebase Console
   - Add to PayChangu dashboard:
     ```
     https://us-central1-nyumbaops.cloudfunctions.net/api/v1/public/webhooks/paychangu
     ```

5. **Test in Production:**
   - Create test booking with small amount
   - Generate payment link
   - Complete real payment
   - Verify webhook received and booking updated

6. **Monitor:**
   - Set up alerts for webhook failures
   - Monitor Firebase Functions logs
   - Track payment reconciliation

---

## Security Checklist

- [ ] API keys stored in environment variables (not in code)
- [ ] `.env` file added to `.gitignore`
- [ ] Webhook signature verification enabled
- [ ] HTTPS enforced on all endpoints
- [ ] Rate limiting configured
- [ ] Audit logging enabled for all payment actions
- [ ] Production credentials separate from sandbox

---

## Next Steps

1. ✅ Complete this setup guide
2. 📋 Follow testing procedures in `PAYCHANGU-TESTING.md`
3. 📚 Review troubleshooting guide in `PAYCHANGU-TROUBLESHOOTING.md`
4. 🚀 Deploy to production when testing passes

---

## Support Resources

- **PayChangu Documentation:** https://docs.paychangu.com
- **PayChangu Support:** support@paychangu.com
- **Firebase Functions Logs:** `firebase functions:log`
- **ngrok Documentation:** https://ngrok.com/docs

---

**Last Updated:** February 2026

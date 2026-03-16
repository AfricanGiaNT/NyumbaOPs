# PayChangu Integration - Quick Start Guide

Get PayChangu payment system running in 15 minutes.

## Prerequisites Checklist

- [ ] PayChangu sandbox account: https://paychangu.com
- [ ] ngrok installed: https://ngrok.com/download
- [ ] Firebase Emulator running
- [ ] Dashboard app running

---

## Step 1: Get PayChangu Credentials (5 min)

1. Sign up at https://paychangu.com
2. Navigate to **Dashboard → Settings → API Keys**
3. Copy these credentials:
   - Public Key: `pk_sandbox_xxxxx`
   - Secret Key: `sk_sandbox_xxxxx`
   - Webhook Secret: `whsec_xxxxx`

---

## Step 2: Configure Environment (2 min)

1. **Create environment file:**
   ```powershell
   cd functions
   cp .env.example .env
   ```

2. **Edit `functions/.env`** with your credentials:
   ```env
   PAYCHANGU_PUBLIC_KEY=pk_sandbox_xxxxx
   PAYCHANGU_SECRET_KEY=sk_sandbox_xxxxx
   PAYCHANGU_WEBHOOK_SECRET=whsec_xxxxx
   PAYCHANGU_ENVIRONMENT=sandbox
   ```

---

## Step 3: Start Services (3 min)

**Terminal 1 - Firebase Emulator:**
```powershell
cd c:\Users\Hp\OneDrive\NyumbaOPs
npm run emulators
```

**Terminal 2 - ngrok:**
```powershell
ngrok http 5001
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

**Terminal 3 - Dashboard:**
```powershell
cd apps\dashboard
npm run dev
```

---

## Step 4: Configure Webhook (2 min)

1. Update `functions/.env` with ngrok URL:
   ```env
   PAYCHANGU_WEBHOOK_URL=https://abc123.ngrok.io/nyumbaops/us-central1/api/v1/public/webhooks/paychangu
   ```

2. Restart Firebase Emulator (Ctrl+C, then `npm run emulators`)

3. In PayChangu dashboard:
   - Go to **Settings → Webhooks**
   - Add webhook URL: `https://abc123.ngrok.io/nyumbaops/us-central1/api/v1/public/webhooks/paychangu`
   - Enable events: `payment.success`, `payment.failed`
   - Save

---

## Step 5: Test Payment Flow (3 min)

1. **Open dashboard:** http://localhost:3000

2. **Create booking:**
   - Navigate to Bookings
   - Click "+ Add Booking"
   - Create/select guest and property
   - Save booking

3. **Generate payment link:**
   - Open booking detail page
   - Click "Add payment"
   - Switch to "PayChangu link" tab
   - Click "Generate link"
   - Copy the payment link

4. **Complete payment:**
   - Open payment link in browser
   - Use test card: **4242 4242 4242 4242**
   - Any future expiry, any CVC
   - Complete payment

5. **Verify:**
   - Check Firebase Functions logs for webhook
   - Refresh booking page
   - Payment should appear with status COMPLETED

---

## Quick Test Script

Run automated tests:
```powershell
.\test-paychangu.ps1
```

Generate payment link:
```powershell
.\generate-payment-link.ps1 -BookingId "your_booking_id" -AuthToken "your_token"
```

---

## Troubleshooting

**Link generation fails?**
→ Check API credentials in `functions/.env`

**Webhook not received?**
→ Verify ngrok URL in PayChangu dashboard

**Payment not updating?**
→ Check Firebase Functions logs for errors

**Full troubleshooting:** See `PAYCHANGU-TROUBLESHOOTING.md`

---

## Next Steps

- [ ] Complete full test suite: `PAYCHANGU-TESTING.md`
- [ ] Review troubleshooting guide: `PAYCHANGU-TROUBLESHOOTING.md`
- [ ] Test all payment methods
- [ ] Prepare for production deployment

---

## Support

- **Setup issues:** `PAYCHANGU-SETUP.md`
- **Testing guide:** `PAYCHANGU-TESTING.md`
- **Troubleshooting:** `PAYCHANGU-TROUBLESHOOTING.md`
- **PayChangu docs:** https://docs.paychangu.com

---

**Estimated Total Time:** 15 minutes  
**Last Updated:** February 2026

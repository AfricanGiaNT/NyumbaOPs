# PayChangu Payment Integration - Troubleshooting Guide

Common issues and solutions for PayChangu payment integration in NyumbaOPs.

---

## Quick Diagnostics

Run the automated test script first:
```powershell
.\test-paychangu.ps1
```

Check Firebase Functions logs:
```bash
firebase functions:log
# Or in real-time:
firebase emulators:start --only functions,firestore,auth
```

---

## Issue 1: Payment Link Generation Fails

### Symptom
- Clicking "Generate link" shows error: "Failed to create PayChangu checkout"
- No payment link appears in modal

### Possible Causes & Solutions

#### A. Invalid API Credentials

**Check:**
```powershell
# Verify .env file exists
Test-Path functions\.env

# Check if credentials are set
Get-Content functions\.env | Select-String "PAYCHANGU"
```

**Solution:**
1. Verify credentials in PayChangu dashboard
2. Update `functions/.env`:
   ```env
   PAYCHANGU_PUBLIC_KEY=pk_sandbox_xxxxx
   PAYCHANGU_SECRET_KEY=sk_sandbox_xxxxx
   PAYCHANGU_WEBHOOK_SECRET=whsec_xxxxx
   PAYCHANGU_ENVIRONMENT=sandbox
   ```
3. Restart Firebase Emulator

**Test API credentials directly:**
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_SECRET_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    amount = 1000
    currency = "MWK"
    first_name = "Test"
    last_name = "User"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.paychangu.com/sandbox/payment/checkout" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

**Expected:** Should return `checkout_id` and `checkout_url`

#### B. Wrong Environment Setting

**Check:**
```powershell
Get-Content functions\.env | Select-String "PAYCHANGU_ENVIRONMENT"
```

**Solution:**
- For testing: `PAYCHANGU_ENVIRONMENT=sandbox`
- For production: `PAYCHANGU_ENVIRONMENT=production`
- Must match your API keys (sandbox keys with sandbox environment)

#### C. Network/Firewall Issues

**Check:**
```powershell
# Test connectivity to PayChangu API
Test-NetConnection -ComputerName api.paychangu.com -Port 443
```

**Solution:**
- Check firewall settings
- Verify proxy configuration
- Try from different network

#### D. Booking Issues

**Check Firebase Functions logs for:**
- "Booking not found"
- "Booking is fully paid"
- "Booking is cancelled"

**Solution:**
- Verify booking exists in Firestore
- Check booking has `totalAmount > amountPaid`
- Ensure booking status is not CANCELLED

---

## Issue 2: Webhook Not Received

### Symptom
- Payment completed on PayChangu checkout
- Booking not updating
- No webhook logs in Firebase Functions

### Possible Causes & Solutions

#### A. ngrok Tunnel Not Running

**Check:**
```powershell
# Look for active ngrok process
Get-Process ngrok -ErrorAction SilentlyContinue
```

**Solution:**
1. Start ngrok:
   ```bash
   ngrok http 5001
   ```
2. Copy HTTPS URL (e.g., `https://abc123.ngrok.io`)
3. Update webhook URL in PayChangu dashboard
4. Update `functions/.env`:
   ```env
   PAYCHANGU_WEBHOOK_URL=https://abc123.ngrok.io/nyumbaops/us-central1/api/v1/public/webhooks/paychangu
   ```
5. Restart Firebase Emulator

**Note:** Free ngrok URLs change on restart. Update webhook URL each time.

#### B. Incorrect Webhook URL

**Check PayChangu dashboard:**
- Settings → Webhooks
- Verify URL matches current ngrok URL
- Format: `https://YOUR_NGROK_URL/nyumbaops/us-central1/api/v1/public/webhooks/paychangu`

**Test webhook endpoint:**
```powershell
$webhookUrl = "http://localhost:5001/nyumbaops/us-central1/api/v1/public/webhooks/paychangu"

Invoke-RestMethod -Uri $webhookUrl `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"event":"payment.success","data":{"checkout_id":"test123"}}'
```

**Expected:** `{"received":true}` (may fail signature validation, but endpoint is accessible)

#### C. Webhook Events Not Configured

**Check PayChangu dashboard:**
- Settings → Webhooks
- Ensure these events are enabled:
  - `payment.success`
  - `payment.failed`

**Solution:**
- Enable required webhook events
- Save configuration
- Retry payment

#### D. Firebase Emulator Not Running

**Check:**
```powershell
# Test if emulator is accessible
Invoke-RestMethod -Uri "http://localhost:5001/nyumbaops/us-central1/api/v1/public/properties"
```

**Solution:**
```bash
# Start emulator
cd c:\Users\Hp\OneDrive\NyumbaOPs
npm run emulators
```

---

## Issue 3: Webhook Received But Payment Not Updated

### Symptom
- Webhook logged in Firebase Functions
- Payment status still PENDING
- Booking amounts not updated

### Possible Causes & Solutions

#### A. Invalid Webhook Signature

**Check Firebase Functions logs for:**
- "Invalid signature"
- 401 Unauthorized

**Solution:**
1. Verify `PAYCHANGU_WEBHOOK_SECRET` in `functions/.env`
2. Ensure it matches PayChangu dashboard webhook secret
3. Restart Firebase Emulator

**Debug signature:**
```typescript
// Temporarily add logging in functions/src/lib/paychangu.ts
console.log('Received signature:', signature);
console.log('Expected signature:', expectedSignature);
```

#### B. Checkout ID Mismatch

**Check Firebase Functions logs for:**
- "Payment not found for checkout"

**Verify in Firestore:**
1. Open Firebase Emulator UI: http://localhost:4000
2. Navigate to `payments` collection
3. Find payment record
4. Check `paychanguCheckoutId` field
5. Compare with webhook `checkout_id`

**Solution:**
- If mismatch, payment link may have been regenerated
- Use latest payment link
- Check for duplicate payments

#### C. Booking Not Found

**Check Firebase Functions logs for:**
- "Booking not found"

**Solution:**
1. Verify booking exists in Firestore
2. Check `bookingId` in payment record matches actual booking
3. Ensure booking not deleted

#### D. Handler Function Error

**Check Firebase Functions logs for:**
- JavaScript errors
- Database permission errors
- Null reference errors

**Common errors:**
```
TypeError: Cannot read property 'amount' of undefined
→ Payment record missing required field

Error: Missing or insufficient permissions
→ Firestore security rules blocking update
```

**Solution:**
- Review `handlePaymentSuccess` function in `functions/src/index.ts`
- Check all required fields exist
- Verify Firestore security rules allow system updates

---

## Issue 4: Payment Link Opens But Shows Error

### Symptom
- Payment link opens
- PayChangu checkout shows error message
- Cannot complete payment

### Possible Causes & Solutions

#### A. Link Expired

**Check:**
- Payment links expire after 24 hours
- Check `paymentLinkExpiresAt` in payment record

**Solution:**
- Generate new payment link
- Complete payment within 24 hours

#### B. Invalid Amount

**Check PayChangu error message:**
- "Amount too low" (minimum varies by payment method)
- "Invalid currency"

**Solution:**
- Ensure amount meets PayChangu minimums
- Verify currency is supported (MWK, GBP)

#### C. Payment Method Unavailable

**Check:**
- Some payment methods may be unavailable in sandbox
- Test with different payment method

**Solution:**
- Try test card: 4242 4242 4242 4242
- Contact PayChangu support for sandbox limitations

---

## Issue 5: Manual Payment Not Creating Transaction

### Symptom
- Manual payment recorded successfully
- Payment appears in booking
- No revenue transaction created

### Possible Causes & Solutions

#### A. Category Not Found

**Check Firebase Functions logs for:**
- "Category not found"
- "Booking category missing"

**Solution:**
1. Open Firestore in Firebase Emulator UI
2. Check `categories` collection
3. Ensure "Booking" category exists with `type: "REVENUE"`
4. If missing, create manually or run seed script

**Create category manually:**
```javascript
// In Firebase Emulator UI → Firestore
{
  name: "Booking",
  type: "REVENUE",
  isSystem: true,
  createdBy: "SYSTEM",
  createdAt: "2026-02-09T00:00:00Z",
  updatedAt: "2026-02-09T00:00:00Z"
}
```

#### B. Permission Error

**Check Firebase Functions logs for:**
- "Permission denied"
- "Missing or insufficient permissions"

**Solution:**
- Review Firestore security rules
- Ensure authenticated users can create transactions
- Check user has valid auth token

---

## Issue 6: Dashboard Not Showing Updated Payments

### Symptom
- Payment completed successfully
- Webhook processed
- Dashboard still shows old amounts

### Possible Causes & Solutions

#### A. Cache Not Refreshed

**Solution:**
- Hard refresh browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Clear browser cache
- Try incognito/private window

#### B. Real-time Updates Not Working

**Solution:**
- Refresh page manually
- Check browser console for errors
- Verify Firebase connection

#### C. Data Not Synced

**Check:**
1. Open Firebase Emulator UI
2. Verify booking amounts updated in Firestore
3. Check payment status is COMPLETED

**Solution:**
- If Firestore correct but UI wrong: Browser cache issue
- If Firestore wrong: Webhook handler issue (see Issue 3)

---

## Issue 7: Multiple Payments for Same Checkout

### Symptom
- Duplicate payment records
- Booking overpaid
- Multiple transactions created

### Possible Causes & Solutions

#### A. Webhook Sent Multiple Times

**Check:**
- PayChangu may retry webhooks on failure
- Webhook handler should be idempotent

**Solution:**
- Current implementation handles this correctly
- Payment status updated to COMPLETED prevents duplicates
- If issue persists, check `paychanguCheckoutId` uniqueness

#### B. User Clicked Generate Link Multiple Times

**Check Firestore:**
- Multiple payment records with same `bookingId`
- Different `paychanguCheckoutId` values

**Solution:**
- This is expected behavior
- Only completed payments affect booking
- Failed/pending payments can be ignored

---

## Issue 8: Production Deployment Issues

### Symptom
- Works in emulator but fails in production
- Webhook not received in production

### Possible Causes & Solutions

#### A. Environment Variables Not Set

**Check:**
```bash
firebase functions:config:get
```

**Solution:**
```bash
firebase functions:config:set \
  paychangu.public_key="pk_live_xxxxx" \
  paychangu.secret_key="sk_live_xxxxx" \
  paychangu.webhook_secret="whsec_live_xxxxx" \
  paychangu.environment="production"
```

#### B. Webhook URL Not Updated

**Solution:**
1. Get deployed function URL from Firebase Console
2. Update in PayChangu dashboard:
   ```
   https://us-central1-nyumbaops.cloudfunctions.net/api/v1/public/webhooks/paychangu
   ```
3. Test webhook delivery

#### C. CORS Issues

**Check browser console for:**
- "CORS policy blocked"
- "Access-Control-Allow-Origin"

**Solution:**
- Verify `allowedOrigins` in `functions/src/index.ts`
- Add production dashboard URL
- Redeploy functions

---

## Debugging Tools

### 1. Firebase Functions Logs

**Real-time:**
```bash
firebase emulators:start --only functions,firestore,auth
# Logs appear in terminal
```

**Historical:**
```bash
firebase functions:log --limit 50
```

### 2. Firestore Data Inspection

**Emulator UI:**
```
http://localhost:4000
```

Navigate to:
- `bookings` - Check booking amounts and status
- `payments` - Check payment records and status
- `transactions` - Check revenue transactions
- `audit_logs` - Check action history

### 3. Network Inspection

**Browser DevTools:**
- F12 → Network tab
- Filter: XHR
- Look for API calls to `/payment-link` and `/payments`

**ngrok Inspection:**
```
http://127.0.0.1:4040
```
- Shows all requests through ngrok tunnel
- Useful for debugging webhook delivery

### 4. PayChangu Dashboard

**Check:**
- Transactions → View payment status
- Webhooks → View delivery attempts
- Logs → View API calls

---

## Common Error Messages

### "Failed to create PayChangu checkout"
→ See Issue 1: Payment Link Generation Fails

### "Invalid signature"
→ See Issue 3A: Invalid Webhook Signature

### "Booking not found"
→ See Issue 3C: Booking Not Found

### "Payment exceeds remaining balance"
→ Overpayment validation working correctly. Check booking amounts.

### "Cannot add payment to a cancelled booking"
→ Validation working correctly. Booking must be active.

### "Booking is fully paid"
→ Validation working correctly. Cannot generate link for fully paid booking.

---

## Performance Issues

### Slow Payment Link Generation (>5 seconds)

**Causes:**
- Slow PayChangu API response
- Network latency
- Large database queries

**Solutions:**
- Check network connection
- Verify PayChangu API status
- Contact PayChangu support if persistent

### Webhook Processing Delay (>10 seconds)

**Causes:**
- Cold start (first request after idle)
- Complex database operations
- Network issues

**Solutions:**
- Expected on first webhook after idle
- Subsequent webhooks should be faster (<1 second)
- Monitor Firebase Functions metrics

---

## Getting Help

### Before Asking for Help

1. ✅ Run automated test: `.\test-paychangu.ps1`
2. ✅ Check Firebase Functions logs
3. ✅ Review this troubleshooting guide
4. ✅ Test with PayChangu sandbox first
5. ✅ Document exact error messages

### Support Resources

**PayChangu:**
- Documentation: https://docs.paychangu.com
- Support: support@paychangu.com
- Dashboard: https://paychangu.com/dashboard

**Firebase:**
- Documentation: https://firebase.google.com/docs
- Console: https://console.firebase.google.com

**Project Documentation:**
- Setup: `PAYCHANGU-SETUP.md`
- Testing: `PAYCHANGU-TESTING.md`
- Technical Specs: `Project reference docs/Technical-specs.md`

---

## Preventive Measures

### Regular Checks

- [ ] Verify ngrok tunnel active (if testing locally)
- [ ] Check PayChangu API status before testing
- [ ] Review Firebase Functions logs daily
- [ ] Monitor webhook delivery success rate
- [ ] Test payment flow after code changes

### Best Practices

- Always test in sandbox before production
- Keep PayChangu credentials secure
- Monitor payment reconciliation
- Set up alerts for webhook failures
- Document any custom modifications

---

**Last Updated:** February 2026

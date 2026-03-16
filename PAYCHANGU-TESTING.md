# PayChangu Payment Integration - Testing Guide

Comprehensive testing procedures for the PayChangu payment system in NyumbaOPs.

## Prerequisites

- [ ] Completed setup in `PAYCHANGU-SETUP.md`
- [ ] Firebase Emulator running
- [ ] ngrok tunnel active
- [ ] Dashboard app running (http://localhost:3000)
- [ ] PayChangu sandbox credentials configured

---

## Test Suite Overview

1. **Manual Payment Flow** - Test existing manual payment recording
2. **PayChangu Link Generation** - Test payment link creation
3. **Payment Success Flow** - Test successful payment webhook
4. **Payment Failure Flow** - Test failed payment webhook
5. **Edge Cases** - Test error handling and validation
6. **End-to-End Integration** - Full booking-to-payment flow

---

## Test 1: Manual Payment Flow

**Purpose:** Verify manual payment recording works correctly (baseline functionality)

### Steps:

1. **Create Test Booking:**
   - Navigate to http://localhost:3000/bookings
   - Click "+ Add Booking"
   - Select or create a guest
   - Select a property
   - Set check-in: Tomorrow
   - Set check-out: 3 days from tomorrow
   - Save booking

2. **Record Manual Payment:**
   - Click on the booking to open detail page
   - Note the `Total` and `Paid` amounts
   - Click "Add payment" button
   - Stay on "Manual payment" tab
   - Enter amount: 50000 (MWK)
   - Select method: "Mobile Money (generic)"
   - Enter reference: "TEST-AIRTEL-123456"
   - Enter notes: "Test manual payment"
   - Click "Record payment"

3. **Verify Results:**
   - [ ] Payment appears in payments list
   - [ ] Amount shows: 50000 MWK
   - [ ] Method shows: MOBILE_MONEY
   - [ ] Status shows: COMPLETED
   - [ ] Booking "Paid" amount increased by 50000
   - [ ] Payment status updated (UNPAID → PARTIAL or PAID)

4. **Verify Transaction Created:**
   - Navigate to http://localhost:3000 (dashboard home)
   - Check recent transactions
   - [ ] New REVENUE transaction exists
   - [ ] Amount matches payment (50000)
   - [ ] Notes mention booking ID
   - [ ] Category is "Booking"

### Expected Behavior:
✅ Payment recorded immediately  
✅ Booking amounts updated  
✅ Revenue transaction auto-created  
✅ No errors in console

---

## Test 2: PayChangu Link Generation

**Purpose:** Verify payment link creation and PayChangu API integration

### Steps:

1. **Create Booking with Balance:**
   - Create a new booking (or use existing with remaining balance)
   - Ensure `Total Amount` > `Amount Paid`

2. **Generate Payment Link:**
   - Open booking detail page
   - Click "Add payment" button
   - Switch to "PayChangu link" tab
   - Note the remaining balance shown
   - Click "Generate link" button
   - Wait for link to appear (should be ~2-3 seconds)

3. **Verify Link Details:**
   - [ ] Payment link displayed in modal
   - [ ] Link format: `https://checkout.paychangu.com/...`
   - [ ] Amount shown matches remaining balance
   - [ ] Expiry time shown (24 hours from now)
   - [ ] No error messages

4. **Test Payment Link:**
   - Copy the payment link
   - Open in new browser tab/incognito window
   - [ ] PayChangu checkout page loads
   - [ ] Property name shown in title
   - [ ] Correct amount displayed
   - [ ] Guest name pre-filled (if email provided)
   - [ ] Payment methods available (Airtel Money, TNM Mpamba, Card)

5. **Check Database:**
   - Open Firebase Emulator UI: http://localhost:4000
   - Navigate to Firestore → `payments` collection
   - Find the payment record
   - [ ] `bookingId` matches
   - [ ] `amount` correct
   - [ ] `status` is "PENDING"
   - [ ] `paychanguCheckoutId` exists
   - [ ] `paymentLink` matches generated link
   - [ ] `paymentLinkExpiresAt` set to 24 hours from now

### Expected Behavior:
✅ Link generated successfully  
✅ PayChangu checkout page accessible  
✅ Payment record created with PENDING status  
✅ Checkout ID stored for webhook matching

### Troubleshooting:
❌ **"Failed to create PayChangu checkout"**
- Check Firebase Functions logs: `firebase functions:log`
- Verify API keys in `functions/.env`
- Test API connection (see PAYCHANGU-SETUP.md Step 5)

---

## Test 3: Payment Success Flow

**Purpose:** Verify webhook handling and automatic payment processing

### Steps:

1. **Generate Payment Link:**
   - Follow Test 2 steps to generate a payment link
   - Keep booking detail page open

2. **Complete Payment:**
   - Open payment link in browser
   - Select payment method: **Airtel Money** (or test card)
   - Enter test credentials:
     - **Airtel Money Test Number:** Use PayChangu sandbox test number
     - **Test Card:** 4242 4242 4242 4242, any future expiry, any CVC
   - Complete payment

3. **Monitor Webhook:**
   - Watch Firebase Functions logs in terminal
   - Look for: `"Webhook received: payment.success"`
   - Check for any errors in webhook processing

4. **Verify Payment Updated:**
   - Refresh booking detail page
   - [ ] New payment appears in list
   - [ ] Payment status: COMPLETED
   - [ ] Payment method updated (MOBILE_MONEY or CARD)
   - [ ] Reference/transaction ID populated
   - [ ] Booking "Paid" amount increased
   - [ ] Payment status updated (PARTIAL or PAID)

5. **Verify Transaction Created:**
   - Navigate to dashboard home
   - [ ] New REVENUE transaction exists
   - [ ] Amount matches payment
   - [ ] Notes: "PayChangu payment for booking..."
   - [ ] Property linked correctly
   - [ ] Created by: SYSTEM

6. **Check Audit Log:**
   - Firebase Emulator UI → Firestore → `audit_logs`
   - [ ] Payment UPDATE action logged
   - [ ] Booking UPDATE action logged (if status changed)
   - [ ] Transaction CREATE action logged

### Expected Behavior:
✅ Webhook received within 5 seconds of payment  
✅ Payment status updated automatically  
✅ Booking amounts updated  
✅ Revenue transaction created  
✅ No manual intervention needed

### Troubleshooting:
❌ **Webhook not received**
- Check ngrok is running: `ngrok http 5001`
- Verify webhook URL in PayChangu dashboard matches ngrok URL
- Test webhook endpoint manually (see test script below)

❌ **Webhook received but payment not updated**
- Check Firebase Functions logs for errors
- Verify `paychanguCheckoutId` matches between payment and webhook
- Ensure booking exists and is not cancelled

---

## Test 4: Payment Failure Flow

**Purpose:** Verify failed payment handling

### Steps:

1. **Generate Payment Link:**
   - Create payment link for a booking

2. **Simulate Failed Payment:**
   - Open payment link
   - Use PayChangu test card that fails: **4000 0000 0000 0002**
   - Or cancel payment before completing

3. **Monitor Webhook:**
   - Watch for: `"Webhook received: payment.failed"`

4. **Verify Payment Updated:**
   - Refresh booking detail page
   - [ ] Payment status: FAILED
   - [ ] Failure reason in notes
   - [ ] Booking amounts unchanged
   - [ ] No transaction created

5. **Verify User Can Retry:**
   - [ ] Can generate new payment link
   - [ ] Previous failed payment still visible
   - [ ] Remaining balance still correct

### Expected Behavior:
✅ Failed payment marked as FAILED  
✅ Failure reason captured  
✅ Booking amounts not affected  
✅ User can retry payment

---

## Test 5: Edge Cases & Validation

### Test 5.1: Overpayment Prevention

1. Create booking with total: 100,000 MWK
2. Record manual payment: 60,000 MWK
3. Try to record payment: 50,000 MWK (would exceed total)
4. [ ] Should reject with error: "Payment exceeds remaining balance"

### Test 5.2: Fully Paid Booking

1. Create booking with total: 100,000 MWK
2. Record payment: 100,000 MWK
3. Try to generate PayChangu link
4. [ ] Should reject with error: "Booking is fully paid"

### Test 5.3: Cancelled Booking

1. Create booking
2. Update status to CANCELLED
3. Try to add payment
4. [ ] Should reject with error: "Cannot add payment to a cancelled booking"

### Test 5.4: Invalid Webhook Signature

1. Send webhook with incorrect signature:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:5001/nyumbaops/us-central1/api/v1/public/webhooks/paychangu" `
     -Method POST `
     -Headers @{"x-paychangu-signature"="invalid_signature"} `
     -ContentType "application/json" `
     -Body '{"event":"payment.success","data":{"checkout_id":"test123"}}'
   ```
2. [ ] Should return 401 Unauthorized
3. [ ] Should not process payment

### Test 5.5: Missing Checkout ID

1. Send webhook without checkout_id:
   ```powershell
   # Generate valid signature first (see test script)
   Invoke-RestMethod -Uri "http://localhost:5001/nyumbaops/us-central1/api/v1/public/webhooks/paychangu" `
     -Method POST `
     -ContentType "application/json" `
     -Body '{"event":"payment.success","data":{}}'
   ```
2. [ ] Should return 200 (received)
3. [ ] Should log warning in audit log
4. [ ] Should not update any payments

### Test 5.6: Non-existent Payment

1. Send webhook with checkout_id that doesn't exist:
   ```json
   {"event":"payment.success","data":{"checkout_id":"nonexistent123"}}
   ```
2. [ ] Should return 200 (received)
3. [ ] Should log warning in audit log
4. [ ] Should not crash

### Test 5.7: Multiple Partial Payments

1. Create booking: 150,000 MWK
2. Record payment 1: 50,000 MWK → Status: PARTIAL
3. Record payment 2: 50,000 MWK → Status: PARTIAL
4. Record payment 3: 50,000 MWK → Status: PAID
5. [ ] All payments visible
6. [ ] Total paid: 150,000 MWK
7. [ ] Status: PAID

### Test 5.8: Payment Link Expiry

1. Generate payment link
2. Check `paymentLinkExpiresAt` in database
3. [ ] Should be 24 hours from creation
4. Wait 24 hours (or manually update timestamp)
5. Try to use expired link
6. [ ] PayChangu should reject (handled by PayChangu, not our system)

### Test 5.9: Currency Handling

1. Create booking with currency: GBP
2. Generate payment link
3. [ ] PayChangu checkout shows GBP
4. Complete payment
5. [ ] Transaction created in GBP
6. [ ] Dashboard shows correct currency

---

## Test 6: End-to-End Integration Test

**Purpose:** Complete booking-to-payment flow simulating real user journey

### Scenario: Local Guest Books 3-Night Stay

1. **Setup Property:**
   - Navigate to Properties
   - Create property: "Sunset Villa"
   - Set nightly rate: 50,000 MWK
   - Set currency: MWK
   - Save property

2. **Create Guest:**
   - Navigate to Guests
   - Create guest:
     - Name: "John Banda"
     - Email: "john@example.com"
     - Phone: "+265 999 123 456"
     - Source: LOCAL
   - Save guest

3. **Create Booking:**
   - Navigate to Bookings
   - Create booking:
     - Guest: John Banda
     - Property: Sunset Villa
     - Check-in: Tomorrow
     - Check-out: 3 days from tomorrow (3 nights)
   - Save booking
   - [ ] Total amount: 150,000 MWK (3 × 50,000)
   - [ ] Payment status: UNPAID

4. **Record Deposit (Manual):**
   - Open booking detail
   - Add payment:
     - Amount: 50,000 MWK
     - Method: MOBILE_MONEY
     - Reference: "AIRTEL-DEP-001"
     - Notes: "Deposit via Airtel Money"
   - [ ] Paid: 50,000 MWK
   - [ ] Status: PARTIAL

5. **Generate Link for Balance:**
   - Add payment → PayChangu link tab
   - Generate link
   - [ ] Amount: 100,000 MWK (remaining balance)
   - Copy link

6. **Complete Online Payment:**
   - Open payment link
   - Complete payment with test card
   - Wait for webhook

7. **Verify Final State:**
   - Refresh booking page
   - [ ] Total: 150,000 MWK
   - [ ] Paid: 150,000 MWK
   - [ ] Status: PAID
   - [ ] 2 payments listed (manual + PayChangu)

8. **Check Financial Dashboard:**
   - Navigate to dashboard home
   - [ ] 2 revenue transactions
   - [ ] Total revenue: 150,000 MWK
   - [ ] Property profit updated

9. **Update Booking Status:**
   - Update status: CONFIRMED
   - [ ] Status transition allowed
   - [ ] Audit log updated

### Expected Behavior:
✅ Smooth flow from booking to payment  
✅ Mixed payment methods work (manual + online)  
✅ Financial tracking accurate  
✅ All data consistent across pages

---

## Test Scripts

### Script 1: Test Webhook Endpoint

```powershell
# test-webhook.ps1
# Tests webhook endpoint is accessible

$webhookUrl = "http://localhost:5001/nyumbaops/us-central1/api/v1/public/webhooks/paychangu"

Write-Host "Testing webhook endpoint..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $webhookUrl `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"event":"payment.success","data":{"checkout_id":"test123"}}'
    
    Write-Host "✓ Webhook endpoint accessible" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Webhook endpoint failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
```

### Script 2: Generate Test Payment Link

```powershell
# generate-payment-link.ps1
# Generates a PayChangu payment link via API

param(
    [Parameter(Mandatory=$true)]
    [string]$BookingId,
    
    [Parameter(Mandatory=$true)]
    [string]$AuthToken
)

$apiUrl = "http://localhost:5001/nyumbaops/us-central1/api/v1/bookings/$BookingId/payment-link"

Write-Host "Generating payment link for booking: $BookingId" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $apiUrl `
        -Method POST `
        -Headers @{"Authorization"="Bearer $AuthToken"} `
        -ContentType "application/json" `
        -Body "{}"
    
    Write-Host "✓ Payment link generated" -ForegroundColor Green
    Write-Host "Link: $($response.data.checkoutUrl)" -ForegroundColor Yellow
    Write-Host "Amount: $($response.data.amount)" -ForegroundColor Gray
    Write-Host "Expires: $($response.data.expiresAt)" -ForegroundColor Gray
    
    # Copy to clipboard (Windows)
    $response.data.checkoutUrl | Set-Clipboard
    Write-Host "✓ Link copied to clipboard" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to generate link" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
```

### Script 3: Simulate Webhook

```powershell
# simulate-webhook.ps1
# Simulates PayChangu webhook (for testing without actual payment)

param(
    [Parameter(Mandatory=$true)]
    [string]$CheckoutId,
    
    [Parameter(Mandatory=$false)]
    [string]$Event = "payment.success"
)

$webhookUrl = "http://localhost:5001/nyumbaops/us-central1/api/v1/public/webhooks/paychangu"

$payload = @{
    event = $Event
    data = @{
        checkout_id = $CheckoutId
        tx_ref = "TEST-TX-$(Get-Random -Minimum 1000 -Maximum 9999)"
        amount = 100000
        currency = "MWK"
        mobile_number = "+265999123456"
    }
} | ConvertTo-Json

Write-Host "Simulating webhook: $Event" -ForegroundColor Cyan
Write-Host "Checkout ID: $CheckoutId" -ForegroundColor Gray

# Note: This will fail signature verification
# For testing, temporarily disable signature check or use actual PayChangu test

try {
    $response = Invoke-RestMethod -Uri $webhookUrl `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload
    
    Write-Host "✓ Webhook sent" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Webhook failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
```

---

## Test Results Checklist

### Manual Payments
- [ ] Can record cash payment
- [ ] Can record mobile money payment
- [ ] Can record bank transfer
- [ ] Payment validation works (overpayment rejected)
- [ ] Revenue transaction auto-created
- [ ] Booking amounts update correctly

### PayChangu Integration
- [ ] Payment link generation works
- [ ] Link opens PayChangu checkout
- [ ] Checkout shows correct details
- [ ] Payment record created with PENDING status

### Webhook Handling
- [ ] Success webhook received and processed
- [ ] Failed webhook received and processed
- [ ] Invalid signature rejected
- [ ] Missing data handled gracefully
- [ ] Non-existent payment logged

### Data Consistency
- [ ] Booking amounts always accurate
- [ ] Payment status reflects reality
- [ ] Transactions match payments
- [ ] Audit logs complete
- [ ] No orphaned records

### User Experience
- [ ] Clear error messages
- [ ] Loading states shown
- [ ] Success confirmations displayed
- [ ] Payment history visible
- [ ] Status updates immediate

---

## Performance Benchmarks

- Payment link generation: < 3 seconds
- Webhook processing: < 1 second
- Payment list load: < 500ms
- Booking update: < 500ms

---

## Next Steps After Testing

1. ✅ All tests pass → Ready for production deployment
2. ⚠️ Some tests fail → Review `PAYCHANGU-TROUBLESHOOTING.md`
3. 📝 Document any issues found
4. 🔄 Retest after fixes
5. 🚀 Deploy to production (see PAYCHANGU-SETUP.md)

---

**Last Updated:** February 2026

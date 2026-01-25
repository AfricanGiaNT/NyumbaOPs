# PHASE 3: Technical Specifications

---

## 🔐 Authentication & Authorization

### Token Configuration

- [ ]  **JWT Access Token:**
    - Expiry: 15 minutes
    - Contains: user_id, role, email
    - Sent via Authorization header: `Bearer <token>`
- [ ]  **JWT Refresh Token:**
    - Expiry: 7 days
    - Rotated on each use (old token invalidated)
    - Stored in httpOnly cookie (web) or secure storage (mobile)
- [ ]  **Session Management:**
    - Multi-device sessions allowed
    - Logout invalidates refresh token
    - "Logout all devices" option for owner
- [ ]  **Password Requirements:**
    - Minimum 8 characters
    - No complexity rules (length > complexity)
    - Hashed with bcrypt (cost factor 10)
    - Never logged, never returned in API responses
- [ ]  **Failed Login Handling:**
    - Lock account after 5 failed attempts
    - 15 minute cooldown
    - Log failed attempts with IP address
- [ ]  **Telegram Bot Authentication:**
    - User links Telegram ID to account via dashboard (one-time setup)
    - Bot verifies Telegram user ID against `users.telegram_id` on every command
    - No password entry in Telegram (security risk)
    - Unauthorized users receive polite denial message

---

## 👥 Role-Based Access Control

### Roles

| Role | Description |
| --- | --- |
| Owner | Full access to everything |
| Staff | Operational access, limited config |

### Permission Matrix

| Action | Owner | Staff |
| --- | --- | --- |
| View dashboard | ✅ | ✅ |
| View all properties | ✅ | ✅ |
| Create/edit/delete property | ✅ | ❌ |
| Log income | ✅ | ✅ |
| Log expense | ✅ | ✅ |
| View audit log | ✅ | ❌ |
| Manage inquiries | ✅ | ✅ |
| Convert inquiry to booking | ✅ | ✅ |
| Log payment | ✅ | ✅ |
| Create/edit users | ✅ | ❌ |
| View financial reports | ✅ | ✅ |
| Export data | ✅ | ❌ |
| Access Telegram bot | ✅ | ✅ |
| Change system settings | ✅ | ❌ |

### Implementation

- Middleware checks role on protected routes
- Frontend hides unauthorized actions (but backend enforces)
- Role stored in JWT payload for quick checks

---

## 🔒 Security Measures

### API Security

- [ ]  Rate limiting (IP-based for public, user-based for authenticated)
- [ ]  CORS configured (public site domain + dashboard domain)
- [ ]  Auth middleware on all internal routes
- [ ]  Helmet.js for security headers

### Data Encryption

- [ ]  In transit: HTTPS (TLS via Cloudflare)
- [ ]  At rest: Managed DB encryption (Postgres provider default)

### Input Validation

- [ ]  Server-side schema validation (Zod)
- [ ]  All public inputs validated:
    - Dates: Valid ISO format, logical ranges
    - Amounts: Positive integers only
    - Emails: Valid format
    - Phone numbers: Valid Malawian format
    - Text fields: Max length enforced, sanitized

### XSS Protection

- [ ]  Output escaping on frontend (React handles by default)
- [ ]  No raw HTML rendering from user input
- [ ]  Content Security Policy header

### CSRF Protection

- [ ]  Not required for JWT-based APIs
- [ ]  Tokens sent via Authorization header, not cookies

### SQL Injection Prevention

- [ ]  ORM usage (Prisma) for all queries
- [ ]  No raw SQL for user input paths
- [ ]  Parameterized queries only

### Security Headers

- [ ]  X-Content-Type-Options: nosniff
- [ ]  X-Frame-Options: DENY
- [ ]  Strict-Transport-Security (HSTS)
- [ ]  Content-Security-Policy (basic)

### Sensitive Data Handling

- [ ]  Phone numbers: Stored in plain text (needed for contact)
- [ ]  Email addresses: Stored in plain text (needed for notifications)
- [ ]  No credit card data stored (payments are manual)
- [ ]  Passwords: Never logged, never returned in API responses

---

## 🚦 Rate Limiting

| Endpoint Type | Limit | Window |
| --- | --- | --- |
| Public inquiry form | 5 requests | 15 min |
| Public property list | 60 requests | 1 min |
| Auth (login/refresh) | 10 requests | 15 min |
| Authenticated APIs | 100 requests | 1 min |
| Telegram bot commands | 30 requests | 1 min |

### Implementation

- IP-based for public endpoints
- User-based for authenticated endpoints
- Return `429 Too Many Requests` with `Retry-After` header
- Log rate limit hits for abuse detection

---

## 🔌 API Design Standards

### URL Structure

- Base URL: `/api/v1/`
- Resources are plural: `/properties`, `/bookings`, `/transactions`
- Nested resources where logical: `/properties/:id/transactions`

### Request/Response Format

- All requests and responses in JSON
- Dates in ISO 8601 format: `2026-01-15T10:30:00Z`
- Money amounts in smallest unit (tambala) as integers to avoid floating point issues
    - Example: MWK 150,000 stored as `15000000` tambala
    - Frontend converts for display

### Standard Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

```

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid date range",
    "details": [
      { "field": "start_date", "message": "Start date must be before end date" }
    ]
  }
}

```

### Standard Error Codes

| Code | HTTP Status | Description |
| --- | --- | --- |
| VALIDATION_ERROR | 400 | Invalid input |
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Valid token but no permission |
| NOT_FOUND | 404 | Resource doesn't exist |
| CONFLICT | 409 | Duplicate or state conflict |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

### Pagination

- Default page size: 20
- Max page size: 100
- Query params: `?page=1&limit=20`

### Filtering & Sorting

- Filter by field: `?status=confirmed&property_id=123`
- Date range: `?from=2026-01-01&to=2026-01-31`
- Sort: `?sort=created_at&order=desc`

---

---

## 🚨 API Error Handling Scenarios

### Authentication Errors

| Scenario | HTTP Status | Error Code | Message |
| --- | --- | --- | --- |
| Missing token | 401 | UNAUTHORIZED | "Authentication required" |
| Expired token | 401 | TOKEN_EXPIRED | "Token has expired, please refresh" |
| Invalid token | 401 | INVALID_TOKEN | "Invalid authentication token" |
| Revoked refresh token | 401 | TOKEN_REVOKED | "Session has been revoked, please login again" |
| Account locked | 403 | ACCOUNT_LOCKED | "Account locked due to failed login attempts. Try again in 15 minutes" |

### Authorization Errors

| Scenario | HTTP Status | Error Code | Message |
| --- | --- | --- | --- |
| Staff accessing owner-only route | 403 | FORBIDDEN | "You don't have permission to perform this action" |
| Accessing another user's data | 403 | FORBIDDEN | "Access denied" |
| Telegram user not linked | 403 | TELEGRAM_NOT_LINKED | "Your Telegram account is not linked to any user" |

### Booking & Availability Errors

| Scenario | HTTP Status | Error Code | Message |
| --- | --- | --- | --- |
| Dates overlap existing booking | 409 | BOOKING_CONFLICT | "Property is not available for selected dates" |
| Check-out before check-in | 400 | INVALID_DATE_RANGE | "Check-out date must be after check-in date" |
| Past check-in date | 400 | INVALID_DATE | "Check-in date cannot be in the past" |
| Booking too far in advance | 400 | DATE_OUT_OF_RANGE | "Cannot book more than 6 months in advance" |
| Property inactive | 400 | PROPERTY_UNAVAILABLE | "This property is not currently available for booking" |

### Transaction Errors

| Scenario | HTTP Status | Error Code | Message |
| --- | --- | --- | --- |
| Negative amount | 400 | INVALID_AMOUNT | "Amount must be a positive number" |
| Invalid currency | 400 | INVALID_CURRENCY | "Currency must be MWK or GBP" |
| Category not found | 400 | INVALID_CATEGORY | "Selected category does not exist" |
| Property not found | 404 | PROPERTY_NOT_FOUND | "Property not found" |
| Transaction not found | 404 | TRANSACTION_NOT_FOUND | "Transaction not found" |
| Cannot delete system category | 400 | SYSTEM_CATEGORY | "System categories cannot be deleted" |

### Inquiry Errors

| Scenario | HTTP Status | Error Code | Message |
| --- | --- | --- | --- |
| Inquiry already converted | 409 | ALREADY_CONVERTED | "This inquiry has already been converted to a booking" |
| Inquiry expired | 400 | INQUIRY_EXPIRED | "This inquiry has expired and cannot be converted" |
| Invalid phone format | 400 | INVALID_PHONE | "Please enter a valid Malawian phone number" |

### Payment Errors

| Scenario | HTTP Status | Error Code | Message |
| --- | --- | --- | --- |
| Payment exceeds balance | 400 | OVERPAYMENT | "Payment amount exceeds remaining balance" |
| Booking not found | 404 | BOOKING_NOT_FOUND | "Booking not found" |
| Booking cancelled | 400 | BOOKING_CANCELLED | "Cannot add payment to a cancelled booking" |

### Resource Errors

| Scenario | HTTP Status | Error Code | Message |
| --- | --- | --- | --- |
| Property has active bookings | 409 | HAS_DEPENDENCIES | "Cannot delete property with active bookings" |
| Category in use | 409 | CATEGORY_IN_USE | "Cannot delete category that has transactions" |
| User has transactions | 409 | USER_HAS_DATA | "Cannot delete user who has created transactions" |

### File Upload Errors

| Scenario | HTTP Status | Error Code | Message |
| --- | --- | --- | --- |
| File too large | 400 | FILE_TOO_LARGE | "File size exceeds 5MB limit" |
| Invalid file type | 400 | INVALID_FILE_TYPE | "Only JPEG, PNG, and WebP images are allowed" |
| Too many images | 400 | MAX_IMAGES_REACHED | "Maximum 10 images per property" |

### Rate Limiting

| Scenario | HTTP Status | Error Code | Message |
| --- | --- | --- | --- |
| Too many requests | 429 | RATE_LIMITED | "Too many requests. Please try again in {seconds} seconds" |

### Server Errors

| Scenario | HTTP Status | Error Code | Message |
| --- | --- | --- | --- |
| Database connection failed | 500 | INTERNAL_ERROR | "Something went wrong. Please try again later" |
| External service failed | 502 | SERVICE_UNAVAILABLE | "Unable to connect to external service" |

### Error Response Examples

**Validation Error (Multiple Fields):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "amount", "message": "Amount must be a positive number" },
      { "field": "date", "message": "Date is required" },
      { "field": "property_id", "message": "Please select a property" }
    ]
  }
}

```

**Booking Conflict:**

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Property is not available for selected dates",
    "details": {
      "conflicting_booking": {
        "check_in": "2026-01-12",
        "check_out": "2026-01-15"
      }
    }
  }
}

```

**Rate Limited:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again in 45 seconds",
    "details": {
      "retry_after": 45
    }
  }
}

```

---

## 📝 Audit Log Specifications

### What Gets Logged

| Action | Logged Fields |
| --- | --- |
| Income created | user_id, property_id, amount, source |
| Expense created | user_id, property_id, amount, category |
| Booking created | user_id, booking_id, property_id |
| Booking status changed | user_id, booking_id, old_status, new_status |
| Payment logged | user_id, booking_id, amount, method |
| Inquiry status changed | user_id, inquiry_id, old_status, new_status |
| Property created/updated | user_id, property_id, changed_fields |
| User login | user_id, ip_address, user_agent |
| Failed login attempt | email_attempted, ip_address |

### Log Entry Structure

```json
{
  "id": "uuid",
  "action": "INCOME_CREATED",
  "user_id": "uuid",
  "resource_type": "transaction",
  "resource_id": "uuid",
  "details": { "amount": 15000000, "property_id": "uuid" },
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2026-01-15T10:30:00Z"
}

```

### Retention & Access

- Keep audit logs for 2 years
- Owner can view via dashboard (read-only)
- No deletion of audit logs (append-only table)
- Filterable by date range, action type, user

---

## 📅 Availability Logic

### Rules

- A property is unavailable if ANY booking overlaps the requested dates
- Overlap check: `NOT (requested_end <= booking_start OR requested_start >= booking_end)`
- Check-out day is available for new check-in (same-day turnover allowed)
- Only CONFIRMED and CHECKED_IN bookings block availability
- CANCELLED and COMPLETED bookings do not block

### Edge Cases

- Same-day booking: Allowed if property available
- Minimum stay: 1 night (can be configured per property later)
- Maximum stay: No limit for MVP
- Booking modification: Check availability excluding current booking

### API Endpoint

```
GET /api/v1/properties/:id/availability?from=2026-01-01&to=2026-01-31

```

Response:

```json
{
  "success": true,
  "data": {
    "unavailable_ranges": [
      { "start": "2026-01-05", "end": "2026-01-08" },
      { "start": "2026-01-15", "end": "2026-01-20" }
    ]
  }
}

```

---

## 📁 File Upload Specifications

### Property Images

- Max file size: 5 MB per image
- Max images per property: 10
- Allowed formats: JPEG, PNG, WebP
- Processing on upload:
    - Resize to max 1920px width (maintain aspect ratio)
    - Generate thumbnail (400px width)
    - Convert to WebP for serving
    - Strip EXIF data (privacy)

### Storage

- Provider: Cloudflare R2 (or DigitalOcean Spaces)
- Public bucket for property images
- URL format: `https://cdn.nyumbaops.com/properties/{property_id}/{image_id}.webp`

### Upload Flow

1. Frontend requests signed upload URL from backend
2. Frontend uploads directly to storage (no backend proxy)
3. Frontend confirms upload completion
4. Backend saves image URL to database
5. Backend triggers image processing (resize, convert)

---

## ⚡ Performance Specifications

### Database

- [ ]  **Connection Pooling:**
    - Min connections: 2
    - Max connections: 10
    - Idle timeout: 30 seconds
- [ ]  **Indexing Strategy:**
    - `transactions.property_id`
    - `transactions.date`
    - `transactions.type`
    - `bookings.property_id`
    - `bookings.start_date`
    - `bookings.end_date`
    - `bookings.status`
    - `inquiries.property_id`
    - `inquiries.status`
    - `inquiries.created_at`
    - `audit_logs.created_at`
    - `audit_logs.user_id`
- [ ]  **Query Optimization:**
    - Use `select` to fetch only needed fields
    - Avoid N+1 queries (use eager loading for relations)
    - Add indexes before launch, not after problems

### Caching

- [ ]  In-memory caching for dashboard summaries (5 min TTL)
- [ ]  No Redis for MVP (can be added later)
- [ ]  Cache invalidation on relevant writes

### Frontend Performance

- [ ]  **Image Optimization:**
    - Property images resized at upload
    - Serve WebP format
    - Lazy-load images below fold
    - Use responsive images (srcset)
- [ ]  **Code Splitting:**
    - Dashboard routes split from public site
    - Load admin-heavy components only when needed
- [ ]  **Lazy Loading:**
    - Property lists paginated (20 per page)
    - Charts load after core data
    - Modals loaded on demand

### CDN

- [ ]  Static assets served via Cloudflare CDN
- [ ]  Cache static assets for 1 year (with hash in filename)
- [ ]  Cache API responses: No (data changes frequently)

### Response Time Targets

| Endpoint Type | Target |
| --- | --- |
| Auth endpoints | < 200 ms |
| Dashboard APIs | < 300 ms |
| Public property list | < 500 ms |
| Public property detail | < 300 ms |
| Inquiry submission | < 500 ms |
| Image upload | < 3 sec |

---

## 📧 Email Notifications

### Emails to Send (MVP)

| Trigger | Recipient | Subject |
| --- | --- | --- |
| New inquiry submitted | Owner | New inquiry for {property_name} |
| Booking confirmed | Guest | Your booking at {property_name} |
| Booking confirmed | Owner | New booking: {property_name} |
| Payment received | Guest | Payment confirmed - {property_name} |

### Implementation

- Transactional email service: Resend (or Postmark)
- HTML + plain text versions for each template
- Retry failed sends (3 attempts with exponential backoff)
- Log all email sends in audit log
- From address: bookings@nyumbaops.com (or similar)

### Email Template Requirements

- Mobile-responsive design
- Clear call-to-action where applicable
- Unsubscribe link (for marketing emails, not transactional)
- Contact information in footer

---

---

## 💳 Payment Integration (PayChangu)

### Overview

PayChangu will be the payment gateway for processing local payments including:

- Airtel Money
- TNM Mpamba
- Bank transfers
- Card payments

### Integration Timeline

**Phase 1 (MVP):** Manual payment logging only
**Phase 2 (Post-Launch):** PayChangu integration for online payments

### PayChangu Integration Specifications

### Environment

- **Sandbox URL:** https://api.paychangu.com/sandbox/
- **Production URL:** https://api.paychangu.com/
- **Documentation:** [https://docs.paychangu.com](https://docs.paychangu.com/)

### Required Environment Variables

| Variable | Description |
| --- | --- |
| PAYCHANGU_PUBLIC_KEY | Public API key |
| PAYCHANGU_SECRET_KEY | Secret API key |
| PAYCHANGU_WEBHOOK_SECRET | For verifying webhook signatures |
| PAYCHANGU_ENVIRONMENT | 'sandbox' or 'production' |

### Supported Payment Methods

| Method | Code | Notes |
| --- | --- | --- |
| Airtel Money | airtel_mw | Primary mobile money |
| TNM Mpamba | tnm_mw | Secondary mobile money |
| Bank Transfer | bank_mw | For larger amounts |
| Visa/Mastercard | card | International guests |

### Payment Flow (Future Implementation)

1. Guest selects dates and submits booking request
2. System creates inquiry with status NEW
3. Owner/staff converts inquiry to booking
4. System generates PayChangu payment link
5. Guest receives payment link via SMS/WhatsApp
6. Guest completes payment on PayChangu
7. PayChangu sends webhook to our system
8. System automatically:
    - Updates booking.amount_paid
    - Creates income transaction
    - Updates booking status if fully paid
    - Sends confirmation to guest
    - Notifies owner via Telegram

### Webhook Events to Handle

| Event | Action |
| --- | --- |
| payment.success | Create transaction, update booking |
| payment.failed | Log attempt, notify staff |
| payment.pending | Update payment status |
| refund.success | Create negative transaction |

### Database Changes Required

Add to `payments` table:

```sql
paychangu_reference VARCHAR(100),    -- PayChangu transaction ID
paychangu_checkout_id VARCHAR(100),  -- Checkout session ID
payment_link VARCHAR(500),           -- Generated payment URL
payment_link_expires_at TIMESTAMP,   -- Link expiry
payment_status VARCHAR(20),          -- pending, success, failed

```

Add new enum for payment_status:

```sql
CREATE TYPE payment_gateway_status AS ENUM (
  'pending',
  'processing',
  'success',
  'failed',
  'refunded'
);

```

### API Endpoints (Future)

POST /api/v1/bookings/:id/payment-link    -- Generate payment link
GET  /api/v1/bookings/:id/payment-status  -- Check payment status
POST /api/v1/webhooks/paychangu           -- Receive webhooks

### Security Considerations

- Verify webhook signatures using PAYCHANGU_WEBHOOK_SECRET
- Store only reference IDs, not sensitive payment data
- Log all payment attempts for reconciliation
- Implement idempotency for webhook processing

### Fees & Pricing

- Document PayChangu fees for each payment method
- Decide: Absorb fees or pass to customer
- Display final amount clearly to guest

### Testing Checklist (Pre-Integration)

- [ ]  PayChangu sandbox account created
- [ ]  Test credentials obtained
- [ ]  Webhook endpoint deployed
- [ ]  Test payment flow end-to-end
- [ ]  Refund flow tested
- [ ]  Error handling verified

### MVP Approach (Current)

For MVP, payments are logged manually:

1. Guest pays via Airtel Money/bank directly to owner
2. Owner/staff logs payment in dashboard or via Telegram bot
3. System creates income transaction
4. Booking marked as paid

This approach:

- Works immediately with no integration complexity
- Allows time to verify PayChangu reliability
- Can be upgraded seamlessly later

---

## 📊 Analytics & Monitoring

### Business Metrics to Track

- Total revenue (monthly / per property)
- Total expenses (monthly / per property)
- Net profit (monthly / per property)
- Occupancy rate (nights booked / nights available)
- Inquiry → booking conversion rate
- Average booking value
- Expenses by category breakdown

### Technical Metrics to Track

- API response times (p50, p95, p99)
- API error rate
- Uptime percentage
- Database query performance
- Failed login attempts

### Tools

- **Analytics:** Plausible (privacy-friendly, simple)
- **Error Tracking:** Sentry (backend + frontend)
- **Uptime Monitoring:** UptimeRobot (API + public site)
- **Logs:** Application logs to stdout (platform captures)

---

## 💾 Backup & Recovery

### Backup Strategy

- Automated daily backups (database provider feature)
- Retain backups for 30 days
- Store backups in different region than primary database
- Image backups: Handled by storage provider (R2/Spaces)

### Recovery Objectives

- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 24 hours

### Recovery Testing

- [ ]  Test restore from backup before launch
- [ ]  Document step-by-step restore procedure
- [ ]  Test restore procedure quarterly

### Manual Export

- Owner can export transactions as CSV (monthly/yearly)
- Export includes: date, property, type, amount, category, notes
- Export available via dashboard (Owner only)

---

- `--
## 🔐 Two-Factor Authentication (2FA)
### Overview
Add optional two-factor authentication for owner accounts to protect sensitive business data. Staff accounts may be added later.
### Implementation Timeline
**MVP:** Password-only authentication
**Post-Launch Phase 1:** SMS/WhatsApp OTP for owner
**Post-Launch Phase 2:** Authenticator app support (TOTP)
### Phase 1: SMS/WhatsApp OTP
*Flow:**`

┌─────────────────────────────────────────────────────────┐
│                                                         │
│  1. User enters email/password                          │
│                    ↓                                    │
│  2. If 2FA enabled, prompt for OTP                      │
│                    ↓                                    │
│  3. System sends 6-digit OTP via SMS/WhatsApp           │
│                    ↓                                    │
│  4. User enters OTP within 5 minutes                    │
│                    ↓                                    │
│  5. If valid, create session                            │
│                                                         │
└─────────────────────────────────────────────────────────┘

`**OTP Message:**`

Your NyumbaOps login code is: 483921

This code expires in 5 minutes.

If you didn't request this, secure your account immediately.

`### Database Schema

**New Table: `user_2fa_settings`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✅ | Primary key |
| user_id | UUID | ✅ | FK → users (unique) |
| is_enabled | Boolean | ✅ | 2FA enabled |
| method | Enum | ✅ | SMS, WHATSAPP, TOTP |
| phone_number | String(20) | | For SMS/WhatsApp |
| totp_secret | String(32) | | For authenticator apps |
| backup_codes | JSON | | Array of hashed backup codes |
| last_used_at | Timestamp | | Last successful 2FA |
| created_at | Timestamp | ✅ | |
| updated_at | Timestamp | ✅ | |
```sql
CREATE TYPE two_factor_method AS ENUM ('SMS', 'WHATSAPP', 'TOTP');

CREATE TABLE user_2fa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  method two_factor_method NOT NULL DEFAULT 'SMS',
  phone_number VARCHAR(20),
  totp_secret VARCHAR(32),
  backup_codes JSONB DEFAULT '[]',
  last_used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**New Table: `otp_codes`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✅ | Primary key |
| user_id | UUID | ✅ | FK → users |
| code_hash | String(64) | ✅ | Hashed OTP |
| purpose | Enum | ✅ | LOGIN, PASSWORD_RESET |
| expires_at | Timestamp | ✅ | When code expires |
| used_at | Timestamp | | When code was used |
| attempts | Integer | ✅ | Failed attempts |
| created_at | Timestamp | ✅ | |
```sql
CREATE TYPE otp_purpose AS ENUM ('LOGIN', 'PASSWORD_RESET');

CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash VARCHAR(64) NOT NULL,
  purpose otp_purpose NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX otp_codes_user_idx ON otp_codes (user_id, purpose) WHERE used_at IS NULL;
```

### OTP Generation Logic
```typescript
import crypto from 'crypto';

function generateOTP(): string {
  // Generate 6-digit numeric code
  return crypto.randomInt(100000, 999999).toString();
}

function hashOTP(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function createOTP(userId: string, purpose: OtpPurpose): Promise<string> {
  const code = generateOTP();
  const codeHash = hashOTP(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  
  // Invalidate existing OTPs for this user/purpose
  await prisma.otpCode.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() }
  });
  
  // Create new OTP
  await prisma.otpCode.create({
    data: { userId, codeHash, purpose, expiresAt }
  });
  
  return code;
}

async function verifyOTP(userId: string, code: string, purpose: OtpPurpose): Promise<boolean> {
  const codeHash = hashOTP(code);
  
  const otpRecord = await prisma.otpCode.findFirst({
    where: {
      userId,
      purpose,
      codeHash,
      usedAt: null,
      expiresAt: { gt: new Date() }
    }
  });
  
  if (!otpRecord) {
    // Increment attempt counter on most recent OTP
    await prisma.otpCode.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { attempts: { increment: 1 } }
    });
    return false;
  }
  
  // Check max attempts
  if (otpRecord.attempts >= 3) {
    return false;
  }
  
  // Mark as used
  await prisma.otpCode.update({
    where: { id: otpRecord.id },
    data: { usedAt: new Date() }
  });
  
  return true;
}
```

### Security Rules

| Rule | Value | Reason |
|------|-------|--------|
| OTP Length | 6 digits | Balance of security and usability |
| OTP Expiry | 5 minutes | Short window reduces interception risk |
| Max Attempts | 3 | Prevents brute force |
| Lockout Duration | 15 minutes | After max attempts exceeded |
| Code Reuse | Not allowed | Each code single-use |
| Rate Limit | 3 OTPs per 15 minutes | Prevents abuse |

### Login Flow with 2FA

**Step 1: Password Check**`

POST /api/v1/auth/login
{
"email": "[owner@example.com](mailto:owner@example.com)",
"password": "secret123"
}

Response (2FA required):
{
"success": true,
"requires_2fa": true,
"method": "SMS",
"phone_hint": "****4567",
"temp_token": "eyJ..." // Short-lived token for 2FA step
}

`**Step 2: OTP Verification**`

POST /api/v1/auth/verify-2fa
{
"temp_token": "eyJ...",
"code": "483921"
}

Response (success):
{
"success": true,
"access_token": "eyJ...",
"refresh_token": "eyJ...",
"user": { ... }
}

`### UI: Enable 2FA (Settings)`

┌──────────────────────────────┐
│ ← Settings           Security│
└──────────────────────────────┘

─────────────────────────────────
🔐 Two-Factor Authentication
─────────────────────────────────

Status: ❌ Not Enabled

Add an extra layer of security to
your account. After entering your
password, you'll need to enter a
code sent to your phone.

[ Enable 2FA ]

─────────────────────────────────

`**Enable 2FA Flow:**`

┌──────────────────────────────┐
│ Enable 2FA              ✕    │
├──────────────────────────────┤
│                              │
│ Step 1: Choose Method        │
│ ═══════════░░░░░░░░░░░░░░░░  │
│                              │
│ How would you like to        │
│ receive verification codes?  │
│                              │
│ ┌────────────────────────┐   │
│ │ 📱 SMS                 │   │
│ │ Receive codes via text │   │
│ └────────────────────────┘   │
│                              │
│ ┌────────────────────────┐   │
│ │ 💬 WhatsApp            │   │
│ │ Receive codes via      │   │
│ │ WhatsApp message       │   │
│ └────────────────────────┘   │
│                              │
│ ────────────────────────────│
│                              │
│ [ Cancel ]        [ Next ]   │
│                              │
└──────────────────────────────┘

```

```

┌──────────────────────────────┐
│ Enable 2FA              ✕    │
├──────────────────────────────┤
│                              │
│ Step 2: Verify Phone         │
│ ═══════════════════░░░░░░░░  │
│                              │
│ We'll send a code to:        │
│ 0991234567                   │
│                              │
│ Enter the 6-digit code:      │
│                              │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐│
│ │4 │ │8 │ │3 │ │9 │ │2 │ │1 ││
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘│
│                              │
│ Didn't receive code?         │
│ [ Resend ] (available in 45s)│
│                              │
│ ────────────────────────────│
│                              │
│ [ Back ]         [ Verify ]  │
│                              │
└──────────────────────────────┘

```

```

┌──────────────────────────────┐
│ Enable 2FA              ✕    │
├──────────────────────────────┤
│                              │
│ Step 3: Backup Codes         │
│ ═══════════════════════════  │
│                              │
│ Save these backup codes in   │
│ a safe place. Use them if    │
│ you lose access to your      │
│ phone.                       │
│                              │
│ ┌────────────────────────┐   │
│ │ 1. ABCD-EFGH-IJKL      │   │
│ │ 2. MNOP-QRST-UVWX      │   │
│ │ 3. YZAB-CDEF-GHIJ      │   │
│ │ 4. KLMN-OPQR-STUV      │   │
│ │ 5. WXYZ-1234-5678      │   │
│ └────────────────────────┘   │
│                              │
│ [ Download ] [ Copy ]        │
│                              │
│ ☑️ I've saved these codes    │
│                              │
│ ────────────────────────────│
│                              │
│ [ Back ]         [ Done ]    │
│                              │
└──────────────────────────────┘

`### Backup Codes
- Generate 5 single-use backup codes
- Each code: 12 characters (e.g., ABCD-EFGH-IJKL)
- Store hashed in database
- Can be used instead of OTP
- Regenerate all codes if any are used

### Phase 2: TOTP (Authenticator App)

For future implementation:
- Support Google Authenticator, Authy, etc.
- Generate TOTP secret and QR code
- User scans QR with authenticator app
- Codes regenerate every 30 seconds
- More secure than SMS (no interception risk)
```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Generate secret
const secret = speakeasy.generateSecret({
  name: 'NyumbaOps',
  length: 20
});

// Generate QR code
const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

// Verify TOTP
const isValid = speakeasy.totp.verify({
  secret: secret.base32,
  encoding: 'base32',
  token: userProvidedCode,
  window: 1 // Allow 1 step tolerance
});
```

### API Endpoints`

GET  /api/v1/auth/2fa/status              -- Check if 2FA enabled
POST /api/v1/auth/2fa/enable              -- Start enable flow
POST /api/v1/auth/2fa/verify-setup        -- Verify OTP during setup
POST /api/v1/auth/2fa/disable             -- Disable 2FA (requires password)
POST /api/v1/auth/2fa/backup-codes        -- Regenerate backup codes
POST /api/v1/auth/verify-2fa              -- Verify OTP during login
POST /api/v1/auth/verify-backup           -- Use backup code

`### Audit Log Entries
```json
// 2FA Enabled
{
  "action": "2FA_ENABLED",
  "user_id": "uuid",
  "details": { "method": "SMS" }
}

// 2FA Used
{
  "action": "2FA_VERIFIED",
  "user_id": "uuid",
  "details": { "method": "SMS" }
}

// Backup Code Used
{
  "action": "BACKUP_CODE_USED",
  "user_id": "uuid",
  "details": { "codes_remaining": 4 }
}

// 2FA Disabled
{
  "action": "2FA_DISABLED",
  "user_id": "uuid"
}
```
---`

---

## ⏰ Scheduled Jobs

### Overview

The system requires several background jobs to run on a schedule. These are implemented as cron jobs or scheduled tasks.

### Job Specifications

### 1. Expire Old Refresh Tokens

**Schedule:** Daily at 3:00 AM
**Purpose:** Clean up expired refresh tokens from database
**Query:**

```sql
DELETE FROM refresh_tokens
WHERE expires_at < NOW() - INTERVAL '7 days'
   OR is_revoked = true;

```

**Logging:** Log count of deleted tokens
**Failure handling:** Retry once, alert if fails twice

---

### 2. Expire Stale Inquiries

**Schedule:** Every 6 hours (00:00, 06:00, 12:00, 18:00)
**Purpose:** Mark inquiries as expired after 7 days of inactivity
**Query:**

```sql
UPDATE inquiries
SET status = 'EXPIRED',
    updated_at = NOW()
WHERE status IN ('NEW', 'CONTACTED')
  AND expires_at < NOW();

```

**Logging:** Log count of expired inquiries
**Notification:** None (owner can see in dashboard)
**Audit:** Create audit log entry for each expiry

---

### 3. Daily Summary Notification

**Schedule:** Daily at 6:00 PM (configurable per user)
**Purpose:** Send daily business summary via Telegram
**Condition:** Only if user has `daily_summary_telegram = true`**Content:**

📊 Daily Summary – 15 Jan 2026

🇲🇼 MWK
💰 Today's Income: MWK 150,000
❌ Today's Expenses: MWK 45,000
📈 Today's Profit: MWK 105,000

🇬🇧 GBP
💰 Today's Income: £0.00

📅 New Inquiries: 2
📅 New Bookings: 1
✅ Check-ins Today: 1
🚪 Check-outs Today: 0

Month-to-Date Profit:
MWK 1,550,000 | £320.00

- `*Failure handling:** Log error, don't retry (will send next day)
--
#### 4. Unlock Locked Accounts
*Schedule:** Every 5 minutes
*Purpose:** Automatically unlock accounts after lockout period
*Query:**
```sql
UPDATE users
SET locked_until = NULL,
 failed_login_count = 0
WHERE locked_until IS NOT NULL
 AND locked_until < NOW();
```
*Logging:** Log unlocked user emails
--
#### 5. Check-in/Check-out Reminders (Future)
*Schedule:** Daily at 8:00 AM
*Purpose:** Remind about today's check-ins and check-outs
*Condition:** If user has notifications enabled
*Content:**`

📅 Today's Schedule – 15 Jan 2026

🟢 Check-ins:

- Area 43 – House A
👤 John Banda (3 guests)
📞 0991234567

🔴 Check-outs:

- Area 10 – Studio
👤 Mary Phiri

`---

#### 6. Database Backup Verification (Weekly)
**Schedule:** Every Sunday at 2:00 AM
**Purpose:** Verify that daily backups are completing successfully
**Action:** Check backup provider API for latest backup status
**Alert:** Send Telegram notification to owner if backup is missing or failed

---

### Implementation Options

#### Option A: Platform Cron (Recommended for MVP)
Use hosting platform's built-in cron:
- **Railway:** railway.json cron configuration
- **DigitalOcean App Platform:** App Spec cron jobs
- **Render:** Cron job service

Example Railway config:
```json
{
  "cron": [
    {
      "command": "npm run job:expire-tokens",
      "schedule": "0 3 * * *"
    },
    {
      "command": "npm run job:expire-inquiries",
      "schedule": "0 */6 * * *"
    },
    {
      "command": "npm run job:daily-summary",
      "schedule": "0 18 * * *"
    },
    {
      "command": "npm run job:unlock-accounts",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

#### Option B: In-App Scheduler
Use node-cron or similar within the application:
```javascript
import cron from 'node-cron';

// Expire tokens daily at 3 AM
cron.schedule('0 3 * * *', () => {
  expireOldTokens();
});

// Expire inquiries every 6 hours
cron.schedule('0 */6 * * *', () => {
  expireStaleInquiries();
});
```

**Note:** In-app scheduler requires long-running process. Platform cron is more reliable.

---

### Job Monitoring

#### Logging Format
Each job logs:
```json
{
  "job": "expire_inquiries",
  "started_at": "2026-01-15T06:00:00Z",
  "completed_at": "2026-01-15T06:00:02Z",
  "duration_ms": 2000,
  "records_affected": 3,
  "status": "success"
}
```

#### Failure Alerts
- Critical jobs (backups, token cleanup): Alert owner via Telegram
- Non-critical jobs (summaries): Log only, retry next schedule

---

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| DAILY_SUMMARY_HOUR | Hour to send daily summary (0-23) | 18 |
| INQUIRY_EXPIRY_DAYS | Days before inquiry expires | 7 |
| TOKEN_RETENTION_DAYS | Days to keep expired tokens | 7 |
| ENABLE_SCHEDULED_JOBS | Enable/disable all jobs | true |

---

### Testing Scheduled Jobs
- [ ] Each job can be triggered manually via CLI: `npm run job:expire-tokens`
- [ ] Jobs are idempotent (safe to run multiple times)
- [ ] Jobs have timeout (max 5 minutes)
- [ ] Jobs log start, end, and affected records
- [ ] Failed jobs don't crash the application
---`

---

- `--
## 🗄️ Data Retention Policy
### Overview
Define how long different types of data are stored and when they should be deleted or anonymized to comply with privacy best practices.
### Retention Schedule
| Data Type | Retention Period | Action After Retention | Reason |
|-----------|------------------|------------------------|--------|
| **Active Bookings** | Indefinite | N/A | Required for operations |
| **Completed Bookings** | 7 years | Anonymize guest details | Tax/accounting records |
| **Cancelled Bookings** | 2 years | Delete | Limited business value |
| **Guest Records** | 7 years from last booking | Anonymize | Tax/legal compliance |
| **Inquiries (not converted)** | 1 year | Delete | No ongoing relationship |
| **Inquiries (converted)** | Linked to booking | Follows booking retention | Part of booking record |
| **Transactions** | 7 years | Archive | Tax/accounting records |
| **Audit Logs** | 3 years | Archive then delete | Security compliance |
| **Communication Logs** | 2 years | Delete | Limited long-term value |
| **User Accounts (active)** | Indefinite | N/A | Required for access |
| **User Accounts (inactive)** | 2 years of inactivity | Notify then delete | Data minimization |
| **Refresh Tokens** | 30 days after expiry | Delete | Security hygiene |
| **Failed Login Attempts** | 90 days | Delete | Security monitoring |
| **Property Media** | While property active | Delete with property | Storage management |
| **Deleted Properties** | 1 year after soft delete | Hard delete | Recovery window |
| **Testimonials** | Indefinite | N/A | Marketing asset |
| **FAQs** | Indefinite | N/A | Content asset |
### Retention Periods Explained
*7 Years (Tax/Legal)**
Malawi Revenue Authority may audit up to 6 years back
7 years provides safety margin
Applies to: financial transactions, booking revenue, guest payment records
*3 Years (Operational)**
Sufficient for trend analysis and dispute resolution
Applies to: audit logs, detailed activity records
*2 Years (Short-term)**
Covers typical dispute/chargeback windows
Applies to: cancelled bookings, communication logs, inactive accounts
*1 Year (Minimal)**
Data with limited ongoing value
Applies to: unconverted inquiries, expired tokens
### Anonymization Process
When retention period expires for bookings/guests, anonymize rather than delete:
*Before Anonymization:**
```json
{
 "guest_name": "John Banda",
 "email": "john.banda@email.com",
 "phone": "0991234567",
 "id_number": "MW12345678"
}
```
*After Anonymization:**
```json
{
 "guest_name": "Guest #4521",
 "email": null,
 "phone": null,
 "id_number": null,
 "anonymized_at": "2033-01-15T00:00:00Z"
}
```
*Fields to Anonymize:**
guest_name → "Guest #[booking_count]"
email → null
phone → null
id_number → null
notes containing PII → "[Redacted]"
*Fields to Preserve:**
booking_id (for reference)
property_id (for reporting)
check_in, check_out dates
total_amount, currency
transaction amounts (for tax)
### Scheduled Retention Jobs
*Daily: Token Cleanup**
```sql
- Delete expired refresh tokens older than 30 days
DELETE FROM refresh_tokens
WHERE expires_at < NOW() - INTERVAL '30 days';
- Delete old failed login records
DELETE FROM audit_logs
WHERE action = 'LOGIN_FAILED'
 AND created_at < NOW() - INTERVAL '90 days';
```
*Monthly: Inquiry Cleanup**
```sql
- Delete unconverted inquiries older than 1 year
DELETE FROM inquiries
WHERE status IN ('EXPIRED', 'DECLINED')
 AND booking_id IS NULL
 AND created_at < NOW() - INTERVAL '1 year';
```
*Yearly: Anonymization Job**
```sql
- Anonymize guest data for bookings older than 7 years
UPDATE guests g
SET
 name = 'Guest #' || g.id::text,
 email = NULL,
 phone = NULL,
 id_number = NULL,
 notes = CASE WHEN notes IS NOT NULL THEN '[Redacted]' ELSE NULL END,
 anonymized_at = NOW()
FROM bookings b
WHERE b.guest_id = g.id
 AND b.check_out < NOW() - INTERVAL '7 years'
 AND g.anonymized_at IS NULL;
```
### User Data Export (GDPR-style)
Even though GDPR doesn't directly apply in Malawi, providing data export is good practice:
*Export Request Endpoint:**`

POST /api/v1/guests/:id/export-data

`**Response includes:**
- All bookings for this guest
- All communication logs
- All payments
- Inquiry history

**Format:** JSON or PDF

### User Data Deletion Request

**Deletion Request Endpoint:**`

POST /api/v1/guests/:id/request-deletion

`**Process:**
1. Verify request is from guest (phone/email verification)
2. Check for active bookings (cannot delete if active)
3. Check retention requirements (some data must be kept for tax)
4. Anonymize what can be anonymized
5. Delete what can be deleted
6. Confirm completion to requester

**Cannot Delete:**
- Transaction records within 7 years (tax requirement)
- Booking revenue records within 7 years

**Can Delete/Anonymize:**
- Personal details (name, email, phone)
- Communication logs
- Notes and preferences

### Database Schema Addition

**Add to `guests` table:**
```sql
anonymized_at TIMESTAMP NULL,
deletion_requested_at TIMESTAMP NULL,
deletion_completed_at TIMESTAMP NULL
```

### Admin Dashboard: Data Retention

**Settings → Data Retention:**`

┌──────────────────────────────┐
│ ← Settings     Data Retention│
└──────────────────────────────┘

─────────────────────────────────
📊 Data Summary
─────────────────────────────────

Records by Age:

- < 1 year: 234 bookings, 189 guests
- 1-3 years: 156 bookings, 134 guests
- 3-7 years: 89 bookings, 78 guests
- 7 years: 12 bookings (pending anonymization)

─────────────────────────────────
⏰ Scheduled Cleanup
─────────────────────────────────

Next token cleanup: Tonight, 3:00 AM
Next inquiry cleanup: 1 Feb 2026
Next anonymization: 1 Jan 2027

Last cleanup: 14 Jan 2026

- Deleted 23 expired tokens
- Deleted 5 old inquiries

─────────────────────────────────
📥 Data Requests
─────────────────────────────────

Pending export requests: 0
Pending deletion requests: 0

[ View Request History ]

─────────────────────────────────

`### Audit Log Entry for Retention Actions
```json
{
  "action": "DATA_ANONYMIZED",
  "resource_type": "guest",
  "details": {
    "guests_anonymized": 12,
    "bookings_affected": 15,
    "reason": "retention_policy_7_years",
    "job_id": "retention_2033_01"
  }
}
```

### Compliance Checklist
- [ ] Retention periods documented and communicated
- [ ] Automated cleanup jobs implemented
- [ ] Anonymization process tested
- [ ] Data export functionality available
- [ ] Deletion request process documented
- [ ] Staff trained on data handling
- [ ] Backup retention aligned with policy
---`

---

## 🧪 Testing Strategy

### Unit Tests

- [ ]  Revenue calculation logic (sum by property, by month)
- [ ]  Expense aggregation per property
- [ ]  Profit calculation (revenue - expenses)
- [ ]  Inquiry expiry logic (7 days)
- [ ]  Availability overlap detection
- [ ]  Date range validation
- [ ]  Permission checks per role

### Integration Tests

- [ ]  Auth flow: register → login → refresh → logout
- [ ]  Inquiry → booking conversion flow
- [ ]  Booking → availability block creation
- [ ]  Payment logging → transaction creation → dashboard update
- [ ]  Audit log creation on all tracked actions

### End-to-End Tests

- [ ]  Public inquiry submission → admin notification → admin sees inquiry
- [ ]  Admin converts inquiry → booking created → dates blocked
- [ ]  Admin logs payment → income transaction created → profit updated
- [ ]  Telegram bot logs expense → transaction created → visible in dashboard
- [ ]  Owner exports data → CSV downloads correctly

### Manual Testing Checklist

- [ ]  All forms submit correctly
- [ ]  Validation errors display clearly
- [ ]  Mobile responsive design (test on low-end Android phone)
- [ ]  Slow network behavior (throttle to 3G)
- [ ]  Cross-browser: Chrome, Safari, Firefox
- [ ]  Error handling: API failures show user-friendly messages
- [ ]  Loading states on all async actions
- [ ]  Empty states (no properties, no transactions, no bookings)
- [ ]  Token expiry handling (auto-refresh or redirect to login)

### Test Data Requirements

Minimum test dataset:

- 3 properties (different types/locations)
- 50+ transactions (mix of income/expense across properties)
- 10+ bookings (various statuses: confirmed, completed, cancelled)
- 20+ inquiries (various statuses: new, contacted, expired, converted)
- 6 months of historical data for realistic reporting

### Test Accounts

| Role | Email | Password |
| --- | --- | --- |
| Owner | owner@test.com | TestOwner123! |
| Staff | staff@test.com | TestStaff123! |

Telegram test user IDs: Configured in `.env.test`

---

## 🔧 Environment Variables

### Required

| Variable | Description | Example |
| --- | --- | --- |
| DATABASE_URL | PostgreSQL connection string | postgres://user:pass@host:5432/db |
| JWT_SECRET | Secret for access tokens | random-64-char-string |
| JWT_REFRESH_SECRET | Secret for refresh tokens | different-64-char-string |
| TELEGRAM_BOT_TOKEN | From BotFather | 123456789:ABCdef... |
| STORAGE_ENDPOINT | R2/Spaces endpoint | https://xxx.r2.cloudflarestorage.com |
| STORAGE_ACCESS_KEY | Storage access key | ... |
| STORAGE_SECRET_KEY | Storage secret key | ... |
| STORAGE_BUCKET | Bucket name | nyumbaops-images |
| PUBLIC_URL | Public site URL | https://nyumbastays.com |
| DASHBOARD_URL | Dashboard URL | https://app.nyumbastays.com |

### Optional

| Variable | Description | Default |
| --- | --- | --- |
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| SENTRY_DSN | Error tracking | (disabled) |
| RESEND_API_KEY | Email service | (disabled) |
| LOG_LEVEL | Logging verbosity | info |

### Environment Files

- `.env.development` - Local development
- `.env.test` - Test environment
- `.env.production` - Production (secrets via platform, not committed)
- `.env.example` - Template with dummy values (committed to repo)

---

## 🧠 Design Philosophy

- **Manual-first, automation later** - No premature integrations
- **Owner clarity > accounting perfection** - Usable beats precise
- **Every action traceable** - Audit logs on everything
- **No feature without a business reason** - Solve real pain points
- **Mobile-first for Malawi** - Low bandwidth, small screens
- **Designed to scale, built simple** - Can become SaaS later

---

---
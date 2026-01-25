**DATABASE SCHEMA (MVP)**

**SCHEMA OVERVIEW**

---

## 🗑️ Soft Delete Strategy

### Overview

Instead of permanently deleting records, we mark them as deleted using a `deleted_at` timestamp. This preserves data integrity and audit trails.

### Tables with Soft Delete

| Table | Soft Delete | Reason |
| --- | --- | --- |
| users | ✅ Yes | Preserve audit trail, transaction history |
| properties | ✅ Yes | Preserve financial history |
| bookings | ✅ Yes | Preserve guest and payment history |
| transactions | ❌ No | Immutable by design (delete only via owner) |
| guests | ✅ Yes | Preserve booking history |
| categories | ✅ Yes | Already has `is_active` flag (use that instead) |
| inquiries | ✅ Yes | Preserve conversion history |
| payments | ❌ No | Linked to transactions, immutable |
| media | ❌ No | Hard delete OK (just images) |
| audit_logs | ❌ No | Never deleted (append-only) |
| refresh_tokens | ❌ No | Hard delete OK (ephemeral) |
| notification_settings | ❌ No | Hard delete OK (recreated with user) |

### Schema Changes

**Add to `users` table:**

```sql
deleted_at TIMESTAMP NULL DEFAULT NULL

```

**Add to `properties` table:**

```sql
deleted_at TIMESTAMP NULL DEFAULT NULL

```

**Add to `bookings` table:**

```sql
deleted_at TIMESTAMP NULL DEFAULT NULL

```

**Add to `guests` table:**

```sql
deleted_at TIMESTAMP NULL DEFAULT NULL

```

**Add to `inquiries` table:**

```sql
deleted_at TIMESTAMP NULL DEFAULT NULL

```

### Index Updates

Add partial indexes for efficient queries on non-deleted records:

```sql
-- Users (exclude deleted from normal queries)
CREATE INDEX users_active_idx ON users (email) WHERE deleted_at IS NULL;

-- Properties (exclude deleted from listings)
CREATE INDEX properties_active_list_idx ON properties (status, is_public) WHERE deleted_at IS NULL;

-- Bookings (exclude deleted from availability checks)
CREATE INDEX bookings_active_idx ON bookings (property_id, check_in, check_out) WHERE deleted_at IS NULL;

-- Guests (exclude deleted from search)
CREATE INDEX guests_active_idx ON guests (phone, email) WHERE deleted_at IS NULL;

-- Inquiries (exclude deleted from lists)
CREATE INDEX inquiries_active_idx ON inquiries (property_id, status) WHERE deleted_at IS NULL;

```

### Prisma Schema Updates

```
model User {
  // ... existing fields ...
  deletedAt DateTime? @map("deleted_at")

  @@index([email], map: "users_active_idx")
  @@map("users")
}

model Property {
  // ... existing fields ...
  deletedAt DateTime? @map("deleted_at")

  @@map("properties")
}

model Booking {
  // ... existing fields ...
  deletedAt DateTime? @map("deleted_at")

  @@map("bookings")
}

model Guest {
  // ... existing fields ...
  deletedAt DateTime? @map("deleted_at")

  @@map("guests")
}

model Inquiry {
  // ... existing fields ...
  deletedAt DateTime? @map("deleted_at")

  @@map("inquiries")
}

```

### Query Patterns

**Default: Exclude Deleted Records**

```tsx
// Prisma - all normal queries exclude deleted
const properties = await prisma.property.findMany({
  where: {
    deletedAt: null,  // Always add this
    status: 'ACTIVE'
  }
});

```

**Include Deleted (Admin/Audit Views)**

```tsx
// When you need to see deleted records
const allProperties = await prisma.property.findMany({
  // No deletedAt filter = includes deleted
});

// Or explicitly include deleted
const withDeleted = await prisma.property.findMany({
  where: {
    OR: [
      { deletedAt: null },
      { deletedAt: { not: null } }
    ]
  }
});

```

**Soft Delete Operation**

```tsx
// Instead of delete()
await prisma.property.update({
  where: { id: propertyId },
  data: { deletedAt: new Date() }
});

```

**Restore Deleted Record**

```tsx
await prisma.property.update({
  where: { id: propertyId },
  data: { deletedAt: null }
});

```

### API Behavior

| Endpoint | Behavior |
| --- | --- |
| GET /properties | Returns only non-deleted |
| GET /properties/:id | Returns 404 if deleted |
| DELETE /properties/:id | Sets deleted_at (soft delete) |
| GET /properties?include_deleted=true | Owner only: includes deleted |

### Audit Log Entry for Soft Delete

```json
{
  "action": "PROPERTY_DELETED",
  "resource_type": "property",
  "resource_id": "uuid",
  "details": {
    "property_name": "Area 43 – House A",
    "soft_delete": true,
    "can_restore": true
  }
}

```

### UI Considerations

**Admin Dashboard:**

- Deleted items not shown in normal lists
- Add "View Deleted" toggle for owner (future feature)
- Show "Restore" option for deleted items

**Deletion Confirmation:**

Delete this property?
─────────────────────

🏠 Area 43 – House A

This property will be hidden from all lists
and reports. You can restore it later if needed.

Historical data (transactions, bookings) will
be preserved.

[ Cancel ]      [ Delete ]

`### Migration Script
```sql
-- Add deleted_at to existing tables
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE properties ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE guests ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE inquiries ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Add partial indexes
CREATE INDEX users_active_idx ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX properties_active_list_idx ON properties (status, is_public) WHERE deleted_at IS NULL;
CREATE INDEX bookings_active_idx ON bookings (property_id, check_in, check_out) WHERE deleted_at IS NULL;
CREATE INDEX guests_active_idx ON guests (phone, email) WHERE deleted_at IS NULL;
CREATE INDEX inquiries_active_idx ON inquiries (property_id, status) WHERE deleted_at IS NULL;
```
---`

---

## 💱 Currency Handling

### Supported Currencies

| Currency | Code | Symbol | Usage |
| --- | --- | --- | --- |
| Malawian Kwacha | MWK | MWK | Primary currency, all local transactions |
| British Pound | GBP | £ | Secondary currency, Airbnb payouts |

### Design Decisions

1. **No automatic conversion** – Amounts stored in original currency
2. **Separate reporting** – Dashboard shows MWK and GBP totals separately
3. **Manual entry** – Owner enters GBP amounts as received from Airbnb
4. **No exchange rate tracking** – Simplifies system, owner manages conversion externally if needed

### Storage Rules

- All amounts stored as BigInt in smallest unit:
    - MWK: tambala (MWK 45,000 = 4500000)
    - GBP: pence (£150.00 = 15000)
- Currency code stored alongside every transaction
- Default currency: MWK

### Database Impact

The `transactions` table already has:

```sql
amount BigInt           -- Stored in smallest unit
currency String(3)      -- 'MWK' or 'GBP'

```

---

## 🏘️ Multi-Property Expense Handling

### Problem

Some expenses apply to multiple properties:

- Shared gardener/security guard
- Bulk supply purchases
- Shared internet subscription
- Vehicle fuel used across properties

### Solution: Split Transactions

### Option 1: Manual Split (MVP Approach)

When logging a shared expense, the owner manually creates separate transactions for each property:

**Example:** MWK 60,000 gardener fee for 3 properties

- Transaction 1: MWK 20,000 → Property A (Gardener)
- Transaction 2: MWK 20,000 → Property B (Gardener)
- Transaction 3: MWK 20,000 → Property C (Gardener)

**Pros:**

- Simple, no schema changes
- Clear audit trail
- Works with existing reports

**Cons:**

- More data entry
- No automatic splitting

### Option 2: General/Overhead Expenses

Allow transactions with `property_id = NULL` for business-wide expenses:

```sql
-- Transaction with no property
INSERT INTO transactions (type, amount, property_id, category_id, ...)
VALUES ('EXPENSE', 6000000, NULL, :overhead_category, ...);

```

**Dashboard Display:**

📊 Business Summary
Per-Property Profit:
🏠 Area 43 – House A: MWK 550,000
🏠 Area 10 – Studio: MWK 240,000
🏠 Area 43 – Cottage: MWK -40,000
General/Overhead Expenses: MWK 60,000
Net Business Profit: MWK 690,000

**Pros:**

- Accurate per-property profit
- Clear separation of direct vs overhead costs

**Cons:**

- Slightly more complex reporting

### Recommended Approach for MVP

1. Use **Option 1 (Manual Split)** for most cases
2. Support **Option 2 (NULL property_id)** for true business-wide expenses
3. Add "General/Business" as a virtual property option in dropdowns

### UI Changes

**Add Expense Form - Property Selector:**

Property *
┌──────────────────────────────┐
│ Select property...       ▼   │
└──────────────────────────────┘

Options:

- Area 43 – House A
- Area 10 – Studio
- Area 43 – Cottage
- ─────────────────
- General (All Properties)

**Telegram Bot:**

/add_expense

Bot: "Select property:"
[Area 43 – House A]
[Area 10 – Studio]
[Area 43 – Cottage]
[General (All Properties)]

`### Reporting Considerations
- Property reports show only direct property expenses
- Business summary shows total including general expenses
- "General" expenses displayed separately in dashboard

### New Category Suggestions
Add these expense categories for overhead:
| Name | Description |
|------|-------------|
| Business Overhead | General business expenses |
| Shared Services | Gardener, security shared across properties |
| Vehicle & Transport | Fuel, maintenance for business vehicle |
| Marketing | Website, advertising costs |
| Professional Services | Accounting, legal fees |
---`

### Dashboard Display

### Summary Cards (Show Both Currencies)

💰 Income This Month
MWK 2,450,000
£ 320.00
❌ Expenses This Month
MWK 900,000
£ 0.00
📈 Profit This Month
MWK 1,550,000
£ 320.00

### Per-Property Breakdown

Each property shows:

- MWK income / expenses / profit
- GBP income / expenses / profit (if any)

### Transaction List

- Show currency symbol with each amount
- Filter by currency (optional)

### Telegram Bot Display

📊 Business Summary (This Month)
🇲🇼 MWK
💰 Income: MWK 2,450,000
❌ Expenses: MWK 900,000
📈 Profit: MWK 1,550,000
🇬🇧 GBP
💰 Income: £320.00
❌ Expenses: £0.00
📈 Profit: £320.00

### API Response Format

```json
{
  "success": true,
  "data": {
    "summary": {
      "MWK": {
        "income": 245000000,
        "expenses": 90000000,
        "profit": 155000000
      },
      "GBP": {
        "income": 32000,
        "expenses": 0,
        "profit": 32000
      }
    }
  }
}

```

### Key Queries Updated

**Profit by Currency:**

```sql
SELECT
  currency,
  SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) AS income,
  SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) AS expenses,
  SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) -
  SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) AS profit
FROM transactions
WHERE date >= :start_date AND date < :end_date
GROUP BY currency;

```

**Profit by Property by Currency:**

```sql
SELECT
  p.name,
  t.currency,
  SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) AS income,
  SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) AS expenses
FROM transactions t
JOIN properties p ON p.id = t.property_id
WHERE t.date >= :start_date AND t.date < :end_date
GROUP BY p.id, p.name, t.currency
ORDER BY p.name, t.currency;

```

### Form Changes

**Add Income Form:**

- Add currency selector (default: MWK)
- For Airbnb source, auto-suggest GBP

**Add Expense Form:**

- Currency selector (default: MWK)
- Most expenses will be MWK

### Validation Rules

- Currency must be 'MWK' or 'GBP'
- Amount must be positive integer
- No mixing currencies in a single transaction

### Future Considerations

- Could add more currencies later (USD, EUR, ZAR)
- Could add optional exchange rate field for reference
- Could add currency conversion reports

---

**Tables**

**# Table** **Purpose**

1 users System users (owner + staff)

2 refresh_tokens Session management

3 properties All rental units

4 media Property photos

5 guests People who stay or inquire

6 categories Classify income/expenses

7 bookings All stays (Airbnb + local)

8 payments Payments against bookings

9 transactions Core money table

10 inquiries Local booking requests

11 audit_logs Track all system actions

12 notification_settings User notification preferences

**users**

**Purpose:** System users (owner + staff)

**Field Type** **Required Default Description**

id UUID gen_random_uuid() Primary key

name String(100) Full name

**Field Type** **Required Default Description**

Login email (unique,

email String(255)

lowercase)

phone String(20) Phone number

role Enum OWNER, STAFF

password_hash String(255) Bcrypt hash

Telegram user ID for bot

telegram_id String(50)

auth

telegram_username String(50) Telegram @username

is_active Boolean true Soft disable

failed_login_count Integer 0 Track failed attempts

locked_until Timestamp Account lockout time

last_login_at Timestamp Last successful login

created_at Timestamp now()

updated_at Timestamp now()

**Indexes:**

- UNIQUE: email (case-insensitive)
- UNIQUE: telegram_id (where not null)
- INDEX: is_active

**Notes:**

- Email stored lowercase
- Password hashed with bcrypt (cost 10)
- Lock account after 5 failed attempts for 15 minutes
- telegram_id links user to Telegram bot

**refresh_tokens**

**Purpose:** Manage user sessions and refresh tokens

**Field Type** **Required Default** **Description**

id UUID gen_random_uuid() Primary key

user_id UUID FK → users

token_hash String(255) Hashed refresh token

expires_at Timestamp Token expiration

device_info String(255) ip_address String(45)

Browser/device identifier IP when token was issued

is_revoked Boolean false For manual logout/revocation

created_at Timestamp now()

**Indexes:**

- INDEX: user_id
- INDEX: token_hash
- INDEX: expires_at

**Notes:**

- Delete expired tokens via scheduled job (daily)
- Revoke all tokens for "logout everywhere" feature
- Token rotated on each refresh (old token invalidated)

**properties**

**Purpose:** All rental units / houses

**Field** **Type** **Required Default** **Description**

id UUID gen_random_uuid() Primary key

name String(100) e.g., "Area 43 – 2 Bedroom"

code String(20) Short reference (A43-2B)

location String(100) Area (e.g., "Area 43")

address String(255) Full street address

APARTMENT, HOUSE, STUDIO,

type Enum

COTTAGE

status Enum ACTIVE ACTIVE, INACTIVE

bedrooms Integer Number of bedrooms

bathrooms Integer Number of bathrooms

sleeps Integer Maximum guests

default_price BigInt Base nightly price (in tambala)

description Text Public description

house_rules Text Rules for guests

amenities JSONB '[]' Array of amenity strings

is_public Boolean true Show on public website

notes Text Internal notes (not public)

created_at Timestamp now()

updated_at Timestamp now()

**Indexes:**

- INDEX: status
- INDEX: is_public
- INDEX: location

**Amenities Example:**

["wifi", "parking", "kitchen", "backup_power", "hot_water", "security", "tv",

"washing_machine", "air_conditioning", "pool"]

**Price Note:**

- Store in tambala (smallest unit) as BigInt
- MWK 45,000 = 4500000 tambala
- Avoids floating point precision issues
- Frontend converts for display

---

## ⏰ Check-in/Check-out Times

### Schema Changes

**Add to `properties` table:**

```sql
check_in_time TIME DEFAULT '14:00',     -- Default 2:00 PM
check_out_time TIME DEFAULT '11:00'     -- Default 11:00 AM

```

### Prisma Schema Update

```
model Property {
  // ... existing fields ...
  checkInTime   String?  @default("14:00") @map("check_in_time")
  checkOutTime  String?  @default("11:00") @map("check_out_time")
  // ...
}

```

**Note:** Using String instead of Time for Prisma compatibility. Format: "HH:MM" (24-hour).

### Default Values

| Property Type | Default Check-in | Default Check-out |
| --- | --- | --- |
| All | 14:00 (2:00 PM) | 11:00 (11:00 AM) |

### UI Display

**Property Detail (Public):**

House Rules
───────────

- Check-in: 2:00 PM
- Check-out: 11:00 AM
- No parties
- No smoking indoors

`**Booking Confirmation:**`

Your Booking Details
────────────────────
🏠 Area 43 – 2 Bedroom

📅 Check-in:  Sat, 12 Jan 2026 at 2:00 PM
📅 Check-out: Tue, 15 Jan 2026 at 11:00 AM

Please arrive after 2:00 PM.
Late check-out may incur additional fees.

`**Add/Edit Property Form:**`

Check-in & Check-out Times
──────────────────────────

Check-in Time
┌──────────────────────────────┐
│ 14:00 (2:00 PM)          ▼   │
└──────────────────────────────┘

Check-out Time
┌──────────────────────────────┐
│ 11:00 (11:00 AM)         ▼   │
└──────────────────────────────┘

Common options:
Check-in: 12:00, 13:00, 14:00, 15:00, 16:00
Check-out: 10:00, 11:00, 12:00

`### API Response
```json
{
  "id": "uuid",
  "name": "Area 43 – 2 Bedroom",
  "check_in_time": "14:00",
  "check_out_time": "11:00",
  // ... other fields
}
```

### Telegram Bot Display`

/property Area43

🏠 Area 43 – House A
✓ Active • Area 43

📊 This Month:
💰 Income: MWK 850,000
❌ Expenses: MWK 300,000
📈 Profit: MWK 550,000

⏰ Check-in: 2:00 PM
⏰ Check-out: 11:00 AM

`### Migration
```sql
ALTER TABLE properties ADD COLUMN check_in_time TIME DEFAULT '14:00';
ALTER TABLE properties ADD COLUMN check_out_time TIME DEFAULT '11:00';
```
---`

**media**

**Purpose:** Property photos for listing

**Field** **Type** **Required Default Description**

id UUID gen_random_uuid() Primary key

property_id UUID FK → properties

url String(500) Full image URL

thumbnail_url String(500) Smaller version URL

alt_text String(255) Accessibility description

is_cover Boolean false Main listing image

sort_order Integer 0 Display order

file_size Integer Size in bytes

width Integer Image width in pixels

height Integer Image height in pixels

created_at Timestamp now()

**Indexes:**

- INDEX: property_id
- INDEX: (property_id, sort_order)

**Constraints:**

- ON DELETE CASCADE (when property deleted)
- sort_order >= 0

**Notes:**

- First image (sort_order = 0) used as thumbnail if is_cover not set
- Max 10 images per property
- Max 5MB per image

**guests**

**Purpose:** People who stay or inquire (local + Airbnb)

**Field** **Type** **Required Default Description**

id UUID gen_random_uuid() Primary key

full_name String(100) Guest name

phone String(20) Normalized format

email String(255) Email address

source Enum AIRBNB, LOCAL, OTHER

notes Text Internal notes about guest

total_bookings Integer 0 Count of bookings

total_spent BigInt 0 Lifetime value (tambala)

created_at Timestamp now()

**Field** **Type** **Required Default Description**

updated_at Timestamp now()

**Indexes:**

- INDEX: phone
- INDEX: email
- INDEX: source

**Notes:**

- total_bookings updated when booking completed
- total_spent updated when payment received
- Phone stored in normalized format (265991234567)

---

## 🚫 Guest Blacklist

### Overview

Flag problematic guests to prevent future bookings and warn staff.

### Schema Changes

**Add to `guests` table:**

```sql
is_blacklisted BOOLEAN DEFAULT false,
blacklist_reason TEXT NULL,
blacklisted_at TIMESTAMP NULL,
blacklisted_by UUID NULL REFERENCES users(id)

```

### Prisma Schema Update

```
model Guest {
  // ... existing fields ...
  isBlacklisted     Boolean   @default(false) @map("is_blacklisted")
  blacklistReason   String?   @map("blacklist_reason")
  blacklistedAt     DateTime? @map("blacklisted_at")
  blacklistedBy     String?   @map("blacklisted_by")

  blacklistedByUser User?     @relation("BlacklistedBy", fields: [blacklistedBy], references: [id])
  // ...
}

```

### Index

```sql
CREATE INDEX guests_blacklisted_idx ON guests (is_blacklisted) WHERE is_blacklisted = true;

```

### UI: Guest Detail Page

Guest Details
─────────────
👤 John Banda
📞 0991234567
📧 [john@email.com](mailto:john@email.com)

Source: Local
Total Bookings: 3
Total Spent: MWK 405,000

─────────────────────────────────

⚠️ BLACKLISTED
Reason: Property damage, refused to pay for repairs
Blacklisted: 15 Dec 2025 by Owner

[ Remove from Blacklist ]

─────────────────────────────────

Booking History:

- Area 43 – 12-15 Jan 2026 (Cancelled)
- Area 10 – 5-8 Nov 2025 (Completed)
- Area 43 – 20-22 Oct 2025 (Completed)

`### UI: Blacklist Action`

Blacklist this guest?
─────────────────────

👤 John Banda
📞 0991234567

This will:

- Flag the guest in the system
- Show a warning when they inquire again
- Not automatically block bookings (manual review)

Reason (required):
┌──────────────────────────────┐
│ Property damage, refused to  │
│ pay for repairs              │
│                              │
└──────────────────────────────┘

[ Cancel ]        [ Blacklist ]

`### Warning on New Inquiry
When a blacklisted guest submits an inquiry (matched by phone):

**Dashboard Inquiry Card:**`

┌──────────────────────────────┐
│ 🔴 NEW               2h ago  │
│ ─────────────────────────────│
│ ⚠️ BLACKLISTED GUEST         │
│ ─────────────────────────────│
│ 🏠 Area 43 – 2 Bedroom       │
│ 👤 John Banda                │
│ 📞 0991234567                │
│ ─────────────────────────────│
│ Blacklist Reason:            │
│ "Property damage, refused    │
│ to pay for repairs"          │
│ ─────────────────────────────│
│ [ View Details ] [ Decline ] │
└──────────────────────────────┘

`**Telegram Notification:**`

⚠️ New Inquiry - BLACKLISTED GUEST

🏠 Area 43 – 2 Bedroom
👤 John Banda
📞 0991234567
📅 20 – 23 Jan 2026

🚫 This guest is blacklisted:
"Property damage, refused to pay for repairs"

[ View in Dashboard ]

`### API Endpoints`

POST /api/v1/guests/:id/blacklist      -- Add to blacklist
DELETE /api/v1/guests/:id/blacklist    -- Remove from blacklist
GET /api/v1/guests?blacklisted=true    -- List blacklisted guests

`### Blacklist Request Body
```json
{
  "reason": "Property damage, refused to pay for repairs"
}
```

### Audit Log Entry
```json
{
  "action": "GUEST_BLACKLISTED",
  "resource_type": "guest",
  "resource_id": "uuid",
  "details": {
    "guest_name": "John Banda",
    "guest_phone": "0991234567",
    "reason": "Property damage, refused to pay for repairs"
  }
}
```

### Guest Matching Logic
When new inquiry comes in, check for blacklisted guests:
```sql
SELECT * FROM guests 
WHERE is_blacklisted = true 
  AND deleted_at IS NULL
  AND (
    phone = :inquiry_phone 
    OR (email IS NOT NULL AND email = :inquiry_email)
  );
```

### Migration
```sql
ALTER TABLE guests ADD COLUMN is_blacklisted BOOLEAN DEFAULT false;
ALTER TABLE guests ADD COLUMN blacklist_reason TEXT NULL;
ALTER TABLE guests ADD COLUMN blacklisted_at TIMESTAMP NULL;
ALTER TABLE guests ADD COLUMN blacklisted_by UUID NULL REFERENCES users(id);

CREATE INDEX guests_blacklisted_idx ON guests (is_blacklisted) WHERE is_blacklisted = true;
```
---`

**categories**

**Purpose:** Classify income and expenses

**Field** **Type** **Required Default** **Description**

id UUID gen_random_uuid() Primary key

name String(50) e.g., "Utilities"

type Enum INCOME, EXPENSE

description String(255) Explanation of category

icon String(50) Icon identifier (e.g., "bolt")

color String(7) Hex color (e.g., "#F59E0B")

is_system Boolean false Protect default categories

is_active Boolean true Soft delete

sort_order Integer 0 Display order

**Field** **Type** **Required Default** **Description**

created_at Timestamp now()

**Indexes:**

- INDEX: type
- INDEX: is_active
- UNIQUE: (name, type)

**Constraints:**

- System categories cannot be deleted
- Name unique per type

**bookings**

**Purpose:** All stays (Airbnb + local)

**Field Type** **Required Default** **Description**

id UUID gen_random_uuid() Primary key

Human-readable ID (BKG-

reference String(20)

0123)

property_id UUID FK → properties

guest_id UUID FK → guests

FK → inquiries (if from

inquiry_id UUID

inquiry)

source Enum AIRBNB, LOCAL, OTHER

PENDING, CONFIRMED,

status Enum PENDING CHECKED_IN,

COMPLETED, CANCELLED

check_in Date Check-in date

**Field Type** **Required Default** **Description**

check_out Date Check-out date

nights Integer Number of nights

guests_count Integer Number of guests

price_per_night BigInt Price per night (tambala)

Expected revenue

total_amount BigInt

(tambala)

Sum of payments

amount_paid BigInt 0

(tambala)

currency String(3) 'MWK' Currency code

notes Text Internal notes

cancellation_reason Text If cancelled

cancelled_at Timestamp When cancelled

checked_in_at Timestamp Actual check-in time

checked_out_at Timestamp Actual check-out time

created_by UUID FK → users

created_at Timestamp now()

updated_at Timestamp now()

**Indexes:**

- UNIQUE: reference
- INDEX: property_id
- INDEX: guest_id
- INDEX: status
- INDEX: check_in
- INDEX: check_out

• INDEX: (property_id, check_in, check_out) — for availability queries • INDEX: created_at

**Constraints:**

check_out > check_in

• • nights > 0

• price_per_night > 0

• total_amount > 0

amount_paid >= 0

• • ON DELETE RESTRICT for property_id

**Reference Format:**

• BKG-0001, BKG-0002, etc.

- Generated sequentially

**Status Flow:**

PENDING → CONFIRMED → CHECKED_IN → COMPLETED ↓ ↓ ↓

└─────────┴───────────┴──→ CANCELLED

---

## 📝 Booking Modification History

### Overview

Track changes to bookings (date changes, guest count updates, price adjustments) for audit purposes.

### Design Decision: JSON Field vs Separate Table

**Option A: JSON Field (Recommended for MVP)**

- Simpler implementation
- History stored in booking record
- Sufficient for audit needs

**Option B: Separate Table**

- More queryable
- Better for complex reporting
- Overkill for MVP

### Schema Change (Option A - JSON Field)

**Add to `bookings` table:**

```sql
modification_history JSONB DEFAULT '[]'

```

### Prisma Schema Update

```
model Booking {
  // ... existing fields ...
  modificationHistory Json @default("[]") @map("modification_history")
  // ...
}

```

### History Entry Structure

```tsx
interface BookingModification {
  timestamp: string;          // ISO datetime
  modified_by: string;        // User ID
  modified_by_name: string;   // User name (denormalized for display)
  changes: {
    field: string;
    old_value: any;
    new_value: any;
  }[];
  reason?: string;            // Optional reason for change
}

```

### Example History

```json
[
  {
    "timestamp": "2026-01-12T10:30:00Z",
    "modified_by": "user-uuid",
    "modified_by_name": "Owner",
    "changes": [
      {
        "field": "check_out",
        "old_value": "2026-01-15",
        "new_value": "2026-01-17"
      },
      {
        "field": "nights",
        "old_value": 3,
        "new_value": 5
      },
      {
        "field": "total_amount",
        "old_value": 13500000,
        "new_value": 22500000
      }
    ],
    "reason": "Guest extended stay"
  },
  {
    "timestamp": "2026-01-10T14:20:00Z",
    "modified_by": "user-uuid",
    "modified_by_name": "Staff (John)",
    "changes": [
      {
        "field": "guests_count",
        "old_value": 2,
        "new_value": 3
      }
    ],
    "reason": "Additional guest added"
  }
]

```

### Tracked Fields

| Field | Track Changes |
| --- | --- |
| check_in | ✅ Yes |
| check_out | ✅ Yes |
| nights | ✅ Yes |
| guests_count | ✅ Yes |
| price_per_night | ✅ Yes |
| total_amount | ✅ Yes |
| status | ✅ Yes (also in audit_logs) |
| notes | ❌ No (minor changes) |
| cancellation_reason | ✅ Yes |

### Implementation Logic

```tsx
async function updateBooking(
  bookingId: string,
  updates: Partial<Booking>,
  userId: string,
  reason?: string
) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  // Build changes array
  const changes = [];
  const trackedFields = ['check_in', 'check_out', 'nights', 'guests_count',
                         'price_per_night', 'total_amount', 'status'];

  for (const field of trackedFields) {
    if (updates[field] !== undefined && updates[field] !== booking[field]) {
      changes.push({
        field,
        old_value: booking[field],
        new_value: updates[field]
      });
    }
  }

  // Only add history entry if there are changes
  if (changes.length > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const historyEntry = {
      timestamp: new Date().toISOString(),
      modified_by: userId,
      modified_by_name: `${user.role === 'OWNER' ? 'Owner' : 'Staff'} (${user.name})`,
      changes,
      reason
    };

    updates.modificationHistory = [
      ...booking.modificationHistory,
      historyEntry
    ];
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: updates
  });
}

```

### UI: Booking Detail - History Section

Booking History
───────────────

📝 12 Jan 2026, 10:30 AM – Owner
Extended stay
• Check-out: 15 Jan → 17 Jan
• Nights: 3 → 5
• Total: MWK 135,000 → MWK 225,000

📝 10 Jan 2026, 2:20 PM – Staff (John)
Additional guest added
• Guests: 2 → 3

📝 10 Jan 2026, 9:15 AM – Owner
Booking created

`### Modification Dialog`

Modify Booking
──────────────

🏠 Area 43 – House A
👤 John Banda

Current Dates: 12 – 15 Jan (3 nights)

New Check-out Date *
┌──────────────────────────────┐
│ 17 Jan 2026              ▼   │
└──────────────────────────────┘

New Total: MWK 225,000
(5 nights × MWK 45,000)

Reason for change (optional):
┌──────────────────────────────┐
│ Guest extended stay          │
└──────────────────────────────┘

[ Cancel ]        [ Save Changes ]

`### API Response (Booking Detail)
```json
{
  "id": "uuid",
  "reference": "BKG-0123",
  "property_id": "uuid",
  "check_in": "2026-01-12",
  "check_out": "2026-01-17",
  "nights": 5,
  "total_amount": 22500000,
  "modification_history": [
    {
      "timestamp": "2026-01-12T10:30:00Z",
      "modified_by": "user-uuid",
      "modified_by_name": "Owner",
      "changes": [
        { "field": "check_out", "old_value": "2026-01-15", "new_value": "2026-01-17" },
        { "field": "nights", "old_value": 3, "new_value": 5 },
        { "field": "total_amount", "old_value": 13500000, "new_value": 22500000 }
      ],
      "reason": "Guest extended stay"
    }
  ]
}
```

### Audit Log Integration
Major changes also create audit log entries:
- Status changes: Always
- Date changes: Always
- Price changes: Always
- Guest count: Only if significant (±2)
```json
{
  "action": "BOOKING_UPDATED",
  "resource_type": "booking",
  "resource_id": "uuid",
  "details": {
    "booking_reference": "BKG-0123",
    "property_name": "Area 43 – House A",
    "changes": {
      "check_out": { "from": "2026-01-15", "to": "2026-01-17" },
      "nights": { "from": 3, "to": 5 },
      "total_amount": { "from": 13500000, "to": 22500000 }
    },
    "reason": "Guest extended stay"
  }
}
```

### Migration
```sql
ALTER TABLE bookings ADD COLUMN modification_history JSONB DEFAULT '[]';
```

### Query: Bookings with Modifications
```sql
-- Find bookings that have been modified
SELECT * FROM bookings 
WHERE jsonb_array_length(modification_history) > 0
ORDER BY updated_at DESC;

-- Find bookings with date changes
SELECT * FROM bookings
WHERE modification_history @> '[{"changes": [{"field": "check_in"}]}]'
   OR modification_history @> '[{"changes": [{"field": "check_out"}]}]';
```
---`

**payments**

**Purpose:** Track individual payments against bookings

**Field Type** **Required Default** **Description**

id UUID gen_random_uuid() Primary key

booking_id UUID FK → bookings

transaction_id UUID FK → transactions

**Field Type** **Required Default Description**

amount BigInt Payment amount (tambala)

payment_method Enum

CASH, BANK,

MOBILE_MONEY

received_at Timestamp When payment was received

notes Text Payment notes

created_by UUID FK → users

created_at Timestamp now()

**Indexes:**

- INDEX: booking_id
- INDEX: transaction_id

**Constraints:**

- amount > 0
- ON DELETE RESTRICT for booking_id

**Notes:**

- A booking can have multiple payments (deposit + balance)
- Each payment creates a transaction automatically
- Update booking.amount_paid when payment added
- transaction_id links to the income transaction created

**Relationship:**

- bookings 1:N payments
- payments 1:1 transactions (each payment = 1 income transaction)

**transactions**

**Purpose:** Core money table (everything in & out)

This is the heart of the system.

**Field Type** **Required Default Description**

id UUID gen_random_uuid() Primary key

type Enum INCOME, EXPENSE

amount BigInt Positive value (tambala)

currency String(3) 'MWK' Currency code

date Date Transaction date

FK → properties (nullable for

property_id UUID

general)

FK → bookings (for booking

booking_id UUID

income)

category_id UUID FK → categories

CASH, BANK,

payment_method Enum

MOBILE_MONEY,

AIRBNB_PAYOUT

reference String(100) Receipt number / external ref

URL to uploaded receipt

receipt_url String(500)

image

notes Text Additional notes

created_by UUID FK → users

created_at Timestamp now()

**Indexes:**

- INDEX: property_id
- INDEX: type
- INDEX: date
- INDEX: category_id
- INDEX: booking_id
- INDEX: (property_id, date) — for property reports
- INDEX: (type, date) — for monthly summaries
- INDEX: created_by

**Constraints:**

- amount > 0
- ON DELETE SET NULL for property_id
- ON DELETE SET NULL for booking_id
- ON DELETE RESTRICT for category_id
- ON DELETE RESTRICT for created_by

**Important:**

- Transactions are **immutable** (no updates)
- Delete only (no edits) in MVP
- All changes logged to audit_logs
- No updated_at field (immutable)

**inquiries**

**Purpose:** Local booking requests and enquiries

**Field** **Type** **Required Default** **Description**

id UUID gen_random_uuid() Primary key

Human-readable ID

reference String(20)

(INQ-0047)

BOOKING_REQUEST,

type Enum

ENQUIRY

**Field** **Type** **Required Default** **Description**

property_id UUID FK → properties

full_name String(100) Guest name

phone String(20) Normalized format

email String(255) Optional email

Required for

check_in Date

BOOKING_REQUEST

Required for

check_out Date

BOOKING_REQUEST

guests_count Integer Number of guests

message Text Guest message

NEW, CONTACTED,

status Enum NEW CONVERTED,

RESPONDED, EXPIRED

notes Text Internal notes

converted_booking_id UUID

FK → bookings (if

converted)

expires_at Timestamp Auto-expiry date

created_at Timestamp now()

updated_at Timestamp now()

**Indexes:**

- UNIQUE: reference
- INDEX: property_id
- INDEX: status
- INDEX: type
- INDEX: created_at
- INDEX: expires_at

**Constraints:**

- check_out > check_in (when both present)
- ON DELETE RESTRICT for property_id

**Reference Format:**

- INQ-0001, INQ-0002, etc.

**Status Flow:**

BOOKING_REQUEST:

NEW → CONTACTED → CONVERTED (creates booking) ↓

EXPIRED (after 7 days or manual)

ENQUIRY:

NEW → RESPONDED → (closed, no further status) ↓

EXPIRED

**Auto-Expiry:**

- Set expires_at = created_at + 7 days
- Scheduled job marks as EXPIRED when expires_at passed

**audit_logs**

**Purpose:** Track all system actions for accountability

**Field Type** **Required Default Description**

id UUID gen_random_uuid() Primary key

**Field Type** **Required Default Description**

action Enum Action type (see enum)

user_id UUID FK → users (null for failed logins)

resource_type String(50) e.g., 'transaction', 'booking'

resource_id UUID ID of affected resource

details JSONB Additional context

ip_address String(45) Request IP address

user_agent String(500) Browser/device info

created_at Timestamp now()

**Indexes:**

- INDEX: user_id
- INDEX: action
- INDEX: resource_type
- INDEX: created_at
- INDEX: (resource_type, resource_id)

**Constraints:**

- Append-only table (no updates or deletes allowed)
- ON DELETE SET NULL for user_id

**Notes:**

- Retained for 2 years minimum
- No UPDATE or DELETE operations allowed
- Details field stores old/new values for changes

**Details Example:**

{

"old_status": "PENDING",

"new_status": "CONFIRMED",

"amount": 4500000,

"property_name": "Area 43 – House A"

}

**notification_settings**

**Purpose:** Store per-user notification preferences

**Field** **Type** **Required Default** **Description**

id UUID gen_random_uuid() Primary key

FK → users

user_id UUID

(unique)

Alert on new

new_inquiry_telegram Boolean true

inquiry

Email on new

new_inquiry_email Boolean false

inquiry

Alert on booking

booking_confirmed_telegram Boolean true

confirmed

Email on booking

booking_confirmed_email Boolean false

confirmed

Daily summary

daily_summary_telegram Boolean false

via Telegram

Daily summary

daily_summary_email Boolean false

via email

Preferred

daily_summary_time Time '18:00'

summary time

**Field** **Type** **Required Default** **Description**

created_at Timestamp now()

updated_at Timestamp now()

**Indexes:**

- UNIQUE: user_id

**Constraints:**

- ON DELETE CASCADE for user_id

**Notes:**

- One row per user
- Created automatically when user is created
- Updated via Settings page

---

## 🔄 Recurring Expenses

### Overview

Track recurring expenses (utilities, subscriptions, salaries) and optionally auto-generate transactions.

### New Table: `recurring_expenses`

**Purpose:** Define recurring expense templates

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| id | UUID | ✅ | gen_random_uuid() | Primary key |
| name | String(100) | ✅ |  | e.g., "ESCOM – Area 43" |
| property_id | UUID |  | NULL | FK → properties (NULL for general) |
| category_id | UUID | ✅ |  | FK → categories |
| amount | BigInt | ✅ |  | Expected amount (tambala/pence) |
| currency | String(3) | ✅ | 'MWK' | MWK or GBP |
| frequency | Enum | ✅ |  | WEEKLY, MONTHLY, QUARTERLY, YEARLY |
| day_of_month | Integer |  |  | Day to expect (1-31) for monthly |
| day_of_week | Integer |  |  | Day (0-6, Sun-Sat) for weekly |
| payment_method | Enum | ✅ |  | CASH, BANK, MOBILE_MONEY |
| notes | Text |  |  | Default notes for transactions |
| is_active | Boolean | ✅ | true | Enable/disable |
| last_generated_at | Timestamp |  | NULL | When last transaction was created |
| next_due_at | Date |  |  | Next expected date |
| auto_generate | Boolean | ✅ | false | Auto-create transactions (future) |
| created_by | UUID | ✅ |  | FK → users |
| created_at | Timestamp | ✅ | now() |  |
| updated_at | Timestamp | ✅ | now() |  |

### Enum: RecurringFrequency

```sql
CREATE TYPE recurring_frequency AS ENUM (
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY'
);

```

### Indexes

```sql
CREATE INDEX recurring_expenses_property_idx ON recurring_expenses (property_id);
CREATE INDEX recurring_expenses_next_due_idx ON recurring_expenses (next_due_at) WHERE is_active = true;
CREATE INDEX recurring_expenses_active_idx ON recurring_expenses (is_active);

```

### Prisma Schema

```
enum RecurringFrequency {
  WEEKLY
  MONTHLY
  QUARTERLY
  YEARLY
}

model RecurringExpense {
  id              String             @id @default(uuid())
  name            String
  propertyId      String?            @map("property_id")
  categoryId      String             @map("category_id")
  amount          BigInt
  currency        String             @default("MWK")
  frequency       RecurringFrequency
  dayOfMonth      Int?               @map("day_of_month")
  dayOfWeek       Int?               @map("day_of_week")
  paymentMethod   PaymentMethod      @map("payment_method")
  notes           String?
  isActive        Boolean            @default(true) @map("is_active")
  lastGeneratedAt DateTime?          @map("last_generated_at")
  nextDueAt       DateTime?          @map("next_due_at") @db.Date
  autoGenerate    Boolean            @default(false) @map("auto_generate")
  createdBy       String             @map("created_by")
  createdAt       DateTime           @default(now()) @map("created_at")
  updatedAt       DateTime           @updatedAt @map("updated_at")

  property Property? @relation(fields: [propertyId], references: [id], onDelete: SetNull)
  category Category  @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  creator  User      @relation(fields: [createdBy], references: [id], onDelete: Restrict)

  @@index([propertyId])
  @@index([nextDueAt])
  @@index([isActive])
  @@map("recurring_expenses")
}

```

### API Endpoints

GET    /api/v1/recurring-expenses           -- List all
POST   /api/v1/recurring-expenses           -- Create new
GET    /api/v1/recurring-expenses/:id       -- Get one
PUT    /api/v1/recurring-expenses/:id       -- Update
DELETE /api/v1/recurring-expenses/:id       -- Delete (Owner only)
POST   /api/v1/recurring-expenses/:id/log   -- Create transaction from template
GET    /api/v1/recurring-expenses/due       -- Get expenses due this period

`### Usage Flow (MVP - Manual)

1. **Setup:** Owner creates recurring expense templates
2. **Reminder:** Dashboard shows "Expenses Due Soon" widget
3. **Log:** Click template → pre-filled expense form → confirm amount → save
4. **Track:** System updates `last_generated_at` and calculates `next_due_at`

### Dashboard Widget: Expenses Due`

─────────────────────────────────
📅 Recurring Expenses Due
─────────────────────────────────

⚠️ Overdue:
┌──────────────────────────────┐
│ ESCOM – Area 43              │
│ Due: 5 Jan (10 days ago)     │
│ ~MWK 45,000                  │
│ [ Log Payment ]              │
└──────────────────────────────┘

📅 Due This Week:
┌──────────────────────────────┐
│ Internet – All Properties    │
│ Due: 18 Jan (3 days)         │
│ ~MWK 35,000                  │
│ [ Log Payment ]              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Gardener – Shared            │
│ Due: 20 Jan (5 days)         │
│ ~MWK 60,000                  │
│ [ Log Payment ]              │
└──────────────────────────────┘

`### "Log Payment" Pre-filled Form
When clicking "Log Payment" from a recurring expense:`

Add Expense
───────────
📋 From: ESCOM – Area 43 (Monthly)

Amount (MWK) *
┌──────────────────────────────┐
│ 45,000                       │  ← Pre-filled from template
└──────────────────────────────┘
Estimated amount. Adjust if different.

Property *
┌──────────────────────────────┐
│ Area 43 – House A        ▼   │  ← Pre-selected
└──────────────────────────────┘

Category *
┌──────────────────────────────┐
│ Utilities                ▼   │  ← Pre-selected
└──────────────────────────────┘

Date *
┌──────────────────────────────┐
│ Today, 15 Jan 2026       ▼   │
└──────────────────────────────┘

[ Cancel ]              [ Save ]

`### Telegram Bot Integration`

/recurring

Bot: "📅 Recurring Expenses Due"

Overdue:

- ESCOM – Area 43 (MWK 45,000)
Due: 5 Jan [Log Now]

This Week:

- Internet (MWK 35,000)
Due: 18 Jan [Log Now]
- Gardener (MWK 60,000)
Due: 20 Jan [Log Now]

[View All] [Add New Recurring]

`### Next Due Calculation Logic
```typescript
function calculateNextDue(
  frequency: RecurringFrequency,
  dayOfMonth?: number,
  dayOfWeek?: number,
  fromDate: Date = new Date()
): Date {
  switch (frequency) {
    case 'WEEKLY':
      // Next occurrence of dayOfWeek
      const daysUntil = (dayOfWeek - fromDate.getDay() + 7) % 7 || 7;
      return addDays(fromDate, daysUntil);
    
    case 'MONTHLY':
      // Next month on dayOfMonth
      let next = setDate(addMonths(fromDate, 1), dayOfMonth);
      // Handle months with fewer days
      if (next.getDate() !== dayOfMonth) {
        next = lastDayOfMonth(addMonths(fromDate, 1));
      }
      return next;
    
    case 'QUARTERLY':
      return addMonths(fromDate, 3);
    
    case 'YEARLY':
      return addYears(fromDate, 1);
  }
}
```

### Common Recurring Expenses (Seed Data)
```sql
-- Example templates (owner creates their own)
-- These are just suggestions shown in "Add Recurring" form

-- Utilities (Monthly)
-- Internet (Monthly)
-- Gardener (Weekly/Monthly)
-- Security (Monthly)
-- Water (Monthly)
-- Cleaning Service (Weekly)
-- Property Insurance (Yearly)
-- Municipal Rates (Quarterly)
```

### Future Enhancement: Auto-Generate
When `auto_generate = true`:
- Scheduled job runs daily
- Creates transactions for expenses where `next_due_at <= today`
- Sends Telegram notification: "Auto-logged: ESCOM MWK 45,000"
- Owner can adjust amount if actual differs

**Not included in MVP** - manual logging is safer until system is proven.
---`

**ENUM DEFINITIONS**

**UserRole**

CREATE TYPE user_role AS ENUM ('OWNER', 'STAFF');

**PropertyType**

CREATE TYPE property_type AS ENUM ('APARTMENT', 'HOUSE', 'STUDIO', 'COTTAGE'); **PropertyStatus**

CREATE TYPE property_status AS ENUM ('ACTIVE', 'INACTIVE');

**BookingSource**

CREATE TYPE booking_source AS ENUM ('AIRBNB', 'LOCAL', 'OTHER');

**BookingStatus**

CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED');

**TransactionType**

CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');

**PaymentMethod**

CREATE TYPE payment_method AS ENUM ('CASH', 'BANK', 'MOBILE_MONEY',

'AIRBNB_PAYOUT');

**CategoryType**

CREATE TYPE category_type AS ENUM ('INCOME', 'EXPENSE');

**InquiryType**

CREATE TYPE inquiry_type AS ENUM ('BOOKING_REQUEST', 'ENQUIRY');

**InquiryStatus**

CREATE TYPE inquiry_status AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'RESPONDED', 'EXPIRED');

**AuditAction**

CREATE TYPE audit_action AS ENUM (

'USER_LOGIN',

'USER_LOGOUT',

'LOGIN_FAILED',

'PROPERTY_CREATED',

'PROPERTY_UPDATED',

'PROPERTY_DELETED',

'BOOKING_CREATED',

'BOOKING_UPDATED',

'BOOKING_CANCELLED',

'BOOKING_CHECKED_IN',

'BOOKING_COMPLETED',

'INCOME_CREATED',

'EXPENSE_CREATED',

'TRANSACTION_DELETED',

'INQUIRY_CREATED',

'INQUIRY_UPDATED',

'INQUIRY_CONVERTED',

'PAYMENT_RECEIVED',

'GUEST_CREATED',

'GUEST_UPDATED',

'CATEGORY_CREATED',

'CATEGORY_UPDATED',

'SETTINGS_UPDATED'

);

**ENTITY RELATIONSHIP DIAGRAM**

users

├── 1:N → refresh_tokens

├── 1:N → transactions (created_by)

├── 1:N → bookings (created_by)

├── 1:N → payments (created_by)

├── 1:N → audit_logs

└── 1:1 → notification_settings

properties

├── 1:N → bookings

├── 1:N → transactions

├── 1:N → inquiries

└── 1:N → media

guests

└── 1:N → bookings

bookings

├── N:1 → properties

├── N:1 → guests

├── N:1 → inquiries (source)

├── N:1 → users (created_by)

├── 1:N → transactions

└── 1:N → payments

transactions

├── N:1 → properties

├── N:1 → bookings

├── N:1 → categories

└── N:1 → users (created_by)

inquiries

├── N:1 → properties

└── 1:1 → bookings (converted)

categories

└── 1:N → transactions

payments

├── N:1 → bookings

├── 1:1 → transactions

└── N:1 → users (created_by)

**KEY RELATIONSHIPS (Mental Model)**

- **Property**

ohas many bookings

ohas many transactions

ohas many inquiries

ohas many images (media)

- **Booking**

obelongs to property

obelongs to guest (optional)

ocan come from inquiry

ohas many payments

ocan have many transactions

- **Transaction**

ooptionally tied to property

ooptionally tied to booking

oalways has a category

oalways has a creator (user)

- **Payment**

obelongs to booking

ocreates one transaction (income)

- **Everything flows into transactions**

**DATABASE CONSTRAINTS SUMMARY**

**Referential Integrity (ON DELETE)**

**FK** **Behavior Reason**

bookings.property_id RESTRICT Can't delete property with bookings bookings.guest_id SET NULL Guest deletion keeps booking

bookings.inquiry_id SET NULL Inquiry deletion keeps booking

bookings.created_by RESTRICT Can't delete user with bookings

transactions.property_id SET NULL Property deletion keeps history

transactions.booking_id SET NULL Booking deletion keeps history

transactions.category_id RESTRICT Can't delete category in use

transactions.created_by RESTRICT Can't delete user with transactions

media.property_id CASCADE Delete images with property

inquiries.property_id RESTRICT Can't delete property with inquiries

payments.booking_id RESTRICT Can't delete booking with payments payments.transaction_id RESTRICT Can't delete linked transaction

refresh_tokens.user_id CASCADE Delete tokens with user

notification_settings.user_id CASCADE Delete settings with user

audit_logs.user_id

SET NULL User deletion keeps audit history **Check Constraints**

-- transactions

ALTER TABLE transactions ADD CONSTRAINT transactions_amount_positive CHECK (amount > 0);

- - bookings

ALTER TABLE bookings ADD CONSTRAINT bookings_checkout_after_checkin CHECK (check_out > check_in);

ALTER TABLE bookings ADD CONSTRAINT bookings_nights_positive CHECK (nights > 0); ALTER TABLE bookings ADD CONSTRAINT bookings_price_positive CHECK (price_per_night > 0);

ALTER TABLE bookings ADD CONSTRAINT bookings_total_positive CHECK (total_amount > 0);

ALTER TABLE bookings ADD CONSTRAINT bookings_amount_paid_non_negative CHECK (amount_paid >= 0);

- - inquiries

ALTER TABLE inquiries ADD CONSTRAINT inquiries_checkout_after_checkin CHECK (check_out IS NULL OR check_in IS NULL OR check_out > check_in);

- - media

ALTER TABLE media ADD CONSTRAINT media_sort_order_non_negative CHECK (sort_order >= 0);

- - users

ALTER TABLE users ADD CONSTRAINT users_failed_login_non_negative CHECK (failed_login_count >= 0);

- - payments

ALTER TABLE payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);

**Unique Constraints**

-- users

ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (LOWER(email));

ALTER TABLE users ADD CONSTRAINT users_telegram_id_unique UNIQUE (telegram_id) WHERE telegram_id IS NOT NULL;

- - bookings

ALTER TABLE bookings ADD CONSTRAINT bookings_reference_unique UNIQUE (reference);

- - inquiries

ALTER TABLE inquiries ADD CONSTRAINT inquiries_reference_unique UNIQUE (reference);

- - categories

ALTER TABLE categories ADD CONSTRAINT categories_name_type_unique UNIQUE (name, type);

- - notification_settings

ALTER TABLE notification_settings ADD CONSTRAINT notification_settings_user_unique UNIQUE (user_id);

**DATABASE INDEXES**

**users**

CREATE UNIQUE INDEX users_email_idx ON users (LOWER(email));

CREATE UNIQUE INDEX users_telegram_id_idx ON users (telegram_id) WHERE telegram_id IS NOT NULL;

CREATE INDEX users_is_active_idx ON users (is_active);

**refresh_tokens**

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);

CREATE INDEX refresh_tokens_token_hash_idx ON refresh_tokens (token_hash);

CREATE INDEX refresh_tokens_expires_at_idx ON refresh_tokens (expires_at);

**properties**

CREATE INDEX properties_status_idx ON properties (status);

CREATE INDEX properties_is_public_idx ON properties (is_public);

CREATE INDEX properties_location_idx ON properties (location);

**media**

CREATE INDEX media_property_id_idx ON media (property_id);

CREATE INDEX media_property_sort_idx ON media (property_id, sort_order);

**guests**

CREATE INDEX guests_phone_idx ON guests (phone);

CREATE INDEX guests_email_idx ON guests (email);

CREATE INDEX guests_source_idx ON guests (source);

**categories**

CREATE INDEX categories_type_idx ON categories (type);

CREATE INDEX categories_is_active_idx ON categories (is_active);

**bookings**

CREATE UNIQUE INDEX bookings_reference_idx ON bookings (reference);

CREATE INDEX bookings_property_id_idx ON bookings (property_id);

CREATE INDEX bookings_guest_id_idx ON bookings (guest_id);

CREATE INDEX bookings_status_idx ON bookings (status);

CREATE INDEX bookings_check_in_idx ON bookings (check_in);

CREATE INDEX bookings_check_out_idx ON bookings (check_out);

CREATE INDEX bookings_availability_idx ON bookings (property_id, check_in, check_out); CREATE INDEX bookings_created_at_idx ON bookings (created_at);

**payments**

CREATE INDEX payments_booking_id_idx ON payments (booking_id);

CREATE INDEX payments_transaction_id_idx ON payments (transaction_id);

**transactions**

CREATE INDEX transactions_property_id_idx ON transactions (property_id);

CREATE INDEX transactions_type_idx ON transactions (type);

CREATE INDEX transactions_date_idx ON transactions (date);

CREATE INDEX transactions_category_id_idx ON transactions (category_id); CREATE INDEX transactions_booking_id_idx ON transactions (booking_id);

CREATE INDEX transactions_property_date_idx ON transactions (property_id, date); CREATE INDEX transactions_type_date_idx ON transactions (type, date);

CREATE INDEX transactions_created_by_idx ON transactions (created_by);

**inquiries**

CREATE UNIQUE INDEX inquiries_reference_idx ON inquiries (reference);

CREATE INDEX inquiries_property_id_idx ON inquiries (property_id);

CREATE INDEX inquiries_status_idx ON inquiries (status);

CREATE INDEX inquiries_type_idx ON inquiries (type);

CREATE INDEX inquiries_created_at_idx ON inquiries (created_at);

CREATE INDEX inquiries_expires_at_idx ON inquiries (expires_at);

**audit_logs**

CREATE INDEX audit_logs_user_id_idx ON audit_logs (user_id);

CREATE INDEX audit_logs_action_idx ON audit_logs (action);

CREATE INDEX audit_logs_resource_type_idx ON audit_logs (resource_type); CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at);

CREATE INDEX audit_logs_resource_idx ON audit_logs (resource_type, resource_id);

**DEFAULT SEED DATA**

**Categories (System)**

**Income Categories:**

**Name** **Description Icon Color**

Booking Income from guest stays home #16A34A

Late Checkout Fee for late departure clock #16A34A

Extra Guest Additional guest fee users #16A34A

Other Income Miscellaneous income plus #16A34A

**Expense Categories:**

**Name** **Description** **Icon** **Color**

Utilities ESCOM, water, internet bolt #F59E0B

Repairs & Maintenance Fixing things, maintenance wrench #EF4444

Cleaning Cleaning service fees sparkles #8B5CF6

Supplies Toiletries, linens, etc. shopping-bag #3B82F6

Fuel & Transport Travel, fuel costs car #6B7280

Commission & Fees Platform fees, agent fees percent #EC4899

Other Expense Miscellaneous expenses minus #6B7280

**Seed SQL**

- - Income Categories

INSERT INTO categories (id, name, type, description, icon, color, is_system, is_active,

sort_order) VALUES

(gen_random_uuid(), 'Booking', 'INCOME', 'Income from guest stays', 'home', '#16A34A',

true, true, 1),

(gen_random_uuid(), 'Late Checkout', 'INCOME', 'Fee for late departure', 'clock', '#16A34A',

true, true, 2),

(gen_random_uuid(), 'Extra Guest', 'INCOME', 'Additional guest fee', 'users', '#16A34A', true,

true, 3),

(gen_random_uuid(), 'Other Income', 'INCOME', 'Miscellaneous income', 'plus', '#16A34A',

true, true, 4);

- - Expense Categories

INSERT INTO categories (id, name, type, description, icon, color, is_system, is_active, sort_order) VALUES

(gen_random_uuid(), 'Utilities', 'EXPENSE', 'ESCOM, water, internet', 'bolt', '#F59E0B', true, true, 1),

(gen_random_uuid(), 'Repairs & Maintenance', 'EXPENSE', 'Fixing things, maintenance', 'wrench', '#EF4444', true, true, 2),

(gen_random_uuid(), 'Cleaning', 'EXPENSE', 'Cleaning service fees', 'sparkles', '#8B5CF6', true, true, 3),

(gen_random_uuid(), 'Supplies', 'EXPENSE', 'Toiletries, linens, etc.', 'shopping-bag', '#3B82F6', true, true, 4),

(gen_random_uuid(), 'Fuel & Transport', 'EXPENSE', 'Travel, fuel costs', 'car', '#6B7280', true, true, 5),

(gen_random_uuid(), 'Commission & Fees', 'EXPENSE', 'Platform fees, agent fees',

'percent', '#EC4899', true, true, 6),

(gen_random_uuid(), 'Other Expense', 'EXPENSE', 'Miscellaneous expenses', 'minus', '#6B7280', true, true, 7);

**Default Owner Account**

Created on first deployment via environment variables:

ADMIN_EMAIL=owner@example.com

ADMIN_PASSWORD=SecurePassword123!

ADMIN_NAME=Owner Name

**WHY THIS SCHEMA WORKS**

- You can answer **"How much did House X make?"**
- You can answer **"Where did the money go?"**
- You can answer **"Who did what and when?"**
- You can track **partial payments** on bookings
- You can run the business manually today
- You can automate later without refactoring
- You avoid accounting-software complexity
- **Everything flows into transactions** (single source of truth)

**KEY QUERIES (THE QUESTIONS THAT MATTER)** If your system answers these fast and correctly, it's a win.

**A. Profit per Property**

**Question:**

"How much profit did each house make?"

**Logic:**

Profit = SUM(INCOME) - SUM(EXPENSES)

**SQL:**

SELECT

p.id,

p.name,

COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) AS income,

COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) AS expenses,

COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) AS profit FROM properties p

LEFT JOIN transactions t ON t.property_id = p.id

WHERE p.status = 'ACTIVE'

GROUP BY p.id, p.name

ORDER BY profit DESC;

**Used for:**

- Owner dashboard
- Telegram summary
- "Which house is underperforming?"

**B. Monthly Profit (All Properties)**

**Question:**

"How did I perform this month vs last month?"

**SQL:**

SELECT

DATE_TRUNC('month', t.date) AS month,

SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) AS income, SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) AS expenses, SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) -

SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) AS profit FROM transactions t

WHERE t.date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months') GROUP BY month

ORDER BY month DESC;

**Used for:**

- Trend charts
- Decision making
- Cashflow visibility

**C. Profit per Property per Month**

**Question:**

"How much did each house make in September?"

**SQL:**

SELECT

p.name,

DATE_TRUNC('month', t.date) AS month,

SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) AS income, SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) AS expenses, SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) -

SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) AS profit FROM transactions t

JOIN properties p ON p.id = t.property_id

WHERE t.date >= :start_date AND t.date < :end_date

GROUP BY p.id, p.name, month

ORDER BY month DESC, profit DESC;

**D. Revenue by Source (Airbnb vs Local)**

**Question:**

"Where is my money coming from?"

**SQL:**

SELECT

b.source,

SUM(t.amount) AS total_revenue,

COUNT(DISTINCT b.id) AS booking_count

FROM transactions t

JOIN bookings b ON b.id = t.booking_id

WHERE t.type = 'INCOME'

AND t.date >= :start_date

AND t.date < :end_date

GROUP BY b.source

ORDER BY total_revenue DESC;

**Output example:**

**Source Revenue** **Bookings**

AIRBNB MWK 3,200,000 24

LOCAL MWK 1,450,000 12

**E. Expense Breakdown by Category**

**Question:**

"Where is my money going?"

**SQL:**

SELECT

c.name AS category,

c.color,

SUM(t.amount) AS total_spent,

COUNT(*) AS transaction_count,

ROUND(SUM(t.amount) * 100.0 / SUM(SUM(t.amount)) OVER(), 1) AS percentage FROM transactions t

JOIN categories c ON c.id = t.category_id

WHERE t.type = 'EXPENSE'

AND t.date >= :start_date

AND t.date < :end_date

GROUP BY c.id, c.name, c.color

ORDER BY total_spent DESC;

**F. Availability Check**

**Question:**

"Is this property available from Jan 12-15?"

**SQL:**

SELECT

CASE

WHEN COUNT(*) = 0 THEN true

ELSE false

END AS is_available

FROM bookings b

WHERE b.property_id = :property_id

AND b.status IN ('CONFIRMED', 'CHECKED_IN') AND NOT (

b.check_out <= :requested_check_in

OR b.check_in >= :requested_check_out

);

**Used for:**

- Inquiry form validation
- Booking creation validation
- Availability calendar

**G. Outstanding Payments**

**Question:**

"Which bookings have unpaid balances?"

**SQL:**

SELECT

b.reference,

p.name AS property,

g.full_name AS guest,

g.phone AS guest_phone,

b.check_in,

b.check_out,

b.total_amount,

b.amount_paid,

(b.total_amount - b.amount_paid) AS balance_due FROM bookings b

JOIN properties p ON p.id = b.property_id

LEFT JOIN guests g ON g.id = b.guest_id

WHERE b.status IN ('CONFIRMED', 'CHECKED_IN') AND b.amount_paid < b.total_amount

ORDER BY b.check_in;

**H. Occupancy Rate**

**Question:**

"What's the occupancy rate per property this month?" **SQL:**

WITH month_params AS (

SELECT

DATE_TRUNC('month', :target_date::date) AS month_start,

(DATE_TRUNC('month', :target_date::date) + INTERVAL '1 month' - INTERVAL '1 day')::date AS month_end,

EXTRACT(DAY FROM DATE_TRUNC('month', :target_date::date) + INTERVAL '1 month' - INTERVAL '1 day') AS days_in_month

)

SELECT

p.name,

COALESCE(SUM(

LEAST(b.check_out, mp.month_end + 1) - GREATEST(b.check_in, mp.month_start) ), 0) AS booked_nights,

mp.days_in_month AS available_nights,

ROUND(

COALESCE(SUM(

LEAST(b.check_out, mp.month_end + 1) - GREATEST(b.check_in, mp.month_start) ), 0) * 100.0 / mp.days_in_month, 1

) AS occupancy_percent

FROM properties p

CROSS JOIN month_params mp

LEFT JOIN bookings b ON b.property_id = p.id

AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')

AND b.check_in <= mp.month_end

AND b.check_out > mp.month_start

WHERE p.status = 'ACTIVE'

GROUP BY p.id, p.name, mp.days_in_month

ORDER BY occupancy_percent DESC;

**I. Recent Activity Feed**

**Question:**

"What happened recently in my business?"

**SQL:**

SELECT

a.action,

a.resource_type,

a.resource_id,

a.details,

a.created_at,

u.name AS user_name

FROM audit_logs a

LEFT JOIN users u ON u.id = a.user_id

WHERE a.action NOT IN ('USER_LOGIN', 'USER_LOGOUT') ORDER BY a.created_at DESC

LIMIT 20;

**J. Dashboard Summary**

**Question:**

"Give me everything for the dashboard in one query"

**SQL:**

WITH current_month AS (

SELECT

DATE_TRUNC('month', CURRENT_DATE) AS start_date,

DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' AS end_date

),

last_month AS (

SELECT

DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AS start_date, DATE_TRUNC('month', CURRENT_DATE) AS end_date

),

current_totals AS (

SELECT

SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) AS income, SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) AS expenses FROM transactions t, current_month cm

WHERE t.date >= cm.start_date AND t.date < cm.end_date

),

last_totals AS (

SELECT

SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) AS income, SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) AS expenses FROM transactions t, last_month lm

WHERE t.date >= lm.start_date AND t.date < lm.end_date

)

SELECT

ct.income AS current_income,

ct.expenses AS current_expenses,

(ct.income - ct.expenses) AS current_profit,

lt.income AS last_income,

lt.expenses AS last_expenses,

(lt.income - lt.expenses) AS last_profit,

CASE

WHEN lt.income > 0 THEN ROUND((ct.income - lt.income) * 100.0 / lt.income, 1) ELSE 0

END AS income_change_percent,

CASE

WHEN lt.expenses > 0 THEN ROUND((ct.expenses - lt.expenses) * 100.0 / lt.expenses, 1) ELSE 0

END AS expenses_change_percent

FROM current_totals ct, last_totals lt;

**K. New Inquiries Count**

**Question:**

"How many new inquiries need attention?"

**SQL:**

SELECT

COUNT(*) FILTER (WHERE status = 'NEW') AS new_count,

COUNT(*) FILTER (WHERE status = 'CONTACTED') AS contacted_count, COUNT(*) FILTER (WHERE status IN ('NEW', 'CONTACTED')) AS total_pending FROM inquiries

WHERE status IN ('NEW', 'CONTACTED');

**API ENDPOINT DESIGN**

REST API with predictable patterns.

**Auth**

POST /api/v1/auth/login

POST /api/v1/auth/logout

POST /api/v1/auth/refresh

GET /api/v1/auth/me

POST /api/v1/auth/change-password

POST /api/v1/auth/link-telegram

POST /api/v1/auth/unlink-telegram

**Users (Owner only)**

GET /api/v1/users

POST /api/v1/users

GET /api/v1/users/:id

PUT /api/v1/users/:id

DELETE /api/v1/users/:id

**Properties**

GET /api/v1/properties

POST /api/v1/properties (Owner only)

GET /api/v1/properties/:id

PUT /api/v1/properties/:id (Owner only)

DELETE /api/v1/properties/:id (Owner only)

GET /api/v1/properties/:id/availability

GET /api/v1/properties/:id/transactions

GET /api/v1/properties/:id/bookings

**Query Parameters:**

GET /api/v1/properties?status=ACTIVE&is_public=true

**Media**

GET /api/v1/properties/:id/media

POST /api/v1/properties/:id/media (Owner only) PUT /api/v1/media/:id (Owner only)

DELETE /api/v1/media/:id (Owner only) POST /api/v1/media/reorder (Owner only)

**Bookings**

GET /api/v1/bookings

POST /api/v1/bookings

GET /api/v1/bookings/:id

PUT /api/v1/bookings/:id

PATCH /api/v1/bookings/:id/status

DELETE /api/v1/bookings/:id (Owner only)

**Query Parameters:**

GET /api/v1/bookings?property_id=...&source=LOCAL&status=CONFIRMED&from=2026-01-01&to=2026-01-31

**Payments**

GET /api/v1/bookings/:id/payments

POST /api/v1/bookings/:id/payments

DELETE /api/v1/payments/:id (Owner only)

**Transactions**

GET /api/v1/transactions

POST /api/v1/transactions

GET /api/v1/transactions/:id

DELETE /api/v1/transactions/:id (Owner only)

**Query Parameters:**

GET /api/v1/transactions?property_id=...&type=EXPENSE&category_id=...&from=2026-01-01&to=2026-01-31

**Categories**

GET /api/v1/categories

POST /api/v1/categories (Owner only)

PUT /api/v1/categories/:id (Owner only)

DELETE /api/v1/categories/:id (Owner only, non-system only) **Query Parameters:**

GET /api/v1/categories?type=EXPENSE&is_active=true

**Inquiries**

GET /api/v1/inquiries

GET /api/v1/inquiries/:id

PUT /api/v1/inquiries/:id

PATCH /api/v1/inquiries/:id/status

POST /api/v1/inquiries/:id/convert

**Query Parameters:**

GET /api/v1/inquiries?property_id=...&status=NEW&type=BOOKING_REQUEST

**Guests**

GET /api/v1/guests

POST /api/v1/guests

GET /api/v1/guests/:id

PUT /api/v1/guests/:id

**Analytics**

GET /api/v1/analytics/summary

GET /api/v1/analytics/profit-by-property

GET /api/v1/analytics/monthly-profit

GET /api/v1/analytics/revenue-by-source

GET /api/v1/analytics/expense-breakdown

GET /api/v1/analytics/occupancy

**Query Parameters:**

GET /api/v1/analytics/summary?month=2026-01

GET /api/v1/analytics/profit-by-property?from=2026-01-01&to=2026-12-31

**Audit Log (Owner only)**

GET /api/v1/audit-logs

**Query Parameters:**

GET /api/v1/audit-logs?user_id=...&action=INCOME_CREATED&from=2026-01-01&to=2026-01-31

**Settings (Owner only)**

GET /api/v1/settings/notifications

PUT /api/v1/settings/notifications

**Public (No auth required)**

GET /api/v1/public/properties

GET /api/v1/public/properties/:id

GET /api/v1/public/properties/:id/availability POST /api/v1/public/inquiries

**Telegram Webhook**

POST /api/v1/telegram/webhook

**Response Formats**

**Success Response**

{

"success": true,

"data": {

"id": "uuid",

"name": "Area 43 – House A",

...

}

}

**List Response**

{

"success": true,

"data": [...],

"meta": {

"page": 1,

"limit": 20,

"total": 47,

"totalPages": 3

}

}

**Error Response**

{

"success": false,

"error": {

"code": "VALIDATION_ERROR",

"message": "Invalid date range",

"details": [

{ "field": "check_in", "message": "Check-in date is required" } ]

}

}

**TELEGRAM BOT → DATABASE MAPPING**

The bot is just a thin UI layer on top of your APIs.

**Bot Philosophy**

- Bot does **quick actions**
- Dashboard does **deep analysis**
- Bot never edits complex objects (like properties)

**Bot Commands → API Mapping**

**Command** **API Call** **Description**

/start POST /auth/link-telegram Link Telegram account

/help - Show commands (no API)

/summary GET /analytics/summary Business summary

/properties GET /properties List properties

/property [name] GET /analytics/profit-by-property Property stats

/add_income POST /transactions Log income

/add_expense POST /transactions Log expense

/bookings GET /bookings?status=UPCOMING Recent bookings

**Notifications → Triggers**

**Event** **Trigger Message**

New inquiry POST /public/inquiries " New Booking Request..."

Booking confirmed PATCH /bookings/:id/status " Booking Confirmed..."

Daily summary Scheduled job (6 PM) " Daily Summary..."

**How Everything Connects**

Telegram Bot

↓

API Endpoints

↓

Transactions Table

↓

Analytics Queries

↓

Dashboard & Bot Summary

No duplication. No hacks. No future rewrite.

**PRISMA SCHEMA**

For reference, here's the complete Prisma schema: // schema.prisma

generator client {

provider = "prisma-client-js"

}

datasource db {

provider = "postgresql"

url = env("DATABASE_URL")

}

// Enums

enum UserRole {

OWNER

STAFF

}

enum PropertyType {

APARTMENT

HOUSE

STUDIO

COTTAGE

}

enum PropertyStatus {

ACTIVE

INACTIVE

}

enum BookingSource {

AIRBNB

LOCAL

OTHER

}

enum BookingStatus {

PENDING

CONFIRMED

CHECKED_IN

COMPLETED

CANCELLED

}

enum TransactionType {

INCOME

EXPENSE

}

enum PaymentMethod {

CASH

BANK

MOBILE_MONEY

AIRBNB_PAYOUT

}

enum CategoryType {

INCOME

EXPENSE

}

enum InquiryType {

BOOKING_REQUEST

ENQUIRY

}

enum InquiryStatus {

NEW

CONTACTED

CONVERTED

RESPONDED

EXPIRED

}

enum AuditAction {

USER_LOGIN

USER_LOGOUT

LOGIN_FAILED

PROPERTY_CREATED

PROPERTY_UPDATED

PROPERTY_DELETED

BOOKING_CREATED

BOOKING_UPDATED

BOOKING_CANCELLED

BOOKING_CHECKED_IN

BOOKING_COMPLETED

INCOME_CREATED

EXPENSE_CREATED

TRANSACTION_DELETED

INQUIRY_CREATED

INQUIRY_UPDATED

INQUIRY_CONVERTED

PAYMENT_RECEIVED

GUEST_CREATED

GUEST_UPDATED

CATEGORY_CREATED

CATEGORY_UPDATED

SETTINGS_UPDATED

}

// Models

model User {

id String @id @default(uuid())

name String

email String @unique

phone String?

role UserRole

passwordHash String @map("password_hash")

telegramId String? @unique @map("telegram_id")

telegramUsername String? @map("telegram_username") isActive Boolean @default(true) @map("is_active")

failedLoginCount Int @default(0) @map("failed_login_count") lockedUntil DateTime? @map("locked_until")

lastLoginAt DateTime? @map("last_login_at")

createdAt DateTime @default(now()) @map("created_at") updatedAt DateTime @updatedAt @map("updated_at")

refreshTokens RefreshToken[]

bookingsCreated Booking[] @relation("BookingCreatedBy") transactionsCreated Transaction[] @relation("TransactionCreatedBy") paymentsCreated Payment[] @relation("PaymentCreatedBy") auditLogs AuditLog[]

notificationSettings NotificationSettings?

@@map("users")

}

model RefreshToken {

id String @id @default(uuid())

userId String @map("user_id")

tokenHash String @map("token_hash")

expiresAt DateTime @map("expires_at")

deviceInfo String? @map("device_info")

ipAddress String? @map("ip_address")

isRevoked Boolean @default(false) @map("is_revoked") createdAt DateTime @default(now()) @map("created_at")

user User @relation(fields: [userId], references: [id], onDelete: Cascade)

@@index([userId])

@@index([tokenHash])

@@index([expiresAt])

@@map("refresh_tokens")

}

model Property {

id String @id @default(uuid())

name String

code String?

location String?

address String?

type PropertyType

status PropertyStatus @default(ACTIVE)

bedrooms Int?

bathrooms Int?

sleeps Int?

defaultPrice BigInt? @map("default_price") description String?

houseRules String? @map("house_rules")

amenities Json @default("[]")

isPublic Boolean @default(true) @map("is_public") notes String?

createdAt DateTime @default(now()) @map("created_at") updatedAt DateTime @updatedAt @map("updated_at")

bookings Booking[]

transactions Transaction[]

inquiries Inquiry[]

media Media[]

@@index([status])

@@index([isPublic])

@@index([location])

@@map("properties")

}

model Media {

id String @id @default(uuid())

propertyId String @map("property_id")

url String

thumbnailUrl String? @map("thumbnail_url")

altText String? @map("alt_text")

isCover Boolean @default(false) @map("is_cover") sortOrder Int @default(0) @map("sort_order") fileSize Int? @map("file_size")

width Int?

height Int?

createdAt DateTime @default(now()) @map("created_at")

property Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

@@index([propertyId])

@@index([propertyId, sortOrder])

@@map("media")

}

model Guest {

id String @id @default(uuid())

fullName String @map("full_name")

phone String?

email String?

source BookingSource

notes String?

totalBookings Int @default(0) @map("total_bookings") totalSpent BigInt @default(0) @map("total_spent") createdAt DateTime @default(now()) @map("created_at") updatedAt DateTime @updatedAt @map("updated_at")

bookings Booking[]

@@index([phone])

@@index([email])

@@index([source])

@@map("guests")

}

model Category {

id String @id @default(uuid())

name String

type CategoryType

description String?

icon String?

color String?

isSystem Boolean @default(false) @map("is_system") isActive Boolean @default(true) @map("is_active") sortOrder Int @default(0) @map("sort_order")

createdAt DateTime @default(now()) @map("created_at")

transactions Transaction[]

@@unique([name, type])

@@index([type])

@@index([isActive])

@@map("categories")

}

model Booking {

id String @id @default(uuid())

reference String @unique

propertyId String @map("property_id")

guestId String? @map("guest_id")

inquiryId String? @map("inquiry_id")

source BookingSource

status BookingStatus @default(PENDING)

checkIn DateTime @map("check_in") @db.Date checkOut DateTime @map("check_out") @db.Date nights Int

guestsCount Int? @map("guests_count")

pricePerNight BigInt @map("price_per_night")

totalAmount BigInt @map("total_amount")

amountPaid BigInt @default(0) @map("amount_paid") currency String @default("MWK")

notes String?

cancellationReason String? @map("cancellation_reason") cancelledAt DateTime? @map("cancelled_at")

checkedInAt DateTime? @map("checked_in_at")

checkedOutAt DateTime? @map("checked_out_at")

createdBy String @map("created_by")

createdAt DateTime @default(now()) @map("created_at") updatedAt DateTime @updatedAt @map("updated_at")

property Property @relation(fields: [propertyId], references: [id], onDelete: Restrict) guest Guest? @relation(fields: [guestId], references: [id], onDelete: SetNull) inquiry Inquiry? @relation(fields: [inquiryId], references: [id], onDelete: SetNull) creator User @relation("BookingCreatedBy", fields: [createdBy], references: [id], onDelete: Restrict)

transactions Transaction[]

payments Payment[]

@@index([propertyId])

@@index([guestId])

@@index([status])

@@index([checkIn])

@@index([checkOut])

@@index([propertyId, checkIn, checkOut])

@@index([createdAt])

@@map("bookings")

}

model Payment {

id String @id @default(uuid())

bookingId String @map("booking_id")

transactionId String @unique @map("transaction_id") amount BigInt

paymentMethod PaymentMethod @map("payment_method") receivedAt DateTime @map("received_at")

notes String?

createdBy String @map("created_by")

createdAt DateTime @default(now()) @map("created_at")

booking Booking @relation(fields: [bookingId], references: [id], onDelete: Restrict) transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Restrict)

creator User @relation("PaymentCreatedBy", fields: [createdBy], references: [id], onDelete: Restrict)

@@index([bookingId])

@@map("payments")

}

model Transaction {

id String @id @default(uuid())

type TransactionType

amount BigInt

currency String @default("MWK")

date DateTime @db.Date

propertyId String? @map("property_id") bookingId String? @map("booking_id")

categoryId String @map("category_id")

paymentMethod PaymentMethod @map("payment_method") reference String?

receiptUrl String? @map("receipt_url")

notes String?

createdBy String @map("created_by")

createdAt DateTime @default(now()) @map("created_at")

property Property? @relation(fields: [propertyId], references: [id], onDelete: SetNull) booking Booking? @relation(fields: [bookingId], references: [id], onDelete: SetNull) category Category @relation(fields: [categoryId], references: [id], onDelete: Restrict) creator User @relation("TransactionCreatedBy", fields: [createdBy], references: [id], onDelete: Restrict)

payment Payment?

@@index([propertyId])

@@index([type])

@@index([date])

@@index([categoryId])

@@index([bookingId])

@@index([propertyId, date])

@@index([type, date])

@@index([createdBy])

@@map("transactions")

}

model Inquiry {

id String @id @default(uuid())

reference String @unique

type InquiryType

propertyId String @map("property_id") fullName String @map("full_name") phone String

email String?

checkIn DateTime? @map("check_in") @db.Date checkOut DateTime? @map("check_out") @db.Date guestsCount Int? @map("guests_count")

message String?

status InquiryStatus @default(NEW)

notes String?

convertedBookingId String? @map("converted_booking_id") expiresAt DateTime? @map("expires_at")

createdAt DateTime @default(now()) @map("created_at") updatedAt DateTime @updatedAt @map("updated_at")

property Property @relation(fields: [propertyId], references: [id], onDelete: Restrict) bookings Booking[]

@@index([propertyId])

@@index([status])

@@index([type])

@@index([createdAt])

@@index([expiresAt])

@@map("inquiries")

}

model AuditLog {

id String @id @default(uuid())

action AuditAction

userId String? @map("user_id")

resourceType String? @map("resource_type") resourceId String? @map("resource_id") details Json?

ipAddress String? @map("ip_address")

userAgent String? @map("user_agent")

createdAt DateTime @default(now()) @map("created_at")

user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

@@index([userId])

@@index([action])

@@index([resourceType])

@@index([createdAt])

@@index([resourceType, resourceId])

@@map("audit_logs")

}

model NotificationSettings {

id String @id @default(uuid())

userId String @unique @map("user_id")

newInquiryTelegram Boolean @default(true) @map("new_inquiry_telegram") newInquiryEmail Boolean @default(false) @map("new_inquiry_email")

bookingConfirmedTelegram Boolean @default(true)

@map("booking_confirmed_telegram")

bookingConfirmedEmail Boolean @default(false) @map("booking_confirmed_email") dailySummaryTelegram Boolean @default(false) @map("daily_summary_telegram") dailySummaryEmail Boolean @default(false) @map("daily_summary_email") dailySummaryTime String? @default("18:00") @map("daily_summary_time") createdAt DateTime @default(now()) @map("created_at")

updatedAt DateTime @updatedAt @map("updated_at")

user User @relation(fields: [userId], references: [id], onDelete: Cascade)

@@map("notification_settings")

}

**MIGRATION NOTES**

**Initial Migration Checklist**

- Create all enums first
- Create tables in order of dependencies
- Add all indexes after tables
- Add all constraints after indexes
- Seed default categories
- Create initial owner account

**Order of Table Creation**

1.users (no dependencies)

2.refresh_tokens (depends on users)

3.properties (no dependencies)

4.media (depends on properties)

5.guests (no dependencies)

6.categories (no dependencies)

7.inquiries (depends on properties)

8.bookings (depends on properties, guests, inquiries, users)

9.transactions (depends on properties, bookings, categories, users) 10.payments (depends on bookings, transactions, users)

11.audit_logs (depends on users)

12.notification_settings (depends on users)

**SCHEMA STATUS**

**Locked and build-ready**
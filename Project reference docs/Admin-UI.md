## 🎯 UX Philosophy (Very Important)

---

**Primary user:** You (owner)

**Secondary user:** Caretaker/manager

**Context of use:**

- On phone
- Often quickly
- Sometimes with bad internet
- Often "I just need to know where money is"

### Core UX Principles

1. **Clarity over completeness**
→ Always show profit, never just revenue
2. **Few screens, deep meaning**
→ No "settings hell"
3. **Mobile-first**
→ Desktop is nice-to-have
4. **Fast actions > pretty charts**
→ Charts are secondary
5. **Never ask twice**
→ Remember last-used property/category where possible
6. **Graceful degradation**
→ Works offline with cached data
7. **Accessible to all**
→ Color contrast, touch targets, screen reader support
8. **Forgiving interactions**
→ Confirmations for destructive actions, undo where possible

---

- `--
## 🔒 Session Management
### Overview
Allow users to view and manage their active sessions across devices, and revoke suspicious sessions.
### Settings → Security → Active Sessions`

┌──────────────────────────────┐
│ ← Security     Active Sessions│
└──────────────────────────────┘

─────────────────────────────────
📱 Your Active Sessions
─────────────────────────────────

You're currently signed in on these
devices. Revoke any session you
don't recognize.

┌──────────────────────────────┐
│ 📱 Chrome on Android         │
│ ─────────────────────────────│
│ 🟢 Current Session           │
│                              │
│ Lilongwe, Malawi             │
│ IP: 102.22.xxx.xxx           │
│ Last active: Now             │
│ Signed in: 15 Jan 2026       │
│                              │
│ This device                  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 💻 Safari on macOS           │
│ ─────────────────────────────│
│                              │
│ Lilongwe, Malawi             │
│ IP: 102.22.xxx.xxx           │
│ Last active: 2 hours ago     │
│ Signed in: 14 Jan 2026       │
│                              │
│ [ Revoke Session ]           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 📱 NyumbaOps App on iPhone   │
│ ─────────────────────────────│
│                              │
│ Lilongwe, Malawi             │
│ IP: 102.22.xxx.xxx           │
│ Last active: Yesterday       │
│ Signed in: 10 Jan 2026       │
│                              │
│ [ Revoke Session ]           │
└──────────────────────────────┘

─────────────────────────────────

[ Sign Out All Other Devices ]

─────────────────────────────────

`### Session Details

**Information Displayed:**
| Field | Source | Example |
|-------|--------|---------|
| Device Type | User-Agent parsing | 📱 Mobile, 💻 Desktop, 🖥️ Tablet |
| Browser | User-Agent parsing | Chrome, Safari, Firefox |
| OS | User-Agent parsing | Android, iOS, macOS, Windows |
| Location | IP geolocation | Lilongwe, Malawi |
| IP Address | Request IP (partially masked) | 102.22.xxx.xxx |
| Last Active | Token last used | Now, 2 hours ago, Yesterday |
| Signed In | Token created | 15 Jan 2026 |

### Revoke Session Confirmation`

┌──────────────────────────────┐
│ Revoke Session?         ✕    │
├──────────────────────────────┤
│                              │
│ This will sign out:          │
│                              │
│ 💻 Safari on macOS           │
│ Last active: 2 hours ago     │
│                              │
│ The user will need to sign   │
│ in again on this device.     │
│                              │
│ ────────────────────────────│
│                              │
│ [ Cancel ]       [ Revoke ]  │
│                              │
└──────────────────────────────┘

`### Sign Out All Confirmation`

┌──────────────────────────────┐
│ Sign Out All Devices?   ✕    │
├──────────────────────────────┤
│                              │
│ This will sign you out of    │
│ all devices except this one: │
│                              │
│ • Safari on macOS            │
│ • NyumbaOps App on iPhone    │
│                              │
│ 2 sessions will be revoked.  │
│                              │
│ ────────────────────────────│
│                              │
│ [ Cancel ]   [ Sign Out All ]│
│                              │
└──────────────────────────────┘

`### Database Schema Updates

**Update `refresh_tokens` table:**
```sql
ALTER TABLE refresh_tokens ADD COLUMN device_info JSONB DEFAULT '{}';
ALTER TABLE refresh_tokens ADD COLUMN ip_address VARCHAR(45);
ALTER TABLE refresh_tokens ADD COLUMN location VARCHAR(100);
ALTER TABLE refresh_tokens ADD COLUMN last_used_at TIMESTAMP DEFAULT NOW();

CREATE INDEX refresh_tokens_user_active_idx ON refresh_tokens (user_id) 
WHERE is_revoked = false AND expires_at > NOW();
```

**Device Info Structure:**
```json
{
  "browser": "Chrome",
  "browser_version": "120.0",
  "os": "Android",
  "os_version": "14",
  "device_type": "mobile",
  "device_name": "Samsung Galaxy S24"
}
```

### Prisma Schema Update
```prisma
model RefreshToken {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  tokenHash   String   @map("token_hash")
  expiresAt   DateTime @map("expires_at")
  isRevoked   Boolean  @default(false) @map("is_revoked")
  revokedAt   DateTime? @map("revoked_at")
  deviceInfo  Json     @default("{}") @map("device_info")
  ipAddress   String?  @map("ip_address")
  location    String?
  lastUsedAt  DateTime @default(now()) @map("last_used_at")
  createdAt   DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}
```

### User-Agent Parsing
```typescript
import { UAParser } from 'ua-parser-js';

function parseUserAgent(userAgent: string): DeviceInfo {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  return {
    browser: result.browser.name || 'Unknown',
    browser_version: result.browser.version || '',
    os: result.os.name || 'Unknown',
    os_version: result.os.version || '',
    device_type: result.device.type || 'desktop',
    device_name: result.device.model || ''
  };
}

function getDeviceDisplayName(deviceInfo: DeviceInfo): string {
  const icon = deviceInfo.device_type === 'mobile' ? '📱' : 
               deviceInfo.device_type === 'tablet' ? '🖥️' : '💻';
  
  return `${icon} ${deviceInfo.browser} on ${deviceInfo.os}`;
}
```

### IP Geolocation

Use a simple IP geolocation service:
```typescript
import geoip from 'geoip-lite';

function getLocationFromIP(ip: string): string | null {
  const geo = geoip.lookup(ip);
  if (!geo) return null;
  
  const city = geo.city || '';
  const country = geo.country || '';
  
  return city ? `${city}, ${country}` : country;
}

function maskIP(ip: string): string {
  // 102.22.145.67 → 102.22.xxx.xxx
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  return ip;
}
```

### API Endpoints`

GET    /api/v1/auth/sessions              -- List active sessions
DELETE /api/v1/auth/sessions/:id          -- Revoke specific session
DELETE /api/v1/auth/sessions              -- Revoke all except current

`### API Response: List Sessions
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "is_current": true,
        "device_name": "📱 Chrome on Android",
        "location": "Lilongwe, Malawi",
        "ip_address": "102.22.xxx.xxx",
        "last_used_at": "2026-01-15T10:30:00Z",
        "created_at": "2026-01-15T08:00:00Z"
      },
      {
        "id": "uuid",
        "is_current": false,
        "device_name": "💻 Safari on macOS",
        "location": "Lilongwe, Malawi",
        "ip_address": "102.22.xxx.xxx",
        "last_used_at": "2026-01-15T08:30:00Z",
        "created_at": "2026-01-14T12:00:00Z"
      }
    ],
    "total": 2
  }
}
```

### Security Considerations

**Suspicious Activity Detection:**
Flag sessions that look unusual:
- Login from new location
- Login from new device type
- Multiple locations in short time`

┌──────────────────────────────┐
│ ⚠️ Chrome on Windows         │
│ ─────────────────────────────│
│                              │
│ 🔴 New Location              │
│                              │
│ London, United Kingdom       │
│ IP: 51.154.xxx.xxx           │
│ Last active: 1 hour ago      │
│ Signed in: 15 Jan 2026       │
│                              │
│ If this wasn't you, revoke   │
│ this session immediately.    │
│                              │
│ [ Revoke Session ]           │
└──────────────────────────────┘

`**Email Notification for New Logins:**`

Subject: New sign-in to your NyumbaOps account

Hi [Name],

We noticed a new sign-in to your account:

📱 Chrome on Android
📍 Lilongwe, Malawi
🕐 15 Jan 2026, 10:30 AM

If this was you, you can ignore this email.

If this wasn't you:

1. Sign in to your account immediately
2. Go to Settings → Security → Active Sessions
3. Revoke the suspicious session
4. Change your password

Stay safe,
NyumbaOps Team

`### Audit Log Entries
```json
// Session Revoked
{
  "action": "SESSION_REVOKED",
  "user_id": "uuid",
  "details": {
    "session_id": "uuid",
    "device": "Safari on macOS",
    "reason": "user_initiated"
  }
}

// All Sessions Revoked
{
  "action": "ALL_SESSIONS_REVOKED",
  "user_id": "uuid",
  "details": {
    "sessions_revoked": 2,
    "reason": "user_initiated"
  }
}

// Suspicious Login
{
  "action": "SUSPICIOUS_LOGIN",
  "user_id": "uuid",
  "details": {
    "device": "Chrome on Windows",
    "location": "London, UK",
    "previous_location": "Lilongwe, Malawi",
    "reason": "new_location"
  }
}
```

### Telegram Bot Integration

Notify owner of new logins via Telegram:`

🔐 New Login Detected

📱 Chrome on Android
📍 Lilongwe, Malawi
🕐 Just now

[ View Sessions ] [ Not Me! ]

`If "Not Me!" is clicked:
- Immediately revoke that session
- Prompt to change password
- Send security alert
---`

---

## **Summary: Section G Security & Compliance**

| # | Improvement | Location | Complexity | Priority |
| --- | --- | --- | --- | --- |
| G31 | Data Retention Policy | Technical Specs | Medium | HIGH |
| G32 | Terms of Service & Privacy Policy | Customer UI + Legal | Low | CRITICAL |
| G33 | Two-Factor Authentication | Technical Specs + Settings | High | MEDIUM |
| G34 | Session Management UI | Admin Dashboard Settings | Medium | MEDIUM |

### New Database Tables Required

sql

- `- G31: Data RetentionALTER TABLE guests ADD COLUMN anonymized_at TIMESTAMP NULL;ALTER TABLE guests ADD COLUMN deletion_requested_at TIMESTAMP NULL;ALTER TABLE guests ADD COLUMN deletion_completed_at TIMESTAMP NULL;- G32: Legal DocumentsCREATE TABLE legal_documents (...);CREATE TABLE legal_acceptances (...);- G33: Two-Factor AuthenticationCREATE TABLE user_2fa_settings (...);CREATE TABLE otp_codes (...);- G34: Session ManagementALTER TABLE refresh_tokens ADD COLUMN device_info JSONB DEFAULT '{}';ALTER TABLE refresh_tokens ADD COLUMN ip_address VARCHAR(45);ALTER TABLE refresh_tokens ADD COLUMN location VARCHAR(100);ALTER TABLE refresh_tokens ADD COLUMN last_used_at TIMESTAMP DEFAULT NOW();```### New API Endpoints Required
```# G31 - Data RetentionPOST /api/v1/guests/:id/exportdataPOST /api/v1/guests/:id/requestdeletion
# G32 - Legal DocumentsGET /api/v1/public/legal/terms
GET /api/v1/public/legal/privacy
POST /api/v1/public/legal/accept
GET /api/v1/legal
POST /api/v1/legal
PUT /api/v1/legal/:id/activate
# G33 - Two-Factor AuthenticationGET /api/v1/auth/2fa/statusPOST /api/v1/auth/2fa/enablePOST /api/v1/auth/2fa/verifysetup
POST /api/v1/auth/2fa/disablePOST /api/v1/auth/2fa/backupcodes
POST /api/v1/auth/verify2fa
POST /api/v1/auth/verifybackup# G34 - Session ManagementGET /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:id
DELETE /api/v1/auth/sessions`

---

## 🧭 Information Architecture (Pages)

### Internal (Dashboard) – Full List

1. Login
2. Dashboard (Overview)
3. Properties List
4. Property Detail
5. Add/Edit Property
6. Transactions List
7. Add Transaction
8. Bookings List
9. Booking Detail
10. Inquiries List
11. Inquiry Detail
12. Reports
13. Audit Log (Owner only)
14. Settings (Owner only)

---

## 👥 Role-Based Page Access

| Page | Owner | Staff |
| --- | --- | --- |
| Dashboard | ✅ | ✅ |
| Properties List | ✅ | ✅ |
| Property Detail | ✅ | ✅ |
| Add/Edit Property | ✅ | ❌ |
| Transactions | ✅ | ✅ |
| Add Transaction | ✅ | ✅ |
| Bookings | ✅ | ✅ |
| Booking Detail | ✅ | ✅ |
| Inquiries | ✅ | ✅ |
| Reports | ✅ | ✅ |
| Audit Log | ✅ | ❌ |
| Settings | ✅ | ❌ |

---

# 📱 PAGE WIREFRAMES

---

## 1️⃣ Login Page

**Purpose:** Secure but frictionless access

`┌──────────────────────────────┐
│                              │
│         🏠 NyumbaOps         │
│                              │
│ ─────────────────────────────│
│                              │
│ Email                        │
│ ┌────────────────────────┐   │
│ │                        │   │
│ └────────────────────────┘   │
│                              │
│ Password                     │
│ ┌────────────────────────┐   │
│ │ ••••••••           👁️  │   │
│ └────────────────────────┘   │
│                              │
│ [✓] Remember me              │
│                              │
│ ┌────────────────────────┐   │
│ │       Log In           │   │
│ └────────────────────────┘   │
│                              │
│ Forgot password?             │
│                              │
└──────────────────────────────┘`

### UX Notes

- Simple, clean
- Works well on small screens
- No signup (users are admin-created)
- Redirects straight to Dashboard
- Show/hide password toggle
- "Remember me" keeps session longer

---

## 2️⃣ Dashboard (Overview) — *Most Important Page*

**Purpose:** "How is my business doing right now?"

- `--
## 📊 Comparison Period Selector
### Overview
Allow users to compare current period against previous periods for trend analysis.
### Updated Dashboard Header`

┌──────────────────────────────┐
│ ☰  Dashboard            🔔   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 📅 January 2026          ▼   │
│                              │
│ Compare to:                  │
│ ○ Last Month (Dec 2025)      │
│ ● Same Month Last Year       │
│ ○ No Comparison              │
└──────────────────────────────┘

`### Comparison Options
| Option | Compares To | Best For |
|--------|-------------|----------|
| Last Month | Previous month | Month-over-month trends |
| Same Month Last Year | Same month, previous year | Seasonal comparison |
| Last Quarter | Previous 3 months average | Smoothing out fluctuations |
| Custom Period | User-selected range | Specific comparisons |
| No Comparison | Nothing | Clean view |

### Updated Summary Cards with Comparison

**Default View (vs Last Month):**`

┌──────────────────────────────┐
│ 💰 Income                    │
│                              │
│ MWK 2,450,000                │
│ ↑ 12% vs Dec 2025            │
│   (was MWK 2,187,500)        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ❌ Expenses                   │
│                              │
│ MWK 900,000                  │
│ ↓ 5% vs Dec 2025             │
│   (was MWK 947,368)          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 📈 Profit                    │
│                              │
│ MWK 1,550,000                │
│ ↑ 25% vs Dec 2025            │
│   (was MWK 1,240,132)        │
└──────────────────────────────┘

`**Same Month Last Year:**`

┌──────────────────────────────┐
│ 💰 Income                    │
│                              │
│ MWK 2,450,000                │
│ ↑ 40% vs Jan 2025            │
│   (was MWK 1,750,000)        │
└──────────────────────────────┘

`**No Comparison:**`

┌──────────────────────────────┐
│ 💰 Income                    │
│                              │
│ MWK 2,450,000                │
│                              │
└──────────────────────────────┘

`### Visual Indicators
| Change | Color | Icon |
|--------|-------|------|
| Increase (good for income/profit) | Green | ↑ |
| Decrease (good for expenses) | Green | ↓ |
| Increase (bad for expenses) | Red | ↑ |
| Decrease (bad for income/profit) | Red | ↓ |
| No change (±1%) | Gray | → |
| No data for comparison | Gray | — |

### Per-Property Comparison`

─────────────────────────────────
Profit by Property
─────────────────────────────────

┌──────────────────────────────┐
│ 🏠 Area 43 – House A         │
│                              │
│ Profit: MWK 550,000          │
│ ↑ 15% vs last month          │
│ ████████████████░░░░  80%    │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 🏠 Area 10 – Studio          │
│                              │
│ Profit: MWK 240,000          │
│ ↓ 8% vs last month           │
│ ████████░░░░░░░░░░░░  40%    │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 🏠 Area 43 – Cottage         │
│                              │
│ Profit: MWK -40,000     ⚠️   │
│ ↓ 120% vs last month         │
│ Was profitable last month    │
└──────────────────────────────┘

`### Mobile Collapsed View
On mobile, comparison details are collapsed by default:`

┌──────────────────────────────┐
│ 💰 Income      MWK 2,450,000 │
│                    ↑ 12%     │
├──────────────────────────────┤
│ ❌ Expenses      MWK 900,000 │
│                    ↓ 5%      │
├──────────────────────────────┤
│ 📈 Profit      MWK 1,550,000 │
│                    ↑ 25%     │
└──────────────────────────────┘

Tap card for details

`### API Changes`

GET /api/v1/analytics/summary?month=2026-01&compare=last_month

Response:
{
"success": true,
"data": {
"current": {
"period": "2026-01",
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
},
"comparison": {
"period": "2025-12",
"label": "Dec 2025",
"MWK": {
"income": 218750000,
"expenses": 94736800,
"profit": 124013200
},
"GBP": {
"income": 28000,
"expenses": 0,
"profit": 28000
}
},
"changes": {
"MWK": {
"income_percent": 12.0,
"income_direction": "up",
"expenses_percent": -5.0,
"expenses_direction": "down",
"profit_percent": 25.0,
"profit_direction": "up"
},
"GBP": {
"income_percent": 14.3,
"income_direction": "up",
"expenses_percent": 0,
"expenses_direction": "none",
"profit_percent": 14.3,
"profit_direction": "up"
}
}
}
}

`### Comparison Query Parameters
| Parameter | Values | Default |
|-----------|--------|---------|
| compare | `last_month`, `last_year`, `last_quarter`, `none` | `last_month` |
| compare_to | ISO date (for custom) | — |

### Empty State (No Comparison Data)`

┌──────────────────────────────┐
│ 💰 Income                    │
│                              │
│ MWK 2,450,000                │
│ — No data for Jan 2025       │
└──────────────────────────────┘

`### User Preference Storage
Save user's preferred comparison mode in `localStorage`:
```javascript
localStorage.setItem('dashboard_compare_mode', 'last_month');
```
---`

### UX Notes

- Month selector always visible (above the fold)
- Three big metric cards: Income, Expenses, Profit
- Comparison to last month shows trends
- Profit per property as list (not chart) – faster to scan
- Underperforming properties highlighted with ⚠️
- Quick actions prominent
- Recent activity shows what's happening

### Why List > Chart Initially?

- Faster to scan on mobile
- Less JavaScript to load
- Works offline (cached data)
- Numbers are what matter

---

## 3️⃣ Properties Page

**Purpose:** Compare performance across houses

`┌──────────────────────────────┐
│ ← Dashboard      Properties  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 📅 January 2026          ▼   │
└──────────────────────────────┘

[ + Add Property ] (Owner only)

─────────────────────────────────

┌──────────────────────────────┐
│ 🏠 Area 43 – House A         │
│ ✓ Active                     │
│ ─────────────────────────────│
│ Income:    MWK 850,000       │
│ Expenses:  MWK 300,000       │
│ ─────────────────────────────│
│ Profit:    MWK 550,000  ✅   │
│                          →   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 🏠 Area 10 – Studio          │
│ ✓ Active                     │
│ ─────────────────────────────│
│ Income:    MWK 420,000       │
│ Expenses:  MWK 180,000       │
│ ─────────────────────────────│
│ Profit:    MWK 240,000  ✅   │
│                          →   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 🏠 Area 43 – Cottage         │
│ ✓ Active                     │
│ ─────────────────────────────│
│ Income:    MWK 180,000       │
│ Expenses:  MWK 220,000       │
│ ─────────────────────────────│
│ Profit:    MWK -40,000  ⚠️   │
│                          →   │
└──────────────────────────────┘

─────────────────────────────────
Total: 3 properties
─────────────────────────────────`

### UX Notes

- Cards, not tables (mobile-friendly)
- Price always visible
- Profit color-coded:
    - ✅ Green = positive
    - ⚠️ Red = negative
- Sorted by profit DESC by default
- Tap card → Property Detail
- Long-press for quick actions

### Property Card Quick Actions (Long Press)

`┌─────────────────────┐
│ 💰 Add Income       │
│ ❌ Add Expense      │
│ 📅 Add Booking      │
│ ✏️ Edit Property    │
└─────────────────────┘`

---

- `--
## 📊 Property Comparison View
### Overview
Side-by-side comparison of property performance to identify best and worst performers.
### Access
**Location:** Properties page → "Compare" button
**Permission:** Owner and Staff
### Compare Button Placement`

┌──────────────────────────────┐
│ ← Dashboard      Properties  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 📅 January 2026          ▼   │
└──────────────────────────────┘

┌────────────────┐  ┌──────────┐
│ + Add Property │  │ 📊 Compare│
└────────────────┘  └──────────┘

`### Property Selection`

┌──────────────────────────────┐
│ Compare Properties      ✕    │
├──────────────────────────────┤
│                              │
│ Select properties to compare │
│ (2-4 properties)             │
│                              │
│ ☑️ Area 43 – House A         │
│ ☑️ Area 10 – Studio          │
│ ☑️ Area 43 – Cottage         │
│ ☐ Area 47 – Apartment        │
│                              │
│ ────────────────────────────│
│                              │
│ Period:                      │
│ ┌────────────────────────┐   │
│ │ Last 6 Months      ▼   │   │
│ └────────────────────────┘   │
│                              │
│ [ Cancel ]    [ Compare ]    │
│                              │
└──────────────────────────────┘

`### Comparison View (Mobile - Stacked)`

┌──────────────────────────────┐
│ ← Properties    Compare      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 📅 Last 6 Months         ▼   │
└──────────────────────────────┘

─────────────────────────────────
💰 Total Income
─────────────────────────────────

Area 43 – House A
████████████████████  MWK 5.1M
£ 960

Area 10 – Studio
████████████████      MWK 4.2M
£ 480

Area 43 – Cottage
████████              MWK 2.1M
£ 0

🏆 Best: Area 43 – House A

─────────────────────────────────
❌ Total Expenses
─────────────────────────────────

Area 43 – House A
████████████          MWK 1.8M

Area 10 – Studio
██████████            MWK 1.5M

Area 43 – Cottage
████████████████      MWK 2.4M

⚠️ Highest: Area 43 – Cottage

─────────────────────────────────
📈 Profit
─────────────────────────────────

Area 43 – House A
████████████████████  MWK 3.3M
Margin: 65%           £ 960

Area 10 – Studio
██████████████████    MWK 2.7M
Margin: 64%           £ 480

Area 43 – Cottage
▓▓▓▓                  MWK -300K
Margin: -14%          ⚠️ Loss

🏆 Best: Area 43 – House A
⚠️ Worst: Area 43 – Cottage

─────────────────────────────────
📅 Occupancy Rate
─────────────────────────────────

Area 43 – House A
████████████████████  78%
140 nights booked

Area 10 – Studio
██████████████        56%
101 nights booked

Area 43 – Cottage
████████              32%
58 nights booked

─────────────────────────────────
💵 Revenue per Night
─────────────────────────────────

Area 43 – House A      MWK 36,400
Area 10 – Studio       MWK 41,600
Area 43 – Cottage      MWK 36,200

🏆 Best yield: Area 10 – Studio

─────────────────────────────────
📊 Expense Breakdown
─────────────────────────────────

       `House A  Studio  Cottage`

Utilities    35%     30%      45%
Repairs      25%     20%      30%
Cleaning     20%     25%      15%
Other        20%     25%      10%

─────────────────────────────────

[ Export Comparison ]
[ Share ]

`### Comparison View (Desktop - Table)`

┌─────────────────────────────────────────────────────────────────────────┐
│ Property Comparison – Last 6 Months                                      │
├───────────────────┬─────────────────┬─────────────────┬─────────────────┤
│ Metric            │ Area 43 House A │ Area 10 Studio  │ Area 43 Cottage │
├───────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ Income (MWK)      │ 5,100,000 🏆    │ 4,200,000       │ 2,100,000       │
│ Income (GBP)      │ £960            │ £480            │ £0              │
│ Expenses (MWK)    │ 1,800,000       │ 1,500,000       │ 2,400,000 ⚠️    │
│ Profit (MWK)      │ 3,300,000 🏆    │ 2,700,000       │ -300,000 ⚠️     │
│ Profit Margin     │ 65%             │ 64%             │ -14%            │
│ Occupancy         │ 78% 🏆          │ 56%             │ 32%             │
│ Nights Booked     │ 140             │ 101             │ 58              │
│ Avg. Night Rate   │ MWK 36,400      │ MWK 41,600 🏆   │ MWK 36,200      │
│ Total Bookings    │ 24              │ 18              │ 9               │
│ Avg. Stay Length  │ 5.8 nights      │ 5.6 nights      │ 6.4 nights      │
├───────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ Expense Breakdown │                 │                 │                 │
│ • Utilities       │ MWK 630,000     │ MWK 450,000     │ MWK 1,080,000   │
│ • Repairs         │ MWK 450,000     │ MWK 300,000     │ MWK 720,000     │
│ • Cleaning        │ MWK 360,000     │ MWK 375,000     │ MWK 360,000     │
│ • Other           │ MWK 360,000     │ MWK 375,000     │ MWK 240,000     │
└───────────────────┴─────────────────┴─────────────────┴─────────────────┘

🏆 = Best performer    ⚠️ = Needs attention

`### Insights Section`

─────────────────────────────────
💡 Insights
─────────────────────────────────

🏆 Top Performer: Area 43 – House A
Highest profit and occupancy rate

⚠️ Needs Attention: Area 43 – Cottage
• Running at a loss (-14% margin)
• Expenses 114% of income
• Utilities unusually high (45% of expenses)

💡 Recommendation:
Review utility usage at Cottage.
Consider rent increase or reducing
maintenance costs.

📈 Best Yield: Area 10 – Studio
Highest revenue per night despite
lower occupancy. Premium pricing
strategy working well.

`### Period Options
| Option | Duration |
|--------|----------|
| This Month | Current month |
| Last Month | Previous month |
| Last 3 Months | Rolling 3 months |
| Last 6 Months | Rolling 6 months |
| This Year | Jan 1 - Today |
| Last Year | Previous calendar year |
| Custom | User-defined range |

### Export Options
- **PDF Report:** Formatted comparison report
- **CSV:** Raw data for spreadsheet analysis
- **Share Link:** (Future) Shareable comparison URL

### API Endpoint`

GET /api/v1/analytics/compare?properties=uuid1,uuid2,uuid3&period=6m

Response:
{
"success": true,
"data": {
"period": {
"start": "2025-08-01",
"end": "2026-01-31",
"label": "Last 6 Months"
},
"properties": [
{
"id": "uuid1",
"name": "Area 43 – House A",
"metrics": {
"income_mwk": 510000000,
"income_gbp": 96000,
"expenses_mwk": 180000000,
"profit_mwk": 330000000,
"profit_gbp": 96000,
"profit_margin": 65,
"occupancy_percent": 78,
"nights_booked": 140,
"avg_night_rate": 3640000,
"total_bookings": 24,
"avg_stay_length": 5.8
},
"expense_breakdown": {
"utilities": 63000000,
"repairs": 45000000,
"cleaning": 36000000,
"other": 36000000
}
},
// ... other properties
],
"rankings": {
"income": ["uuid1", "uuid2", "uuid3"],
"profit": ["uuid1", "uuid2", "uuid3"],
"occupancy": ["uuid1", "uuid2", "uuid3"],
"yield": ["uuid2", "uuid1", "uuid3"]
},
"insights": [
{
"type": "top_performer",
"property_id": "uuid1",
"message": "Highest profit and occupancy rate"
},
{
"type": "needs_attention",
"property_id": "uuid3",
"message": "Running at a loss, high utility expenses"
}
]
}
}

- `--`

## 4️⃣ Property Detail Page

**Purpose:** Deep clarity for one property

`┌──────────────────────────────┐
│ ← Properties                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 🏠 Area 43 – House A         │
│ ✓ Active  •  Area 43         │
│                              │
│ [ Edit ] (Owner only)        │
└──────────────────────────────┘

─────────────────────────────────
Financial Summary
─────────────────────────────────

┌──────────────────────────────┐
│ 📅 January 2026          ▼   │
└──────────────────────────────┘

┌────────────┐ ┌────────────┐
│ 💰 Income  │ │ ❌ Expenses │
│            │ │            │
│ MWK 850K   │ │ MWK 300K   │
└────────────┘ └────────────┘

┌──────────────────────────────┐
│ 📈 Profit                    │
│                              │
│ MWK 550,000                  │
│ Margin: 65%                  │
└──────────────────────────────┘

─────────────────────────────────
Quick Actions
─────────────────────────────────
[ + Income ]  [ + Expense ]  [ + Booking ]

─────────────────────────────────
Recent Transactions
─────────────────────────────────

┌──────────────────────────────┐
│ 💰 Income                    │
│ MWK 150,000 – Local Booking  │
│ 15 Jan 2026                  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ❌ Expense                    │
│ MWK 45,000 – Utilities       │
│ 12 Jan 2026                  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 💰 Income                    │
│ MWK 200,000 – Airbnb         │
│ 8 Jan 2026                   │
└──────────────────────────────┘

[ View All Transactions ]

─────────────────────────────────
Upcoming Bookings
─────────────────────────────────

┌──────────────────────────────┐
│ 📅 12 – 15 Jan (3 nights)    │
│ 👤 John Banda                │
│ 🌐 Local • Confirmed         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 📅 20 – 23 Jan (3 nights)    │
│ 👤 Airbnb Guest              │
│ 🏠 Airbnb • Confirmed        │
└──────────────────────────────┘

[ View All Bookings ]

─────────────────────────────────
Property Details
─────────────────────────────────
Bedrooms: 2
Bathrooms: 1
Sleeps: 4
Price: MWK 45,000 / night

Amenities:
✓ WiFi  ✓ Parking  ✓ Kitchen
✓ Backup Power  ✓ Hot Water

─────────────────────────────────`

### UX Notes

- Header shows property name and status
- Financial summary with month filter
- Quick actions always accessible
- Recent transactions (last 5)
- Upcoming bookings
- Property details at bottom (less frequently needed)
- Tap transaction → detail (read-only in MVP)

---

## 5️⃣ Add/Edit Property Page (Owner Only)

**Purpose:** Create or modify property listings

`┌──────────────────────────────┐
│ ← Properties    Add Property │
└──────────────────────────────┘

─────────────────────────────────
Basic Info
─────────────────────────────────

Property Name *
┌──────────────────────────────┐
│ Area 43 – 2 Bedroom          │
└──────────────────────────────┘
e.g., "Area 43 – 2 Bedroom"

Location / Area *
┌──────────────────────────────┐
│ Area 43                  ▼   │
└──────────────────────────────┘

Street Address
┌──────────────────────────────┐
│ Off Presidential Way         │
└──────────────────────────────┘

─────────────────────────────────
Details
─────────────────────────────────

Bedrooms *          Bathrooms *
┌───────────┐      ┌───────────┐
│ 2     ▼   │      │ 1     ▼   │
└───────────┘      └───────────┘

Sleeps *
┌──────────────────────────────┐
│ 4                        ▼   │
└──────────────────────────────┘

Price per Night (MWK) *
┌──────────────────────────────┐
│ 45,000                       │
└──────────────────────────────┘

─────────────────────────────────
Amenities
─────────────────────────────────

[✓] WiFi
[✓] Parking
[✓] Kitchen
[ ] Pool
[✓] Backup Power
[ ] Air Conditioning
[✓] Hot Water
[✓] Security
[ ] TV
[ ] Washing Machine

─────────────────────────────────
Description
─────────────────────────────────
┌──────────────────────────────┐
│ Clean, fully furnished       │
│ apartment suitable for       │
│ families and business stays. │
│                              │
└──────────────────────────────┘

─────────────────────────────────
House Rules
─────────────────────────────────
┌──────────────────────────────┐
│ • No parties                 │
│ • No smoking indoors         │
│ • Check-in: 2:00 PM          │
│ • Check-out: 11:00 AM        │
└──────────────────────────────┘

─────────────────────────────────
Photos
─────────────────────────────────

┌───────┐ ┌───────┐ ┌───────┐
│       │ │       │ │       │
│ img 1 │ │ img 2 │ │  + Add│
│       │ │       │ │       │
└───────┘ └───────┘ └───────┘

Drag to reorder. First image
is the thumbnail.

Max 10 photos • Max 5MB each

─────────────────────────────────
Visibility
─────────────────────────────────

[✓] Show on public website
[✓] Property is active

─────────────────────────────────

[ Cancel ]         [ Save Property ]

─────────────────────────────────`

### UX Notes

- Organized into logical sections
- Required fields marked with *
- Helpful hints below inputs
- Amenities as checkboxes (quick to select)
- Photo upload with reordering
- Visibility toggles at bottom

---

## 6️⃣ Transactions Page

**Purpose:** Full transparency & audit trail

`┌──────────────────────────────┐
│ ← Dashboard      Transactions│
└──────────────────────────────┘

┌──────────────────────────────┐
│ 🔍 Search transactions...    │
└──────────────────────────────┘

─────────────────────────────────
Filters
─────────────────────────────────
[ All Properties ▼ ] [ All Types ▼ ]
[ This Month ▼ ]     [ All Categories ▼ ]

[ Clear Filters ]

─────────────────────────────────
January 2026 • 47 transactions
─────────────────────────────────

15 January
─────────────────────────────────
┌──────────────────────────────┐
│ 💰 Income         +150,000   │
│ Area 43 – Local Booking      │
│ Mobile Money                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ❌ Expense          -45,000   │
│ Area 10 – Utilities          │
│ Bank Transfer                │
└──────────────────────────────┘

14 January
─────────────────────────────────
┌──────────────────────────────┐
│ 💰 Income          +85,000   │
│ Area 10 – Airbnb             │
│ Airbnb Payout                │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ❌ Expense          -15,000   │
│ Area 43 – Cleaning           │
│ Cash                         │
└──────────────────────────────┘

13 January
─────────────────────────────────
┌──────────────────────────────┐
│ 💰 Income         +200,000   │
│ Area 43 – Local Booking      │
│ Bank Transfer                │
└──────────────────────────────┘

[ Load More ]

─────────────────────────────────
Summary
─────────────────────────────────
Income:   MWK 2,450,000
Expenses: MWK 900,000
Net:      MWK 1,550,000
─────────────────────────────────`

### UX Notes

- Search at top
- Filters collapsible on mobile
- Grouped by date
- Infinite scroll (mobile-friendly)
- Summary at bottom shows filtered totals
- No inline editing (safety first)
- Tap transaction → detail view

### Transaction Detail (Modal or Page)

`┌──────────────────────────────┐
│ Transaction Detail      ✕    │
│ ─────────────────────────────│
│                              │
│ 💰 Income                    │
│                              │
│ Amount                       │
│ MWK 150,000                  │
│                              │
│ Property                     │
│ Area 43 – House A            │
│                              │
│ Source                       │
│ Local Booking                │
│                              │
│ Payment Method               │
│ Mobile Money                 │
│                              │
│ Date                         │
│ 15 January 2026              │
│                              │
│ Linked Booking               │
│ John Banda – 12-15 Jan       │
│                              │
│ Notes                        │
│ "Final payment received"     │
│                              │
│ ─────────────────────────────│
│ Added by: Staff (John)       │
│ 15 Jan 2026, 10:32 AM        │
│ ─────────────────────────────│
│                              │
│ [ Delete ] (Owner only)      │
│                              │
└──────────────────────────────┘`

---

- `--
## 📥 Bulk Transaction Import
### Overview
Import historical transactions from CSV/Excel files for initial data migration or bulk entry.
### Access
**Location:** Transactions page → "Import" button
**Permission:** Owner only
### Import Button Placement`

┌──────────────────────────────┐
│ ← Dashboard      Transactions│
└──────────────────────────────┘

┌────────────────┐  ┌──────────┐
│ + Add Income   │  │ 📥 Import │
└────────────────┘  └──────────┘
┌────────────────┐
│ + Add Expense  │
└────────────────┘

`### Import Flow

**Step 1: Upload File**`

┌──────────────────────────────┐
│ Import Transactions     ✕    │
├──────────────────────────────┤
│                              │
│ Step 1 of 3: Upload File     │
│ ═══════════░░░░░░░░░░░░░░░░  │
│                              │
│ ┌────────────────────────┐   │
│ │                        │   │
│ │   📄 Drop CSV or       │   │
│ │   Excel file here      │   │
│ │                        │   │
│ │   or click to browse   │   │
│ │                        │   │
│ └────────────────────────┘   │
│                              │
│ Supported: .csv, .xlsx, .xls │
│ Max size: 5MB                │
│                              │
│ 📥 Download Template         │
│                              │
│ ────────────────────────────│
│                              │
│ [ Cancel ]                   │
│                              │
└──────────────────────────────┘

`**Step 2: Map Columns**`

┌──────────────────────────────┐
│ Import Transactions     ✕    │
├──────────────────────────────┤
│                              │
│ Step 2 of 3: Map Columns     │
│ ═══════════════════░░░░░░░░  │
│                              │
│ Found 47 rows in your file   │
│                              │
│ Match your columns:          │
│                              │
│ Date *                       │
│ ┌────────────────────────┐   │
│ │ Column A: "Date"   ▼   │   │
│ └────────────────────────┘   │
│ Format: DD/MM/YYYY           │
│                              │
│ Amount *                     │
│ ┌────────────────────────┐   │
│ │ Column C: "Amount" ▼   │   │
│ └────────────────────────┘   │
│                              │
│ Type *                       │
│ ┌────────────────────────┐   │
│ │ Column B: "Type"   ▼   │   │
│ └────────────────────────┘   │
│ Values: Income/Expense       │
│                              │
│ Property *                   │
│ ┌────────────────────────┐   │
│ │ Column D: "Property" ▼ │   │
│ └────────────────────────┘   │
│                              │
│ Category                     │
│ ┌────────────────────────┐   │
│ │ Column E: "Category" ▼ │   │
│ └────────────────────────┘   │
│                              │
│ Currency                     │
│ ┌────────────────────────┐   │
│ │ All rows: MWK      ▼   │   │
│ └────────────────────────┘   │
│ Or select column             │
│                              │
│ Notes                        │
│ ┌────────────────────────┐   │
│ │ Column F: "Notes"  ▼   │   │
│ └────────────────────────┘   │
│                              │
│ ────────────────────────────│
│                              │
│ [ Back ]        [ Preview ]  │
│                              │
└──────────────────────────────┘

`**Step 3: Preview & Confirm**`

┌──────────────────────────────┐
│ Import Transactions     ✕    │
├──────────────────────────────┤
│                              │
│ Step 3 of 3: Preview         │
│ ═══════════════════════════  │
│                              │
│ Ready to import 47 transactions│
│                              │
│ ✅ 45 valid rows             │
│ ⚠️ 2 rows with warnings      │
│ ❌ 0 rows with errors        │
│                              │
│ Preview (first 5 rows):      │
│ ────────────────────────────│
│                              │
│ ✅ 15 Jan | Income | MWK 150K│
│    Area 43 | Booking         │
│                              │
│ ✅ 14 Jan | Expense | MWK 45K│
│    Area 43 | Utilities       │
│                              │
│ ⚠️ 13 Jan | Income | MWK 85K │
│    Area 10 | Unknown category│
│    → Will use "Other Income" │
│                              │
│ ✅ 12 Jan | Expense | MWK 15K│
│    Area 10 | Cleaning        │
│                              │
│ ⚠️ 10 Jan | Income | MWK 200K│
│    "Area43" not found        │
│    → Matched to "Area 43"    │
│                              │
│ [ Show all 47 rows ]         │
│                              │
│ ────────────────────────────│
│                              │
│ [ Back ]   [ Import 47 rows ]│
│                              │
└──────────────────────────────┘

`**Import Complete:**`

┌──────────────────────────────┐
│ Import Complete         ✕    │
├──────────────────────────────┤
│                              │
│            ✅                │
│                              │
│   47 transactions imported   │
│                              │
│ Summary:                     │
│ • Income: 28 transactions    │
│   Total: MWK 4,250,000       │
│                              │
│ • Expenses: 19 transactions  │
│   Total: MWK 1,890,000       │
│                              │
│ ────────────────────────────│
│                              │
│ [ View Transactions ]        │
│ [ Import More ]              │
│                              │
└──────────────────────────────┘

`### CSV Template
```csv
Date,Type,Amount,Currency,Property,Category,Payment Method,Notes
15/01/2026,Income,150000,MWK,Area 43 – House A,Booking,Mobile Money,Local guest payment
14/01/2026,Expense,45000,MWK,Area 43 – House A,Utilities,Bank,ESCOM bill
13/01/2026,Income,85000,MWK,Area 10 – Studio,Airbnb Payout,Airbnb Payout,
12/01/2026,Expense,15000,MWK,Area 10 – Studio,Cleaning,Cash,Weekly cleaning
10/01/2026,Income,320,GBP,Area 43 – House A,Airbnb Payout,Airbnb Payout,Airbnb payout
```

### Column Mapping Rules

| Column | Required | Accepted Values |
|--------|----------|-----------------|
| Date | ✅ | DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY (auto-detect) |
| Type | ✅ | Income, Expense, I, E, +, - |
| Amount | ✅ | Number (commas allowed: 150,000) |
| Currency | ❌ | MWK, GBP (default: MWK) |
| Property | ✅ | Property name (fuzzy matched) |
| Category | ❌ | Category name (fuzzy matched, default based on type) |
| Payment Method | ❌ | Cash, Bank, Mobile Money, Airbnb Payout (default: Cash) |
| Notes | ❌ | Free text |

### Fuzzy Matching Logic`

Input: "Area43"
Matches: "Area 43 – House A" (closest match)

Input: "utilities"

Matches: "Utilities" (case insensitive)

Input: "airbnb"
Matches: "Airbnb Payout" (partial match)

`### Validation Rules
| Rule | Severity | Behavior |
|------|----------|----------|
| Missing date | ❌ Error | Row skipped |
| Missing amount | ❌ Error | Row skipped |
| Missing type | ❌ Error | Row skipped |
| Unknown property | ⚠️ Warning | Show suggestions, require selection |
| Unknown category | ⚠️ Warning | Default to "Other Income/Expense" |
| Future date | ⚠️ Warning | Allow but highlight |
| Negative amount | ⚠️ Warning | Convert to positive |
| Duplicate row | ⚠️ Warning | Import anyway (user decides) |

### Error Handling`

┌──────────────────────────────┐
│ ❌ Import Errors              │
├──────────────────────────────┤
│                              │
│ 3 rows could not be imported:│
│                              │
│ Row 12: Missing date         │
│ Row 24: Invalid amount "abc" │
│ Row 31: Missing type         │
│                              │
│ [ Download Error Report ]    │
│                              │
│ 44 rows imported successfully│
│                              │
│ [ Done ]                     │
│                              │
└──────────────────────────────┘

`### Audit Log Entry
```json
{
  "action": "BULK_IMPORT",
  "resource_type": "transaction",
  "details": {
    "file_name": "transactions_jan_2026.csv",
    "total_rows": 47,
    "imported": 44,
    "skipped": 3,
    "income_count": 26,
    "expense_count": 18,
    "income_total_mwk": 425000000,
    "expense_total_mwk": 189000000
  }
}
```

### API Endpoints`

POST /api/v1/transactions/import/upload     -- Upload file, return preview
POST /api/v1/transactions/import/validate   -- Validate mapped data
POST /api/v1/transactions/import/execute    -- Execute import
GET  /api/v1/transactions/import/template   -- Download CSV template

`### Security Considerations
- Owner only permission
- Max file size: 5MB
- Max rows per import: 1000
- Rate limit: 5 imports per hour
- Virus scan on upload (if available)
---`

## 7️⃣ Add Transaction Page (Critical UX)

**Purpose:** Make logging money painless

### Income Form

`┌──────────────────────────────┐
│ ← Back           Add Income  │
└──────────────────────────────┘

─────────────────────────────────

Amount (MWK) *
┌──────────────────────────────┐
│                              │
│         150,000              │
│                              │
└──────────────────────────────┘
        (Large numeric input)

─────────────────────────────────

Property *
┌──────────────────────────────┐
│ Area 43 – House A        ▼   │
└──────────────────────────────┘
(Last used pre-selected)

─────────────────────────────────

Source *
┌──────────────────────────────┐
│ ( ) Airbnb                   │
│ (•) Local Booking            │
│ ( ) Other                    │
└──────────────────────────────┘

─────────────────────────────────

Payment Method *
┌──────────────────────────────┐
│ Mobile Money             ▼   │
└──────────────────────────────┘

Options:
- Cash
- Mobile Money
- Bank Transfer
- Airbnb Payout

─────────────────────────────────

Date *
┌──────────────────────────────┐
│ Today, 15 Jan 2026       ▼   │
└──────────────────────────────┘

─────────────────────────────────

Linked Booking (optional)
┌──────────────────────────────┐
│ Select booking...        ▼   │
└──────────────────────────────┘

Shows recent bookings for selected property

─────────────────────────────────

Notes (optional)
┌──────────────────────────────┐
│                              │
└──────────────────────────────┘
e.g., "Final payment from guest"

─────────────────────────────────

┌──────────────────────────────┐
│           Save               │
└──────────────────────────────┘

[ Save & Add Another ]

─────────────────────────────────`

### Expense Form

`┌──────────────────────────────┐
│ ← Back          Add Expense  │
└──────────────────────────────┘

─────────────────────────────────

Amount (MWK) *
┌──────────────────────────────┐
│                              │
│          45,000              │
│                              │
└──────────────────────────────┘

─────────────────────────────────

Property *
┌──────────────────────────────┐
│ Area 43 – House A        ▼   │
└──────────────────────────────┘

─────────────────────────────────

Category *
┌──────────────────────────────┐
│ Utilities                ▼   │
└──────────────────────────────┘

Categories:
- Utilities (ESCOM, Water)
- Repairs & Maintenance
- Cleaning
- Fuel & Transport
- Supplies
- Commission / Fees
- Other

─────────────────────────────────

Payment Method *
┌──────────────────────────────┐
│ Cash                     ▼   │
└──────────────────────────────┘

─────────────────────────────────

Date *
┌──────────────────────────────┐
│ Today, 15 Jan 2026       ▼   │
└──────────────────────────────┘

─────────────────────────────────

Notes (optional)
┌──────────────────────────────┐
│ ESCOM bill for December      │
└──────────────────────────────┘

─────────────────────────────────

Receipt Photo (optional)
┌───────────────────┐
│                   │
│    + Add Photo    │
│                   │
└───────────────────┘

─────────────────────────────────

┌──────────────────────────────┐
│           Save               │
└──────────────────────────────┘

[ Save & Add Another ]

─────────────────────────────────`

### Smart Defaults

- **Property:** Last used property pre-selected
- **Date:** Today pre-selected
- **Category:** Suggested based on recent entries
- **"Save & Add Another":** Stays on form, clears amount only

### Amount Input UX

- Large numeric keypad on mobile
- Auto-format with thousands separator (150,000)
- No decimal input (Kwacha, not tambala for display)
- Clear button to reset

---

## 8️⃣ Bookings Page

**Purpose:** Operational awareness

`┌──────────────────────────────┐
│ ← Dashboard         Bookings │
└──────────────────────────────┘

[ + Add Booking ]

─────────────────────────────────
Status Filter
─────────────────────────────────
[ All ] [ Upcoming ] [ Current ] [ Past ]

─────────────────────────────────
[ All Properties ▼ ]  [ All Sources ▼ ]
─────────────────────────────────

Upcoming
─────────────────────────────────

┌──────────────────────────────┐
│ 🏠 Area 43 – House A         │
│ ─────────────────────────────│
│ 📅 12 – 15 Jan (3 nights)    │
│ 👤 John Banda                │
│ 📞 0991234567                │
│ ─────────────────────────────│
│ 🌐 Local • ✅ Confirmed      │
│ 💰 MWK 135,000               │
│                          →   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 🏠 Area 10 – Studio          │
│ ─────────────────────────────│
│ 📅 18 – 20 Jan (2 nights)    │
│ 👤 Airbnb Guest              │
│ ─────────────────────────────│
│ 🏠 Airbnb • ✅ Confirmed     │
│ 💰 MWK 60,000                │
│                          →   │
└──────────────────────────────┘

Current (Checked In)
─────────────────────────────────

┌──────────────────────────────┐
│ 🏠 Area 43 – Cottage         │
│ ─────────────────────────────│
│ 📅 10 – 13 Jan (3 nights)    │
│ 👤 Mary Phiri                │
│ 📞 0881234567                │
│ ─────────────────────────────│
│ 🌐 Local • 🔵 Checked In     │
│ 💰 MWK 90,000 (Paid)         │
│                          →   │
└──────────────────────────────┘

─────────────────────────────────`

### Booking Status Colors

- ⬜ Pending – Gray
- ✅ Confirmed – Green
- 🔵 Checked In – Blue
- ✓ Completed – Green (faded)
- ❌ Cancelled – Red

## 9️⃣ Booking Detail Page

**Purpose:** Full booking information and actions

- `--
## 💬 Guest Communication Log
### Overview
Track all communication attempts with guests (calls, WhatsApp messages) for better follow-up and accountability.
### Location
Booking Detail Page → New "Communication" section
### Updated Booking Detail Page`

┌──────────────────────────────┐
│ ← Bookings                   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 🏠 Area 43 – House A         │
│ ─────────────────────────────│
│ Status: ✅ CONFIRMED         │
└──────────────────────────────┘

─────────────────────────────────
Guest
─────────────────────────────────
👤 John Banda
📞 0991234567
📧 [john@email.com](mailto:john@email.com)

[ Call ]  [ WhatsApp ]

─────────────────────────────────
💬 Communication Log
─────────────────────────────────

[ + Log Communication ]

┌──────────────────────────────┐
│ 📞 Phone Call                │
│ 12 Jan 2026, 10:30 AM        │
│ By: Staff (John)             │
│ ─────────────────────────────│
│ "Confirmed check-in time.    │
│ Guest arriving at 8pm.       │
│ Airport pickup arranged."    │
│                              │
│ Duration: 3 mins             │
│ Outcome: ✅ Reached          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 💬 WhatsApp                  │
│ 11 Jan 2026, 2:15 PM         │
│ By: Owner                    │
│ ─────────────────────────────│
│ "Sent payment confirmation   │
│ and check-in instructions."  │
│                              │
│ Outcome: ✅ Delivered        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 📞 Phone Call                │
│ 10 Jan 2026, 9:20 AM         │
│ By: Owner                    │
│ ─────────────────────────────│
│ "Initial call to confirm     │
│ booking and discuss payment."│
│                              │
│ Duration: 5 mins             │
│ Outcome: ✅ Reached          │
└──────────────────────────────┘

─────────────────────────────────
[Rest of booking details...]

`### Log Communication Modal`

┌──────────────────────────────┐
│ Log Communication       ✕    │
├──────────────────────────────┤
│                              │
│ Type *                       │
│ ○ 📞 Phone Call              │
│ ● 💬 WhatsApp                │
│ ○ 📧 Email                   │
│ ○ 💬 SMS                     │
│ ○ 🗣️ In Person               │
│                              │
│ Date & Time *                │
│ ┌────────────────────────┐   │
│ │ Today, 10:30 AM    ▼   │   │
│ └────────────────────────┘   │
│                              │
│ Outcome *                    │
│ ┌────────────────────────┐   │
│ │ ✅ Reached          ▼   │   │
│ └────────────────────────┘   │
│                              │
│ Options:                     │
│ • ✅ Reached                 │
│ • ❌ No Answer               │
│ • 📵 Phone Off               │
│ • 💬 Left Message            │
│ • ✅ Delivered (WhatsApp)    │
│ • 👀 Read (WhatsApp)         │
│                              │
│ Duration (for calls)         │
│ ┌────────────────────────┐   │
│ │ 3 mins                 │   │
│ └────────────────────────┘   │
│                              │
│ Notes *                      │
│ ┌────────────────────────┐   │
│ │ Confirmed check-in     │   │
│ │ time. Guest arriving   │   │
│ │ at 8pm. Airport pickup │   │
│ │ arranged.              │   │
│ └────────────────────────┘   │
│                              │
│ ────────────────────────────│
│                              │
│ [ Cancel ]        [ Save ]   │
│                              │
└──────────────────────────────┘

`### Quick Log from Contact Buttons
When clicking "Call" or "WhatsApp", show quick log option after:`

┌──────────────────────────────┐
│ Log this call?          ✕    │
├──────────────────────────────┤
│                              │
│ You just called John Banda   │
│ 📞 0991234567                │
│                              │
│ Quick outcome:               │
│                              │
│ [ ✅ Reached ]               │
│ [ ❌ No Answer ]             │
│ [ 📵 Phone Off ]             │
│ [ Skip Logging ]             │
│                              │
└──────────────────────────────┘

`If "Reached" selected:`

┌──────────────────────────────┐
│ Call Logged             ✕    │
├──────────────────────────────┤
│                              │
│ Add notes? (optional)        │
│ ┌────────────────────────┐   │
│ │                        │   │
│ └────────────────────────┘   │
│                              │
│ [ Skip ]          [ Save ]   │
│                              │
└──────────────────────────────┘

`### Database Schema

**New Table: `communication_logs`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✅ | Primary key |
| booking_id | UUID | ✅ | FK → bookings |
| guest_id | UUID | | FK → guests (for non-booking comms) |
| inquiry_id | UUID | | FK → inquiries (for inquiry comms) |
| type | Enum | ✅ | PHONE, WHATSAPP, EMAIL, SMS, IN_PERSON |
| outcome | Enum | ✅ | REACHED, NO_ANSWER, PHONE_OFF, LEFT_MESSAGE, DELIVERED, READ |
| duration_minutes | Integer | | For calls |
| notes | Text | | Communication details |
| contacted_at | Timestamp | ✅ | When communication happened |
| created_by | UUID | ✅ | FK → users |
| created_at | Timestamp | ✅ | |
```sql
CREATE TYPE communication_type AS ENUM (
  'PHONE',
  'WHATSAPP', 
  'EMAIL',
  'SMS',
  'IN_PERSON'
);

CREATE TYPE communication_outcome AS ENUM (
  'REACHED',
  'NO_ANSWER',
  'PHONE_OFF',
  'LEFT_MESSAGE',
  'DELIVERED',
  'READ'
);

CREATE TABLE communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  type communication_type NOT NULL,
  outcome communication_outcome NOT NULL,
  duration_minutes INTEGER,
  notes TEXT,
  contacted_at TIMESTAMP NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- At least one of these must be set
  CONSTRAINT communication_has_context CHECK (
    booking_id IS NOT NULL OR 
    guest_id IS NOT NULL OR 
    inquiry_id IS NOT NULL
  )
);

CREATE INDEX comm_logs_booking_idx ON communication_logs (booking_id);
CREATE INDEX comm_logs_guest_idx ON communication_logs (guest_id);
CREATE INDEX comm_logs_inquiry_idx ON communication_logs (inquiry_id);
CREATE INDEX comm_logs_contacted_at_idx ON communication_logs (contacted_at);
```

### Prisma Schema
```prisma
enum CommunicationType {
  PHONE
  WHATSAPP
  EMAIL
  SMS
  IN_PERSON
}

enum CommunicationOutcome {
  REACHED
  NO_ANSWER
  PHONE_OFF
  LEFT_MESSAGE
  DELIVERED
  READ
}

model CommunicationLog {
  id              String               @id @default(uuid())
  bookingId       String?              @map("booking_id")
  guestId         String?              @map("guest_id")
  inquiryId       String?              @map("inquiry_id")
  type            CommunicationType
  outcome         CommunicationOutcome
  durationMinutes Int?                 @map("duration_minutes")
  notes           String?
  contactedAt     DateTime             @map("contacted_at")
  createdBy       String               @map("created_by")
  createdAt       DateTime             @default(now()) @map("created_at")

  booking  Booking?  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  guest    Guest?    @relation(fields: [guestId], references: [id], onDelete: SetNull)
  inquiry  Inquiry?  @relation(fields: [inquiryId], references: [id], onDelete: Cascade)
  creator  User      @relation(fields: [createdBy], references: [id])

  @@index([bookingId])
  @@index([guestId])
  @@index([inquiryId])
  @@index([contactedAt])
  @@map("communication_logs")
}
```

### API Endpoints`

GET    /api/v1/bookings/:id/communications      -- List for booking
POST   /api/v1/bookings/:id/communications      -- Add to booking
GET    /api/v1/inquiries/:id/communications     -- List for inquiry
POST   /api/v1/inquiries/:id/communications     -- Add to inquiry
GET    /api/v1/guests/:id/communications        -- All comms with guest
DELETE /api/v1/communications/:id               -- Delete log entry

`### Inquiry Page Integration
Also add communication log to Inquiry Detail:`

─────────────────────────────────
💬 Communication Log
─────────────────────────────────

┌──────────────────────────────┐
│ 📞 Phone Call                │
│ 10 Jan 2026, 11:00 AM        │
│ By: Owner                    │
│ ─────────────────────────────│
│ "Called to discuss dates.    │
│ Guest confirmed interest."   │
│                              │
│ Outcome: ✅ Reached          │
└──────────────────────────────┘

[ + Log Communication ]

`### Guest History View
On Guest Detail page, show all communications across all bookings:`

─────────────────────────────────
💬 Communication History
─────────────────────────────────

Total: 8 communications
Last contact: 12 Jan 2026

📅 Jan 2026 (Booking BKG-0123)

- 12 Jan – 📞 Call – Reached
- 11 Jan – 💬 WhatsApp – Delivered
- 10 Jan – 📞 Call – Reached

📅 Nov 2025 (Booking BKG-0098)

- 5 Nov – 📞 Call – Reached
- 3 Nov – 📞 Call – No Answer
- 3 Nov – 💬 WhatsApp – Read
- `--`

---

## 🔟 Inquiries Page

**Purpose:** Manage incoming booking requests and questions

`┌──────────────────────────────┐
│ ← Dashboard        Inquiries │
└──────────────────────────────┘

─────────────────────────────────
[ New (3) ] [ Contacted ] [ Converted ] [ Expired ]
─────────────────────────────────

[ All Properties ▼ ]  [ This Week ▼ ]

─────────────────────────────────

New Inquiries
─────────────────────────────────

┌──────────────────────────────┐
│ 🔴 NEW               2h ago  │
│ ─────────────────────────────│
│ 🏠 Area 43 – 2 Bedroom       │
│ 👤 John Banda                │
│ 📞 0991234567                │
│ ─────────────────────────────│
│ 📅 12 – 15 Jan (3 nights)    │
│ 👥 3 guests                  │
│ ─────────────────────────────│
│ 💬 "Arriving late, around    │
│    8pm. Is that okay?"       │
│ ─────────────────────────────│
│ [ Call ] [ WhatsApp ]        │
│ [ Mark Contacted ]           │
│ [ Convert to Booking ]       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 🔴 NEW               5h ago  │
│ ─────────────────────────────│
│ 🏠 Area 10 – Studio          │
│ 👤 Mary Phiri                │
│ 📞 0881234567                │
│ ─────────────────────────────│
│ ❓ ENQUIRY                   │
│ ─────────────────────────────│
│ 💬 "Is there a washing       │
│    machine available?"       │
│ ─────────────────────────────│
│ [ Call ] [ WhatsApp ]        │
│ [ Mark Responded ]           │
└──────────────────────────────┘

Contacted
─────────────────────────────────

┌──────────────────────────────┐
│ 🟡 CONTACTED          1d ago │
│ ─────────────────────────────│
│ 🏠 Area 43 – Cottage         │
│ 👤 Peter Moyo                │
│ 📞 0999876543                │
│ ─────────────────────────────│
│ 📅 20 – 22 Jan (2 nights)    │
│ ─────────────────────────────│
│ [ Convert to Booking ]       │
│ [ Mark Expired ]             │
└──────────────────────────────┘

─────────────────────────────────`

### Inquiry Status Flow

`BOOKING REQUEST:
NEW → CONTACTED → CONVERTED (creates booking)
           ↓
        EXPIRED (after 7 days or manual)

ENQUIRY:
NEW → RESPONDED → CLOSED
           ↓
        EXPIRED`

---

## 1️⃣1️⃣ Reports Page

**Purpose:** Decision support, patterns, not accounting

`┌──────────────────────────────┐
│ ← Dashboard          Reports │
└──────────────────────────────┘

─────────────────────────────────
Filters
─────────────────────────────────
[ Last 6 Months ▼ ]  [ All Properties ▼ ]

─────────────────────────────────
Monthly Profit Trend
─────────────────────────────────

┌──────────────────────────────┐
│                              │
│      █                       │
│      █  █        █           │
│   █  █  █  █     █           │
│   █  █  █  █  █  █           │
│ ──────────────────────────── │
│ Aug Sep Oct Nov Dec Jan      │
│                              │
│ Best: Sep – MWK 1.85M        │
│ Worst: Dec – MWK 980K        │
└──────────────────────────────┘

─────────────────────────────────
Revenue by Source
─────────────────────────────────

┌──────────────────────────────┐
│                              │
│ Airbnb   ████████████  65%   │
│ Local    ██████        30%   │
│ Other    ██             5%   │
│                              │
│ Total: MWK 8,500,000         │
└──────────────────────────────┘

─────────────────────────────────
Expenses by Category
─────────────────────────────────

┌──────────────────────────────┐
│                              │
│ Utilities  ████████    40%   │
│ Repairs    █████       25%   │
│ Cleaning   ███         15%   │
│ Supplies   ██          10%   │
│ Other      ██          10%   │
│                              │
│ Total: MWK 3,200,000         │
└──────────────────────────────┘

─────────────────────────────────
Profit by Property
─────────────────────────────────

┌──────────────────────────────┐
│                              │
│ Area 43 – House A            │
│ ████████████████  MWK 2.1M   │
│                              │
│ Area 10 – Studio             │
│ ██████████        MWK 1.3M   │
│                              │
│ Area 43 – Cottage            │
│ ██████            MWK 850K   │
│                              │
└──────────────────────────────┘

─────────────────────────────────
Key Metrics
─────────────────────────────────

┌──────────────────────────────┐
│ Average Profit Margin        │
│ 63%                          │
│ ─────────────────────────────│
│ Highest: Area 43 House (68%) │
│ Lowest: Area 43 Cottage (42%)│
└──────────────────────────────┘

┌──────────────────────────────┐
│ Total Bookings               │
│ 47                           │
│ ─────────────────────────────│
│ Airbnb: 31 (66%)             │
│ Local: 16 (34%)              │
└──────────────────────────────┘

─────────────────────────────────`

### UX Notes

- Simple bar charts (no complex libraries)
- Touch-friendly (tap bar for details)
- Numbers always visible (don't rely on chart only)
- Export: Not in MVP

---

- `--
## 📅 Occupancy Calendar View
### Overview
Visual calendar showing property availability and bookings across all properties, making it easy to spot gaps and manage scheduling.
### Access
**Location:** Dashboard → Reports → Occupancy Calendar
**Alternative:** Properties → Calendar View toggle
### Navigation Header`

┌──────────────────────────────┐
│ ← Reports    Occupancy Calendar│
└──────────────────────────────┘

┌──────────────────────────────┐
│ ◀  January 2026  ▶           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Properties:                  │
│ [All] [Area 43] [Area 10]    │
└──────────────────────────────┘

`### Mobile View (Timeline Style)`

─────────────────────────────────
📅 January 2026
─────────────────────────────────

🏠 Area 43 – House A
─────────────────────────────────
1  2  3  4  5  6  7
░░░░░░░░░░░░░░░░░░░░░░

 `8  9  10 11 12 13 14
░░░░░░████████████░░░░
      └─ John B. ─┘`

`15 16 17 18 19 20 21
████████████░░░░░░░░░░
└─ Mary P. ─┘`

`22 23 24 25 26 27 28
░░░░░░░░████████████░░
         └─ Pending ─┘`

`29 30 31
░░░░░░░░`

Legend: ░ Available  █ Booked  ▓ Pending

─────────────────────────────────

🏠 Area 10 – Studio
─────────────────────────────────
1  2  3  4  5  6  7
████████████████████░░
└──── Grace N. ────┘

 `8  9  10 11 12 13 14
░░░░░░░░░░░░░░░░░░░░░░`

`15 16 17 18 19 20 21
░░░░████████████████░░
    └── James K. ──┘`

`22 23 24 25 26 27 28
░░░░░░░░░░░░░░░░░░░░░░`

`29 30 31
░░░░░░░░`

─────────────────────────────────

🏠 Area 43 – Cottage
─────────────────────────────────
[Similar layout...]

─────────────────────────────────

📊 January Summary
─────────────────────────────────
Overall Occupancy: 58%

Area 43 – House A:    65%
Area 10 – Studio:     48%
Area 43 – Cottage:    52%

Available Nights: 39
Booked Nights:    54

[ Export Calendar ]

─────────────────────────────────

`### Desktop View (Grid Style)`

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Occupancy Calendar – January 2026                                    [ Export ]     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│ Property          │ 1  2  3  4  5  6  7 │ 8  9 10 11 12 13 14 │ 15 16 17 18 19 20 21│
│ ──────────────────┼─────────────────────┼─────────────────────┼─────────────────────│
│ Area 43 – House A │ ░  ░  ░  ░  ░  ░  ░ │ ░  ░  █  █  █  █  ░ │ █  █  █  █  ░  ░  ░ │
│                   │                     │       └John Banda─┘ │ └─Mary Phiri──┘     │
│ ──────────────────┼─────────────────────┼─────────────────────┼─────────────────────│
│ Area 10 – Studio  │ █  █  █  █  █  █  ░ │ ░  ░  ░  ░  ░  ░  ░ │ ░  ░  █  █  █  █  █ │
│                   │ └───Grace Nkhoma───┘│                     │       └James K.────│
│ ──────────────────┼─────────────────────┼─────────────────────┼─────────────────────│
│ Area 43 – Cottage │ ░  ░  ░  ░  ░  ░  ░ │ ░  ░  ░  ░  ░  ░  ░ │ ▓  ▓  ▓  ░  ░  ░  ░ │
│                   │                     │                     │ └Pending┘           │
└─────────────────────────────────────────────────────────────────────────────────────┘

Legend: ░ Available  █ Confirmed  ▓ Pending  ▒ Blocked

Scroll → for more dates

`### Interactive Features

**Click on Booking Block:**`

┌──────────────────────────────┐
│ Booking Details              │
├──────────────────────────────┤
│ 🏠 Area 43 – House A         │
│ 👤 John Banda                │
│ 📅 10 – 13 Jan (3 nights)    │
│ 💰 MWK 135,000 (Paid ✓)      │
│                              │
│ [View Booking] [Edit Dates]  │
└──────────────────────────────┘

`**Click on Empty Day:**`

┌──────────────────────────────┐
│ 15 January 2026              │
│ Area 43 – House A            │
├──────────────────────────────┤
│ ✅ Available                 │
│                              │
│ [Create Booking]             │
│ [Block Dates]                │
└──────────────────────────────┘

`### Color Coding

| Status | Color | Meaning |
|--------|-------|---------|
| Available | Light gray (░) | Open for booking |
| Confirmed | Green (█) | Confirmed booking |
| Pending | Yellow (▓) | Awaiting confirmation/payment |
| Checked In | Blue (█) | Guest currently staying |
| Blocked | Red (▒) | Manually blocked (maintenance, personal use) |

### Month Navigation`

┌──────────────────────────────┐
│ ◀  January 2026  ▶           │
│                              │
│ [Today] [This Week] [Month]  │
└──────────────────────────────┘

Quick Jump:
[ Jan ] [ Feb ] [ Mar ] [ Apr ]
[ May ] [ Jun ] [ Jul ] [ Aug ]
[ Sep ] [ Oct ] [ Nov ] [ Dec ]

`### Filter Options`

┌──────────────────────────────┐
│ Filter Calendar         ✕    │
├──────────────────────────────┤
│                              │
│ Properties:                  │
│ ☑️ Area 43 – House A         │
│ ☑️ Area 10 – Studio          │
│ ☐ Area 43 – Cottage          │
│                              │
│ Status:                      │
│ ☑️ Show Confirmed            │
│ ☑️ Show Pending              │
│ ☑️ Show Available            │
│ ☐ Show Blocked               │
│                              │
│ [ Apply ] [ Reset ]          │
│                              │
└──────────────────────────────┘

`### Occupancy Statistics Panel`

─────────────────────────────────
📊 January 2026 Stats
─────────────────────────────────

Overall Occupancy
████████████░░░░░░░░  58%

By Property:
─────────────────────────────────
Area 43 – House A
████████████████░░░░  78%
24 of 31 nights booked
Revenue: MWK 1,080,000

Area 10 – Studio
████████████░░░░░░░░  58%
18 of 31 nights booked
Revenue: MWK 540,000

Area 43 – Cottage
████████░░░░░░░░░░░░  39%
12 of 31 nights booked
Revenue: MWK 360,000

─────────────────────────────────
Gaps Analysis
─────────────────────────────────

Longest Available Gap:

- Area 10: 7 nights (8-14 Jan)
- Area 43 Cottage: 14 nights (1-14 Jan)

Weekend Availability:

- 18-19 Jan: 2 properties available
- 25-26 Jan: 3 properties available

─────────────────────────────────

`### API Endpoint`

GET /api/v1/analytics/calendar?month=2026-01&properties=uuid1,uuid2

Response:
{
"success": true,
"data": {
"month": "2026-01",
"properties": [
{
"id": "uuid1",
"name": "Area 43 – House A",
"days": [
{ "date": "2026-01-01", "status": "available" },
{ "date": "2026-01-02", "status": "available" },
// ...
{
"date": "2026-01-10",
"status": "confirmed",
"booking": {
"id": "booking-uuid",
"guest_name": "John Banda",
"check_in": "2026-01-10",
"check_out": "2026-01-14"
}
},
// ...
],
"stats": {
"total_nights": 31,
"booked_nights": 24,
"occupancy_percent": 78,
"revenue": 108000000
}
}
],
"summary": {
"overall_occupancy": 58,
"total_booked_nights": 54,
"total_available_nights": 39,
"total_revenue": 198000000
}
}
}

`### Block Dates Feature

For maintenance, personal use, or seasonal closures:`

┌──────────────────────────────┐
│ Block Dates             ✕    │
├──────────────────────────────┤
│                              │
│ Property *                   │
│ ┌────────────────────────┐   │
│ │ Area 43 – House A  ▼   │   │
│ └────────────────────────┘   │
│                              │
│ Start Date *                 │
│ ┌────────────────────────┐   │
│ │ 20 Jan 2026        📅  │   │
│ └────────────────────────┘   │
│                              │
│ End Date *                   │
│ ┌────────────────────────┐   │
│ │ 22 Jan 2026        📅  │   │
│ └────────────────────────┘   │
│                              │
│ Reason                       │
│ ┌────────────────────────┐   │
│ │ Maintenance – plumbing │   │
│ │ repairs                │   │
│ └────────────────────────┘   │
│                              │
│ [ Cancel ]    [ Block Dates ]│
│                              │
└──────────────────────────────┘

`### Database Schema Addition

**New Table: `blocked_dates`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✅ | Primary key |
| property_id | UUID | ✅ | FK → properties |
| start_date | Date | ✅ | Block start |
| end_date | Date | ✅ | Block end |
| reason | String(255) | | Why blocked |
| created_by | UUID | ✅ | FK → users |
| created_at | Timestamp | ✅ | |
```sql`

CREATE TABLE blocked_dates (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
start_date DATE NOT NULL,
end_date DATE NOT NULL,
reason VARCHAR(255),
created_by UUID NOT NULL REFERENCES users(id),
created_at TIMESTAMP NOT NULL DEFAULT NOW(),

CONSTRAINT blocked_dates_valid_range CHECK (end_date >= start_date)
);

CREATE INDEX blocked_dates_property_idx ON blocked_dates (property_id, start_date, end_date);

`### Export Options`

[ Export Calendar ]

┌──────────────────────────────┐
│ Export Options          ✕    │
├──────────────────────────────┤
│                              │
│ Format:                      │
│ ○ PDF (visual calendar)      │
│ ● CSV (data export)          │
│ ○ iCal (import to calendar)  │
│                              │
│ Date Range:                  │
│ ┌────────────────────────┐   │
│ │ January 2026       ▼   │   │
│ └────────────────────────┘   │
│                              │
│ [ Download ]                 │
│                              │
└──────────────────────────────┘

`### iCal Integration (Future)

Generate iCal feed for each property:`

https://app.nyumbaops.com/calendar/ical/property-uuid.ics

`Can be subscribed to in:
- Google Calendar
- Apple Calendar
- Outlook
---`

---

## **I41. Revenue Forecast**

**Add to: Admin Dashboard UI/UX Design page (new section after Occupancy Calendar)**

- `--
## 📈 Revenue Forecast
### Overview
Project future revenue based on confirmed bookings, pending inquiries, and historical trends.
### Access
**Location:** Dashboard → Reports → Revenue Forecast
**Alternative:** Dashboard summary card → "View Forecast"
### Forecast Dashboard`

┌──────────────────────────────┐
│ ← Reports     Revenue Forecast│
└──────────────────────────────┘

─────────────────────────────────
📈 Revenue Forecast
─────────────────────────────────

Showing: Next 3 Months
Jan – Mar 2026

─────────────────────────────────
💰 Forecast Summary
─────────────────────────────────

┌──────────────────────────────┐
│ Confirmed Revenue            │
│ ═══════════════════════════  │
│                              │
│ MWK 4,250,000                │
│ From 12 confirmed bookings   │
│                              │
│ High confidence              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Pending Revenue              │
│ ═══════════════════════      │
│                              │
│ MWK 850,000                  │
│ From 3 pending bookings      │
│                              │
│ Medium confidence (60%)      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Projected Additional         │
│ ═══════════════              │
│                              │
│ MWK 1,200,000                │
│ Based on historical trends   │
│                              │
│ Low confidence (estimate)    │
└──────────────────────────────┘

─────────────────────────────────

Total Forecast: MWK 6,300,000
(£720 GBP separate)

─────────────────────────────────

`### Monthly Breakdown`

─────────────────────────────────
📅 Monthly Breakdown
─────────────────────────────────

January 2026
────────────────────────────────
Confirmed:   MWK 1,850,000  ████████████████████
Pending:     MWK 350,000    ████
Projected:   MWK 200,000    ██
───────────────
Total:       MWK 2,400,000

Bookings: 5 confirmed, 1 pending
Occupancy: 68% (confirmed only)

────────────────────────────────

February 2026
────────────────────────────────
Confirmed:   MWK 1,400,000  ████████████████
Pending:     MWK 500,000    ██████
Projected:   MWK 500,000    ██████
───────────────
Total:       MWK 2,400,000

Bookings: 4 confirmed, 2 pending
Occupancy: 52% (confirmed only)

────────────────────────────────

March 2026
────────────────────────────────
Confirmed:   MWK 1,000,000  ████████████
Pending:     MWK 0

Projected:   MWK 500,000    ██████
───────────────
Total:       MWK 1,500,000

Bookings: 3 confirmed, 0 pending
Occupancy: 38% (confirmed only)

─────────────────────────────────

`### Visual Chart (Desktop)`

Revenue Forecast – Next 3 Months
─────────────────────────────────────────────────────

MWK 2.5M │

│    ██

MWK 2.0M │    ██  ▓▓

│    ██  ██  ▓▓

MWK 1.5M │    ██  ██  ██  ░░

│    ██  ██  ██  ██

MWK 1.0M │    ██  ██  ██  ██

│    ██  ██  ██  ██

MWK 0.5M │    ██  ██  ██  ██

│    ██  ██  ██  ██

0  └────────────────────
Jan  Feb  Mar

Legend: █ Confirmed  ▓ Pending  ░ Projected

`### By Property Breakdown`

─────────────────────────────────
🏠 By Property (Next 3 Months)
─────────────────────────────────

Area 43 – House A
────────────────────────────────
Confirmed:   MWK 2,100,000
Pending:     MWK 450,000
Projected:   MWK 400,000
───────────────
Total:       MWK 2,950,000

Upcoming Bookings:

- 15-18 Jan – John Banda (Confirmed)
- 22-25 Jan – Pending inquiry
- 5-10 Feb – Mary Phiri (Confirmed)
- 20-23 Feb – James K. (Confirmed)

────────────────────────────────

Area 10 – Studio
────────────────────────────────
Confirmed:   MWK 1,350,000
Pending:     MWK 200,000
Projected:   MWK 400,000
───────────────
Total:       MWK 1,950,000

────────────────────────────────

Area 43 – Cottage
────────────────────────────────
Confirmed:   MWK 800,000
Pending:     MWK 200,000
Projected:   MWK 400,000
───────────────
Total:       MWK 1,400,000

─────────────────────────────────

`### Forecast Calculation Logic
```typescript`

interface ForecastData {
confirmed: number;      // From confirmed bookings
pending: number;        // From pending bookings (weighted)
projected: number;      // Historical estimate
total: number;
confidence: 'high' | 'medium' | 'low';
}

async function calculateRevenueForecast(
userId: string,
startDate: Date,
endDate: Date
): Promise<ForecastData> {

// 1. Confirmed Revenue (100% confidence)
const confirmedBookings = await prisma.booking.findMany({
where: {
property: { ownerId: userId },
status: 'CONFIRMED',
checkIn: { gte: startDate, lte: endDate }
}
});
const confirmedRevenue = confirmedBookings.reduce(
(sum, b) => sum + b.totalAmount, 0
);

// 2. Pending Revenue (60% weighted)
const pendingBookings = await prisma.booking.findMany({
where: {
property: { ownerId: userId },
status: 'PENDING',
checkIn: { gte: startDate, lte: endDate }
}
});
const pendingRevenue = pendingBookings.reduce(
(sum, b) => sum + b.totalAmount, 0
);
const weightedPending = Math.round(pendingRevenue * 0.6);

// 3. Projected Revenue (historical average for unbooked nights)
const totalNights = differenceInDays(endDate, startDate);
const bookedNights = confirmedBookings.reduce(
(sum, b) => sum + b.nights, 0
) + pendingBookings.reduce(
(sum, b) => sum + b.nights, 0
);
const availableNights = totalNights - bookedNights;

// Get historical occupancy rate and average nightly rate
const historicalStats = await getHistoricalStats(userId, 90); // Last 90 days
const expectedOccupancy = historicalStats.occupancyRate * 0.7; // Conservative
const avgNightlyRate = historicalStats.avgNightlyRate;

const projectedNights = Math.round(availableNights * expectedOccupancy);
const projectedRevenue = projectedNights * avgNightlyRate;

return {
confirmed: confirmedRevenue,
pending: weightedPending,
projected: projectedRevenue,
total: confirmedRevenue + weightedPending + projectedRevenue,
confidence: confirmedRevenue > projectedRevenue ? 'high' : 'medium'
};
}

`### Confidence Levels

| Level | Meaning | Visual |
|-------|---------|--------|
| High | >70% from confirmed bookings | Green indicator |
| Medium | 40-70% from confirmed | Yellow indicator |
| Low | <40% from confirmed (mostly projected) | Gray indicator |

### Comparison with Actuals`

─────────────────────────────────
📊 Forecast vs Actual
─────────────────────────────────

December 2025 (Completed)
────────────────────────────────
Forecasted:  MWK 2,200,000
Actual:      MWK 2,450,000
Difference:  +MWK 250,000 (+11%)

✅ Forecast was 89% accurate

────────────────────────────────

November 2025 (Completed)
────────────────────────────────
Forecasted:  MWK 1,800,000
Actual:      MWK 1,750,000
Difference:  -MWK 50,000 (-3%)

✅ Forecast was 97% accurate

─────────────────────────────────

Average Forecast Accuracy: 93%

─────────────────────────────────

`### API Endpoint`

GET /api/v1/analytics/forecast?months=3

Response:
{
"success": true,
"data": {
"period": {
"start": "2026-01-01",
"end": "2026-03-31"
},
"summary": {
"confirmed": 425000000,
"pending": 85000000,
"projected": 120000000,
"total": 630000000,
"confidence": "medium"
},
"by_month": [
{
"month": "2026-01",
"confirmed": 185000000,
"pending": 35000000,
"projected": 20000000,
"total": 240000000,
"bookings_confirmed": 5,
"bookings_pending": 1,
"occupancy_confirmed": 68
},
// ...
],
"by_property": [
{
"property_id": "uuid",
"property_name": "Area 43 – House A",
"confirmed": 210000000,
"pending": 45000000,
"projected": 40000000,
"total": 295000000
},
// ...
],
"upcoming_bookings": [
{
"id": "uuid",
"property_name": "Area 43 – House A",
"guest_name": "John Banda",
"check_in": "2026-01-15",
"check_out": "2026-01-18",
"amount": 13500000,
"status": "CONFIRMED"
},
// ...
]
}
}

`### Export Options

- **PDF Report:** Formatted forecast document
- **CSV:** Raw data for spreadsheet analysis
---`

---

## **I42. Expense Trend Alerts**

**Add to: Admin Dashboard UI/UX Design page (new section after Revenue Forecast)**

- `--
## ⚠️ Expense Trend Alerts
### Overview
Automatically detect unusual expense patterns and alert the owner to potential issues.
### Alert Types
| Alert Type | Trigger | Severity |
|------------|---------|----------|
| Spike Alert | Single expense >150% of category average | ⚠️ Warning |
| Trend Alert | Category up >30% month-over-month | ⚠️ Warning |
| Budget Alert | Category exceeds monthly budget | 🔴 High |
| Unusual Category | First expense in dormant category | ℹ️ Info |
| Property Loss | Property expenses exceed income | 🔴 High |
### Dashboard Alert Banner`

┌──────────────────────────────┐
│ ☰  Dashboard            🔔 3 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ⚠️ Expense Alerts (2)        │
├──────────────────────────────┤
│                              │
│ 🔴 Area 43 Cottage           │
│ Expenses exceed income by    │
│ MWK 40,000 this month        │
│ [View Details]               │
│                              │
│ ⚠️ Utilities                 │
│ Up 45% vs last month         │
│ MWK 180,000 → MWK 261,000    │
│ [View Breakdown]             │
│                              │
│ [Dismiss All]                │
└──────────────────────────────┘

`### Alert Detail Views

**Spike Alert:**`

┌──────────────────────────────┐
│ ⚠️ Unusual Expense      ✕    │
├──────────────────────────────┤
│                              │
│ Category: Repairs            │
│ Property: Area 43 – House A  │
│                              │
│ This Expense:                │
│ MWK 250,000 (Roof repair)    │
│                              │
│ Category Average:            │
│ MWK 45,000 / expense         │
│                              │
│ This expense is 5.5x higher  │
│ than your typical repair     │
│ expense.                     │
│                              │
│ ─────────────────────────────│
│                              │
│ This might be expected for   │
│ major repairs. Mark as:      │
│                              │
│ [Expected] [Review Later]    │
│                              │
└──────────────────────────────┘

`**Trend Alert:**`

┌──────────────────────────────┐
│ ⚠️ Expense Trend        ✕    │
├──────────────────────────────┤
│                              │
│ Category: Utilities          │
│                              │
│ 3-Month Trend:               │
│ ─────────────────────────────│
│ Nov 2025:  MWK 120,000       │
│ Dec 2025:  MWK 180,000  ↑50% │
│ Jan 2026:  MWK 261,000  ↑45% │
│ ─────────────────────────────│
│                              │
│ Total increase: 118%         │
│ over 3 months                │
│                              │
│ Breakdown by Property:       │
│ • Area 43 House: +MWK 80,000 │
│ • Area 10 Studio: +MWK 31,000│
│ • Area 43 Cottage: +MWK 30,000│
│                              │
│ ─────────────────────────────│
│                              │
│ Possible causes:             │
│ • Seasonal (summer AC usage) │
│ • Rate increase from ESCOM   │
│ • Meter issue                │
│                              │
│ [View Transactions]          │
│ [Set Budget Alert]           │
│ [Dismiss]                    │
│                              │
└──────────────────────────────┘

`**Property Loss Alert:**`

┌──────────────────────────────┐
│ 🔴 Property Running at Loss  │
├──────────────────────────────┤
│                              │
│ 🏠 Area 43 – Cottage         │
│                              │
│ January 2026:                │
│ ─────────────────────────────│
│ Income:    MWK 100,000       │
│ Expenses:  MWK 140,000       │
│ ─────────────────────────────│
│ Loss:      MWK -40,000       │
│                              │
│ Top Expenses:                │
│ • Utilities: MWK 65,000      │
│ • Repairs: MWK 45,000        │
│ • Cleaning: MWK 30,000       │
│                              │
│ ─────────────────────────────│
│                              │
│ Suggestions:                 │
│ • Review utility usage       │
│ • Consider rate increase     │
│ • Check for booking gaps     │
│                              │
│ [View Property Report]       │
│ [Compare Properties]         │
│                              │
└──────────────────────────────┘

`### Alert Detection Logic
```typescript`

interface ExpenseAlert {
id: string;
type: 'spike' | 'trend' | 'budget' | 'unusual' | 'property_loss';
severity: 'info' | 'warning' | 'high';
title: string;
message: string;
category?: string;
property?: string;
data: Record<string, any>;
createdAt: Date;
dismissedAt?: Date;
}

async function detectExpenseAlerts(userId: string): Promise<ExpenseAlert[]> {
const alerts: ExpenseAlert[] = [];
const now = new Date();
const thisMonth = startOfMonth(now);
const lastMonth = subMonths(thisMonth, 1);

// 1. Check for property losses
const properties = await prisma.property.findMany({
where: { ownerId: userId }
});

for (const property of properties) {
const thisMonthData = await getPropertyFinancials(property.id, thisMonth, now);

`if (thisMonthData.expenses > thisMonthData.income && thisMonthData.income > 0) {
  alerts.push({
    id: `loss-${property.id}-${thisMonth.toISOString()}`,
    type: 'property_loss',
    severity: 'high',
    title: 'Property Running at Loss',
    message: `${property.name} expenses exceed income by ${formatCurrency(thisMonthData.expenses - thisMonthData.income)}`,
    property: property.name,
    data: {
      income: thisMonthData.income,
      expenses: thisMonthData.expenses,
      loss: thisMonthData.expenses - thisMonthData.income
    },
    createdAt: now
  });
}`

}

// 2. Check for category trends
const categories = await prisma.category.findMany({
where: { type: 'EXPENSE' }
});

for (const category of categories) {
const thisMonthTotal = await getCategoryTotal(userId, category.id, thisMonth, now);
const lastMonthTotal = await getCategoryTotal(userId, category.id, lastMonth, thisMonth);

`if (lastMonthTotal > 0 && thisMonthTotal > lastMonthTotal * 1.3) {
  const percentIncrease = Math.round((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100);`

  `alerts.push({
    id: `trend-${category.id}-${thisMonth.toISOString()}`,
    type: 'trend',
    severity: 'warning',
    title: `${category.name} Expenses Up`,
    message: `${category.name} is up ${percentIncrease}% vs last month`,
    category: category.name,
    data: {
      thisMonth: thisMonthTotal,
      lastMonth: lastMonthTotal,
      percentIncrease
    },
    createdAt: now
  });
}`

}

// 3. Check for expense spikes
const recentTransactions = await prisma.transaction.findMany({
where: {
property: { ownerId: userId },
type: 'EXPENSE',
createdAt: { gte: subDays(now, 7) }
},
include: { category: true, property: true }
});

for (const tx of recentTransactions) {
const categoryAvg = await getCategoryAverage(userId, tx.categoryId, 90);

`if (categoryAvg > 0 && tx.amount > categoryAvg * 1.5) {
  const multiplier = (tx.amount / categoryAvg).toFixed(1);`

  `alerts.push({
    id: `spike-${tx.id}`,
    type: 'spike',
    severity: 'warning',
    title: 'Unusual Expense',
    message: `${formatCurrency(tx.amount)} ${tx.category.name} is ${multiplier}x your average`,
    category: tx.category.name,
    property: tx.property?.name,
    data: {
      amount: tx.amount,
      average: categoryAvg,
      multiplier: parseFloat(multiplier),
      transactionId: tx.id
    },
    createdAt: tx.createdAt
  });
}`

}

return alerts;
}

`### Database Schema

**New Table: `expense_alerts`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✅ | Primary key |
| user_id | UUID | ✅ | FK → users |
| type | String(50) | ✅ | Alert type |
| severity | String(20) | ✅ | info, warning, high |
| title | String(255) | ✅ | Alert title |
| message | Text | ✅ | Alert details |
| category_id | UUID | | FK → categories |
| property_id | UUID | | FK → properties |
| data | JSONB | | Additional data |
| created_at | Timestamp | ✅ | When detected |
| dismissed_at | Timestamp | | When dismissed |
| dismissed_by | UUID | | FK → users |
```sql`

CREATE TABLE expense_alerts (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
type VARCHAR(50) NOT NULL,
severity VARCHAR(20) NOT NULL,
title VARCHAR(255) NOT NULL,
message TEXT NOT NULL,
category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
data JSONB DEFAULT '{}',
created_at TIMESTAMP NOT NULL DEFAULT NOW(),
dismissed_at TIMESTAMP,
dismissed_by UUID REFERENCES users(id)
);

CREATE INDEX expense_alerts_user_idx ON expense_alerts (user_id) WHERE dismissed_at IS NULL;
CREATE INDEX expense_alerts_created_idx ON expense_alerts (created_at);

`### Notification Integration

**Telegram Alert:**`

⚠️ Expense Alert

🏠 Area 43 – Cottage is running
at a loss this month.

Income:   MWK 100,000
Expenses: MWK 140,000
Loss:     MWK -40,000

[View in Dashboard]

`**Daily Digest (if multiple alerts):**`

📊 Daily Expense Summary

You have 3 expense alerts:

🔴 1 property running at loss
⚠️ 1 category trend warning
⚠️ 1 unusual expense

[View All Alerts]

`### API Endpoints`

GET    /api/v1/alerts/expenses              -- Get active alerts
PATCH  /api/v1/alerts/expenses/:id/dismiss  -- Dismiss alert
POST   /api/v1/alerts/expenses/dismiss-all  -- Dismiss all
GET    /api/v1/alerts/expenses/history      -- Past alerts

`### Settings: Alert Preferences`

┌──────────────────────────────┐
│ ← Settings      Alert Preferences│
└──────────────────────────────┘

─────────────────────────────────
⚠️ Expense Alerts
─────────────────────────────────

☑️ Property loss alerts
Alert when property expenses
exceed income

☑️ Category trend alerts
Alert when category up >30%

☑️ Expense spike alerts
Alert for unusually large
expenses

☐ Budget alerts
Alert when category exceeds
monthly budget (set budgets
first)

─────────────────────────────────
📱 Notification Method
─────────────────────────────────

☑️ Show in dashboard
☑️ Send via Telegram
☐ Send via Email

─────────────────────────────────

[ Save Preferences ]

─────────────────────────────────

- `--`

- `--
## 📊 Comparative Period Reports
### Overview
Compare business performance across different time periods (month-over-month, quarter-over-quarter, year-over-year).
### Access
**Location:** Dashboard → Reports → Compare Periods
**Quick Access:** Dashboard cards → "Compare" link
### Report Configuration`

┌──────────────────────────────┐
│ ← Reports     Compare Periods │
└──────────────────────────────┘

─────────────────────────────────
📊 Configure Comparison
─────────────────────────────────

Compare:
┌────────────────────────────┐
│ ○ Month over Month         │
│ ● Quarter over Quarter     │
│ ○ Year over Year           │
│ ○ Custom Periods           │
└────────────────────────────┘

Period 1:
┌────────────────────────────┐
│ Q4 2025 (Oct-Dec)      ▼   │
└────────────────────────────┘

Period 2:
┌────────────────────────────┐
│ Q3 2025 (Jul-Sep)      ▼   │
└────────────────────────────┘

[ Generate Report ]

─────────────────────────────────

`### Quarter-over-Quarter Report`

─────────────────────────────────
📊 Quarterly Comparison
Q4 2025 vs Q3 2025
─────────────────────────────────

┌──────────────────────────────────────────────────────┐
│ Summary                                              │
├────────────────────┬───────────────┬─────────────────┤
│ Metric             │ Q4 2025       │ Q3 2025   Change│
├────────────────────┼───────────────┼─────────────────┤
│ 💰 Income (MWK)    │ 7,250,000     │ 5,800,000  ↑25% │
│ 💰 Income (GBP)    │ £960          │ £720       ↑33% │
│ ❌ Expenses (MWK)  │ 2,890,000     │ 2,450,000  ↑18% │
│ 📈 Profit (MWK)    │ 4,360,000     │ 3,350,000  ↑30% │
│ 📈 Profit (GBP)    │ £960          │ £720       ↑33% │
│ 📊 Profit Margin   │ 60%           │ 58%        ↑2pp │
│ 📅 Occupancy       │ 72%           │ 58%        ↑14pp│
│ 🏠 Bookings        │ 28            │ 21         ↑33% │
│ 💵 Avg Night Rate  │ MWK 38,500    │ MWK 36,200 ↑6%  │
└────────────────────┴───────────────┴─────────────────┘

pp = percentage points

─────────────────────────────────

`### Visual Comparison Charts`

─────────────────────────────────
💰 Income Comparison
─────────────────────────────────

     `Q3 2025          Q4 2025
     ────────         ────────`

MWK 8M │

│                  ████
MWK 6M │              ████████
│    ████      ████████
MWK 4M │    ████      ████████
│    ████      ████████
MWK 2M │    ████      ████████
│    ████      ████████
0 └──────────────────────────

   `Q3: MWK 5.8M    Q4: MWK 7.25M
                   ↑ 25%`

─────────────────────────────────
📈 Profit Trend (Rolling Quarters)
─────────────────────────────────

MWK 5M │                    ●
│                 ●
MWK 4M │              ●
│           ●
MWK 3M │        ●
│     ●
MWK 2M │  ●
└──────────────────────────
Q2   Q3   Q4   Q1   Q2
2025 2025 2025 2026 2026
(proj)

─────────────────────────────────

`### By Property Comparison`

─────────────────────────────────
🏠 By Property
─────────────────────────────────

Area 43 – House A
────────────────────────────────
Q4 2025    Q3 2025    Change
Income:     MWK 3.2M   MWK 2.4M   ↑33%
Expenses:   MWK 1.1M   MWK 950K   ↑16%
Profit:     MWK 2.1M   MWK 1.45M  ↑45%
Occupancy:  82%        65%        ↑17pp

🏆 Best Performer

────────────────────────────────

Area 10 – Studio
────────────────────────────────
Q4 2025    Q3 2025    Change
Income:     MWK 2.4M   MWK 2.1M   ↑14%
Expenses:   MWK 980K   MWK 850K   ↑15%
Profit:     MWK 1.42M  MWK 1.25M  ↑14%
Occupancy:  68%        58%        ↑10pp

✓ Consistent Performance

────────────────────────────────

Area 43 – Cottage
────────────────────────────────
Q4 2025    Q3 2025    Change
Income:     MWK 1.65M  MWK 1.3M   ↑27%
Expenses:   MWK 810K   MWK 650K   ↑25%
Profit:     MWK 840K   MWK 650K   ↑29%
Occupancy:  55%        42%        ↑13pp

↑ Most Improved

─────────────────────────────────

`### By Category Comparison`

─────────────────────────────────
📁 Expense Categories
─────────────────────────────────

        `Q4 2025    Q3 2025    Change`

────────────────────────────────
Utilities   MWK 890K   MWK 720K   ↑24%  ⚠️
Repairs     MWK 650K   MWK 580K   ↑12%
Cleaning    MWK 480K   MWK 450K   ↑7%
Supplies    MWK 320K   MWK 280K   ↑14%
Other       MWK 550K   MWK 420K   ↑31%  ⚠️
────────────────────────────────
Total       MWK 2.89M  MWK 2.45M  ↑18%

⚠️ Categories with >20% increase

─────────────────────────────────
💰 Income Categories
─────────────────────────────────

        `Q4 2025    Q3 2025    Change`

────────────────────────────────
Bookings    MWK 6.5M   MWK 5.2M   ↑25%
Airbnb      £960       £720       ↑33%
Late C/O    MWK 150K   MWK 80K    ↑88%  ✓
Extra Guest MWK 200K   MWK 120K   ↑67%  ✓
Other       MWK 400K   MWK 400K   →0%
────────────────────────────────

✓ Growing income streams

─────────────────────────────────

`### Key Insights Section`

─────────────────────────────────
💡 Key Insights
─────────────────────────────────

📈 What's Working
─────────────────────────────────

- Overall profit up 30% quarter-over-quarter
- Occupancy improved across all properties
- Area 43 House A performing exceptionally well
- Late checkout fees contributing more (+88%)

⚠️ Areas to Watch
─────────────────────────────────

- Utility costs up 24% – review ESCOM bills
- "Other" expenses up 31% – categorize better
- Area 43 Cottage still lowest occupancy (55%)

🎯 Recommendations
─────────────────────────────────

- Consider rate increase for Area 43 House A
(high demand, 82% occupancy)
- Investigate utility cost increase
- Focus marketing on Area 43 Cottage for Q1

─────────────────────────────────

`### Year-over-Year Report`

─────────────────────────────────
📊 Year-over-Year Comparison
2025 vs 2024
─────────────────────────────────

Annual Summary
────────────────────────────────
2025         2024       Change
Income:     MWK 24.5M    MWK 18.2M  ↑35%
£3,200       £1,800     ↑78%
Expenses:   MWK 9.8M     MWK 8.1M   ↑21%
Profit:     MWK 14.7M    MWK 10.1M  ↑46%
£3,200       £1,800     ↑78%

Bookings:   98           72         ↑36%
Occupancy:  64%          52%        ↑12pp
Avg Stay:   4.2 nights   3.8 nights ↑11%

────────────────────────────────

Monthly Trend Comparison
────────────────────────────────

  `2024    2025    Change`

Jan   MWK 1.2M  MWK 1.8M  ↑50%
Feb   MWK 1.1M  MWK 1.6M  ↑45%
Mar   MWK 1.3M  MWK 1.9M  ↑46%
Apr   MWK 1.4M  MWK 2.0M  ↑43%
May   MWK 1.5M  MWK 1.8M  ↑20%
Jun   MWK 1.4M  MWK 1.9M  ↑36%
Jul   MWK 1.6M  MWK 2.1M  ↑31%
Aug   MWK 1.5M  MWK 2.0M  ↑33%
Sep   MWK 1.7M  MWK 2.2M  ↑29%
Oct   MWK 1.8M  MWK 2.4M  ↑33%
Nov   MWK 1.9M  MWK 2.5M  ↑32%
Dec   MWK 1.8M  MWK 2.3M  ↑28%

Best Month: October (both years)
Worst Month: February (both years)

─────────────────────────────────

`### Custom Period Comparison`

┌──────────────────────────────┐
│ Custom Period Comparison     │
├──────────────────────────────┤
│                              │
│ Period 1:                    │
│ ┌──────────┐  ┌──────────┐   │
│ │ 1 Dec 25 │→ │ 31 Dec 25│   │
│ └──────────┘  └──────────┘   │
│                              │
│ Period 2:                    │
│ ┌──────────┐  ┌──────────┐   │
│ │ 1 Dec 24 │→ │ 31 Dec 24│   │
│ └──────────┘  └──────────┘   │
│                              │
│ Compare: December 2025 vs    │
│ December 2024 (seasonal)     │
│                              │
│ [ Generate Report ]          │
│                              │
└──────────────────────────────┘

`### API Endpoint`

GET /api/v1/analytics/compare?
type=quarter&
period1=2025-Q4&
period2=2025-Q3

Response:
{
"success": true,
"data": {
"period1": {
"label": "Q4 2025",
"start": "2025-10-01",
"end": "2025-12-31"
},
"period2": {
"label": "Q3 2025",
"start": "2025-07-01",
"end": "2025-09-30"
},
"summary": {
"period1": {
"income_mwk": 725000000,
"income_gbp": 96000,
"expenses_mwk": 289000000,
"profit_mwk": 436000000,
"profit_gbp": 96000,
"margin_percent": 60,
"occupancy_percent": 72,
"bookings": 28,
"avg_night_rate": 3850000
},
"period2": {
"income_mwk": 580000000,
// ...
},
"changes": {
"income_mwk_percent": 25,
"income_mwk_direction": "up",
"expenses_mwk_percent": 18,
"expenses_mwk_direction": "up",
"profit_mwk_percent": 30,
"profit_mwk_direction": "up",
// ...
}
},
"by_property": [...],
"by_category": {
"expenses": [...],
"income": [...]
},
"insights": [
{
"type": "positive",
"message": "Overall profit up 30% quarter-over-quarter"
},
{
"type": "warning",
"message": "Utility costs up 24% – review ESCOM bills"
}
]
}
}

`### Export Options`

[ Export Report ]

┌──────────────────────────────┐
│ Export Options          ✕    │
├──────────────────────────────┤
│                              │
│ Format:                      │
│ ○ PDF (formatted report)     │
│ ● Excel (with charts)        │
│ ○ CSV (raw data)             │
│                              │
│ Include:                     │
│ ☑️ Summary metrics           │
│ ☑️ Property breakdown        │
│ ☑️ Category breakdown        │
│ ☑️ Charts and graphs         │
│ ☑️ Insights and commentary   │
│                              │
│ [ Download ]                 │
│                              │
└──────────────────────────────┘

`### Scheduled Reports`

┌──────────────────────────────┐
│ Schedule Regular Reports     │
├──────────────────────────────┤
│                              │
│ ☑️ Monthly Comparison        │
│    Send on 1st of each month │
│    Compare to previous month │
│                              │
│ ☑️ Quarterly Comparison      │
│    Send on 1st of quarter    │
│    Compare to previous quarter│
│                              │
│ ☐ Annual Comparison          │
│    Send on January 1st       │
│    Compare to previous year  │
│                              │
│ Delivery:                    │
│ ☑️ Email (PDF attached)      │
│ ☑️ Telegram (summary only)   │
│                              │
│ [ Save Schedule ]            │
│                              │
└──────────────────────────────┘

- `--`

---

## **Summary: Section I Reports & Analytics**

| # | Feature | Purpose | Complexity |
| --- | --- | --- | --- |
| I40 | Occupancy Calendar | Visual availability view | Medium |
| I41 | Revenue Forecast | Project future income | Medium |
| I42 | Expense Trend Alerts | Detect unusual patterns | Medium |
| I43 | Comparative Reports | Period-over-period analysis | Medium |

### New Database Tables Required

sql

- `- I40: Blocked Dates (for calendar)CREATE TABLE blocked_dates ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE, start_date DATE NOT NULL, end_date DATE NOT NULL, reason VARCHAR(255), created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMP NOT NULL DEFAULT NOW(), CONSTRAINT blocked_dates_valid_range CHECK (end_date >= start_date));CREATE INDEX blocked_dates_property_idx ON blocked_dates (property_id, start_date, end_date);- I42: Expense AlertsCREATE TABLE expense_alerts ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, type VARCHAR(50) NOT NULL, severity VARCHAR(20) NOT NULL, title VARCHAR(255) NOT NULL, message TEXT NOT NULL, category_id UUID REFERENCES categories(id) ON DELETE SET NULL, property_id UUID REFERENCES properties(id) ON DELETE SET NULL, data JSONB DEFAULT '{}', created_at TIMESTAMP NOT NULL DEFAULT NOW(), dismissed_at TIMESTAMP, dismissed_by UUID REFERENCES users(id));CREATE INDEX expense_alerts_user_idx ON expense_alerts (user_id) WHERE dismissed_at IS NULL;CREATE INDEX expense_alerts_created_idx ON expense_alerts (created_at);```### New API Endpoints Required
```# I40 - Occupancy CalendarGET /api/v1/analytics/calendar?month=202601&properties=uuid1,uuid2
POST /api/v1/properties/:id/blockeddates
DELETE /api/v1/blockeddates/:id
GET /api/v1/properties/:id/calendar.ics (future: iCal export)# I41 - Revenue ForecastGET /api/v1/analytics/forecast?months=3# I42 - Expense AlertsGET /api/v1/alerts/expenses
PATCH /api/v1/alerts/expenses/:id/dismiss
POST /api/v1/alerts/expenses/dismissallGET /api/v1/alerts/expenses/history
# I43 - Comparative ReportsGET /api/v1/analytics/compare?type=quarter&period1=2025Q4&period2=2025Q3
GET /api/v1/analytics/compare?type=year&period1=2025&period2=2024GET /api/v1/analytics/compare?type=custom&start1=20251201&end1=20251231&start2=20241201&end2=20241231`

### Scheduled Jobs Required

| Job | Schedule | Purpose |
| --- | --- | --- |
| Expense Alert Detection | Daily at 6:00 AM | Scan for new alerts |
| Monthly Report | 1st of month, 8:00 AM | Send comparison to previous month |
| Quarterly Report | 1st of quarter, 8:00 AM | Send quarterly comparison |
| Forecast Accuracy Check | 1st of month | Compare forecast vs actuals |

### Implementation Priority

1. **I40 (Occupancy Calendar)** - High value, visual overview
2. **I43 (Comparative Reports)** - Key for business decisions
3. **I42 (Expense Alerts)** - Proactive monitoring
4. **I41 (Revenue Forecast)** - Nice-to-have for planning

### Complete Migration Script (Section I)

sql

- `- I40: Blocked Dates for CalendarCREATE TABLE blocked_dates ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE, start_date DATE NOT NULL, end_date DATE NOT NULL, reason VARCHAR(255), created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMP NOT NULL DEFAULT NOW(), CONSTRAINT blocked_dates_valid_range CHECK (end_date >= start_date));CREATE INDEX blocked_dates_property_idx ON blocked_dates (property_id, start_date, end_date);- I42: Expense AlertsCREATE TABLE expense_alerts ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, type VARCHAR(50) NOT NULL, severity VARCHAR(20) NOT NULL, title VARCHAR(255) NOT NULL, message TEXT NOT NULL, category_id UUID REFERENCES categories(id) ON DELETE SET NULL, property_id UUID REFERENCES properties(id) ON DELETE SET NULL, data JSONB DEFAULT '{}', created_at TIMESTAMP NOT NULL DEFAULT NOW(), dismissed_at TIMESTAMP, dismissed_by UUID REFERENCES users(id));CREATE INDEX expense_alerts_user_idx ON expense_alerts (user_id) WHERE dismissed_at IS NULL;CREATE INDEX expense_alerts_created_idx ON expense_alerts (created_at);`

## 1️⃣2️⃣ Audit Log Page (Owner Only)

**Purpose:** See who did what, when

`┌──────────────────────────────┐
│ ← Settings         Audit Log │
└──────────────────────────────┘

─────────────────────────────────
Filters
─────────────────────────────────
[ All Actions ▼ ]  [ All Users ▼ ]
[ Last 7 Days ▼ ]  [ All Properties ▼ ]

─────────────────────────────────

Today
─────────────────────────────────

┌──────────────────────────────┐
│ 💰 Income added              │
│ MWK 150,000 – Area 43        │
│ Local Booking                │
│ ─────────────────────────────│
│ 👤 Staff (John)              │
│ 📅 Today, 10:32 AM           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 📅 Booking created           │
│ Area 43 – John Banda         │
│ 12-15 Jan                    │
│ ─────────────────────────────│
│ 👤 Owner (You)               │
│ 📅 Today, 9:15 AM            │
└──────────────────────────────┘

Yesterday
─────────────────────────────────

┌──────────────────────────────┐
│ ❌ Expense added              │
│ MWK 45,000 – Area 10         │
│ Utilities                    │
│ ─────────────────────────────│
│ 👤 Staff (John)              │
│ 📅 Yesterday, 4:20 PM        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 📬 Inquiry converted         │
│ INQ-0047 → Booking           │
│ Area 43 – John Banda         │
│ ─────────────────────────────│
│ 👤 Owner (You)               │
│ 📅 Yesterday, 2:00 PM        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 🔐 User logged in            │
│ From: 102.22.xxx.xxx         │
│ Device: Chrome / Android     │
│ ─────────────────────────────│
│ 👤 Staff (John)              │
│ 📅 Yesterday, 8:45 AM        │
└──────────────────────────────┘

[ Load More ]

─────────────────────────────────`

### Logged Actions

| Action | Icon |
| --- | --- |
| Income added | 💰 |
| Expense added | ❌ |
| Booking created | 📅 |
| Booking cancelled | 🚫 |
| Booking status changed | 📅 |
| Payment received | 💳 |
| Inquiry converted | 📬 |
| Property created | 🏠 |
| Property updated | ✏️ |
| User logged in | 🔐 |
| User logged out | 🚪 |
| Failed login attempt | ⚠️ |

---

## 1️⃣3️⃣ Settings Page (Owner Only)

**Purpose:** Configure system options

`┌──────────────────────────────┐
│ ← More             Settings  │
└──────────────────────────────┘

─────────────────────────────────
Account
─────────────────────────────────

Email
owner@example.com
[ Change Email ]

Password
- •••••••
[ Change Password ]

─────────────────────────────────
Telegram Bot
─────────────────────────────────

Status: ✅ Connected
@NyumbaOpsBot

[ Disconnect ]  [ Test Notification ]

─────────────────────────────────
Team Members
─────────────────────────────────

┌──────────────────────────────┐
│ 👤 You (Owner)               │
│ owner@example.com            │
│ Telegram: Connected ✅       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 👤 John Kamanga (Staff)      │
│ john@example.com             │
│ Telegram: Connected ✅       │
│ [ Edit ]  [ Remove ]         │
└──────────────────────────────┘

[ + Add Team Member ]

─────────────────────────────────
Expense Categories
─────────────────────────────────

- Utilities                  [ Edit ]
- Repairs & Maintenance      [ Edit ]
- Cleaning                   [ Edit ]
- Fuel & Transport           [ Edit ]
- Supplies                   [ Edit ]
- Commission / Fees          [ Edit ]
- Other                      [ Edit ]

[ + Add Category ]

─────────────────────────────────
Notifications
─────────────────────────────────

New inquiry alerts
[✓] Telegram    [ ] Email

Booking confirmations
[✓] Telegram    [ ] Email

Daily summary (6:00 PM)
[ ] Telegram    [ ] Email

Low balance warning
[ ] Telegram    [ ] Email

─────────────────────────────────
Data
─────────────────────────────────

[ Export Transactions (CSV) ]
[ Export Bookings (CSV) ]

─────────────────────────────────
Danger Zone
─────────────────────────────────

[ Delete All Data ]
This cannot be undone.

─────────────────────────────────`

---

# 🧭 NAVIGATION

---

## Mobile Bottom Navigation

`┌──────────────────────────────────────────┐
│  🏠      📊       ➕       📅      ☰     │
│ Home  Properties  Add   Bookings  More   │
└──────────────────────────────────────────┘`

- Fixed at bottom of screen
- Always visible (except on forms)
- Center (+) button is prominent (accent color)
- Active state: filled icon + label highlighted
- Badge on icons for notifications (e.g., new inquiries)

---

## "More" Menu (Mobile)

`┌──────────────────────────────┐
│ More                    ✕    │
├──────────────────────────────┤
│ 📬 Inquiries           (3)   │
│ 📝 Transactions              │
│ 📊 Reports                   │
│ ─────────────────────────────│
│ 📋 Audit Log    (Owner only) │
│ ⚙️ Settings     (Owner only) │
│ ─────────────────────────────│
│ 🤖 Open Telegram Bot         │
│ ─────────────────────────────│
│ 👤 John (Staff)              │
│ 🚪 Log Out                   │
└──────────────────────────────┘`

---

## Desktop Sidebar

`┌────────────────────────┐
│ 🏠 NyumbaOps           │
│ ────────────────────── │
│ 📊 Dashboard           │
│ 🏠 Properties          │
│ 📝 Transactions        │
│ 📅 Bookings            │
│ 📬 Inquiries      (3)  │
│ 📈 Reports             │
│ ────────────────────── │
│ 📋 Audit Log           │
│ ⚙️ Settings            │
│ ────────────────────── │
│                        │
│                        │
│                        │
│ ────────────────────── │
│ 👤 Owner               │
│ 🚪 Log Out             │
└────────────────────────┘`

- Fixed on left side
- Collapsible to icons only
- Active page highlighted
- Badge for new items

---

## Floating Action Button (Mobile)

      `┌─────┐
      │  +  │  ← Bottom right corner
      └─────┘`

Tap to expand:

`┌─────────────────────┐
│ 💰 Add Income       │
│ ❌ Add Expense      │
│ 📅 Add Booking      │
└─────────────────────┘
         ┌─────┐
         │  ✕  │
         └─────┘`

---

## Breadcrumbs (Desktop)

`Dashboard > Properties > Area 43 > Edit`

- Shows navigation hierarchy
- Each level is clickable
- Mobile: Back arrow only

---

## Page Header Pattern

`┌──────────────────────────────┐
│ ← Back              Title    │
│                              │
│              [ Action Button]│
└──────────────────────────────┘`

---

# ⏳ LOADING STATES

---

## Dashboard Loading

`┌──────────────────────────────┐
│ 📅 January 2026          ▼   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ░░░░░░░░░░░░                 │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓             │
│ ░░░░░░░░░░░░░░               │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ░░░░░░░░░░░░                 │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓             │
│ ░░░░░░░░░░░░░░               │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ░░░░░░░░░░░░                 │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓             │
│ ░░░░░░░░░░░░░░               │
└──────────────────────────────┘`

- Skeleton cards match final layout structure
- Subtle pulse animation
- Month selector works immediately
- Quick actions may be disabled until data loads

---

## List Loading

`┌──────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓               │
│ ░░░░░░░░░░░░░░░░░░           │
│ ░░░░░░░░░░                   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓               │
│ ░░░░░░░░░░░░░░░░░░           │
│ ░░░░░░░░░░                   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓               │
│ ░░░░░░░░░░░░░░░░░░           │
│ ░░░░░░░░░░                   │
└──────────────────────────────┘`

- 3-5 skeleton cards
- Matches expected card structure

---

## Form Submission Loading

`┌──────────────────────────────┐
│       ⟳ Saving...            │
└──────────────────────────────┘`

- Button shows spinner
- Button text changes to "Saving..."
- All form fields disabled
- Prevents double submission
- Cancel is not available during save

---

## Page Transition Loading

`┌──────────────────────────────┐
│ ═══════════════              │  ← Progress bar at top
└──────────────────────────────┘`

- Thin progress bar at top of page
- Indeterminate animation
- Appears after 200ms delay (avoid flicker for fast loads)

---

# 📭 EMPTY STATES

---

## No Properties Yet

`┌──────────────────────────────┐
│                              │
│            🏠               │
│                              │
│    No properties yet         │
│                              │
│  Add your first property     │
│  to start tracking finances. │
│                              │
│    [ + Add Property ]        │
│                              │
└──────────────────────────────┘`

---

## No Transactions This Month

`┌──────────────────────────────┐
│                              │
│            📊               │
│                              │
│   No transactions yet        │
│                              │
│  Record your first income    │
│  or expense for January.     │
│                              │
│  [ + Add Income ]            │
│  [ + Add Expense ]           │
│                              │
└──────────────────────────────┘`

---

## No Bookings

`┌──────────────────────────────┐
│                              │
│            📅               │
│                              │
│    No bookings yet           │
│                              │
│  Bookings will appear here   │
│  when guests inquire or you  │
│  add them manually.          │
│                              │
│    [ + Add Booking ]         │
│                              │
└──────────────────────────────┘`

---

## No Inquiries

`┌──────────────────────────────┐
│                              │
│            📬               │
│                              │
│    No inquiries yet          │
│                              │
│  When someone submits a      │
│  booking request on your     │
│  website, it will appear     │
│  here.                       │
│                              │
└──────────────────────────────┘`

---

## Search/Filter No Results

`┌──────────────────────────────┐
│                              │
│            🔍               │
│                              │
│   No results found           │
│                              │
│  Try different filters or    │
│  clear your search.          │
│                              │
│    [ Clear Filters ]         │
│                              │
└──────────────────────────────┘`

---

## No Audit Log Entries

`┌──────────────────────────────┐
│                              │
│            📋               │
│                              │
│    No activity yet           │
│                              │
│  Actions like adding         │
│  transactions and bookings   │
│  will be logged here.        │
│                              │
└──────────────────────────────┘`

---

# ❌ ERROR STATES

---

## Failed to Load Data

`┌──────────────────────────────┐
│                              │
│            ⚠️               │
│                              │
│   Couldn't load data         │
│                              │
│  Check your connection       │
│  and try again.              │
│                              │
│       [ Retry ]              │
│                              │
└──────────────────────────────┘`

---

## Failed to Save

`┌──────────────────────────────┐
│ ❌ Couldn't save              │
│                              │
│ Something went wrong.        │
│ Your data has not been lost. │
│                              │
│ [ Try Again ]  [ Cancel ]    │
└──────────────────────────────┘`

- Form data is preserved
- User can retry without re-entering
- Shown as modal overlay

---

## Session Expired

`┌──────────────────────────────┐
│                              │
│            🔒               │
│                              │
│   Session expired            │
│                              │
│  Please log in again to      │
│  continue.                   │
│                              │
│      [ Log In ]              │
│                              │
└──────────────────────────────┘`

---

## No Permission

`┌──────────────────────────────┐
│                              │
│            🚫               │
│                              │
│   Access denied              │
│                              │
│  You don't have permission   │
│  to view this page.          │
│                              │
│   [ Back to Dashboard ]      │
│                              │
└──────────────────────────────┘`

---

## Offline Mode Banner

`┌─────────────────────────────────────────┐
│ 📵 You're offline – showing cached data │
└─────────────────────────────────────────┘`

- Yellow/orange banner at top of page
- Persists until connection restored
- Forms are disabled
- Shows "Last updated: 2 hours ago"

---

## Connection Restored

`┌─────────────────────────────────────┐
│ ✅ Back online – data refreshed     │
└─────────────────────────────────────┘`

- Green banner
- Auto-dismisses after 3 seconds

# ✅ CONFIRMATION DIALOGS

---

## Delete Transaction (Owner Only)

`┌──────────────────────────────┐
│ Delete this transaction?     │
│ ─────────────────────────────│
│                              │
│ ❌ Expense – Utilities        │
│ 🏠 Area 43                   │
│ 💰 MWK 45,000                │
│ 📅 15 Jan 2026               │
│                              │
│ This cannot be undone.       │
│                              │
│ [ Cancel ]      [ Delete ]   │
└──────────────────────────────┘`

---

## Delete Property (Owner Only)

`┌──────────────────────────────┐
│ Delete this property?        │
│ ─────────────────────────────│
│                              │
│ 🏠 Area 43 – House A         │
│                              │
│ ⚠️ This will also delete:    │
│ • 47 transactions            │
│ • 12 bookings                │
│ • 8 inquiries                │
│                              │
│ Type "DELETE" to confirm:    │
│ ┌────────────────────────┐   │
│ │                        │   │
│ └────────────────────────┘   │
│                              │
│ [ Cancel ]      [ Delete ]   │
└──────────────────────────────┘`

---

## Cancel Booking

`┌──────────────────────────────┐
│ Cancel this booking?         │
│ ─────────────────────────────│
│                              │
│ 🏠 Area 43 – House A         │
│ 👤 John Banda                │
│ 📅 12 – 15 Jan 2026          │
│                              │
│ Reason (optional):           │
│ ┌────────────────────────┐   │
│ │ Guest requested cancel │   │
│ └────────────────────────┘   │
│                              │
│ [ Keep Booking ]  [ Cancel ] │
└──────────────────────────────┘`

---

## Convert Inquiry to Booking

`┌──────────────────────────────┐
│ Create booking?              │
│ ─────────────────────────────│
│                              │
│ 🏠 Area 43 – House A         │
│ 👤 John Banda                │
│ 📞 0991234567                │
│ 📅 12 – 15 Jan 2026          │
│ 👥 3 guests                  │
│                              │
│ Total: MWK 135,000           │
│ (3 nights × MWK 45,000)      │
│                              │
│ [ Cancel ]  [ Create Booking]│
└──────────────────────────────┘`

---

## Log Out

`┌──────────────────────────────┐
│ Log out?                     │
│ ─────────────────────────────│
│                              │
│ You will need to log in      │
│ again to access the          │
│ dashboard.                   │
│                              │
│ [ Cancel ]      [ Log Out ]  │
└──────────────────────────────┘`

---

## Remove Team Member

`┌──────────────────────────────┐
│ Remove team member?          │
│ ─────────────────────────────│
│                              │
│ 👤 John Kamanga              │
│ john@example.com             │
│                              │
│ They will lose access to     │
│ the dashboard immediately.   │
│                              │
│ [ Cancel ]      [ Remove ]   │
└──────────────────────────────┘`

---

# 🔔 TOAST NOTIFICATIONS

---

## Placement

- **Mobile:** Bottom center, above navigation
- **Desktop:** Top right corner
- Auto-dismiss after 4 seconds
- Swipe to dismiss on mobile
- Click X to dismiss on desktop

---

## Success Toasts

`┌─────────────────────────────────┐
│ ✅ Transaction saved             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ✅ Property added                │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ✅ Booking confirmed             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ✅ Inquiry converted to booking  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ✅ Settings saved                │
└─────────────────────────────────┘`

---

## Error Toasts

`┌─────────────────────────────────┐
│ ❌ Couldn't save. Try again.     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ❌ Connection failed             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ❌ Invalid data. Check the form. │
└─────────────────────────────────┘`

---

## Info Toasts

`┌─────────────────────────────────┐
│ ℹ️ Data refreshed                │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ℹ️ Filters applied               │
└─────────────────────────────────┘`

---

## Warning Toasts

`┌─────────────────────────────────┐
│ ⚠️ You're viewing cached data    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ⚠️ This booking overlaps another │
└─────────────────────────────────┘`

---

# ✅ FORM VALIDATION

---

## Inline Validation Display

### Field with Error

`Amount (MWK) *
┌────────────────────────────┐
│ -500                       │
└────────────────────────────┘
⚠️ Amount must be a positive number`

### Field Valid

`Amount (MWK) *
┌────────────────────────────┐
│ 150,000                 ✓  │
└────────────────────────────┘`

### Required Field Empty

`Property *
┌────────────────────────────┐
│ Select property...     ▼   │
└────────────────────────────┘
⚠️ Please select a property`

---

## Validation Timing

1. **On blur:** Validate when user leaves field
2. **On change:** Re-validate after first error is shown
3. **On submit:** Validate all fields, show all errors
4. **Scroll:** Scroll to first error field
5. **Focus:** Focus first error field

---

## Error Summary (Multiple Errors)

`┌──────────────────────────────┐
│ ⚠️ Please fix these errors:  │
│                              │
│ • Amount is required         │
│ • Please select a property   │
│ • Date cannot be in future   │
└──────────────────────────────┘`

- Shown at top of form on submit
- Each error links to the field

---

## Required Field Indicator

- Asterisk (*) after label
- Screen reader: "Required field"

---

# 🖥️ DESKTOP TABLE VIEWS

---

## Transactions Table

`┌─────────┬─────────────────┬────────────┬────────────┬──────────────┬─────────┐
│ Date    │ Property        │ Type       │ Category   │ Amount       │ Actions │
├─────────┼─────────────────┼────────────┼────────────┼──────────────┼─────────┤
│ 15 Jan  │ Area 43 – House │ 💰 Income  │ Local      │ +MWK 150,000 │   •••   │
│ 14 Jan  │ Area 43 – House │ ❌ Expense │ Utilities  │  -MWK 45,000 │   •••   │
│ 13 Jan  │ Area 10 – Studio│ 💰 Income  │ Airbnb     │  +MWK 85,000 │   •••   │
│ 12 Jan  │ Area 10 – Studio│ ❌ Expense │ Cleaning   │  -MWK 15,000 │   •••   │
│ 10 Jan  │ Area 43 – House │ 💰 Income  │ Airbnb     │ +MWK 200,000 │   •••   │
└─────────┴─────────────────┴────────────┴────────────┴──────────────┴─────────┘`

---

## Bookings Table

`┌─────────────────┬──────────────┬────────────┬──────────┬───────────┬─────────┐
│ Property        │ Guest        │ Dates      │ Source   │ Status    │ Actions │
├─────────────────┼──────────────┼────────────┼──────────┼───────────┼─────────┤
│ Area 43 – House │ John Banda   │ 12-15 Jan  │ Local    │ Confirmed │   •••   │
│ Area 10 – Studio│ Airbnb Guest │ 18-20 Jan  │ Airbnb   │ Confirmed │   •••   │
│ Area 43 – Cottge│ Mary Phiri   │ 10-13 Jan  │ Local    │ Checked In│   •••   │
│ Area 43 – House │ James Mwale  │ 5-8 Jan    │ Local    │ Completed │   •••   │
└─────────────────┴──────────────┴────────────┴──────────┴───────────┴─────────┘`

---

## Table Features

- Sortable columns (click header)
- Sort indicator: ▲ or ▼
- Sticky header on scroll
- Row hover highlight
- Actions menu (•••) for view/edit/delete
- Pagination at bottom
- Items per page selector

---

# 🔍 SEARCH

---

## Global Search (Desktop)

`┌──────────────────────────────┐
│ 🔍 Search...            ⌘K   │
└──────────────────────────────┘`

Press ⌘K (Mac) or Ctrl+K (Windows) to open.

---

## Search Results

`┌──────────────────────────────┐
│ 🔍 "john"               ✕    │
├──────────────────────────────┤
│                              │
│ Bookings                     │
│ ─────────────────────────────│
│ • John Banda – Area 43       │
│   12-15 Jan • Confirmed      │
│                              │
│ • John Mwale – Area 43       │
│   5-8 Jan • Completed        │
│                              │
│ Inquiries                    │
│ ─────────────────────────────│
│ • John Phiri – Area 10       │
│   Pending                    │
│                              │
│ Transactions                 │
│ ─────────────────────────────│
│ • "John plumber" – Repairs   │
│   MWK 25,000 – Area 43       │
│                              │
└──────────────────────────────┘`

---

## Search Scope

- Guest names
- Property names
- Transaction notes
- Booking references

---

## Mobile Search

- Search icon in header
- Full-screen search overlay
- Recent searches shown below input
- Tap result to navigate

---

# ⚡ QUICK ACTIONS & SHORTCUTS

---

## Floating Action Button (Mobile)

      `┌─────┐
      │  +  │  ← Bottom right, above nav
      └─────┘`

Tap to expand:

`┌─────────────────────┐
│ 💰 Add Income       │
│ ❌ Add Expense      │
│ 📅 Add Booking      │
└─────────────────────┘
         ┌─────┐
         │  ✕  │
         └─────┘`

---

## Keyboard Shortcuts (Desktop)

| Shortcut | Action |
| --- | --- |
| N | New transaction |
| I | Add income |
| E | Add expense |
| B | Add booking |
| / | Focus search |
| ? | Show all shortcuts |
| Esc | Close modal/menu |
| ⌘K | Global search |

---

## Shortcuts Help Modal

`┌──────────────────────────────┐
│ Keyboard Shortcuts      ✕    │
├──────────────────────────────┤
│                              │
│ Navigation                   │
│ ─────────────────────────────│
│ G then D    Go to Dashboard  │
│ G then P    Go to Properties │
│ G then T    Go to Transactions│
│ G then B    Go to Bookings   │
│                              │
│ Actions                      │
│ ─────────────────────────────│
│ N           New transaction  │
│ I           Add income       │
│ E           Add expense      │
│ B           Add booking      │
│                              │
│ General                      │
│ ─────────────────────────────│
│ /           Search           │
│ Esc         Close modal      │
│ ?           Show this help   │
│                              │
└──────────────────────────────┘`

---

# ♿ ACCESSIBILITY

---

## Minimum Requirements

- [ ]  Color contrast ratio 4.5:1 minimum
- [ ]  Focus indicators visible on all interactive elements
- [ ]  Touch targets minimum 44x44px
- [ ]  Form labels properly linked to inputs
- [ ]  Error messages linked to form fields (aria-describedby)
- [ ]  Screen reader announcements for toasts
- [ ]  Keyboard navigation throughout
- [ ]  Skip to main content link

---

## Color Accessibility

Don't rely on color alone – always add icons or text:

| State | Color | Icon/Text |
| --- | --- | --- |
| Profit | Green | + and ↑ |
| Loss | Red | - and ↓ |
| Income | Green | 💰 icon |
| Expense | Red | ❌ icon |
| Success | Green | ✅ icon |
| Error | Red | ❌ icon + text |
| Warning | Orange | ⚠️ icon |

---

## Screen Reader Labels

- "Dashboard, current page"
- "Income this month, 2 million 450 thousand kwacha"
- "Add income button"
- "Area 43 property, profit 550 thousand kwacha, positive"
- "Transaction saved, success notification"

---

## Focus Management

- Modal opens → focus first interactive element
- Modal closes → focus returns to trigger element
- Form error → focus moves to first error field
- Toast appears → announced but doesn't steal focus

---

## Motion Preferences

- Respect "prefers-reduced-motion"
- Disable animations for users who prefer reduced motion
- Keep essential animations subtle

---

# 📱 RESPONSIVE DESIGN

---

## Breakpoints

| Name | Width | Layout |
| --- | --- | --- |
| Mobile | < 640px | Single column, bottom nav |
| Tablet | 640-1024px | Two columns, collapsible sidebar |
| Desktop | > 1024px | Full layout, fixed sidebar |

---

## Mobile Layout

- Single column
- Bottom navigation
- Full-width cards
- Stacked forms
- Collapsible sections
- Floating action button

---

## Tablet Layout

- Collapsible sidebar (hamburger menu)
- Two-column grids where useful
- Cards in grid (2 per row)
- Side-by-side form fields where appropriate

---

## Desktop Layout

- Fixed sidebar (always visible)
- Multi-column dashboards
- Data tables instead of cards
- Keyboard shortcuts active
- More information density

---

# 📴 OFFLINE SUPPORT

---

## What Works Offline

- View cached dashboard data
- View cached property list
- View cached recent transactions (last 30 days)
- Browse previously loaded booking details
- View cached reports

---

## What Requires Connection

- Adding new transactions
- Creating bookings
- Converting inquiries
- Loading fresh data
- Uploading images
- Any write operations

---

## Offline Indicator

`┌─────────────────────────────────────┐
│ 📵 Offline – showing cached data    │
│    Last updated: 2 hours ago        │
└─────────────────────────────────────┘`

- Yellow/orange banner at top
- Persists until connection restored
- Shows when data was last synced

---

## Offline Form Behavior

`┌──────────────────────────────┐
│ ⚠️ You're offline            │
│                              │
│ You can't add transactions   │
│ while offline. Please        │
│ connect to the internet      │
│ and try again.               │
│                              │
│ [ Back to Dashboard ]        │
└──────────────────────────────┘`

- Forms are disabled when offline
- Clear message explaining why
- No queuing of offline writes (MVP simplicity)

---

## Sync on Reconnect

1. Detect connection restored
2. Show "Syncing..." indicator
3. Fetch fresh data
4. Update cached data
5. Show toast: "Data updated"
6. Remove offline banner

---

## Cached Data

- Dashboard summary (current month)
- All properties
- Last 30 days of transactions
- Upcoming bookings
- Expense categories
- Cached for 24 hours max

---

# 🎨 VISUAL DESIGN SYSTEM

---

## Color Palette

| Name | Hex | Usage |
| --- | --- | --- |
| Primary | `#1F7AE0` | Buttons, links, active states |
| Success | `#16A34A` | Profit, income, confirmations |
| Danger | `#DC2626` | Expenses, errors, deletions |
| Warning | `#F59E0B` | Warnings, offline state |
| Background | `#F9FAFB` | Page background |
| Surface | `#FFFFFF` | Cards, modals |
| Text | `#111827` | Primary text |
| Text Muted | `#6B7280` | Secondary text, labels |
| Border | `#E5E7EB` | Dividers, card borders |

---

## Typography

| Element | Size | Weight | Font |
| --- | --- | --- | --- |
| Page Title | 24px | 600 | Inter / System UI |
| Section | 18px | 600 | Inter / System UI |
| Body | 16px | 400 | Inter / System UI |
| Small | 14px | 400 | Inter / System UI |
| Numbers | 16px | 500 | JetBrains Mono / Monospace |
| Large Number | 32px | 700 | JetBrains Mono / Monospace |

---

## Spacing Scale

| Name | Size | Usage |
| --- | --- | --- |
| xs | 4px | Tight spacing |
| sm | 8px | Related elements |
| md | 16px | Standard spacing |
| lg | 24px | Section spacing |
| xl | 32px | Major sections |
| 2xl | 48px | Page sections |

---

## Border Radius

| Element | Radius |
| --- | --- |
| Buttons | 8px |
| Cards | 12px |
| Inputs | 8px |
| Modals | 16px |
| Avatars | 50% |

---

## Shadows

| Name | Shadow | Usage |
| --- | --- | --- |
| sm | 0 1px 2px rgba(0,0,0,0.05) | Subtle lift |
| md | 0 4px 6px rgba(0,0,0,0.1) | Cards |
| lg | 0 10px 15px rgba(0,0,0,0.1) | Modals |

---

# 🧠 UX DECISIONS THAT PROTECT YOU

---

## Safety First

- **No inline edits:** All changes require explicit save action
- **No stored totals:** Always calculate from transactions (accuracy)
- **Explicit confirmations:** All destructive actions require confirmation
- **Type to delete:** Critical deletions require typing "DELETE"
- **Audit everything:** All actions logged with who, what, when

---

## Separation of Concerns

- Public website ≠ Internal dashboard
- Different URLs, different auth
- No accidental exposure of internal data

---

## Role Enforcement

- Backend enforces permissions (not just frontend)
- Frontend hides but backend blocks
- Staff cannot access owner-only features even by URL

---

## Data Integrity

- Transactions are immutable (delete only, no edit in MVP)
- Audit logs are append-only
- Backups are automatic

---

# ✅ DESIGN CHECKLIST

Before building each page, confirm:

- [ ]  Loading state designed
- [ ]  Empty state designed
- [ ]  Error state designed
- [ ]  Mobile layout designed
- [ ]  Tablet/desktop layout designed
- [ ]  Form validation designed
- [ ]  Confirmation dialogs designed
- [ ]  Success feedback designed
- [ ]  Keyboard accessible
- [ ]  Screen reader friendly
- [ ]  Works offline (if applicable)
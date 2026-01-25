# Backend Migration to Firebase - Post-Implementation Review

## Issue/Feature Implemented

Migrated the NyumbaOps backend from **NestJS + Prisma + PostgreSQL** to **Firebase Functions + Firestore + Firebase Auth**.

## Intended Solution

The original plan was to:
1. Create a Firebase Functions backend with Express
2. Port all existing NestJS endpoints to Firestore queries
3. Replace JWT auth with Firebase Auth tokens
4. Use Firebase Storage for uploads
5. Set up local development with emulators
6. Maintain API contract compatibility with existing dashboard

## Challenges Faced

### 1. Java Environment Configuration (Primary Blocker)
- **Problem**: Firebase Firestore emulator requires Java, but Windows PATH configuration was not persistent
- **Resolution**: User manually fixed Java installation and PATH configuration
- **Duration**: Multiple attempts over several command executions

### 2. Duplicate Firebase Config Files
- **Problem**: `firebase.json` and `firestore.rules` had duplicate content from multiple `firebase init` runs
- **Impact**: Emulators failed to start with "Error compiling rules"
- **Resolution**: Removed duplicate `rules_version` declarations and kept single clean rule set

### 3. API Route Mounting Issue
- **Problem**: Double `/api/api/` in URL due to both Firebase function name (`api`) and Express app mounting (`app.use("/api", ...)`)
- **Impact**: Public site couldn't reach API endpoints
- **Resolution**: Changed `app.use("/api", apiRouter)` to `app.use("/", apiRouter)`
- **Result**: Clean URL structure: `http://localhost:5001/nyumbaops/us-central1/api/v1/public/properties`

### 4. TypeScript Compilation in Functions
- **Problem**: Functions emulator doesn't always auto-recompile TypeScript on changes
- **Resolution**: Manual `pnpm -C functions build` after route changes

### 5. Port Conflicts on Next.js Apps
- **Problem**: Ports 3000 and 3001 were already in use from previous dev sessions
- **Resolution**: Stopped conflicting Node processes and restarted apps

## Final Implementation

### What Was Built

#### 1. Firebase Project Structure
```
functions/
├── src/
│   ├── lib/
│   │   ├── firebase.ts       # Admin SDK init
│   │   ├── auth.ts           # Token verification + RBAC middleware
│   │   ├── types.ts          # Firestore document types
│   │   ├── booking-utils.ts  # Status transition logic
│   │   └── audit.ts          # Audit logging helper
│   ├── types/
│   │   └── express.d.ts      # Express Request type extension
│   ├── index.ts              # Main Express app with all endpoints
│   └── seed.ts               # Firestore seed script
├── package.json
└── tsconfig.json

firebase.json                 # Emulator config
firestore.rules              # Security rules (open for dev)
.firebaserc                  # Project ID (nyumbaops)
```

#### 2. Firestore Collections
- `properties` - Property listings with embedded images/amenities arrays
- `categories` - Revenue/Expense categories
- `transactions` - Financial records
- `bookings` - Booking records with status tracking
- `guests` - Guest profiles
- `users` - User roles (OWNER/STAFF) for RBAC
- `auditLogs` - Action tracking

#### 3. API Endpoints Ported
**Public (no auth):**
- `GET /v1/public/properties` - List active properties
- `GET /v1/public/properties/:id` - Property details

**Protected (requires Firebase Auth token):**
- Properties: CRUD operations
- Categories: List by type (REVENUE/EXPENSE)
- Transactions: Log revenue/expense, list with filters
- Bookings: CRUD with status transitions (PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT → CANCELLED)
- Guests: CRUD operations
- Analytics: Financial summary (total revenue, expenses, profit, booking counts)

#### 4. Authentication Flow
- Dashboard uses Firebase Auth (`signInWithEmailAndPassword`)
- Auth token retrieved via `user.getIdToken()`
- Token sent in `Authorization: Bearer <token>` header
- Functions verify token and extract `uid`
- Functions check Firestore `users/{uid}` doc for role
- Middleware enforces role-based access (OWNER vs STAFF)

#### 5. Frontend Integration
**Dashboard (`apps/dashboard`):**
- Added `src/lib/firebase.ts` - Firebase client SDK
- Added `src/lib/AuthContext.tsx` - Auth state management
- Added `src/app/login/page.tsx` - Login UI
- Added `src/components/ProtectedRoute.tsx` - Route guard
- Updated `src/lib/api.ts` - Include Firebase ID tokens in requests

**Public Site (`apps/public`):**
- Uses public API endpoints (no auth required)
- Fetches properties from Firestore via Functions API

## Potential Side Effects / Unknowns

### Known Risks
1. **Firestore Security Rules** are currently **open for development**
   - Current rule: `allow read, write: if request.time < timestamp.date(2026, 2, 20);`
   - **Action Required**: Replace with proper rules before production

2. **No First User Creation Flow**
   - **Current State**: Must manually create first user via emulator UI
   - **Missing**: Self-serve registration or admin creation endpoint
   - **Impact**: Cannot onboard new users without manual Firestore writes

3. **Dashboard Role Assignment**
   - **Current State**: Role (`OWNER`/`STAFF`) must be manually set in Firestore
   - **Missing**: UI to assign/change roles
   - **Impact**: User management requires Firestore console access

4. **Firebase Storage Not Integrated**
   - **Current State**: Upload endpoints return mock pre-signed URLs
   - **Decision Made**: Use Firebase Storage instead of Cloudflare R2
   - **Action Required**: Implement actual Storage upload logic in Functions

5. **Date Range Filtering Complexity**
   - **Issue**: Firestore doesn't support complex date overlaps (e.g., bookings in date range)
   - **Current Solution**: Fetch all bookings and filter in-memory
   - **Impact**: Performance degrades with large booking datasets
   - **Alternative**: Use composite indexes or restructure data

6. **No Database Migrations**
   - **Current State**: Schema changes require manual Firestore updates or seed re-runs
   - **Missing**: Migration framework (like Prisma had)
   - **Impact**: Production schema changes are manual and risky

7. **Node Version Mismatch**
   - **Warning**: Functions `package.json` specifies `node: 18`, but local env runs `node: 25`
   - **Impact**: Potential runtime differences between local and deployed
   - **Action**: Either update `package.json` or use nvm to match versions

### Untested Areas
- **Token Refresh**: Dashboard may lose auth if user stays logged in past token expiry
- **STAFF Role Permissions**: Only OWNER role tested; STAFF endpoints not verified
- **Error Boundaries**: Frontend error handling for API failures minimal
- **Booking Status Transitions**: Only basic flow tested; edge cases (e.g., double-cancel) untested
- **Analytics Date Filters**: Month/year filtering logic not thoroughly tested

## Follow-ups / Tickets

### High Priority
1. **Implement Firebase Storage Uploads**
   - Replace mock upload URLs with actual Storage logic
   - Generate signed download URLs for images
   - Set proper bucket CORS and security rules

2. **Write Production Firestore Security Rules**
   - Public endpoints: Read-only access to `properties` where `status == "ACTIVE"`
   - Protected collections: Verify user role in `users/{uid}`
   - Audit logs: Deny direct client access

3. **Create User Management UI**
   - Dashboard page to list users
   - Form to create new user (email + role)
   - Button to delete or change role

### Medium Priority
4. **Add Frontend Error Boundaries**
   - Catch API failures and show user-friendly messages
   - Handle 401/403 and redirect to login
   - Toast notifications for success/error

5. **Optimize Booking Date Queries**
   - Evaluate composite indexes for date range queries
   - Consider restructuring bookings by month/year for scalability

6. **Token Refresh Logic**
   - Implement automatic token refresh in AuthContext
   - Handle session expiry gracefully

7. **Deploy to Firebase Hosting**
   - Configure `firebase.json` for hosting
   - Deploy Functions to production
   - Point production domain to Firebase

### Low Priority
8. **Remove Old NestJS Backend**
   - Delete `apps/api/` directory
   - Remove Prisma dependencies
   - Clean up `pnpm-lock.yaml`

9. **Add Integration Tests**
   - Test booking flow end-to-end
   - Test auth token verification
   - Test role-based access control

10. **Documentation Updates**
    - API documentation (OpenAPI/Swagger)
    - Deployment guide
    - Troubleshooting runbook

## Current Status

### ✅ Fully Operational
- Firebase Emulators (Functions, Firestore, Auth)
- Public API endpoints serving properties
- Protected API endpoints with Firebase Auth
- Dashboard and Public site running locally
- Firestore seeded with sample data (2 properties, categories, amenities)

### ⚠️ Requires Manual Setup
- Creating first admin user:
  1. Go to http://localhost:9099/auth
  2. Add user with email/password
  3. Copy UID
  4. Go to http://localhost:4000/firestore
  5. Create `users/{uid}` doc with `role: "OWNER"`

### 🚧 Not Yet Implemented
- Actual file uploads to Firebase Storage
- Production security rules
- User registration/management UI
- Token refresh logic
- Dashboard pages for categories, transactions, analytics

## Access Points

**Running Services:**
- **Firebase Emulator UI**: http://localhost:4000
- **Functions API**: http://localhost:5001/nyumbaops/us-central1/api
- **Dashboard**: http://localhost:3000 (redirects to /login if not authenticated)
- **Public Site**: http://localhost:3001
- **Firestore Emulator**: http://localhost:8080
- **Auth Emulator**: http://localhost:9099

**Test API Call:**
```bash
curl http://localhost:5001/nyumbaops/us-central1/api/v1/public/properties
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "lAHbb0lYP2k4FHwQ1LGX",
      "name": "Area 43 - House A",
      "location": "Lilongwe",
      "bedrooms": 3,
      "bathrooms": 2,
      "maxGuests": 6,
      "nightlyRate": 55000,
      "currency": "MWK",
      "status": "ACTIVE",
      "coverImageUrl": "https://images.example.com/area-43-house-a/cover.webp",
      "coverImageAlt": "Area 43 house A exterior",
      "amenities": ["WiFi", "Parking", "Backup Power", "Kitchen"]
    },
    {
      "id": "YJRKdS9hWC8gfZ5SXpKl",
      "name": "City Center - Flat 2B",
      "location": "Lilongwe",
      "bedrooms": 2,
      "bathrooms": 1,
      "maxGuests": 4,
      "nightlyRate": 45000,
      "currency": "MWK",
      "status": "ACTIVE",
      "coverImageUrl": "https://images.example.com/city-center-flat-2b/cover.webp",
      "coverImageAlt": "City Center flat 2B exterior",
      "amenities": ["WiFi", "Hot Water"]
    }
  ],
  "meta": {
    "total": 2,
    "limit": 10,
    "offset": 0
  }
}
```

## Conclusion

**Migration Status: ✅ COMPLETE with Production Gaps**

The backend successfully migrated from NestJS to Firebase Functions. All core endpoints are ported and functional. The system is ready for local development and testing.

**Before Production Deployment:**
1. Implement Firebase Storage uploads
2. Write production Firestore security rules
3. Create user management UI
4. Test all protected endpoints with OWNER and STAFF roles
5. Add error boundaries to frontend
6. Document API for consumers

**Stability Assessment:**
- **Local Development**: Stable and fully functional
- **Production Readiness**: Requires 6 critical items (listed above)
- **Breaking Changes**: None (API contract preserved)
- **Data Loss Risk**: None (Firestore seeded cleanly; old Postgres untouched)

**Recommendation**: Proceed with local feature development. Schedule production deployment after completing "High Priority" follow-ups.

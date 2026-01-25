# NyumbaOps Firebase Backend Setup

## Prerequisites
- Node.js 18+
- pnpm
- Java 21+ (for Firebase emulators)
- Firebase CLI (`npm install -g firebase-tools`)

---

## Environment Files

### `apps/public/.env.local`
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBZzVtut0HMha1DZWBvhKNcBy_rYBKQWvs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nyumbaops.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=nyumbaops
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=nyumbaops.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=429311575602
NEXT_PUBLIC_FIREBASE_APP_ID=1:429311575602:web:5fecc401013f9e646cde2b
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-Q6Q5RVWBZZ
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001/nyumbaops/us-central1/api
```

### `apps/dashboard/.env.local`
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBZzVtut0HMha1DZWBvhKNcBy_rYBKQWvs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nyumbaops.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=nyumbaops
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=nyumbaops.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=429311575602
NEXT_PUBLIC_FIREBASE_APP_ID=1:429311575602:web:5fecc401013f9e646cde2b
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-Q6Q5RVWBZZ
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001/nyumbaops/us-central1/api
```

---

## Installation

```bash
# Install all dependencies
pnpm install

# Install functions dependencies
pnpm -C functions install

# Install dashboard dependencies  
pnpm -C apps/dashboard install

# Install public site dependencies
pnpm -C apps/public install
```

---

## Running the Stack

### Option 1: Using the PowerShell script (recommended)
```powershell
.\start-emulators.ps1
```

### Option 2: Manual start

1. Start Firebase emulators:
```bash
firebase emulators:start
```

2. In separate terminals, start the apps:
```bash
# Dashboard
pnpm -C apps/dashboard dev

# Public site
pnpm -C apps/public dev -p 3001
```

---

## Seeding Data

Once emulators are running, seed Firestore:

```bash
# Set emulator host
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"

# Run seed script
pnpm -C functions run seed
```

---

## Testing

### Run Unit & Integration Tests

```bash
# Run all tests
pnpm -C functions test

# Run tests in watch mode
pnpm -C functions test:watch

# Run with coverage report
pnpm -C functions test:coverage
```

### Run E2E Tests

```bash
# Ensure emulators and apps are running first

# Run E2E tests in all browsers
npx playwright test

# Run in specific browser
npx playwright test --project=chromium

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test e2e/public-inquiry.spec.ts
```

### Data Integrity Validation

```bash
# Validate data integrity
npx ts-node functions/src/scripts/validate-data.ts
```

---

## User Role Management

**Decision: Firestore `users/{uid}` collection with `role` field**

When a user signs up via Firebase Auth, create a corresponding document in Firestore:

```typescript
// Structure: users/{uid}
{
  email: string;
  role: "OWNER" | "STAFF";
  name?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

The Functions API checks this role via `verifyAuth` middleware before allowing access to protected endpoints.

### Creating the first user

1. Sign up via Firebase Auth UI or emulator:
   - Go to http://localhost:9099/auth (Auth Emulator UI)
   - Add a user with email/password

2. Manually create their Firestore user doc:
   - Go to http://localhost:4000/firestore (Firestore Emulator UI)
   - Create collection: `users`
   - Document ID: `{the-uid-from-auth}`
   - Fields:
     ```
     email: "owner@example.com"
     role: "OWNER"
     name: "Owner"
     createdAt: (timestamp)
     updatedAt: (timestamp)
     ```

---

## Access Points

- **Firebase Emulator UI**: http://localhost:4000
- **Functions API**: http://localhost:5001/nyumbaops/us-central1/api
- **Firestore Emulator**: http://localhost:8080
- **Auth Emulator**: http://localhost:9099
- **Dashboard**: http://localhost:3000
- **Public Site**: http://localhost:3001

---

## API Endpoints

### Public (no auth required)
- `GET /v1/public/properties` - List active properties
- `GET /v1/public/properties/:id` - Get property details
- `POST /v1/public/inquiries` - Submit booking inquiry

### Protected (requires Firebase Auth token)
- `GET /properties` - List all properties
- `POST /properties` - Create property
- `GET /transactions` - List transactions
- `POST /transactions/revenue` - Log revenue
- `POST /transactions/expense` - Log expense
- `GET /bookings` - List bookings
- `POST /bookings` - Create booking
- `GET /guests` - List guests
- `POST /guests` - Create guest
- `GET /analytics/summary` - Get financial summary

---

## Troubleshooting

### Java not found
If emulators fail with "java not found":
```powershell
# Set Java path in current session
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21.0.10"
$env:Path += ";C:\Program Files\Java\jdk-21.0.10\bin"
```

### Emulators won't start
1. Check firebase.json exists
2. Check .firebaserc exists with `{"projects": {"default": "nyumbaops"}}`
3. Ensure Java is accessible
4. Try: `firebase emulators:start --debug`

### CORS errors from frontend
The Functions API has CORS enabled for localhost:3000 and localhost:3001. If you need to add more origins, update `functions/src/index.ts`.

### Tests failing
1. Ensure emulators are running: `firebase emulators:start`
2. Check test environment variables are set
3. Clear Firestore between tests: `firebase emulators:exec --only firestore "pnpm -C functions test"`

### Performance issues
1. Check Firestore indexes are deployed: `firebase deploy --only firestore:indexes`
2. Monitor Functions logs: `firebase functions:log`
3. Review query patterns in code

---

## Development Workflow

1. **Start emulators**: `firebase emulators:start`
2. **Run tests**: `pnpm -C functions test:watch`
3. **Start frontend**: `pnpm -C apps/public dev -p 3001`
4. **Make changes**: Edit code with tests running
5. **Verify**: Tests pass + manual browser testing
6. **Deploy**: `firebase deploy` (production only)

---

## Performance Testing

See [docs/PERFORMANCE-BENCHMARKS.md](docs/PERFORMANCE-BENCHMARKS.md) for detailed benchmarking instructions.

---

## Security

See [docs/SECURITY-AUDIT.md](docs/SECURITY-AUDIT.md) for security audit report and compliance notes.

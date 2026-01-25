# 🚀 NyumbaOps Local Testing Guide

## Quick Start (3 Steps)

### Step 1: Start Emulators
Open **Terminal 1** and run:
```powershell
.\start-emulators.ps1
```

Wait for this message:
```
✔  All emulators ready! It is now safe to connect your app.
```

**Note:** Your test data (users, properties, bookings, etc.) will now persist between emulator restarts!

### Step 2: Seed Database
Open **Terminal 2** and run:
```powershell
.\seed-emulators.ps1
```

### Step 3: Create Admin User

**3a. Create Auth User:**
1. Go to: http://localhost:9099/auth
2. Click "Add user"
3. Enter:
   - Email: `owner@test.com`
   - Password: `TestPassword123!`
4. **Copy the User UID** (you'll need it next)

**3b. Create User Role (Choose One Method):**

**Method 1: Automated (Recommended)**
Open **Terminal 2** and run:
```powershell
.\setup-admin.ps1 -Uid "YOUR_UID_HERE" -Email "owner@test.com" -Name "Test Owner"
```
Replace `YOUR_UID_HERE` with the UID from step 3a.

**Method 2: Manual**
1. Go to: http://localhost:4000/firestore
2. Click "Start collection"
3. Collection ID: `users`
4. Document ID: **paste the UID from step 3a**
5. Add these fields:
   ```
   email: "owner@test.com" (string)
   role: "OWNER" (string)
   name: "Test Owner" (string)
   ```
6. For timestamps, click the field type and select "timestamp", then click "auto-id"
7. Click "Save"

### Step 4: Start Dashboard
Open **Terminal 3** and run:
```powershell
pnpm -C apps/dashboard dev
```

### Step 5: Login & Test
1. Open: http://localhost:3000
2. Login with:
   - Email: `owner@test.com`
   - Password: `TestPassword123!`
3. ✅ You're in!

---

## Access Points

| Service | URL |
|---------|-----|
| **Dashboard** | http://localhost:3000 |
| **Public Site** | http://localhost:3001 |
| **Emulator UI** | http://localhost:4000 |
| **Firestore Data** | http://localhost:4000/firestore |
| **Auth Users** | http://localhost:9099/auth |
| **Functions API** | http://localhost:5001/nyumbaops/us-central1/api |

---

## Troubleshooting

### ❌ "Unable to detect a Project Id"
**Solution:** Emulators aren't running or environment variables not set
```powershell
# Start emulators first
firebase emulators:start

# Then in another terminal, use the seed script
.\seed-emulators.ps1
```

### ❌ Browser shows "Not Found" at localhost:9099
**Solution:** Emulators not started
```powershell
firebase emulators:start
```

### ❌ Can't login to dashboard
**Solution:** User doesn't have role in Firestore
1. Check user exists: http://localhost:9099/auth
2. Check user document exists: http://localhost:4000/firestore → `users` collection
3. Verify document ID matches user UID
4. Verify `role` field is set to `"OWNER"`

### ❌ Dashboard shows empty data
**Solution:** Database not seeded
```powershell
.\seed-emulators.ps1
```

### ❌ API returns 404 errors
**Solution:** Check `.env.local` has correct API URL
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001/nyumbaops/us-central1/api
```

---

## Reset Everything

If things get messy, you have two options:

### Option 1: Restart with existing data (recommended)
1. Stop all terminals (Ctrl+C)
2. Restart emulators:
   ```powershell
   .\start-emulators.ps1
   ```
3. Your data will be restored automatically

### Option 2: Complete fresh start
1. Stop all terminals (Ctrl+C)
2. Clear emulator data:
   ```powershell
   .\clear-emulator-data.ps1
   ```
3. Restart emulators:
   ```powershell
   .\start-emulators.ps1
   ```
4. Re-seed database:
   ```powershell
   .\seed-emulators.ps1
   ```
5. Recreate test user:
   ```powershell
   .\setup-admin.ps1 -Uid "YOUR_UID" -Email "owner@test.com" -Name "Test Owner"
   ```

---

## Running Tests

### Unit & Integration Tests
```powershell
# Start emulators first, then:
pnpm -C functions test
```

### E2E Tests
```powershell
# Start emulators + apps first, then:
npx playwright test
```

---

## Tips

- Keep Terminal 1 (emulators) running always
- **Data now persists!** When you restart emulators, your test data is automatically restored
- Use `.\clear-emulator-data.ps1` when you need a fresh start
- Use `.\export-emulator-data.ps1` to manually export data while emulators are running

## Data Persistence

### How It Works

Emulator data now persists automatically between restarts:

1. **First Run**: No `emulator-data/` folder → starts fresh
2. **Create Data**: Add test users, properties, bookings, etc.
3. **Shutdown**: Press Ctrl+C → data auto-exports to `./emulator-data/`
4. **Next Run**: Start script imports your data automatically
5. **Result**: All your test data is restored!

### Manual Data Management

**Export data while emulators are running:**
```powershell
.\export-emulator-data.ps1
```

**Clear all data for a fresh start:**
```powershell
.\clear-emulator-data.ps1
```

This will ask for confirmation and delete the `./emulator-data/` folder.

**When to clear data:**
- Testing database migrations
- Debugging data-related issues
- Starting a new feature from scratch
- Data becomes corrupted or inconsistent

---

## Need Help?

- Check emulator logs in Terminal 1
- Visit Emulator UI: http://localhost:4000
- Check Firestore data: http://localhost:4000/firestore
- Check Auth users: http://localhost:9099/auth

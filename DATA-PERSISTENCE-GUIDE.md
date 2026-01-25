# Firebase Emulator Data Persistence Guide

## Understanding the Two Systems

### 1. Seed Script (Mock Data)
**File:** `seed-emulators.ps1`
- Creates **temporary mock/test data**
- Generates sample properties from `functions/src/seed.ts`
- Use **only once** for initial testing
- **Not for saving your real data**

### 2. Data Persistence (Your Real Data)
**Files:** `start-emulators.ps1`, `emulator-data/` folder
- Saves **all your actual data** automatically
- Works for: Auth users, Firestore documents, Storage files
- Happens automatically on emulator shutdown
- Restores automatically on emulator startup

---

## How Data Persistence Works

### Visual Flow

```
Start Emulators → Create Real Data → Stop (Ctrl+C) → Auto-Export
                                                        ↓
Restart Emulators ← Auto-Import ← Data Saved in ./emulator-data/
```

### Step-by-Step Process

#### First Time Setup (One Time Only)

1. **Start emulators:**
   ```powershell
   .\start-emulators.ps1
   ```

2. **Create your real test user:**
   - Go to http://localhost:9099/auth
   - Click "Add user"
   - Email: `owner@test.com`
   - Password: `TestPassword123!`
   - **Copy the UID**

3. **Give user OWNER role:**
   ```powershell
   .\setup-admin.ps1 -Uid "YOUR_UID_HERE" -Email "owner@test.com" -Name "Test Owner"
   ```

4. **Start dashboard:**
   ```powershell
   pnpm -C apps/dashboard dev
   ```

5. **Create your real data:**
   - Login at http://localhost:3000
   - Create real properties
   - Upload real images
   - Create real bookings
   - Add real transactions

6. **Stop emulators (Ctrl+C in emulator terminal):**
   ```
   ✔  Automatically exporting data using --export-on-exit "./emulator-data"
   ✔  Export complete
   ```
   
   **Your data is now saved!**

#### Every Time After (Automatic)

1. **Start emulators:**
   ```powershell
   .\start-emulators.ps1
   ```
   
   You'll see:
   ```
   Found existing emulator data. Importing...
   ✔  All emulators ready!
   ```

2. **All your real data is restored:**
   - Auth users
   - Properties
   - Bookings
   - Images
   - Everything!

3. **Work normally:**
   - Make changes
   - Add more data
   - Test features

4. **Stop emulators (Ctrl+C):**
   - Data auto-exports again
   - Includes all your new changes

---

## Important Rules

### ✅ Do This:
- Let emulators auto-export on shutdown (Ctrl+C)
- Create real data through the dashboard
- Use `.\start-emulators.ps1` to start emulators
- Keep working with your real data

### ❌ Don't Do This:
- Don't run `.\seed-emulators.ps1` again (you already have data)
- Don't delete `./emulator-data/` folder (unless you want fresh start)
- Don't use `firebase emulators:start` directly (use the script instead)

---

## Manual Commands

### Export Data While Emulators Are Running
```powershell
.\export-emulator-data.ps1
```
Use this to manually backup your data without stopping emulators.

### Clear All Data (Fresh Start)
```powershell
.\clear-emulator-data.ps1
```
This will:
- Ask for confirmation
- Delete `./emulator-data/` folder
- Next emulator start will be fresh

**When to clear data:**
- Testing database migrations
- Data becomes corrupted
- Starting completely fresh
- Testing new database schema

---

## Common Scenarios

### Scenario 1: "I Need to Restart Emulators for Code Changes"
```powershell
# In emulator terminal:
Ctrl+C  # Auto-exports

# Restart:
.\start-emulators.ps1  # Auto-imports

# Done! Your data is back.
```

### Scenario 2: "I Want to Add More Test Data"
Just work normally:
1. Login to dashboard
2. Create more properties/bookings
3. Stop emulators (Ctrl+C)
4. Data auto-exports with your new additions

### Scenario 3: "I Want to Start Fresh"
```powershell
.\clear-emulator-data.ps1  # Clears everything
.\start-emulators.ps1      # Fresh start
```
Then create your test user and data again.

### Scenario 4: "I Want to Test Without My Data"
```powershell
# Temporarily rename the folder:
Rename-Item emulator-data emulator-data-backup

# Start fresh:
.\start-emulators.ps1

# When done, restore:
Remove-Item emulator-data -Recurse
Rename-Item emulator-data-backup emulator-data
```

---

## What Gets Saved

### ✅ Automatically Saved:
- **Auth Users:** All test users you create
- **Firestore Documents:** Properties, bookings, transactions, categories
- **Storage Files:** All uploaded property images
- **User Roles:** Your OWNER/STAFF roles in Firestore

### ❌ Not Saved:
- Running processes (Functions, Dashboard)
- Terminal state
- Environment variables (set each session)

---

## Troubleshooting

### "My data wasn't restored!"
**Check:**
1. Does `./emulator-data/` folder exist?
2. Did you use `.\start-emulators.ps1` (not `firebase emulators:start`)?
3. Did emulators shut down cleanly (Ctrl+C, not force close)?

### "I have too much old test data"
**Solution:** Clear and start fresh
```powershell
.\clear-emulator-data.ps1
```

### "I want to share my test data with team"
**Solution:** Commit `emulator-data/` to git (remove from .gitignore first)

**But be careful:** This folder can contain sensitive test data!

---

## Quick Reference

| Action | Command |
|--------|---------|
| Start emulators | `.\start-emulators.ps1` |
| Stop emulators | `Ctrl+C` (auto-exports) |
| Manual export | `.\export-emulator-data.ps1` |
| Fresh start | `.\clear-emulator-data.ps1` |
| Seed mock data | `.\seed-emulators.ps1` (only once) |
| Create admin user | `.\setup-admin.ps1 -Uid "..." -Email "..." -Name "..."` |

---

## Summary

**The key insight:** 
- `seed-emulators.ps1` = temporary mock data (use once)
- **Data persistence** = your real data (automatic, forever)

**You should:**
1. Create your real data once
2. Work normally
3. Stop/start emulators as needed
4. Your data persists automatically!

**No more:**
- Re-creating test users
- Re-creating properties
- Re-uploading images
- Re-seeding database

**Everything persists automatically! 🎉**

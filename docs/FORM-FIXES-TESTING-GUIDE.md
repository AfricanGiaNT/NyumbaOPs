# Testing Guide: Fixed Forms

## What Was Fixed

### 1. Authentication (403 Errors)
- **Problem**: API calls returned 403 (Forbidden) because user didn't have role in Firestore
- **Solution**: Created helper scripts to set up admin user with OWNER role
  - Script: `setup-admin.ps1` 
  - TypeScript helper: `functions/src/scripts/setup-admin-user.ts`

### 2. Number Input Issues
- **Problem**: Number inputs showed default values that caused concatenation (typing 300 showed "0300")
- **Solution**: Changed form state to use strings with placeholders

#### Files Modified:
1. **Property Form** (`apps/dashboard/src/app/properties/page.tsx`)
   - Changed `bedrooms`, `bathrooms`, `maxGuests`, `nightlyRate` from `number` to `string`
   - Added placeholders: "1", "1", "2", "Optional"
   - Convert to numbers only in submit handler

2. **Guest Form** (`apps/dashboard/src/app/guests/page.tsx`)
   - Changed `rating` from `number` to `string`
   - Added placeholder: "5"
   - Convert to number in submit handler

3. **Booking Form** (`apps/dashboard/src/app/bookings/page.tsx`)
   - No changes needed (no numeric inputs)

## How to Test

### Prerequisites
1. **Start Firebase Emulators** (Terminal 1):
   ```powershell
   firebase emulators:start
   ```

2. **Seed the Database** (Terminal 2):
   ```powershell
   .\seed-emulators.ps1
   ```

3. **Create Admin User**:
   
   **Step A**: Go to http://localhost:9099/auth and create a user
   - Email: `owner@test.com`
   - Password: `TestPassword123!`
   - **Copy the UID**
   
   **Step B**: Run the setup script (Terminal 2):
   ```powershell
   .\setup-admin.ps1 -Uid "YOUR_UID_HERE" -Email "owner@test.com" -Name "Test Owner"
   ```
   
   OR manually add to Firestore:
   - Go to http://localhost:4000/firestore
   - Create collection `users`
   - Add document with UID as ID
   - Fields: `email`, `role: "OWNER"`, `name`

4. **Start Dashboard** (Terminal 3):
   ```powershell
   pnpm -C apps/dashboard dev
   ```

5. **Login**: http://localhost:3000
   - Email: `owner@test.com`
   - Password: `TestPassword123!`

### Test Cases

#### Test 1: Property Form

1. Click "Properties" in sidebar
2. Click "+ Add Property"
3. Observe number inputs:
   - ✅ Should be **empty** (not showing 1, 1, 2, 0)
   - ✅ Should show **placeholders** ("1", "1", "2", "Optional")

4. Try typing in "Bedrooms" field:
   - Type: `3`
   - ✅ Should show: `3` (not `13` or `03`)

5. Clear and retype:
   - Select all and delete
   - Type: `300`
   - ✅ Should show: `300` (not `0300` or `1300`)

6. Fill in the form:
   ```
   Property Name: namaso madikwe
   Location: Lilongwe
   Bedrooms: 3
   Bathrooms: 2
   Maximum Guests: 6
   Nightly Rate: 55000
   Currency: MWK
   ```

7. Click "Save Property"
8. ✅ Should **NOT** get 403 error
9. ✅ Should see success (form closes, property appears in list)
10. Check Firestore (http://localhost:4000/firestore)
    - ✅ Property should exist with correct numeric values (not strings)

#### Test 2: Guest Form

1. Click "Guests" in sidebar
2. Click "+ Add Guest"
3. Observe "Rating" input:
   - ✅ Should be **empty** (not showing 5)
   - ✅ Should show **placeholder** "5"

4. Try typing:
   - Type: `4`
   - ✅ Should show: `4` (not `54`)

5. Fill in the form:
   ```
   Full Name: John Doe
   Email: john@test.com
   Phone: +265123456789
   Source: LOCAL
   Rating: 4
   Notes: Test guest
   ```

6. Click "Save Guest"
7. ✅ Should **NOT** get 403 error
8. ✅ Should see success (form closes, guest appears in list)
9. Check Firestore
    - ✅ Guest should exist with `rating: 4` (number, not string)

#### Test 3: Booking Form

1. Click "Bookings" in sidebar
2. Click "+ Add Booking"
3. Select the guest you created (or create a new one)
4. Select a property
5. Set dates (today and tomorrow)
6. Click "Save Booking"
7. ✅ Should **NOT** get 403 error
8. ✅ Should see success (form closes, booking appears in list)
9. Check Firestore
    - ✅ Booking should exist with correct structure

### Expected Outcomes

✅ **All forms should:**
- Open without errors
- Show empty number inputs with placeholders
- Allow clean typing without concatenation
- Submit successfully without 403 errors
- Create documents in Firestore with correct data types

❌ **You should NOT see:**
- 403 (Forbidden) errors in console
- Number concatenation (0300, 1300, etc.)
- Pre-filled number values that can't be cleared
- Form submission failures

## Troubleshooting

### Still Getting 403 Errors?

**Check 1**: User exists in Auth
```
Go to: http://localhost:9099/auth
Verify your user is listed
```

**Check 2**: User has role in Firestore
```
Go to: http://localhost:4000/firestore
Open 'users' collection
Find document with your UID
Verify 'role' field = "OWNER"
```

**Check 3**: UID matches
```
The document ID in Firestore must EXACTLY match the UID in Auth
```

**Check 4**: Re-run setup script
```powershell
.\setup-admin.ps1 -Uid "YOUR_UID" -Email "owner@test.com"
```

### Number Inputs Still Showing Default Values?

**Check**: Dashboard is running latest code
```powershell
# Stop the dashboard (Ctrl+C in Terminal 3)
# Restart it
pnpm -C apps/dashboard dev
```

**Check**: Browser cache
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or open in incognito/private window

### Form Submits But Data is Wrong?

**Check Firestore**: http://localhost:4000/firestore
- Click on the collection (properties, guests, bookings)
- Check the document fields
- Numbers should be stored as numbers, not strings

## Success Criteria

All todos completed when:
- [x] User has OWNER role in Firestore
- [x] Property form uses string state with placeholders
- [x] Guest form uses string state with placeholders  
- [x] Booking form reviewed (no numeric inputs)
- [ ] **Manual testing confirms all forms work correctly**

## Next Steps After Testing

If all tests pass:
1. Consider adding validation (e.g., min bedrooms = 1)
2. Add loading states to form inputs
3. Consider adding tooltips for better UX
4. Add E2E tests to automate this testing

If tests fail:
1. Check console for errors
2. Verify emulators are running
3. Check Firestore rules
4. Review the implementation guide above

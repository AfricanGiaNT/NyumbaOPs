# Quick Test Guide - Airbnb Calendar Sync

## ✅ Implementation Complete!

The Airbnb calendar sync feature has been fully implemented and integrated into your Firebase Functions API.

## 🚀 How to Test

### Step 1: Start Emulators

```powershell
.\start-emulators.ps1
```

Wait for the emulators to start. You'll see:
- Functions running at http://localhost:5001
- Firestore at http://localhost:8080
- UI at http://localhost:4000

### Step 2: Run the Test Script

```powershell
.\test-sync.ps1
```

This will:
1. ✅ Check if emulators are running
2. ✅ Create a calendar sync configuration
3. ✅ Trigger sync with your real Airbnb iCal URL
4. ✅ Import actual Airbnb bookings
5. ✅ Show results (events imported, skipped, conflicts)

### Step 3: View Results

Open the Emulator UI: **http://localhost:4000**

Check these Firestore collections:
- **`calendar_syncs`** - Your sync configuration
- **`bookings`** - Imported Airbnb bookings (look for `isSyncedBooking: true`)
- **`guests`** - Airbnb guests (named "Airbnb Guest - {CODE}")
- **`calendar_sync_logs`** - Sync history with timestamps

## 📋 API Endpoints Available

All endpoints are under the main `/api` function:

```
POST   /v1/calendar-syncs                    - Create sync config
GET    /v1/calendar-syncs                    - List all syncs
GET    /v1/calendar-syncs/:propertyId        - Get sync + logs
PATCH  /v1/calendar-syncs/:propertyId        - Update sync
DELETE /v1/calendar-syncs/:propertyId        - Delete sync
POST   /v1/calendar-syncs/:propertyId/sync   - Trigger manual sync
```

## 🔍 What to Expect

**Expected Test Output:**
```
✓ Emulators running
✓ Calendar sync created
✓ Sync completed!
Events imported: 5
Events skipped: 2
Conflicts resolved: 0
Duration: 2341ms
```

**In Firestore:**
- New bookings with `source: "AIRBNB"`
- Guests with names like "Airbnb Guest - ABC123"
- Sync logs showing success/failure

## ⚙️ Automatic Sync

The `scheduledCalendarSync` function runs **every 30 minutes** automatically once deployed to production.

For local testing, you can manually trigger syncs using the test script.

## 🎯 Key Features Implemented

✅ **iCal Parsing** - Fetches and parses Airbnb calendar feeds  
✅ **Conflict Resolution** - Airbnb bookings override local bookings  
✅ **Guest Creation** - Auto-creates guests with confirmation codes  
✅ **Future Bookings Only** - Only imports bookings with checkout >= today  
✅ **Booking Updates** - Updates existing bookings if dates change  
✅ **Sync Logging** - Complete history of all sync operations  
✅ **Calendar Blocking** - Synced bookings block availability  

## 🐛 Troubleshooting

**"Emulators not running"**
- Start emulators: `.\start-emulators.ps1`
- Wait for UI to be available at http://localhost:4000

**"Property not found"**
- The test creates a test property automatically
- Or use an existing property ID from Firestore

**"No events imported"**
- Check if your Airbnb calendar has future bookings
- Verify the iCal URL is still valid
- Check function logs in the emulator terminal

## 📦 Deployment to Production

When ready to deploy to production:

```powershell
cd functions
npm run build
firebase deploy --only functions
```

This will deploy:
- Main `api` function (with calendar sync routes)
- `scheduledCalendarSync` function (runs every 30 minutes)
- `expireInquiries` function (existing)

## 🎉 You're All Set!

Just run `.\test-sync.ps1` to see the calendar sync in action!

The script will fetch real bookings from your Airbnb calendar and import them into the emulator.

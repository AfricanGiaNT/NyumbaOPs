# Testing Airbnb Calendar Sync

## Prerequisites

1. Get a property ID from your Firestore database
2. Your Airbnb iCal URL: `https://www.airbnb.com/calendar/ical/1302977127776391705.ics?t=8995afbaaa4d47a88983f1366ff8abfe`

## Option 1: Automated Test Script (Easiest)

### Step 1: Get a Property ID

Go to Firebase Console → Firestore → `properties` collection → Copy any document ID

Or check your dashboard at http://localhost:3000 and note a property ID.

### Step 2: Update the test script

Edit `test-calendar-sync.ps1` line 10:
```powershell
$PROPERTY_ID = "YOUR-ACTUAL-PROPERTY-ID-HERE"
```

### Step 3: Run the test

```powershell
.\test-calendar-sync.ps1
```

Expected output:
```
✓ Calendar sync created successfully!
✓ Sync completed!
Events Imported: 5
Events Skipped: 2
Conflicts Resolved: 0
Duration: 2341ms
```

## Option 2: Manual Testing with cURL/PowerShell

### Step 1: Create Calendar Sync

```powershell
$body = @{
    propertyId = "YOUR-PROPERTY-ID"
    platform = "AIRBNB"
    icalUrl = "https://www.airbnb.com/calendar/ical/1302977127776391705.ics?t=8995afbaaa4d47a88983f1366ff8abfe"
    isEnabled = $true
    syncFrequency = 30
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://us-central1-nyumbaops.cloudfunctions.net/createCalendarSync" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### Step 2: Trigger Manual Sync

```powershell
Invoke-RestMethod -Uri "https://us-central1-nyumbaops.cloudfunctions.net/triggerSync/YOUR-PROPERTY-ID/sync" `
    -Method POST
```

### Step 3: Check Sync Status

```powershell
Invoke-RestMethod -Uri "https://us-central1-nyumbaops.cloudfunctions.net/getCalendarSync/YOUR-PROPERTY-ID" `
    -Method GET
```

### Step 4: List All Syncs

```powershell
Invoke-RestMethod -Uri "https://us-central1-nyumbaops.cloudfunctions.net/getCalendarSyncs" `
    -Method GET
```

## Option 3: Test via Firestore Console

### Step 1: Create Calendar Sync Document

1. Go to: https://console.firebase.google.com/project/nyumbaops/firestore
2. Navigate to `calendar_syncs` collection (create if doesn't exist)
3. Add document with ID = your property ID
4. Add fields:
   ```
   propertyId: "your-property-id"
   platform: "AIRBNB"
   icalUrl: "https://www.airbnb.com/calendar/ical/1302977127776391705.ics?t=8995afbaaa4d47a88983f1366ff8abfe"
   isEnabled: true
   syncFrequency: 30
   lastSyncAt: null
   lastSyncStatus: null
   lastSyncError: null
   createdAt: (current timestamp)
   updatedAt: (current timestamp)
   ```

### Step 2: Trigger Sync via Function

```powershell
Invoke-RestMethod -Uri "https://us-central1-nyumbaops.cloudfunctions.net/triggerSync/YOUR-PROPERTY-ID/sync" `
    -Method POST
```

### Step 3: Verify Results

Check these Firestore collections:
- `bookings` - Should have new Airbnb bookings with `isSyncedBooking: true`
- `guests` - Should have guests named "Airbnb Guest - {CODE}"
- `calendar_sync_logs` - Should have sync log entries

## What to Check After Sync

### 1. Bookings Collection
Look for new bookings with:
- `source: "AIRBNB"`
- `isSyncedBooking: true`
- `externalId: "some-uid"`
- `status: "CONFIRMED"`
- Guest name like "Airbnb Guest - ABC123"

### 2. Guests Collection
Look for guests with:
- `name: "Airbnb Guest - {CODE}"`
- `source: "AIRBNB"`
- Notes containing confirmation code

### 3. Calendar Sync Logs
Check `calendar_sync_logs` collection for:
- `status: "SUCCESS"` or "FAILED"`
- `eventsImported: number`
- `eventsSkipped: number`
- `syncDuration: milliseconds`

### 4. Calendar Sync Status
Check `calendar_syncs` document:
- `lastSyncAt` should be updated
- `lastSyncStatus` should be "SUCCESS"
- `lastSyncError` should be null

## Troubleshooting

### "Property not found" error
- Make sure you're using a valid property ID from your Firestore `properties` collection

### "Calendar sync already exists"
- Delete the existing document from `calendar_syncs` collection first
- Or use the update endpoint instead

### "Invalid iCal URL"
- Ensure URL starts with `https://`
- Ensure URL ends with `.ics`
- Verify the Airbnb URL is still valid

### No events imported
- Check if there are future bookings in your Airbnb calendar
- Verify the iCal URL is correct and accessible
- Check `calendar_sync_logs` for error messages

### Sync fails
- Check Firebase Functions logs: https://console.firebase.google.com/project/nyumbaops/functions/logs
- Look for error messages in the logs
- Verify all required APIs are enabled

## Scheduled Sync

The `scheduledCalendarSync` function runs automatically every 30 minutes. To verify it's working:

1. Check Firebase Functions logs for scheduled runs
2. Monitor `calendar_sync_logs` collection for automatic sync entries
3. Verify `lastSyncAt` updates every 30 minutes

## Next Steps After Successful Test

1. ✅ Verify bookings appear in your dashboard
2. ✅ Check that dates are blocked on public website
3. ✅ Test conflict resolution by creating a local booking that overlaps
4. ✅ Configure calendar sync for all your properties
5. ✅ Monitor scheduled syncs over the next few hours

## Firebase Console Links

- Firestore: https://console.firebase.google.com/project/nyumbaops/firestore
- Functions: https://console.firebase.google.com/project/nyumbaops/functions
- Logs: https://console.firebase.google.com/project/nyumbaops/functions/logs

## Support

If you encounter issues:
1. Check the function logs in Firebase Console
2. Review the `calendar_sync_logs` collection
3. Verify your Airbnb iCal URL is still valid
4. Ensure the property exists in Firestore

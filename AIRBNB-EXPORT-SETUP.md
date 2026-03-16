# How to Export Your Calendar to Airbnb

## Overview

To prevent double bookings, you need to set up **bidirectional sync**:
1. ✅ **Import from Airbnb** - Already implemented! (Airbnb → Your site)
2. ✅ **Export to Airbnb** - Now available! (Your site → Airbnb)

This ensures Airbnb knows about your local bookings and won't accept reservations for dates you've already booked.

## Step-by-Step Guide

### 1. Get Your Export URL

Each property has its own iCal export URL. The format is:

**Local (Emulator):**
```
http://localhost:5001/nyumbaops/us-central1/api/v1/public/ical/YOUR-PROPERTY-ID
```

**Production:**
```
https://us-central1-nyumbaops.cloudfunctions.net/api/v1/public/ical/YOUR-PROPERTY-ID
```

Replace `YOUR-PROPERTY-ID` with your actual property ID from Firestore.

### 2. Add to Airbnb

1. Go to your Airbnb calendar
2. Click on **"Availability settings"**
3. Scroll to **"Calendar sync"**
4. Click **"Import calendar"**
5. Paste your iCal URL (the one ending in `.ics`)
6. Give it a name (e.g., "NyumbaOps Bookings")
7. Click **"Import calendar"**

### 3. Verify It's Working

After importing:
- Airbnb will fetch your calendar every few hours
- Your local bookings will appear as "blocked" dates on Airbnb
- Airbnb won't accept new reservations for those dates

## What Gets Exported

The iCal feed includes:
- ✅ All **CONFIRMED** bookings
- ✅ All **CHECKED_IN** bookings
- ✅ Guest names (shown as "Reserved - Guest Name")
- ✅ Booking dates (check-in to check-out)
- ✅ Booking status

**Not included:**
- ❌ PENDING bookings (not yet confirmed)
- ❌ CANCELLED bookings
- ❌ COMPLETED bookings (past dates)

## Testing Your Export URL

### Local Testing (Emulator)

1. Make sure emulators are running
2. Open in browser or use curl:

```powershell
# Browser
Start-Process "http://localhost:5001/nyumbaops/us-central1/api/v1/public/ical/test-property-airbnb"

# Or with curl
curl http://localhost:5001/nyumbaops/us-central1/api/v1/public/ical/test-property-airbnb
```

You should see iCal format output like:
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NyumbaOps//Calendar Sync//EN
...
BEGIN:VEVENT
UID:booking-id@nyumbaops.com
DTSTART;VALUE=DATE:20260210
DTEND;VALUE=DATE:20260215
SUMMARY:Reserved - Guest Name
...
END:VEVENT
...
END:VCALENDAR
```

### Production Testing

After deployment:
```powershell
curl https://us-central1-nyumbaops.cloudfunctions.net/api/v1/public/ical/YOUR-PROPERTY-ID
```

## Complete Bidirectional Sync Setup

### For Each Property:

**Step 1: Import from Airbnb (Airbnb → Your Site)**
1. Get your Airbnb iCal URL from Airbnb calendar settings
2. Use the test script or dashboard to create sync config:
   ```powershell
   .\test-simple.ps1
   ```
3. Your site will fetch Airbnb bookings every 30 minutes

**Step 2: Export to Airbnb (Your Site → Airbnb)**
1. Get your property ID from Firestore
2. Build your export URL:
   ```
   https://us-central1-nyumbaops.cloudfunctions.net/api/v1/public/ical/YOUR-PROPERTY-ID
   ```
3. Add this URL to Airbnb calendar sync (Import calendar)
4. Airbnb will fetch your bookings every few hours

## Security Notes

- ✅ The export URL is **public** (no authentication required)
- ✅ This is standard for iCal feeds (same as Airbnb's export)
- ✅ Only shows booking dates and guest names (no sensitive data)
- ✅ Property ID is not guessable (random UUID)

## Troubleshooting

### "No events in calendar"
- Check if you have CONFIRMED bookings in Firestore
- Verify the property ID is correct
- Check the booking dates are in the future

### "Airbnb says invalid URL"
- Ensure URL starts with `https://` (not `http://`)
- Verify the URL ends with the property ID
- Test the URL in a browser first

### "Bookings not showing on Airbnb"
- Airbnb updates imported calendars every 3-24 hours
- Wait a few hours after adding the URL
- Check Airbnb's calendar sync settings for errors

## Example URLs

**Property ID:** `abc123-def456-ghi789`

**Local (Emulator):**
```
http://localhost:5001/nyumbaops/us-central1/api/v1/public/ical/abc123-def456-ghi789
```

**Production:**
```
https://us-central1-nyumbaops.cloudfunctions.net/api/v1/public/ical/abc123-def456-ghi789
```

## Next Steps

1. ✅ Deploy functions to production: `firebase deploy --only functions`
2. ✅ Get your property IDs from Firestore
3. ✅ Build export URLs for each property
4. ✅ Add URLs to Airbnb calendar sync
5. ✅ Wait 3-6 hours for Airbnb to fetch
6. ✅ Verify bookings appear as blocked on Airbnb

## Support

If you have issues:
1. Test the export URL in a browser
2. Check Firestore for CONFIRMED bookings
3. Verify property ID is correct
4. Check Airbnb's calendar sync error messages

---

**You now have complete bidirectional sync!** 🎉

- Airbnb bookings → Your site (every 30 minutes)
- Your bookings → Airbnb (every 3-24 hours)

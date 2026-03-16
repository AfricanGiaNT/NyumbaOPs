# Simple Calendar Sync Test for Local Emulators
# Make sure emulators are running first!

$BASE_URL = "http://localhost:5001/nyumbaops/us-central1/api"
$PROPERTY_ID = "test-property-airbnb"
$ICAL_URL = "https://www.airbnb.com/calendar/ical/1302977127776391705.ics?t=8995afbaaa4d47a88983f1366ff8abfe"

Write-Host "`n=== Calendar Sync Test ===" -ForegroundColor Cyan
Write-Host "Emulator URL: $BASE_URL`n" -ForegroundColor Yellow

# Check emulators
Write-Host "Checking emulators..." -ForegroundColor Green
try {
    Invoke-RestMethod -Uri "http://localhost:4000" -TimeoutSec 2 | Out-Null
    Write-Host "OK - Emulators running`n" -ForegroundColor Green
} catch {
    Write-Host "ERROR - Start emulators first: .\start-emulators.ps1`n" -ForegroundColor Red
    exit 1
}

# Step 1: Create sync config
Write-Host "Step 1: Creating calendar sync..." -ForegroundColor Cyan
$body = @{
    propertyId = $PROPERTY_ID
    platform = "AIRBNB"
    icalUrl = $ICAL_URL
    isEnabled = $true
    syncFrequency = 30
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "$BASE_URL/createCalendarSync" -Method POST -ContentType "application/json" -Body $body
    Write-Host "SUCCESS - Calendar sync created" -ForegroundColor Green
    Write-Host "Property: $PROPERTY_ID`n" -ForegroundColor Gray
} catch {
    Write-Host "FAILED - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
    Write-Host ""
}

# Step 2: Trigger sync
Write-Host "Step 2: Syncing with Airbnb..." -ForegroundColor Cyan
Write-Host "This will fetch real Airbnb bookings...`n" -ForegroundColor Yellow
try {
    $syncResult = Invoke-RestMethod -Uri "$BASE_URL/triggerSync/$PROPERTY_ID/sync" -Method POST -TimeoutSec 30
    Write-Host "SUCCESS - Sync completed!" -ForegroundColor Green
    Write-Host "Events imported: $($syncResult.data.eventsImported)" -ForegroundColor Gray
    Write-Host "Events skipped: $($syncResult.data.eventsSkipped)" -ForegroundColor Gray
    Write-Host "Conflicts resolved: $($syncResult.data.conflictsResolved)" -ForegroundColor Gray
    Write-Host "Duration: $($syncResult.data.duration)ms`n" -ForegroundColor Gray
} catch {
    Write-Host "FAILED - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
    Write-Host ""
}

# Step 3: Get status
Write-Host "Step 3: Getting sync status..." -ForegroundColor Cyan
try {
    $status = Invoke-RestMethod -Uri "$BASE_URL/getCalendarSync/$PROPERTY_ID" -Method GET
    Write-Host "SUCCESS - Status retrieved" -ForegroundColor Green
    Write-Host "Platform: $($status.data.platform)" -ForegroundColor Gray
    Write-Host "Enabled: $($status.data.isEnabled)" -ForegroundColor Gray
    Write-Host "Last sync: $($status.data.lastSyncAt)" -ForegroundColor Gray
    Write-Host "Status: $($status.data.lastSyncStatus)`n" -ForegroundColor Gray
} catch {
    Write-Host "FAILED - $($_.Exception.Message)`n" -ForegroundColor Red
}

# Step 4: List all syncs
Write-Host "Step 4: Listing all syncs..." -ForegroundColor Cyan
try {
    $list = Invoke-RestMethod -Uri "$BASE_URL/getCalendarSyncs" -Method GET
    Write-Host "SUCCESS - Found $($list.data.Count) sync(s)`n" -ForegroundColor Green
} catch {
    Write-Host "FAILED - $($_.Exception.Message)`n" -ForegroundColor Red
}

Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host "`nNext: Check Emulator UI at http://localhost:4000" -ForegroundColor Yellow
Write-Host "Look for:" -ForegroundColor White
Write-Host "  - bookings collection (Airbnb bookings)" -ForegroundColor Gray
Write-Host "  - guests collection (Airbnb guests)" -ForegroundColor Gray
Write-Host "  - calendar_sync_logs collection (sync history)`n" -ForegroundColor Gray

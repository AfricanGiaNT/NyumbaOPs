# Test Calendar Sync - NyumbaOps (Local Emulators)
# This script tests the Airbnb calendar synchronization feature

$PROJECT_ID = "nyumbaops"
$BASE_URL = "http://localhost:5001/$PROJECT_ID/us-central1"

# Your Airbnb iCal URL
$AIRBNB_ICAL_URL = "https://www.airbnb.com/calendar/ical/1302977127776391705.ics?t=8995afbaaa4d47a88983f1366ff8abfe"

# Test property ID (replace with an actual property ID from your Firestore)
$PROPERTY_ID = "test-property-1"

Write-Host "`n=== Testing Calendar Sync ===" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID" -ForegroundColor Yellow
Write-Host "Property ID: $PROPERTY_ID" -ForegroundColor Yellow
Write-Host ""

# Step 1: Create Calendar Sync Configuration
Write-Host "Step 1: Creating calendar sync configuration..." -ForegroundColor Green
$createBody = @{
    propertyId = $PROPERTY_ID
    platform = "AIRBNB"
    icalUrl = $AIRBNB_ICAL_URL
    isEnabled = $true
    syncFrequency = 30
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$BASE_URL/createCalendarSync" `
        -Method POST `
        -ContentType "application/json" `
        -Body $createBody
    
    Write-Host "✓ Calendar sync created successfully!" -ForegroundColor Green
    Write-Host ($createResponse | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "✗ Failed to create calendar sync" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

Write-Host "`n---`n"

# Step 2: Trigger Manual Sync
Write-Host "Step 2: Triggering manual sync..." -ForegroundColor Green
try {
    $syncResponse = Invoke-RestMethod -Uri "$BASE_URL/triggerSync/$PROPERTY_ID/sync" `
        -Method POST `
        -ContentType "application/json"
    
    Write-Host "✓ Sync completed!" -ForegroundColor Green
    Write-Host "Events Imported: $($syncResponse.data.eventsImported)" -ForegroundColor Cyan
    Write-Host "Events Skipped: $($syncResponse.data.eventsSkipped)" -ForegroundColor Cyan
    Write-Host "Conflicts Resolved: $($syncResponse.data.conflictsResolved)" -ForegroundColor Cyan
    Write-Host "Duration: $($syncResponse.data.duration)ms" -ForegroundColor Cyan
    
    if ($syncResponse.data.error) {
        Write-Host "Error: $($syncResponse.data.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Failed to trigger sync" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

Write-Host "`n---`n"

# Step 3: Get Calendar Sync Status
Write-Host "Step 3: Getting calendar sync status..." -ForegroundColor Green
try {
    $statusResponse = Invoke-RestMethod -Uri "$BASE_URL/getCalendarSync/$PROPERTY_ID" `
        -Method GET
    
    Write-Host "✓ Calendar sync status retrieved!" -ForegroundColor Green
    Write-Host "Platform: $($statusResponse.data.platform)" -ForegroundColor Cyan
    Write-Host "Enabled: $($statusResponse.data.isEnabled)" -ForegroundColor Cyan
    Write-Host "Last Sync: $($statusResponse.data.lastSyncAt)" -ForegroundColor Cyan
    Write-Host "Last Status: $($statusResponse.data.lastSyncStatus)" -ForegroundColor Cyan
    
    if ($statusResponse.data.syncLogs) {
        Write-Host "`nRecent Sync Logs:" -ForegroundColor Yellow
        $statusResponse.data.syncLogs | ForEach-Object {
            Write-Host "  - $($_.createdAt): $($_.status) ($($_.eventsImported) imported, $($_.eventsSkipped) skipped)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "✗ Failed to get status" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n---`n"

# Step 4: List All Calendar Syncs
Write-Host "Step 4: Listing all calendar syncs..." -ForegroundColor Green
try {
    $listResponse = Invoke-RestMethod -Uri "$BASE_URL/getCalendarSyncs" `
        -Method GET
    
    Write-Host "✓ Found $($listResponse.data.Count) calendar sync(s)" -ForegroundColor Green
    $listResponse.data | ForEach-Object {
        Write-Host "  - Property: $($_.propertyId) | Platform: $($_.platform) | Enabled: $($_.isEnabled)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "✗ Failed to list syncs" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n=== Testing Complete ===" -ForegroundColor Cyan
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Check Firestore Console for 'bookings' and 'guests' collections" -ForegroundColor White
Write-Host "2. Verify that Airbnb bookings were imported" -ForegroundColor White
Write-Host "3. Check 'calendar_sync_logs' collection for sync history" -ForegroundColor White
Write-Host "4. Test on your dashboard UI" -ForegroundColor White
Write-Host "`nFirestore Console: https://console.firebase.google.com/project/$PROJECT_ID/firestore" -ForegroundColor Cyan

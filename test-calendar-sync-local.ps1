# Test Calendar Sync - Local Emulators
# Make sure emulators are running: .\start-emulators.ps1

$PROJECT_ID = "nyumbaops"
$BASE_URL = "http://localhost:5001/$PROJECT_ID/us-central1"

# Your Airbnb iCal URL
$AIRBNB_ICAL_URL = "https://www.airbnb.com/calendar/ical/1302977127776391705.ics?t=8995afbaaa4d47a88983f1366ff8abfe"

# Test property ID - you can use any ID, emulator will work with it
$PROPERTY_ID = "test-property-airbnb-sync"

Write-Host "`n=== Testing Calendar Sync (Local Emulators) ===" -ForegroundColor Cyan
Write-Host "Emulator URL: $BASE_URL" -ForegroundColor Yellow
Write-Host "Property ID: $PROPERTY_ID" -ForegroundColor Yellow
Write-Host ""

# Check if emulators are running
Write-Host "Checking if emulators are running..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:4000" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✓ Emulators are running!" -ForegroundColor Green
} catch {
    Write-Host "✗ Emulators are NOT running!" -ForegroundColor Red
    Write-Host "Please start emulators first: .\start-emulators.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 0: Create a test property first (if needed)
Write-Host "Step 0: Creating test property in emulator..." -ForegroundColor Green
$propertyBody = @{
    name = "Test Property for Airbnb Sync"
    address = "123 Test Street"
    city = "Nairobi"
    status = "ACTIVE"
    pricePerNight = 5000
    currency = "KES"
} | ConvertTo-Json

try {
    # Check if property exists first
    $existingProperty = Invoke-RestMethod -Uri "http://localhost:5001/$PROJECT_ID/us-central1/api/v1/properties/$PROPERTY_ID" `
        -Method GET `
        -ErrorAction SilentlyContinue
    
    Write-Host "✓ Property already exists" -ForegroundColor Green
} catch {
    Write-Host "Creating new test property..." -ForegroundColor Yellow
    # Property doesn't exist, we'll create it via Firestore directly or skip
    Write-Host "Note: You may need to create a property manually in Firestore emulator" -ForegroundColor Yellow
}

Write-Host "`n---`n"

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
Write-Host "Step 2: Triggering manual sync (this will fetch real Airbnb data)..." -ForegroundColor Green
Write-Host "This may take a few seconds..." -ForegroundColor Yellow
try {
    $syncResponse = Invoke-RestMethod -Uri "$BASE_URL/triggerSync/$PROPERTY_ID/sync" `
        -Method POST `
        -ContentType "application/json" `
        -TimeoutSec 30
    
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
            $logEntry = "  - $($_.createdAt): $($_.status) ($($_.eventsImported) events imported, $($_.eventsSkipped) events skipped)"
            Write-Host $logEntry -ForegroundColor Gray
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
Write-Host "1. Open Emulator UI: http://localhost:4000" -ForegroundColor White
Write-Host "2. Check Firestore → 'bookings' collection for imported Airbnb bookings" -ForegroundColor White
Write-Host "3. Check Firestore → 'guests' collection for Airbnb guests" -ForegroundColor White
Write-Host "4. Check Firestore → 'calendar_sync_logs' for sync history" -ForegroundColor White
Write-Host "5. Check Firestore → 'calendar_syncs' for sync configuration" -ForegroundColor White
Write-Host "`nEmulator UI: http://localhost:4000" -ForegroundColor Cyan
Write-Host "Functions Logs: Check the terminal where emulators are running" -ForegroundColor Cyan

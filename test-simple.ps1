# Simple Test - No Auth Required (Public Test Endpoint)

$PROPERTY_ID = "test-property-airbnb"
$ICAL_URL = "https://www.airbnb.com/calendar/ical/1302977127776391705.ics?t=8995afbaaa4d47a88983f1366ff8abfe"
$API_URL = "http://localhost:5001/nyumbaops/us-central1/api/v1/public/test/calendar-sync"

Write-Host "`n=== Simple Calendar Sync Test ===" -ForegroundColor Cyan
Write-Host "This will create sync config and import Airbnb bookings`n" -ForegroundColor Yellow

$body = @{
    propertyId = $PROPERTY_ID
    icalUrl = $ICAL_URL
} | ConvertTo-Json

Write-Host "Syncing with Airbnb calendar..." -ForegroundColor Green
Write-Host "This may take 10-30 seconds...`n" -ForegroundColor Gray

try {
    $result = Invoke-RestMethod -Uri $API_URL -Method POST -ContentType "application/json" -Body $body -TimeoutSec 60
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Events imported: $($result.data.eventsImported)" -ForegroundColor Cyan
    Write-Host "Events skipped: $($result.data.eventsSkipped)" -ForegroundColor Cyan
    Write-Host "Conflicts resolved: $($result.data.conflictsResolved)" -ForegroundColor Cyan
    Write-Host "Duration: $($result.data.duration)ms`n" -ForegroundColor Cyan
    
    if ($result.data.error) {
        Write-Host "Error: $($result.data.error)" -ForegroundColor Red
    }
    
    Write-Host "`n=== Check Results ===" -ForegroundColor Yellow
    Write-Host "Open Emulator UI: http://localhost:4000" -ForegroundColor White
    Write-Host "`nCheck these collections:" -ForegroundColor White
    Write-Host "  - bookings (Airbnb bookings with isSyncedBooking=true)" -ForegroundColor Gray
    Write-Host "  - guests (Airbnb Guest - {CODE})" -ForegroundColor Gray
    Write-Host "  - calendar_syncs (sync configuration)" -ForegroundColor Gray
    Write-Host "  - calendar_sync_logs (sync history)`n" -ForegroundColor Gray
    
} catch {
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
    Write-Host "`nMake sure emulators are running: .\start-emulators.ps1`n" -ForegroundColor Yellow
}

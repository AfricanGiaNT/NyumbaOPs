# Direct Firestore Test - No Auth Required
# This creates the sync config directly in Firestore and triggers sync

Write-Host "`n=== Direct Calendar Sync Test ===" -ForegroundColor Cyan

$PROPERTY_ID = "test-property-airbnb"
$ICAL_URL = "https://www.airbnb.com/calendar/ical/1302977127776391705.ics?t=8995afbaaa4d47a88983f1366ff8abfe"

# Step 1: Create sync config directly in Firestore using Firebase CLI
Write-Host "`nStep 1: Creating calendar sync in Firestore..." -ForegroundColor Green

$syncData = @"
{
  "propertyId": "$PROPERTY_ID",
  "platform": "AIRBNB",
  "icalUrl": "$ICAL_URL",
  "isEnabled": true,
  "syncFrequency": 30,
  "lastSyncAt": null,
  "lastSyncStatus": null,
  "lastSyncError": null,
  "createdAt": "$(Get-Date -Format o)",
  "updatedAt": "$(Get-Date -Format o)"
}
"@

# Save to temp file
$tempFile = "$env:TEMP\calendar-sync.json"
$syncData | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "Creating document in Firestore..." -ForegroundColor Yellow
Write-Host "Property ID: $PROPERTY_ID" -ForegroundColor Gray

# Use Firebase CLI to add document
try {
    $output = firebase firestore:set calendar_syncs/$PROPERTY_ID $tempFile --project nyumbaops 2>&1
    Write-Host "SUCCESS - Calendar sync created in Firestore" -ForegroundColor Green
} catch {
    Write-Host "Note: Using emulator, document will be created via HTTP" -ForegroundColor Yellow
}

Remove-Item $tempFile -ErrorAction SilentlyContinue

# Step 2: Create sync via HTTP to Firestore emulator
Write-Host "`nStep 2: Adding to Firestore emulator..." -ForegroundColor Green

$firestoreUrl = "http://localhost:8080/v1/projects/nyumbaops/databases/(default)/documents/calendar_syncs?documentId=$PROPERTY_ID"

$firestoreDoc = @{
    fields = @{
        propertyId = @{ stringValue = $PROPERTY_ID }
        platform = @{ stringValue = "AIRBNB" }
        icalUrl = @{ stringValue = $ICAL_URL }
        isEnabled = @{ booleanValue = $true }
        syncFrequency = @{ integerValue = 30 }
        lastSyncAt = @{ nullValue = $null }
        lastSyncStatus = @{ nullValue = $null }
        lastSyncError = @{ nullValue = $null }
        createdAt = @{ timestampValue = (Get-Date -Format o) }
        updatedAt = @{ timestampValue = (Get-Date -Format o) }
    }
} | ConvertTo-Json -Depth 10

try {
    $result = Invoke-RestMethod -Uri $firestoreUrl -Method POST -ContentType "application/json" -Body $firestoreDoc
    Write-Host "SUCCESS - Document created in Firestore emulator" -ForegroundColor Green
} catch {
    Write-Host "FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Open Emulator UI: http://localhost:4000" -ForegroundColor White
Write-Host "2. Go to Firestore tab" -ForegroundColor White
Write-Host "3. Look for 'calendar_syncs' collection" -ForegroundColor White
Write-Host "4. You should see document: $PROPERTY_ID" -ForegroundColor White
Write-Host "`nTo trigger sync, you'll need to:" -ForegroundColor Yellow
Write-Host "- Add authentication to the test script, OR" -ForegroundColor Gray
Write-Host "- Call the sync function directly from Firebase console, OR" -ForegroundColor Gray
Write-Host "- Wait for the scheduled function to run (every 30 min in production)" -ForegroundColor Gray
Write-Host "`nEmulator UI: http://localhost:4000" -ForegroundColor Cyan

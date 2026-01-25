# Export Emulator Data Script
# Run this while emulators are RUNNING to manually export current state

Write-Host "📦 Exporting emulator data..." -ForegroundColor Cyan
Write-Host ""

# Check if emulators are running
$emulatorsRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000" -TimeoutSec 2 -ErrorAction SilentlyContinue
    $emulatorsRunning = $true
} catch {
    $emulatorsRunning = $false
}

if (-not $emulatorsRunning) {
    Write-Host "❌ Emulators are not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Start emulators first with:" -ForegroundColor Yellow
    Write-Host "  .\start-emulators.ps1" -ForegroundColor Gray
    exit 1
}

# Export data
firebase emulators:export ./emulator-data --force --project nyumbaops

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Export complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Data saved to:" -ForegroundColor Cyan
    Write-Host "  ./emulator-data/" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ Export failed!" -ForegroundColor Red
}

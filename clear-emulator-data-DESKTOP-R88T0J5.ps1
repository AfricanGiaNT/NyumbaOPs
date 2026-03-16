# Clear Emulator Data Script
# Run this to delete all saved emulator data and start fresh

Write-Host "🗑️  Clearing emulator data..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path "./emulator-data") {
    # Show warning
    Write-Host "⚠️  This will delete all saved emulator data:" -ForegroundColor Yellow
    Write-Host "  - Auth users" -ForegroundColor Gray
    Write-Host "  - Firestore documents" -ForegroundColor Gray
    Write-Host "  - Storage files" -ForegroundColor Gray
    Write-Host ""
    
    $confirmation = Read-Host "Are you sure? Type 'yes' to confirm"
    
    if ($confirmation -eq "yes") {
        Remove-Item -Recurse -Force ./emulator-data
        Write-Host ""
        Write-Host "✅ Emulator data cleared!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Restart emulators: .\start-emulators.ps1" -ForegroundColor Gray
        Write-Host "  2. Seed fresh data: .\seed-emulators.ps1" -ForegroundColor Gray
        Write-Host "  3. Create admin user: .\setup-admin.ps1" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "❌ Cancelled. No data was deleted." -ForegroundColor Red
    }
} else {
    Write-Host "ℹ️  No emulator data to clear." -ForegroundColor Gray
    Write-Host ""
    Write-Host "The ./emulator-data/ directory doesn't exist yet." -ForegroundColor Gray
}

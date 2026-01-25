# Seed Database Script for Firebase Emulators
# Run this AFTER starting emulators

Write-Host "Seeding Firebase Emulators..." -ForegroundColor Green

# Set emulator environment variables
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
$env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"

Write-Host "Emulator hosts configured" -ForegroundColor Green
Write-Host "  - Firestore: $env:FIRESTORE_EMULATOR_HOST" -ForegroundColor Gray
Write-Host "  - Auth: $env:FIREBASE_AUTH_EMULATOR_HOST" -ForegroundColor Gray
Write-Host ""

# Run seed script
Write-Host "Running seed script..." -ForegroundColor Yellow
pnpm -C functions run seed

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Database seeded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Create test user at: http://localhost:9099/auth" -ForegroundColor Gray
    Write-Host "  2. Add user role in Firestore: http://localhost:4000/firestore" -ForegroundColor Gray
    Write-Host "  3. Start dashboard: pnpm -C apps/dashboard dev" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Seeding failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure emulators are running with:" -ForegroundColor Yellow
    Write-Host "  .\start-emulators.ps1" -ForegroundColor Gray
}

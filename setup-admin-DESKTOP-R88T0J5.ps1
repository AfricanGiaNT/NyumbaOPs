# Setup Admin User Script for Firebase Emulators
# Run this AFTER creating a user in the Auth emulator

param(
    [Parameter(Mandatory=$true, HelpMessage="User UID from Firebase Auth")]
    [string]$Uid,
    
    [Parameter(Mandatory=$true, HelpMessage="User email address")]
    [string]$Email,
    
    [Parameter(Mandatory=$false, HelpMessage="User display name")]
    [string]$Name = "Admin User"
)

Write-Host "Setting up admin user in Firestore..." -ForegroundColor Green
Write-Host ""

# Set emulator environment variables
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  UID:   $Uid" -ForegroundColor Gray
Write-Host "  Email: $Email" -ForegroundColor Gray
Write-Host "  Name:  $Name" -ForegroundColor Gray
Write-Host "  Role:  OWNER" -ForegroundColor Gray
Write-Host ""

# Run the TypeScript script
Push-Location functions
try {
    pnpm exec tsx src/scripts/setup-admin-user.ts $Uid $Email $Name
} finally {
    Pop-Location
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Setup complete!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Setup failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. Firebase emulators are running" -ForegroundColor Gray
    Write-Host "  2. User exists in Auth emulator: http://localhost:9099/auth" -ForegroundColor Gray
    Write-Host "  3. UID is correct" -ForegroundColor Gray
}

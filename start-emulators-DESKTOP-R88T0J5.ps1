# Verify Java is available
Write-Host "Checking Java..." -ForegroundColor Cyan
if (Get-Command java -ErrorAction SilentlyContinue) {
    Write-Host "Java found!" -ForegroundColor Green
} else {
    Write-Host "Java not found in PATH. Please restart your terminal or computer." -ForegroundColor Red
    Write-Host "If issue persists, Java may need to be added to PATH manually." -ForegroundColor Yellow
    exit 1
}

# Check for existing emulator data
$importFlag = ""
if (Test-Path "./emulator-data") {
    $importFlag = "--import=./emulator-data"
    Write-Host "`nFound existing emulator data. Importing..." -ForegroundColor Green
} else {
    Write-Host "`nNo existing emulator data found. Starting fresh..." -ForegroundColor Yellow
}

# Start Firebase emulators with import and export-on-exit
Write-Host "`nStarting Firebase emulators..." -ForegroundColor Cyan
firebase emulators:start --project nyumbaops $importFlag --export-on-exit=./emulator-data

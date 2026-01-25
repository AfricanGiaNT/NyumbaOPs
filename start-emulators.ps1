# Set Java path for this session
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21.0.10"
$env:Path += ";C:\Program Files\Java\jdk-21.0.10\bin"

# Verify Java
Write-Host "Checking Java..." -ForegroundColor Cyan
& "C:\Program Files\Java\jdk-21.0.10\bin\java.exe" -version

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

# Setup Admin Password Script
# Run this AFTER applying the SQL migration in Supabase and starting the API
# Usage: .\setup-admin-password.ps1 -Email "you@example.com" -Password "yourpassword"

param(
    [Parameter(Mandatory=$true)]
    [string]$Email,

    [Parameter(Mandatory=$true)]
    [string]$Password,

    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "http://localhost:3000",

    [Parameter(Mandatory=$false)]
    [string]$AdminSecret = "change-me-in-production"
)

Write-Host "Setting up admin password..." -ForegroundColor Green

$body = @{
    email       = $Email
    password    = $Password
    adminSecret = $AdminSecret
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/api/auth/setup-password" -Method POST `
        -ContentType "application/json" -Body $body

    Write-Host ""
    Write-Host "Admin user created/updated successfully!" -ForegroundColor Green
    Write-Host "  ID:    $($response.id)" -ForegroundColor Gray
    Write-Host "  Email: $($response.email)" -ForegroundColor Gray
    Write-Host "  Role:  $($response.role)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You can now log in at the dashboard with:" -ForegroundColor Cyan
    Write-Host "  Email:    $Email" -ForegroundColor Gray
    Write-Host "  Password: (the one you provided)" -ForegroundColor Gray
} catch {
    Write-Host ""
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure the API is running at $ApiUrl" -ForegroundColor Yellow
}

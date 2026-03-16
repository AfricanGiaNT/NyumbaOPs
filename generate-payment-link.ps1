# Generate PayChangu Payment Link
# Creates a payment link for a booking via API

param(
    [Parameter(Mandatory=$true, HelpMessage="Booking ID to generate payment link for")]
    [string]$BookingId,
    
    [Parameter(Mandatory=$true, HelpMessage="Firebase auth token")]
    [string]$AuthToken,
    
    [Parameter(Mandatory=$false)]
    [string]$ApiBaseUrl = "http://localhost:5001/nyumbaops/us-central1/api/v1"
)

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        PayChangu Payment Link Generator                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "$ApiBaseUrl/bookings/$BookingId/payment-link"

Write-Host "Booking ID: $BookingId" -ForegroundColor Gray
Write-Host "API URL: $apiUrl" -ForegroundColor Gray
Write-Host ""

Write-Host "Generating payment link..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $apiUrl `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $AuthToken"
            "Content-Type" = "application/json"
        } `
        -Body "{}"
    
    if ($response.success -eq $true) {
        Write-Host "✓ Payment link generated successfully!" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "Payment Details:" -ForegroundColor Cyan
        Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray
        Write-Host "Payment ID:  $($response.data.paymentId)" -ForegroundColor White
        Write-Host "Amount:      $($response.data.amount)" -ForegroundColor White
        Write-Host "Expires At:  $($response.data.expiresAt)" -ForegroundColor White
        Write-Host ""
        
        Write-Host "Payment Link:" -ForegroundColor Cyan
        Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray
        Write-Host $response.data.checkoutUrl -ForegroundColor Yellow
        Write-Host ""
        
        # Try to copy to clipboard
        try {
            $response.data.checkoutUrl | Set-Clipboard
            Write-Host "✓ Link copied to clipboard!" -ForegroundColor Green
        } catch {
            Write-Host "⚠ Could not copy to clipboard" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Cyan
        Write-Host "  1. Open the link in a browser" -ForegroundColor Gray
        Write-Host "  2. Complete payment using PayChangu sandbox credentials" -ForegroundColor Gray
        Write-Host "  3. Wait for webhook to be received (check Firebase logs)" -ForegroundColor Gray
        Write-Host "  4. Refresh booking page to see payment reflected" -ForegroundColor Gray
        Write-Host ""
        
    } else {
        Write-Host "✗ Failed to generate payment link" -ForegroundColor Red
        Write-Host "Response: $($response | ConvertTo-Json -Depth 5)" -ForegroundColor Gray
        exit 1
    }
    
} catch {
    Write-Host "✗ Error generating payment link" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 401) {
            Write-Host "Error: Unauthorized - Check your auth token" -ForegroundColor Yellow
        } elseif ($statusCode -eq 404) {
            Write-Host "Error: Booking not found - Check booking ID" -ForegroundColor Yellow
        } elseif ($statusCode -eq 400) {
            Write-Host "Error: Bad request - Booking may be fully paid or cancelled" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Full Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Cyan
    Write-Host "  • Verify booking exists: Get-Content bookings in Firebase UI" -ForegroundColor Gray
    Write-Host "  • Check booking has remaining balance" -ForegroundColor Gray
    Write-Host "  • Verify auth token is valid" -ForegroundColor Gray
    Write-Host "  • Check Firebase Functions logs for errors" -ForegroundColor Gray
    Write-Host "  • Review PAYCHANGU-TROUBLESHOOTING.md" -ForegroundColor Gray
    Write-Host ""
    
    exit 1
}

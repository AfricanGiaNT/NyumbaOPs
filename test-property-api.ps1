$propertyId = "AoCBdPRJhEids9mftxSo"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5001/nyumbaops/us-central1/api/v1/public/properties/$propertyId" -Method GET
    Write-Host "Success! Property details:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
}

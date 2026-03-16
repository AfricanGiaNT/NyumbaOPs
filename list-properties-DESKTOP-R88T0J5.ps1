$response = Invoke-RestMethod -Uri "http://localhost:5001/nyumbaops/us-central1/api/v1/public/properties" -Method GET
Write-Host "=== Current Properties in Database ===" -ForegroundColor Cyan
$response.data | ForEach-Object {
    Write-Host "`nProperty: $($_.name)" -ForegroundColor Yellow
    Write-Host "  ID: $($_.id)"
    Write-Host "  Location: $($_.location)"
    Write-Host "  Image URL: $($_.coverImageUrl)"
}
Write-Host "`nTotal properties: $($response.data.Count)" -ForegroundColor Cyan

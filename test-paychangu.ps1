# PayChangu Payment System - Automated Test Script
# Tests the complete payment flow for NyumbaOPs

param(
    [Parameter(Mandatory=$false)]
    [string]$AuthToken = "",
    
    [Parameter(Mandatory=$false)]
    [string]$ApiBaseUrl = "http://localhost:5001/nyumbaops/us-central1/api/v1"
)

$ErrorActionPreference = "Continue"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     PayChangu Payment System - Integration Tests          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if auth token is provided
if ([string]::IsNullOrEmpty($AuthToken)) {
    Write-Host "⚠ No auth token provided. Some tests will be skipped." -ForegroundColor Yellow
    Write-Host "  To run full tests, provide token: .\test-paychangu.ps1 -AuthToken 'your_token'" -ForegroundColor Gray
    Write-Host ""
}

# Test counters
$testsPassed = 0
$testsFailed = 0
$testsSkipped = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [scriptblock]$Validator
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-RestMethod @params
        
        if ($Validator) {
            $validationResult = & $Validator $response
            if ($validationResult) {
                Write-Host "  ✓ PASSED" -ForegroundColor Green
                return $true
            } else {
                Write-Host "  ✗ FAILED: Validation failed" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "  ✓ PASSED" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# ============================================================================
# Test 1: API Health Check
# ============================================================================
Write-Host "`n[Test 1] API Health Check" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

if (Test-Endpoint `
    -Name "Public properties endpoint" `
    -Url "$ApiBaseUrl/public/properties" `
    -Validator { param($r) $r.success -eq $true }) {
    $testsPassed++
} else {
    $testsFailed++
}

# ============================================================================
# Test 2: Webhook Endpoint Accessibility
# ============================================================================
Write-Host "`n[Test 2] Webhook Endpoint" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

$webhookUrl = "$ApiBaseUrl/public/webhooks/paychangu"
Write-Host "Testing: Webhook endpoint accessibility" -ForegroundColor Yellow

try {
    $webhookBody = @{
        event = "payment.success"
        data = @{
            checkout_id = "test_$(Get-Random -Minimum 1000 -Maximum 9999)"
        }
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri $webhookUrl `
        -Method POST `
        -ContentType "application/json" `
        -Body $webhookBody
    
    if ($response.received -eq $true) {
        Write-Host "  ✓ PASSED: Webhook endpoint accessible" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  ✗ FAILED: Unexpected response" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    # 401 is expected if signature verification is enabled
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "  ✓ PASSED: Webhook endpoint accessible (signature verification active)" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $testsFailed++
    }
}

# ============================================================================
# Test 3: Protected Endpoints (requires auth)
# ============================================================================
Write-Host "`n[Test 3] Protected Endpoints" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

if ([string]::IsNullOrEmpty($AuthToken)) {
    Write-Host "  ⊘ SKIPPED: No auth token provided" -ForegroundColor Yellow
    $testsSkipped += 3
} else {
    $authHeaders = @{
        "Authorization" = "Bearer $AuthToken"
    }
    
    # Test 3.1: Get properties
    if (Test-Endpoint `
        -Name "Get properties (authenticated)" `
        -Url "$ApiBaseUrl/properties" `
        -Headers $authHeaders `
        -Validator { param($r) $r -is [array] }) {
        $testsPassed++
    } else {
        $testsFailed++
    }
    
    # Test 3.2: Get bookings
    if (Test-Endpoint `
        -Name "Get bookings (authenticated)" `
        -Url "$ApiBaseUrl/bookings" `
        -Headers $authHeaders `
        -Validator { param($r) $r -is [array] }) {
        $testsPassed++
    } else {
        $testsFailed++
    }
    
    # Test 3.3: Get guests
    if (Test-Endpoint `
        -Name "Get guests (authenticated)" `
        -Url "$ApiBaseUrl/guests" `
        -Headers $authHeaders `
        -Validator { param($r) $r -is [array] }) {
        $testsPassed++
    } else {
        $testsFailed++
    }
}

# ============================================================================
# Test 4: Payment Link Generation (requires auth and booking)
# ============================================================================
Write-Host "`n[Test 4] Payment Link Generation" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

if ([string]::IsNullOrEmpty($AuthToken)) {
    Write-Host "  ⊘ SKIPPED: No auth token provided" -ForegroundColor Yellow
    $testsSkipped++
} else {
    Write-Host "  ⊘ SKIPPED: Requires manual booking creation" -ForegroundColor Yellow
    Write-Host "    To test: Create a booking, then run:" -ForegroundColor Gray
    Write-Host "    .\generate-payment-link.ps1 -BookingId 'your_booking_id' -AuthToken 'your_token'" -ForegroundColor Gray
    $testsSkipped++
}

# ============================================================================
# Test 5: Environment Configuration Check
# ============================================================================
Write-Host "`n[Test 5] Environment Configuration" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

$envFile = "functions\.env"
$envExampleFile = "functions\.env.example"

Write-Host "Checking: Environment files" -ForegroundColor Yellow

if (Test-Path $envExampleFile) {
    Write-Host "  ✓ .env.example exists" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "  ✗ .env.example missing" -ForegroundColor Red
    $testsFailed++
}

if (Test-Path $envFile) {
    Write-Host "  ✓ .env exists" -ForegroundColor Green
    
    # Check for required variables
    $envContent = Get-Content $envFile -Raw
    $requiredVars = @(
        "PAYCHANGU_PUBLIC_KEY",
        "PAYCHANGU_SECRET_KEY",
        "PAYCHANGU_WEBHOOK_SECRET",
        "PAYCHANGU_ENVIRONMENT"
    )
    
    $missingVars = @()
    foreach ($var in $requiredVars) {
        if ($envContent -notmatch $var) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -eq 0) {
        Write-Host "  ✓ All required PayChangu variables present" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  ✗ Missing variables: $($missingVars -join ', ')" -ForegroundColor Red
        $testsFailed++
    }
} else {
    Write-Host "  ⚠ .env file not found" -ForegroundColor Yellow
    Write-Host "    Create it from .env.example: cp functions\.env.example functions\.env" -ForegroundColor Gray
    $testsSkipped++
}

# ============================================================================
# Test 6: Documentation Check
# ============================================================================
Write-Host "`n[Test 6] Documentation Files" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

$docs = @(
    "PAYCHANGU-SETUP.md",
    "PAYCHANGU-TESTING.md"
)

foreach ($doc in $docs) {
    if (Test-Path $doc) {
        Write-Host "  ✓ $doc exists" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  ✗ $doc missing" -ForegroundColor Red
        $testsFailed++
    }
}

# ============================================================================
# Test Summary
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                     Test Summary                           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$totalTests = $testsPassed + $testsFailed + $testsSkipped

Write-Host "`nTotal Tests: $totalTests" -ForegroundColor White
Write-Host "  Passed:  $testsPassed" -ForegroundColor Green
Write-Host "  Failed:  $testsFailed" -ForegroundColor Red
Write-Host "  Skipped: $testsSkipped" -ForegroundColor Yellow

if ($testsFailed -eq 0) {
    Write-Host "`n✓ All tests passed!" -ForegroundColor Green
    Write-Host "  Ready to proceed with manual testing." -ForegroundColor Gray
} else {
    Write-Host "`n✗ Some tests failed." -ForegroundColor Red
    Write-Host "  Review errors above and check PAYCHANGU-TROUBLESHOOTING.md" -ForegroundColor Gray
}

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "  1. Review PAYCHANGU-SETUP.md for configuration" -ForegroundColor Gray
Write-Host "  2. Set up PayChangu credentials in functions\.env" -ForegroundColor Gray
Write-Host "  3. Start Firebase emulators: npm run emulators" -ForegroundColor Gray
Write-Host "  4. Start ngrok: ngrok http 5001" -ForegroundColor Gray
Write-Host "  5. Follow PAYCHANGU-TESTING.md for manual tests" -ForegroundColor Gray
Write-Host ""

# Return exit code based on results
if ($testsFailed -gt 0) {
    exit 1
} else {
    exit 0
}

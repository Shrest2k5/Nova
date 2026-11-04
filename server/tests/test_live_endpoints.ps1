$baseUrl = "http://localhost:5000/api/v1"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " STARTING END-TO-END BACKEND API VERIFICATION SUITE" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$results = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [scriptblock]$Action
    )
    Write-Host "`n[TEST] $Name..." -NoNewline
    try {
        $res = & $Action
        Write-Host " PASS" -ForegroundColor Green
        $script:results += [PSCustomObject]@{ Test = $Name; Status = "PASS"; Details = $res }
    } catch {
        Write-Host " FAIL" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        $script:results += [PSCustomObject]@{ Test = $Name; Status = "FAIL"; Details = $_.ToString() }
    }
}

# 1. Health check
Test-Endpoint "GET /health" {
    $r = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    if ($r.data.status -ne "OK" -or $r.data.database -ne "healthy") { throw "Database is not healthy" }
    return "Status: $($r.data.status), DB: $($r.data.database)"
}

# 2. Register new Standard User
$userEmail = "user_$(Get-Random)@example.com"
$userPassword = "Password123!"
$userToken = ""
$userId = ""

Test-Endpoint "POST /auth/register (Standard User)" {
    $body = @{
        name = "Test Standard User"
        email = $userEmail
        password = $userPassword
        role = "USER"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $body -ContentType "application/json"
    if (-not $r.success -or -not $r.data.token) { throw "Token not returned" }
    if ($r.data.user.password) { throw "Password exposed in response" }
    $script:userToken = $r.data.token
    $script:userId = $r.data.user.id
    return "User registered: $($r.data.user.email), ID: $($r.data.user.id)"
}

# 3. Register new Admin User
$adminEmail = "admin_$(Get-Random)@example.com"
$adminToken = ""
$adminId = ""

Test-Endpoint "POST /auth/register (Admin User)" {
    $body = @{
        name = "Test Admin User"
        email = $adminEmail
        password = $userPassword
        role = "ADMIN"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $body -ContentType "application/json"
    if ($r.data.user.role -ne "ADMIN") { throw "Admin role not assigned" }
    $script:adminToken = $r.data.token
    $script:adminId = $r.data.user.id
    return "Admin registered: $($r.data.user.email)"
}

# 4. Reject duplicate email
Test-Endpoint "POST /auth/register (Duplicate Email -> 409 Conflict)" {
    $body = @{
        name = "Duplicate"
        email = $userEmail
        password = $userPassword
    } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $body -ContentType "application/json"
        throw "Should have thrown 409 Conflict"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            return "Properly rejected with 409 Conflict"
        }
        throw "Unexpected status code: $($_.Exception.Response.StatusCode)"
    }
}

# 5. User login valid credentials
Test-Endpoint "POST /auth/login (Valid Credentials)" {
    $body = @{
        email = $userEmail
        password = $userPassword
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $body -ContentType "application/json"
    if (-not $r.data.token) { throw "Token missing in login response" }
    return "Login successful, token received"
}

# 6. User login invalid credentials
Test-Endpoint "POST /auth/login (Invalid Password -> 401 Unauthorized)" {
    $body = @{
        email = $userEmail
        password = "WrongPassword999!"
    } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $body -ContentType "application/json"
        throw "Should have thrown 401"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            return "Properly rejected with 401 Unauthorized"
        }
        throw "Unexpected status: $($_.Exception.Response.StatusCode)"
    }
}

# 7. GET /auth/me with Bearer token
Test-Endpoint "GET /auth/me (Authenticated Profile)" {
    $headers = @{ Authorization = "Bearer $userToken" }
    $r = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $headers
    if ($r.data.email -ne $userEmail) { throw "Email mismatch in profile" }
    return "Fetched profile for: $($r.data.email)"
}

# 8. GET /auth/me without token -> 401
Test-Endpoint "GET /auth/me (Unauthenticated -> 401)" {
    try {
        Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get
        throw "Should have thrown 401"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            return "Properly rejected unauthenticated request with 401"
        }
        throw "Unexpected status: $($_.Exception.Response.StatusCode)"
    }
}

# 9. POST /auth/logout
Test-Endpoint "POST /auth/logout" {
    $headers = @{ Authorization = "Bearer $userToken" }
    $r = Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method Post -Headers $headers
    if (-not $r.success) { throw "Logout not acknowledged" }
    return "Logout acknowledged"
}

# 10. GET /users as Regular User -> 403 Forbidden
Test-Endpoint "GET /users (Regular User -> 403 Forbidden)" {
    $headers = @{ Authorization = "Bearer $userToken" }
    try {
        Invoke-RestMethod -Uri "$baseUrl/users" -Method Get -Headers $headers
        throw "Should have thrown 403"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 403) {
            return "Properly rejected with 403 Forbidden for non-admin"
        }
        throw "Unexpected status: $($_.Exception.Response.StatusCode)"
    }
}

# 11. GET /users as Admin User -> 200 OK
Test-Endpoint "GET /users (Admin User -> 200 OK)" {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $r = Invoke-RestMethod -Uri "$baseUrl/users" -Method Get -Headers $headers
    if (-not $r.success -or $r.data.Count -lt 1) { throw "Users not returned" }
    return "Admin successfully retrieved $($r.data.Count) user accounts"
}

# 12. GET /users/:id (self lookup)
Test-Endpoint "GET /users/:id (Self lookup -> 200 OK)" {
    $headers = @{ Authorization = "Bearer $userToken" }
    $r = Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Method Get -Headers $headers
    if ($r.data.id -ne $userId) { throw "ID mismatch" }
    return "Profile retrieved by self"
}

# 13. GET /users/:id (inspect another user as non-admin -> 403)
Test-Endpoint "GET /users/:id (Other user lookup by non-admin -> 403 Forbidden)" {
    $headers = @{ Authorization = "Bearer $userToken" }
    try {
        Invoke-RestMethod -Uri "$baseUrl/users/$adminId" -Method Get -Headers $headers
        throw "Should have thrown 403"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 403) {
            return "Properly blocked cross-user profile access with 403"
        }
        throw "Unexpected status: $($_.Exception.Response.StatusCode)"
    }
}

# 14. File Upload (Valid file)
$testFilePath = "$PSScriptRoot\test_live_upload.txt"
Set-Content -Path $testFilePath -Value "Novastat Live API Test Payload Content - $(Get-Date)"
$uploadedFileId = ""

Test-Endpoint "POST /files/upload (Valid Text File -> 201 Created)" {
    # Use curl.exe for reliable multipart/form-data upload
    $curlCmd = "curl.exe -s -X POST `"$baseUrl/files/upload`" -H `"Authorization: Bearer $userToken`" -F `"file=@$testFilePath`""
    $resStr = Invoke-Expression $curlCmd
    $resJson = $resStr | ConvertFrom-Json
    if (-not $resJson.success -or -not $resJson.data.id) { throw "Upload response failed: $resStr" }
    if ($resJson.data.status -ne "PENDING") { throw "Initial status is not PENDING" }
    $script:uploadedFileId = $resJson.data.id
    return "File uploaded: $($resJson.data.originalName), ID: $($resJson.data.id), Status: $($resJson.data.status)"
}

# 15. File Upload (Disallowed extension)
$invalidFilePath = "$PSScriptRoot\test_malicious.bat"
Set-Content -Path $invalidFilePath -Value "echo bad"

Test-Endpoint "POST /files/upload (Disallowed Extension .bat -> 400 Bad Request)" {
    $curlCmd = "curl.exe -s -w `"%{http_code}`" -o response_tmp.json -X POST `"$baseUrl/files/upload`" -H `"Authorization: Bearer $userToken`" -F `"file=@$invalidFilePath`""
    $httpCode = Invoke-Expression $curlCmd
    Remove-Item "response_tmp.json" -ErrorAction SilentlyContinue
    if ($httpCode -ne "400") { throw "Expected HTTP 400, received $httpCode" }
    return "Properly rejected disallowed extension with HTTP 400"
}
Remove-Item $invalidFilePath -ErrorAction SilentlyContinue

# 16. File Upload (Missing file field -> 400)
Test-Endpoint "POST /files/upload (Missing File Payload -> 400 Bad Request)" {
    $curlCmd = "curl.exe -s -w `"%{http_code}`" -o response_tmp.json -X POST `"$baseUrl/files/upload`" -H `"Authorization: Bearer $userToken`""
    $httpCode = Invoke-Expression $curlCmd
    Remove-Item "response_tmp.json" -ErrorAction SilentlyContinue
    if ($httpCode -ne "400") { throw "Expected HTTP 400, received $httpCode" }
    return "Properly rejected missing file with HTTP 400"
}

# 17. GET /files (Listing with search and pagination)
Test-Endpoint "GET /files (List with search and pagination)" {
    $headers = @{ Authorization = "Bearer $userToken" }
    $r = Invoke-RestMethod -Uri "$baseUrl/files?page=1&limit=10&search=test_live" -Method Get -Headers $headers
    if (-not $r.success -or $r.data.Count -lt 1) { throw "Uploaded file not in search results" }
    return "Found $($r.data.Count) matching file(s). Meta: Page $($r.meta.page) of $($r.meta.totalPages)"
}

# 18. GET /files/:id (Details)
Test-Endpoint "GET /files/:id (File Details)" {
    $headers = @{ Authorization = "Bearer $userToken" }
    $r = Invoke-RestMethod -Uri "$baseUrl/files/$uploadedFileId" -Method Get -Headers $headers
    if ($r.data.id -ne $uploadedFileId) { throw "File ID mismatch" }
    return "File details: $($r.data.originalName), MIME: $($r.data.mimeType), Size: $($r.data.size)"
}

# 19. GET /files/:id/status (Progress polling)
Test-Endpoint "GET /files/:id/status (Lifecycle Status Polling)" {
    $headers = @{ Authorization = "Bearer $userToken" }
    $r = Invoke-RestMethod -Uri "$baseUrl/files/$uploadedFileId/status" -Method Get -Headers $headers
    if (-not $r.data.status) { throw "Status missing" }
    return "Status: $($r.data.status), Progress: $($r.data.progress)%"
}

# 20. GET /dashboard/stats (User Scoped)
Test-Endpoint "GET /dashboard/stats (User Scoped)" {
    $headers = @{ Authorization = "Bearer $userToken" }
    $r = Invoke-RestMethod -Uri "$baseUrl/dashboard/stats" -Method Get -Headers $headers
    if ($r.data.total -lt 1) { throw "Expected at least 1 file in user stats" }
    return "User Stats - Total: $($r.data.total), Processing: $($r.data.processing), Completed: $($r.data.completed)"
}

# 21. GET /dashboard/stats (Admin Scoped)
Test-Endpoint "GET /dashboard/stats (Admin System-Wide)" {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $r = Invoke-RestMethod -Uri "$baseUrl/dashboard/stats" -Method Get -Headers $headers
    if ($r.data.totalUsers -eq $null) { throw "Admin stats should include totalUsers" }
    return "Admin Stats - Total Files: $($r.data.total), Total Users: $($r.data.totalUsers)"
}

# 22. GET /dashboard/recent-uploads
Test-Endpoint "GET /dashboard/recent-uploads" {
    $headers = @{ Authorization = "Bearer $userToken" }
    $r = Invoke-RestMethod -Uri "$baseUrl/dashboard/recent-uploads?limit=5" -Method Get -Headers $headers
    if ($r.data.Count -lt 1) { throw "Recent uploads should not be empty" }
    return "Returned $($r.data.Count) recent upload(s)"
}

# 23. GET /files/:id/download
Test-Endpoint "GET /files/:id/download (Stream Download)" {
    $downloadPath = "$PSScriptRoot\test_downloaded.txt"
    $curlCmd = "curl.exe -s -X GET `"$baseUrl/files/$uploadedFileId/download`" -H `"Authorization: Bearer $userToken`" -o `"$downloadPath`""
    Invoke-Expression $curlCmd
    if (-not (Test-Path $downloadPath)) { throw "Downloaded file not created" }
    $content = Get-Content $downloadPath -Raw
    Remove-Item $downloadPath -ErrorAction SilentlyContinue
    if (-not $content.Contains("Novastat Live API Test Payload")) { throw "Content mismatch" }
    return "File downloaded and stream content verified"
}

# 24. Cross-user isolation: User B deletes User A's file -> 403
Test-Endpoint "DELETE /files/:id (User B deletes User A file -> 403 Forbidden)" {
    # Register User B
    $userBBody = @{ name = "User B"; email = "userb_$(Get-Random)@example.com"; password = "Password123!" } | ConvertTo-Json
    $resB = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $userBBody -ContentType "application/json"
    $userBToken = $resB.data.token

    $headers = @{ Authorization = "Bearer $userBToken" }
    try {
        Invoke-RestMethod -Uri "$baseUrl/files/$uploadedFileId" -Method Delete -Headers $headers
        throw "Should have thrown 403"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 403) {
            return "Properly prevented unauthorized deletion with 403 Forbidden"
        }
        throw "Unexpected status: $($_.Exception.Response.StatusCode)"
    }
}

# 25. Owner deletes file -> 200 OK
Test-Endpoint "DELETE /files/:id (Owner deletes file -> 200 OK)" {
    $headers = @{ Authorization = "Bearer $userToken" }
    $r = Invoke-RestMethod -Uri "$baseUrl/files/$uploadedFileId" -Method Delete -Headers $headers
    if (-not $r.success -or -not $r.data.deleted) { throw "Delete not acknowledged" }

    # Verify it is deleted (404)
    try {
        Invoke-RestMethod -Uri "$baseUrl/files/$uploadedFileId" -Method Get -Headers $headers
        throw "File should have been deleted"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            return "File successfully deleted and verified 404 on subsequent get"
        }
        throw "Unexpected status: $($_.Exception.Response.StatusCode)"
    }
}

# 26. 404 for unknown endpoints
Test-Endpoint "GET /unknown-route (404 Not Found handler)" {
    try {
        Invoke-RestMethod -Uri "$baseUrl/nonexistent-endpoint-abc" -Method Get
        throw "Should have thrown 404"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            return "Properly handled by central 404 handler with 404 Not Found"
        }
        throw "Unexpected status: $($_.Exception.Response.StatusCode)"
    }
}

# Cleanup
Remove-Item $testFilePath -ErrorAction SilentlyContinue

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " TEST EXECUTION SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
$passed = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "TOTAL TESTS: $($results.Count)"
Write-Host "PASSED:      $passed" -ForegroundColor Green
Write-Host "FAILED:      $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "==========================================================" -ForegroundColor Cyan


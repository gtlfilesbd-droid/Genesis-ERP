# PowerShell script to fix Cursor workspace loading issue
# Run this script as Administrator if needed

Write-Host "=== Cursor Workspace Fix Script ===" -ForegroundColor Green
Write-Host ""

# Step 1: Check if Cursor is running
Write-Host "Step 1: Checking for running Cursor processes..." -ForegroundColor Yellow
$cursorProcesses = Get-Process | Where-Object { $_.ProcessName -like "*cursor*" -or $_.ProcessName -like "*Cursor*" }
if ($cursorProcesses) {
    Write-Host "Found Cursor processes. Please close Cursor before continuing." -ForegroundColor Red
    Write-Host "Press any key after closing Cursor..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} else {
    Write-Host "No Cursor processes found. Good!" -ForegroundColor Green
}

# Step 2: Clear Cursor cache
Write-Host ""
Write-Host "Step 2: Clearing Cursor cache..." -ForegroundColor Yellow
$cursorCachePath = "$env:APPDATA\Cursor"
$cacheFolders = @("Cache", "Code Cache", "CachedData", "GPUCache", "logs")

foreach ($folder in $cacheFolders) {
    $fullPath = Join-Path $cursorCachePath $folder
    if (Test-Path $fullPath) {
        try {
            Remove-Item -Path $fullPath -Recurse -Force -ErrorAction Stop
            Write-Host "  ✓ Deleted: $folder" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Could not delete: $folder - $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  - Not found: $folder" -ForegroundColor Gray
    }
}

# Step 3: Verify project files
Write-Host ""
Write-Host "Step 3: Verifying project files..." -ForegroundColor Yellow
$projectPath = "C:\Users\Administrator\Desktop\project"
if (Test-Path $projectPath) {
    Write-Host "  ✓ Project folder exists" -ForegroundColor Green
    
    # Check key files
    $keyFiles = @("package.json", "server.js", "index.html")
    foreach ($file in $keyFiles) {
        $filePath = Join-Path $projectPath $file
        if (Test-Path $filePath) {
            Write-Host "  ✓ Found: $file" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Missing: $file" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  ✗ Project folder not found at: $projectPath" -ForegroundColor Red
}

# Step 4: Check server status
Write-Host ""
Write-Host "Step 4: Checking server status..." -ForegroundColor Yellow
$serverProcess = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($serverProcess) {
    Write-Host "  ✓ Server is running on port 3001" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Server is NOT running on port 3001" -ForegroundColor Yellow
    Write-Host "  You may need to start it with: npm start" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Green
Write-Host "1. Cursor cache has been cleared" -ForegroundColor White
Write-Host "2. Next steps:" -ForegroundColor White
Write-Host "   a. Open Cursor IDE" -ForegroundColor Cyan
Write-Host "   b. Go to File → Open Folder" -ForegroundColor Cyan
Write-Host "   c. Select: C:\Users\Administrator\Desktop\project" -ForegroundColor Cyan
Write-Host "   OR" -ForegroundColor Cyan
Write-Host "   b. Go to File → Open Workspace from File" -ForegroundColor Cyan
Write-Host "   c. Select: C:\Users\Administrator\Desktop\project\genesis-erp.code-workspace" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


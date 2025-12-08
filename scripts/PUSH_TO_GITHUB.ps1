# PowerShell Script to Push Genesis ERP Project to GitHub
# Repository: https://github.com/gtlfilesbd-droid/Genesis-ERP.git

param(
    [string]$CommitMessage = "Initial commit: Genesis ERP with Authentication & RBAC System",
    [string]$BranchName = "main"
)

$ErrorActionPreference = "Continue"
$RepoUrl = "https://github.com/gtlfilesbd-droid/Genesis-ERP.git"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Genesis ERP - GitHub Push Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if Git is installed
Write-Host "[1/7] Checking if Git is installed..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed"
    }
    Write-Host "  [OK] Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Git is not installed or not in PATH!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please install Git first:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://git-scm.com/download/win" -ForegroundColor White
    Write-Host "  2. Install Git for Windows" -ForegroundColor White
    Write-Host "  3. Restart PowerShell and try again" -ForegroundColor White
    Write-Host ""
    Write-Host "  For detailed instructions, see GIT_SETUP.md" -ForegroundColor Cyan
    exit 1
}

# Step 2: Check if .gitignore exists
Write-Host "[2/7] Checking for .gitignore file..." -ForegroundColor Yellow
if (Test-Path ".gitignore") {
    Write-Host "  [OK] .gitignore found" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] .gitignore not found. Creating one..." -ForegroundColor Yellow
    $gitignoreContent = @"
# Dependencies
node_modules/

# Database files
*.db
*.db-journal

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS files
.DS_Store
Thumbs.db
desktop.ini

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Environment variables
.env
.env.local

# Build outputs
dist/
build/

# Cache
.cache/
*.cache

# Temporary files
tmp/
temp/
*.tmp
"@
    Set-Content -Path ".gitignore" -Value $gitignoreContent
    Write-Host "  [OK] .gitignore created" -ForegroundColor Green
}

# Step 3: Initialize Git repository (if needed)
Write-Host "[3/7] Checking Git repository status..." -ForegroundColor Yellow
if (Test-Path ".git") {
    Write-Host "  [OK] Git repository already initialized" -ForegroundColor Green
} else {
    Write-Host "  Initializing Git repository..." -ForegroundColor Yellow
    git init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] Failed to initialize Git repository" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] Git repository initialized" -ForegroundColor Green
}

# Step 4: Configure Git user (if not already configured)
Write-Host "[4/7] Checking Git configuration..." -ForegroundColor Yellow
$gitUserName = git config user.name 2>&1
$gitUserEmail = git config user.email 2>&1

if ([string]::IsNullOrWhiteSpace($gitUserName) -or [string]::IsNullOrWhiteSpace($gitUserEmail)) {
    Write-Host "  [WARNING] Git user name/email not configured" -ForegroundColor Yellow
    Write-Host "  Please configure Git before continuing:" -ForegroundColor White
    Write-Host ""
    $name = Read-Host "  Enter your name (for Git commits)"
    $email = Read-Host "  Enter your email (for Git commits)"
    
    if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($email)) {
        Write-Host "  [ERROR] Git configuration is required" -ForegroundColor Red
        exit 1
    }
    
    git config --global user.name $name
    git config --global user.email $email
    Write-Host "  [OK] Git user configured" -ForegroundColor Green
} else {
    Write-Host "  [OK] Git user: $gitUserName ($gitUserEmail)" -ForegroundColor Green
}

# Step 5: Add remote repository
Write-Host "[5/7] Configuring remote repository..." -ForegroundColor Yellow
$existingRemote = git remote get-url origin 2>&1

if ($LASTEXITCODE -eq 0) {
    if ($existingRemote -eq $RepoUrl) {
        Write-Host "  [OK] Remote repository already configured correctly" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Remote repository exists but points to different URL" -ForegroundColor Yellow
        Write-Host "  Current: $existingRemote" -ForegroundColor White
        Write-Host "  Expected: $RepoUrl" -ForegroundColor White
        $overwrite = Read-Host "  Overwrite with new URL? (y/n)"
        if ($overwrite -eq "y" -or $overwrite -eq "Y") {
            git remote set-url origin $RepoUrl
            Write-Host "  [OK] Remote repository URL updated" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Aborted. Remote URL not changed." -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "  Adding remote repository..." -ForegroundColor Yellow
    git remote add origin $RepoUrl
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] Failed to add remote repository" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] Remote repository added" -ForegroundColor Green
}

# Step 6: Stage and commit files
Write-Host "[6/7] Staging files for commit..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] Failed to stage files" -ForegroundColor Red
    exit 1
}

$stagedFiles = (git diff --cached --name-only).Count
Write-Host "  [OK] Staged $stagedFiles file(s)" -ForegroundColor Green

Write-Host "  Creating commit..." -ForegroundColor Yellow
git commit -m $CommitMessage
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [WARNING] Commit failed or nothing to commit" -ForegroundColor Yellow
    Write-Host "  (This is normal if all changes are already committed)" -ForegroundColor White
} else {
    Write-Host "  [OK] Commit created successfully" -ForegroundColor Green
}

# Step 7: Push to GitHub
Write-Host "[7/7] Pushing to GitHub..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Repository: $RepoUrl" -ForegroundColor Cyan
Write-Host "  Branch: $BranchName" -ForegroundColor Cyan
Write-Host ""

# Check if branch exists
$branchExists = git rev-parse --verify "$BranchName" 2>&1
if ($LASTEXITCODE -ne 0) {
    # Branch doesn't exist locally, try to create it
    Write-Host "  Creating branch '$BranchName'..." -ForegroundColor Yellow
    git checkout -b $BranchName 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        # Try master instead
        Write-Host "  Trying 'master' branch instead..." -ForegroundColor Yellow
        $BranchName = "master"
        git checkout -b $BranchName 2>&1 | Out-Null
    }
}

# Push to GitHub
Write-Host "  Pushing to origin/$BranchName..." -ForegroundColor Yellow
Write-Host "  (You may be prompted for GitHub credentials)" -ForegroundColor White
Write-Host ""

try {
    # Try to push
    git push -u origin $BranchName 2>&1 | Tee-Object -Variable pushOutput
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  [SUCCESS] Successfully pushed to GitHub!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Repository URL: $RepoUrl" -ForegroundColor Cyan
        Write-Host "  Branch: $BranchName" -ForegroundColor Cyan
        Write-Host ""
    } else {
        # Check for authentication errors
        $pushOutputStr = $pushOutput -join "`n"
        if ($pushOutputStr -match "authentication|credentials|permission denied|not authorized") {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Red
            Write-Host "  [ERROR] Authentication Required" -ForegroundColor Red
            Write-Host "========================================" -ForegroundColor Red
            Write-Host ""
            Write-Host "  GitHub authentication failed. Please use one of these methods:" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "  Option 1: Personal Access Token (Recommended)" -ForegroundColor Cyan
            Write-Host "    1. Go to: https://github.com/settings/tokens" -ForegroundColor White
            Write-Host "    2. Generate new token (classic)" -ForegroundColor White
            Write-Host "    3. Select scopes: repo (all)" -ForegroundColor White
            Write-Host "    4. Copy the token" -ForegroundColor White
            Write-Host "    5. When prompted for password, paste the token" -ForegroundColor White
            Write-Host ""
            Write-Host "  Option 2: GitHub CLI" -ForegroundColor Cyan
            Write-Host "    1. Install GitHub CLI: winget install GitHub.cli" -ForegroundColor White
            Write-Host "    2. Run: gh auth login" -ForegroundColor White
            Write-Host ""
            Write-Host "  Option 3: SSH Key" -ForegroundColor Cyan
            Write-Host "    1. Generate SSH key: ssh-keygen -t ed25519 -C your_email@example.com" -ForegroundColor White
            Write-Host "    2. Add to GitHub: https://github.com/settings/keys" -ForegroundColor White
            Write-Host "    3. Change remote URL to SSH: git remote set-url origin git@github.com:gtlfilesbd-droid/Genesis-ERP.git" -ForegroundColor White
            Write-Host ""
            Write-Host "  After setting up authentication, run this script again." -ForegroundColor Yellow
            Write-Host ""
        } else {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Red
            Write-Host "  [ERROR] Push Failed" -ForegroundColor Red
            Write-Host "========================================" -ForegroundColor Red
            Write-Host ""
            Write-Host "  Error output:" -ForegroundColor Yellow
            Write-Host $pushOutputStr -ForegroundColor White
            Write-Host ""
            Write-Host "  Common issues:" -ForegroundColor Yellow
            Write-Host "  - Remote branch already exists: Try 'git push -u origin $BranchName --force' (use with caution)" -ForegroundColor White
            Write-Host "  - Network issues: Check your internet connection" -ForegroundColor White
            Write-Host "  - Repository permissions: Ensure you have push access" -ForegroundColor White
            Write-Host ""
        }
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  [ERROR] Unexpected Error" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Cyan
Write-Host "  - View your repository: $RepoUrl" -ForegroundColor White
Write-Host "  - Make future changes and commit them" -ForegroundColor White
Write-Host "  - Push updates: git push" -ForegroundColor White
Write-Host ""


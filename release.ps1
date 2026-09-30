# release.ps1
# Usage: .\release.ps1 -Version "1.5.7" -Notes "Description of changes"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,

    [Parameter(Mandatory=$true)]
    [string]$Notes
)

$ErrorActionPreference = "Stop"
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
Remove-Item Env:\GITHUB_TOKEN -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Calendar-On-Demand Release Tool" -ForegroundColor Cyan
Write-Host "  Version: v$Version" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# ── 0. Pre-Flight Verification & Linting ────────────────
Write-Host "[0/4] Running pre-flight static code validation (npm test)..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "      [ERROR] Linting / verification failed! Release aborted." -ForegroundColor Red
    exit 1
}
Write-Host "      [OK] Linting passed with 0 errors" -ForegroundColor Green

# ── 1. Update package.json Version ──────────────────────
Write-Host "[1/4] Updating package.json version to $Version..." -ForegroundColor Yellow
$pkg = Get-Content "package.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$pkg.version = $Version
$json = $pkg | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText((Resolve-Path "package.json").Path, $json, [System.Text.UTF8Encoding]::new($false))
Write-Host "      [OK] package.json updated successfully" -ForegroundColor Green

# ── 2. Update docs/index.html & landing/index.html ──────
Write-Host "[2/4] Updating landing pages (docs/ and landing/)..." -ForegroundColor Yellow
$html = Get-Content "docs/index.html" -Raw -Encoding UTF8

# Replace update banner
$html = $html -replace '(<strong>v[\d\.]+ is out!</strong>[^<]*)', "<strong>v$Version is out!</strong> - $Notes"
$html = $html -replace '(<span class="update-tag"><span class="pulse-dot"></span>)v[\d\.]+ Released(</span>\s*<span class="update-text">)[^<]*(</span>)', "`${1}v$Version Released`${2}$Notes`${3}"
$html = $html -replace '("softwareVersion":\s*")[^"]+(")', "`${1}$Version`${2}"

# Changelog: insert new version at top if not already present
if ($html -notmatch "v$Version <span class=""cl-date""") {
    $today = Get-Date -Format "MMM dd, yyyy"
    $newEntry = @"
                <div class="cl-item">
                    <div class="cl-version">v$Version <span class="cl-date">$today</span></div>
                    <div class="cl-body">$Notes</div>
                </div>
"@
    $html = $html -replace '(<div class="changelog-list"[^>]*>)', "`$1`r`n$newEntry"
}

[System.IO.File]::WriteAllText((Resolve-Path "docs/index.html").Path, $html, [System.Text.UTF8Encoding]::new($false))
# Mirror to landing/index.html
if (Test-Path "landing/index.html") {
    [System.IO.File]::WriteAllText((Resolve-Path "landing/index.html").Path, $html, [System.Text.UTF8Encoding]::new($false))
}
Write-Host "      [OK] docs/index.html and landing/index.html synchronized" -ForegroundColor Green

# ── 3. Commit Release Changes ───────────────────────────
Write-Host "[3/4] Committing version bump and release notes..." -ForegroundColor Yellow
git add package.json docs/index.html landing/index.html HANDOFF.md main.js styles.css widget.html widget.js release.ps1
git commit -m "Release v${Version}: $Notes"
git push origin main
Write-Host "      [OK] Pushed release commit to main" -ForegroundColor Green

# ── 4. Push Git Tag -> Triggers GitHub Actions Build ────
Write-Host "[4/4] Creating and pushing git tag v$Version..." -ForegroundColor Yellow
git tag "v$Version" -m "v${Version}: $Notes"
git push origin "v$Version"
if ($LASTEXITCODE -ne 0) {
    Write-Host "      [ERROR] Failed to push tag. Release may already exist." -ForegroundColor Red
    exit 1
}
Write-Host "      [OK] Tag v$Version pushed successfully" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Tag pushed! GitHub Actions is now building:" -ForegroundColor Green
Write-Host "   Windows (.exe) + Mac (.dmg)" -ForegroundColor Green
Write-Host "  Check progress at:" -ForegroundColor Cyan
Write-Host "  https://github.com/kidiksentrik/Calendar-On-Demand/actions" -ForegroundColor Cyan
Write-Host "  Release will appear at:" -ForegroundColor Cyan
Write-Host "  https://github.com/kidiksentrik/Calendar-On-Demand/releases/tag/v$Version" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
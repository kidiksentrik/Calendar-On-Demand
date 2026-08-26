# release.ps1
# Usage: .\release.ps1 -Version "1.0.4" -Notes "Description of changes"
# Example: .\release.ps1 -Version "1.0.4" -Notes "Bug fixes and performance improvements"

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

# ?�?� 1. Update package.json Version ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
Write-Host "[1/3] Updating package.json version to $Version..." -ForegroundColor Yellow
$pkg = Get-Content "package.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$pkg.version = $Version
$json = $pkg | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText((Resolve-Path "package.json").Path, $json, [System.Text.UTF8Encoding]::new($false))
Write-Host "      ??package.json updated successfully" -ForegroundColor Green

# ?? 2. Update website docs/index.html ???????????????????????????
Write-Host "[2/3] Updating website docs/index.html..." -ForegroundColor Yellow
$html = Get-Content "docs/index.html" -Raw -Encoding UTF8

# Replace update banner
$html = $html -replace '(<strong>v[\d\.]+ is out!</strong>[^<]*)', "<strong>v$Version is out!</strong> - $Notes"

# ???? Changelog: insert new version at top
$today = Get-Date -Format "MMM dd, yyyy"
$newEntry = @"
                <div class="cl-item">
                    <div class="cl-version">v$Version <span class="cl-date">$today</span></div>
                    <div class="cl-body">$Notes</div>
                </div>
"@
$html = $html -replace '(<div class="changelog-list" id="changelog-list">)', "`$1`r`n$newEntry"

[System.IO.File]::WriteAllText((Resolve-Path "docs/index.html").Path, $html, [System.Text.UTF8Encoding]::new($false))
Write-Host "      ??Website updated successfully" -ForegroundColor Green

# ?? 3. Electron Build ???????????????????????????????????????????
# STEP 3. Push Git Tag -> GitHub Actions builds Windows + Mac automatically
Write-Host "[3/3] Creating and pushing git tag v$Version..." -ForegroundColor Yellow
Write-Host "      GitHub Actions will now build for Windows and Mac automatically." -ForegroundColor Cyan
git tag "v$Version"
git push origin "v$Version"
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR: Failed to push tag. Release may already exist." -ForegroundColor Red
    exit 1
}
Write-Host "      OK Tag v$Version pushed successfully" -ForegroundColor Green

# Completed
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
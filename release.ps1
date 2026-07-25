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

# ── 1. Update package.json Version ──────────────────────────────
Write-Host "[1/6] Updating package.json version to $Version..." -ForegroundColor Yellow
$pkg = Get-Content "package.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$pkg.version = $Version
$json = $pkg | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText((Resolve-Path "package.json").Path, $json, [System.Text.UTF8Encoding]::new($false))
Write-Host "      ✓ package.json updated successfully" -ForegroundColor Green

# ── 2. Update website docs/index.html ───────────────────────────
Write-Host "[2/6] Updating website docs/index.html..." -ForegroundColor Yellow
$html = Get-Content "docs/index.html" -Raw -Encoding UTF8

# Replace previous version download link with the new version link for main buttons only
$html = $html -replace 'id="hero-download-btn" href="[^"]+"', ('id="hero-download-btn" href="https://github.com/kidiksentrik/Calendar-On-Demand/releases/download/v' + $Version + '/Calendar-On-Demand-Setup-' + $Version + '.exe"')
$html = $html -replace 'href="[^"]+Calendar-On-Demand-Setup-[^"]+\.exe" class="btn-primary"', ('href="https://github.com/kidiksentrik/Calendar-On-Demand/releases/download/v' + $Version + '/Calendar-On-Demand-Setup-' + $Version + '.exe" class="btn-primary"')
# Replace version text
$html = $html -replace '\(v[\d\.]+\)', "(v$Version)"
# Replace update banner
$html = $html -replace '(<strong>v[\d\.]+ is out!</strong>[^<]*)', "<strong>v$Version is out!</strong> - $Notes"
# Replace latest badge version text
$html = $html -replace '(<span class="cl-version">)v[\d\.]+(<\/span>\s*<\/div>\s*<div[^>]*>\s*<span class="cl-body">)', "`${1}v$Version`${2}"

[System.IO.File]::WriteAllText((Resolve-Path "docs/index.html").Path, $html, [System.Text.UTF8Encoding]::new($false))
Write-Host "      ✓ Website updated successfully" -ForegroundColor Green

# ── 3. Electron Build ───────────────────────────────────────────
Write-Host "[3/6] Cleaning dist folder and starting Electron build (takes 2-3 mins)..." -ForegroundColor Yellow
Remove-Item "dist" -Recurse -Force -ErrorAction SilentlyContinue
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ✗ Build failed! Please check if you have administrator permissions." -ForegroundColor Red
    exit 1
}
Write-Host "      ✓ Build completed successfully" -ForegroundColor Green

# ── 4. Verify Built .exe File ───────────────────────────────────
Write-Host "[4/6] Verifying built installer file..." -ForegroundColor Yellow
$exeFile = Get-ChildItem "dist" -Filter "*$Version*.exe" | Select-Object -First 1
if (-not $exeFile) {
    Write-Host "      ✗ Could not find setup .exe for version $Version in dist folder." -ForegroundColor Red
    exit 1
}
Write-Host "      ✓ $($exeFile.Name) ($([Math]::Round($exeFile.Length/1MB, 1)) MB)" -ForegroundColor Green

# ── 5. Git Commit & Push ────────────────────────────────────────
Write-Host "[5/6] Committing and pushing changes..." -ForegroundColor Yellow
git add -A
git commit -m "feat: v$Version - $Notes"
git push origin main
Write-Host "      ✓ GitHub push completed successfully" -ForegroundColor Green

# ── 6. Create GitHub Release & Upload Installer ─────────────────
Write-Host "[6/6] Creating GitHub Release v$Version and uploading files..." -ForegroundColor Yellow

$releaseNotes = @"
## What's New in v$Version

$Notes

---
*Full changelog: https://kidiksentrik.github.io/Calendar-On-Demand/#changelog*
"@

$ymlFile = Join-Path "dist" "latest.yml"
$blockmapFile = Get-ChildItem "dist" -Filter "*$Version*.exe.blockmap" | Select-Object -First 1

$uploadFiles = @($exeFile.FullName)
if (Test-Path $ymlFile) {
    $uploadFiles += (Resolve-Path $ymlFile).Path
}
if ($blockmapFile) {
    $uploadFiles += $blockmapFile.FullName
}

gh release create "v$Version" $uploadFiles `
    --title "v$Version - $Notes" `
    --notes $releaseNotes

Write-Host "      ✓ Release uploaded successfully" -ForegroundColor Green

# ── Completed ──────────────────────────────────────────────────
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Release Successful! v$Version" -ForegroundColor Green
Write-Host "  Release: https://github.com/kidiksentrik/Calendar-On-Demand/releases/tag/v$Version" -ForegroundColor Cyan
Write-Host "  Website: https://kidiksentrik.github.io/Calendar-On-Demand/" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

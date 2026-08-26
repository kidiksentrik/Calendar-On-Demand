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

# ?�?� 2. Update website docs/index.html ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
Write-Host "[2/3] Updating website docs/index.html..." -ForegroundColor Yellow
$html = Get-Content "docs/index.html" -Raw -Encoding UTF8

# Replace previous version download link with the new version link for main buttons only
$html = $html -replace 'id="hero-download-btn" href="[^"]+"', ('id="hero-download-btn" href="https://github.com/kidiksentrik/Calendar-On-Demand/releases/download/v' + $Version + '/Calendar-On-Demand-Setup-' + $Version + '.exe"')
$html = $html -replace 'href="[^"]+Calendar-On-Demand-Setup-[^"]+\.exe" class="btn-primary"', ('href="https://github.com/kidiksentrik/Calendar-On-Demand/releases/download/v' + $Version + '/Calendar-On-Demand-Setup-' + $Version + '.exe" class="btn-primary"')
# Replace version text
$html = $html -replace '\(v[\d\.]+\)', "(v$Version)"
# Replace update banner
$html = $html -replace '(<strong>v[\d\.]+ is out!</strong>[^<]*)', "<strong>v$Version is out!</strong> - $Notes"

# ?�?� Changelog: demote old Latest entry, then insert new Latest at top ?�?�
# 1. Remove "latest" class from old li
$html = $html -replace '<li class="changelog-item latest">', '<li class="changelog-item">'
# 2. Remove old Latest badge
$html = $html -replace '\s*<span class="cl-latest-badge">Latest</span>', ''
# 3. Add dim style to the previously-latest cl-version (it has no style attribute yet)
$html = $html -replace '<span class="cl-version">(v[^<]+)</span>', '<span class="cl-version" style="color:var(--text-dim);background:rgba(255,255,255,0.05);">$1</span>'
# 4. Mark old latest download button as "old" (both Windows and Mac)
$html = $html -replace 'class="cl-download">', 'class="cl-download old">'
$html = $html -replace 'class="cl-download" style="[^"]*">', 'class="cl-download old">'

# 5. Build and insert new Latest entry at top of list
$today = Get-Date -Format "yyyy-MM-dd"
$versionId = $Version.Replace('.', '')
$newEntry = @"
                <li class="changelog-item latest">
                    <div class="cl-version-block">
                        <span class="cl-version">v$Version</span>
                        <span class="cl-latest-badge">Latest</span>
                        <span class="cl-date">$today</span>
                    </div>
                    <div class="cl-body">
                        <h3>$Notes</h3>
                        <ul class="cl-notes">
                            <li class="fix">$Notes</li>
                        </ul>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <a id="dl-v$versionId-win" href="https://github.com/kidiksentrik/Calendar-On-Demand/releases/download/v$Version/Calendar-On-Demand-Setup-$Version.exe" class="cl-download">&#x2b07; Windows</a>
                        <a id="dl-v$versionId-mac" href="https://github.com/kidiksentrik/Calendar-On-Demand/releases/download/v$Version/Calendar-On-Demand-Mac-$Version.dmg" class="cl-download" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);">&#x2b07; Mac</a>
                    </div>
                </li>

"@
$html = $html -replace '(<ul class="changelog-list">)', "`$1`r`n`r`n$newEntry"

[System.IO.File]::WriteAllText((Resolve-Path "docs/index.html").Path, $html, [System.Text.UTF8Encoding]::new($false))
Write-Host "      ??Website updated successfully" -ForegroundColor Green

# ?�?� 3. Electron Build ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
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
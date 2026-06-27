# release.ps1
# 사용법: .\release.ps1 -Version "1.0.3" -Notes "변경사항 설명"
# 예시:   .\release.ps1 -Version "1.0.3" -Notes "버그 수정 및 성능 개선"

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
Write-Host "  버전: v$Version" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. package.json 버전 업데이트 ──────────────────────────────
Write-Host "[1/6] package.json 버전을 $Version 으로 업데이트..." -ForegroundColor Yellow
$pkg = Get-Content "package.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$pkg.version = $Version
$json = $pkg | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText((Resolve-Path "package.json").Path, $json, [System.Text.UTF8Encoding]::new($false))
Write-Host "      ✓ package.json 업데이트 완료" -ForegroundColor Green

# ── 2. docs/index.html 다운로드 링크 & Changelog 업데이트 ──────
Write-Host "[2/6] 웹사이트 docs/index.html 업데이트..." -ForegroundColor Yellow
$html = Get-Content "docs/index.html" -Raw -Encoding UTF8

# 이전 버전 다운로드 링크 전체를 새 버전으로 교체
$html = $html -replace 'releases/download/v[\d\.]+/Calendar-On-Demand-Setup-[\d\.]+\.exe', "releases/download/v$Version/Calendar-On-Demand-Setup-$Version.exe"
# 버전 표시 텍스트 교체
$html = $html -replace '\(v[\d\.]+\)', "(v$Version)"
# 업데이트 배너 교체
$html = $html -replace '(<strong>v[\d\.]+ is out!</strong>[^<]*)', "<strong>v$Version is out!</strong> — $Notes"
# "Latest" 배지 달린 최신 버전 번호 교체
$html = $html -replace '(<span class="cl-version">)v[\d\.]+(<\/span>\s*<\/div>\s*<div[^>]*>\s*<span class="cl-body">)', "`${1}v$Version`${2}"

[System.IO.File]::WriteAllText((Resolve-Path "docs/index.html").Path, $html, [System.Text.UTF8Encoding]::new($false))
Write-Host "      ✓ 웹사이트 업데이트 완료" -ForegroundColor Green

# ── 3. Electron 빌드 ───────────────────────────────────────────
Write-Host "[3/6] Electron 빌드 시작 (2~3분 소요)..." -ForegroundColor Yellow
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ✗ 빌드 실패! 관리자 권한으로 실행했는지 확인하세요." -ForegroundColor Red
    exit 1
}
Write-Host "      ✓ 빌드 완료" -ForegroundColor Green

# ── 4. 빌드된 .exe 찾기 ────────────────────────────────────────
Write-Host "[4/6] 빌드된 설치 파일 확인..." -ForegroundColor Yellow
$exeFile = Get-ChildItem "dist" -Filter "*.exe" | Where-Object { $_.Name -like "*Setup*" } | Select-Object -First 1
if (-not $exeFile) {
    Write-Host "      ✗ dist 폴더에서 .exe 파일을 찾을 수 없습니다." -ForegroundColor Red
    exit 1
}
Write-Host "      ✓ $($exeFile.Name) ($([Math]::Round($exeFile.Length/1MB, 1)) MB)" -ForegroundColor Green

# ── 5. Git 커밋 & 푸시 ─────────────────────────────────────────
Write-Host "[5/6] 변경사항 커밋 및 푸시..." -ForegroundColor Yellow
git add -A
git commit -m "feat: v$Version - $Notes"
git push origin main
Write-Host "      ✓ GitHub 푸시 완료" -ForegroundColor Green

# ── 6. GitHub Release 생성 & .exe 업로드 ──────────────────────
Write-Host "[6/6] GitHub Release v$Version 생성 및 파일 업로드..." -ForegroundColor Yellow

$releaseNotes = @"
## What's New in v$Version

$Notes

---
*Full changelog: https://kidiksentrik.github.io/Calendar-On-Demand/#changelog*
"@

gh release create "v$Version" $exeFile.FullName `
    --title "v$Version — $Notes" `
    --notes $releaseNotes

Write-Host "      ✓ Release 업로드 완료" -ForegroundColor Green

# ── 완료 ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  배포 완료! v$Version" -ForegroundColor Green
Write-Host "  Release: https://github.com/kidiksentrik/Calendar-On-Demand/releases/tag/v$Version" -ForegroundColor Cyan
Write-Host "  웹사이트: https://kidiksentrik.github.io/Calendar-On-Demand/" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

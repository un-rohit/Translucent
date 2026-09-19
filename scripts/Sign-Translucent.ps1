<#
.SYNOPSIS
    Signs Translucent executables and MSIX packages with Authenticode and RFC 3161 timestamping.

.DESCRIPTION
    Uses signtool.exe to apply a SHA-256 digital signature
    with a trusted timestamp from DigiCert.

.PARAMETER TargetPath
    Path to the executable or MSIX to sign. Defaults to server/public/downloads/Translucent.exe

.PARAMETER PfxPath
    Path to the PFX certificate. Defaults to packaging_tools/Translucent-Publisher.pfx

.PARAMETER Password
    PFX password. Defaults to "Translucent2026!"
#>

param(
    [string]$TargetPath = "$PSScriptRoot\..\server\public\downloads\Translucent.exe",
    [string]$PfxPath = "$PSScriptRoot\..\packaging_tools\Translucent-Publisher.pfx",
    [string]$Password = "Translucent2026!"
)

# Locate signtool.exe
$candidateSigntools = @(
    (Join-Path $PSScriptRoot "signtool.exe"),
    (Join-Path $PSScriptRoot "..\packaging_tools\signtool.exe"),
    "signtool.exe"
)

$signtool = $null
foreach ($s in $candidateSigntools) {
    if (Test-Path $s) {
        $signtool = (Resolve-Path $s).Path
        break
    }
}

if (-not $signtool) {
    # Check PATH
    $cmd = Get-Command "signtool.exe" -ErrorAction SilentlyContinue
    if ($cmd) {
        $signtool = $cmd.Source
    }
}

if (-not $signtool) {
    Write-Error "signtool.exe could not be found in scripts or packaging_tools directory."
    exit 1
}

$resolvedTarget = (Resolve-Path $TargetPath -ErrorAction SilentlyContinue).Path
if (-not $resolvedTarget -or -not (Test-Path $resolvedTarget)) {
    Write-Error "Target file to sign not found: $TargetPath"
    exit 1
}

$resolvedPfx = (Resolve-Path $PfxPath -ErrorAction SilentlyContinue).Path
if (-not $resolvedPfx -or -not (Test-Path $resolvedPfx)) {
    Write-Error "PFX certificate not found: $PfxPath"
    exit 1
}

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "   Translucent Authenticode Code Signing Tool" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "File to Sign : $resolvedTarget" -ForegroundColor Yellow
Write-Host "Certificate  : $resolvedPfx" -ForegroundColor Yellow
Write-Host "Signtool     : $signtool" -ForegroundColor Yellow
Write-Host "Timestamp URL: http://timestamp.digicert.com (RFC 3161)" -ForegroundColor Yellow
Write-Host ""

Write-Host "[*] Signing binary..." -ForegroundColor Gray
& $signtool sign /f "$resolvedPfx" /p "$Password" /tr "http://timestamp.digicert.com" /td sha256 /fd sha256 /d "Translucent" /du "https://translucent-livid.vercel.app" "$resolvedTarget"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Successfully signed: $resolvedTarget" -ForegroundColor Green
    Write-Host ""
    Write-Host "[*] Verifying Authenticode Signature..." -ForegroundColor Cyan
    Get-AuthenticodeSignature "$resolvedTarget" | Format-List SignerCertificate, TimeStamperCertificate, Status, StatusMessage
} else {
    Write-Error "[FAILED] Signing failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

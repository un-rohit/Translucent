<#
.SYNOPSIS
    Builds the Translucent MSIX package ready for Microsoft Store submission.

.DESCRIPTION
    Updates AppxManifest.xml with your Microsoft Partner Center Package Identity
    (Identity Name, Publisher CN, PublisherDisplayName), and packages the application
    into an MSIX ready to be uploaded to Microsoft Partner Center.

.PARAMETER IdentityName
    The Package/Identity/Name from Microsoft Partner Center (e.g., RohitIndustries.Translucent or 12345Rohit.Translucent).

.PARAMETER Publisher
    The Package/Identity/Publisher from Microsoft Partner Center (e.g., CN=8A14B2C3-XXXX-XXXX-XXXX-XXXXXXXXXXXX).

.PARAMETER PublisherDisplayName
    The Publisher display name from Microsoft Partner Center (e.g., Rohit Industries).

.PARAMETER Version
    Package version string (default: 1.0.0.0).

.PARAMETER Rebuild
    If specified, runs 'dotnet publish' to ensure the latest release binaries are staged.

.EXAMPLE
    .\scripts\Build-StorePackage.ps1
    (Packs the existing staging folder with current manifest)

.EXAMPLE
    .\scripts\Build-StorePackage.ps1 -IdentityName "Rohit.Translucent" -Publisher "CN=8A14B2C3-..." -PublisherDisplayName "Rohit" -Version "1.0.1.0"
#>

param(
    [string]$IdentityName = "",
    [string]$Publisher = "",
    [string]$PublisherDisplayName = "",
    [string]$Version = "",
    [switch]$NoRebuild
)

$rootDir = Split-Path -Parent $PSScriptRoot
$stagingDir = Join-Path $rootDir "package_staging"
$manifestPath = Join-Path $stagingDir "AppxManifest.xml"
$makeappx = Join-Path $rootDir "packaging_tools\makeappx.exe"
$outputMsix = Join-Path $rootDir "Translucent.msix"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       Translucent - Microsoft Store Packaging Tool         " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Rebuild dotnet project (default unless -NoRebuild is passed)
if (-not $NoRebuild) {
    Write-Host "`n[*] Rebuilding Release binary..." -ForegroundColor Yellow
    $publishOut = Join-Path $rootDir "publish"
    $userDotnet = "$env:USERPROFILE\.dotnet\dotnet.exe"
    $dotnetCmd = if (Test-Path $userDotnet) { $userDotnet } else { "dotnet" }
    
    & $dotnetCmd publish "$rootDir\InvisibleChat.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true -o "$publishOut"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "dotnet publish failed!"
        exit 1
    }
    
    Write-Host "[*] Updating package_staging binaries..." -ForegroundColor Gray
    Get-ChildItem -Path $publishOut -Exclude "*.pdb" | Copy-Item -Destination $stagingDir -Force -Recurse
}

# 2. Update manifest identity if provided
if (Test-Path $manifestPath) {
    [xml]$manifest = Get-Content $manifestPath -Raw
    $modified = $false

    if ($IdentityName) {
        $manifest.Package.Identity.Name = $IdentityName
        $modified = $true
        Write-Host "[*] Updated Identity Name: $IdentityName" -ForegroundColor Green
    }

    if ($Publisher) {
        $manifest.Package.Identity.Publisher = $Publisher
        $modified = $true
        Write-Host "[*] Updated Publisher: $Publisher" -ForegroundColor Green
    }

    if ($PublisherDisplayName) {
        $manifest.Package.Properties.PublisherDisplayName = $PublisherDisplayName
        $modified = $true
        Write-Host "[*] Updated Publisher Display Name: $PublisherDisplayName" -ForegroundColor Green
    }

    if ($Version) {
        $manifest.Package.Identity.Version = $Version
        $modified = $true
        Write-Host "[*] Updated Version: $Version" -ForegroundColor Green
    }

    if ($modified) {
        $manifest.Save($manifestPath)
        Write-Host "[OK] AppxManifest.xml successfully updated." -ForegroundColor Green
    }
} else {
    Write-Error "Manifest not found at: $manifestPath"
    exit 1
}

# 3. Generate resources.pri using makepri.exe
$makepri = Join-Path $rootDir "packaging_tools\makepri.exe"
if (Test-Path $makepri) {
    Write-Host "`n[*] Generating Package Resource Index (resources.pri)..." -ForegroundColor Yellow
    $priconfig = Join-Path $stagingDir "priconfig.xml"
    $priOut = Join-Path $stagingDir "resources.pri"
    & "$makepri" createconfig /cf "$priconfig" /dq en-US /o | Out-Null
    & "$makepri" new /pr "$stagingDir" /cf "$priconfig" /of "$priOut" /o | Out-Null
    Remove-Item "$priconfig" -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] resources.pri generated." -ForegroundColor Green
}

# 4. Pack MSIX package
Write-Host "`n[*] Building MSIX package via makeappx.exe..." -ForegroundColor Yellow
if (-not (Test-Path $makeappx)) {
    Write-Error "makeappx.exe not found at $makeappx"
    exit 1
}

& "$makeappx" pack /d "$stagingDir" /p "$outputMsix" /o

# 5. Sign MSIX with code signing certificate
$signScript = Join-Path $rootDir "packaging_tools\Sign-Translucent.ps1"
if (Test-Path $signScript) {
    Write-Host "`n[*] Signing MSIX package..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File "$signScript" -TargetPath "$outputMsix" | Out-Null
    Write-Host "[OK] Translucent.msix signed." -ForegroundColor Green
}

if ($LASTEXITCODE -eq 0) {
    # 6. Sync to web distribution folder
    $serverDownloads = Join-Path $rootDir "server\public\downloads"
    if (Test-Path $serverDownloads) {
        Write-Host "`n[*] Syncing to web distribution ($serverDownloads)..." -ForegroundColor Yellow
        $serverMsix = Join-Path $serverDownloads "Translucent.msix"
        Copy-Item -Path "$outputMsix" -Destination "$serverMsix" -Force
        Write-Host "[OK] Synced $serverMsix" -ForegroundColor Green

        $publishExe = Join-Path $rootDir "publish\Translucent.exe"
        if (-not (Test-Path $publishExe)) {
            $publishExe = Join-Path $rootDir "publish\InvisibleChat.exe"
        }
        $serverExe = Join-Path $serverDownloads "Translucent.exe"
        if (Test-Path $publishExe) {
            Copy-Item -Path "$publishExe" -Destination "$serverExe" -Force
            if (Test-Path $signScript) {
                & powershell -ExecutionPolicy Bypass -File "$signScript" -TargetPath "$serverExe" | Out-Null
            }
            Write-Host "[OK] Synced and signed $serverExe" -ForegroundColor Green
        }
    }

    $sizeMB = [math]::Round((Get-Item $outputMsix).Length / 1MB, 2)
    Write-Host "`n============================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] Translucent.msix generated successfully ($sizeMB MB)" -ForegroundColor Green
    Write-Host " Output file: $outputMsix" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "`nNext Steps for Microsoft Store Submission:" -ForegroundColor Cyan
    Write-Host "1. Log into Microsoft Partner Center: https://partner.microsoft.com/dashboard"
    Write-Host "2. Go to your app 'Translucent' -> Start submission"
    Write-Host "3. In 'Packages' section, upload: $outputMsix"
    Write-Host "4. For 'runFullTrust' capability prompt, write:"
    Write-Host "   'Desktop application requiring full trust for local browser controls (WebView2), keyboard shortcuts, and screen overlay features.'"
    Write-Host "5. Submit to Store! Microsoft will sign and distribute it with zero warnings."
} else {
    Write-Error "[FAILED] makeappx pack failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

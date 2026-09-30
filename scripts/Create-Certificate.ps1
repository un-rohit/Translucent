<#
.SYNOPSIS
    Generates a new self-signed Code Signing certificate for Translucent and registers it for local MSIX installation.

.DESCRIPTION
    Creates a 5-year Code Signing certificate using PowerShell's New-SelfSignedCertificate,
    exports it to .cer and .pfx with the designated password, and installs it into CurrentUser\TrustedPeople
    so Windows App Installer recognizes the publisher.

.PARAMETER Subject
    Subject distinguished name (default: "CN=Translucent Technologies, O=Translucent, C=US")

.PARAMETER Password
    PFX password (default: "Translucent2026!")

.EXAMPLE
    .\scripts\Create-Certificate.ps1
#>

param(
    [string]$Subject = "CN=Translucent Technologies, O=Translucent, C=US",
    [string]$Password = "Translucent2026!"
)

$rootDir = Split-Path -Parent $PSScriptRoot
$packagingDir = Join-Path $rootDir "packaging_tools"
$cerPath = Join-Path $packagingDir "Translucent-Publisher.cer"
$pfxPath = Join-Path $packagingDir "Translucent-Publisher.pfx"
$scriptsCerPath = Join-Path $PSScriptRoot "Translucent-Publisher.cer"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       Translucent - Code Signing Certificate Generator     " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "`n[*] Creating new self-signed Code Signing certificate (5-year validity)..." -ForegroundColor Yellow
$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject $Subject `
    -KeyUsage DigitalSignature `
    -FriendlyName "Translucent Technologies Code Signing" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears(5)

Write-Host "[OK] Certificate created with Thumbprint: $($cert.Thumbprint)" -ForegroundColor Green

# Export CER
Write-Host "[*] Exporting public certificate (.cer)..." -ForegroundColor Gray
Export-Certificate -Cert $cert -FilePath $cerPath -Force | Out-Null
Copy-Item $cerPath $scriptsCerPath -Force

# Export PFX
Write-Host "[*] Exporting private key package (.pfx)..." -ForegroundColor Gray
$secPassword = ConvertTo-SecureString -String $Password -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $secPassword -Force | Out-Null

# Install to CurrentUser\TrustedPeople for local MSIX installation
Write-Host "[*] Registering certificate in CurrentUser\TrustedPeople store..." -ForegroundColor Gray
Import-Certificate -CertStoreLocation "Cert:\CurrentUser\TrustedPeople" -FilePath $cerPath | Out-Null

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host " [SUCCESS] Certificate generated and installed successfully!" -ForegroundColor Green
Write-Host " CER file: $cerPath" -ForegroundColor Green
Write-Host " PFX file: $pfxPath" -ForegroundColor Green
Write-Host " Password: $Password" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

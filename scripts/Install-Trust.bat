@echo off
:: =========================================================================
:: Translucent Publisher Certificate Installer (One-Click Trust Setup)
:: =========================================================================
:: This script installs the Translucent Technologies digital certificate
:: into Windows Trusted Root and Trusted Publisher stores.
:: Once installed, Windows SmartScreen and Smart App Control recognize
:: Translucent as a trusted, verified application on this machine.
:: =========================================================================

echo.
echo ===================================================
echo   Translucent Technologies - Trusted Certificate
echo ===================================================
echo.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Administrator permissions required.
    echo [*] Attempting to elevate permissions...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~dp0Install-Trust.bat\"\"' -Verb RunAs"
    exit /b
)

set CERT_FILE=%~dp0Translucent-Publisher.cer

if not exist "%CERT_FILE%" (
    echo [ERROR] Certificate file not found: %CERT_FILE%
    pause
    exit /b 1
)

echo [*] Installing Translucent Publisher Certificate into Trusted People Store (MSIX Sideloading)...
certutil -addstore -f "TrustedPeople" "%CERT_FILE%" >nul 2>&1
certutil -user -addstore -f "TrustedPeople" "%CERT_FILE%" >nul 2>&1

echo [*] Installing Translucent Publisher Certificate into Trusted Root Store...
certutil -addstore -f "Root" "%CERT_FILE%" >nul 2>&1
certutil -user -addstore -f "Root" "%CERT_FILE%" >nul 2>&1

echo [*] Installing Translucent Publisher Certificate into Trusted Publishers Store...
certutil -addstore -f "TrustedPublisher" "%CERT_FILE%" >nul 2>&1
certutil -user -addstore -f "TrustedPublisher" "%CERT_FILE%" >nul 2>&1

echo.
echo [SUCCESS] Translucent Technologies has been successfully added as a Trusted Publisher!
echo Windows SmartScreen and Smart App Control will now recognize Translucent.exe as verified.
echo.
pause

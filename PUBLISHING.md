# 🚀 Windows App Publishing & Verified Code Signing Guide

This guide explains how to get **Translucent** officially signed and published so that Windows Defender SmartScreen, Smart App Control (SAC), and web browsers recognize it as a **Verified Publisher** with **zero warnings or blocks**.

---

## 🔍 Why Windows Shows "Unknown Publisher" & Warnings

When users download a newly released `.exe` from the web, two security mechanisms inspect it:
1. **Microsoft SmartScreen / Browser Heuristics:**
   - Evaluates global download volume. New binaries have near-zero telemetry, triggering *"Isn't commonly downloaded"*.
2. **Windows 11 Smart App Control (SAC):**
   - Automatically blocks apps downloaded from the internet unless they are signed by a Certificate Authority (CA) in the **Microsoft Trusted Root Program** or have established extensive global reputation.

---

## 🏆 The 3 Official Paths to Verified Publisher Status

| Option | Cost | Best For | SmartScreen Warnings | Setup Time |
| :--- | :--- | :--- | :--- | :--- |
| **1. Microsoft Store** | **$19 one-time** | **Indie Developers & Startups** | **0% (Instant 100% Trust)** | 1–3 days |
| **2. Azure Trusted Signing** | ~$9.99 / month | Cloud CI/CD & direct `.exe` downloads | Quickly eliminated | 1–2 days |
| **3. Commercial EV Certificate** | $70–$400 / year | Traditional enterprise distribution | Instantly eliminated | 2–5 days |

---

### Path 1: Microsoft Store Publishing (Recommended & Most Cost-Effective)

The Microsoft Store is the easiest and most economical way to publish Windows apps without buying expensive annual certificates.

#### Why it works:
When you submit an MSIX package to the Microsoft Store, **Microsoft signs the package with Microsoft Corporation's own trusted signature**.

#### Step-by-Step Instructions:

1. **Create a Microsoft Developer Account:**
   - Go to [Microsoft Partner Center](https://partner.microsoft.com/dashboard/registration).
   - Register for an individual account (one-time fee of ~$19 USD, no recurring subscriptions).

2. **Reserve Your App Name:**
   - In Partner Center, go to **Apps and games** ➔ **New product** ➔ **MSIX or PWA app**.
   - Reserve the product name: `Translucent`.

3. **Obtain Your Package Identity:**
   - Under **Product management** ➔ **Package identity**, copy:
     - **Package/Identity/Name** (e.g., `RohitIndustries.Translucent`)
     - **Package/Identity/Publisher** (e.g., `CN=553DB1FB-...`)
     - **Publisher display name** (e.g., `Rohit Industries`)
   - Update these values in [`package_staging/AppxManifest.xml`](file:///C:/Users/unroh/OneDrive/Desktop/Invisible/package_staging/AppxManifest.xml).

4. **Package the Application into MSIX:**
   Run the packaging tool:
   ```powershell
   .\packaging_tools\makeappx.exe pack /d package_staging /p Translucent.msix /o
   ```

5. **Upload & Publish:**
   - In Partner Center, create a new submission.
   - Upload `Translucent.msix`.
   - Complete store listing (screenshots, description, pricing: Free).
   - Click **Submit to the Store**. Review typically takes 24–48 hours.
   - Once approved, users can install via the Microsoft Store or directly via web link (`ms-windows-store://pdp/?productid=...`) with **zero security prompts**.

---

### Path 2: Microsoft Azure Trusted Signing (Modern Cloud `.exe` Signing)

If you want users to download a standalone `.exe` directly from your website, [Azure Trusted Signing](https://azure.microsoft.com/en-us/products/trusted-signing) is Microsoft's official cloud code-signing service.

#### Benefits:
- Eliminates physical hardware USB tokens.
- Pay-as-you-go (~$9.99/mo).
- Integrates directly into GitHub Actions and local command lines.

#### Steps to Set Up:
1. Create an Azure account at [portal.azure.com](https://portal.azure.com).
2. Create an **Azure Trusted Signing** resource in your subscription.
3. Complete Identity Verification (individual or company).
4. Create a Certificate Profile.
5. Sign your `.exe` using `signtool.exe` with the Azure Signing Dlib:
   ```powershell
   .\packaging_tools\signtool.exe sign /v /fd SHA256 /tr http://timestamp.acs.microsoft.com /td SHA256 /dlib "Azure.CodeSigning.Dlib.dll" /dmc "metadata.json" "server/public/downloads/Translucent.exe"
   ```

---

### Path 3: Commercial Code Signing Certificate (Certum / DigiCert / Sectigo)

To buy a traditional certificate for `.exe` signing:
1. **Certum Open Source Developer Certificate:** ~$70–$80/year (affordable option for developers).
2. **Standard / EV Code Signing (Sectigo/DigiCert):** ~$250–$400/year.
3. Once issued, export your `.pfx` file and run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\packaging_tools\Sign-Translucent.ps1 -TargetPath "server/public/downloads/Translucent.exe" -PfxPath "path_to_your_cert.pfx" -Password "your_password"
   ```

---

## 🛠️ Testing & Immediate Distribution (One-Click Trust Setup)

While preparing your Microsoft Store or commercial certificate submission, you can distribute `Translucent.exe` to testers, team members, or clients using the included **One-Click Trust Setup**:

1. Distribute `Translucent.exe` along with [`packaging_tools/Install-Trust.bat`](file:///C:/Users/unroh/OneDrive/Desktop/Invisible/packaging_tools/Install-Trust.bat) and [`packaging_tools/Translucent-Publisher.cer`](file:///C:/Users/unroh/OneDrive/Desktop/Invisible/packaging_tools/Translucent-Publisher.cer).
2. Right-click `Install-Trust.bat` ➔ **Run as Administrator**.
3. The script automatically installs the publisher certificate into the machine's **Trusted Root** and **Trusted Publishers** stores.
4. Launch `Translucent.exe` — Windows displays:
   ```
   Verified Publisher: Translucent Technologies
   ```
   with zero SmartScreen or Smart App Control blocks!

---

## ⚡ Quick Reference Commands

- **Sign any .EXE:**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\packaging_tools\Sign-Translucent.ps1 -TargetPath "server/public/downloads/Translucent.exe"
  ```

- **Verify Signature:**
  ```powershell
  Get-AuthenticodeSignature "server/public/downloads/Translucent.exe" | Format-List
  ```

- **Pack MSIX for Store:**
  ```powershell
  .\packaging_tools\makeappx.exe pack /d package_staging /p Translucent.msix /o
  ```

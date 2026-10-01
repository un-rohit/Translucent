# Translucent Pro — Admin Console

A modern mission-control dashboard for managing Translucent user subscriptions, hardware device bindings, and payment settings.

## Tech Stack
* **Framework**: Next.js 16 (App Router)
* **Library**: React 19 + TypeScript
* **Styling**: Tailwind CSS v4 (Cyber-dark obsidian theme with glowing neon accents)
* **Icons**: Lucide React

---

## Features
1. **Secure Admin Authentication**: Password-protected session with auto-expiry handling.
2. **KPI Analytics**: Real-time stats on Total Users, Active PRO subscribers, Pending requests, and estimated revenue.
3. **User Management Table**:
   - Filter by status (*All, Active, Pending, Expired, Revoked*).
   - Real-time search across Name, Email, Plan, and Hardware Device ID.
   - Click-to-copy Hardware Device ID to easily trace Windows installations.
   - 1-click **Approve** (with custom durations: 7d, 30d, 90d, 180d, 365d, or Lifetime) and **Revoke**.
   - Permanent delete user action.
4. **Global System Settings**:
   - Backend API URL configuration.
   - Telegram Payment Bot username (`@TranslucentPayBot`).
   - Telegram UPI ID (`rohit.1604@superyes`).
   - App client download link (`Translucent.exe` / `.msix`).
   - Change admin master password.
5. **Interactive Feedback**: Dynamic toasts for all actions.

---

## Getting Started

### 1. Run Development Server
```bash
cd admin
npm run dev
```
The console will start at `http://localhost:3001` (configured to not conflict with the backend on port `3000`).

### 2. Production Build
```bash
cd admin
npm run build
npm start
```

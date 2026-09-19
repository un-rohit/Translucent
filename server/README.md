# Translucent Licensing, Auth & Admin Server

A lightweight, turn-key authentication and subscription licensing backend for **Translucent Pro**.

---

## ⚡ Features

* **Google Authentication (OAuth 2.0)**: Connects Google accounts and generates secure 30-day JWT sessions.
* **Instant Subscription Status Verification**: Desktop app polls `/api/subscription/status` with Bearer tokens to verify if a user has an active license.
* **Web Admin Dashboard (`/admin.html`)**:
  * Real-time metrics: Total Users, Active Subscriptions, Pending Approvals, Expired Accounts.
  * Search and filter by name, email, or status.
  * 1-click **Approve & Activate** with duration picker (30 Days, 90 Days, 1 Year, Lifetime Access).
  * 1-click **Revoke Access** or **Delete Account**.
  * Settings management: Update payment/checkout URL, admin contact info, and admin password.
* **Embedded SQLite Database (`node:sqlite`)**: Zero database setup required. Runs with native Node.js 22+ SQLite support.

---

## 🚀 Quick Start (Local Development)

### 1. Start the Server
Double click `start_server.bat` in the repository root, or run:
```bash
cd server
npm start
```

### 2. Access the Admin Portal
1. Open your browser and navigate to:
   **[http://localhost:3000/admin.html](http://localhost:3000/admin.html)**
2. Enter the default administrator key:
   `admin123`
3. You can now view all registered users and approve their subscriptions.

---

## 🌐 Deploying to Production (Render / Railway / VPS)

### Option A: Render (Free Tier)
1. Push your repository to GitHub.
2. Go to [render.com](https://render.com) and click **New +** -> **Web Service**.
3. Select your repository.
4. Set:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Add Environment Variables:
   - `ADMIN_PASSWORD`: Your secret admin password
   - `JWT_SECRET`: A long random secret string
   - `PORT`: `3000` (or leave default)
6. Once deployed, update `AuthServerUrl` in `config.json` or through settings to your Render URL: `https://your-service.onrender.com`.

### Option B: Railway (Free / Starter)
1. Click **New Project** -> **Deploy from GitHub repo**.
2. Set Root Directory to `/server`.
3. Set environment variables.
4. Deploy!

---

## 🔑 REST API Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/public/config` | Returns public checkout URL & support contact | No |
| `POST` | `/api/auth/google` | Logs in or registers Google user, returns JWT & status | No |
| `GET` | `/api/subscription/status` | Verifies if current user subscription is active | Bearer JWT |
| `POST` | `/api/admin/login` | Authenticates administrator with admin password | No |
| `GET` | `/api/admin/stats` | Returns counters (total, active, pending, expired) | Admin Bearer |
| `GET` | `/api/admin/users` | Lists all registered users | Admin Bearer |
| `POST` | `/api/admin/users/:id/approve`| Activates subscription (duration in days, plan) | Admin Bearer |
| `POST` | `/api/admin/users/:id/revoke` | Suspends/revokes user subscription | Admin Bearer |
| `DELETE`| `/api/admin/users/:id` | Deletes user record | Admin Bearer |
| `POST` | `/api/admin/settings` | Updates payment URL, contact, or admin password | Admin Bearer |

# WebHostMost.com Deployment Guide - Hissob ERP

This document provides a complete step-by-step guide for hosting **Hissob ERP** (FastAPI Backend + React Frontend + PostgreSQL Database) on **WebHostMost.com Shared Hosting (cPanel / Phusion Passenger)**.

---

## 🏗️ Architecture Overview

| Component | Shared Hosting Strategy | Target Location / Tool |
|---|---|---|
| **Frontend (React/Vite)** | Static Built Assets (HTML, JS, CSS) | `public_html` / Domain Root |
| **Backend (FastAPI)** | Phusion Passenger WSGI (`a2wsgi` adapter) | `cPanel -> Setup Python App` |
| **Database** | PostgreSQL | `cPanel -> PostgreSQL Databases` |
| **Media/Uploads** | Local Filesystem Storage | `backend/uploads/` |
| **SSL Certificate** | Free Let's Encrypt / cPanel AutoSSL | `cPanel -> SSL/TLS Status` |

---

## Step 1: Create PostgreSQL Database on cPanel

1. Log into your **WebHostMost cPanel**.
2. Under the **Databases** section, click **PostgreSQL Databases** (or PostgreSQL Database Wizard).
3. **Create a Database**:
   - Name: `yourusername_hissob_db`
4. **Create a Database User**:
   - Username: `yourusername_hissob_user`
   - Password: `[Generate a strong password]`
5. **Add User to Database**:
   - Assign all privileges to `yourusername_hissob_user` on `yourusername_hissob_db`.
6. **Note down your Database Credentials**:
   - Host: `localhost` or `127.0.0.1`
   - Database Name: `yourusername_hissob_db`
   - User: `yourusername_hissob_user`
   - Password: `[Your Password]`
   - Port: `5432`

---

## Step 2: Configure & Build Frontend Locally

Before uploading, build the React frontend for production:

1. Open `frontend/.env` (or create `frontend/.env.production`):
   ```env
   VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
   ```
   *(Replace `api.yourdomain.com` with your actual domain or subdomain).*

2. Open terminal in `frontend/` directory and run:
   ```bash
   npm run build
   ```

3. The compiled build will be placed in `frontend/dist/`.
4. Ensure `.htaccess` exists in `frontend/dist/` (it includes SPA fallback rewrite rules).
5. Zip the **contents** of `frontend/dist/` (e.g., `dist.zip`).

---

## Step 3: Setup Python Backend Application in cPanel

1. In cPanel, navigate to **Software** -> **Setup Python App**.
2. Click **Create Application**.
3. Fill in the configuration details:
   - **Python Version**: Select **3.11** or **3.12** (or latest available).
   - **Application Root**: `hissob_backend`
   - **Application URL**: `api.yourdomain.com` (or `yourdomain.com/api`)
   - **Application Startup File**: `passenger_wsgi.py`
   - **Application Entry Point**: `application`
   - **Passenger Log File**: `logs/passenger.log` (optional)
4. Click **Create**.

---

## Step 4: Upload Backend Files to Server

1. Open cPanel **File Manager** (or use FTP / SFTP).
2. Go to the created app folder: `/home/yourusername/hissob_backend/`.
3. Upload the following repository files into `/home/yourusername/hissob_backend/`:
   - `passenger_wsgi.py`
   - `backend/` directory
   - `alembic.ini`
4. Create `.env` inside `/home/yourusername/hissob_backend/backend/.env`:
   ```env
   ENVIRONMENT=production
   SECRET_KEY=your_generated_random_64_character_secret_key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440

   # PostgreSQL Connection String
   DATABASE_URL=postgresql://yourusername_hissob_user:YourPassword@localhost:5432/yourusername_hissob_db

   # CORS Configuration
   ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

   # Storage Path
   UPLOAD_DIR=/home/yourusername/hissob_backend/backend/uploads
   ```

---

## Step 5: Install Python Dependencies & Run Migrations

1. Go back to cPanel **Setup Python App**.
2. At the top of your app settings page, copy the **Virtual Environment Command**.
   *(Example: `source /home/yourusername/virtualenv/hissob_backend/3.11/bin/activate && cd /home/yourusername/hissob_backend`)*.
3. Open **Terminal** in cPanel (or connect via SSH).
4. Paste the virtualenv activation command to enter the Python virtual environment.
5. Install the required dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r backend/requirements.txt
   ```
6. Run database migrations with Alembic:
   ```bash
   cd backend
   alembic upgrade head
   ```
7. Verify backend uploads folder permissions:
   ```bash
   mkdir -p uploads
   chmod 755 uploads
   ```

---

## Step 6: Deploy Frontend Static Build

1. Open cPanel **File Manager**.
2. Go to `public_html` (or your subdomain folder for the frontend, e.g. `public_html`).
3. Upload `dist.zip`.
4. Extract `dist.zip` into `public_html`.
5. Verify that `index.html` and `.htaccess` are present in `public_html`.

---

## Step 7: Issue Free SSL Certificate & Restart Application

1. In cPanel, navigate to **SSL/TLS Status** or **AutoSSL**.
2. Click **Run AutoSSL** to generate free Let's Encrypt / cPanel SSL certificates for:
   - `yourdomain.com`
   - `api.yourdomain.com`
3. Go back to cPanel **Setup Python App**.
4. Click **Restart** button on your Python application.

---

## 🔍 Verification & Health Check

1. **Test API**: Visit `https://api.yourdomain.com/docs` in your browser. You should see the interactive FastAPI Swagger UI.
2. **Test Frontend**: Visit `https://yourdomain.com`. The Hissob ERP login page should load.
3. **Test Full Flow**:
   - Log in as Super Admin / Org Admin.
   - Create a test receipt or donor.
   - Download/print PDF receipt.
   - Confirm data persists in PostgreSQL.

---

## 🛠️ Troubleshooting & Logs

- **500 Internal Server Error on API**:
  - Check error log file in cPanel: `/home/yourusername/hissob_backend/stderr.log` or cPanel **Metrics** -> **Errors**.
  - Ensure `a2wsgi` is installed in the Python Virtual environment.
  - Verify PostgreSQL connection string in `backend/.env`.
- **404 Not Found on Page Refresh (Frontend)**:
  - Ensure `.htaccess` file is present in `public_html` with `RewriteEngine On` rules.
- **CORS Error in Browser**:
  - Double-check `ALLOWED_ORIGINS` in `backend/.env` matches your frontend domain `https://yourdomain.com`.

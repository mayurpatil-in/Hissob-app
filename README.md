# Hisob ERP — Production Commercial SaaS for Festival Collection & Financial Management

[![Live Demo](https://img.shields.io/badge/Live_Website-hisob.in-F97316?style=for-the-badge&logo=googlechrome)](https://hisob.in)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.140-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_6-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Ant Design](https://img.shields.io/badge/UI_Framework-Ant_Design_6-0170FE?style=for-the-badge&logo=antdesign)](https://ant.design/)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](#license)

🌐 **Live Production Application:** [https://hisob.in](https://hisob.in)

**Hisob ERP** is an enterprise-ready, multi-tenant commercial SaaS platform specifically architected for **Ganapati Mandals, Temples, Charitable Trusts, NGOs, and Community Organizations**. It automates festival donation collections, cash settlement reconciliation, expense management, event/VIP guest invitations, asset/inventory tracking, and financial year accounting.

---

## 🎨 Brand Design & Color Palette

Hisob ERP features a high-contrast, modern Navy & Orange visual identity tailored for trust, enterprise reliability, and vibrant festival aesthetics:

| Token Name         | Hex Code  | Purpose / Usage                                                      |
| :----------------- | :-------- | :------------------------------------------------------------------- |
| **Primary Navy**   | `#0B2347` | Header, Main Navigation Sidebar, Primary Headers, Corporate Elements |
| **Primary Orange** | `#F97316` | Accent Buttons, CTAs, Highlights, Active States, Festival Theme      |
| **Secondary Blue** | `#1E5AA8` | Sub-headers, Secondary Action Buttons, Active Tabs                   |
| **Golden Orange**  | `#FF9F1C` | Badges, Stat Highlights, VIP Badges, Warning Badges                  |
| **Pure White**     | `#FFFFFF` | Card Surfaces, Table Backdrops, Modal Layouts                        |

---

## ✨ Comprehensive Product Features

### 🏢 Multi-Tenant SaaS Architecture

- **Tenant Isolation**: Complete database row-level multi-tenancy enforced via `TenantMixin` and `TenantMiddleware` (`X-Tenant-ID` header & custom domain routing `*.hisob.in`).
- **Organization Management**: Multi-org setup with custom logos, financial preferences, address details, and subdomains.
- **Super Admin Dashboard**: Platform-wide metrics, tenant subscription management, storage quotas, global system settings, and cross-tenant audit trails.

### 🔐 Security, Authentication & Dynamic RBAC

- **OAuth2 + JWT Authentication**: Access tokens paired with secure HTTP-only refresh tokens.
- **Two-Factor Authentication (2FA)**: Time-based One-Time Password (TOTP) support via `pyotp` and QR code generation.
- **Email Invitation Flow**: Secure tokenized onboarding for team members with role assignments.
- **8-Level Role Hierarchy**:
  1. **Super Admin**: Complete platform & organization governance.
  2. **Organization Admin**: Full org setup, users, financial years, and settings.
  3. **President**: Strategic view, expense approvals, executive reporting.
  4. **Treasurer**: Cash settlements verification, expense disbursements, ledger locks.
  5. **Secretary**: Operational management, event scheduling, task tracking.
  6. **Collector**: Field donation collection, pending cash settlements.
  7. **Volunteer**: Event setup, QR code check-in scanning, inventory checkouts.
  8. **Auditor**: Read-only financial inspection and audit log verification.

### 💵 Financial Accounting & Cash Settlement

- **Financial Year Lifecycle**: Create, Open, Close, Lock, and Unlock financial periods with automatic carry-forward of closing balances.
- **Donation Receipts**:
  - Auto-generated sequential receipt numbers per organization/festival.
  - Payment modes: Cash, UPI, Cheque, Bank Transfer.
  - PDF Receipt Generation: Dual-engine PDF renderer supporting Unicode UTF-8 Devanagari script (Marathi/Hindi) via WeasyPrint / FPDF2 + HarfBuzz font shaping.
- **Cash Settlement Workflow**:
  $$\text{Collector Cash Receipt} \xrightarrow{\text{Pending}} \text{Treasurer Verification} \xrightarrow{\text{Approved}} \text{Cash Book Ledger Entry}$$
- **Expense Approvals**:
  $$\text{Expense Request} \xrightarrow{\text{Receipt/Bill Upload}} \text{Treasurer Approval} \xrightarrow{\text{Disbursement}} \text{Ledger Update}$$
- **Double-Entry Accounting & Financial Reports**:
  - Cash Book & Collector Wise Summary
  - Trial Balance & General Ledger
  - Income & Expenditure Statement
  - Balance Sheet (Assets vs Liabilities)
  - Export capabilities: Native Excel (`.xlsx`), CSV, and PDF.

### 🚩 Festival, Event & VIP Invitation Management

- **Multi-Festival Management**: Track separate financial ledgers and assets across multiple festivals within the same financial year.
- **VIP Event Invitations**:
  - Custom digital invitations for VIP patrons and donors.
  - Guest counts, VIP Tiers (_General Patron, VIP, VVIP_), RSVP tracking, and special Mahaprasad slot management.
  - **QR Code Check-In**: Built-in camera scanner for instant event check-in and attendance verification.

### 📦 Asset & Inventory Tracking

- **Category & Item Management**: Track sound systems, decorations, utensils, mandap items, and electronic equipment.
- **Checkout & Return Logs**: Track who checked out items, condition during checkout (_Good, Fair, Damaged, Under Repair_), return verification, and historical logs.

### 📋 Task, Volunteer & Budget Planning

- **Budget Allocations**: Category-wise budget cap enforcement per festival.
- **Task Kanban/List**: Priority tracking (_Low, Medium, High, Urgent_) with assignees and due dates.
- **Volunteer Shifts**: Assign shifts for festival events, prasad distribution, and security.

### 🤖 AI-Powered Capabilities

- **AI Financial Insights**: Intelligent anomaly detection and spending pattern highlights.
- **Donation Forecasting**: Predict upcoming collection trends based on historical donor data.
- **Voice Receipt Entry**: Voice-to-text automated donation form auto-fill.
- **OCR Bill Scanner**: Extract vendor name, amount, date, and invoice number from uploaded expense receipts.
- **Smart Expense Categorization**: Auto-tag expense line items.

### 📱 PWA & Mobile Optimization

- **Offline Entry & Sync**: Built with `vite-plugin-pwa` for offline caching and synchronization when network restores.
- **Mobile First Design**: Touch-friendly inputs, drawer-based navigation, responsive tables, and mobile receipt printing.

---

## 🛠️ Technology Stack & Dependencies

### Backend Stack

- **Framework**: Python 3.12, [FastAPI](https://fastapi.tiangolo.com/) `v0.140+`
- **ORM & Database**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/), [Alembic](https://alembic.sqlalchemy.org/) `v1.18+`
- **Package Manager**: [uv](https://github.com/astral-sh/uv) / `pyproject.toml`
- **Security**: `passlib[bcrypt]`, `python-jose[cryptography]`, `pyotp`, `slowapi`
- **Document & PDF Generation**: `weasyprint`, `fpdf2`, `fonttools`, `uharfbuzz`, `openpyxl`, `Pillow`
- **WSGI Wrapper**: `a2wsgi` (for Apache / Passenger cPanel hosting compatibility)

### Frontend Stack

- **Core**: React 19, TypeScript 6.0, Vite 8.1
- **UI Components & Icons**: Ant Design (`antd` `v6.5+`), `@ant-design/icons`, `lucide-react`
- **State & Data Fetching**: `@tanstack/react-query`, `zustand`
- **Forms & Validation**: `react-hook-form`, `zod`, `@hookform/resolvers`
- **Charts & Visualizations**: `echarts`, `echarts-for-react`
- **PWA & Offline**: `vite-plugin-pwa`, `html2canvas`, `qrcode`

---

## 🏗️ System Architecture & Workflows

### Multi-Tenant Request Isolation

```mermaid
graph TD
    Client[Client App / PWA] -->|X-Tenant-ID Header / Subdomain| Gateway[FastAPI Router]
    Gateway --> TenantMW[TenantMiddleware]
    TenantMW --> AuditMW[AuditMiddleware]
    AuditMW --> AuthCheck{JWT & RBAC Check}
    AuthCheck -->|Authorized| DB[(PostgreSQL)]
    DB -->|Filter by Tenant ID| Response[Filtered JSON Data]
```

### Financial Settlement Flow

```mermaid
sequenceDiagram
    participant C as Collector
    participant DB as System DB
    participant T as Treasurer
    participant L as Cash Book Ledger

    C->>DB: Submit Donation Receipt (PaymentMode: Cash)
    DB-->>C: Receipt Issued (Status: Pending Settlement)
    C->>T: Handover Collected Cash & Submit Settlement Request
    T->>DB: Review Collector Receipts & Cash Amount
    T->>DB: Approve Settlement Request
    DB->>L: Post Verified Entry to Cash Book
    DB-->>T: Settlement Completed
```

---

## 📁 Repository Directory Structure

```text
Hissob-app/
├── Plan/                               # Product specification & architectural master prompts
│   └── Hissob_ERP_Production_Master_Prompt_v1.md
├── docs/                               # Operational & deployment documentation
│   └── DEPLOYMENT_WEBHOSTMOST.md       # Shared hosting cPanel setup guide
├── passenger_wsgi.py                   # Root WSGI launcher for cPanel / Passenger
├── backend/                            # FastAPI Application
│   ├── app/
│   │   ├── api/v1/                     # Aggregated API router definition
│   │   ├── core/                       # Config, database setup, security routines
│   │   ├── middleware/                 # TenantMiddleware & AuditMiddleware
│   │   ├── models/                     # SQLAlchemy models (Tenant, User, Receipt, Expense, etc.)
│   │   ├── permissions/                # RBAC permissions logic
│   │   ├── reports/                    # PDF & Excel export generators
│   │   ├── repositories/               # Database repository interfaces
│   │   ├── routers/                    # Endpoint handlers per feature module
│   │   ├── schemas/                    # Pydantic validation schemas
│   │   ├── services/                   # Business logic layer
│   │   └── utils/                      # OTP, QR code, and helper utilities
│   ├── alembic/                        # Database migration scripts
│   ├── scripts/                        # Database seeders and setup scripts
│   ├── pyproject.toml                  # Python dependency configuration
│   ├── passenger_wsgi.py               # Backend cPanel entrypoint
│   └── main.py                         # FastAPI root entry point
└── frontend/                           # React + Vite PWA Application
    ├── public/                         # Static assets & PWA manifest
    ├── src/
    │   ├── api/                        # Axios instance & API endpoint hooks
    │   ├── app/                        # Main application providers
    │   ├── components/                 # Reusable UI primitives (StatCard, Skeleton, etc.)
    │   ├── hooks/                      # Custom React hooks
    │   ├── layouts/                    # MainLayout, Sidebar, Navbar
    │   ├── modules/                    # Feature modules (receipts, expenses, events, etc.)
    │   ├── store/                      # Zustand state stores
    │   ├── App.tsx                     # Main router configuration
    │   └── main.tsx                    # React entrypoint
    ├── vite.config.ts                  # Vite build & PWA setup
    └── package.json                    # Frontend dependencies
```

---

## ⚙️ Environment Variables Setup

### Backend Environment Configuration (`backend/.env`)

```ini
# Core Application Settings
APP_NAME="Hisob ERP"
APP_VERSION="1.0.0"
DEBUG=True
SECRET_KEY="your-super-secret-jwt-key-min-32-chars"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=120
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://hisob_user:SecurePassword123@localhost:5432/hisob_db"

# CORS Allowed Origins
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]

# Upload Directory & Files
UPLOAD_DIR="uploads"
MAX_UPLOAD_SIZE_MB=10

# Security & Rate Limits
RATE_LIMIT_PER_MINUTE=120

# SMTP / Email Configuration
SMTP_HOST="mail.hisob.in"
SMTP_PORT=465
SMTP_USER="notifications@hisob.in"
SMTP_PASSWORD="EmailPasswordHere"
EMAILS_FROM_EMAIL="notifications@hisob.in"
EMAILS_FROM_NAME="Hissob ERP Notifications"
```

### Frontend Environment Configuration (`frontend/.env`)

```ini
VITE_API_BASE_URL="http://localhost:8000/api/v1"
VITE_APP_TITLE="Hisob ERP"
```

---

## 🚀 Local Development Setup Guide

### 1. Prerequisites

- **Python**: `3.12+`
- **Node.js**: `20+` & `npm` / `yarn`
- **PostgreSQL**: `16+`
- **UV Package Manager** (Optional, recommended): `pip install uv`

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment using uv or python venv
uv venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
uv pip install -r requirements.txt

# Run Database Migrations
alembic upgrade head

# Start Development Server
uvicorn app.main:app --reload --port 8000
```

> Backend API will be running at `http://localhost:8000`. Access Swagger UI docs at `http://localhost:8000/docs`.

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install node dependencies
npm install

# Start Vite dev server
npm run dev
```

> Frontend application will be running at `http://localhost:5173`.

---

## 🔒 Role-Based Access Control (RBAC) Matrix

| Module                  | Super Admin |  Org Admin  | President  |     Treasurer     | Secretary |   Collector    |     Volunteer      | Auditor |
| :---------------------- | :---------: | :---------: | :--------: | :---------------: | :-------: | :------------: | :----------------: | :-----: |
| **Org / System Config** |   ✅ Full   | ✅ Org Only |  ❌ View   |      ❌ View      |  ❌ View  |       ❌       |         ❌         | ❌ View |
| **Financial Year**      |   ✅ Full   |   ✅ Full   |  ❌ View   |   ⚡ Close/Lock   |  ❌ View  |       ❌       |         ❌         | ❌ View |
| **User Invitations**    |   ✅ Full   |   ✅ Full   | ⚡ Manage  |      ❌ View      |  ❌ View  |       ❌       |         ❌         | ❌ View |
| **Donation Receipts**   |   ✅ Full   |   ✅ Full   |  ❌ View   |      ✅ Full      |  ❌ View  | ⚡ Create/View |         ❌         | ❌ View |
| **Cash Settlement**     |   ✅ Full   |   ✅ Full   |  ❌ View   | ⚡ Verify/Approve |  ❌ View  |   ⚡ Request   |         ❌         | ❌ View |
| **Expenses**            |   ✅ Full   |   ✅ Full   | ⚡ Approve |   ⚡ Pay/Record   | ⚡ Create |       ❌       |         ❌         | ❌ View |
| **Asset Checkouts**     |   ✅ Full   |   ✅ Full   |  ❌ View   |      ❌ View      |  ✅ Full  |    ❌ View     | ⚡ Checkout/Return | ❌ View |
| **VIP Invitations**     |   ✅ Full   |   ✅ Full   |  ❌ View   |      ❌ View      |  ✅ Full  |    ❌ View     |   ⚡ QR Scanner    | ❌ View |
| **Financial Reports**   |   ✅ Full   |   ✅ Full   |  ✅ View   |      ✅ Full      |  ❌ View  |    ❌ View     |         ❌         | ✅ View |

---

## 📄 License & Maintainers

**Hisob ERP** is proprietary software. All rights reserved. Unauthorised copying, distribution, or modification of this software via any medium is strictly prohibited.

For technical inquiries, support, or custom enterprise deployments, please contact the development team at [contact@mayurpatil.in](mailto:contact@mayurpatil.in).

# Hissob ERP - Production Development Master Prompt

## Role

You are a senior Software Architect, Product Manager, UI/UX Designer,
FastAPI Expert, React Expert, PostgreSQL DBA and DevOps Engineer.

Your goal is to build a **production-ready commercial SaaS ERP** named
**Hissob ERP**.

------------------------------------------------------------------------

# Product Vision

Hissob ERP is a complete Festival Collection & Financial Management
System for:

-   Ganapati Mandals
-   Temples
-   Trusts
-   NGOs
-   Community Organizations

The application must be scalable, secure, maintainable and
enterprise-grade.

------------------------------------------------------------------------

# Primary Objectives

-   Multi-tenant SaaS
-   Financial Year based accounting
-   Festival management
-   Donation receipts
-   Cash settlement workflow
-   Expense approvals
-   Full RBAC
-   Audit trail
-   PWA support
-   Shared hosting compatible

------------------------------------------------------------------------

# Technology Stack

## Frontend

-   React 19
-   TypeScript
-   Vite
-   Ant Design
-   React Query
-   React Hook Form
-   Zod
-   Axios
-   PWA
-   ECharts

## Backend
-   UV vertual environemnt
-   FastAPI
-   SQLAlchemy 2
-   Alembic
-   Pydantic v2
-   JWT Authentication
-   Refresh Token
-   Background Tasks

## Database

-   PostgreSQL

------------------------------------------------------------------------

# Hosting Target

Primary deployment target:

**WebHostMost.com Shared Hosting**

Requirements

-   Python FastAPI
-   Passenger compatible
-   PostgreSQL
-   React static build
-   SSL
-   Cron Jobs
-   Local file uploads
-   Daily backup

Architecture must also support migration to VPS/Docker/Cloud without
code changes.

------------------------------------------------------------------------

# Brand Theme

Primary Navy : #0B2347 Primary Orange : #F97316 Secondary Blue : #1E5AA8
Golden Orange : #FF9F1C White : #FFFFFF

Use this branding across: - Logo - Dashboard - Reports - PDFs - Login -
PWA

------------------------------------------------------------------------

# User Hierarchy

1.  Super Admin
2.  Organization Admin
3.  President
4.  Treasurer
5.  Secretary
6.  Collector
7.  Volunteer
8.  Auditor

------------------------------------------------------------------------

# Super Admin

Manage platform

-   Organizations
-   Subscriptions
-   Plans
-   Storage
-   Backups
-   Platform Analytics
-   Global Settings
-   Global Audit
-   Feature Flags

------------------------------------------------------------------------

# Organization Admin

-   Create Users
-   Assign Roles
-   Assign Permissions
-   Festival Setup
-   Financial Year
-   Reports
-   Settings

------------------------------------------------------------------------

# Financial Workflow

Collector

Create Receipt

↓

Pending Settlement

↓

Treasurer Verification

↓

Settled

↓

Cash Book

↓

Ledger

------------------------------------------------------------------------

Expense Workflow

Expense Request

↓

Treasurer Approval

↓

Paid

↓

Ledger Updated

------------------------------------------------------------------------

# Financial Year

Support

-   Open
-   Close
-   Lock
-   Unlock
-   Opening Balance
-   Closing Balance
-   Carry Forward

------------------------------------------------------------------------

# Core Modules

Dashboard Organizations Financial Year Festival Users RBAC Donors Areas
Receipts Cash Settlement Expenses Inventory Assets Events Reports Audit
Notifications Settings

------------------------------------------------------------------------

# RBAC

Every module must support

-   View
-   Create
-   Update
-   Delete
-   Approve
-   Cancel
-   Print
-   Export

Permissions must be dynamic.

------------------------------------------------------------------------

# Production Folder Structure

``` text
frontend/
backend/
docs/
scripts/
logs/
backups/
```

Backend

``` text
app/
 api/
 auth/
 core/
 middleware/
 models/
 repositories/
 services/
 routers/
 schemas/
 permissions/
 reports/
 uploads/
 utils/
 main.py
```

Frontend

``` text
src/
 app/
 api/
 auth/
 assets/
 components/
 hooks/
 layouts/
 modules/
 routes/
 store/
 styles/
 utils/
```

------------------------------------------------------------------------

# Security

-   Password hashing
-   JWT
-   Refresh Token
-   Session timeout
-   Rate limiting
-   XSS protection
-   SQL injection protection
-   Audit logging
-   Secure uploads

------------------------------------------------------------------------

# Reports

-   Daily Collection
-   Collector Report
-   Expense Report
-   Ledger
-   Cash Book
-   Trial Balance
-   Income & Expense
-   Balance Sheet
-   Financial Year
-   Festival Report

Export PDF / Excel / CSV

------------------------------------------------------------------------

# Coding Standards

-   Clean Architecture
-   SOLID
-   Repository Pattern
-   Service Layer
-   Dependency Injection
-   Generic CRUD
-   Modular Design
-   OpenAPI Documentation
-   Typed APIs
-   Reusable Components

------------------------------------------------------------------------

# AI Features

-   AI Insights
-   Donation Prediction
-   Voice Receipt Entry
-   OCR Bills
-   Expense Categorization

------------------------------------------------------------------------

# Expected Deliverables

-   Production-ready code
-   Enterprise UI
-   Complete documentation
-   Database migrations
-   API documentation
-   Unit-test ready architecture
-   Responsive design
-   Shared hosting deployment guide

Never generate demo code. Build everything as production-ready,
scalable, secure, reusable and maintainable.

------------------------------------------------------------------------

# Responsive Design Requirements (Mandatory)

The application **must be fully responsive** and provide an excellent
user experience on **all devices**.

## Supported Devices

-   Desktop PCs
-   Laptops
-   Tablets (Android & iPad)
-   Mobile Phones (Android & iPhone)
-   Foldable Devices
-   Large External Displays

## Supported Screen Sizes

-   320px
-   360px
-   375px
-   390px
-   414px
-   480px
-   576px
-   768px
-   820px
-   1024px
-   1280px
-   1440px
-   1920px
-   2560px

## Responsive Requirements

-   Mobile-first responsive design
-   Adaptive layouts for phones, tablets, and desktops
-   Responsive sidebar (collapse into drawer on mobile)
-   Responsive tables with horizontal scroll/cards
-   Touch-friendly buttons (minimum 44×44px)
-   Optimized forms for mobile keyboards
-   Responsive charts and dashboards
-   Responsive PDF preview
-   Responsive receipt printing
-   Portrait and landscape support
-   Dark Mode support
-   High DPI (Retina) support

## PWA Requirements

-   Installable on Android, iPhone, Windows, and macOS
-   Offline data entry with synchronization when online
-   App-like navigation
-   Push notification ready
-   Fast loading with optimized assets

## Browser Support

-   Google Chrome
-   Microsoft Edge
-   Mozilla Firefox
-   Apple Safari
-   Brave

## Performance Targets

-   Lighthouse Score ≥ 90
-   First Contentful Paint \< 2 seconds
-   Lazy loading for modules
-   Code splitting
-   Image optimization
-   Bundle optimization

## UI Requirement

Every page, dialog, table, form, chart, receipt, report, and dashboard
must work seamlessly on mobile, tablet, laptop, and desktop without
requiring a separate application.

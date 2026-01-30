# 01. PROJECT OVERVIEW

## Introduction
**Gurukrupa ERP** is a specialized Enterprise Resource Planning system designed for Multi-Venture businesses. It allows a single deployment to manage multiple distinct companies, separating data (invoices, inventory, ledgers) strictly while sharing a unified codebase and user management system.

**Target Audience**: SMEs, Traders, and Internal Audit teams needing multi-company management.

## Core Goals
1.  **Multi-Company Isolation**: Complete separation of financial data per company.
2.  **Unified Access**: One login for users to access multiple assigned companies.
3.  **Financial Integrity**: Robust invoice numbering (Cash/Credit separation) and ledger maintenance.
4.  **Simplicity**: Clean, "Soft Professional" UI focused on core business tasks without bloat.

## Architecture Highlights
-   **Tech Stack**: Next.js (App Router), MongoDB, Tailwind CSS.
-   **Authentication**: JWT-based stateless auth.
-   **Context Handling**: `companyId` is injected into every API request context to ensure data isolation.
-   **State Management**: Minimal client-side state; Server Actions and API routes drive data.

---

## 2. USER ROLES & PERMISSIONS

### Admin
-   **Access**: Full system access.
-   **capabilities**:
    -   Create/Edit/Delete Companies.
    -   Manage Users and assign Company access.
    -   View all dashboards and reports.
    -   Perform system-wide configurations.

### Staff / User
-   **Access**: Restricted to assigned companies only.
-   **Capabilities**:
    -   Create Invoices (Sales/Purchase).
    -   Manage Parties and Items.
    -   View Dashboard for their assigned company.
    -   **Cannot** create new companies or manage other users.

---

## 3. AUTHENTICATION FLOW

### Login Process
1.  User enters credentials on `/login`.
2.  System verifies credentials against `User` collection.
3.  **Company Check**:
    -   If user has access to **0 companies**: Access Denied (Contact Admin).
    -   If user has access to **1 company**: Auto-redirect to Dashboard.
    -   If user has access to **>1 companies**: Redirect to `/select-company` page.

### Company Switching
-   Users can switch companies at any time from the top navigation bar.
-   Switching clears the current session contexts and reloads the dashboard with the new `companyId`.
-   **Safety**: Pending forms are not persisted across switches to prevent data cross-posting.

---

## 4. COMPANY MANAGEMENT

### Creating a Company
-   **Admin Only**.
-   **Invoice Prefix**: Auto-generated from Company Name (e.g., "Dev Hub" -> "DE") or manually specified.
-   **New Company Setup**: Created with 0 data. No data is copied from other companies.

### Data Isolation (How it works)
-   Every database record (Invoice, Party, Item) has a `companyId` field.
-   API Endpoints rigorously filter by `{ companyId: activeCompanyId }`.
-   **Safety Mechanism**: The backend rejects any transaction that attempts to write data without a valid `companyId`.

# 02. USER MANUAL & FEATURES

## 1. DASHBOARD
The dashboard provides a real-time snapshot of the **currently selected company**.
-   **Key Metrics**: Total Sales, Purchases, Receivables, Payables (All-time & Monthly).
-   **Graphs**: Yearly and Monthly performance trends.
-   **Recent Activity**: Last 5 transactions (Invoices/Payments) for quick audit.
-   **Stock Alerts**: Highlights low-stock items (<10 units).
-   *Note: Switching companies instantly refreshes these numbers.*

## 2. MASTERS
Masters are the building blocks of the system. They are **company-specific**.

### Party Master (Customers/Suppliers)
-   **Purpose**: Manage entities you do business with.
-   **Fields**: Name, Mobile, GSTIN, Address, Opening Balance.
-   **Logic**: A party created in "Company A" is **NOT** visible in "Company B".

### Item Master (Products)
-   **Purpose**: Inventory management.
-   **Fields**: Name, SKU, HSN, Sale Price, Purchase Price, Tax %, Current Stock.
-   **Stock Tracking**: Stock increases on Purchase, decreases on Sale.

## 3. TRANSACTIONS

### Sales Invoice
-   **Types**:
    -   **Cash Sale**: Immediate payment assumed (though tracked in ledger). Series `C`.
    -   **Credit Sale**: Payment to be received later. Updated in Receivables. Series `CR`.
-   **Flow**:
    1. Select Party (or "Cash Customer").
    2. Add Items (Price auto-fills from Master).
    3. Save -> Generates PDF & Updates Stock/Ledger.

### Purchase Invoice
-   **Purpose**: Record stock intake.
-   **Impact**: Increases Stock, Increases Payables (outcome depends on Cash/Credit).
-   **Series**: Uses `PUR` series or Manual Invoice Number entry (vendor's number).

### Payments & Receipts
-   **Receipt**: Money coming in (from Customer). Reduces Receivable.
-   **Payment**: Money going out (to Vendor/Expense). Reduces Payable.
-   **Allocations**: Payments can be linked to specific invoices for precise aging reports.

## 4. REPORTS

### Available Reports
1.  **Ledger Report**: Detailed debit/credit history for a specific party.
2.  **Stock Report**: Current inventory status and valuation.
3.  **Sales Register**: List of all sales invoices with filters (Date, Payment Mode).
4.  **Outstanding Report**: Who owes money? (Receivables Aging).
5.  **GSTR-1 Format**: Exportable data for tax filing.

### Filters
-   Date Range (From/To)
-   Party Name
-   Transaction Type

---

## 5. SETTINGS
-   **Company Profile**: Update Address, Logo, Bank Details (appears on Print Invoice).
-   **User Settings**: Change Password.
-   **Invoice Prefix**: Admins can change the 2-letter prefix used in invoice numbers (e.g., change `DE` to `DH`).

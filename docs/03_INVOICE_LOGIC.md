# 03. INVOICE LOGIC GUIDE

## Invoice Number Format (New Standard)
The system uses a strict, intelligent formatting system to ensure unique, audit-proof invoice numbers.

**Format**: `{PREFIX}-{SERIES}-{SEQ}-{FY}`

### Component Breakdown
1.  **PREFIX (2 Letters)**
    -   Derived from Company Name (First 2 letters of first 2 words, or first 2 letters of name).
    -   Always Uppercase.
    -   *Example*: "Dev Hub" -> **DE**. "Gurukrupa" -> **GU**.

2.  **SERIES (Variable)**
    -   **C**: Cash Invoices.
    -   **CR**: Credit / Online / Cheque Invoices.
    -   **PUR**: Purchase Invoices (Internal numbering).
    -   *Note*: `C` and `CR` maintain **separate** counters. `DE-C-0001` does not conflict with `DE-CR-0001`.

3.  **SEQ (Sequence)**
    -   4-digit zero-padded number.
    -   Starts from `0001` for each financial year.
    -   Increments atomically (safe for concurrent users).

4.  **FY (Financial Year)**
    -   Format: `YY/YY` (Short year).
    -   Period: April 1st to March 31st.
    -   *Example*: Date `2025-06-15` falls in FY `25/26`.
    -   *Rollover*: On April 1st, 2026, the Sequence resets to `0001` and FY becomes `26/27`.

## Examples

| Company | Inv Date | Type | Resulting Number |
| :--- | :--- | :--- | :--- |
| **DevHub (DE)** | 10 April 2025 | Credit | `DE-CR-0001-25/26` |
| **DevHub (DE)** | 11 April 2025 | Cash | `DE-C-0001-25/26` |
| **DevHub (DE)** | 12 April 2025 | Credit | `DE-CR-0002-25/26` |
| **Gurukrupa (GU)** | 10 April 2025 | Credit | `GU-CR-0001-25/26` |
| **Gurukrupa (GU)** | 01 April 2026 | Credit | `GU-CR-0001-26/27` |

## Safety Mechanisms
-   **Collision Prevention**: The database uses a unique compound index (`companyId` + `series` + `fy`) to physically prevent duplicate numbers.
-   **Fallback**: If a company prefix is missing, it defaults to generated initials or `GK` as fail-safe.
-   **No Gaps**: The system attempts to assign the next number immediately. (Note: Deleted invoices may result in gaps, which is standard behavior for audit trails—never re-use numbers of deleted invoices).

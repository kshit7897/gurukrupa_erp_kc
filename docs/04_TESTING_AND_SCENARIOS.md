# 04. TESTING & SCENARIOS GUIDE

## 1. COMMON SCENARIOS
These are typical workflows that should be tested before any release.

### A. Multi-Company Switching
**Scenario**: User logs in, works in `Company A`, then switches to `Company B`.
*   **Check**: Dashboard numbers update immediately.
*   **Check**: Party list in `Company B` does not show `Company A` parties.
*   **Check**: "Create Invoice" page uses `Company B` prefix (`DE-...`).

### B. Cash vs Credit Series
**Scenario**: Create two invoices in succession.
1.  Create a **Cash** Invoice -> Check Number (Should be `...-C-000X-...`).
2.  Create a **Credit** Invoice -> Check Number (Should be `...-CR-000Y-...`).
3.  Check that Sequence X and Y are independent (e.g., both could be `0001`).

### C. Financial Year Rollover
*   **Note**: Hard to test manually unless you change system date or mock data.
*   **Expectation**: Invoice created on March 31st gets FY `24/25`. Invoice on April 1st gets `25/26` and restarts sequence `0001`.

---

## 2. MANUAL TESTING CHECKLIST

### Authentication
- [ ] Login with valid Admin credentials.
- [ ] Login with Staff credentials.
- [ ] Try to access Admin routes (`/api/companies`) as Staff -> Should fail (403).

### Company Isolation (CRITICAL)
- [ ] Create "Item X" in Company A.
- [ ] Switch to Company B.
- [ ] Search for "Item X". **Result: Should NOT be found.**

### Invoice Generation
- [ ] Create Generic Invoice. **Result: ID generated matches format `{PRE}-{SERIES}-{SEQ}-{FY}`.**
- [ ] Verify PDF download works.
- [ ] Verify Stock is deducted for sold items.
- [ ] Verify Party Ledger is updated (Debit side for Sales).

### Dashboard Accuracy
- [ ] Create an invoice for ₹100.
- [ ] Check Dashboard "Total Sales". **Result: Increases by 100.**
- [ ] Delete that invoice (if allowed). **Result: Sales decrease by 100.**

---

## 3. KNOWN LIMITATIONS
*(As of Latest Build)*

1.  **Offline Mode**: System requires active internet connection.
2.  **Stock Negative**: The system currently *allows* negative stock (selling more than available) to prevent business stoppage. This is a feature, not a bug, but should be monitored.
3.  **PDF Customization**: Invoice template is standard. Customization requires code changes.
4.  **Edit Invoice**: Changing the *Date* of an existing invoice does **NOT** regenerate the invoice number logic (to preserve audit trail). The invoice number stays bound to the original creation date's FY.

---

## 4. HANDOVER NOTES
-   **Source Code**: `/src` (Next.js 14).
-   **Database**: MongoDB (Connection string in `.env`).
-   **Logic Core**: `src/lib/invoiceNumber.ts` contains the numbering algorithm. Do not modify without backup.

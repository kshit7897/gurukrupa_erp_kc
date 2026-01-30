
/**
 * Standalone verification script for Invoice Numbering Logic
 * Run with: npx ts-node scripts/verify-invoice-logic.ts
 */

// MOCK DB
const MOCKED_COUNTERS: Record<string, number> = {};
const MOCKED_COMPANIES: Record<string, any> = {
  'comp_1': { _id: 'comp_1', name: 'Gurukrupa', invoicePrefix: 'GU' }, // Updated default prefix expectation
  'comp_2': { _id: 'comp_2', name: 'DevHub Systems', invoicePrefix: 'DE' },
  'comp_3': { _id: 'comp_3', name: 'No Prefix Co' } // Should fallback to 'NP'
};

// LOGIC COPIED FROM src/lib/invoiceNumber.ts (Adapted for Mocking)
async function mockGenerateInvoiceNumber(payload: { 
  companyId: string; 
  date?: string | Date; 
  paymentMode?: string; 
  type?: string; 
  invoiceType?: string 
}) {
  
  // 1. Get Company Prefix
  const company = MOCKED_COMPANIES[payload.companyId];
  if (!company) throw new Error('Company not found');
  
  let prefix = 'GK';
  if (company.invoicePrefix) {
    prefix = company.invoicePrefix;
  } else if (company.name) {
    prefix = company.name.substring(0, 2).toUpperCase(); // NEW LOGIC
  }

  // 2. Determine Series
  const actualType = payload.invoiceType || payload.type || 'SALES';
  const mode = (payload.paymentMode || '').toLowerCase();
  
  let seriesCode = 'CR';
  if (actualType === 'PURCHASE') {
    seriesCode = 'PUR';
  } else {
    // UPDATED LOGIC
    if (mode === 'cash' || mode === 'c') {
      seriesCode = 'C';
    } else {
      seriesCode = 'CR';
    }
  }

  // 3. Determine FY (Short: YY/YY)
  const dateObj = payload.date ? new Date(payload.date) : new Date();
  
  const month = dateObj.getMonth(); // 0-11
  const year = dateObj.getFullYear();
  let startYear = year;
  if (month < 3) { // Jan-Mar
    startYear = year - 1;
  }
  const startYY = String(startYear).slice(-2);
  const endYY = String(startYear + 1).slice(-2);
  const fy = `${startYY}/${endYY}`;

  // 4. Mock Atomic Increment
  const counterKey = `inv:${payload.companyId}:${seriesCode}:${fy}`;
  if (!MOCKED_COUNTERS[counterKey]) MOCKED_COUNTERS[counterKey] = 0;
  MOCKED_COUNTERS[counterKey]++;
  
  const nextSeq = MOCKED_COUNTERS[counterKey];
  const seqPadded = String(nextSeq).padStart(4, '0');

  // New Format: PRE-SERIES-SEQ-FY
  return `${prefix}-${seriesCode}-${seqPadded}-${fy}`;
}

// TEST RUNNER
async function runTests() {
  console.log('--- STARTING INVOICE LOGIC VERIFICATION (NEW FORMAT) ---\n');

  const tests = [
    {
      name: 'Standard Credit Invoice (Gurukrupa)',
      payload: { companyId: 'comp_1', date: '2025-06-15', paymentMode: 'credit', type: 'SALES' },
      expected: 'GU-CR-0001-25/26'
    },
    {
      name: 'Cash Invoice (Gurukrupa) - Same FY',
      payload: { companyId: 'comp_1', date: '2025-06-16', paymentMode: 'cash', type: 'SALES' },
      expected: 'GU-C-0001-25/26'
    },
    {
      name: 'Second Credit Invoice (Gurukrupa) - Increments',
      payload: { companyId: 'comp_1', date: '2025-06-20', paymentMode: 'credit', type: 'SALES' },
      expected: 'GU-CR-0002-25/26'
    },
    {
      name: 'Different Company (DevHub) - Independent Series',
      payload: { companyId: 'comp_2', date: '2025-06-15', paymentMode: 'credit', type: 'SALES' },
      expected: 'DE-CR-0001-25/26'
    },
    {
      name: 'Auto Prefix Generation (No Prefix Co -> NO)',
      payload: { companyId: 'comp_3', date: '2025-06-15', paymentMode: 'credit', type: 'SALES' },
      expected: 'NO-CR-0001-25/26'
    },
    {
      name: 'FY Boundary - March 31 2026 (Part of 25/26)',
      payload: { companyId: 'comp_1', date: '2026-03-31', paymentMode: 'credit', type: 'SALES' },
      expected: 'GU-CR-0003-25/26'
    },
    {
      name: 'FY Boundary - April 1 2026 (New FY 26/27)',
      payload: { companyId: 'comp_1', date: '2026-04-01', paymentMode: 'credit', type: 'SALES' },
      expected: 'GU-CR-0001-26/27'
    }
  ];

  let passed = 0;
  for (const t of tests) {
    try {
      const result = await mockGenerateInvoiceNumber(t.payload);
      if (result === t.expected) {
        console.log(`[PASS] ${t.name}`);
        console.log(`       Got: ${result}`);
        passed++;
      } else {
        console.error(`[FAIL] ${t.name}`);
        console.error(`       Exp: ${t.expected}`);
        console.error(`       Got: ${result}`);
      }
    } catch (e: any) {
      console.error(`[ERR] ${t.name}: ${e.message}`);
    }
    console.log('');
  }

  console.log(`Summary: ${passed}/${tests.length} passed.`);
}

runTests();

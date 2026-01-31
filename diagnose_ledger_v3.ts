import dbConnect from './src/lib/mongodb';
import OtherTxn from './src/lib/models/OtherTxn';
import LedgerEntry from './src/lib/models/LedgerEntry';
import mongoose from 'mongoose';

async function diagnose() {
  await dbConnect();
  
  const targetCompany = "692aa81de5a2d4e38bc00ba8";
  
  const allOtherLedger = await LedgerEntry.countDocuments({ refType: 'OTHER_TXN' });
  console.log(`Total OTHER_TXN Ledger Entries in whole DB: ${allOtherLedger}`);

  const recentTxns = await OtherTxn.find({ companyId: targetCompany }).sort({ createdAt: -1 }).limit(5).lean();
  console.log(`\nChecking last 5 txns for company ${targetCompany}:`);
  
  for (const t of recentTxns) {
      const entries = await LedgerEntry.find({ refId: t._id }).lean();
      console.log(`- Txn ID: ${t._id}, Type: ${t.txnType}, Amt: ${t.amount}, From: ${t.fromName}, To: ${t.toName}, LedgerEntries: ${entries.length}`);
      if (entries.length > 0) {
          entries.forEach(e => {
              console.log(`  > Entry for: ${e.partyName} (${e.partyId}), Debit: ${e.debit}, Credit: ${e.credit}, Type: ${e.entryType}`);
          });
      }
  }

  process.exit(0);
}

diagnose().catch(console.error);

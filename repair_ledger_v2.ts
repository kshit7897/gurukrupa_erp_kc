import dbConnect from './src/lib/mongodb';
import OtherTxn from './src/lib/models/OtherTxn';
import LedgerEntry from './src/lib/models/LedgerEntry';
import mongoose from 'mongoose';

async function syncLedgerEntries(txn: any, companyId: string) {
  if (!companyId || companyId === 'MISSING_COMPANY_ID') {
      console.log(`Skip txn ${txn._id} - No Company ID`);
      return;
  }
  
  // First, delete existing ledger entries for this transaction
  await LedgerEntry.deleteMany({ refType: 'OTHER_TXN', refId: txn._id });

  const entries: any[] = [];

  // FROM Account: Credit (Money going out/Source)
  if (txn.fromId && txn.fromId !== '') {
    entries.push({
      companyId,
      partyId: txn.fromId,
      partyName: txn.fromName,
      date: txn.date,
      entryType: txn.txnType || 'OTHER',
      refType: 'OTHER_TXN',
      refId: txn._id,
      refNo: txn.referenceNo,
      credit: txn.amount,
      debit: 0,
      narration: txn.note || `${txn.txnType} - To ${txn.toName || 'General'}`,
    });
  }

  // TO Account: Debit (Money coming in/Destination)
  if (txn.toId && txn.toId !== '') {
    entries.push({
      companyId,
      partyId: txn.toId,
      partyName: txn.toName,
      date: txn.date,
      entryType: txn.txnType || 'OTHER',
      refType: 'OTHER_TXN',
      refId: txn._id,
      refNo: txn.referenceNo,
      debit: txn.amount,
      credit: 0,
      narration: txn.note || `${txn.txnType} - From ${txn.fromName || 'General'}`,
    });
  }

  if (entries.length > 0) {
    await LedgerEntry.insertMany(entries);
    console.log(`- Synced txn ${txn._id} (${txn.txnType}): Created ${entries.length} Ledger entries for company ${companyId}`);
  }
}

async function startRepair() {
  await dbConnect();
  console.log('Connected to DB');

  const txns = await OtherTxn.find({}).lean();
  console.log(`Found ${txns.length} OtherTxn records to process`);

  for (const txn of txns) {
    await syncLedgerEntries(txn, (txn as any).companyId);
  }

  const finalCount = await LedgerEntry.find({ refType: 'OTHER_TXN' }).countDocuments();
  console.log(`\nFinal Count: ${finalCount} Ledger entries for Other Transactions.`);
  
  process.exit(0);
}

startRepair().catch(err => {
  console.error(err);
  process.exit(1);
});

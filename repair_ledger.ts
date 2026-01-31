import dbConnect from './src/lib/mongodb';
import OtherTxn from './src/lib/models/OtherTxn';
import LedgerEntry from './src/lib/models/LedgerEntry';
import mongoose from 'mongoose';

async function syncLedgerEntries(txn: any, companyId: string) {
  console.log(`Syncing txn ${txn._id} for company ${companyId}`);
  await LedgerEntry.deleteMany({ refType: 'OTHER_TXN', refId: txn._id });

  const entries: any[] = [];

  if (txn.fromId) {
    console.log(`Add FROM entry: ${txn.fromId}`);
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

  if (txn.toId) {
    console.log(`Add TO entry: ${txn.toId}`);
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
    const res = await LedgerEntry.insertMany(entries);
    console.log(`Inserted ${res.length} entries`);
  } else {
    console.log('No entries to insert');
  }
}

async function diagnose() {
  await dbConnect();
  
  const txns = await OtherTxn.find({}).lean();
  console.log(`Found ${txns.length} total OtherTxn records`);

  for (const txn of txns) {
    await syncLedgerEntries(txn, (txn as any).companyId || 'MISSING_COMPANY_ID');
  }

  const finalCount = await LedgerEntry.find({ refType: 'OTHER_TXN' }).countDocuments();
  console.log(`Final Ledger Entry Count for OTHER_TXN: ${finalCount}`);

  process.exit(0);
}

diagnose().catch(console.error);

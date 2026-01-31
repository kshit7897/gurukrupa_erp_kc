import dbConnect from './src/lib/mongodb';
import OtherTxn from './src/lib/models/OtherTxn';
import LedgerEntry from './src/lib/models/LedgerEntry';
import mongoose from 'mongoose';

async function diagnose() {
  await dbConnect();
  console.log('Connected to DB');

  const txns = await OtherTxn.find({}).sort({ createdAt: -1 }).limit(10).lean();
  console.log(`Found ${txns.length} recent OtherTxn records`);

  for (const txn of txns) {
    const entries = await LedgerEntry.find({ refId: txn._id, refType: 'OTHER_TXN' }).lean();
    console.log(`- Txn: ${txn.txnType}, Date: ${txn.date}, Amt: ${txn.amount}, From: ${txn.fromName}(${txn.fromId}), To: ${txn.toName}(${txn.toId}), Entries: ${entries.length}`);
  }

  const allEntries = await LedgerEntry.find({ refType: 'OTHER_TXN' }).countDocuments();
  console.log(`Total Ledger Entries for OTHER_TXN: ${allEntries}`);

  process.exit(0);
}

diagnose().catch(console.error);

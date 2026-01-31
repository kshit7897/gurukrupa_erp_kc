import dbConnect from './src/lib/mongodb';
import OtherTxn from './src/lib/models/OtherTxn';
import fs from 'fs';

async function diagnose() {
  await dbConnect();
  const txns = await OtherTxn.find({}).lean();
  fs.writeFileSync('global_txn_dump.json', JSON.stringify(txns, null, 2));
  console.log(`Saved ${txns.length} records to global_txn_dump.json`);
  process.exit(0);
}

diagnose().catch(console.error);

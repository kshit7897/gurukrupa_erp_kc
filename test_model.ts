import dbConnect from './src/lib/mongodb';
import OtherTxn from './src/lib/models/OtherTxn';
import mongoose from 'mongoose';

async function diagnose() {
  await dbConnect();
  
  console.log('Attempting to create test transaction...');
  const test = await OtherTxn.create({
    companyId: 'TEST_CO',
    txnType: 'TRANSFER',
    date: '2026-01-31',
    amount: 99.99,
    fromId: 'PARTNER_ID',
    fromName: 'Test Partner',
    toId: 'CASH_ID',
    toName: 'Test Cash',
    note: 'Test Sync'
  });
  
  console.log('Created:', JSON.stringify(test.toObject(), null, 2));
  
  const fetched = await OtherTxn.findById(test._id).lean();
  console.log('Fetched from DB:', JSON.stringify(fetched, null, 2));

  // Clean up
  await OtherTxn.findByIdAndDelete(test._id);
  process.exit(0);
}

diagnose().catch(console.error);

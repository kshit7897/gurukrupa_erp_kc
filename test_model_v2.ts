import dbConnect from './src/lib/mongodb';
import OtherTxn from './src/lib/models/OtherTxn';
import mongoose from 'mongoose';

async function diagnose() {
  await dbConnect();
  
  const testData = {
    companyId: 'TEST_CO',
    txnType: 'TRANSFER',
    date: '2026-01-31',
    amount: 123.45,
    fromId: 'PID_FROM',
    fromName: 'Name From',
    toId: 'PID_TO',
    toName: 'Name To'
  };

  const test = await OtherTxn.create(testData);
  const fetched = await OtherTxn.findById(test._id).lean();
  
  console.log('--- PERSISTENCE CHECK ---');
  console.log('txnType:', fetched.txnType, fetched.txnType === 'TRANSFER' ? 'OK' : 'MISMATCH');
  console.log('fromId:', fetched.fromId, fetched.fromId === 'PID_FROM' ? 'OK' : 'MISMATCH');
  console.log('toId:', fetched.toId, fetched.toId === 'PID_TO' ? 'OK' : 'MISMATCH');
  console.log('------------------------');

  await OtherTxn.findByIdAndDelete(test._id);
  process.exit(0);
}

diagnose().catch(console.error);

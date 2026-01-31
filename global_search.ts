import dbConnect from './src/lib/mongodb';
import OtherTxn from './src/lib/models/OtherTxn';
import Company from './src/lib/models/Company';
import mongoose from 'mongoose';

async function diagnose() {
  await dbConnect();
  
  const companies = await Company.find({}).lean();
  console.log(`System has ${companies.length} companies:`);
  companies.forEach(c => console.log(`- ${c.name} (${c._id})`));

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentTxns = await OtherTxn.find({ createdAt: { $gte: oneHourAgo } }).lean();
  
  console.log(`\nFound ${recentTxns.length} records created in the last 1 hour:`);
  recentTxns.forEach((t, i) => {
    console.log(`Txn ${i+1}: ID: ${t._id}, Company: ${t.companyId}, Type: ${t.txnType}, Amt: ${t.amount}, From: ${t.fromName}, To: ${t.toName}`);
  });

  process.exit(0);
}

diagnose().catch(console.error);

import dbConnect from './src/lib/mongodb';
import LedgerEntry from './src/lib/models/LedgerEntry';
import mongoose from 'mongoose';

async function diagnose() {
  await dbConnect();
  console.log('Connected to DB');

  const otherEntries = await LedgerEntry.find({ refType: 'OTHER_TXN' }).lean();
  console.log(`Found ${otherEntries.length} entries for OTHER_TXN`);

  if (otherEntries.length > 0) {
    console.log('Sample entries:');
    otherEntries.slice(0, 5).forEach(e => {
      console.log(`- Party: ${e.partyName} (${e.partyId}), Date: ${e.date}, Debit: ${e.debit}, Credit: ${e.credit}`);
    });
  }

  // Also check for any entries without companyId or partyId
  const suspicious = await LedgerEntry.find({ 
    $or: [
      { partyId: { $exists: false } },
      { companyId: { $exists: false } },
      { entryType: { $exists: false } }
    ]
  }).limit(5).lean();
  
  if (suspicious.length > 0) {
    console.log('Found suspicious entries:', suspicious.length);
  }

  process.exit(0);
}

diagnose().catch(console.error);

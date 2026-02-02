import dbConnect from './src/lib/mongodb';
import LedgerEntry from './src/lib/models/LedgerEntry';
import Party from './src/lib/models/Party';

const partyId = '697a036e78808c3ca08dd913';

async function checkParty() {
  await dbConnect();
  
  console.log(`\n=== Checking Party: ${partyId} ===\n`);
  
  const party = await Party.findById(partyId);
  if (!party) {
    console.log('❌ Party not found!');
    return;
  }
  
  console.log(`Party Name: ${party.name}`);
  console.log(`Party Company: ${party.companyId}`);
  console.log('');
  
  // Get all ledger entries
  const allEntries = await LedgerEntry.find({ partyId }).lean();
  console.log(`Total ledger entries: ${allEntries.length}\n`);
  
  // Group by company
  const byCompany: any = {};
  allEntries.forEach((entry: any) => {
    const cid = entry.companyId || 'NO_COMPANY';
    if (!byCompany[cid]) byCompany[cid] = [];
    byCompany[cid].push(entry);
  });
  
  console.log('=== Entries by Company ===\n');
  Object.keys(byCompany).forEach(cid => {
    console.log(`Company: ${cid}`);
    const entries = byCompany[cid];
    const opening = entries.filter((e: any) => e.entryType === 'OPENING_BALANCE');
    const transactions = entries.filter((e: any) => e.entryType !== 'OPENING_BALANCE');
    
    console.log(`  Total: ${entries.length}`);
    console.log(`  Opening Balance: ${opening.length}`);
    console.log(`  Transactions: ${transactions.length}`);
    
    if (transactions.length > 0) {
      console.log('\n  ❌ Transaction Details:');
      transactions.forEach((t: any, i: number) => {
        console.log(`    ${i + 1}. Type: ${t.entryType}, Ref: ${t.refNo}, Date: ${t.date}`);
        console.log(`       Debit: ${t.debit || 0}, Credit: ${t.credit || 0}`);
      });
    } else {
      console.log('  ✅ No transactions - can be deleted from this company');
    }
    console.log('');
  });
}

checkParty().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

import dbConnect from './src/lib/mongodb';
import LedgerEntry from './src/lib/models/LedgerEntry';
import Party from './src/lib/models/Party';

async function checkPartyLedger() {
  await dbConnect();
  
  // Get party ID from command line argument
  const partyId = process.argv[2];
  const companyId = process.argv[3];
  
  if (!partyId) {
    console.log('Usage: node check_party_ledger.js <partyId> [companyId]');
    process.exit(1);
  }
  
  console.log(`\n=== Checking Party: ${partyId} ===\n`);
  
  // Get party details
  const party = await Party.findById(partyId);
  if (!party) {
    console.log('❌ Party not found!');
    process.exit(1);
  }
  
  console.log(`Party Name: ${party.name}`);
  console.log(`Party Company: ${party.companyId}`);
  console.log(`Requested Company: ${companyId || 'Not specified'}`);
  console.log('');
  
  // Get all ledger entries for this party
  const allEntries = await LedgerEntry.find({ partyId }).lean();
  console.log(`Total ledger entries: ${allEntries.length}`);
  
  // Group by company
  const byCompany = {};
  allEntries.forEach(entry => {
    const cid = entry.companyId || 'NO_COMPANY';
    if (!byCompany[cid]) byCompany[cid] = [];
    byCompany[cid].push(entry);
  });
  
  console.log('\n=== Entries by Company ===');
  Object.keys(byCompany).forEach(cid => {
    console.log(`\nCompany: ${cid}`);
    console.log(`Total entries: ${byCompany[cid].length}`);
    
    const openingBalance = byCompany[cid].filter(e => e.entryType === 'OPENING_BALANCE');
    const transactions = byCompany[cid].filter(e => e.entryType !== 'OPENING_BALANCE');
    
    console.log(`  - Opening Balance entries: ${openingBalance.length}`);
    console.log(`  - Transaction entries: ${transactions.length}`);
    
    if (transactions.length > 0) {
      console.log('\n  Transaction Details:');
      transactions.forEach((t, i) => {
        console.log(`    ${i + 1}. Type: ${t.entryType}, Ref: ${t.refNo}, Date: ${t.date}, Amount: ${t.debit || t.credit}`);
      });
    }
  });
  
  // Check for the specific company if provided
  if (companyId) {
    console.log(`\n=== For Company ${companyId} ===`);
    const companyEntries = await LedgerEntry.find({ 
      partyId, 
      companyId 
    }).lean();
    
    const nonOpeningEntries = await LedgerEntry.find({ 
      partyId, 
      companyId,
      entryType: { $ne: 'OPENING_BALANCE' }
    }).lean();
    
    console.log(`Total entries: ${companyEntries.length}`);
    console.log(`Non-opening entries: ${nonOpeningEntries.length}`);
    
    if (nonOpeningEntries.length > 0) {
      console.log('\n❌ Cannot delete - has transactions:');
      nonOpeningEntries.forEach((e, i) => {
        console.log(`  ${i + 1}. ${e.entryType} - ${e.refNo} (${e.date})`);
      });
    } else {
      console.log('\n✅ Can be deleted - no transactions');
    }
  }
  
  process.exit(0);
}

checkPartyLedger().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
